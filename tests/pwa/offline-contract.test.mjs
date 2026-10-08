import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';

test('manifesto declara identidade e escopo locais', async () => {
  const manifest=JSON.parse(await readFile('manifest.webmanifest','utf8'));
  assert.equal(manifest.id,'./');
  assert.equal(manifest.start_url,'./');
  assert.equal(manifest.scope,'./');
  assert.equal(manifest.display,'standalone');
  assert.equal(manifest.lang,'pt-BR');
  assert.ok(Array.isArray(manifest.icons) && manifest.icons.length>0);
});

test('ícones declarados no manifesto existem no repositório', async () => {
  const manifest=JSON.parse(await readFile('manifest.webmanifest','utf8'));
  for(const icon of manifest.icons) {
    const path=icon.src.replace(/^\.\//,'');
    await access(path);
  }
});

test('cache offline inclui os módulos essenciais e o ícone', async () => {
  const sw=await readFile('service-worker.js','utf8');
  const escapeRegex=value=>value.replace(/[-/\\^$*+?.()|[\]{}]/g,'\\$&');
  for(const asset of [
    './index.html',
    './styles.css',
    './manifest.webmanifest',
    './icon.svg',
    './app/main.js',
    './app/clipboard.js',
    './conversation/engine.js',
    './storage/local-store.js',
    './safety/policy.js'
  ]) {
    assert.match(sw,new RegExp(escapeRegex(asset)));
  }
});
