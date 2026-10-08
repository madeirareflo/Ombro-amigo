// Pure evaluation helpers. This file is for synthetic laboratory fixtures only.
// No clinical inference, network connection, user transcript or browser storage.
export const INTENT_LABELS = Object.freeze([
  'clarify', 'summary', 'continue', 'uncertainty',
  'scope_all', 'stop', 'skip', 'other'
]);
export const SAFE_INTENT_LABELS = Object.freeze([
  'clarify', 'summary', 'continue', 'uncertainty', 'scope_all'
]);
const SAFE_SET = new Set(SAFE_INTENT_LABELS);
const LABEL_SET = new Set(INTENT_LABELS);
const ABSTAIN = 'abstain';

function ratio(n, d) { return d === 0 ? 0 : n / d; }
function rounded(x) { return Number(x.toFixed(4)); }
function emptyConfusion() {
  return Object.fromEntries(INTENT_LABELS.map(label => [
    label, Object.fromEntries([...INTENT_LABELS, ABSTAIN].map(v => [v, 0]))
  ]));
}

export function normalizeFixtureText(text) {
  return String(text || '').toLocaleLowerCase('pt-BR')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ').trim();
}

/** Derive a split from the family, never from individual paraphrases. */
export function partitionByFamily(rows) {
  const families = Object.fromEntries(INTENT_LABELS.map(label => [label, new Set()]));
  for (const row of rows) {
    if (!LABEL_SET.has(row.label) || !row.family?.startsWith(row.label + '/')) {
      throw new Error('Invalid label/family in synthetic evaluation fixture');
    }
    families[row.label].add(row.family);
  }
  const validationFamilies = new Set(INTENT_LABELS.flatMap(label =>
    [...families[label]].sort().slice(0, 1)
  ));
  return {
    validation: rows.filter(row => validationFamilies.has(row.family)),
    holdout: rows.filter(row => !validationFamilies.has(row.family))
  };
}

// Balanced truncation avoids selecting only the first labels when a lab run
// is capped for CPU/RAM. Stable order: no random seed or hidden sampling.
export function selectBalancedEvaluation(rows, limit) {
  if (!Number.isSafeInteger(limit) || limit < 1) throw new Error('invalid-evaluation-limit');
  const byLabel = new Map(INTENT_LABELS.map(label => [
    label, rows.filter(row => row.label === label)
  ]));
  const selected = [];
  let offset = 0;
  while (selected.length < limit) {
    let progressed = false;
    for (const label of INTENT_LABELS) {
      const item = byLabel.get(label)?.[offset];
      if (item) {
        selected.push(item);
        progressed = true;
        if (selected.length >= limit) break;
      }
    }
    if (!progressed) break;
    offset++;
  }
  return selected;
}

export function validateEvaluationFixtures(rows, trainingPhrases = []) {
  const ids = new Set();
  const unique = new Set();
  const trained = new Set(trainingPhrases.map(normalizeFixtureText));
  const groupLabel = new Map();
  for (const row of rows) {
    if (!LABEL_SET.has(row.label)) throw new Error('Unknown fixture label');
    if (typeof row.id !== 'string' || ids.has(row.id)) throw new Error('Duplicate/invalid fixture id');
    ids.add(row.id);
    if (typeof row.text !== 'string' || row.text.length < 8) throw new Error('Invalid fixture text');
    const normalized = normalizeFixtureText(row.text);
    if (unique.has(normalized)) throw new Error('Duplicate normalized evaluation sentence: ' + row.id);
    if (trained.has(normalized)) throw new Error('Training/evaluation exact phrase overlap: ' + row.id);
    unique.add(normalized);
    if (typeof row.family !== 'string' || !row.family.startsWith(row.label + '/')) {
      throw new Error('Invalid semantic family: ' + row.id);
    }
    if (groupLabel.has(row.family) && groupLabel.get(row.family) !== row.label) {
      throw new Error('Cross-label family');
    }
    groupLabel.set(row.family, row.label);
    if (row.origin !== 'synthetic-eval') throw new Error('Only synthetic evaluation permitted');
  }
  const split = partitionByFamily(rows);
  const valid = new Set(split.validation.map(row => row.family));
  if (split.holdout.some(row => valid.has(row.family))) throw new Error('Family leakage between splits');
  return { total: rows.length, families: groupLabel.size,
    validation: split.validation.length, holdout: split.holdout.length };
}

/**
 * Predict shape: {candidateIntent: label|null, intent: safeLabel|null,
 *                 abstained: boolean, reason: string|null}.
 * A protected label is NEVER an actionable result in this evaluation.
 */
export function evaluateIntentRows(rows, predict) {
  const candidate = emptyConfusion();
  const activation = emptyConfusion();
  const reasonCount = {};
  let accepted = 0, acceptedCorrect = 0, safeExpected = 0, safeAccepted = 0;
  let protectedFalseActivations = 0, candidateCorrect = 0;
  for (const row of rows) {
    if (!LABEL_SET.has(row.label)) throw new Error('Invalid reference label');
    const prediction = predict(row);
    const proposed = LABEL_SET.has(prediction?.candidateIntent) ? prediction.candidateIntent : ABSTAIN;
    const action = SAFE_SET.has(prediction?.intent) ? prediction.intent : ABSTAIN;
    if (prediction?.intent != null && action === ABSTAIN) {
      throw new Error('Prediction attempted to activate a protected/unknown label');
    }
    candidate[row.label][proposed]++;
    activation[row.label][action]++;
    if (proposed === row.label) candidateCorrect++;
    if (SAFE_SET.has(row.label)) {
      safeExpected++;
      if (action !== ABSTAIN) safeAccepted++;
    } else if (action !== ABSTAIN) {
      protectedFalseActivations++;
    }
    if (action !== ABSTAIN) {
      accepted++;
      if (action === row.label) acceptedCorrect++;
    } else {
      const reason = typeof prediction?.reason === 'string' ? prediction.reason : 'unknown';
      reasonCount[reason] = (reasonCount[reason] || 0) + 1;
    }
  }

  const perLabel = {};
  for (const label of INTENT_LABELS) {
    const support = rows.filter(row => row.label === label).length;
    const trueCandidate = candidate[label][label];
    const suggestedTotal = INTENT_LABELS.reduce((sum, other) => sum + candidate[other][label], 0);
    const prec = ratio(trueCandidate, suggestedTotal);
    const recall = ratio(trueCandidate, support);
    const f1 = ratio(2 * prec * recall, prec + recall);
    perLabel[label] = {
      support,
      candidatePrecision: rounded(prec),
      candidateRecall: rounded(recall),
      candidateF1: rounded(f1),
      acceptedRecall: SAFE_SET.has(label) ? rounded(ratio(activation[label][label], support)) : null,
      acceptedIncorrect: rows.length ? INTENT_LABELS
        .filter(other => other !== label).reduce((sum, other) => sum + activation[other][label], 0) : 0
    };
  }
  const macroF1 = ratio(INTENT_LABELS.reduce((sum, label) => sum + perLabel[label].candidateF1, 0),
    INTENT_LABELS.length);
  return {
    total: rows.length,
    candidateAccuracy: rounded(ratio(candidateCorrect, rows.length)),
    candidateMacroF1: rounded(macroF1),
    accepted: accepted,
    acceptedCorrect,
    acceptedPrecision: rounded(ratio(acceptedCorrect, accepted)),
    safeCoverage: rounded(ratio(safeAccepted, safeExpected)),
    protectedFalseActivations,
    protectedTotal: rows.length - safeExpected,
    abstentions: rows.length - accepted,
    abstentionReasons: reasonCount,
    perLabel,
    candidateConfusion: candidate,
    activationConfusion: activation,
    releaseReady: false, // clinical review, model integrity and mobile benchmarks missing
    releaseBlockers: [
      'no-professional-blind-review',
      'no-real-device-benchmark',
      'no-calibrated-independent-evaluation',
      ...(protectedFalseActivations > 0 ? ['protected-class-false-action'] : []),
      ...(ratio(safeAccepted, safeExpected) < 0.95 ? ['insufficient-safe-intent-coverage'] : []),
      ...(ratio(acceptedCorrect, accepted) < 0.99 ? ['insufficient-accepted-precision'] : [])
    ]
  };
}
