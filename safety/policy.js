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
