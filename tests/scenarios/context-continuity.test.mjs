import test from 'node:test';
import assert from 'node:assert/strict';
import { createConversation, openingQuestion, nextQuestion, buildStructuredSummary } from '../../conversation/engine.js';

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
