import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('interface explica cifra local sem prometer proteção impossível',async()=>{
  const html=await readFile('index.html','utf8');
  assert.match(html,/cifradas localmente/i);
  assert.match(html,/chave fica no mesmo perfil do navegador/i);
  assert.match(html,/não protege contra acesso ao navegador desbloqueado|não protege contra.*código comprometido/i);
  assert.doesNotMatch(html,/criptografia ponta a ponta|ninguém consegue ler|100% seguro/i);
});

test('interface diferencia persistência cifrada de fallback em memória',async()=>{
  const html=await readFile('index.html','utf8');
  assert.match(html,/IndexedDB e Web Crypto/i);
  assert.match(html,/somente em memória/i);
});
