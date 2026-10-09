import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createConversation, openingQuestion, nextQuestion, buildStructuredSummary,
  detectConversationControlIntent
} from '../../conversation/engine.js';
import {
  selectGroundedFollowup, groundedBriefReference,
  isExplicitLonelinessDeclaration
} from '../../conversation/grounded-followups.js';

test('screen-reproduction: motivation scope -> loneliness -> tudo stays connected', () => {
  const state=createConversation({mode:'feeling',depth:'light'});
  const opening=openingQuestion(state);
  assert.match(opening,/vontade de fazer as coisas/i);
  const first=nextQuestion(state,'vontade de fazer as coisas');
  assert.match(first,/vontade de fazer as coisas/i);
  assert.doesNotMatch(first,/parte mais importante|próxima sessão|material suficiente/i);
  assert.equal((first.match(/\?/g)||[]).length,1);

  const second=nextQuestion(state,'eme sinto solitario');
  assert.match(second,/você disse que se sente só|momento específico/i);
  assert.doesNotMatch(second,/próxima sessão|material suficiente|diagnóstico/i);
  assert.equal((second.match(/\?/g)||[]).length,1);

  const third=nextQuestion(state,'tudo');
  assert.match(third,/“tudo”|esse “tudo”/i);
  assert.match(third,/alguma parte em especial|um pouco melhor/i);
  assert.doesNotMatch(third,/já apareceu material suficiente/i);
  assert.equal((third.match(/\?/g)||[]).length,1);

  // The assistant MUST NOT invent "poor motivation", symptom, cause, or
  // frequency from the selection of an area or from an ambiguous "tudo".
  assert.equal(state.entries.length,2);
  assert.deepEqual(state.entries.map(x=>x.text),[
    'vontade de fazer as coisas', 'eme sinto solitario'
  ]);
  const summary=buildStructuredSummary(state);
  assert.deepEqual(summary.emotions,['eme sinto solitario']);
  assert.deepEqual(summary.facts,['vontade de fazer as coisas']);
  assert.ok(!JSON.stringify(summary).includes('depressão'));
});

test('loneliness variants require an explicit first-person declaration', () => {
  for (const phrase of [
    'me sinto solitário', 'Me sinto solitária.', 'me sinto sozinho',
    'eu me sinto isolada', 'estou me sentindo sozinha',
    'to me sentindo solitario', 'eme sinto solitario'
  ]) {
    assert.equal(isExplicitLonelinessDeclaration(phrase),true,phrase);
  }
  for (const phrase of [
    'Minha amiga se sente solitária.',
    'Ela disse: "me sinto solitária"',
    'Ontem ouvi ela falar que se sente isolada.',
    'não me sinto solitário', // Negation is not a declaration of loneliness.
    'o filme falava de solidão',
    'me sinto solitário porque tenho depressão', // Outside narrow template.
    '"me sinto sozinho"'
  ]) {
    assert.equal(isExplicitLonelinessDeclaration(phrase),false,phrase);
  }
});

test('a third-person loneliness quote is never paraphrased as the user feeling lonely', () => {
  const state=createConversation({mode:'session',depth:'medium'});
  openingQuestion(state);
  const answer='Minha amiga disse: "me sinto solitária"';
  const reply=nextQuestion(state,answer);
  assert.doesNotMatch(reply,/você contou que se sente só/i);
  assert.deepEqual(state.entries.map(x=>x.text),[answer]);
  assert.equal(buildStructuredSummary(state).emotions.length,0);
});

test('motivation branch needs exact initial scope and does not assume loss of motivation', () => {
  const state=createConversation({mode:'feeling',depth:'medium'});
  openingQuestion(state);
  const next=nextQuestion(state,'vontade de fazer as coisas');
  assert.match(next,/vontade de fazer as coisas/i);
  assert.doesNotMatch(next,/perdeu a vontade|falta de energia|desânimo|depressão/i);

  const withoutScope=createConversation({mode:'session',depth:'medium'});
  openingQuestion(withoutScope);
  assert.equal(selectGroundedFollowup(withoutScope,'vontade de fazer as coisas'),null);
});

test('explicit stop and crisis handling are not overridden by grounded follow-ups', () => {
  const state=createConversation({mode:'feeling',depth:'deep'});
  openingQuestion(state);
  const stop=nextQuestion(state,'Não quero aprofundar');
  assert.match(stop,/parar por aqui/i);
  assert.ok(!state.entries.some(x=>x.text==='Não quero aprofundar'&&x.categories.includes('fact')));
  assert.equal(detectConversationControlIntent('Prefiro não responder essa pergunta'), 'skip');
});

test('record-only mode preserves content and never opens a guided dialogue', () => {
  const state=createConversation({mode:'record',depth:'deep'});
  openingQuestion(state);
  assert.equal(selectGroundedFollowup(state,'me sinto solitário'),null);
  const reply=nextQuestion(state,'me sinto solitário');
  assert.match(reply,/registrado/i);
  assert.doesNotMatch(reply,/quer registrar como isso aparece/i);
  assert.deepEqual(buildStructuredSummary(state).emotions,['me sinto solitário']);
});

test('ambiguous references must not be interpreted as facts after unrelated turns', () => {
  const state=createConversation({mode:'session',depth:'medium'});
  openingQuestion(state);
  assert.equal(groundedBriefReference(state,'tudo'),null);
  const next=nextQuestion(state,'tudo');
  assert.match(next,/sem completar por você|sem adivinhar|não preciso/i);
  assert.deepEqual(state.entries,[]);
});

test('repeated explicit loneliness does not repeat the same follow-up text', () => {
  const state=createConversation({mode:'feeling',depth:'deep'});
  openingQuestion(state);
  const first=nextQuestion(state,'me sinto solitário');
  const second=nextQuestion(state,'me sinto solitário');
  assert.notEqual(first,second);
  assert.match(second,/estou acompanhando|momento em que isso fica mais forte/i);
});

test('grounded module is offline, non-generative and free of external services', async () => {
  const {readFile}=await import('node:fs/promises');
  const source=await readFile(new URL('../../conversation/grounded-followups.js',import.meta.url),'utf8');
  assert.doesNotMatch(source,/fetch\s*\(|XMLHttpRequest|WebSocket|indexedDB|localStorage|onnx|transformers\.js/i);
});
