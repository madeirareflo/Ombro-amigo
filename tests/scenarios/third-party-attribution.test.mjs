import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isThirdPartyOnlyEmotionReport, thirdPartyReportTurn,
  ATTRIBUTION_GUARD_VERSION
} from '../../conversation/third-party-attribution.js';
import {
  createConversation, openingQuestion, nextQuestion, buildStructuredSummary
} from '../../conversation/engine.js';

const others = [
  'Minha amiga ficou triste ontem.',
  'Meu amigo sentiu raiva depois da conversa.',
  'Minha irmã disse que estava com medo.',
  'Meu colega relatou ansiedade.',
  'Ela disse: "estou com medo".',
  'Ele escreveu "me sinto triste" numa mensagem.',
  'Minha mãe estava ansiosa.',
  'Minha namorada disse que tem vergonha.',
  'Meu pai contou que sentiu tristeza.',
  'Ela falou que se sente sozinha ultimamente.',
  'Meu irmão estava assustado.',
  'A amiga ficou decepcionada.',
  'Minha parceira disse que ficou frustrada.',
  'Ela disse “eu fiquei triste”.'
];

const self = [
  'Me sinto solitário.',
  'Eu fiquei triste hoje.',
  'Tenho medo de contar o que aconteceu.',
  'Estou com vergonha de falar.',
  'Minha amiga ficou triste e eu fiquei com medo.',
  'Meu namorado estava assustado e eu fiquei triste.',
  'Minha irmã estava com raiva e eu me senti triste.',
  'Eu senti raiva ao ouvir o que meu amigo falou.'
];

test('only explicit third-person reports are flagged without inventing psychology', () => {
  assert.equal(ATTRIBUTION_GUARD_VERSION,'third-party-affect-v1');
  for (const sentence of others) {
    assert.equal(isThirdPartyOnlyEmotionReport(sentence),true,sentence);
    const turn=thirdPartyReportTurn(sentence);
    assert.match(turn.text,/outra pessoa/i);
    assert.doesNotMatch(turn.text,/você (se sente|sentiu|ficou)|ela (tem|possui) depressão/i);
    assert.equal((turn.text.match(/\?/g)||[]).length,1);
  }
  for (const sentence of self) {
    assert.equal(isThirdPartyOnlyEmotionReport(sentence),false,sentence);
  }
});

test('a third-party feeling remains a fact/report, not a self-declared feeling', () => {
  for (const sentence of others) {
    const state=createConversation({mode:'session',depth:'deep'});
    openingQuestion(state);
    const question=nextQuestion(state,sentence);
    assert.match(question,/outra pessoa/i,sentence);
    assert.doesNotMatch(question,/você nomeou uma emoção/i,sentence);
    assert.deepEqual(buildStructuredSummary(state).emotions,[],sentence);
    assert.deepEqual(buildStructuredSummary(state).facts,[sentence],sentence);
    assert.equal(state.entries[0].text,sentence);
    assert.ok((question.match(/\?/g)||[]).length<=1);
  }
});

test('a user can mention someone else and separately declare their own feeling', () => {
  for (const sentence of self.slice(4)) {
    const state=createConversation({mode:'session',depth:'medium'});
    openingQuestion(state);
    const question=nextQuestion(state,sentence);
    assert.doesNotMatch(question,/Você está relatando algo sobre outra pessoa/i,sentence);
    assert.deepEqual(buildStructuredSummary(state).emotions,[sentence],sentence);
  }
});

test('record-only mode preserves exact words without analysis or questions', () => {
  const state=createConversation({mode:'record',depth:'deep'});
  openingQuestion(state);
  const note='Minha amiga ficou triste ontem.';
  const reply=nextQuestion(state,note);
  assert.match(reply,/registrado/i);
  assert.equal(state.entries[0].text,note);
  assert.deepEqual(buildStructuredSummary(state).emotions,[]);
  assert.deepEqual(buildStructuredSummary(state).facts,[note]);
});

test('explicit direct stop and sensitive-topic guard retain precedence', () => {
  const state=createConversation({mode:'session',depth:'deep'});
  openingQuestion(state);
  assert.match(nextQuestion(state,'Quero parar.'),/parar por aqui/i);
  const second=createConversation({mode:'session',depth:'deep'});
  openingQuestion(second);
  assert.match(nextQuestion(second,'Minha irmã relatou um abuso.'),/assunto sensível/i);
});

test('uncertainty and ambiguous reported content stay outside attribution', () => {
  for (const phrase of [
    'Ela esteve aqui ontem.',
    'Minha irmã me ligou.',
    'Ouvi que alguém estava triste.',
    'Eu não tenho certeza de como me sinto.',
    '',
    'Me sinto triste e penso na minha irmã.'
  ]) {
    assert.equal(isThirdPartyOnlyEmotionReport(phrase),false,phrase);
  }
});

test('attribution layer contains no neural, network or persistence calls', async () => {
  const {readFile}=await import('node:fs/promises');
  const source=await readFile(new URL('../../conversation/third-party-attribution.js',import.meta.url),'utf8');
  assert.doesNotMatch(source,/\bfetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon|onnx|transformers|indexedDB|localStorage/i);
});


test('ambiguous eu também is clarified instead of inheriting someone else emotion', () => {
  const phrase='Ela disse que ficou triste e eu também.';
  assert.equal(isThirdPartyOnlyEmotionReport(phrase),true);
  const state=createConversation({mode:'session',depth:'deep'});
  openingQuestion(state);
  const response=nextQuestion(state,phrase);
  assert.match(response,/“eu também”/i);
  assert.match(response,/explicar com suas palavras/i);
  assert.deepEqual(buildStructuredSummary(state).emotions,[]);
  assert.deepEqual(buildStructuredSummary(state).facts,[phrase]);
});
