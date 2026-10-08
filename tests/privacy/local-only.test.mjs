import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('página bloqueia conexões iniciadas pelo app', async () => {
  const html=await readFile('index.html','utf8');
  assert.match(html,/Content-Security-Policy/);
  assert.match(html,/connect-src 'none'/);
});

test('interface declara armazenamento local e ausência de compartilhamento', async () => {
  const html=await readFile('index.html','utf8');
  assert.match(html,/A conversa fica neste aparelho/);
  assert.match(html,/Compartilhamento ainda não foi implementado/);
  assert.match(html,/não possui endpoint para receber suas conversas/);
});

test('não há scripts externos na página principal', async () => {
  const html=await readFile('index.html','utf8');
  const srcs=[...html.matchAll(/<script[^>]+src=["']([^"']+)["']/g)].map(match=>match[1]);
  assert.ok(srcs.length>0);
  assert.ok(srcs.every(src=>src.startsWith('./') || src.startsWith('/')));
});
