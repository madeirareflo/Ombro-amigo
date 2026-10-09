/**
 * Deterministic, conservative commands for the user's autonomy.
 * We intentionally do NOT treat a substring as a command: quotations,
 * third-person stories and past statements are ordinary user content.
 * No model, network, health/risk classification or clinical inference.
 */
export const DIRECT_STOP_COMMAND_VERSION = 'direct-stop-ptbr-v1';

// Separate, readable patterns instead of a broad substring regex. A false
// positive here could interrupt a person's narrative or discard their words.
const DIRECT_STOP_PATTERNS = Object.freeze([
  /^(?:eu )?quero parar(?: (?:por aqui|por hoje|agora|de conversar|essa conversa))?$/,
  /^(?:eu )?prefiro parar(?: (?:por aqui|por hoje|agora))?$/,
  /^(?:eu )?nao quero continuar(?: (?:com (?:a|essa) conversa|conversando|por hoje|mais))?$/,
  /^(?:eu )?nao quero mais falar(?: (?:sobre isso|disso|agora|por hoje))?$/,
  /^(?:eu )?quero encerrar(?: (?:essa|a|nossa) conversa|por hoje|agora)?$/,
  /^(?:eu )?nao quero aprofundar(?: (?:isso|esse assunto|mais))?$/,
  /^(?:eu )?preciso parar(?: (?:por aqui|por hoje|agora))?$/,
  /^(?:eu )?prefiro encerrar(?: (?:a|essa) conversa)?$/,
  /^(?:eu )?prefiro terminar(?: (?:agora|por aqui))?$/,
  /^chega por hoje$/,
  /^por hoje (?:e so|basta)$/,
  /^vamos parar(?: (?:por aqui|agora))?$/,
  /^nao pergunte mais(?: nada)?$/,
  /^sem mais perguntas$/,
  /^pare de perguntar$/,
  /^pode encerrar(?: (?:a|essa) conversa)?$/,
  /^pode parar(?: por favor)?$/
]);

function normalize(text) {
  return String(text || '').trim().toLocaleLowerCase('pt-BR')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ').replace(/[.!?]+$/g, '').trim();
}

/**
 * True only for an explicit standalone first-person request or direct
 * imperative. Never scan the middle of a narrative for keywords.
 * In ambiguous cases, the app's separate skip/stop UI remains available.
 */
export function isDirectStopCommand(text) {
  const value = normalize(text);
  if (!value || value.length > 105) return false;
  // Quotes, semicolons and colon indicate reported or compound speech. To
  // avoid a false command, leave ambiguous content as a declared statement.
  if (/["'“”‘’«»:;]/.test(value)) return false;
  return DIRECT_STOP_PATTERNS.some(pattern => pattern.test(value));
}
