/**
 * Deterministic, opt-in-style attuned phrasing for declarations made by the
 * current speaker. Research/engineering drafts, NOT psychologist-approved.
 *
 * Never diagnoses, predicts emotion, imitates a real human, or sends data.
 * Invoked only AFTER safety/autonomy and sensitive-topic boundary checks.
 */
export const ATTUNEMENT_VERSION = 'declared-attunement-v1';

function canonical(value) {
  return String(value || '').toLocaleLowerCase('pt-BR').trim()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ').replace(/[.!?]+$/g, '');
}

const DECLARATIONS = Object.freeze([
  {
    id: 'sadness',
    // First-person declaration, not a quote, negation, or attributed feeling.
    pattern: /^(?:eu )?(?:estou|to|me sinto|eu me sinto) (?:muito )?(?:triste|chatead[oa]|abatid[oa])(?: (?:hoje|ultimamente|agora))?$/,
    responses: [
      'Poxa. Quer me contar um pouco mais?',
      'Tudo bem ir aos poucos. O que tem sido mais difícil?'
    ]
  },
  {
    id: 'anxiety',
    pattern: /^(?:eu )?(?:estou|to|me sinto|eu me sinto) (?:muito )?(?:ansios[oa]|nervos[oa]|preocupad[oa])(?: (?:hoje|ultimamente|agora))?$/,
    responses: [
      'Entendi. O que tem passado pela sua cabeça?',
      'Sem pressa. Tem algo sobre isso que você queira acrescentar?'
    ]
  },
  {
    id: 'difficulty_speaking',
    pattern: /^(?:eu )?(?:tenho vergonha de (?:falar|contar)(?: (?:isso|sobre isso))?|nao consigo (?:falar|contar)(?: (?:isso|sobre isso))?|tenho medo de (?:falar|contar)(?: (?:isso|sobre isso))?)$/,
    responses: [
      'Imagino que não seja simples colocar isso em palavras. Quer tentar aos poucos?',
      'Não precisa entrar em detalhes. Podemos deixar isso registrado por enquanto.'
    ]
  }
]);

export const ATTUNEMENT_IDS = Object.freeze(DECLARATIONS.map(item => item.id));

export function detectExplicitAttunementDeclaration(text) {
  const value = canonical(text);
  // Resist quoted text, multiline commands, and third-person narratives.
  if (!value || value.length > 100 || /["“”«»\n\r]/.test(String(text || ''))) return null;
  // Do not act on a declaration containing a negation, even if it appears
  // inside a longer string; only positive anchored statements are matched.
  return DECLARATIONS.find(item => item.pattern.test(value))?.id || null;
}

export function selectAttunedTurn(state, text) {
  if (!state || state.mode === 'record') return null;
  const id = detectExplicitAttunementDeclaration(text);
  if (!id) return null;
  const entry = DECLARATIONS.find(item => item.id === id);
  const used = new Set(Array.isArray(state.usedQuestions) ? state.usedQuestions : []);
  const question = entry.responses.find(candidate => !used.has(candidate));
  if (!question) return null;
  return {
    text: question,
    ruleId: 'CONV-REFLECT-01',
    attunementId: id,
    reviewStatus: 'engineering-draft-not-clinically-reviewed'
  };
}
