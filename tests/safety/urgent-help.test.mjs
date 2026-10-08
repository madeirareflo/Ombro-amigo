import test from 'node:test';
import assert from 'node:assert/strict';
import { urgentHelpGuidance, detectExplicitImmediateDanger, assessSafety } from '../../safety/policy.js';

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


test('detecta apenas linguagem explícita de perigo imediato', () => {
  assert.equal(detectExplicitImmediateDanger('Eu quero me matar.'),true);
  assert.equal(detectExplicitImmediateDanger('Vou me machucar.'),true);
  assert.equal(detectExplicitImmediateDanger('Tenho um plano para me suicidar.'),true);
  assert.equal(detectExplicitImmediateDanger('Eu vou matar alguém.'),true);
});

test('não transforma sofrimento vago em avaliação automática de risco', () => {
  assert.equal(detectExplicitImmediateDanger('Não aguento mais essa semana.'),false);
  assert.equal(detectExplicitImmediateDanger('Estou péssimo e sem energia.'),false);
  assert.equal(detectExplicitImmediateDanger('Tenho medo de morrer.'),false);
});

test('negação explícita não é tratada como intenção imediata', () => {
  assert.equal(detectExplicitImmediateDanger('Eu não quero me matar.'),false);
  assert.equal(detectExplicitImmediateDanger('Não vou me machucar.'),false);
});

test('perigo explícito gera interrupção para ajuda humana, não manejo clínico', () => {
  const explicit=detectExplicitImmediateDanger('Quero me suicidar.');
  const result=assessSafety({explicitImmediateDanger:explicit});
  assert.equal(result.interrupt,true);
  assert.equal(result.level,'immediate-risk');
  assert.match(result.message,/apoio humano|serviço de emergência/i);
  assert.doesNotMatch(result.message,/diagnóstico|tratamento|eu vou te salvar/i);
});
