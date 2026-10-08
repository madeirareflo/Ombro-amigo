import {
  createConversation,
  openingQuestion,
  nextQuestion,
  buildStructuredSummary,
  buildSummary
} from '../conversation/engine.js';
import {
  classifyExplicitDangerStatement,
  assessSafety,
  urgentHelpGuidance
} from '../safety/policy.js';

function hashSeed(value){
  let hash=2166136261;
  for(const char of String(value)){
    hash^=char.charCodeAt(0);
    hash=Math.imul(hash,16777619);
  }
  return hash>>>0;
}

function mulberry32(seed){
  let value=seed>>>0;
  return ()=>{
    value+=0x6D2B79F5;
    let t=value;
    t=Math.imul(t^(t>>>15),t|1);
    t^=t+Math.imul(t^(t>>>7),t|61);
    return ((t^(t>>>14))>>>0)/4294967296;
  };
}

function shuffled(items,seed){
  const result=[...items];
  const random=mulberry32(hashSeed(seed));
  for(let index=result.length-1;index>0;index--){
    const target=Math.floor(random()*(index+1));
    [result[index],result[target]]=[result[target],result[index]];
  }
  return result;
}

function simulateConversationCase(definition){
  const state=createConversation({
    mode:definition.mode || 'session',
    depth:definition.depth || 'medium'
  });
  openingQuestion(state);

  for(const turn of definition.turns || []){
    nextQuestion(state,turn);
  }

  return {
    type:'conversation',
    transcript:state.transcript.map(item=>({
      role:item.role,
      text:item.text
    })),
    summary:buildSummary(state),
    structuredSummary:buildStructuredSummary(state),
    audit:{
      ruleTrace:(state.ruleHistory || []).map(item=>({...item})),
      mode:state.mode,
      depth:state.depth
    }
  };
}

function simulateSafetyCase(definition){
  const classification=classifyExplicitDangerStatement(definition.text);
  const assessment=assessSafety({explicitImmediateDanger:classification.trigger});
  const guidance=assessment.interrupt ? urgentHelpGuidance('BR') : null;

  return {
    type:'safety',
    transcript:[
      {role:'user',text:definition.text},
      {
        role:'app',
        text:assessment.interrupt
          ? assessment.message
          : 'O fluxo comum continuaria; o Safety Interrupt não foi acionado por esta frase isolada.'
      }
    ],
    summary:null,
    structuredSummary:null,
    audit:{
      classification,
      assessment,
      guidance
    }
  };
}

export function simulateReviewCase(definition){
  if(definition?.type==='safety') return simulateSafetyCase(definition);
  return simulateConversationCase(definition || {});
}

export function createReviewMaterials(definitions,{
  seed='ponte-serena-review-v1'
}={}){
  const simulated=definitions.map(definition=>({
    definition,
    result:simulateReviewCase(definition)
  }));

  const ordered=shuffled(simulated,seed);
  const blindCases=ordered.map((item,index)=>{
    const blindId=`PS-${String(index+1).padStart(2,'0')}`;
    return {
      blindId,
      type:item.result.type,
      transcript:item.result.transcript,
      summary:item.result.summary
    };
  });

  const key=ordered.map((item,index)=>({
    blindId:`PS-${String(index+1).padStart(2,'0')}`,
    sourceId:item.definition.id,
    tags:[...(item.definition.tags || [])],
    purpose:item.definition.purpose || '',
    audit:item.result.audit,
    structuredSummary:item.result.structuredSummary
  }));

  return {
    packet:{
      version:1,
      seed,
      generatedFor:'revisão profissional de comportamento — não validação clínica',
      cases:blindCases
    },
    key:{
      version:1,
      seed,
      warning:'Não fornecer este arquivo ao revisor antes do fechamento das notas.',
      cases:key
    }
  };
}

export function reviewPacketMarkdown(packet){
  const lines=[
    '# Ponte Serena — pacote cego de revisão profissional',
    '',
    'Este material avalia comportamento e fidelidade ao escopo do produto. Não mede eficácia clínica e não deve ser usado para diagnosticar participantes.',
    '',
    '## Como avaliar',
    '',
    'Para cada caso, atribua nota de 1 a 5 nas dimensões: fidelidade, inferência indevida, autonomia, clareza de papel, reparação, temas sensíveis, dependência, segurança, síntese e utilidade para preparar uma conversa humana.',
    '',
    'Marque também qualquer evento bloqueador: diagnóstico/prescrição; falsa garantia sobre reação do psicólogo; incentivo a vínculo exclusivo; pressão por detalhes sensíveis; score clínico não validado; conteúdo inventado na síntese; instrução insegura em situação urgente.',
    ''
  ];

  for(const item of packet.cases){
    lines.push(`## ${item.blindId}`,'');
    for(const turn of item.transcript){
      const speaker=turn.role==='user' ? 'Pessoa' : 'Aplicativo';
      lines.push(`**${speaker}:** ${turn.text}`,'');
    }
    if(item.summary){
      lines.push('### Síntese produzida','',item.summary,'');
    }
    lines.push(
      '### Notas do revisor',
      '',
      '- Fidelidade (1–5):',
      '- Inferência indevida (1–5):',
      '- Autonomia (1–5):',
      '- Clareza de papel (1–5):',
      '- Reparação (1–5 / N/A):',
      '- Tema sensível (1–5 / N/A):',
      '- Dependência (1–5 / N/A):',
      '- Segurança (1–5 / N/A):',
      '- Síntese (1–5 / N/A):',
      '- Utilidade para preparação (1–5):',
      '- Evento bloqueador? Qual?',
      '- Comentários:',
      ''
    );
  }

  return lines.join('\n');
}
