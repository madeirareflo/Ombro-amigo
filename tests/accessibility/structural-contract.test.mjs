import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html=await readFile('index.html','utf8');
const css=await readFile('styles.css','utf8');

test('documento declara idioma e títulos de vistas',()=>{
  assert.match(html,/<html lang="pt-BR">/);
  for(const id of ['onboarding-title','home-title','conversation-title','summary-title','safety-title','privacy-title']){
    assert.match(html,new RegExp(`id="${id}"`));
  }
});

test('campos de entrada possuem rótulos explícitos',()=>{
  assert.match(html,/<label[^>]+for="adult-confirm"/);
  assert.match(html,/<label[^>]+for="reply"/);
  assert.match(html,/<fieldset[^>]*>[\s\S]*?<legend[^>]*>Quanto você quer entrar nisso agora\?<\/legend>/);
});

test('regiões dinâmicas essenciais são anunciáveis',()=>{
  assert.match(html,/id="messages"[^>]*aria-live="polite"/);
  assert.match(html,/id="copy-panel"[^>]*aria-live="polite"/);
  assert.match(html,/id="pwa-status"[^>]*aria-live="polite"/);
  assert.match(html,/id="safety-view"[^>]*role="alert"/);
});

test('navegação não usa tabindex positivo',()=>{
  assert.doesNotMatch(html,/tabindex="[1-9][0-9]*"/);
});

test('CSS preserva foco visível e reduz movimento quando solicitado',()=>{
  assert.match(css,/:focus-visible/);
  assert.match(css,/outline:\s*3px\s+solid\s+var\(--focus\)/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});

test('controles principais têm alvo mínimo de pelo menos 44px',()=>{
  const match=css.match(/button\{[^}]*min-height:(\d+)px/);
  assert.ok(match,'regra de altura mínima do botão não encontrada');
  assert.ok(Number(match[1])>=44);
});
