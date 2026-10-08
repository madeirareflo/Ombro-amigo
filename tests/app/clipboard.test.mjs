import test from 'node:test';
import assert from 'node:assert/strict';
import { copyText } from '../../app/clipboard.js';

test('cópia manual escreve somente no clipboard fornecido', async () => {
  let written='';
  const clipboard={ writeText: async value=>{ written=value; } };
  const ok=await copyText('Resumo autorizado',clipboard);
  assert.equal(ok,true);
  assert.equal(written,'Resumo autorizado');
});

test('não copia texto vazio', async () => {
  const clipboard={ writeText: async ()=>{} };
  await assert.rejects(()=>copyText('   ',clipboard),/empty text/);
});

test('falha de forma explícita quando clipboard não está disponível', async () => {
  await assert.rejects(()=>copyText('Resumo',null),/clipboard unavailable/);
});
