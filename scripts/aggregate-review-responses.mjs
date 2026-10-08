import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { aggregateProfessionalReviews } from '../review/scoring.js';

const args=process.argv.slice(2);
const outArg=args.find(arg=>arg.startsWith('--out='));
const inputs=args.filter(arg=>!arg.startsWith('--'));

if(inputs.length<2){
  throw new Error('Informe pelo menos dois arquivos JSON de revisores independentes.');
}

const responses=await Promise.all(inputs.map(async path=>{
  const raw=await readFile(resolve(path),'utf8');
  return JSON.parse(raw);
}));

const aggregate=aggregateProfessionalReviews(responses);
const output=resolve(outArg?.slice('--out='.length) || 'review-aggregate.json');
await writeFile(output,JSON.stringify({
  ...aggregate,
  generatedAt:new Date().toISOString()
},null,2),'utf8');

console.log(
  `Consolidação salva em ${output}: ${aggregate.reviewerCount} revisores, `+
  `${aggregate.caseCount} casos, releaseBlocked=${aggregate.releaseBlocked}.`
);
