import {extractTraceableSummary} from './extractive-summary.js';
export function selectedHighlight(input,start,end){
  const text=String(input??'');
  if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||end>text.length||end<=start)return null;
  const selected=text.slice(start,end);
  if(!selected.trim())return null;
  return {start,end,text:selected};
}
export function highlightedExtractiveSummary(input,selection){
  const model=extractTraceableSummary(input);
  if(!selection||!selectedHighlight(input,selection.start,selection.end)
    ||input.slice(selection.start,selection.end)!==selection.text)return model;
  const target=model.sections.find(section=>section.id==='sessionPoints');
  target.items.unshift({id:'selected-'+selection.start,text:selection.text,
    origin:'user',source:{start:selection.start,end:selection.end},explicitHighlight:true});
  return model;
}
