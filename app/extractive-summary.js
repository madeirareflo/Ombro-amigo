/** Local, extractive summary for free writing. No NLP diagnosis or rewriting. */
export const EXTRACTIVE_SUMMARY_VERSION='traceable-extractive-v1';
const headings=[
  {id:'facts',title:'Trechos do meu relato'},
  {id:'emotions',title:'Sentimentos que nomeei'},
  {id:'difficulties',title:'O que eu disse estar difícil'},
  {id:'sessionPoints',title:'Pontos que eu disse querer levar à sessão'}
];
function categoryOf(text){
  const s=String(text).toLocaleLowerCase('pt-BR');
  // Only explicit first-person utterances, with no quoted or third-party scope.
  if(/["“”«»]/.test(text)||/\b(?:ela|ele|minha amiga|meu amigo|minha irmã|meu irmão)\b/i.test(s))return 'facts';
  if(/\b(?:eu |me |eu me |estou |t[oô] )/.test(s)&&/\b(?:me sinto|estou|t[oô])\s+(?:muito\s+)?(?:triste|sozinh[oa]|solit[aá]ri[oa]|ansios[oa]|preocupad[oa]|nervos[oa])\b/i.test(s)&&!/\b(?:n[aã]o|nunca)\s+(?:me sinto|estou|t[oô])/i.test(s))return 'emotions';
  if(/\b(?:eu |meu |minha |tenho |n[aã]o consigo |travo |eu travo )/i.test(s)&&/\b(?:n[aã]o consigo falar|dif[ií]cil falar|tenho vergonha de contar|tenho medo de contar|eu travo|travo quando)/i.test(s))return 'difficulties';
  if(/\b(?:quero|gostaria|preciso)\s+(?:conseguir\s+)?(?:falar|contar|levar|explicar)\b/i.test(s)&&/\b(?:sess[aã]o|terapia|psic[oó]log[ao])\b/i.test(s))return 'sessionPoints';
  return 'facts';
}
export function extractTraceableSummary(input){
  const original=String(input||'');
  const result={version:EXTRACTIVE_SUMMARY_VERSION,sections:headings.map(h=>({...h,items:[]})),original};
  if(!original.trim())return result;
  // Separate paragraphs and sentence endings conservatively; keep original substrings.
  // No split at abbreviations or short clauses: prefer whole paragraph if ambiguous.
  const chunks=[];
  const lineRe=/[^\n]+/g;
  for(const match of original.matchAll(lineRe)){
    const line=match[0], base=match.index;
    const sentenceRe=/[^.!?]+(?:[.!?]+(?=\s|$)|$)/g;
    const candidates=[...line.matchAll(sentenceRe)];
    if(candidates.length<=1){if(line.trim())chunks.push({text:line.trim(),start:base+line.indexOf(line.trim())});continue;}
    for(const candidate of candidates){
      const phrase=candidate[0].trim();
      if(phrase)chunks.push({text:phrase,start:base+candidate.index+candidate[0].indexOf(phrase)});
    }
  }
  for(const c of chunks){
    const section=result.sections.find(x=>x.id===categoryOf(c.text));
    section.items.push({
      id:'source-'+c.start,
      text:c.text,
      origin:'user',
      source:{start:c.start,end:c.start+c.text.length}
    });
  }
  return result;
}
export function hasExactProvenance(input,item){
  if(item?.origin!=='user'||!item?.source)return false;
  const {start,end}=item.source;
  return Number.isSafeInteger(start)&&Number.isSafeInteger(end)&&start>=0&&end>start
    &&String(input||'').slice(start,end)===item.text;
}
