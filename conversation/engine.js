import { selectGuidedResponse, rememberGuidedResponse } from './neutral-response-catalog.js';

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
    ruleId: 'CONV-DIAGNOSIS-01',
    pattern: /(você acha que eu tenho|vc acha que eu tenho|será que eu tenho|sera que eu tenho|isso significa que eu tenho|você acha que isso é|vc acha que isso e)/i,
    response: 'Eu não consigo confirmar nem descartar um diagnóstico. Posso ajudar a organizar o que você percebeu para levar ao profissional. Qual sinal ou situação você gostaria de contar primeiro?'
  },
  {
    key: 'therapistPrediction',
    ruleId: 'CONV-THERAPIST-PREDICTION-01',
    pattern: /((meu|minha)\s+psic[oó]log[oa].{0,45}(vai|iria|pode).{0,30}(julgar|pensar|achar|reagir))|(o que\s+(meu|minha)\s+psic[oó]log[oa].{0,30}(vai|iria).{0,20}(pensar|achar))/i,
    response: 'Eu não consigo prever como seu psicólogo vai reagir. Posso ajudar a transformar esse receio em algo que você leve para a sessão. Qual é a parte que você mais teme dizer?'
  },
  {
    key: 'dependency',
    ruleId: 'CONV-DEPENDENCY-01',
    pattern: /(só consigo falar com você|so consigo falar com voce|prefiro falar com você|prefiro falar com voce|você é a única pessoa|voce e a unica pessoa|só você me entende|so voce me entende)/i,
    response: 'Posso ajudar a preparar o que você quer dizer, mas não quero ocupar o lugar de uma pessoa ou profissional. O que você gostaria de conseguir levar desta conversa para alguém de confiança ou para seu psicólogo?'
  },
  {
    key: 'correction',
    ruleId: 'CONV-REPAIR-01',
    pattern: /(não foi isso|nao foi isso|você entendeu errado|voce entendeu errado|não me representa|nao me representa|não foi o que eu quis dizer|nao foi o que eu quis dizer|você está interpretando|voce esta interpretando)/i,
    response: 'Você está me corrigindo, então vou descartar essa formulação. O que ficou errado: o fato, a emoção ou a forma de dizer?'
  },
  {
    key: 'stop',
    ruleId: 'AUTONOMY-SKIP-01',
    pattern: /\b(não quero aprofundar|nao quero aprofundar|quero parar|prefiro parar|chega por hoje|não quero continuar|nao quero continuar|não quero mais falar|nao quero mais falar|quero encerrar|por hoje e so)\b|por hoje é só/i,
    response: 'Tudo bem. Podemos parar por aqui. Você pode usar “Me ajuda a dizer isso” com o que já contou ou voltar quando quiser.'
  },
  {
    key: 'contradiction',
    ruleId: 'CONV-REFLECT-01',
    pattern: /(?=.*\b(quero terminar|quero me afastar)\b)(?=.*\b(medo de perder|medo de ficar sem)\b)/i,
    response: 'De um lado, você quer se afastar; de outro, tem medo de perder essa pessoa. As duas coisas parecem verdadeiras ao mesmo tempo para você?'
  }
];

const SENSITIVE_TOPIC_PATTERN = /\b(abuso|abusado|abusada|violência|violencia|estupro|agressão|agressao|assédio|assedio|luto|falecimento|morreu|morte|trauma|traumático|traumatica|traumática)\b/i;
const UNCERTAINTY_PATTERN = /^(não sei|nao sei|sei lá|sei la|não faço ideia|nao faco ideia|difícil dizer|dificil dizer|não consigo explicar|nao consigo explicar|não sei o que sinto|nao sei o que sinto)[.!?]*$/i;

// In record-only mode an explicit request to stop is a control command,
// whereas a historical/quoted mention remains a literal note.
const RECORD_STOP_PATTERN = /^(quero parar|prefiro parar(?: por aqui)?|chega por hoje|não quero continuar|nao quero continuar|não quero mais falar|nao quero mais falar|quero encerrar|por hoje é só|por hoje e so|não quero aprofundar|nao quero aprofundar)[?!.\s]*$/i;

const CONTROL_INTENTS = [
  {
    key:'skip',
    ruleId:'AUTONOMY-SKIP-01',
    // An anchored user command: quoted, third-person and historical statements
    // must not be interpreted as a request to skip.
    pattern:/^(prefiro (?:não|nao) responder(?: (?:essa|esta|a) pergunta)?|(?:não|nao) quero responder(?: (?:essa|esta|a) pergunta)?|pula (?:essa|esta|a) pergunta|pular pergunta|pode pular(?: essa pergunta)?|quero pular(?: essa pergunta)?|passo essa(?: pergunta)?|me (?:faz|faça) outra pergunta)[?!.\s]*$/i
  },
  {
    key:'clarify',
    ruleId:'CONV-CLARIFY-01',
    pattern:/^(como assim|não entendi|nao entendi|não entendi essa pergunta|nao entendi essa pergunta|o que você quer dizer|o que voce quer dizer|o que quer dizer com isso|pode explicar|pode reformular|explica melhor|explica de outro jeito|não saquei|nao saquei|não ficou claro|nao ficou claro)[?!.\s]*$/i
  },
  {
    key:'continue',
    ruleId:'AUTONOMY-CONTINUE-01',
    pattern:/^(continuar|continuar explorando|continua|quero continuar|vamos continuar|podemos continuar|pode continuar|seguir|quero seguir|quero explorar mais)[?!.\s]*$/i
  },
  {
    key:'summary',
    ruleId:'AUTONOMY-SUMMARY-01',
    pattern:/^(me (?:ajuda|ajude) a dizer isso|me ajuda a falar disso|me ajuda a organizar isso|me ajuda a explicar pro psicólogo|me ajuda a explicar pro psicologo|montar síntese|montar sintese|fazer síntese|fazer sintese|faz um resumo|pode resumir|quero um resumo|quero uma síntese|quero uma sintese|ir para a síntese|ir para a sintese)[?!.\s]*$/i
  }
];

const CONTINUATION_QUESTIONS = {
  light:[
    'Vamos continuar. Do que você já contou, qual parte você quer olhar um pouco mais antes de montar a síntese?'
  ],
  medium:[
    'Vamos continuar. O que ainda ficou faltando para seu psicólogo entender o que você quer levar dessa situação?'
  ],
  deep:[
    'Vamos continuar sem concluir por você. O que ainda parece importante colocar em palavras antes da síntese?'
  ]
};

const SIGNALS = [
  {
    key: 'uncertainty',
    ruleId: 'CONV-AFFECT-LABEL-01',
    pattern: UNCERTAINTY_PATTERN,
    questions: [
      'Não saber por enquanto também pode fazer parte do registro. Você prefere escrever uma situação concreta ou só registrar essa incerteza?',
      'Você não precisa acertar um nome. Se ajudar a testar palavras: tristeza, medo, raiva, vergonha, culpa ou ansiedade chega perto — ou nenhuma delas?'
    ]
  },
  {
    key: 'body',
    ruleId: 'CONV-REFLECT-01',
    pattern: /\b(corpo|coração|coracao|peito|respiração|respiracao|tremor|tenso|tensa|cansaço|cansaco|dor|sono|apetite)\b/i,
    questions: [
      'Você percebeu isso no corpo. Em que momento essa sensação costuma ficar mais forte?',
      'Você trouxe um sinal no corpo. O que estava acontecendo ao redor quando ele apareceu?'
    ]
  },
  {
    key: 'thought',
    ruleId: 'CONV-REFLECT-01',
    pattern: /\b(pensei|pensando|pensamento|imagino|imaginei|acho que|minha cabeça|na minha cabeça)\b/i,
    questions: [
      'Você trouxe um pensamento que aparece nessa situação. Qual parte dele volta com mais frequência?',
      'Esse pensamento parece importante para o que você quer levar à sessão. Ele aparece mais antes, durante ou depois da situação?'
    ]
  },
  {
    key: 'emotion',
    ruleId: 'CONV-REFLECT-01',
    pattern: /\b(raiva|triste|tristeza|vergonha|medo|culpa|ansioso|ansiosa|ansiedade|alívio|alivio|frustrado|frustrada|decepcionado|decepcionada|assusta|assustado|assustada|assustador|assustadora)\b/i,
    questions: [
      'Você nomeou uma emoção para essa experiência. O que estava acontecendo quando ela apareceu?',
      'Você já encontrou uma palavra para parte do que sentiu. Essa palavra representa bem a experiência ou só chega perto?'
    ]
  },
  {
    key: 'relationship',
    ruleId: 'CONV-REFLECT-01',
    pattern: /\b(namorado|namorada|marido|esposa|parceiro|parceira|mãe|mae|pai|irmão|irmao|irmã|irma|amigo|amiga|colega|família|familia|relacionamento)\b/i,
    questions: [
      'Você trouxe uma interação com outra pessoa. Qual parte dela ficou mais difícil de levar para a sessão?',
      'Tem uma parte dessa interação que ficou marcada para você. Qual trecho é mais importante registrar?'
    ]
  },
  {
    key: 'selfJudgment',
    ruleId: 'CONV-REFLECT-01',
    pattern: /\b(sou ridículo|sou ridicula|sou ridículo|sou idiota|sou horrível|sou horrivel|sou fraco|sou fraca|que vergonha de mim)\b/i,
    questions: [
      'Você usou um rótulo sobre si. O que aconteceu para você acabar se descrevendo desse jeito?',
      'Se deixarmos o rótulo de lado por um momento, qual fato ou situação você gostaria de conseguir contar?'
    ]
  },
  {
    key: 'avoidance',
    ruleId: 'CONV-REFLECT-01',
    pattern: /\b(evito|evitando|não consigo falar|nao consigo falar|não contei|nao contei|escondo|mudo de assunto|travo|travei)\b/i,
    questions: [
      'Você trouxe uma dificuldade para falar sobre isso. O que pesa mais: começar o assunto, continuar depois de começar ou lidar com a reação da outra pessoa?',
      'Você já identificou que falar é uma parte difícil. Se dissesse só a primeira frase na sessão, o que gostaria que ela comunicasse?'
    ]
  }
];

const SUMMARY_EXCLUDED_CATEGORIES = new Set(['control', 'question', 'uncertainty']);

// A conversa guarda contexto explícito, sem inferir fatos ou estados clínicos.
// Campos ausentes são aceitos para conversas salvas em versões anteriores.
function ensureConversationContext(state) {
  if (!state.context || typeof state.context !== 'object') state.context = {};
  const context = state.context;
  if (!Array.isArray(context.askedDimensions)) context.askedDimensions = [];
  if (!Array.isArray(context.questionHistory)) context.questionHistory = [];
  if (typeof context.lastQuestionDimension === 'undefined') {
    // Migração silenciosa de sessões cifradas anteriores ao campo context.
    context.lastQuestionDimension = questionDimension(state.lastQuestion);
    if (context.lastQuestionDimension) {
      context.askedDimensions.push(context.lastQuestionDimension);
      context.questionHistory.push({ dimension: context.lastQuestionDimension, turn: Number(state.turn || 0) });
    }
  }
  if (!Number.isSafeInteger(context.uncertaintyStreak) || context.uncertaintyStreak < 0) context.uncertaintyStreak = 0;
  return context;
}

// Estas dimensões descrevem perguntas, não classificam clinicamente a pessoa.
function questionDimension(text) {
  const value = String(text || '').toLocaleLowerCase('pt-BR')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (/pensamentos.{0,50}corpo.{0,80}vontade.{0,100}relac|corpo.{0,60}pensamentos.{0,100}vontade.{0,100}relac/.test(value)) return 'scope';
  // O contexto situacional tem precedência sobre expressões de tempo incidentais.
  if (/o que estava acontecendo|acontecendo ao redor|exemplo concreto/.test(value)) return 'circumstances';
  if (/em que momento|quando (essa|ela|isso|ele).{0,45}(aparec|acontec)|antes, durante ou depois/.test(value)) return 'timing';
  if (/o que aconteceu primeiro|o que percebeu em voce logo depois/.test(value)) return 'sequence';
  if (/testar palavras|representa bem|alguma chega perto|ou nenhuma delas/.test(value)) return 'affect_words';
  if (/parte mais importante|qual parte.{0,65}registrar|qual trecho.{0,65}importante|qual parte.{0,65}centro/.test(value)) return 'priority';
  if (/o que gostaria.{0,75}(levar|contar|comunicar).{0,50}sessao|o que.{0,50}psicolog.{0,30}entend/.test(value)) return 'session_goal';
  return null;
}

function noteQuestionContext(state, question) {
  const context = ensureConversationContext(state);
  const dimension = questionDimension(question);
  if (dimension && !context.askedDimensions.includes(dimension)) context.askedDimensions.push(dimension);
  if (dimension) {
    context.questionHistory.push({ dimension, turn: Number(state.turn || 0) });
    if (context.questionHistory.length > 12) context.questionHistory = context.questionHistory.slice(-12);
  }
  context.lastQuestionDimension = dimension;
}

// Respostas elípticas dependem da pergunta anterior; nunca entram na síntese como fatos.
function classifyBriefReply(state, answer) {
  const normalized = String(answer || '').toLocaleLowerCase('pt-BR')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[.!?\s]+$/g, '').trim();
  if (/^(em )?(tudo isso|todas (essas )?areas)$/.test(normalized)) {
    return ensureConversationContext(state).lastQuestionDimension === 'scope' ? 'scope_all' : 'brief_reference';
  }
  if (/^(isso|tudo|sim|nao|mais ou menos|talvez)$/.test(normalized)) return 'brief_reference';
  return null;
}

function briefReferenceTurn(state, answer) {
  const context = ensureConversationContext(state);
  const value = String(answer || '').trim().toLocaleLowerCase('pt-BR')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[.!?\s]+$/g, '');
  if (context.lastQuestionDimension === 'scope') {
    return {
      text: 'Quero entender a que você se refere sem supor nada. Prefere escrever como isso aparece para você ou deixar essa parte em aberto?',
      ruleId: 'CONV-CLARIFY-01'
    };
  }
  if (value === 'mais ou menos' || value === 'talvez') {
    return {
      text: 'Podemos deixar essa resposta em aberto, sem forçar uma definição. Você prefere acrescentar algo ou seguir para a síntese?',
      ruleId: 'CONV-CLARIFY-01'
    };
  }
  const options = [
    'Quero entender sua resposta sem completar por você. Prefere registrar o que quis dizer ou continuar com suas próprias palavras?',
    'Não preciso que você escolha uma explicação agora. Quer acrescentar algo com suas palavras ou preparar uma síntese do que já contou?',
    'Podemos seguir sem adivinhar o que você quis dizer. Prefere continuar escrevendo ou parar por aqui?'
  ];
  return { text: firstUnused(state, options) || 'Se quiser, escreva do seu jeito ou use a opção de montar uma síntese.', ruleId: 'CONV-CLARIFY-01' };
}

export function createConversation({ mode, depth = 'light' }) {
  return {
    mode,
    depth,
    turn: 0,
    entries: [],
    usedQuestions: [],
    skips: 0,
    context: { askedDimensions: [], questionHistory: [], lastQuestionDimension: null, answerScope: null, uncertaintyStreak: 0 },
    lastQuestion: START_QUESTIONS[mode] || START_QUESTIONS.session,
    lastRuleId: 'CONV-START-01',
    ruleHistory: [{ turn: 0, ruleId: 'CONV-START-01' }],
    transcript: [
      { role: 'ai', text: START_QUESTIONS[mode] || START_QUESTIONS.session }
    ]
  };
}

export function openingQuestion(state) {
  markQuestionUsed(state, state.lastQuestion);
  noteQuestionContext(state, state.lastQuestion);
  return state.lastQuestion;
}

export function nextQuestion(state, answer) {
  const text = String(answer || '').trim();
  const controlIntent = detectConversationControlIntent(text);
  const recordStop = state.mode === 'record' && RECORD_STOP_PATTERN.test(text);
  const briefReply = (controlIntent || state.mode === 'record') ? null : classifyBriefReply(state, text);
  const context = ensureConversationContext(state);
  if (briefReply === 'scope_all') context.answerScope = 'all';
  if (UNCERTAINTY_PATTERN.test(text)) context.uncertaintyStreak += 1;
  else if (!controlIntent) context.uncertaintyStreak = 0;

  if (controlIntent === 'skip') state.skips = Number(state.skips || 0) + 1;
  else state.skips = 0;
  if (!controlIntent && !briefReply && !recordStop) {
    state.entries.push({
      kind: 'user_statement',
      text,
      source: 'declared',
      categories: classifyDeclaredContent(text)
    });
  }

  if (!Array.isArray(state.transcript)) state.transcript = [];
  state.transcript.push({
    role: 'user',
    text,
    ...(controlIntent ? { meta: 'control:'+controlIntent } : recordStop ? { meta:'control:stop' } : {})
  });

  const turn = controlIntent === 'skip'
    ? skipTurn(state)
    : controlIntent === 'clarify'
    ? clarificationTurn(state)
    : controlIntent === 'continue'
      ? continuationTurn(state)
      : controlIntent === 'summary'
        ? {
            text: 'Certo. Vou usar apenas o que você já escreveu para montar uma síntese editável.',
            ruleId: 'AUTONOMY-SUMMARY-01'
          }
        : recordStop
          ? { text: 'Tudo bem. Podemos parar por aqui. Você pode voltar quando quiser.', ruleId: 'AUTONOMY-SKIP-01' }
        : state.mode === 'record'
          ? {
              text: 'Registrado. Se quiser, você pode usar “Me ajuda a dizer isso” para organizar o que escreveu ou encerrar por aqui.',
              ruleId: 'CONV-START-01'
            }
          : briefReply === 'brief_reference'
            ? briefReferenceTurn(state, text)
            : context.uncertaintyStreak >= 3
              ? {
                  text: 'Não precisamos insistir nessa pergunta. Você prefere deixar esse ponto em aberto, montar uma síntese ou parar por aqui?',
                  ruleId: 'AUTONOMY-CHECKPOINT-01'
                }
              : chooseAdaptiveTurn(state, text);

  state.turn += 1;
  state.lastQuestion = turn.text;
  state.lastRuleId = turn.ruleId;
  recordRule(state, turn.ruleId);
  rememberGuidedResponse(state, turn);
  markQuestionUsed(state, turn.text);
  noteQuestionContext(state, turn.text);
  state.transcript.push({ role: 'ai', text: turn.text });
  return turn.text;
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

  const turn=skipTurn(state);
  state.lastQuestion = turn.text;
  state.lastRuleId = turn.ruleId;
  recordRule(state, turn.ruleId);
  markQuestionUsed(state, turn.text);
  noteQuestionContext(state, turn.text);
  state.transcript.push({ role: 'ai', text: turn.text });
  return turn.text;
}

function skipTurn(state) {
  return {
    text: state.skips >= 2
      ? 'Sem problema. Podemos parar por aqui. Você pode usar “Me ajuda a dizer isso” com o que já contou ou voltar quando quiser.'
      : 'Sem problema. Podemos ir por outro caminho: você prefere falar do que aconteceu, de como ficou depois, ou ir direto para uma síntese?',
    ruleId: 'AUTONOMY-SKIP-01'
  };
}

export function detectConversationControlIntent(answer) {
  const text = String(answer || '').trim();
  return CONTROL_INTENTS.find(intent=>intent.pattern.test(text))?.key || null;
}

function clarificationTurn(state) {
  const lastQuestion=String(state.lastQuestion || '');

  if (/prefere falar do que aconteceu|continuar explorando|montar uma síntese|parar por hoje/i.test(lastQuestion)) {
    return {
      text: 'Quero dizer que você pode escolher o caminho agora: continuar falando do que aconteceu ou de como isso ficou em você, montar uma síntese com o que já contou, ou parar por aqui.',
      ruleId: 'CONV-CLARIFY-01'
    };
  }

  if (/parte mais importante de registrar/i.test(lastQuestion)) {
    return {
      text: 'Quero dizer: qual pedaço disso você mais quer guardar ou conseguir contar na sessão? Não precisa explicar tudo.',
      ruleId: 'CONV-CLARIFY-01'
    };
  }

  return {
    text: 'Posso colocar de um jeito mais simples: qual parte do que estamos falando você quer continuar explorando agora? Pode ser o que aconteceu, o que você sentiu ou algo que queira levar para a sessão.',
    ruleId: 'CONV-CLARIFY-01'
  };
}

function continuationTurn(state) {
  const recent=[...(state.entries || [])]
    .reverse()
    .find(item=>item?.text && !item.categories?.some(category=>['control','question','uncertainty'].includes(category)));

  if (recent) {
    const matchedSignal=SIGNALS.find(signal=>signal.pattern.test(recent.text));
    if (matchedSignal) {
      const candidate=firstUnused(state,matchedSignal.questions);
      if (candidate) return { text:candidate, ruleId:matchedSignal.ruleId };
    }
  }

  const guided = selectGuidedResponse(state, { channel: 'continue' });
  if (guided) return guided;

  const pool=CONTINUATION_QUESTIONS[state.depth] || CONTINUATION_QUESTIONS.light;
  const candidate=firstUnused(state,pool) ||
    'Podemos continuar sem repetir as perguntas anteriores. Você prefere acrescentar algo com suas palavras ou montar uma síntese?';
  return { text:candidate, ruleId:'AUTONOMY-CONTINUE-01' };
}

export function chooseAdaptiveTurn(state, answer) {
  const text = String(answer || '').trim();

  const boundary = matchBoundaryRule(text);
  if (boundary) return { text: boundary.response, ruleId: boundary.ruleId };

  if (SENSITIVE_TOPIC_PATTERN.test(text)) {
    return {
      text: 'Você nomeou um assunto sensível. Não precisamos entrar em detalhes para registrá-lo. Você prefere continuar com cuidado, só registrar, ou transformar isso em algo para levar à sessão?',
      ruleId: 'SAFETY-SENSITIVE-01'
    };
  }

  if (text.length >= 280) {
    return {
      text: 'Você trouxe várias partes de uma vez. Para não reorganizar por você, prefere começar pelo que aconteceu primeiro ou pelo que mais gostaria de levar à sessão?',
      ruleId: 'CONV-REFLECT-01'
    };
  }

  // Prioriza detalhes declarados, sem atribuir significado clínico a eles.
  if (/\b(mundo|ambiente|ao redor|luz|claro|clara|colorido|colorida|cores)\b/i.test(text) && /\b(assusta|assustado|assustada|medo|estranho|estranha)\b/i.test(text)) {
    const options=[
      'Você descreveu uma mudança em como percebe o ambiente e disse que isso às vezes assusta. Quer registrar quando percebe isso ou como é para você?',
      'Sem precisar explicar a causa, o que gostaria que seu psicólogo soubesse sobre essa experiência?'
    ];
    const candidate=firstUnused(state,options);
    if(candidate) return {text:candidate,ruleId:'CONV-REFLECT-01'};
  }

  // Resposta curta à pergunta inicial: não trata "tudo isso" como fato clínico.
  if (/^(em\s+)?tudo\s+isso[.!?]*$/i.test(text) || /^em\s+todas\s+(essas\s+)?áreas[.!?]*$/i.test(text)) {
    return {
      text: 'Entendi: você percebe isso em mais de uma dessas áreas. Quer escolher uma parte para registrar primeiro, ou prefere contar do seu jeito?',
      ruleId: 'CONV-REFLECT-01'
    };
  }

  // Reflexão ancorada nos termos que a pessoa realmente usou.
  if (/\b(mundo|ambiente|ao redor|colorido|colorida|cores)\b/i.test(text) && /\b(felicidade|feliz)\b/i.test(text)) {
    const options=[
      'Você descreveu o mundo como mais colorido e também mencionou uma sensação de felicidade. O que gostaria de registrar sobre essa experiência?',
      'Quando fala dessa sensação de felicidade, como gostaria de explicá-la na sessão, com suas próprias palavras?'
    ];
    const candidate=firstUnused(state,options);
    if(candidate) return { text:candidate,ruleId:'CONV-REFLECT-01' };
  }

  const matchedSignal = SIGNALS.find(signal => signal.pattern.test(text));
  if (matchedSignal) {
    const candidate = firstUnused(state, matchedSignal.questions);
    if (candidate) return { text: candidate, ruleId: matchedSignal.ruleId };
  }

  const checkpointAlreadyShown = (state.ruleHistory || []).some(entry=>entry.ruleId==='AUTONOMY-CHECKPOINT-01');
  if (!checkpointAlreadyShown && (Number(state.turn || 0) + 1) % 3 === 0) {
    return {
      text: 'Já apareceu material suficiente para você escolher o próximo passo. Você prefere continuar explorando, montar uma síntese agora ou parar por hoje?',
      ruleId: 'AUTONOMY-CHECKPOINT-01'
    };
  }

  const limit = DEPTH_LIMITS[state.depth] || DEPTH_LIMITS.light;
  if (!checkpointAlreadyShown && state.turn >= limit) {
    return {
      text: 'Já temos material suficiente para montar um primeiro rascunho. Você prefere usar “Me ajuda a dizer isso” ou acrescentar mais alguma coisa?',
      ruleId: 'AUTONOMY-CHECKPOINT-01'
    };
  }

  // Only neutral, non-sensitive fallbacks reach this catalog. Guards, controls,
  // declared signal reflection and autonomy checkpoints have already run.
  const guided = selectGuidedResponse(state, { channel: 'fallback' });
  if (guided) return guided;

  const fallbackPool = GENERIC_FALLBACKS[state.depth] || GENERIC_FALLBACKS.light;
  const fallback = firstUnused(state, fallbackPool);
  if (fallback) return { text: fallback, ruleId: 'CONV-REFLECT-01' };

  return {
    text: 'Quero evitar completar lacunas por você. O que considera mais importante registrar disso agora?',
    ruleId: 'CONV-REFLECT-01'
  };
}

export function chooseAdaptiveQuestion(state, answer) {
  return chooseAdaptiveTurn(state, answer).text;
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
  if (/^(em\s+)?tudo\s+isso[.!?]*$/i.test(value) || /^em\s+todas\s+(essas\s+)?áreas[.!?]*$/i.test(value)) return ['control'];

  if (/\b(raiva|triste|tristeza|vergonha|medo|culpa|ansioso|ansiosa|ansiedade|alívio|alivio|frustrado|frustrada|decepcionado|decepcionada|assusta|assustado|assustada|assustador|assustadora)\b/i.test(value)) {
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
  const context = ensureConversationContext(state);
  const recentDimensions = new Set(context.questionHistory
    .filter(item => Number(state.turn || 0) - Number(item.turn || 0) < 3)
    .map(item => item.dimension));
  return questions.find(question => {
    if (state.usedQuestions.includes(question)) return false;
    const dimension = questionDimension(question);
    return !dimension || !recentDimensions.has(dimension);
  }) || null;
}

function markQuestionUsed(state, question) {
  if (!Array.isArray(state.usedQuestions)) state.usedQuestions = [];
  if (!state.usedQuestions.includes(question)) state.usedQuestions.push(question);
}

function recordRule(state, ruleId) {
  if (!Array.isArray(state.ruleHistory)) state.ruleHistory = [];
  state.ruleHistory.push({ turn: Number(state.turn || 0), ruleId });
}
