import test from 'node:test';
import assert from 'node:assert/strict';
import {
  detectExplicitAttunementDeclaration, selectAttunedTurn, ATTUNEMENT_IDS
} from '../../conversation/attuned-turns.js';
import {
  createConversation, openingQuestion, nextQuestion, buildStructuredSummary
} from '../../conversation/engine.js';

test('only anchored current-speaker declarations become attuned follow-ups', () => {
  const samples = [
    ['estou triste','sadness'],['me sinto chateada','sadness'],
    ['eu me sinto abatido','sadness'],['estou ansiosa','anxiety'],
    ['to preocupado','anxiety'],['me sinto nervoso','anxiety'],
    ['tenho vergonha de contar isso','difficulty_speaking'],
    ['não consigo falar sobre isso','difficulty_speaking'],
    ['tenho medo de contar','difficulty_speaking']
  ];
  for (const [utterance,label] of samples) {
    assert.equal(detectExplicitAttunementDeclaration(utterance),label,utterance);
  }
  assert.deepEqual(ATTUNEMENT_IDS,['sadness','anxiety','difficulty_speaking']);
});

test('negations, quoted text and statements about another person never become self-declarations', () => {
  const negatives = [
    'não estou triste','não me sinto ansioso','não tenho vergonha de falar',
    'Ela está triste','meu amigo se sente ansioso',
    'Ela disse "estou triste"','"me sinto preocupado"',
    'Ontem eu estava triste','eu disse que estava nervoso',
    'na minha cabeça eu penso que estou ansioso',
    'estou ansiosa por causa de um trauma',
    'estou triste\nela disse algo'
  ];
  for (const text of negatives) {
    assert.equal(detectExplicitAttunementDeclaration(text),null,text);
  }
});

test('every mode can respond to a declared feeling without generic session checkpoint', () => {
  for (const mode of ['event','session','feeling','afterSession']) {
    const state=createConversation({mode,depth:'light'});
    openingQuestion(state);
    const result=nextQuestion(state,'Estou triste.');
    assert.match(result,/você falou de como está se sentindo|ficar nas suas palavras/i);
    assert.doesNotMatch(result,/material suficiente|já dá para escolher|próxima sessão\?/i);
    assert.equal((result.match(/\?/g)||[]).length,1);
    assert.equal(buildStructuredSummary(state).emotions.includes('Estou triste.'),true);
  }
});

test('a different first-person feeling is reflected without asserting its cause or diagnosis', () => {
  const state=createConversation({mode:'session',depth:'deep'});
  openingQuestion(state);
  const first=nextQuestion(state,'me sinto ansiosa');
  assert.match(first,/você mencionou como está se sentindo/i);
  assert.doesNotMatch(first,/doença|ansiedade clínica|depressão|porque você/i);
  const second=nextQuestion(state,'me sinto ansiosa');
  assert.notEqual(first,second);
  assert.equal((second.match(/\?/g)||[]).length,1);
  assert.deepEqual(state.entries.map(x=>x.text),['me sinto ansiosa','me sinto ansiosa']);
});

test('an expressed difficulty to talk offers choice and does not demand details', () => {
  const state=createConversation({mode:'session',depth:'deep'});
  openingQuestion(state);
  const reply=nextQuestion(state,'tenho vergonha de contar isso');
  assert.match(reply,/primeira frase|não entrar nesse assunto/i);
  assert.doesNotMatch(reply,/quem fez|onde foi|me conte tudo|por que tem vergonha/i);
  assert.ok(buildStructuredSummary(state).difficulties.includes('tenho vergonha de contar isso'));
});

test('first-person quotes about others do not become personal emotion in the summary', () => {
  const state=createConversation({mode:'session',depth:'medium'});
  openingQuestion(state);
  const said='Minha irmã escreveu "estou triste".';
  const reply=nextQuestion(state,said);
  assert.doesNotMatch(reply,/você falou de como está se sentindo/i);
  assert.deepEqual(buildStructuredSummary(state).emotions,[]);
});

test('strict autonomy controls and sensitive topic rules beat natural phrasing', () => {
  for (const [text, expected] of [
    ['Quero encerrar',/parar por aqui/i],
    ['Prefiro não responder essa pergunta',/outro caminho|síntese/i],
    ['Quero falar de um abuso que aconteceu',/assunto sensível/i]
  ]) {
    const state=createConversation({mode:'session',depth:'deep'});
    openingQuestion(state);
    assert.match(nextQuestion(state,text),expected);
  }
});

test('record-only never turns an emotional note into dialogue', () => {
  const state=createConversation({mode:'record',depth:'deep'});
  openingQuestion(state);
  assert.equal(selectAttunedTurn(state,'estou triste'),null);
  assert.match(nextQuestion(state,'estou triste'),/registrado/i);
});

test('selector imports no model, network, logging or remote API', async () => {
  const {readFile}=await import('node:fs/promises');
  const source=await readFile(new URL('../../conversation/attuned-turns.js',import.meta.url),'utf8');
  assert.doesNotMatch(source,/fetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon|onnxruntime|transformers\.js|console\.log|localStorage|indexedDB/i);
});
