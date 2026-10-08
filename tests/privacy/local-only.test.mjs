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
  assert.match(html,/Nada automaticamente/);
  assert.match(html,/seu texto não é enviado ao mantenedor/i);
});

test('não há scripts externos na página principal', async () => {
  const html=await readFile('index.html','utf8');
  const srcs=[...html.matchAll(/<script[^>]+src=["']([^"']+)["']/g)].map(match=>match[1]);
  assert.ok(srcs.length>0);
  assert.ok(srcs.every(src=>src.startsWith('./') || src.startsWith('/')));
});


test('página não envia referrer ao navegar para fora', async () => {
  const html=await readFile('index.html','utf8');
  assert.match(html,/name="referrer" content="no-referrer"/);
});

test('recursos carregados pela página principal são locais', async () => {
  const html=await readFile('index.html','utf8');
  const refs=[
    ...[...html.matchAll(/<script[^>]+src=["']([^"']+)["']/g)].map(match=>match[1]),
    ...[...html.matchAll(/<link[^>]+href=["']([^"']+)["']/g)].map(match=>match[1]),
    ...[...html.matchAll(/<img[^>]+src=["']([^"']+)["']/g)].map(match=>match[1])
  ];
  assert.ok(refs.length>0);
  assert.ok(refs.every(ref=>ref.startsWith('./') || ref.startsWith('/')));
});


test('compartilhamento manual é descrito como cópia, não envio automático', async () => {
  const html=await readFile('index.html','utf8');
  assert.match(html,/Copiar síntese/);
  assert.match(html,/não envia o texto|não é enviado ao mantenedor/i);
  assert.doesNotMatch(html,/navigator\.share/);
});
