import test from 'node:test';
import assert from 'node:assert/strict';
import { SYNTHETIC_INTENT_EXAMPLES } from '../../conversation/local-intent-corpus.js';
import { classifyLocalIntent } from '../../conversation/local-intent-classifier.js';
import { LOCAL_INTENT_EVAL_V2 } from '../fixtures/local-intent-eval-v2.mjs';
import {
  normalizeFixtureText, validateEvaluationFixtures, partitionByFamily,
  evaluateIntentRows, INTENT_LABELS, selectBalancedEvaluation
} from '../../scripts/lib/intent-evaluation-v2.mjs';

const training = Object.values(SYNTHETIC_INTENT_EXAMPLES).flat();

test('320 utterances, 40 semantic families, balanced labels, family-held-out splits', () => {
  const stats = validateEvaluationFixtures(LOCAL_INTENT_EVAL_V2, training);
  assert.deepEqual(stats, { total: 320, families: 40, validation: 64, holdout: 256 });
  const { validation, holdout } = partitionByFamily(LOCAL_INTENT_EVAL_V2);
  const held = new Set(holdout.map(x => x.family));
  assert.ok(validation.every(x => !held.has(x.family)));
  for (const label of INTENT_LABELS) {
    assert.equal(LOCAL_INTENT_EVAL_V2.filter(x => x.label === label).length, 40);
    assert.equal(validation.filter(x => x.label === label).length, 8);
    assert.equal(holdout.filter(x => x.label === label).length, 32);
  }
});

test('capped ONNX trial is stratified across every intent label', () => {
  const { holdout } = partitionByFamily(LOCAL_INTENT_EVAL_V2);
  const selected = selectBalancedEvaluation(holdout, 64);
  assert.equal(selected.length, 64);
  for (const label of INTENT_LABELS) {
    assert.equal(selected.filter(row => row.label === label).length, 8);
  }
  assert.deepEqual(selected, selectBalancedEvaluation(holdout, 64));
  assert.throws(() => selectBalancedEvaluation(holdout, 0), /limit/);
});

test('no exact overlap between evaluation and training or duplicates after normalization', () => {
  const trained = new Set(training.map(normalizeFixtureText));
  const normalized = LOCAL_INTENT_EVAL_V2.map(x => normalizeFixtureText(x.text));
  assert.equal(normalized.length, new Set(normalized).size);
  assert.ok(normalized.every(x => !trained.has(x)));
});

test('evaluation is deterministic and never activates protected labels automatically', () => {
  const { validation } = partitionByFamily(LOCAL_INTENT_EVAL_V2);
  const predict = row => classifyLocalIntent(row.text, { lastQuestionDimension: row.questionDimension });
  const first = evaluateIntentRows(validation, predict);
  const second = evaluateIntentRows(validation, predict);
  assert.deepEqual(first, second);
  assert.equal(first.total, 64);
  assert.ok(first.candidateMacroF1 >= 0 && first.candidateMacroF1 <= 1);
  assert.ok(first.acceptedPrecision >= 0 && first.acceptedPrecision <= 1);
  assert.ok(first.safeCoverage >= 0 && first.safeCoverage <= 1);
  assert.equal(first.releaseReady, false);
});

test('benchmarks independent frozen holdout without treating poor performance as success', () => {
  const { holdout } = partitionByFamily(LOCAL_INTENT_EVAL_V2);
  const metrics = evaluateIntentRows(holdout, row =>
    classifyLocalIntent(row.text, { lastQuestionDimension: row.questionDimension }));
  assert.equal(metrics.total, 256);
  assert.equal(metrics.releaseReady, false);
  assert.ok(metrics.protectedTotal >= 96);
  // Only aggregated test metrics; individual fictitious sentences never appear in logs.
  console.log('LOCAL_INTENT_V2_HOLDOUT', JSON.stringify({
    total: metrics.total,
    candidateMacroF1: metrics.candidateMacroF1,
    candidateAccuracy: metrics.candidateAccuracy,
    acceptedPrecision: metrics.acceptedPrecision,
    safeCoverage: metrics.safeCoverage,
    protectedFalseActivations: metrics.protectedFalseActivations,
    abstentions: metrics.abstentions
  }));
});

test('independent protected negatives are measured as false actions, not ignored', () => {
  const rows = [
    { label: 'summary' }, { label: 'stop' }, { label: 'other' }, { label: 'clarify' }
  ];
  const outcomes = [
    { candidateIntent: 'summary', intent: 'summary' },
    { candidateIntent: 'continue', intent: 'continue' },
    { candidateIntent: 'other', intent: null, reason: 'protected-or-content' },
    { candidateIntent: 'summary', intent: null, reason: 'low-similarity' }
  ];
  let i = 0;
  const metrics = evaluateIntentRows(rows, () => outcomes[i++]);
  assert.equal(metrics.accepted, 2);
  assert.equal(metrics.acceptedCorrect, 1);
  assert.equal(metrics.protectedFalseActivations, 1);
  assert.ok(metrics.releaseBlockers.includes('protected-class-false-action'));
  assert.ok(metrics.releaseBlockers.includes('insufficient-safe-intent-coverage'));
  assert.equal(metrics.abstentions, 2);
  assert.equal(metrics.acceptedPrecision, 0.5);
  assert.equal(metrics.safeCoverage, 0.5);
  assert.equal(metrics.perLabel.stop.candidateRecall, 0);
  assert.equal(metrics.candidateConfusion.stop.continue, 1);
});

test('evaluation rejects unsafe action output or untrusted fixture origin', () => {
  assert.throws(() => evaluateIntentRows([{ label: 'stop' }], () => ({ intent: 'stop' })), /protected/);
  assert.throws(() => validateEvaluationFixtures([
    { id: 'x', label: 'clarify', family: 'clarify/a', text: 'texto exemplo', origin: 'real-user' }
  ]), /synthetic/);
});

test('frozen local evaluation does not import network or hold user-transcript data', async () => {
  const { readFile } = await import('node:fs/promises');
  const source = await readFile(new URL('../../scripts/evaluate-local-intent-v2.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /\bfetch\s*\(|https?:\/\/|XMLHttpRequest|WebSocket|navigator\.sendBeacon/);
  assert.doesNotMatch(source, /process\.env\..*(TOKEN|SECRET|API_KEY)/);
});
