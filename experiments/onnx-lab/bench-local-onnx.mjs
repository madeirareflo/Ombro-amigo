#!/usr/bin/env node
// INDEPENDENT LAB ONLY. Executes no inference on real user messages.
// Never ships model weights, dependencies or this experiment into the PWA.
import { readFile, lstat, realpath } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, join, sep } from 'node:path';
import { performance } from 'node:perf_hooks';
import { SYNTHETIC_INTENT_EXAMPLES } from '../../conversation/local-intent-corpus.js';
import { classifyLocalIntent } from '../../conversation/local-intent-classifier.js';
import { LOCAL_INTENT_EVAL_V2 } from '../../tests/fixtures/local-intent-eval-v2.mjs';
import {
  partitionByFamily, validateEvaluationFixtures, evaluateIntentRows, selectBalancedEvaluation
} from '../../scripts/lib/intent-evaluation-v2.mjs';
import {
  validateLocalModelManifest, classifyWithLocalEmbedding, sweepLocalEmbeddingThresholds, OFFLINE_EMBEDDING_LAB_VERSION
} from '../../scripts/lib/offline-onnx-lab.mjs';

function parseArgs(args) {
  const flags = {};
  for (let i = 0; i < args.length; i += 2) {
    if (!args[i]?.startsWith('--') || !args[i + 1]) throw new Error('expected --key value');
    flags[args[i].slice(2)] = args[i + 1];
  }
  if (!flags['model-root'] || !flags['model-name']) throw new Error('model-root and model-name are required');
  const split = flags.split || 'validation';
  if (!['validation', 'holdout'].includes(split)) throw new Error('invalid split');
  const max = Number(flags['max-samples'] || 64);
  const trainPerLabel = Number(flags['train-per-label'] || 12);
  const similarity = Number(flags['min-similarity'] || 0.80);
  const margin = Number(flags['min-margin'] || 0.08);
  if (!Number.isSafeInteger(max) || max < 1 || max > 256 ||
      !Number.isSafeInteger(trainPerLabel) || trainPerLabel < 1 || trainPerLabel > 25 ||
      similarity < 0 || similarity > 1 || margin < 0 || margin > 1) {
    throw new Error('invalid benchmark limits');
  }
  return { modelRoot: flags['model-root'], modelName: flags['model-name'],
    split, max, trainPerLabel, similarity, margin };
}

async function verifyPack(root, name) {
  const base = resolve(root);
  const modelDir = resolve(base, name);
  // validateModelManifest enforces a single safe model slug before accessing files.
  if (!/^[a-z0-9][a-z0-9._-]{0,79}$/i.test(name)) throw new Error('invalid-model-name');
  const manifest = JSON.parse(await readFile(join(modelDir, 'manifest.json'), 'utf8'));
  const info = validateLocalModelManifest(manifest, name);
  const canonicalDir = await realpath(modelDir);
  for (const file of manifest.files) {
    const path = join(modelDir, ...file.path.split('/'));
    if (!(await lstat(path)).isFile()) throw new Error('non-regular-model-file');
    const canonical = await realpath(path);
    if (!canonical.startsWith(canonicalDir + sep)) throw new Error('model-file-outside-pack');
    const actual = createHash('sha256').update(await readFile(path)).digest('hex');
    if (actual.toLowerCase() !== file.sha256.toLowerCase()) throw new Error('model-file-integrity-mismatch');
  }
  return { base, name, info };
}

function percentile(sorted, fraction) {
  if (!sorted.length) return 0;
  return sorted[Math.min(sorted.length - 1, Math.ceil(fraction * sorted.length) - 1)];
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const pack = await verifyPack(options.modelRoot, options.modelName);
  const fixtureStats = validateEvaluationFixtures(
    LOCAL_INTENT_EVAL_V2, Object.values(SYNTHETIC_INTENT_EXAMPLES).flat()
  );
  const all = selectBalancedEvaluation(partitionByFamily(LOCAL_INTENT_EVAL_V2)[options.split], options.max);

  // Intentionally fail closed on any runtime request: local files only.
  globalThis.fetch = async () => { throw new Error('network-fetch-blocked-in-offline-lab'); };
  const { pipeline, env } = await import('@huggingface/transformers');
  env.allowRemoteModels = false;
  env.allowLocalModels = true;
  env.localModelPath = pack.base + sep;
  env.useFSCache = false;
  env.useBrowserCache = false;
  env.backends.onnx.wasm.wasmPaths = join(pack.base, 'local-wasm') + sep;

  const started = performance.now();
  const extractor = await pipeline('feature-extraction', pack.name, {
    device: 'cpu', dtype: 'q8', local_files_only: true
  });
  const loadMs = performance.now() - started;
  const timings = [];
  let dimensions = null;
  async function embed(text) {
    const t = performance.now();
    const output = await extractor(text, { pooling: 'mean', normalize: true });
    timings.push(performance.now() - t);
    const vector = Float32Array.from(output.data || []);
    if (!vector.length || vector.some(n => !Number.isFinite(n))) {
      throw new Error('invalid-encoder-output');
    }
    if (dimensions !== null && vector.length !== dimensions) {
      throw new Error('inconsistent-embedding-dimensions');
    }
    dimensions = vector.length;
    return vector;
  }
  const labelVectors = {};
  for (const [label, texts] of Object.entries(SYNTHETIC_INTENT_EXAMPLES)) {
    labelVectors[label] = [];
    for (const phrase of texts.slice(0, options.trainPerLabel)) {
      labelVectors[label].push(await embed(phrase));
    }
  }
  const predictions = [];
  const evaluationVectors = [];
  for (const row of all) {
    const vector = await embed(row.text);
    evaluationVectors.push(vector);
    predictions.push(classifyWithLocalEmbedding(vector, {
      labelVectors, text: row.text, lastQuestionDimension: row.questionDimension,
      minimumSimilarity: options.similarity, minimumMargin: options.margin
    }));
  }
  let i = 0;
  const embedMetrics = evaluateIntentRows(all, () => predictions[i++]);
  const lexicalMetrics = evaluateIntentRows(all, row =>
    classifyLocalIntent(row.text, { lastQuestionDimension: row.questionDimension }));
  const validationSweep = options.split === 'validation'
    ? sweepLocalEmbeddingThresholds(all, evaluationVectors, labelVectors, evaluateIntentRows)
    : null;
  timings.sort((a, b) => a - b);
  const report = {
    schemaVersion: OFFLINE_EMBEDDING_LAB_VERSION,
    pack: pack.info,
    evaluation: { split: options.split, count: all.length,
      fixtureStats, trainPerLabel: options.trainPerLabel },
    model: { backend: 'cpu', requestedDtype: 'q8', embeddingDimensions: dimensions,
      loadMs: Number(loadMs.toFixed(1)), inferenceP50Ms: Number(percentile(timings, 0.5).toFixed(1)),
      inferenceP95Ms: Number(percentile(timings, 0.95).toFixed(1)),
      rssMb: Number((process.memoryUsage().rss / (1024 * 1024)).toFixed(1)) },
    thresholds: { similarity: options.similarity, margin: options.margin },
    lexicalMetrics,
    embeddingMetrics: embedMetrics,
    validationSweep,
    releaseReady: false,
    note: 'SYNTHETIC DATA ONLY. Local filesystem pack with SHA-256 manifest. This is a lab comparison, not clinical approval.'
  };
  // Only aggregate numerical metrics, never sample utterances or model embeddings.
  process.stdout.write(JSON.stringify(report, null, 2) + '\n');
}

main().catch(error => {
  // Do not print absolute model paths or raw user content in error details.
  const reason = typeof error?.message === 'string' && /^(expected --key value|model-root and model-name are required|invalid split|invalid benchmark limits|invalid-model-name|not-explicitly-approved-for-lab|missing-model-license|model-name-mismatch|model-file-integrity-mismatch|model-file-outside-pack|network-fetch-blocked-in-offline-lab)$/.test(error.message)
    ? error.message : 'offline-lab-failed-check-model-install-and-pack';
  process.stderr.write('ERROR ' + reason + '\n');
  process.exitCode = 2;
});
