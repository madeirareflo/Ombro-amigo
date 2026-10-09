#!/usr/bin/env node
// PREPARATION STEP (network required): retrieve a pinned PUBLIC model pack.
// Runtime benchmark is a separate command and does not permit remote models.
// Never feed private conversations to this process. No HF account/token needed.
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, writeFile, rm, stat } from 'node:fs/promises';
import { dirname, isAbsolute, join, resolve, sep } from 'node:path';

const REPO = 'Xenova/paraphrase-multilingual-MiniLM-L12-v2';
const REPO_URL = 'https://huggingface.co/' + REPO;
const PINNED_REVISION = '2c4055b12046f11709e9df2c122e59ffbdc2f900';
const MODEL_NAME = 'ptbr-minilm-l12-q8';
const MAX_FILE_BYTES = 150 * 1024 * 1024;

// Known content hashes from the public model repository.
const PINNED_HASHES = Object.freeze({
  'tokenizer.json': 'b60b6b43406a48bf3638526314f3d232d97058bc93472ff2de930d43686fa441',
  'onnx/model_quantized.onnx': '66fc00f5f29afcaff34092e1bdd20008ca3918265a82fb9695a551e510cc4ebc'
});
const FILES = Object.freeze([
  'config.json',
  'tokenizer.json',
  'tokenizer_config.json',
  'special_tokens_map.json',
  'onnx/model_quantized.onnx'
]);

async function sha256(file) {
  const hasher = createHash('sha256');
  for await (const chunk of createReadStream(file)) hasher.update(chunk);
  return hasher.digest('hex');
}

async function run() {
  const args = process.argv.slice(2);
  if (args.length !== 2 || args[0] !== '--root' || !isAbsolute(args[1])) {
    throw new Error('usage: node prepare-public-model-pack.mjs --root ABSOLUTE_LOCAL_DIRECTORY');
  }
  const root = resolve(args[1]);
  // Keep model weights away from repository contents and the public PWA bundle.
  const project = resolve(new URL('../../', import.meta.url).pathname);
  if (root === project || root.startsWith(project + sep)) {
    throw new Error('model pack must be outside git repository');
  }
  const ref = execFileSync('git', ['ls-remote', REPO_URL, 'HEAD'], {
    encoding: 'utf8', timeout: 30000, maxBuffer: 1024
  }).trim().split(/\s+/)[0];
  if (!new RegExp('^[a-f0-9]{40}$').test(ref) || ref !== PINNED_REVISION) {
    throw new Error('upstream revision changed; stop and re-review model before download');
  }
  const modelRoot = join(root, MODEL_NAME);
  await mkdir(modelRoot, { recursive: true });
  const fileMeta = [];
  for (const name of FILES) {
    const file = join(modelRoot, ...name.split('/'));
    await mkdir(dirname(file), { recursive: true });
    const url = REPO_URL + '/resolve/' + ref + '/' + name + '?download=true';
    // curl follows HF's standard CDN/Xet redirect; files are verified before use.
    const command = spawnSync('curl', [
      '--fail', '--location', '--silent', '--show-error',
      '--retry', '2', '--connect-timeout', '30', '--max-time', '360',
      '--output', file, url
    ], { encoding: 'utf8', timeout: 380000 });
    if (command.status !== 0) {
      await rm(file, { force: true });
      throw new Error('failed downloading approved model file ' + name);
    }
    const info = await stat(file);
    if (!info.isFile() || info.size === 0 || info.size > MAX_FILE_BYTES) {
      await rm(file, { force: true });
      throw new Error('invalid file size: ' + name);
    }
    const digest = await sha256(file);
    if (PINNED_HASHES[name] && digest !== PINNED_HASHES[name]) {
      await rm(file, { force: true });
      throw new Error('hash mismatch for ' + name);
    }
    fileMeta.push({ path: name, sha256: digest, bytes: info.size });
  }
  const manifest = {
    modelName: MODEL_NAME,
    sourceRepository: REPO,
    modelRevision: ref,
    license: 'Apache-2.0 (upstream sentence-transformers base model)',
    approvedForExperiment: true,
    files: fileMeta.map(({ path, sha256 }) => ({ path, sha256 }))
  };
  await writeFile(join(modelRoot, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx' });
  // No user text and no model weights are uploaded, printed or committed.
  process.stdout.write('PACK_OK ' + JSON.stringify({
    name: MODEL_NAME, revision: ref, fileCount: fileMeta.length,
    totalMiB: Number((fileMeta.reduce((acc, file) => acc + file.bytes, 0) / 1048576).toFixed(1))
  }) + '\n');
}
run().catch(error => {
  process.stderr.write('PACK_FAILED ' + (error?.message?.startsWith('usage:') ? error.message : 'check pinned revision, download/network, disk space and checksums') + '\n');
  process.exitCode = 2;
});
