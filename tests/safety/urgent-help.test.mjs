import test from 'node:test';
import assert from 'node:assert/strict';
import {
  urgentHelpGuidance,
  detectExplicitImmediateDanger,
  classifyExplicitDangerStatement,
  assessSafety
} from '../../safety/policy.js';

test('ajuda urgente no Brasil prioriza atendimento humano', () => {
  const guidance=urgentHelpGuidance('BR');
  assert.match(guidance.message,/perigo imediato|atendimento humano/i);
  assert.deepEqual(guidance.resources,[
    {label:'Emergência médica',value:'SAMU 192',kind:'emergency'},
    {label:'Apoio emocional gratuito, 24 horas',value:'CVV 188',kind:'support'}
  ]);
});

test('ajuda urgente fora do Brasil não inventa número regional', () => {
  const guidance=urgentHelpGuidance('XX');
  assert.deepEqual(guidance.resources,[]);
  assert.match(guidance.outside,/serviço de emergência da sua região/i);
});

test('detecta linguagem explícita atual de perigo imediato', () => {
  assert.equal(detectExplicitImmediateDanger('Eu quero me matar.'),true);
  assert.equal(detectExplicitImmediateDanger('Vou me machucar.'),true);
  assert.equal(detectExplicitImmediateDanger('Tenho um plano para me suicidar.'),true);
  assert.equal(detectExplicitImmediateDanger('Eu vou matar alguém.'),true);
});

test('não transforma sofrimento vago em avaliação automática de risco', () => {
  assert.equal(detectExplicitImmediateDanger('Não aguento mais essa semana.'),false);
  assert.equal(detectExplicitImmediateDanger('Estou péssimo e sem energia.'),false);
  assert.equal(detectExplicitImmediateDanger('Tenho medo de morrer.'),false);
  assert.equal(detectExplicitImmediateDanger('Esse trabalho vai me matar.'),false);
});

test('negação explícita não é tratada como intenção imediata', () => {
  assert.equal(classifyExplicitDangerStatement('Eu não quero me matar.').reason,'explicit-negation');
  assert.equal(detectExplicitImmediateDanger('Não vou me machucar.'),false);
  assert.equal(detectExplicitImmediateDanger('Não tenho intenção de me suicidar.'),false);
});

test('citação ou terceira pessoa não aciona gatilho de primeira pessoa', () => {
  assert.equal(detectExplicitImmediateDanger('Meu amigo disse: "eu quero me matar".'),false);
  assert.equal(detectExplicitImmediateDanger('Ela escreveu "vou me machucar" ontem.'),false);
  assert.equal(detectExplicitImmediateDanger('Um exemplo de frase seria: eu quero me matar.'),false);
});

test('contexto histórico explícito não é tratado como intenção atual', () => {
  assert.equal(detectExplicitImmediateDanger('Ano passado eu pensei em me matar.'),false);
  assert.equal(detectExplicitImmediateDanger('Ontem eu disse que queria me matar.'),false);
  assert.equal(detectExplicitImmediateDanger('Quando eu era adolescente, queria me machucar.'),false);
});

test('perigo explícito interrompe fluxo sem produzir score clínico', () => {
  const explicit=detectExplicitImmediateDanger('Quero me suicidar.');
  const result=assessSafety({explicitImmediateDanger:explicit});
  assert.equal(result.interrupt,true);
  assert.equal(result.level,'immediate-risk');
  assert.match(result.message,/não consigo avaliar|ajuda humana/i);
  assert.doesNotMatch(result.message,/score|baixo risco|alto risco|diagnóstico/i);
});
