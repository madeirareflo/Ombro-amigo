/**
 * Deterministic, conservative commands for the user's autonomy.
 * We intentionally do NOT treat a substring as a command: quotations,
 * third-person stories and past statements are ordinary user content.
 * No model, network, health/risk classification or clinical inference.
 */
export const DIRECT_STOP_COMMAND_VERSION = 'direct-stop-ptbr-v1';

const DIRECT_STOP_PATTERN = /^(?:(?:eu )?(?:quero parar(?: (?:por aqui|por hoje|agora|de conversar|essa conversa))?|prefiro parar(?: (?:por aqui|agora|por hoje))?|nao quero continuar(?: (?:com (?:a|essa) conversa|conversando|por hoje|mais))?|nao quero mais falar(?: (?:sobre isso|disso|agora|por hoje))?|quero encerrar(?: (?:essa|a|nossa) conversa|por hoje|agora)?|nao quero aprofundar(?: (?:isso|esse assunto|mais))?|preciso parar(?: (?:por aqui|por hoje|agora))?|prefiro encerrar(?: (?:a|essa) conversa)?|prefiro terminar(?: (?:agora|por aqui))?))|chega por hoje|por hoje (?:e so|basta)|vamos parar(?: (?:por aqui|agora))?|nao pergunte mais(?: nada)?|sem mais perguntas|pare de perguntar|pode encerrar(?: (?:a|essa) conversa)?|pode parar(?: por favor)?)$/;

function normalize(text) {
  return String(text || '').trim().toLocaleLowerCase('pt-BR')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ').replace(/[.!?]+$/g, '').trim();
}

/**
 * True only for an explicit standalone first-person request or direct
 * imperative. Never scan the middle of a narrative for keywords.
 * In ambiguous cases, the app's separate "skip/stop" UI remains available.
 */
export function isDirectStopCommand(text) {
  const value = normalize(text);
  if (!value || value.length > 105) return false;
  // Quotes, semicolons and colon indicate that this may be a reported
  // utterance; fail closed rather than turning a narrative into a command.
  if (/["'“”‘’«»:;]/.test(value)) return false;
  return DIRECT_STOP_PATTERN.test(value);
}
