import test from 'node:test';
import assert from 'node:assert/strict';
import {createConversation, openingQuestion, nextQuestion, buildStructuredSummary} from '../../conversation/engine.js';

const paired = [
  ['session', ['estou triste','no trabalho']],
  ['feeling', ['me sinto solitário','em casa']],
  ['event', ['estou preocupado','ultimamente']]
];

test('attentive followups are short and do not present two-choice menus', () => {
  for (const [mode, messages] of paired) {
    const state=createConversation({mode,depth:'deep'});
    openingQuestion(state);
    for(const message of messages) {
      const answer=nextQuestion(state,message);
      assert.ok(answer.length <= 120, answer);
      assert.ok((answer.match(/\?/g)||[]).length <= 1, answer);
      assert.doesNotMatch(answer, /você (?:acrescentou uma parte|mencionou como)|prefere só registrar esse ponto|montar uma síntese|próxima sessão/i);
      assert.doesNotMatch(answer, /diagnóstico|você tem depressão|você está doente/i);
    }
    assert.equal(state.entries.length,2);
    const summary=JSON.stringify(buildStructuredSummary(state));
    assert.ok(!summary.includes('causada por'));
  }
});

test('conversation explicitly allows a user to stop without following up',()=>{
  const state=createConversation({mode:'session',depth:'deep'});
  openingQuestion(state);
  nextQuestion(state,'estou triste');
  const reply=nextQuestion(state,'Quero encerrar');
  assert.match(reply,/parar por aqui/i);
  assert.doesNotMatch(reply,/quer me contar|como costuma ser|o que mais/i);
});

test('short natural style does not attribute a third-party statement to user',()=>{
  const state=createConversation({mode:'session',depth:'medium'});
  openingQuestion(state);
  const reply=nextQuestion(state,'Minha amiga disse "estou triste"');
  assert.doesNotMatch(reply,/poxa|você falou de como está se sentindo/i);
  assert.deepEqual(buildStructuredSummary(state).emotions,[]);
});
