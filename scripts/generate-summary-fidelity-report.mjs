import { readFile, writeFile } from 'node:fs/promises';
import {
  simulateSummaryGroundingCase,
  aggregateGroundingAudits
} from '../research/summary-fidelity.js';

const args=process.argv.slice(2);
const outArg=args.find(arg=>arg.startsWith('--out='));
const output=outArg?.slice('--out='.length) || 'summary-fidelity-report.json';

const corpus=JSON.parse(await readFile(new URL('../tests/research/summary-fidelity-corpus.json',import.meta.url),'utf8'));
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
  generatedAt:new Date().toISOString(),
  aggregate:aggregateGroundingAudits(results),
  cases:results
};
await writeFile(output,JSON.stringify(report,null,2),'utf8');
console.log(`Relatório de grounding salvo em ${output}`);
