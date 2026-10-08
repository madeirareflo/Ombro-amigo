export const AI_BOUNDARIES = Object.freeze({
  diagnose: false,
  prescribe: false,
  clinicalInterpretation: false,
  automaticSharing: false,
  emotionalDependencyLanguage: false,
  preferredBehavior: 'ask-clarify-organize-confirm'
});

export function assessSafety({ explicitImmediateDanger = false } = {}) {
  if (!explicitImmediateDanger) {
    return { level: 'normal', interrupt: false, message: null };
  }

  return {
    level: 'immediate-risk',
    interrupt: true,
    message:
      'Esta situação precisa de apoio humano agora. A ferramenta deve interromper o fluxo comum e orientar a pessoa a procurar uma pessoa de confiança, seu profissional de saúde ou o serviço de emergência apropriado para sua região.'
  };
}


export function urgentHelpGuidance(countryCode='BR') {
  const common={
    title:'Esta ferramenta não atende crises',
    message:'Se você ou outra pessoa estiver em perigo imediato, procure ajuda humana agora e não dependa desta ferramenta.'
  };

  if(countryCode==='BR') {
    return {
      ...common,
      resources:[
        { label:'Emergência médica no Brasil', value:'SAMU 192' },
        { label:'Apoio emocional gratuito, 24 horas', value:'CVV 188' }
      ],
      outside:'Se você estiver fora do Brasil, use o serviço de emergência da sua região.'
    };
  }

  return {
    ...common,
    resources:[],
    outside:'Use o serviço de emergência da sua região e procure uma pessoa de confiança ou profissional de saúde.'
  };
}
