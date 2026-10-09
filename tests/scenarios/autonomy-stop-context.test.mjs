import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createConversation, openingQuestion, nextQuestion,
  buildStructuredSummary, buildSummary
} from '../../conversation/engine.js';
import {
  isDirectStopCommand, DIRECT_STOP_COMMAND_VERSION
} from '../../conversation/autonomy-commands.js';

const direct = [
  'Quero parar.', 'Quero parar por aqui', 'Eu quero parar agora!',
  'Prefiro parar', 'Prefiro parar por aqui',
  'Por hoje é só', 'Chega por hoje.', 'Por hoje basta',
  'Não quero continuar', 'Não quero continuar mais',
  'Não quero continuar conversando', 'Eu não quero continuar com essa conversa',
  'Quero encerrar', 'Quero encerrar nossa conversa',
  'Não quero aprofundar', 'Não quero aprofundar esse assunto',
  'Não quero mais falar', 'Não quero mais falar sobre isso',
  'Preciso parar agora', 'Prefiro encerrar a conversa',
  'Sem mais perguntas', 'Não pergunte mais nada',
  'Vamos parar por aqui', 'Pode encerrar a conversa',
  'Pode parar por favor'
];

const reported = [
  'Minha amiga falou "quero parar".',
  'Ela disse que não quer continuar conversando.',
  'Minha irmã escreveu: “quero encerrar”',
  'Ontem eu disse para alguém que queria parar.',
  'Hoje me lembrei da frase "Por hoje é só".',
  'Ele me contou que prefere parar por aqui.',
  'Meu irmão me pediu para não aprofundar.',
  'Quero parar de adiar as conversas importantes.',
  'Não quero continuar fingindo que está tudo bem.',
  'Eu não quero parar.', // explicit negation of a stop command
  '"Quero parar"',
  "'Não quero continuar'",
  'Quero encerrar o assunto que aconteceu ontem, não a conversa.'
];

test('direct stop classifier works in Portuguese without scanning quoted substrings', () => {
  assert.equal(DIRECT_STOP_COMMAND_VERSION, 'direct-stop-ptbr-v1');
  for (const phrase of direct) assert.equal(isDirectStopCommand(phrase), true, phrase);
  for (const phrase of reported) assert.equal(isDirectStopCommand(phrase), false, phrase);
  assert.equal(isDirectStopCommand(''), false);
  assert.equal(isDirectStopCommand('quero parar '.repeat(50)), false);
});

test('all direct stop commands have priority over neutral follow-ups', () => {
  for (const phrase of direct) {
    const state = createConversation({mode:'feeling', depth:'deep'});
    openingQuestion(state);
    const response = nextQuestion(state, phrase);
    assert.match(response,/podemos parar por aqui/i,phrase);
    assert.equal(state.lastRuleId,'AUTONOMY-SKIP-01',phrase);
    assert.ok(!state.context.catalogHistory?.length,phrase);
    assert.equal(state.entries[0]?.text,phrase);
    assert.deepEqual(state.entries[0]?.categories,['control'],phrase);
    assert.deepEqual(buildStructuredSummary(state),{
      facts:[],emotions:[],difficulties:[],sessionPoints:[]
    },phrase);
  }
});

test('quoted, historical and third-person stop words remain declarations', () => {
  for (const phrase of reported) {
    const state=createConversation({mode:'session',depth:'medium'});
    openingQuestion(state);
    const response=nextQuestion(state,phrase);
    assert.doesNotMatch(response,/Tudo bem\. Podemos parar por aqui\./i,phrase);
    assert.notEqual(state.lastRuleId,'AUTONOMY-SKIP-01',phrase);
    assert.deepEqual(state.entries.map(row=>row.text),[phrase],phrase);
    assert.ok(!state.entries[0].categories.includes('control'),phrase);
    assert.deepEqual(buildStructuredSummary(state).facts,[phrase],phrase);
  }
});

test('a genuine stop does not erase the previously declared experience', () => {
  const state=createConversation({mode:'feeling',depth:'deep'});
  openingQuestion(state);
  const first=nextQuestion(state,'Me sinto solitário.');
  assert.match(first,/se sente só/i);
  const response=nextQuestion(state,'Não quero continuar.');
  assert.match(response,/podemos parar por aqui/i);
  assert.deepEqual(buildStructuredSummary(state).emotions,['Me sinto solitário.']);
  assert.equal(buildSummary(state).includes('Não quero continuar'),false);
});

test('record-only mode honors direct stop without eating reported content', () => {
  const state=createConversation({mode:'record',depth:'light'});
  openingQuestion(state);
  const note='Ela disse: "quero encerrar"';
  const reply=nextQuestion(state,note);
  assert.match(reply,/Registrado/i);
  assert.deepEqual(state.entries.map(row=>row.text),[note]);
  const exit=nextQuestion(state,'Quero encerrar');
  assert.match(exit,/parar por aqui/i);
  assert.equal(state.transcript.at(-2)?.meta,'control:stop');
  assert.deepEqual(state.entries.map(row=>row.text),[note]);
});

test('stop module has no network or behavioral inference dependencies', async () => {
  const {readFile}=await import('node:fs/promises');
  const source=await readFile(new URL('../../conversation/autonomy-commands.js',import.meta.url),'utf8');
  assert.doesNotMatch(source,/\bfetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon|onnx|transformers|localStorage|indexedDB/i);
});
