import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createConversation,
  openingQuestion,
  nextQuestion,
  skipQuestion,
  chooseAdaptiveQuestion,
  detectConversationControlIntent,
  buildSummary,
  buildStructuredSummary
} from '../../conversation/engine.js';
import { assessSafety, AI_BOUNDARIES } from '../../safety/policy.js';

test('começa com pergunta proporcional e não exige relato longo', () => {
  const state = createConversation({ mode: 'feeling', depth: 'light' });
  assert.match(openingQuestion(state), /pensamentos|corpo|vontade|relações/i);
});

test('registra resposta como declaração do usuário', () => {
  const state = createConversation({ mode: 'event', depth: 'medium' });
  nextQuestion(state, 'Briguei com meu namorado ontem.');
  assert.equal(state.entries[0].source, 'declared');
  assert.equal(state.entries[0].text, 'Briguei com meu namorado ontem.');
});

test('resposta "não sei" reduz a exigência em vez de pressionar', () => {
  const state = createConversation({ mode: 'feeling', depth: 'light' });
  openingQuestion(state);
  const question = nextQuestion(state, 'Não sei');
  assert.match(question, /não saber|corpo|pensamentos|vontade|relações|leve|pesado/i);
  assert.doesNotMatch(question, /por quê|porque você/i);
});

test('menção ao corpo gera pergunta sobre a experiência corporal', () => {
  const state = createConversation({ mode: 'feeling', depth: 'medium' });
  const question = chooseAdaptiveQuestion(state, 'Sinto um aperto no peito e fico tenso.');
  assert.match(question, /corpo|sensação|acontecendo/i);
});

test('menção a pensamento gera pergunta sobre o pensamento declarado', () => {
  const state = createConversation({ mode: 'session', depth: 'medium' });
  const question = chooseAdaptiveQuestion(state, 'Fico pensando que ela vai me julgar.');
  assert.match(question, /pensamento|antes|durante|depois/i);
});

test('autojulgamento não é reforçado como rótulo', () => {
  const state = createConversation({ mode: 'session', depth: 'medium' });
  const question = chooseAdaptiveQuestion(state, 'Sou ridículo por ter feito isso.');
  assert.match(question, /rótulo|descrevendo desse jeito|descrever desse jeito/i);
  assert.doesNotMatch(question, /você é|realmente ridículo/i);
});

test('perguntas adaptativas não repetem imediatamente a mesma formulação', () => {
  const state = createConversation({ mode: 'event', depth: 'medium' });
  openingQuestion(state);
  const first = nextQuestion(state, 'Tenho vergonha disso.');
  const second = nextQuestion(state, 'Continuo com vergonha.');
  assert.notEqual(first, second);
});

test('profundidade leve converge cedo para síntese em vez de interrogatório', () => {
  const state = createConversation({ mode: 'session', depth: 'light' });
  openingQuestion(state);
  nextQuestion(state, 'É uma coisa da minha família.');
  nextQuestion(state, 'Eu travo quando tento falar.');
  const q = nextQuestion(state, 'Ainda é difícil.');
  assert.match(q, /próximo passo|continuar explorando|síntese|rascunho/i);
});

test('síntese estruturada separa conteúdo declarado sem inventar diagnóstico', () => {
  const state = createConversation({ mode: 'session', depth: 'medium' });
  nextQuestion(state, 'Briguei com meu namorado ontem.');
  nextQuestion(state, 'Tenho vergonha de falar sobre meu relacionamento.');
  nextQuestion(state, 'Tenho medo de contar isso na sessão.');

  const structured = buildStructuredSummary(state);
  assert.deepEqual(structured.facts, [
    'Briguei com meu namorado ontem.',
    'Tenho vergonha de falar sobre meu relacionamento.'
  ]);
  assert.deepEqual(structured.emotions, [
    'Tenho vergonha de falar sobre meu relacionamento.',
    'Tenho medo de contar isso na sessão.'
  ]);
  assert.deepEqual(structured.difficulties, [
    'Tenho vergonha de falar sobre meu relacionamento.',
    'Tenho medo de contar isso na sessão.'
  ]);

  const summary = buildSummary(state);
  assert.match(summary, /O que aconteceu/i);
  assert.match(summary, /O que eu disse que senti/i);
  assert.match(summary, /O que está difícil de dizer/i);
  assert.match(summary, /O que eu gostaria de levar para a sessão/i);
  assert.doesNotMatch(summary, /diagnóstico|dependência emocional|transtorno/i);
});

test('síntese deixa lacuna explícita quando uma categoria não foi declarada', () => {
  const state = createConversation({ mode: 'event', depth: 'light' });
  nextQuestion(state, 'Briguei com meu namorado ontem.');
  const summary = buildSummary(state);
  assert.match(summary, /O que eu disse que senti\n• Ainda não ficou claro para mim\./i);
});

test('situação de perigo imediato interrompe fluxo comum', () => {
  const result = assessSafety({ explicitImmediateDanger: true });
  assert.equal(result.interrupt, true);
  assert.equal(result.level, 'immediate-risk');
  assert.match(result.message, /apoio humano|emergência/i);
});

test('limites clínicos permanecem desativados', () => {
  assert.equal(AI_BOUNDARIES.diagnose, false);
  assert.equal(AI_BOUNDARIES.prescribe, false);
  assert.equal(AI_BOUNDARIES.clinicalInterpretation, false);
  assert.equal(AI_BOUNDARIES.automaticSharing, false);
});


test('transcript preserva sequência de mensagens para retomada local', () => {
  const state=createConversation({mode:'session',depth:'light'});
  const first=openingQuestion(state);
  const next=nextQuestion(state,'Tenho algo difícil para contar.');
  assert.deepEqual(state.transcript,[
    {role:'ai',text:first},
    {role:'user',text:'Tenho algo difícil para contar.'},
    {role:'ai',text:next}
  ]);
});


test('usuário pode pular pergunta sem criar conteúdo declarado', () => {
  const state=createConversation({mode:'session',depth:'medium'});
  openingQuestion(state);
  const before=state.entries.length;
  const question=skipQuestion(state);
  assert.equal(state.entries.length,before);
  assert.match(question,/outro caminho|síntese/i);
  assert.equal(state.transcript.at(-2).meta,'skip');
});

test('pulos repetidos reduzem pressão e oferecem parar', () => {
  const state=createConversation({mode:'session',depth:'deep'});
  openingQuestion(state);
  skipQuestion(state);
  const second=skipQuestion(state);
  assert.match(second,/parar por aqui|voltar quando quiser/i);
  assert.equal(state.entries.length,0);
});


test('pedido de diagnóstico recebe limite explícito e não vira fato na síntese', () => {
  const state=createConversation({mode:'feeling',depth:'medium'});
  const question=nextQuestion(state,'Você acha que eu tenho depressão?');
  assert.match(question,/não consigo confirmar nem descartar um diagnóstico/i);
  const structured=buildStructuredSummary(state);
  assert.deepEqual(structured.facts,[]);
  assert.deepEqual(state.entries[0].categories,['question']);
});

test('frase de vínculo exclusivo não é reforçada pela ferramenta', () => {
  const state=createConversation({mode:'session',depth:'medium'});
  const question=nextQuestion(state,'Só consigo falar com você sobre isso.');
  assert.match(question,/não quero ocupar o lugar de uma pessoa ou profissional/i);
  assert.match(question,/alguém de confiança|psicólogo/i);
  assert.doesNotMatch(question,/só precisa de mim|estou sempre aqui para você/i);
});

test('pedido explícito para parar encerra aprofundamento sem pressão', () => {
  const state=createConversation({mode:'session',depth:'deep'});
  const question=nextQuestion(state,'Não quero aprofundar.');
  assert.match(question,/podemos parar por aqui|voltar quando quiser/i);
  assert.deepEqual(state.entries[0].categories,['control']);
  assert.deepEqual(buildStructuredSummary(state).facts,[]);
});

test('contradição é explorada como coexistência e não como rótulo', () => {
  const state=createConversation({mode:'session',depth:'deep'});
  const question=nextQuestion(state,'Quero me afastar, mas tenho medo de perder essa pessoa.');
  assert.match(question,/duas coisas juntas|verdadeiras ao mesmo tempo/i);
  assert.doesNotMatch(question,/ambivalência|dependência|transtorno/i);
});

test('resposta longa é organizada sem reescrever a experiência', () => {
  const state=createConversation({mode:'event',depth:'medium'});
  const longText='Ontem aconteceu muita coisa no trabalho. '.repeat(10);
  const question=nextQuestion(state,longText);
  assert.match(question,/várias partes|aconteceu primeiro|levar à sessão/i);
  assert.doesNotMatch(question,/isso significa|você sente porque/i);
});


test('modo depois da sessão começa pelo que ficou para retomar', () => {
  const state=createConversation({mode:'afterSession',depth:'light'});
  assert.match(openingQuestion(state),/última sessão|registrar|retomar/i);
});

test('modo só registrar não transforma o registro em interrogatório', () => {
  const state=createConversation({mode:'record',depth:'deep'});
  openingQuestion(state);
  const response=nextQuestion(state,'Quero lembrar que fiquei incomodado com uma fala.');
  assert.match(response,/registrado|organizar|encerrar/i);
  assert.doesNotMatch(response,/por quê|o que aconteceu depois|como você se sentiu/i);
  assert.equal(state.entries.length,1);
});


test('correção do usuário descarta formulação em vez de defender interpretação', () => {
  const state=createConversation({mode:'session',depth:'medium'});
  const response=nextQuestion(state,'Não foi isso, você entendeu errado.');
  assert.match(response,/corrigindo|descartar essa formulação/i);
  assert.match(response,/fato|emoção|forma de dizer/i);
  assert.deepEqual(state.entries[0].categories,['control']);
  assert.deepEqual(buildStructuredSummary(state),{
    facts:[],
    emotions:[],
    difficulties:[],
    sessionPoints:[]
  });
});

test('assunto sensível explícito recebe escolha e não pedido de detalhes', () => {
  const state=createConversation({mode:'session',depth:'deep'});
  const response=nextQuestion(state,'Quero falar de um abuso que aconteceu.');
  assert.match(response,/assunto sensível|não precisamos entrar em detalhes/i);
  assert.match(response,/continuar com cuidado|só registrar|levar à sessão/i);
  assert.doesNotMatch(response,/quem fez|onde foi|conte em detalhes|o que ele fez/i);
});

test('vocabulário emocional é oferecido como hipótese opcional depois de incerteza', () => {
  const state=createConversation({mode:'feeling',depth:'medium'});
  openingQuestion(state);
  nextQuestion(state,'Não sei');
  const second=nextQuestion(state,'Não sei');
  assert.match(second,/tristeza|medo|raiva|vergonha|culpa|ansiedade/i);
  assert.match(second,/ou nenhuma delas/i);
  const structured=buildStructuredSummary(state);
  assert.deepEqual(structured.emotions,[]);
  assert.deepEqual(structured.facts,[]);
});

test('emoção nomeada pelo usuário pode ser refletida sem amplificação clínica', () => {
  const state=createConversation({mode:'feeling',depth:'medium'});
  const response=nextQuestion(state,'Estou com vergonha.');
  assert.match(response,/nomeou uma emoção|palavra/i);
  assert.doesNotMatch(response,/trauma|transtorno|dependência|medo de abandono/i);
  assert.deepEqual(buildStructuredSummary(state).emotions,['Estou com vergonha.']);
});

test('não prevê reação do psicólogo nem oferece falsa garantia', () => {
  const state=createConversation({mode:'session',depth:'medium'});
  const response=nextQuestion(state,'Meu psicólogo vai me julgar quando eu contar?');
  assert.match(response,/não consigo prever/i);
  assert.match(response,/leve para a sessão|levar.*sessão/i);
  assert.doesNotMatch(response,/não vai te julgar|com certeza|vai entender/i);
  assert.deepEqual(state.entries[0].categories,['question']);
});

test('checkpoint de agenda devolve escolha ao usuário', () => {
  const state=createConversation({mode:'session',depth:'deep'});
  nextQuestion(state,'Quero começar por uma coisa.');
  nextQuestion(state,'Outra parte também importa.');
  const response=nextQuestion(state,'Ainda estou organizando.');
  assert.match(response,/continuar explorando|síntese|parar por hoje/i);
});

test('respostas do motor fazem no máximo uma pergunta por turno', () => {
  const samples=[
    ['event','Briguei com meu namorado ontem.'],
    ['feeling','Não sei'],
    ['session','Tenho vergonha de falar disso.'],
    ['session','Não foi isso, você entendeu errado.'],
    ['session','Quero falar de um trauma.'],
    ['session','Meu psicólogo vai me julgar?']
  ];
  for(const [mode,text] of samples) {
    const state=createConversation({mode,depth:'medium'});
    const response=nextQuestion(state,text);
    assert.ok((response.match(/\?/g)||[]).length<=1, response);
  }
});

test('mensagens de controle e perguntas não vazam para pontos da síntese', () => {
  const state=createConversation({mode:'session',depth:'medium'});
  nextQuestion(state,'Briguei com meu namorado ontem.');
  nextQuestion(state,'Você entendeu errado.');
  nextQuestion(state,'Meu psicólogo vai me julgar?');
  const structured=buildStructuredSummary(state);
  assert.deepEqual(structured.facts,['Briguei com meu namorado ontem.']);
  assert.equal(structured.sessionPoints.includes('Você entendeu errado.'),false);
  assert.equal(structured.sessionPoints.includes('Meu psicólogo vai me julgar?'),false);
});


test('pedido curto de esclarecimento reformula sem virar conteúdo declarado',()=>{
  const state=createConversation({mode:'session',depth:'light'});
  openingQuestion(state);
  nextQuestion(state,'É uma coisa da minha família.');
  const before=state.entries.length;
  const response=nextQuestion(state,'Como assim?');
  assert.equal(detectConversationControlIntent('Como assim?'),'clarify');
  assert.equal(state.entries.length,before);
  assert.match(response,/quero dizer|jeito mais simples|qual parte/i);
  assert.equal(state.transcript.at(-2).meta,'control:clarify');
});

test('continuar explorando gera nova pergunta sem repetir checkpoint nem virar conteúdo',()=>{
  const state=createConversation({mode:'feeling',depth:'light'});
  openingQuestion(state);
  nextQuestion(state,'Sinto como se o mundo ao meu redor estivesse mais claro e isso às vezes me assusta.');
  const checkpoint=nextQuestion(state,'Tem dias em que isso fica mais forte.');
  const before=state.entries.length;
  const response=nextQuestion(state,'Continuar explorando');
  assert.equal(detectConversationControlIntent('Continuar explorando'),'continue');
  assert.equal(state.entries.length,before);
  assert.notEqual(response,checkpoint);
  assert.doesNotMatch(response,/já temos material suficiente|já apareceu material suficiente/i);
  assert.equal(state.transcript.at(-2).meta,'control:continue');
});

test('pedido natural de síntese é reconhecido como controle e não como relato',()=>{
  const state=createConversation({mode:'session',depth:'medium'});
  nextQuestion(state,'Tenho medo de falar disso na sessão.');
  const before=state.entries.length;
  const response=nextQuestion(state,'Me ajuda a dizer isso');
  assert.equal(detectConversationControlIntent('Me ajuda a dizer isso'),'summary');
  assert.equal(state.entries.length,before);
  assert.match(response,/síntese editável/i);
  assert.equal(state.transcript.at(-2).meta,'control:summary');
  assert.doesNotMatch(buildSummary(state),/Me ajuda a dizer isso/i);
});

test('checkpoint não se repete imediatamente em turnos consecutivos',()=>{
  const state=createConversation({mode:'session',depth:'light'});
  openingQuestion(state);
  nextQuestion(state,'É uma coisa da minha família.');
  nextQuestion(state,'Eu travo quando tento falar.');
  const checkpoint=nextQuestion(state,'Ainda é difícil.');
  const next=nextQuestion(state,'Também fico inseguro quando penso nisso.');
  assert.match(checkpoint,/próximo passo|síntese|rascunho/i);
  assert.doesNotMatch(next,/já temos material suficiente|já apareceu material suficiente/i);
});

test('assustar-se é reconhecido como emoção declarada sem criar diagnóstico',()=>{
  const state=createConversation({mode:'feeling',depth:'medium'});
  const response=nextQuestion(state,'Às vezes isso me assusta.');
  assert.match(response,/emoção|palavra|acontecendo/i);
  assert.deepEqual(buildStructuredSummary(state).emotions,['Às vezes isso me assusta.']);
  assert.doesNotMatch(response,/transtorno|diagnóstico|psicose|mania/i);
});

test('pergunta contextual acompanha relato perceptivo sem atribuir diagnóstico',()=>{
  const state=createConversation({mode:'feeling',depth:'medium'});
  const response=nextQuestion(state,'Sinto como se o mundo ao meu redor estivesse mais claro e mais colorido e isso às vezes me assusta.');
  assert.match(response,/ambiente|percebe|experiência/i);
  assert.match(response,/assusta|psicólogo/i);
  assert.doesNotMatch(response,/psicose|mania|dissociação|diagnóstico/i);
  assert.equal(state.entries[0].source,'declared');
});


test('variações de me ajude a dizer isso acionam síntese e nunca viram conteúdo do relato',()=>{
  for(const phrase of ['me ajude a dizer isso','Me ajuda a dizer isso', 'me ajude a dizer isso?']){
    const state=createConversation({mode:'feeling',depth:'light'});
    nextQuestion(state,'Sinto que o mundo está mais colorido.');
    const before=state.entries.length;
    assert.equal(detectConversationControlIntent(phrase),'summary');
    const response=nextQuestion(state,phrase);
    assert.equal(state.entries.length,before);
    assert.match(response,/síntese editável/i);
    assert.doesNotMatch(buildSummary(state),/me ajud[ae] a dizer isso/i);
  }
});

test('em tudo isso responde à pergunta sobre áreas sem repetir a pergunta ou inventar fato',()=>{
  const state=createConversation({mode:'feeling',depth:'light'});
  openingQuestion(state);
  const response=nextQuestion(state,'em tudo isso');
  assert.match(response,/mais de uma dessas áreas/i);
  assert.doesNotMatch(response,/você percebe isso mais nos pensamentos/i);
  assert.deepEqual(buildStructuredSummary(state),{
    facts:[],emotions:[],difficulties:[],sessionPoints:[]
  });
});

test('mundo colorido e sensação de felicidade recebe continuação específica sem inferência clínica',()=>{
  const state=createConversation({mode:'feeling',depth:'light'});
  const response=nextQuestion(state,'sinto o mundo mais colorido ao passo que sinto uma falsa sensação de felicidade');
  assert.match(response,/colorido|felicidade/i);
  assert.doesNotMatch(response,/diagnóstico|hipomania|mania|psicose|certeza/i);
});

test('checkpoints não voltam depois de outras mensagens, mesmo após limite de profundidade',()=>{
  const state=createConversation({mode:'feeling',depth:'light'});
  openingQuestion(state);
  nextQuestion(state,'Ontem percebi uma mudança.');
  nextQuestion(state,'Eu fiquei sem entender a experiência.');
  nextQuestion(state,'Foi difícil falar sobre isso.');
  const countAfterThree=state.ruleHistory.filter(x=>x.ruleId==='AUTONOMY-CHECKPOINT-01').length;
  for(const answer of ['Também penso nisso.','Fico com vergonha de dizer.', 'Isso me fez lembrar do dia anterior.','Ainda penso sobre isso.']){
    nextQuestion(state,answer);
  }
  const countAfterSeven=state.ruleHistory.filter(x=>x.ruleId==='AUTONOMY-CHECKPOINT-01').length;
  assert.equal(countAfterThree,1);
  assert.equal(countAfterSeven,1);
});
