/**
 * Explicitly grounded follow-ups for a few high-frequency pt-BR replies.
 * DRAFT ONLY: not clinical interpretation and not reviewed by a psychologist.
 * No model, network, telemetry, risk scoring, or inferred user attributes.
 *
 * Must be reached after the host app's safety gate and engine's deterministic
 * boundary/sensitive-topic checks. Never invoke to decide stop/skip/summary.
 */
export const DECLARED_FOLLOWUP_VERSION = 'declared-continuity-v1';

function normalize(text) {
  return String(text || '').trim().toLocaleLowerCase('pt-BR')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ').replace(/[.!?]+$/g, '');
}

export function isExplicitLonelinessDeclaration(text) {
  const value=normalize(text);
  // Anchored to what this person says about themselves. A quotation, someone
  // else's feelings, or an old story does not become a declaration.
  return /^(?:(?:e?me|eu me) sinto|(?:estou|to) me sentindo)\s+(?:muito\s+)?(?:solitari[oa]|sozinh[oa]|isolad[oa])(?:\s+(?:ultimamente|as vezes|agora|hoje))?$/.test(value);
}

function isMotivationScopeReply(state, text) {
  if (state?.context?.lastQuestionDimension!=='scope') return false;
  const value=normalize(text);
  // The initial question asks about *areas*; this is a selection of its
  // motivation area, NOT evidence that motivation is diminished.
  return /^(?:(?:na|a|minha)\s+)?vontade\s+de\s+fazer\s+(?:(?:as|algumas)\s+)?coisas$/.test(value);
}

function firstUnasked(state, options) {
  const used=new Set(Array.isArray(state?.usedQuestions)?state.usedQuestions:[]);
  return options.find(item=>!used.has(item.text))||null;
}

export function selectGroundedFollowup(state, text) {
  if (!state || state.mode==='record') return null;
  if (isMotivationScopeReply(state,text)) {
    const choice=firstUnasked(state,[
      { id:'motivation-scope-1',
        text:'Você escolheu falar da vontade de fazer as coisas. O que gostaria de registrar sobre essa parte?' },
      { id:'motivation-scope-2',
        text:'Sem supor se isso aumentou ou diminuiu, como você descreveria a sua vontade de fazer as coisas agora?' }
    ]);
    return choice && { ...choice, ruleId:'CONV-REFLECT-01' };
  }
  if (isExplicitLonelinessDeclaration(text)) {
    const choice=firstUnasked(state,[
      { id:'loneliness-declared-1',
        text:'Você contou que se sente só. Quer registrar como isso aparece no seu dia ou apenas guardar essa frase por enquanto?' },
      { id:'loneliness-declared-2',
        text:'Obrigado por colocar isso em palavras. Você prefere contar uma situação relacionada ou deixar esse ponto registrado?' }
    ]);
    return choice && { ...choice, ruleId:'CONV-REFLECT-01' };
  }
  return null;
}

/**
 * Respond to an elliptical "tudo" only if the immediately preceding user
 * statement was an explicit first-person loneliness declaration. No invented
 * frequency, cause, label, or summary entry is created.
 */
export function groundedBriefReference(state, answer) {
  if (!/^(?:tudo|isso)$/.test(normalize(answer))) return null;
  const history=Array.isArray(state?.transcript)?state.transcript:[];
  // The current user response is already the last item at this point.
  const previousUser=history.slice(0,-1).reverse().find(row=>row?.role==='user');
  if (!isExplicitLonelinessDeclaration(previousUser?.text)) return null;
  const options=[
    'Você escreveu “tudo” depois de falar sobre se sentir só. Quer explicar com suas palavras o que significa “tudo” para você ou deixar isso em aberto?',
    'Para eu não completar sua resposta por você: quer dizer mais sobre esse “tudo” ou apenas registrar o que já contou?'
  ];
  const used=new Set(Array.isArray(state?.usedQuestions)?state.usedQuestions:[]);
  return {
    text:options.find(value=>!used.has(value)) ||
      'Se preferir, podemos deixar essa parte em aberto e preparar uma síntese do que você escreveu.',
    ruleId:'CONV-CLARIFY-01'
  };
}
