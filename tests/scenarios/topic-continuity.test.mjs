import test from 'node:test';
import assert from 'node:assert/strict';
import {createConversation,openingQuestion,nextQuestion,buildStructuredSummary} from '../../conversation/engine.js';
import {selectTopicCarryover,TOPIC_CONTINUITY_VERSION} from '../../conversation/topic-continuity.js';

test('two-step sadness context stays on what the person said, not session checkpoint',()=>{
  const state=createConversation({mode:'session',depth:'light'});
  openingQuestion(state);
  const first=nextQuestion(state,'Estou triste');
  assert.match(first,/como está se sentindo/i);
  const second=nextQuestion(state,'no trabalho');
  assert.match(second,/quando ou onde isso aparece/i);
  assert.doesNotMatch(second,/material suficiente|próxima sessão|já temos material/i);
  assert.deepEqual(state.entries.map(x=>x.text),['Estou triste','no trabalho']);
  assert.deepEqual(buildStructuredSummary(state).emotions,['Estou triste']);
  assert.equal(TOPIC_CONTINUITY_VERSION,'explicit-topic-carry-v1');
});

test('loneliness declared first, location fragment next: respect context without inventing cause',()=>{
  const state=createConversation({mode:'feeling',depth:'deep'});
  openingQuestion(state);
  nextQuestion(state,'me sinto solitário');
  const response=nextQuestion(state,'em casa');
  assert.match(response,/quer contar um exemplo|prefere só registrar/i);
  assert.doesNotMatch(response,/sua família te deixa|você está isolado|depressão/i);
  const summary=buildStructuredSummary(state);
  assert.ok(JSON.stringify(summary).includes('em casa'));
  assert.ok(!JSON.stringify(summary).includes('causado'));
});

test('long text, quotes, other-person claims and negation never trigger carryover',()=>{
  const first=[
    'Minha irmã está triste','Ela falou "estou triste"',
    'não estou triste','Ontem me senti sozinho','Estou triste porque meu trabalho me irrita'
  ];
  for(const line of first){
    const state=createConversation({mode:'session',depth:'medium'});
    openingQuestion(state);
    nextQuestion(state,line);
    // Existing state has current reply before chooseAdaptiveTurn.
    state.transcript.push({role:'user',text:'em casa'});
    assert.equal(selectTopicCarryover(state,'em casa'),null,line);
  }
});

test('do not carry topic across an intervening control or unrelated user turn',()=>{
  const state=createConversation({mode:'session',depth:'deep'});
  openingQuestion(state);
  nextQuestion(state,'estou triste');
  nextQuestion(state,'quero seguir');
  state.transcript.push({role:'user',text:'em casa'});
  assert.equal(selectTopicCarryover(state,'em casa'),null);
});

test('never take precedence over autonomy, safety, or record-only mode',()=>{
  for(const phrase of ['Quero encerrar','Pula essa pergunta','Quero falar de um abuso']) {
    const state=createConversation({mode:'session',depth:'deep'});
    openingQuestion(state);
    nextQuestion(state,'me sinto sozinho');
    const response=nextQuestion(state,phrase);
    assert.doesNotMatch(response,/quando ou onde isso aparece/i);
  }
  const state=createConversation({mode:'record',depth:'light'});
  openingQuestion(state);
  nextQuestion(state,'estou triste');
  assert.equal(selectTopicCarryover(state,'em casa'),null);
});

test('topic module is local and does not access network or user storage', async()=>{
  const {readFile}=await import('node:fs/promises');
  const s=await readFile(new URL('../../conversation/topic-continuity.js',import.meta.url),'utf8');
  assert.doesNotMatch(s,/\bfetch\s*\(|XMLHttpRequest|WebSocket|localStorage|indexedDB|onnxruntime/i);
});
