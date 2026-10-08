const START_QUESTIONS = {
  event: 'Isso tem mais a ver com algo que aconteceu ou com como você se sentiu depois?',
  session: 'O que torna esse assunto difícil de começar na sessão?',
  feeling: 'Você percebe isso mais nos pensamentos, no corpo, na vontade de fazer as coisas ou nas relações com outras pessoas?',
  afterSession: 'O que ficou da última sessão que você gostaria de registrar ou retomar?',
  record: 'Escreva o que você quer guardar. Neste modo, eu não vou aprofundar com perguntas.'
};

const DEPTH_LIMITS = {
  light: 2,
  medium: 4,
  deep: 6
};

const GENERIC_FALLBACKS = {
  light: [
    'Vamos manter isso simples. Qual é a parte mais importante de registrar agora?',
    'Já dá para escolher um próximo passo. O que seria mais útil conseguir levar para a próxima sessão?'
  ],
  medium: [
    'Quero ficar perto do que você realmente disse. Você consegue dar um exemplo concreto do que aconteceu?',
    'Tem uma parte que ainda ficou difícil de colocar em palavras. O que você gostaria que seu psicólogo entendesse primeiro?',
    'Podemos organizar sem concluir por você. Qual parte merece ficar no centro do rascunho?'
  ],
  deep: [
    'Vamos ordenar sem interpretar. O que aconteceu primeiro?',
    'Você já descreveu uma parte da situação. O que percebeu em você logo depois?',
    'Tem algo que ainda ficou por dizer. O que você gostaria de conseguir colocar em palavras?',
    'Podemos aproximar isso da sessão sem prever a reação de ninguém. O que você mais teme dizer em voz alta?'
  ]
};

const BOUNDARY_RULES = [
  {
    key: 'diagnosisRequest',
    pattern: /\b(você acha que eu tenho|vc acha que eu tenho|será que eu tenho|sera que eu tenho|isso significa que eu tenho|você acha que isso é|vc acha que isso e)\b/i,
    response: 'Eu não consigo confirmar nem descartar um diagnóstico. Posso ajudar a organizar o que você percebeu para levar ao profissional. Qual sinal ou situação você gostaria de contar primeiro?'
  },
  {
    key: 'therapistPrediction',
    pattern: /((meu|minha)\s+psic[oó]log[oa].{0,45}(vai|iria|pode).{0,30}(julgar|pensar|achar|reagir))|(o que\s+(meu|minha)\s+psic[oó]log[oa].{0,30}(vai|iria).{0,20}(pensar|achar))/i,
    response: 'Eu não consigo prever como seu psicólogo vai reagir. Posso ajudar a transformar esse receio em algo que você leve para a sessão. Qual é a parte que você mais teme dizer?'
  },
  {
    key: 'dependency',
    pattern: /(só consigo falar com você|so consigo falar com voce|prefiro falar com você|prefiro falar com voce|você é a única pessoa|voce e a unica pessoa|só você me entende|so voce me entende)/i,
    response: 'Posso ajudar a preparar o que você quer dizer, mas não quero ocupar o lugar de uma pessoa ou profissional. O que você gostaria de conseguir levar desta conversa para alguém de confiança ou para seu psicólogo?'
  },
  {
    key: 'correction',
    pattern: /(não foi isso|nao foi isso|você entendeu errado|voce entendeu errado|não me representa|nao me representa|não foi o que eu quis dizer|nao foi o que eu quis dizer|você está interpretando|voce esta interpretando)/i,
    response: 'Você está me corrigindo, então vou descartar essa formulação. O que ficou errado: o fato, a emoção ou a forma de dizer?'
  },
  {
    key: 'stop',
    pattern: /\b(não quero aprofundar|nao quero aprofundar|quero parar|prefiro parar|chega por hoje|não quero continuar|nao quero continuar)\b/i,
    response: 'Tudo bem. Podemos parar por aqui. Você pode usar “Me ajuda a dizer isso” com o que já contou ou voltar quando quiser.'
  },
  {
    key: 'contradiction',
    pattern: /(?=.*\b(quero terminar|quero me afastar)\b)(?=.*\b(medo de perder|medo de ficar sem)\b)/i,
    response: 'De um lado, você quer se afastar; de outro, tem medo de perder essa pessoa. As duas coisas parecem verdadeiras ao mesmo tempo para você?'
  }
];

const SENSITIVE_TOPIC_PATTERN = /\b(abuso|abusado|abusada|violência|violencia|estupro|agressão|agressao|assédio|assedio|luto|falecimento|morreu|morte|trauma|traumático|traumatica|traumática)\b/i;
const UNCERTAINTY_PATTERN = /^(não sei|nao sei|sei lá|sei la|difícil dizer|dificil dizer|não consigo explicar|nao consigo explicar|não sei o que sinto|nao sei o que sinto)[.!]?$/i;

const SIGNALS = [
  {
    key: 'uncertainty',
    pattern: UNCERTAINTY_PATTERN,
    questions: [
      'Faz sentido ainda não ter uma palavra. Isso aparece mais no corpo, nos pensamentos, na vontade de fazer coisas ou nas relações?',
      'Você não precisa acertar um nome. Se ajudar a testar palavras: tristeza, medo, raiva, vergonha, culpa ou ansiedade chega perto — ou nenhuma delas?'
    ]
  },
  {
    key: 'body',
    pattern: /\b(corpo|coração|coracao|peito|respiração|respiracao|tremor|tenso|tensa|cansaço|cansaco|dor|sono|apetite)\b/i,
    questions: [
      'Você percebeu isso no corpo. Em que momento essa sensação costuma ficar mais forte?',
      'Você trouxe um sinal no corpo. O que estava acontecendo ao redor quando ele apareceu?'
    ]
  },
  {
    key: 'thought',
    pattern: /\b(pensei|pensando|pensamento|imagino|imaginei|acho que|minha cabeça|na minha cabeça)\b/i,
    questions: [
      'Você trouxe um pensamento que aparece nessa situação. Qual parte dele volta com mais frequência?',
      'Esse pensamento parece importante para o que você quer levar à sessão. Ele aparece mais antes, durante ou depois da situação?'
    ]
  },
  {
    key: 'emotion',
    pattern: /\b(raiva|triste|tristeza|vergonha|medo|culpa|ansioso|ansiosa|ansiedade|alívio|alivio|frustrado|frustrada|decepcionado|decepcionada)\b/i,
    questions: [
      'Você nomeou uma emoção para essa experiência. O que estava acontecendo quando ela apareceu?',
      'Você já encontrou uma palavra para parte do que sentiu. Essa palavra representa bem a experiência ou só chega perto?'
    ]
  },
  {
    key: 'relationship',
    pattern: /\b(namorado|namorada|marido|esposa|parceiro|parceira|mãe|mae|pai|irmão|irmao|irmã|irma|amigo|amiga|colega|família|familia|relacionamento)\b/i,
    questions: [
      'Você trouxe uma interação com outra pessoa. Qual parte dela ficou mais difícil de levar para a sessão?',
      'Tem uma parte dessa interação que ficou marcada para você. Qual trecho é mais importante registrar?'
    ]
  },
  {
    key: 'selfJudgment',
    pattern: /\b(sou ridículo|sou ridicula|sou ridículo|sou idiota|sou horrível|sou horrivel|sou fraco|sou fraca|que vergonha de mim)\b/i,
    questions: [
      'Você usou um rótulo sobre si. O que aconteceu para você acabar se descrevendo desse jeito?',
      'Se deixarmos o rótulo de lado por um momento, qual fato ou situação você gostaria de conseguir contar?'
    ]
  },
  {
    key: 'avoidance',
    pattern: /\b(evito|evitando|não consigo falar|nao consigo falar|não contei|nao contei|escondo|mudo de assunto|travo|travei)\b/i,
    questions: [
      'Você trouxe uma dificuldade para falar sobre isso. O que pesa mais: começar o assunto, continuar depois de começar ou lidar com a reação da outra pessoa?',
      'Você já identificou que falar é uma parte difícil. Se dissesse só a primeira frase na sessão, o que gostaria que ela comunicasse?'
    ]
  }
];

const SUMMARY_EXCLUDED_CATEGORIES = new Set(['control', 'question', 'uncertainty']);

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

  const question = state.mode === 'record'
    ? 'Registrado. Se quiser, você pode usar “Me ajuda a dizer isso” para organizar o que escreveu ou encerrar por aqui.'
    : chooseAdaptiveQuestion(state, text);

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
    : 'Sem problema. Podemos ir por outro caminho: você prefere falar do que aconteceu, de como ficou depois, ou ir direto para uma síntese?';

  state.lastQuestion = question;
  markQuestionUsed(state, question);
  state.transcript.push({ role: 'ai', text: question });
  return question;
}

export function chooseAdaptiveQuestion(state, answer) {
  const text = String(answer || '').trim();

  const boundary = matchBoundaryRule(text);
  if (boundary) return boundary.response;

  if (SENSITIVE_TOPIC_PATTERN.test(text)) {
    return 'Você nomeou um assunto sensível. Não precisamos entrar em detalhes para registrá-lo. Você prefere continuar com cuidado, só registrar, ou transformar isso em algo para levar à sessão?';
  }

  if (text.length >= 280) {
    return 'Você trouxe várias partes de uma vez. Para não reorganizar por você, prefere começar pelo que aconteceu primeiro ou pelo que mais gostaria de levar à sessão?';
  }

  const matchedSignal = SIGNALS.find(signal => signal.pattern.test(text));
  if (matchedSignal) {
    const candidate = firstUnused(state, matchedSignal.questions);
    if (candidate) return candidate;
  }

  if ((Number(state.turn || 0) + 1) % 3 === 0) {
    return 'Já apareceu material suficiente para você escolher o próximo passo. Você prefere continuar explorando, montar uma síntese agora ou parar por hoje?';
  }

  const limit = DEPTH_LIMITS[state.depth] || DEPTH_LIMITS.light;
  if (state.turn >= limit) {
    return 'Já temos material suficiente para montar um primeiro rascunho. Você prefere usar “Me ajuda a dizer isso” ou acrescentar mais alguma coisa?';
  }

  const fallbackPool = GENERIC_FALLBACKS[state.depth] || GENERIC_FALLBACKS.light;
  const fallback = firstUnused(state, fallbackPool);
  if (fallback) return fallback;

  return 'Quero evitar completar lacunas por você. O que considera mais importante registrar disso agora?';
}

export function buildStructuredSummary(state) {
  const entries = state.entries.filter(item => item?.text);
  const contentEntries = entries.filter(item =>
    !item.categories?.some(category => SUMMARY_EXCLUDED_CATEGORIES.has(category))
  );

  if (!contentEntries.length) {
    return {
      facts: [],
      emotions: [],
      difficulties: [],
      sessionPoints: []
    };
  }

  const pick = category => contentEntries
    .filter(item => item.categories?.includes(category))
    .map(item => item.text);

  const facts = unique(pick('fact'));
  const emotions = unique(pick('emotion'));
  const difficulties = unique(pick('difficulty'));

  const sessionPoints = unique([
    ...difficulties,
    ...contentEntries.slice(-2).map(item => item.text)
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

  if (boundary?.key === 'diagnosisRequest' || boundary?.key === 'therapistPrediction') return ['question'];
  if (boundary?.key === 'stop' || boundary?.key === 'correction') return ['control'];
  if (boundary?.key === 'dependency') return ['difficulty'];
  if (UNCERTAINTY_PATTERN.test(value)) return ['uncertainty'];

  if (/\b(raiva|triste|tristeza|vergonha|medo|culpa|ansioso|ansiosa|ansiedade|alívio|alivio|frustrado|frustrada|decepcionado|decepcionada)\b/i.test(value)) {
    categories.push('emotion');
  }

  if (/\b(evito|evitando|não consigo falar|nao consigo falar|não contei|nao contei|escondo|mudo de assunto|travo|travei|difícil falar|dificil falar|difícil dizer|dificil dizer|tenho vergonha de falar|tenho medo de contar)\b/i.test(value)) {
    categories.push('difficulty');
  }

  if (/\b(aconteceu|ontem|hoje|semana|briguei|discuti|falei|disse|fez|fiz|terminou|começou|comecou|mensagem|conversa|trabalho|faculdade|escola|família|familia|relacionamento|namorado|namorada|marido|esposa|mãe|mae|pai|irmão|irmao|irmã|irma|amigo|amiga|colega|abuso|abusado|abusada|violência|violencia|estupro|agressão|agressao|assédio|assedio|luto|falecimento|morreu|morte|trauma)\b/i.test(value)) {
    categories.push('fact');
  }

  if (!categories.length) categories.push('fact');
  return unique(categories);
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
  if (!Array.isArray(state.usedQuestions)) state.usedQuestions = [];
  return questions.find(question => !state.usedQuestions.includes(question)) || null;
}

function markQuestionUsed(state, question) {
  if (!Array.isArray(state.usedQuestions)) state.usedQuestions = [];
  if (!state.usedQuestions.includes(question)) state.usedQuestions.push(question);
}
