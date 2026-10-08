import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('home expõe somente três caminhos principais',async()=>{
  const html=await readFile('index.html','utf8');
  const match=html.match(/<div class="primary-paths"[\s\S]*?<\/div>/);
  assert.ok(match);
  assert.equal((match[0].match(/data-start=/g)||[]).length,3);
});

test('onboarding exige confirmação 18+ antes de continuar',async()=>{
  const html=await readFile('index.html','utf8');
  assert.match(html,/id="adult-confirm"/);
  assert.match(html,/id="acknowledge-test"[^>]*disabled/);
  assert.match(html,/18 anos ou mais/);
});

test('visual inclui foco visível e reduced motion',async()=>{
  const css=await readFile('styles.css','utf8');
  assert.match(css,/:focus-visible/);
  assert.match(css,/prefers-reduced-motion/);
});

test('síntese expõe proveniência e estrutura separadas',async()=>{
  const html=await readFile('index.html','utf8');
  assert.match(html,/Você escreveu/);
  assert.match(html,/Você editou/);
  assert.match(html,/Estrutura do app/);
  assert.match(html,/id="summary-editor"/);
});

test('interface mostra estado offline sem telemetria',async()=>{
  const html=await readFile('index.html','utf8');
  assert.match(html,/id="pwa-status"/);
  const srcs=[...html.matchAll(/<script[^>]+src=["']([^"']+)["']/g)].map(match=>match[1]);
  assert.ok(srcs.every(src=>src.startsWith('./') || src.startsWith('/')));
});
