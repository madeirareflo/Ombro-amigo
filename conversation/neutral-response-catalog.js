/**
 * Proposed, human-editable response candidates. ENGINEERING DRAFT ONLY:
 * not reviewed or endorsed by a psychologist and never presented as therapy.
 *
 * This layer has no access to a model, network, diagnosis, emotion predictions,
 * or data beyond the conversation's deterministic state. It must be invoked
 * AFTER crisis, autonomy, quotation and sensitive-topic guards.
 */
export const LOCAL_RESPONSE_CATALOG_VERSION = 'guided-neutral-v1';
export const LOCAL_RESPONSE_REVIEW_STATUS = 'engineering-draft-not-clinically-reviewed';
const RULE_ID = 'CONV-REFLECT-01';

export const NEUTRAL_RESPONSE_CATALOG = Object.freeze([
  // Prompt to the user, not a factual statement about their life or emotions.
  { id:'event-next', mode:'event', channel:'fallback', dimension:'sequence',
    text:'Se quiser, podemos continuar pelo começo: o que aconteceu primeiro?' },
  { id:'event-focus', mode:'event', channel:'fallback', dimension:'priority',
    text:'Sem precisar contar tudo de uma vez, qual parte gostaria de registrar agora?' },
  { id:'event-purpose', mode:'event', channel:'fallback', dimension:'session_goal',
    text:'O que gostaria de conseguir contar sobre esse acontecimento na sessão?' },
  { id:'event-choice', mode:'event', channel:'fallback', dimension:'choice',
    text:'Podemos organizar por partes ou ficar só no que você já escreveu. Qual caminho prefere?' },

  { id:'session-start', mode:'session', channel:'fallback', dimension:'first_phrase',
    text:'Podemos preparar uma primeira frase para a sessão. O que gostaria que ela dissesse?' },
  { id:'session-focus', mode:'session', channel:'fallback', dimension:'priority',
    text:'O que parece mais importante preservar nas suas próprias palavras?' },
  { id:'session-goal', mode:'session', channel:'fallback', dimension:'session_goal',
    text:'Sem prever a reação de ninguém, o que gostaria de conseguir comunicar na sessão?' },
  { id:'session-choice', mode:'session', channel:'fallback', dimension:'choice',
    text:'Você prefere continuar escrevendo ou montar uma síntese do que já contou?' },

  { id:'feeling-words', mode:'feeling', channel:'fallback', dimension:'self_words',
    text:'Não preciso escolher uma palavra por você. Como gostaria de descrever isso com suas palavras?' },
  { id:'feeling-experience', mode:'feeling', channel:'fallback', dimension:'experience',
    text:'Se for confortável, o que percebe nessa experiência sem precisar explicar a causa?' },
  { id:'feeling-focus', mode:'feeling', channel:'fallback', dimension:'priority',
    text:'Qual parte dessa experiência você gostaria de guardar no registro?' },
  { id:'feeling-choice', mode:'feeling', channel:'fallback', dimension:'choice',
    text:'Podemos continuar com cuidado ou preparar uma síntese. O que prefere agora?' },

  { id:'after-remember', mode:'afterSession', channel:'fallback', dimension:'remember',
    text:'Qual ponto da última sessão você gostaria de deixar registrado com suas palavras?' },
  { id:'after-open', mode:'afterSession', channel:'fallback', dimension:'open_point',
    text:'Ficou algum assunto que você queira retomar na próxima sessão?' },
  { id:'after-choose', mode:'afterSession', channel:'fallback', dimension:'choice',
    text:'Você prefere registrar um lembrete ou preparar uma síntese do que escreveu?' },

  // Opt-in continuation is allowed to explore but does not infer motives.
  { id:'continue-event', mode:'event', channel:'continue', dimension:'user_focus',
    text:'Quer continuar pelo que aconteceu depois ou por uma parte que você ainda não escreveu?' },
  { id:'continue-session', mode:'session', channel:'continue', dimension:'first_phrase',
    text:'Já que escolheu continuar, qual ponto gostaria de colocar em palavras para a sessão?' },
  { id:'continue-feeling', mode:'feeling', channel:'continue', dimension:'self_words',
    text:'Você pode ir no seu ritmo. Qual parte gostaria de explorar com suas próprias palavras?' },
  { id:'continue-after', mode:'afterSession', channel:'continue', dimension:'remember',
    text:'Podemos continuar sem interpretar: o que gostaria de guardar como lembrança da sessão?' },
  { id:'continue-choice', mode:'any', channel:'continue', dimension:'choice',
    text:'Você pode acrescentar algo no seu ritmo ou montar uma síntese. O que prefere?' }
].map(item => Object.freeze({
  ...item, ruleId:RULE_ID, reviewStatus:LOCAL_RESPONSE_REVIEW_STATUS
})));

const ALLOWED_MODES = new Set(['event', 'feeling', 'session', 'afterSession', 'any']);
const ALLOWED_CHANNELS = new Set(['fallback', 'continue']);

/** The catalog is entirely static; validation is a guard against unsafe edits. */
export function validateNeutralResponseCatalog(catalog = NEUTRAL_RESPONSE_CATALOG) {
  if (!Array.isArray(catalog) || catalog.length === 0) throw new Error('invalid-catalog');
  const ids=new Set();
  for (const item of catalog) {
    if (!item || typeof item.id !== 'string' || ids.has(item.id)) throw new Error('duplicate-or-invalid-id');
    ids.add(item.id);
    if (!ALLOWED_MODES.has(item.mode) || !ALLOWED_CHANNELS.has(item.channel)) throw new Error('invalid-routing');
    if (!/^[a-z][a-z_]*$/.test(item.dimension) || item.ruleId!==RULE_ID ||
        item.reviewStatus!==LOCAL_RESPONSE_REVIEW_STATUS) throw new Error('invalid-response-metadata');
    if (typeof item.text!=='string' || item.text.length>210 ||
        (item.text.match(/\?/g)||[]).length!==1 || /[\r\n]/.test(item.text)) {
      throw new Error('invalid-response-text');
    }
    // Not a complete clinical review: this only catches obvious prohibited claims.
    if (/\b(diagn[oó]stic\w*|transtorn\w*|patologia|depress[aã]o|voc[eê] tem|voc[eê] [eé] (?:doente|incapaz)|s[oó] precisa de mim|voc[eê] sente porque|eu sei o que voc[eê] sente)\b/i.test(item.text)) {
      throw new Error('prohibited-clinical-claim');
    }
  }
  return true;
}

function seenDimensions(state) {
  const recent = Array.isArray(state?.context?.questionHistory)
    ? state.context.questionHistory.slice(-3).map(x=>x?.dimension) : [];
  return new Set(recent.filter(Boolean));
}

/**
 * Deterministically select a neutral formulation based on requested channel,
 * mode and recent questions. This function does not classify the user's text.
 * It never overrides user control, safety or clinical boundaries.
 */
export function selectGuidedResponse(state, {channel='fallback'}={}) {
  if (!state || !ALLOWED_CHANNELS.has(channel) || state.mode==='record') return null;
  const usedTexts=new Set(Array.isArray(state.usedQuestions)?state.usedQuestions:[]);
  const usedIds=new Set(Array.isArray(state?.context?.catalogHistory)
    ? state.context.catalogHistory : []);
  const dims=seenDimensions(state);
  const eligible=NEUTRAL_RESPONSE_CATALOG.filter(item=>
    item.channel===channel && (item.mode===state.mode || item.mode==='any') &&
    !usedIds.has(item.id) && !usedTexts.has(item.text) && !dims.has(item.dimension)
  );
  const item=eligible.find(x=>x.mode===state.mode) || eligible[0];
  if (!item) return null;
  return { text:item.text, ruleId:item.ruleId, catalogId:item.id,
    reviewStatus:item.reviewStatus };
}

export function rememberGuidedResponse(state, turn) {
  if (!turn?.catalogId) return false;
  const exists=NEUTRAL_RESPONSE_CATALOG.some(item=>
    item.id===turn.catalogId && item.text===turn.text &&
    item.reviewStatus===LOCAL_RESPONSE_REVIEW_STATUS
  );
  if (!exists) return false;
  if (!state.context || typeof state.context!=='object') state.context={};
  if (!Array.isArray(state.context.catalogHistory)) state.context.catalogHistory=[];
  if (!state.context.catalogHistory.includes(turn.catalogId)) {
    state.context.catalogHistory.push(turn.catalogId);
    if (state.context.catalogHistory.length>32) state.context.catalogHistory =
      state.context.catalogHistory.slice(-32);
  }
  return true;
}
