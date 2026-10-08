export const SUMMARY_SECTIONS=Object.freeze([
  {id:'facts',title:'O que aconteceu'},
  {id:'emotions',title:'O que eu disse que senti'},
  {id:'difficulties',title:'O que está difícil de dizer'},
  {id:'sessionPoints',title:'O que eu gostaria de levar para a sessão'}
]);

export function createSummaryModel(structured={}){
  return {
    version:1,
    sections:SUMMARY_SECTIONS.map(section=>({
      ...section,
      items:(structured[section.id] || []).map((text,index)=>({
        id:section.id+'-'+index,
        text:String(text || '').trim(),
        origin:'user'
      })).filter(item=>item.text)
    }))
  };
}

export function normalizeSummaryModel(model){
  if(!model || !Array.isArray(model.sections)) return null;
  return {
    version:1,
    sections:SUMMARY_SECTIONS.map(def=>{
      const section=model.sections.find(item=>item?.id===def.id);
      return {
        ...def,
        items:Array.isArray(section?.items)
          ? section.items.map((item,index)=>({
              id:String(item?.id || def.id+'-'+index),
              text:String(item?.text || '').trim(),
              origin:item?.origin==='edited' ? 'edited' : 'user'
            })).filter(item=>item.text)
          : []
      };
    })
  };
}

export function summaryModelToText(model){
  const normalized=normalizeSummaryModel(model);
  if(!normalized) return '';
  const sections=normalized.sections.map(section=>{
    const body=section.items.length
      ? section.items.map(item=>'• '+sentence(item.text)).join('\n')
      : '• Ainda não ficou claro para mim.';
    return section.title+'\n'+body;
  });
  return [
    'Rascunho para levar à sessão:',
    '',
    ...sections.flatMap((section,index)=>index ? ['',section] : [section]),
    '',
    'Revise livremente. Se alguma parte não representar você, apague ou reescreva.'
  ].join('\n');
}

export function markItemEdited(model,sectionId,itemId,text){
  const normalized=normalizeSummaryModel(model);
  if(!normalized) return null;
  const section=normalized.sections.find(item=>item.id===sectionId);
  const item=section?.items.find(entry=>entry.id===itemId);
  if(!item) return normalized;
  item.text=String(text || '').trim();
  item.origin='edited';
  section.items=section.items.filter(entry=>entry.text);
  return normalized;
}

export function addEditedItem(model,sectionId,text=''){
  const normalized=normalizeSummaryModel(model) || createSummaryModel({});
  const section=normalized.sections.find(item=>item.id===sectionId);
  if(!section) return normalized;
  section.items.push({
    id:sectionId+'-edited-'+Date.now()+'-'+section.items.length,
    text:String(text || ''),
    origin:'edited'
  });
  return normalized;
}

export function removeSummaryItem(model,sectionId,itemId){
  const normalized=normalizeSummaryModel(model);
  if(!normalized) return null;
  const section=normalized.sections.find(item=>item.id===sectionId);
  if(section) section.items=section.items.filter(item=>item.id!==itemId);
  return normalized;
}

function sentence(text){
  const value=String(text || '').trim();
  if(!value) return '';
  return value.charAt(0).toUpperCase()+value.slice(1).replace(/[.!?]+$/,'')+'.';
}
