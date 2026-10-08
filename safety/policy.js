export const AI_BOUNDARIES = Object.freeze({
  diagnose: false,
  prescribe: false,
  clinicalInterpretation: false,
  automaticSharing: false,
  emotionalDependencyLanguage: false,
  preferredBehavior: 'ask-clarify-organize-confirm'
});

const DIRECT_DANGER_RULES = [
  {
    id:'self-suicide-intent',
    pattern:/\b(eu\s+)?(quero|vou|pretendo)\s+(me matar|me suicidar|tirar minha vida)\b/i
  },
  {
    id:'self-harm-intent',
    pattern:/\b(eu\s+)?(quero|vou|pretendo)\s+me\s+(machucar|ferir)\b/i
  },
  {
    id:'explicit-plan',
    pattern:/\b(tenho|fiz)\s+(um\s+)?plano\s+(para|pra|de)\s+(me matar|me suicidar|tirar minha vida)\b/i
  },
  {
    id:'harm-other-intent',
    pattern:/\b(eu\s+)?(vou|quero|pretendo)\s+matar\s+(alguém|alguem|ele|ela)\b/i
  }
];

const NEGATION_PATTERNS = [
  /\b(eu\s+)?(não|nao)\s+(quero|vou|pretendo)\s+(me matar|me suicidar|tirar minha vida)\b/i,
  /\b(eu\s+)?(não|nao)\s+(quero|vou|pretendo)\s+me\s+(machucar|ferir)\b/i,
  /\b(não|nao)\s+tenho\s+(intenção|intencao|plano)\s+de\s+(me matar|me suicidar|me machucar)\b/i
];

const QUOTED_OR_THIRD_PERSON_PATTERNS = [
  /\b(ele|ela|meu amigo|minha amiga|meu irmão|minha irmã|meu irmao|minha irma)\b.{0,45}\b(disse|falou|escreveu|mandou)\b.{0,45}\b(eu\s+)?(quero|vou)\s+(me matar|me suicidar|me machucar)\b/i,
  /\b(a frase|um exemplo|exemplo de frase|uma citação|uma citacao)\b.{0,50}\b(eu\s+)?(quero|vou)\s+(me matar|me suicidar|me machucar)\b/i
];

const HISTORICAL_PATTERNS = [
  /\b(ontem|semana passada|mês passado|mes passado|ano passado|no passado|antigamente)\b.{0,55}\b(disse|pensei|falava|dizia|queria|tentei)\b.{0,45}\b(me matar|me suicidar|me machucar|tirar minha vida)\b/i,
  /\b(quando eu era|naquela época|naquela epoca)\b.{0,70}\b(queria|pensei em|tentei)\b.{0,35}\b(me matar|me suicidar|me machucar|tirar minha vida)\b/i
];

export function classifyExplicitDangerStatement(text) {
  const value=String(text || '').trim();
  if(!value) return { trigger:false, reason:'empty', ruleId:null };

  if(NEGATION_PATTERNS.some(pattern=>pattern.test(value))) {
    return { trigger:false, reason:'explicit-negation', ruleId:null };
  }

  if(QUOTED_OR_THIRD_PERSON_PATTERNS.some(pattern=>pattern.test(value))) {
    return { trigger:false, reason:'quoted-or-third-person', ruleId:null };
  }

  if(HISTORICAL_PATTERNS.some(pattern=>pattern.test(value))) {
    return { trigger:false, reason:'historical-context', ruleId:null };
  }

  const matched=DIRECT_DANGER_RULES.find(rule=>rule.pattern.test(value));
  return matched
    ? { trigger:true, reason:'explicit-present-statement', ruleId:matched.id }
    : { trigger:false, reason:'no-explicit-present-statement', ruleId:null };
}

export function detectExplicitImmediateDanger(text) {
  return classifyExplicitDangerStatement(text).trigger;
}

export function assessSafety({ explicitImmediateDanger = false } = {}) {
  if (!explicitImmediateDanger) {
    return { level: 'normal', interrupt: false, message: null };
  }

  return {
    level: 'immediate-risk',
    interrupt: true,
    message:
      'Você escreveu uma frase de perigo imediato. Eu não consigo avaliar a situação por aqui. Procure ajuda humana agora: uma pessoa de confiança, seu profissional de saúde ou um serviço de emergência da sua região.'
  };
}

export function urgentHelpGuidance(countryCode='BR') {
  const common={
    title:'Procure ajuda humana agora',
    message:'Se você ou outra pessoa estiver em perigo imediato, não dependa desta ferramenta. Procure atendimento humano agora.'
  };

  if(countryCode==='BR') {
    return {
      ...common,
      resources:[
        { label:'Emergência médica', value:'SAMU 192', kind:'emergency' },
        { label:'Apoio emocional gratuito, 24 horas', value:'CVV 188', kind:'support' }
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
