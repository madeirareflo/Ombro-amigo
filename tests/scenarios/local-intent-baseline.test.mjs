import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  classifyLocalIntent, localIntentCorpusStats, LOCAL_INTENT_MODEL_VERSION
} from '../../conversation/local-intent-classifier.js';

const cases = {
  clarify: ['Como assim?', 'Pode explicar de novo?', 'Não saquei!', 'Eu não entendi sua pergunta', 'Você pode reformular isso?'],
  summary: ['Me ajuda a dizer isso', 'Vamos preparar a síntese', 'Pode fazer um resumo?', 'Quero organizar o que falei', 'Preciso de um texto para a sessão'],
  continue: ['Vamos continuar', 'Pode fazer mais uma pergunta?', 'Ainda quero conversar', 'Quero continuar nesse assunto', 'A gente pode seguir'],
  uncertainty: ['Sei lá!', 'Não faço ideia', 'Estou sem resposta', 'Não tenho certeza', 'Não consigo responder'],
  scope_all: ['Em tudo isso', 'Nas quatro coisas', 'Em todas as áreas', 'Em todos esses aspectos', 'Todas as opções']
};

test('baseline é local e tem corpus inteiramente sintético', () => {
  const stats = localIntentCorpusStats();
  assert.equal(stats.modelVersion, LOCAL_INTENT_MODEL_VERSION);
  assert.ok(stats.sampleCount >= 150);
  assert.deepEqual(stats.labels.sort(), [
    'clarify', 'continue', 'other', 'scope_all', 'skip', 'stop', 'summary', 'uncertainty'
  ]);
});

test('classificador devolve campos simples sem cópia do texto de entrada', () => {
  const secret = 'frase privada desconhecida xpto-12943';
  const result = classifyLocalIntent(secret);
  assert.equal(typeof result.abstained, 'boolean');
  assert.ok(result.similarity >= 0 && result.similarity <= 1);
  assert.ok(result.margin >= 0 && result.margin <= 1);
  assert.ok(!JSON.stringify(result).includes(secret));
  assert.ok(!('input' in result));
});

test('classifica exemplos claros apenas como candidatos auxiliares', () => {
  for (const [label, phrases] of Object.entries(cases)) {
    for (const phrase of phrases) {
      const result = classifyLocalIntent(phrase, { lastQuestionDimension: 'scope' });
      assert.equal(result.candidateIntent, label, phrase + ' => ' + JSON.stringify(result));
      assert.equal(result.intent, label, phrase + ' => ' + JSON.stringify(result));
    }
  }
});

test('escopo amplo só vale quando a pergunta anterior era sobre escopo', () => {
  const withScope = classifyLocalIntent('Em tudo isso', { lastQuestionDimension: 'scope' });
  const noScope = classifyLocalIntent('Em tudo isso');
  assert.equal(withScope.intent, 'scope_all');
  assert.equal(noScope.intent, null);
  assert.equal(noScope.reason, 'missing-question-context');
});

test('stop, skip e conteúdo livre permanecem fora da decisão por modelo', () => {
  for (const phrase of [
    'Quero encerrar', 'Não quero continuar', 'Por hoje é só',
    'Prefiro não responder', 'Pula essa pergunta',
    'Minha irmã me ligou', 'Hoje foi um dia cansativo',
    'Ela disse que quer continuar a conversa'
  ]) {
    const result = classifyLocalIntent(phrase);
    assert.equal(result.intent, null, phrase + ' => ' + JSON.stringify(result));
  }
});

test('aspas, entrada longa, multiline e vazio causam abstenção', () => {
  for (const phrase of [
    '', ' ', 'Ela falou "quero continuar"', 'Ele disse “como assim”',
    'palavras repetidas '.repeat(20), 'primeira linha\nsegunda linha'
  ]) {
    const result = classifyLocalIntent(phrase);
    assert.equal(result.abstained, true, phrase);
    assert.equal(result.intent, null, phrase);
  }
});

test('casos sensíveis não recebem classificação clínica', () => {
  for (const phrase of [
    'Ela disse "vou me matar"', 'Eu não quero me machucar',
    'Quero me machucar agora', 'Ontem pensei em me matar'
  ]) {
    const result = classifyLocalIntent(phrase);
    assert.notEqual(result.intent, 'stop');
    assert.notEqual(result.intent, 'skip');
    assert.ok(!('risk' in result));
    assert.ok(!('diagnosis' in result));
  }
});

test('mede precisão e cobertura em paráfrases fictícias fora do corpus', () => {
  const heldOut = [
    ['clarify', 'O que exatamente essa pergunta quer dizer?'],
    ['clarify', 'Fiquei perdido com essa última pergunta'],
    ['clarify', 'Você pode colocar a pergunta em palavras simples?'],
    ['clarify', 'Desculpa, pode dizer novamente de outro jeito?'],
    ['summary', 'Pode me ajudar a montar o que direi na consulta?'],
    ['summary', 'Quero preparar um texto com o que eu contei'],
    ['summary', 'Como transformo minhas falas em resumo?'],
    ['summary', 'Você consegue organizar isso num rascunho?'],
    ['continue', 'Vamos seguir mais um pouquinho'],
    ['continue', 'Ainda não gostaria de terminar'],
    ['continue', 'Podemos conversar mais um pouco?'],
    ['continue', 'Eu prefiro prosseguir com o assunto'],
    ['uncertainty', 'Ainda estou sem uma resposta'],
    ['uncertainty', 'Sinceramente não faço ideia'],
    ['uncertainty', 'Não consigo encontrar resposta para isso'],
    ['uncertainty', 'Não saberia responder agora'],
    ['scope_all', 'Em todas as alternativas ao mesmo tempo'],
    ['scope_all', 'Acho que em praticamente todos os aspectos'],
    ['scope_all', 'Em todas essas opções que mencionou'],
    ['scope_all', 'Em várias dessas coisas simultaneamente']
  ];
  const evaluated = heldOut.map(([label, phrase]) => ({
    label, phrase, result: classifyLocalIntent(phrase, { lastQuestionDimension: 'scope' })
  }));
  const accepted = evaluated.filter(row => row.result.intent !== null);
  const correct = accepted.filter(row => row.result.intent === row.label);
  const accuracy = accepted.length ? correct.length / accepted.length : 0;
  const coverage = accepted.length / evaluated.length;
  assert.ok(accuracy >= 0.85, JSON.stringify({ accuracy, coverage, incorrect: accepted.filter(x => x.result.intent !== x.label) }));
  assert.ok(coverage >= 0.40, JSON.stringify({ accuracy, coverage }));
});

test('não depende de rede, runtime neural ou armazenamento persistente', async () => {
  const source = await readFile(new URL('../../conversation/local-intent-classifier.js', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /\bfetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon|localStorage|sessionStorage|indexedDB/i);
  assert.doesNotMatch(source, /onnxruntime|transformers\.js|external\s*api/i);
});
