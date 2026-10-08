import test from 'node:test';
import assert from 'node:assert/strict';
import { urgentHelpGuidance } from '../../safety/policy.js';

test('ajuda urgente no Brasil prioriza atendimento humano', () => {
  const guidance=urgentHelpGuidance('BR');
  assert.match(guidance.message,/perigo imediato|ajuda humana/i);
  assert.deepEqual(guidance.resources,[
    {label:'Emergência médica no Brasil',value:'SAMU 192'},
    {label:'Apoio emocional gratuito, 24 horas',value:'CVV 188'}
  ]);
});

test('ajuda urgente fora do Brasil não inventa número regional', () => {
  const guidance=urgentHelpGuidance('XX');
  assert.deepEqual(guidance.resources,[]);
  assert.match(guidance.outside,/serviço de emergência da sua região/i);
});
