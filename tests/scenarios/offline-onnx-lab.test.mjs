import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  cosineVector, validateLocalModelManifest, classifyWithLocalEmbedding,
  OFFLINE_EMBEDDING_LAB_VERSION
} from '../../scripts/lib/offline-onnx-lab.mjs';

const manifest = {
  modelName: 'ptbr-encoder-q8',
  modelRevision: 'commit-abcdef123',
  license: 'Apache-2.0',
  approvedForExperiment: true,
  files: [
    { path: 'config.json', sha256: 'a'.repeat(64) },
    { path: 'tokenizer.json', sha256: 'b'.repeat(64) },
    { path: 'onnx/model_quantized.onnx', sha256: 'c'.repeat(64) }
  ]
};

test('manifest demands approval, known model name, tokenizer and file hashes', () => {
  assert.deepEqual(validateLocalModelManifest(manifest, 'ptbr-encoder-q8'), {
    name: 'ptbr-encoder-q8', fileCount: 3,
    modelRevision: 'commit-abcdef123', license: 'Apache-2.0'
  });
  assert.throws(() => validateLocalModelManifest({ ...manifest, approvedForExperiment: false }, 'ptbr-encoder-q8'), /approved/);
  assert.throws(() => validateLocalModelManifest(manifest, '../secret'), /invalid/);
  assert.throws(() => validateLocalModelManifest({ ...manifest, files: [
    { path: '../outside.json', sha256: 'c'.repeat(64) }, ...manifest.files
  ] }, 'ptbr-encoder-q8'), /unsafe/);
  assert.throws(() => validateLocalModelManifest({ ...manifest, files: [
    ...manifest.files, manifest.files[0]
  ] }, 'ptbr-encoder-q8'), /duplicate/);
  assert.throws(() => validateLocalModelManifest({ ...manifest, files: [
    ...manifest.files.slice(0, 2), { path: 'onnx/model.onnx', sha256: 'not-a-hash' }
  ] }, 'ptbr-encoder-q8'), /sha256/);
});

test('embedding cosine reports similarity and rejects incompatible dimensions', () => {
  assert.equal(cosineVector([1, 0], [1, 0]), 1);
  assert.equal(cosineVector([1, 0], [0, 1]), 0);
  assert.equal(cosineVector([1, 0], [-1, 0]), -1);
  assert.throws(() => cosineVector([1, 0], [1]), /dimensions/);
  assert.throws(() => cosineVector([NaN], [1]), /non-finite/);
});

test('embeddings never activate protected labels; missing context rejects scope', () => {
  const labelVectors = {
    stop: [[1, 0, 0]],
    summary: [[0, 1, 0]],
    scope_all: [[0, 0, 1]]
  };
  const protectedResult = classifyWithLocalEmbedding([1, 0, 0], { labelVectors, text: 'Quero parar' });
  assert.equal(protectedResult.intent, null);
  assert.equal(protectedResult.candidateIntent, 'stop');

  const missingContext = classifyWithLocalEmbedding([0, 0, 1], { labelVectors, text: 'Em tudo isso' });
  assert.equal(missingContext.intent, null);
  assert.equal(missingContext.reason, 'missing-question-context');

  const scopeResult = classifyWithLocalEmbedding([0, 0, 1], {
    labelVectors, lastQuestionDimension: 'scope', text: 'Em tudo isso'
  });
  assert.equal(scopeResult.intent, 'scope_all');

  const summaryResult = classifyWithLocalEmbedding([0, 1, 0], {
    labelVectors, text: 'Me ajuda a organizar isso'
  });
  assert.equal(summaryResult.intent, 'summary');
  assert.equal(summaryResult.modelVersion, OFFLINE_EMBEDDING_LAB_VERSION);
  assert.ok(!('diagnosis' in summaryResult));
});

test('quoted speech and multiline input always abstain', () => {
  const labelVectors = { summary: [[1, 0]] };
  assert.equal(classifyWithLocalEmbedding([1, 0], {
    labelVectors, text: 'Ela disse "quero resumir"'
  }).intent, null);
  assert.equal(classifyWithLocalEmbedding([1, 0], {
    labelVectors, text: 'linha1\nlinha2'
  }).intent, null);
});

test('optional ONNX executable parses arguments without loading models or network', () => {
  const file = fileURLToPath(new URL('../../experiments/onnx-lab/bench-local-onnx.mjs', import.meta.url));
  const check = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  assert.equal(check.status, 0, check.stderr);
  const missing = spawnSync(process.execPath, [file], { encoding: 'utf8', timeout: 10000 });
  assert.equal(missing.status, 2, missing.stderr);
  assert.match(missing.stderr, /model-root and model-name are required/);
  assert.doesNotMatch(missing.stderr, /https?:\/\//);
});
