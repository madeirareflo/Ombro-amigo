#!/usr/bin/env node
// Offline-only, synthetic-only lab evaluation of lexical baseline.
import { SYNTHETIC_INTENT_EXAMPLES } from '../conversation/local-intent-corpus.js';
import { classifyLocalIntent, localIntentCorpusStats } from '../conversation/local-intent-classifier.js';
import { LOCAL_INTENT_EVAL_V2 } from '../tests/fixtures/local-intent-eval-v2.mjs';
import {
  validateEvaluationFixtures, partitionByFamily, evaluateIntentRows
} from './lib/intent-evaluation-v2.mjs';

const training = Object.values(SYNTHETIC_INTENT_EXAMPLES).flat();
const fixture = validateEvaluationFixtures(LOCAL_INTENT_EVAL_V2, training);
const { validation, holdout } = partitionByFamily(LOCAL_INTENT_EVAL_V2);
const predict = row => classifyLocalIntent(row.text, { lastQuestionDimension: row.questionDimension });
const report = {
  schemaVersion: 'local-intent-evaluation-v2',
  model: localIntentCorpusStats(),
  fixture,
  validation: evaluateIntentRows(validation, predict),
  holdout: evaluateIntentRows(holdout, predict),
  note: 'Fictional paraphrase families, no user content; abstention does not prove safety. This is NOT a production qualification.'
};
// Only aggregated metrics, never original utterances, may reach CI logs.
process.stdout.write(JSON.stringify(report, null, 2) + '\n');
