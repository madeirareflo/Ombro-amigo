import test from 'node:test';
import assert from 'node:assert/strict';
import {
  NEUTRAL_RESPONSE_CATALOG,
  LOCAL_RESPONSE_CATALOG_VERSION,
  LOCAL_RESPONSE_REVIEW_STATUS,
  selectGuidedResponse, rememberGuidedResponse, validateNeutralResponseCatalog
} from '../../conversation/neutral-response-catalog.js';
import {
  createConversation, openingQuestion, nextQuestion, skipQuestion,
  buildStructuredSummary, chooseAdaptiveTurn, detectConversationControlIntent
} from '../../conversation/engine.js';

test('neutral catalog contains only traceable, one-question draft responses', () => {
  assert.equal(LOCAL_RESPONSE_CATALOG_VERSION, 'guided-neutral-v1');
  assert.equal(LOCAL_RESPONSE_REVIEW_STATUS, 'engineering-draft-not-clinically-reviewed');
  assert.equal(validateNeutralResponseCatalog(), true);
  assert.ok(NEUTRAL_RESPONSE_CATALOG.length >= 15);
  assert.equal(new Set(NEUTRAL_RESPONSE_CATALOG.map(x => x.id)).size, NEUTRAL_RESPONSE_CATALOG.length);
  for (const item of NEUTRAL_RESPONSE_CATALOG) {
    assert.equal(item.reviewStatus, LOCAL_RESPONSE_REVIEW_STATUS);
    assert.equal(item.ruleId, 'CONV-REFLECT-01');
    assert.equal((item.text.match(/\?/g) || []).length, 1);
    assert.doesNotMatch(item.text, /diagnóstico|transtorno|trauma causado|você precisa de mim/i);
  }
  assert.throws(() => validateNeutralResponseCatalog([
    ...NEUTRAL_RESPONSE_CATALOG, NEUTRAL_RESPONSE_CATALOG[0]
  ]), /duplicate/);
  assert.throws(() => validateNeutralResponseCatalog([{
    ...NEUTRAL_RESPONSE_CATALOG[0], text: 'Você tem depressão. O que faz?'
  }]), /prohibited-clinical/);
});

test('mode routing uses a specific neutral prompt without guessing user emotions', () => {
  for (const mode of ['event', 'session', 'feeling', 'afterSession']) {
    const state = createConversation({ mode, depth: 'deep' });
    openingQuestion(state);
    const question = nextQuestion(state, 'Escrevi algumas palavras soltas aqui.');
    assert.ok(NEUTRAL_RESPONSE_CATALOG.some(item => item.text === question && item.mode === mode),
      mode + ': ' + question);
    assert.equal(state.context.catalogHistory.length, 1);
    assert.ok((question.match(/\?/g) || []).length <= 1);
    assert.deepEqual(state.entries.map(x => x.text), ['Escrevi algumas palavras soltas aqui.']);
  }
});

test('catalog does not repeat selected prompts as the user continues', () => {
  const state = createConversation({mode:'session',depth:'deep'});
  openingQuestion(state);
  const catalogPrompts = [];
  for (let i=0; i<10; i++) {
    const answer = 'Anotei mais um ponto número ' + i + '.';
    const reply = nextQuestion(state, answer);
    if (NEUTRAL_RESPONSE_CATALOG.some(item=>item.text===reply)) catalogPrompts.push(reply);
  }
  assert.ok(catalogPrompts.length >= 2, JSON.stringify(catalogPrompts));
  assert.equal(catalogPrompts.length, new Set(catalogPrompts).size);
  assert.ok((state.context.catalogHistory || []).length <= 32);
  assert.equal(state.entries.length, 10);
});

test('old encrypted conversation state accepts catalog without reinterpreting history', () => {
  const state = createConversation({mode:'session',depth:'light'});
  const oldTranscript = JSON.stringify(state.transcript);
  delete state.context;
  const first = nextQuestion(state,'Escrevi algumas palavras soltas aqui.');
  assert.ok(first.length);
  assert.ok(state.context);
  assert.equal(state.transcript[0].text, JSON.parse(oldTranscript)[0].text);
  assert.equal(buildStructuredSummary(state).facts[0], 'Escrevi algumas palavras soltas aqui.');
});

test('protected clinical and sensitive messages never go through neutral catalog', () => {
  const cases = [
    ['Você acha que eu tenho depressão?', /diagnóstico/i],
    ['Só consigo falar com você sobre isso.', /pessoa ou profissional/i],
    ['Não foi isso, você entendeu errado.', /corrigindo|descartar/i],
    ['Quero falar de um abuso que aconteceu.', /assunto sensível/i],
    ['Não quero aprofundar.', /parar por aqui/i]
  ];
  for (const [message, expected] of cases) {
    const state=createConversation({mode:'session',depth:'deep'});
    const result=nextQuestion(state,message);
    assert.match(result,expected);
    assert.ok(!NEUTRAL_RESPONSE_CATALOG.some(item=>item.text===result), message);
    assert.deepEqual(state.context.catalogHistory || [], []);
  }
});

test('explicit summary, clarification and record mode keep autonomy', () => {
  const state = createConversation({mode:'session',depth:'medium'});
  openingQuestion(state);
  const summary = nextQuestion(state,'Me ajuda a organizar isso');
  assert.match(summary,/síntese editável/i);
  assert.deepEqual(state.entries,[]);
  const clarify=nextQuestion(state,'Como assim?');
  assert.match(clarify,/quero dizer|jeito mais simples|qual parte/i);
  assert.deepEqual(state.entries,[]);
  const record=createConversation({mode:'record',depth:'deep'});
  openingQuestion(record);
  assert.equal(selectGuidedResponse(record), null);
  assert.match(nextQuestion(record,'Uma nota importante.'),/registrado/i);
  assert.deepEqual(record.context.catalogHistory || [],[]);
});

test('selection is metadata checked and never records unknown content', () => {
  const state=createConversation({mode:'event',depth:'medium'});
  const selected=selectGuidedResponse(state);
  assert.ok(selected);
  assert.equal(rememberGuidedResponse(state,{catalogId:'injected',text:'falsa pergunta'}),false);
  assert.deepEqual(state.context.catalogHistory || [],[]);
  assert.equal(rememberGuidedResponse(state, selected),true);
  assert.deepEqual(state.context.catalogHistory,[selected.catalogId]);
  assert.equal(selectGuidedResponse(state).catalogId !== selected.catalogId,true);
});

test('no external imports, network or model inference occur in this selector', async () => {
  const {readFile} = await import('node:fs/promises');
  const source=await readFile(new URL('../../conversation/neutral-response-catalog.js',import.meta.url),'utf8');
  assert.doesNotMatch(source, /\bfetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon|onnxruntime|transformers\.js|localStorage|indexedDB/i);
});
