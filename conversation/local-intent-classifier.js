import { SYNTHETIC_INTENT_EXAMPLES } from './local-intent-corpus.js';

// Baseline experimental; NÃO é um modelo neural nem um detector clínico.
// Os padrões são inteiramente locais e não recebem conteúdo de sessões reais.
// Não integrar esta função a decisões de safety/autonomia sem validação posterior.
export const LOCAL_INTENT_MODEL_VERSION = 'synthetic-cosine-v1';
const SAFE_CANDIDATES = new Set(['clarify', 'summary', 'continue', 'uncertainty', 'scope_all']);
const CONTEXT_REQUIRED = new Set(['scope_all']);
const PROTECTED_CANDIDATES = new Set(['stop', 'skip', 'other']);
const MAX_TEXT_LENGTH = 160;

function normalize(value) {
  return String(value || '').toLocaleLowerCase('pt-BR')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function makeFeatures(value) {
  const text = normalize(value);
  const words = text.split(' ').filter(Boolean);
  const features = new Set();
  for (let i = 0; i < words.length; i += 1) {
    features.add('word:' + words[i]);
    if (i > 0) features.add('pair:' + words[i - 1] + '_' + words[i]);
  }
  // Caracteres permitem reconhecer algumas variantes de grafia sem regex por frase.
  const padded = ' ' + text + ' ';
  for (let n = 3; n <= 4; n += 1) {
    for (let i = 0; i + n <= padded.length; i += 1) {
      features.add('char:' + padded.slice(i, i + n));
    }
  }
  return features;
}

function featureStrength(key, idf) {
  const factor = key.startsWith('pair:') ? 2.2
    : key.startsWith('word:') ? 1.8 : 0.42;
  return factor * idf;
}

function buildIndex() {
  const samples = [];
  const frequency = new Map();
  for (const [intent, phrases] of Object.entries(SYNTHETIC_INTENT_EXAMPLES)) {
    for (const phrase of phrases) {
      const features = makeFeatures(phrase);
      samples.push({ intent, features });
      for (const key of features) frequency.set(key, (frequency.get(key) || 0) + 1);
    }
  }
  const idf = new Map();
  for (const [key, count] of frequency) {
    idf.set(key, 1 + Math.log((samples.length + 1) / (count + 1)));
  }

  function vectorize(features) {
    const entries = new Map();
    let squared = 0;
    for (const key of features) {
      const rarity = idf.get(key);
      if (rarity === undefined) continue; // termos desconhecidos não viram evidência
      const weight = featureStrength(key, rarity);
      entries.set(key, weight);
      squared += weight * weight;
    }
    const length = Math.sqrt(squared);
    if (!length) return new Map();
    for (const [key, value] of entries) entries.set(key, value / length);
    return entries;
  }

  const vectors = samples.map(item => ({ intent: item.intent, vector: vectorize(item.features) }));
  return { vectors, vectorize, sampleCount: samples.length };
}

// Índice pequeno compartilhado somente entre inferências locais. Nunca armazena
// texto submetido pela pessoa, nem trafega dados para rede, worker ou console.
let index = null;
function getIndex() {
  if (!index) index = buildIndex();
  return index;
}

function cosine(a, b) {
  let dot = 0;
  // O menor mapa torna cada comparação proporcional aos traços presentes.
  const first = a.size <= b.size ? a : b;
  const second = a.size <= b.size ? b : a;
  for (const [key, weight] of first) dot += weight * (second.get(key) || 0);
  return dot;
}

function result(candidateIntent, similarity, margin, reason) {
  return {
    modelVersion: LOCAL_INTENT_MODEL_VERSION,
    intent: reason ? null : candidateIntent,
    candidateIntent,
    similarity: Number(similarity.toFixed(4)),
    margin: Number(margin.toFixed(4)),
    abstained: Boolean(reason),
    reason: reason || null
  };
}

/**
 * Sugestão experimental de intenção, executada somente em JavaScript local.
 * A similaridade é uma pontuação de comparação, NÃO uma probabilidade clínica.
 * Nunca pode prevalecer sobre os controles explícitos ou sobre o safety gate.
 */
export function classifyLocalIntent(value, { lastQuestionDimension = null } = {}) {
  const original = String(value || '');
  const normalized = normalize(original);
  if (!normalized) return result(null, 0, 0, 'empty');
  if (original.length > MAX_TEXT_LENGTH || original.includes('\n')) {
    return result(null, 0, 0, 'long-or-multiline');
  }

  // Citações são ambíguas quanto à autoria e não acionam intenções por ML.
  if (/["“”«»]/.test(original)) return result(null, 0, 0, 'quotation');
  const model = getIndex();
  const input = model.vectorize(makeFeatures(normalized));
  if (!input.size) return result(null, 0, 0, 'out-of-vocabulary');

  const best = new Map();
  for (const sample of model.vectors) {
    const score = cosine(input, sample.vector);
    if (score > (best.get(sample.intent) || 0)) best.set(sample.intent, score);
  }
  const ranked = [...best.entries()].sort((a, b) => b[1] - a[1]);
  const [label, similarity] = ranked[0];
  const margin = similarity - (ranked[1]?.[1] || 0);

  if (PROTECTED_CANDIDATES.has(label)) return result(label, similarity, margin, 'protected-or-content');
  if (CONTEXT_REQUIRED.has(label) && lastQuestionDimension !== 'scope') {
    return result(label, similarity, margin, 'missing-question-context');
  }
  if (!SAFE_CANDIDATES.has(label)) return result(label, similarity, margin, 'unknown-label');
  // Travas conservadoras para reduzir acionamentos indevidos.
  if (similarity < 0.58) return result(label, similarity, margin, 'low-similarity');
  if (margin < 0.085) return result(label, similarity, margin, 'ambiguous-label');
  return result(label, similarity, margin, null);
}

export function localIntentCorpusStats() {
  return Object.freeze({
    modelVersion: LOCAL_INTENT_MODEL_VERSION,
    sampleCount: getIndex().sampleCount,
    labels: Object.keys(SYNTHETIC_INTENT_EXAMPLES)
  });
}
