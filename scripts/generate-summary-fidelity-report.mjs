import { readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import {
  simulateSummaryGroundingCase,
  aggregateGroundingAudits
} from '../research/summary-fidelity.js';
import { buildResearchMetadata, normalizeSourceSha } from '../research/report-metadata.js';

const args=process.argv.slice(2);
const outArg=args.find(arg=>arg.startsWith('--out='));
const shaArg=args.find(arg=>arg.startsWith('--sha='));
const output=outArg?.slice('--out='.length) || 'summary-fidelity-report.json';

function resolveSourceSha(){
  if(shaArg) return normalizeSourceSha(shaArg.slice('--sha='.length));
  try{
    return normalizeSourceSha(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}));
  }catch{
    throw new Error('Não foi possível resolver o SHA da versão. Rode dentro do repositório Git ou informe --sha=<commit>.');
  }
}

const corpusUrl=new URL('../tests/research/summary-fidelity-corpus.json',import.meta.url);
const corpusRaw=await readFile(corpusUrl,'utf8');
const corpus=JSON.parse(corpusRaw);
const results=corpus.map(definition=>{
  const simulated=simulateSummaryGroundingCase(definition);
  return {
    id:definition.id,
    purpose:definition.purpose,
    audit:simulated.audit
  };
});
const report={
  version:1,
  scope:'auditoria sintética de grounding textual; não mede fidelidade semântica ou eficácia clínica',
  metadata:buildResearchMetadata({
    sourceSha:resolveSourceSha(),
    corpusRaw
  }),
  aggregate:aggregateGroundingAudits(results),
  cases:results
};
await writeFile(output,JSON.stringify(report,null,2),'utf8');
console.log(`Relatório de grounding salvo em ${output} para ${report.metadata.sourceSha}`);
