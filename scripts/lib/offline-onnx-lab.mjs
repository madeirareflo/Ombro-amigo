// Optional local-only neural lab. This module has no ONNX dependencies and does
// not handle user transcripts; it only compares synthetic fixture embeddings.
export const OFFLINE_EMBEDDING_LAB_VERSION = 'offline-onnx-encoder-lab-v1';
const ACCEPTABLE_LABELS = new Set(['clarify', 'summary', 'continue', 'uncertainty', 'scope_all']);
const ALL_LABELS = new Set([...ACCEPTABLE_LABELS, 'stop', 'skip', 'other']);
const HEX256 = /^[a-f0-9]{64}$/i;

export function validateLocalModelManifest(manifest, name) {
  if (!manifest || typeof manifest !== 'object') throw new Error('missing-manifest');
  if (!/^[a-z0-9][a-z0-9._-]{0,79}$/i.test(name)) throw new Error('invalid-local-model-name');
  if (manifest.modelName !== name) throw new Error('model-name-mismatch');
  if (manifest.approvedForExperiment !== true) throw new Error('not-explicitly-approved-for-lab');
  if (typeof manifest.license !== 'string' || !manifest.license.trim()) throw new Error('missing-model-license');
  if (typeof manifest.modelRevision !== 'string' || manifest.modelRevision.length < 7) throw new Error('missing-model-revision');
  if (!Array.isArray(manifest.files) || manifest.files.length < 3 || manifest.files.length > 50) {
    throw new Error('invalid-manifest-file-count');
  }
  const names = new Set();
  for (const file of manifest.files) {
    const rel = file?.path;
    if (typeof rel !== 'string' || rel.startsWith('/') || rel.includes('\\') ||
        rel.split('/').some(p => !p || p === '.' || p === '..') ||
        !/^[A-Za-z0-9_./-]+$/.test(rel)) throw new Error('unsafe-relative-file-path');
    if (names.has(rel)) throw new Error('duplicate-model-file');
    names.add(rel);
    if (!HEX256.test(file.sha256)) throw new Error('missing-sha256');
  }
  if (!names.has('config.json') || !names.has('tokenizer.json')) {
    throw new Error('missing-model-config-or-tokenizer');
  }
  if (![...names].some(n => /^onnx\/.*\.onnx$/.test(n))) {
    throw new Error('missing-onnx-weights');
  }
  return { name, fileCount: names.size, modelRevision: manifest.modelRevision, license: manifest.license };
}

export function cosineVector(a, b) {
  if (!a || !b || !a.length || a.length !== b.length) throw new Error('invalid-embedding-dimensions');
  let sum = 0, a2 = 0, b2 = 0;
  for (let i = 0; i < a.length; i++) {
    if (!Number.isFinite(a[i]) || !Number.isFinite(b[i])) throw new Error('non-finite-embedding');
    sum += a[i] * b[i];
    a2 += a[i] * a[i];
    b2 += b[i] * b[i];
  }
  return a2 === 0 || b2 === 0 ? 0 : sum / Math.sqrt(a2 * b2);
}

function result(label, similarity, margin, reason) {
  return {
    modelVersion: OFFLINE_EMBEDDING_LAB_VERSION,
    candidateIntent: label,
    intent: reason ? null : label,
    similarity: Number(similarity.toFixed(4)),
    margin: Number(margin.toFixed(4)),
    abstained: Boolean(reason),
    reason: reason || null
  };
}

// labelVectors only contains embeddings of the synthetic training examples.
export function classifyWithLocalEmbedding(vector, {
  labelVectors, lastQuestionDimension = null,
  minimumSimilarity = 0.80, minimumMargin = 0.08,
  text = ''
}) {
  if (typeof text !== 'string' || text.length > 160 || text.includes('\n')) {
    return result(null, 0, 0, 'long-or-multiline');
  }
  if (/["“”«»]/.test(text)) return result(null, 0, 0, 'quotation');
  if (!labelVectors || typeof labelVectors !== 'object') throw new Error('missing-training-embeddings');

  const best = [];
  for (const [label, examples] of Object.entries(labelVectors)) {
    if (!ALL_LABELS.has(label)) throw new Error('unrecognized-training-label');
    if (!Array.isArray(examples) || !examples.length) continue;
    best.push([label, Math.max(...examples.map(example => cosineVector(vector, example)))]);
  }
  best.sort((a, b) => b[1] - a[1]);
  if (!best.length) return result(null, 0, 0, 'empty-training-index');
  const [label, similarity] = best[0];
  const margin = similarity - (best[1]?.[1] || 0);
  if (!ACCEPTABLE_LABELS.has(label)) return result(label, similarity, margin, 'protected-or-content');
  if (label === 'scope_all' && lastQuestionDimension !== 'scope') {
    return result(label, similarity, margin, 'missing-question-context');
  }
  if (similarity < minimumSimilarity) return result(label, similarity, margin, 'low-similarity');
  if (margin < minimumMargin) return result(label, similarity, margin, 'ambiguous-label');
  return result(label, similarity, margin, null);
}
