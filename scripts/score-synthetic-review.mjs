import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {evaluateReviewFile} from '../research/human-fidelity-scoring.js';

const file=process.argv[2];
if(!file){
  process.stderr.write('Usage: node scripts/score-synthetic-review.mjs <local-review.json>\n');
  process.exitCode=2;
}else{
  try{
    const document=JSON.parse(await readFile(resolve(file),'utf8'));
    const assessment=evaluateReviewFile(document);
    // Only aggregate labels and identifiers, not input or generated writing.
    process.stdout.write(JSON.stringify(assessment,null,2)+'\n');
    if(!assessment.valid||!assessment.allCasesReviewed||assessment.anyCriticalError)process.exitCode=1;
  }catch{
    process.stderr.write('Unable to parse a valid local synthetic review file.\n');
    process.exitCode=2;
  }
}
