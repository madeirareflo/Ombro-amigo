import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { createReviewMaterials, reviewPacketMarkdown } from '../review/packet.js';

const args=process.argv.slice(2);
const outArg=args.find(arg=>arg.startsWith('--out='));
const seedArg=args.find(arg=>arg.startsWith('--seed='));
const outDir=resolve(outArg?.slice('--out='.length) || 'review-output');
const seed=seedArg?.slice('--seed='.length) || 'ponte-serena-review-v1';

const definitions=JSON.parse(await readFile(new URL('../tests/review/cases.json',import.meta.url),'utf8'));
const materials=createReviewMaterials(definitions,{seed});

await mkdir(outDir,{recursive:true});
await Promise.all([
  writeFile(join(outDir,'review-packet.md'),reviewPacketMarkdown(materials.packet),'utf8'),
  writeFile(join(outDir,'review-key.json'),JSON.stringify(materials.key,null,2),'utf8'),
  writeFile(join(outDir,'review-metadata.json'),JSON.stringify({
    version:materials.packet.version,
    seed,
    cases:materials.packet.cases.length,
    generatedAt:new Date().toISOString(),
    warning:'Casos fictícios. Revisão de comportamento, não validação clínica.'
  },null,2),'utf8')
]);

console.log(`Pacote de revisão gerado em ${outDir} com ${materials.packet.cases.length} casos.`);
