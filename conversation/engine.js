const START_QUESTIONS = {
  event: 'Isso tem mais a ver com algo que aconteceu ou com como você se sentiu depois?',
  session: 'O que torna esse assunto difícil de começar na sessão?',
  feeling: 'Você percebe isso mais nos pensamentos, no corpo, na vontade de fazer as coisas ou nas relações com outras pessoas?'
};

const DEPTH_LIMITS = {
  light: 2,
  medium: 4,
  deep: 6
};

const GENERIC_FALLBACKS = {
  light: [
    'Quer escolher só uma parte disso para organizar agora?',
    'O que seria mais útil conseguir dizer sobre isso na próxima sessão?'
  ],
  medium: [
    'Você consegue dar um exemplo concreto do que aconteceu?',
    'O que ficou mais difícil de explicar nessa situação?',
    'O que você gostaria que seu psicólogo entendesse primeiro?'
  ],
  deep: [
    'Vamos ordenar isso: o que aconteceu primeiro?',
    'O que você percebeu em você logo depois?',
    'O que ficou por dizer naquele momento?',
    'O que você teme que aconteça quando esse assunto for colocado em palavras?'
  ]
};

const BOUNDARY_RULES = [
  {
    key: 'diagnosisRequest',
    pattern: /\b(você acha que eu tenho|vc acha que eu tenho|será que eu tenho|sera que eu tenho|isso significa que eu tenho)\b/i,
    response: 'Eu não consigo confirmar nem descartar um diagnóstico. Posso ajudar a organizar o que você percebeu para levar ao profissional. Qual sinal ou situação você gostaria de contar primeiro?'
  },
  {
    key: 'dependency',
    pattern: /(só consigo falar com você|so consigo falar com voce|prefiro falar com você|prefiro falar com voce|você é a única pessoa|voce e a unica pessoa|só você me entende|so voce me entende)/i,
    response: 'Posso ajudar a preparar o que você quer dizer, mas não quero ocupar o lugar de uma pessoa ou profissional. O que você gostaria de conseguir levar desta conversa para alguém de confiança ou para seu psicólogo?'
  },
  {
    key: 'stop',
    pattern: /\b(não quero aprofundar|nao quero aprofundar|quero parar|prefiro parar|chega por hoje)\b/i,
    response: 'Tudo bem. Podemos parar por aqui. Você pode usar “Me ajuda a dizer isso” com o que já contou ou voltar quando quiser.'
  },
  {
    key: 'contradiction',
    pattern: /(?=.*\b(quero terminar|quero me afastar)\b)(?=.*\b(medo de perder|medo de ficar sem)\b)/i,
    response: 'Você colocou duas coisas juntas: querer se afastar e ter medo de perder essa pessoa. As duas parecem verdadeiras ao mesmo tempo para você?'
  }
];

const SIGNALS = [
  {
    key: 'uncertainty',
    pattern: /^(não sei|nao sei|sei lá|sei la|difícil dizer|dificil dizer|não consigo explicar|nao consigo explicar)[.!]?$/i,
    questions: [
      'Tudo bem não saber ainda. Isso parece mais algo no corpo, nos pensamentos, na vontade de fazer coisas ou nas relações?',
      'Sem precisar explicar o motivo: isso ficou mais leve, mais pesado ou parecido com antes?'
    ]
  },
  {
    key: 'body',
    pattern: /\b(corpo|coração|coracao|peito|respiração|respiracao|tremor|tenso|tensa|cansaço|cansaco|dor|sono|apetite)\b/i,
    questions: [
      'Você percebe quando isso aparece no corpo com mais força?',
      'O que estava acontecendo ao redor quando você notou essa sensação no corpo?'
    ]
  },
  {
    key: 'thought',
    pattern: /\b(pensei|pensando|pensamento|imagino|imaginei|acho que|minha cabeça|na minha cabeça)\b/i,
    questions: [
      'Qual pensamento aparece com mais frequência quando isso acontece?',
      'Esse pensamento surge mais antes, durante ou depois da situação que você quer contar?'
    ]
  },
  {
    key: 'emotion',
    pattern: /\b(raiva|triste|tristeza|vergonha|medo|culpa|ansioso|ansiosa|ansiedade|alívio|alivio|frustrado|frustrada|decepcionado|decepcionada)\b/i,
    questions: [
      'O que estava acontecendo quando você percebeu essa emoção?',
      'Essa palavra representa bem o que você sentiu ou só chega perto?'
    ]
  },
  {
    key: 'relationship',
    pattern: /\b(namorado|namorada|marido|esposa|parceiro|parceira|mãe|mae|pai|irmão|irmao|irmã|irma|amigo|amiga|colega|família|familia|relacionamento)\b/i,
    questions: [
      'Qual foi a parte dessa interação que ficou mais difícil de levar para a sessão?',
      'Tem alguma frase ou reação dessa pessoa que ficou especialmente marcada para você?'
    ]
  },
  {
    key: 'selfJudgment',
    pattern: /\b(sou ridículo|sou ridicula|sou ridículo|sou idiota|sou horrível|sou horrivel|sou fraco|sou fraca|que vergonha de mim)\b/i,
    questions: [
      'O que aconteceu para você acabar se descrevendo desse jeito?',
      'Se tirarmos o rótulo por um momento, qual fato ou situação você gostaria de conseguir contar?'
    ]
  },
  {
    key: 'avoidance',
    pattern: /\b(evito|evitando|não consigo falar|nao consigo falar|não contei|nao contei|escondo|mudo de assunto|travo|travei)\b/i,
    questions: [
      'O que parece mais difícil: começar o assunto, continuar depois de começar ou lidar com a reação da outra pessoa?',
      'Se você pudesse dizer só a primeira frase na sessão, o que gostaria que ela comunicasse?'
    ]
  }
];

export function createConversation({ mode, depth = 'light' }) {
  return {
    mode,
    depth,
    turn: 0,
    entries: [],
    usedQuestions: [],
    skips: 0,
    lastQuestion: START_QUESTIONS[mode] || START_QUESTIONS.session,
    transcript: [
      { role: 'ai', text: START_QUESTIONS[mode] || START_QUESTIONS.session }
    ]
  };
}

export function openingQuestion(state) {
  markQuestionUsed(state, state.lastQuestion);
  return state.lastQuestion;
}

export function nextQuestion(state, answer) {
  const text = String(answer || '').trim();

  state.skips = 0;
  state.entries.push({
    kind: 'user_statement',
    text,
    source: 'declared',
    categories: classifyDeclaredContent(text)
  });
  if (!Array.isArray(state.transcript)) state.transcript = [];
  state.transcript.push({ role: 'user', text });

  const question = chooseAdaptiveQuestion(state, text);
  state.turn += 1;
  state.lastQuestion = question;
  markQuestionUsed(state, question);
  state.transcript.push({ role: 'ai', text: question });
  return question;
}

export function skipQuestion(state) {
  if (!Array.isArray(state.transcript)) state.transcript = [];
  state.skips = Number(state.skips || 0) + 1;
  state.turn += 1;
  state.transcript.push({
    role: 'user',
    text: 'Prefiro não responder a essa pergunta.',
    meta: 'skip'
  });

  const question = state.skips >= 2
    ? 'Sem problema. Podemos parar por aqui. Você pode usar “Me ajuda a dizer isso” com o que já contou ou voltar quando quiser.'
    : 'Sem problema. Podemos ir por outro caminho: o que seria mais fácil agora — falar do que aconteceu, de como você ficou depois, ou ir direto para uma síntese?';

  state.lastQuestion = question;
  markQuestionUsed(state, question);
  state.transcript.push({ role: 'ai', text: question });
  return question;
}

export function chooseAdaptiveQuestion(state, answer) {
  const text = String(answer || '').trim();

  const boundary = matchBoundaryRule(text);
  if (boundary) return boundary.response;

  if (text.length >= 280) {
    return 'Você trouxe várias partes de uma vez. Para não reorganizar por você: prefere começar pelo que aconteceu primeiro ou pelo que mais gostaria de levar à sessão?';
  }

  const matchedSignal = SIGNALS.find(signal => signal.pattern.test(text));

  if (matchedSignal) {
    const candidate = firstUnused(state, matchedSignal.questions);
    if (candidate) return candidate;
  }

  const limit = DEPTH_LIMITS[state.depth] || DEPTH_LIMITS.light;
  if (state.turn >= limit) {
    return 'Já temos material suficiente para montar um primeiro rascunho. Quer usar “Me ajuda a dizer isso” ou prefere acrescentar mais alguma coisa?';
  }

  const fallbackPool = GENERIC_FALLBACKS[state.depth] || GENERIC_FALLBACKS.light;
  const fallback = firstUnused(state, fallbackPool);
  if (fallback) return fallback;

  return 'O que você considera mais importante registrar disso, sem precisar explicar tudo agora?';
}

export function buildStructuredSummary(state) {
  const entries = state.entries.filter(item => item?.text);

  if (!entries.length) {
    return {
      facts: [],
      emotions: [],
      difficulties: [],
      sessionPoints: []
    };
  }

  const pick = category => entries
    .filter(item => item.categories?.includes(category))
    .map(item => item.text);

  const facts = unique(pick('fact'));
  const emotions = unique(pick('emotion'));
  const difficulties = unique(pick('difficulty'));

  const sessionPoints = unique([
    ...difficulties,
    ...entries.slice(-2).map(item => item.text)
  ]).slice(0, 3);

  return { facts, emotions, difficulties, sessionPoints };
}

export function buildSummary(state) {
  const structured = buildStructuredSummary(state);
  const hasContent = Object.values(structured).some(items => items.length);

  if (!hasContent) {
    return 'Ainda não há conteúdo suficiente para montar uma síntese. Você pode continuar a conversa ou escrever com suas próprias palavras.';
  }

  return [
    'Rascunho para levar à sessão:',
    '',
    section('O que aconteceu', structured.facts),
    '',
    section('O que eu disse que senti', structured.emotions),
    '',
    section('O que está difícil de dizer', structured.difficulties),
    '',
    section('O que eu gostaria de levar para a sessão', structured.sessionPoints),
    '',
    'Revise livremente. Se alguma parte não representar você, apague ou reescreva.'
  ].join('\n');
}

function classifyDeclaredContent(text) {
  const categories = [];
  const value = String(text || '');
  const boundary = matchBoundaryRule(value);

  if (boundary?.key === 'diagnosisRequest') return ['question'];
  if (boundary?.key === 'stop') return ['control'];
  if (boundary?.key === 'dependency') return ['difficulty'];

  if (/\b(raiva|triste|tristeza|vergonha|medo|culpa|ansioso|ansiosa|ansiedade|alívio|alivio|frustrado|frustrada|decepcionado|decepcionada)\b/i.test(value)) {
    categories.push('emotion');
  }

  if (/\b(evito|evitando|não consigo falar|nao consigo falar|não contei|nao contei|escondo|mudo de assunto|travo|travei|difícil falar|dificil falar|difícil dizer|dificil dizer|tenho vergonha de falar|tenho medo de contar)\b/i.test(value)) {
    categories.push('difficulty');
  }

  if (/\b(aconteceu|ontem|hoje|semana|briguei|discuti|falei|disse|fez|fiz|terminou|começou|comecou|mensagem|conversa|trabalho|faculdade|escola|família|familia|relacionamento|namorado|namorada|marido|esposa|mãe|mae|pai|irmão|irmao|irmã|irma|amigo|amiga|colega)\b/i.test(value)) {
    categories.push('fact');
  }

  if (!categories.length) categories.push('fact');
  return categories;
}

function matchBoundaryRule(text) {
  return BOUNDARY_RULES.find(rule => rule.pattern.test(String(text || ''))) || null;
}

function section(title, items) {
  const body = items.length
    ? items.map(item => `• ${firstPersonLine(item)}`).join('\n')
    : '• Ainda não ficou claro para mim.';
  return `${title}\n${body}`;
}

function firstPersonLine(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return '';
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).replace(/[.!?]+$/, '') + '.';
}

function unique(items) {
  return [...new Set(items.filter(Boolean))];
}

function firstUnused(state, questions) {
  return questions.find(question => !state.usedQuestions.includes(question)) || null;
}

function markQuestionUsed(state, question) {
  if (!Array.isArray(state.usedQuestions)) state.usedQuestions = [];
  if (!state.usedQuestions.includes(question)) state.usedQuestions.push(question);
}

function normalizeSentence(text) {
  const trimmed = text.trim();
  if (!trimmed) return '';
  return trimmed.charAt(0).toLowerCase() + trimmed.slice(1).replace(/[.!?]+$/, '') + '.';
}
