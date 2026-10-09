/**
 * Attribution cues for explicitly third-party emotion reports. This tiny
 * component avoids phrasing such reports as if the user personally felt them.
 * It does not infer anyone's emotional state, diagnoses or level of risk.
 *
 * Engineering draft, not professionally reviewed. No model/API/network.
 */
export const ATTRIBUTION_GUARD_VERSION = 'third-party-affect-v1';

const THIRD_PERSON_SUBJECT =
  /^(?:(?:(?:minha|minhas|meu|meus|uma|um|a|o|as|os)\s+)?(?:amiga|amigo|irma|irmao|mae|pai|namorada|namorado|colega|parceira|parceiro|filha|filho|prima|primo)\b|(?:ela|ele|elas|eles)\b)/;

const THIRD_PERSON_REPORT_VERB = /\b(?:se sente|sente|sentiu|estava|esta|ficou|tem|teve|disse|falou|contou|escreveu|relatou)\b/;

const EMOTION_WORD = /\b(?:triste|tristeza|raiva|medo|vergonha|culpa|ansiosa|ansioso|ansiedade|frustrada|frustrado|decepcionada|decepcionado|assustada|assustado|sozinha|sozinho|solitaria|solitario)\b/;

// Only a first-person declaration outside quotation makes third-party
// content potentially about the speaker too. We do not infer from "eu também".
const FIRST_PERSON_EMOTION = /\b(?:(?:eu\s+)?(?:me sinto|me senti|fiquei|estou|to|sinto|senti)|eu tenho|tenho)\s+(?:muito\s+|com\s+)?(?:triste|tristeza|raiva|medo|vergonha|culpa|ansiosa|ansioso|ansiedade|frustrada|frustrado|decepcionada|decepcionado|assustada|assustado|sozinha|sozinho|solitaria|solitario)\b/;

function normalize(text) {
  return String(text || '').trim().toLocaleLowerCase('pt-BR')
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/\s+/g, ' ');
}

function stripQuoted(text) {
  // Conservative: if any quotation delimiters remain unmatched, do not
  // attribute first-person feelings from that message.
  const masked = text.replace(/(["“”‘’«»'])[^"“”‘’«»']*(["“”‘’«»'])/g, ' ');
  return /["“”‘’«»']/.test(masked) ? '' : masked;
}

/**
 * True when a short report is explicitly about another person's emotions,
 * without a separate first-person emotional declaration by the user.
 */
export function isThirdPartyOnlyEmotionReport(text) {
  const value = normalize(text);
  if (!value || value.length > 350 || !THIRD_PERSON_SUBJECT.test(value)) return false;
  if (!THIRD_PERSON_REPORT_VERB.test(value) || !EMOTION_WORD.test(value)) return false;
  return !FIRST_PERSON_EMOTION.test(stripQuoted(value));
}

/** A safe next step that does not say the user felt the third-party emotion. */
export function thirdPartyReportTurn(text) {
  if (!isThirdPartyOnlyEmotionReport(text)) return null;
  // 'E eu também' can refer to feelings, events or agreement. Clarify rather
  // than assign the other person's emotion to the speaker automatically.
  if (/\beu tambem\b/.test(normalize(text))) return {
    text:'Você escreveu “eu também” ao relatar algo sobre outra pessoa. Gostaria de explicar com suas palavras o que quis dizer ou deixar essa parte em aberto?',
    ruleId:'CONV-CLARIFY-01'
  };
  return {
    text:'Você está relatando algo sobre outra pessoa. O que desse relato gostaria de guardar para conversar na sessão, com suas próprias palavras?',
    ruleId:'CONV-REFLECT-01'
  };
}
