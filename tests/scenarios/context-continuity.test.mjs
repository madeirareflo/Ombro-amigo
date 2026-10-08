import test from 'node:test';
import assert from 'node:assert/strict';
import { createConversation, openingQuestion, nextQuestion, buildStructuredSummary, detectConversationControlIntent } from '../../conversation/engine.js';

test('scope answer is resolved from the preceding opening question', () => {
  const state = createConversation({ mode: 'feeling', depth: 'light' });
  openingQuestion(state);
  const next = nextQuestion(state, 'em tudo isso');
  assert.equal(state.context.answerScope, 'all');
  assert.match(next, /mais de uma dessas áreas/i);
  assert.deepEqual(buildStructuredSummary(state).facts, []);
});

test('brief scope response without scope question is not assumed to be a clinical fact', () => {
  const state = createConversation({ mode: 'session', depth: 'medium' });
  openingQuestion(state);
  const next = nextQuestion(state, 'tudo isso');
  assert.match(next, /sem completar por você|sem adivinhar|não preciso que você escolha/i);
  assert.deepEqual(state.entries, []);
});

test('short ambiguous answers are not inserted into summaries', () => {
  for (const word of ['sim', 'não', 'isso', 'tudo', 'mais ou menos', 'talvez']) {
    const state = createConversation({ mode: 'event', depth: 'medium' });
    openingQuestion(state);
    const response = nextQuestion(state, word);
    assert.ok((response.match(/\?/g) || []).length <= 1);
    assert.deepEqual(state.entries, [], word);
    assert.equal(state.transcript.at(-2).text, word);
  }
});

test('substantive declarations remain attributed to the user', () => {
  const state = createConversation({ mode: 'feeling', depth: 'medium' });
  openingQuestion(state);
  nextQuestion(state, 'Sinto um aperto no peito.');
  assert.equal(state.entries.length, 1);
  assert.equal(state.entries[0].text, 'Sinto um aperto no peito.');
});

test('legacy saved states without context are upgraded in memory', () => {
  const state = createConversation({ mode: 'event', depth: 'medium' });
  delete state.context;
  const response = nextQuestion(state, 'sim');
  assert.ok(state.context);
  assert.deepEqual(state.entries, []);
  assert.ok(response.length > 0);
});

test('uncertainty responds without repeating the original scope question', () => {
  const state = createConversation({ mode: 'feeling', depth: 'medium' });
  openingQuestion(state);
  const first = nextQuestion(state, 'Não sei');
  assert.match(first, /não saber/i);
  assert.doesNotMatch(first, /mais no corpo.*pensamentos.*relações/i);
  const second = nextQuestion(state, 'Não sei');
  assert.match(second, /tristeza|medo|raiva|vergonha|culpa|ansiedade/i);
  const third = nextQuestion(state, 'Não sei');
  assert.match(third, /não precisamos insistir|deixar esse ponto em aberto/i);
  assert.deepEqual(buildStructuredSummary(state).facts, []);
  assert.deepEqual(buildStructuredSummary(state).emotions, []);
});

test('same meaning expressed differently does not immediately repeat a question dimension', () => {
  const state = createConversation({ mode: 'feeling', depth: 'medium' });
  openingQuestion(state);
  const first = nextQuestion(state, 'Tenho um aperto no peito.');
  const second = nextQuestion(state, 'Também sinto o peito tenso.');
  assert.match(first, /em que momento/i);
  assert.match(second, /o que estava acontecendo ao redor/i);
  assert.equal(state.context.askedDimensions.includes('timing'), true);
  assert.equal(state.context.askedDimensions.includes('circumstances'), true);
  assert.equal(state.context.questionHistory.length <= 12, true);
});

test('ambiguous shorthand is clarified without creating unsupported facts', () => {
  const state = createConversation({ mode: 'feeling', depth: 'light' });
  openingQuestion(state);
  const first = nextQuestion(state, 'sim');
  assert.match(first, /sem supor nada|deixar essa parte em aberto/i);
  assert.equal(state.entries.length, 0);
  const next = nextQuestion(state, 'mais ou menos');
  assert.match(next, /sem forçar uma definição/i);
  assert.equal(state.entries.length, 0);
  assert.ok(state.transcript.some(item => item.role === 'user' && item.text === 'sim'));
});

test('older conversation with no context infers prior question dimension without rewriting transcript', () => {
  const state = createConversation({ mode: 'feeling', depth: 'light' });
  const opening = state.lastQuestion;
  delete state.context;
  nextQuestion(state, 'em tudo isso');
  assert.equal(state.context.answerScope, 'all');
  assert.equal(state.transcript[0].text, opening);
  assert.deepEqual(state.entries, []);
});

test('natural phrasing of controls is recognized without storing clinical content', () => {
  const { cases } = {
    cases: [
      ['Pode reformular?', 'clarify'],
      ['Não saquei.', 'clarify'],
      ['Não entendi essa pergunta', 'clarify'],
      ['Explica de outro jeito', 'clarify'],
      ['Quero seguir', 'continue'],
      ['Podemos continuar', 'continue'],
      ['Me ajuda a organizar isso', 'summary'],
      ['Me ajuda a explicar pro psicólogo', 'summary'],
      ['Faz um resumo', 'summary'],
      ['Pode resumir?', 'summary']
    ]
  };
  for (const [phrase, intent] of cases) {
    const state = createConversation({ mode: 'session', depth: 'medium' });
    openingQuestion(state);
    assert.equal(detectConversationControlIntent(phrase), intent, phrase);
    nextQuestion(state, phrase);
    assert.equal(state.entries.length, 0, phrase);
  }
});

test('new stop expressions never cause continued probing or factual summaries', () => {
  for (const phrase of ['Não quero mais falar.', 'Quero encerrar.', 'Por hoje é só.']) {
    const state = createConversation({ mode: 'session', depth: 'medium' });
    openingQuestion(state);
    const response = nextQuestion(state, phrase);
    assert.match(response, /parar por aqui|voltar quando quiser/i);
    assert.deepEqual(buildStructuredSummary(state).facts, [], phrase);
  }
});

test('colloquial uncertainty is not recorded as a claim', () => {
  for (const phrase of ['Não faço ideia?', 'Sei lá!', 'Não sei???']) {
    const state = createConversation({ mode: 'feeling', depth: 'medium' });
    openingQuestion(state);
    const response = nextQuestion(state, phrase);
    assert.match(response, /não saber|palavra|ponto em aberto/i);
    assert.deepEqual(buildStructuredSummary(state), {
      facts: [], emotions: [], difficulties: [], sessionPoints: []
    });
  }
});
