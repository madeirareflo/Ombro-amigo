export const AI_BOUNDARIES = Object.freeze({
  diagnose: false,
  prescribe: false,
  clinicalInterpretation: false,
  automaticSharing: false,
  emotionalDependencyLanguage: false,
  preferredBehavior: 'ask-clarify-organize-confirm'
});

const EXPLICIT_DANGER_PATTERNS = [
  /\b(eu\s+)?(quero|vou|pretendo)\s+(me matar|me suicidar|tirar minha vida)\b/i,
  /\b(eu\s+)?(quero|vou|pretendo)\s+me\s+(machucar|ferir)\b/i,
  /\b(tenho|fiz)\s+(um\s+)?plano\s+(para|pra|de)\s+(me matar|me suicidar|tirar minha vida)\b/i,
  /\b(eu\s+)?(vou|quero|pretendo)\s+matar\s+(alguém|alguem|ele|ela)\b/i
];

const EXPLICIT_NEGATIONS = [
  /\b(eu\s+)?(não|nao)\s+(quero|vou|pretendo)\s+(me matar|me suicidar|tirar minha vida)\b/i,
  /\b(eu\s+)?(não|nao)\s+(quero|vou|pretendo)\s+me\s+(machucar|ferir)\b/i
];

export function detectExplicitImmediateDanger(text) {
  const value=String(text || '').trim();
  if(!value) return false;
  if(EXPLICIT_NEGATIONS.some(pattern=>pattern.test(value))) return false;
  return EXPLICIT_DANGER_PATTERNS.some(pattern=>pattern.test(value));
}

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
