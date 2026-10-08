export const CONVERSATION_POLICY = Object.freeze([
  {
    id:'CONV-START-01',
    category:'behavior',
    title:'Início proporcional',
    objective:'Começar com baixa exigência e sem pedir um relato longo.',
    allowed:['pergunta ampla e simples','usuário escolhe quanto quer dizer'],
    forbidden:['interrogatório inicial','pedido de detalhes íntimos sem necessidade'],
    evidence:['WHO-PFA-2011','SAMHSA-TIP35-2019'],
    evidenceStrength:'professional-guidance',
    limitation:'Princípios gerais de comunicação; não validam o produto.'
  },
  {
    id:'CONV-REFLECT-01',
    category:'behavior',
    title:'Reflexão de baixa inferência',
    objective:'Devolver apenas o tipo de conteúdo explicitamente trazido antes de aprofundar.',
    allowed:['Você trouxe um pensamento...','Você nomeou uma emoção...'],
    forbidden:['Isso mostra que você...','Você claramente tem...'],
    evidence:['SAMHSA-TIP35-2019','RESNICOW-MCMASTER-2012'],
    evidenceStrength:'guidance-plus-peer-reviewed',
    limitation:'Escuta reflexiva é adaptada como princípio de UX, não como tratamento.'
  },
  {
    id:'CONV-CLARIFY-01',
    category:'behavior',
    title:'Esclarecer sem avançar o conteúdo',
    objective:'Quando o usuário pede esclarecimento, reformular a pergunta anterior em vez de tratar o pedido como novo conteúdo.',
    allowed:['como assim?','não entendi','reformular de modo mais simples'],
    forbidden:['registrar o pedido de esclarecimento como fato','mudar de assunto sem responder'],
    evidence:['SAMHSA-TIP35-2019','RESNICOW-MCMASTER-2012'],
    evidenceStrength:'guidance-plus-peer-reviewed',
    limitation:'Regra de UX conversacional; não implica compreensão semântica geral.'
  },
  {
    id:'AUTONOMY-CONTINUE-01',
    category:'autonomy',
    title:'Continuar significa continuar',
    objective:'Quando o usuário escolhe explicitamente explorar mais, fazer uma nova pergunta útil sem repetir imediatamente o checkpoint.',
    allowed:['continuar explorando','nova pergunta de baixa inferência'],
    forbidden:['repetir o mesmo checkpoint','tratar a escolha como conteúdo clínico'],
    evidence:['RESNICOW-MCMASTER-2012','SAMHSA-TRAUMA-2023'],
    evidenceStrength:'guidance-plus-peer-reviewed',
    limitation:'A escolha da próxima pergunta continua baseada em regras locais.'
  },
  {
    id:'AUTONOMY-SUMMARY-01',
    category:'autonomy',
    title:'Pedido natural de síntese',
    objective:'Permitir que pedidos como “Me ajuda a dizer isso” acionem a síntese sem virar conteúdo do relato.',
    allowed:['abrir síntese editável','preservar apenas conteúdo previamente declarado'],
    forbidden:['incluir o comando do usuário na síntese'],
    evidence:['WHO-PFA-2011','SAMHSA-TRAUMA-2023'],
    evidenceStrength:'professional-guidance',
    limitation:'É um atalho de interface, não interpretação clínica.'
  },
  {
    id:'AUTONOMY-CHECKPOINT-01',
    category:'autonomy',
    title:'Checkpoint de escolha',
    objective:'Devolver o controle ao usuário após um bloco curto de exploração.',
    allowed:['continuar','sintetizar','parar'],
    forbidden:['forçar conclusão do fluxo'],
    evidence:['RESNICOW-MCMASTER-2012','SAMHSA-TRAUMA-2023'],
    evidenceStrength:'guidance-plus-peer-reviewed',
    limitation:'A cadência é hipótese de design e deve ser validada em usabilidade.'
  },
  {
    id:'AUTONOMY-SKIP-01',
    category:'autonomy',
    title:'Pular sem penalidade',
    objective:'Permitir não responder sem transformar o pulo em conteúdo clínico.',
    allowed:['mudar de caminho','sintetizar','parar'],
    forbidden:['insistir','interpretar o pulo como resistência'],
    evidence:['WHO-PFA-2011','SAMHSA-TRAUMA-2023'],
    evidenceStrength:'professional-guidance',
    limitation:'Aplicação conservadora de princípios de escolha e não coerção.'
  },
  {
    id:'CONV-DIAGNOSIS-01',
    category:'boundary',
    title:'Sem diagnóstico',
    objective:'Não confirmar nem descartar diagnósticos.',
    allowed:['organizar sinais para levar ao profissional'],
    forbidden:['diagnosticar','probabilidade diagnóstica','tratamento'],
    evidence:['APA-AI-ADVISORY-2025','NIMH-DIGITAL-MH'],
    evidenceStrength:'professional-guidance',
    limitation:'Não substitui avaliação profissional.'
  },
  {
    id:'CONV-DEPENDENCY-01',
    category:'boundary',
    title:'Não reforçar vínculo exclusivo',
    objective:'Evitar linguagem de dependência e redirecionar para comunicação humana.',
    allowed:['preparar conversa com pessoa de confiança ou psicólogo'],
    forbidden:['só precisa de mim','sou a única pessoa que entende você'],
    evidence:['APA-AI-ADVISORY-2025'],
    evidenceStrength:'professional-guidance',
    limitation:'Não é uma métrica clínica de dependência.'
  },
  {
    id:'CONV-REPAIR-01',
    category:'repair',
    title:'Correção invalida formulação',
    objective:'Quando o usuário corrige a IA, descartar a formulação e reparar.',
    allowed:['reconhecer correção','perguntar o que ficou errado'],
    forbidden:['defender interpretação','manter texto rejeitado como referência'],
    evidence:['ZILCHA-MANO-2018','BABL-2026'],
    evidenceStrength:'peer-reviewed',
    limitation:'Literatura de aliança terapêutica é usada como analogia de design; o app não é terapeuta.'
  },
  {
    id:'SAFETY-SENSITIVE-01',
    category:'safety',
    title:'Assunto sensível sem coleta de detalhes',
    objective:'Quando o usuário nomeia explicitamente assunto sensível, oferecer escolha sem pedir detalhes.',
    allowed:['continuar com cuidado','só registrar','levar para sessão'],
    forbidden:['quem fez?','onde foi?','conte em detalhes'],
    evidence:['WHO-PFA-2011','SAMHSA-TRAUMA-2023'],
    evidenceStrength:'professional-guidance',
    limitation:'Não classifica automaticamente outros relatos como trauma.'
  },
  {
    id:'CONV-AFFECT-LABEL-01',
    category:'behavior',
    title:'Vocabulário emocional como hipótese',
    objective:'Oferecer palavras emocionais apenas como opções corrigíveis.',
    allowed:['alguma chega perto — ou nenhuma?'],
    forbidden:['registrar emoção sugerida sem confirmação'],
    evidence:['KIRCANSKI-2012'],
    evidenceStrength:'experimental-specific',
    limitation:'Estudo experimental específico; não sustenta eficácia geral do produto.'
  },
  {
    id:'CONV-THERAPIST-PREDICTION-01',
    category:'boundary',
    title:'Não prever reação do psicólogo',
    objective:'Evitar falsa garantia ou previsão sobre terceiros.',
    allowed:['não consigo prever','transformar receio em tema para sessão'],
    forbidden:['seu psicólogo não vai julgar','com certeza vai entender'],
    evidence:['WHO-PFA-2011','APA-AI-ADVISORY-2025'],
    evidenceStrength:'professional-guidance',
    limitation:'Não prevê comportamento de terceiros.'
  },
  {
    id:'SAFETY-EXPLICIT-DANGER-01',
    category:'safety',
    title:'Perigo imediato explicitamente declarado',
    objective:'Interromper o fluxo comum diante de poucas declarações literais de intenção imediata.',
    allowed:['mostrar ajuda humana','SAMU/CVV no Brasil'],
    forbidden:['score de risco','diagnóstico','inferir risco de sofrimento vago'],
    evidence:['APA-AI-ADVISORY-2025'],
    evidenceStrength:'professional-guidance',
    limitation:'Barreira conservadora; ausência de gatilho não significa ausência de risco.'
  },
  {
    id:'SUMMARY-DECLARED-ONLY-01',
    category:'summary',
    title:'Síntese baseada no declarado',
    objective:'Excluir controles, perguntas e hipóteses não confirmadas da síntese.',
    allowed:['conteúdo declarado pelo usuário','lacuna explícita'],
    forbidden:['inferência como fato','mensagem de controle como conteúdo clínico'],
    evidence:['APA-AI-ETHICS-2025','WHO-PFA-2011'],
    evidenceStrength:'professional-guidance',
    limitation:'É uma regra de segurança e rastreabilidade, não um resultado clínico.'
  }
]);

export function getPolicyRule(id){
  return CONVERSATION_POLICY.find(rule=>rule.id===id) || null;
}

export function validatePolicy(){
  const ids=CONVERSATION_POLICY.map(rule=>rule.id);
  return {
    uniqueIds:new Set(ids).size===ids.length,
    hasEvidence:CONVERSATION_POLICY.every(rule=>Array.isArray(rule.evidence) && rule.evidence.length>0),
    hasLimitations:CONVERSATION_POLICY.every(rule=>Boolean(rule.limitation)),
    count:CONVERSATION_POLICY.length
  };
}
