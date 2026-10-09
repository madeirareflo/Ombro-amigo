/**
 * Narrow deterministic topic carryover from an explicitly declared earlier turn.
 * Engineering-only, not clinically reviewed. No sentiment inference/ML/network.
 * Never replaces safety, stop/skip, summary, clarification, or sensitive-topic rules.
 */
export const TOPIC_CONTINUITY_VERSION='explicit-topic-carry-v1';
const topics=[
  {id:'loneliness', trigger:/^(?:e?me|eu me) sinto (?:muito )?(?:solitari[oa]|sozinh[oa]|isolad[oa])(?: (?:ultimamente|as vezes|agora|hoje))?$/,
    anchor:'o que você contou sobre se sentir só'},
  {id:'sadness', trigger:/^(?:eu )?(?:estou|to|me sinto|eu me sinto) (?:muito )?(?:triste|chatead[oa]|abatid[oa])(?: (?:hoje|ultimamente|agora))?$/,
    anchor:'o que você contou sobre como está se sentindo'},
  {id:'worry', trigger:/^(?:eu )?(?:estou|to|me sinto|eu me sinto) (?:muito )?(?:ansios[oa]|nervos[oa]|preocupad[oa])(?: (?:hoje|ultimamente|agora))?$/,
    anchor:'o que você contou sobre a sua preocupação'}
];

function normalize(value) {
  return String(value||'').trim().toLocaleLowerCase('pt-BR')
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/\s+/g,' ').replace(/[.!?]+$/g,'');
}
function explicitTopic(text) {
  const raw=String(text||'');
  if(raw.length>110 || /["“”«»\r\n]/.test(raw)) return null;
  const normalized=normalize(raw);
  return topics.find(x=>x.trigger.test(normalized))||null;
}
function contextualFragment(text) {
  const v=normalize(text);
  // Preserve the fragment as user's text; do not decide if a place is a cause
  // or if a word like "sempre" is an objective frequency.
  if(!v || v.length>100 || /["“”«»\r\n]/.test(text)) return false;
  return /^(?:no trabalho|na escola|na faculdade|em casa|com minha familia|com meus amigos|quando estou sozinho|quando estou sozinha|as vezes|ultimamente|quase sempre|todo dia|de noite|a noite|de manha|o dia todo|principalmente a noite|na maior parte do dia)$/.test(v);
}

export function selectTopicCarryover(state, text) {
  if(!state || state.mode==='record' || !contextualFragment(text)) return null;
  const transcript=Array.isArray(state.transcript)?state.transcript:[];
  const history=transcript.slice(0,-1).filter(x=>x?.role==='user');
  // Restrict to immediately preceding user turn to avoid conflating topics.
  const last=history.at(-1);
  if(!last || last.meta || !last.text) return null;
  const topic=explicitTopic(last.text);
  if(!topic) return null;
  const options=[
    {id:'carry-example',dimension:'circumstances',
      text:'Você acrescentou uma parte sobre quando ou onde isso aparece. Quer contar um exemplo, com suas palavras, ou prefere só registrar esse ponto?'},
    {id:'carry-choice',dimension:'choice',
      text:'Podemos continuar a partir dessa parte, sem tirar conclusões. O que você prefere guardar no registro agora?'}
  ];
  const used=new Set(Array.isArray(state.usedQuestions)?state.usedQuestions:[]);
  const found=options.find(x=>!used.has(x.text));
  if(!found)return null;
  return {
    text:found.text,ruleId:'CONV-REFLECT-01',
    topicId:topic.id,continuityId:found.id,
    reviewStatus:'engineering-draft-not-clinically-reviewed'
  };
}
