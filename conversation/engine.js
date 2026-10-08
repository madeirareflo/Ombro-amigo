const START_QUESTIONS = {
  event: 'Isso tem mais a ver com algo que aconteceu ou com como você se sentiu depois?',
  session: 'O que torna esse assunto difícil de começar na sessão?',
  feeling: 'Você percebe isso mais nos pensamentos, no corpo, na vontade de fazer as coisas ou nas relações com outras pessoas?'
};

const DEPTH_PROMPTS = {
  light: [
    'Se você tivesse que escolher uma palavra aproximada para isso, qual seria?',
    'Tem alguma parte que você gostaria de conseguir dizer na próxima sessão?'
  ],
  medium: [
    'Você consegue lembrar de uma situação concreta em que isso apareceu?',
    'O que você pensou naquele momento?',
    'Que emoção você reconhece com mais segurança, mesmo que não explique tudo?'
  ],
  deep: [
    'Vamos por partes: o que aconteceu primeiro?',
    'Depois disso, o que você percebeu em você?',
    'O que ficou mais difícil de dizer ou fazer?',
    'Existe algo que você teme que seu psicólogo pense quando ouvir isso?'
  ]
};

export function createConversation({ mode, depth = 'light' }) {
  return { mode, depth, turn: 0, entries: [], lastQuestion: START_QUESTIONS[mode] || START_QUESTIONS.session };
}

export function openingQuestion(state) {
  return state.lastQuestion;
}

export function nextQuestion(state, answer) {
  const text = String(answer || '').trim();
  state.entries.push({ kind: 'user_statement', text, source: 'declared' });
  const prompts = DEPTH_PROMPTS[state.depth] || DEPTH_PROMPTS.light;
  const question = prompts[Math.min(state.turn, prompts.length - 1)];
  state.turn += 1;
  state.lastQuestion = question;
  return question;
}

export function buildSummary(state) {
  const statements = state.entries.map(item => item.text).filter(Boolean);
  if (!statements.length) {
    return 'Ainda não há conteúdo suficiente para montar uma síntese. Você pode continuar a conversa ou escrever com suas próprias palavras.';
  }
  const recent = statements.slice(-4);
  const body = recent.map((text,index) => `${index===0?'Quero falar sobre':'Também percebi que'} ${normalizeSentence(text)}`);
  return ['Rascunho em primeira pessoa:','',body.join('\n'),'','Quero levar isso para a sessão sem precisar explicar tudo de uma vez.'].join('\n');
}

function normalizeSentence(text) {
  const trimmed = text.trim();
  if (!trimmed) return '';
  return trimmed.charAt(0).toLowerCase()+trimmed.slice(1).replace(/[.!?]+$/,'')+'.';
}
