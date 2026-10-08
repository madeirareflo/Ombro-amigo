// Exemplos inteiramente fictícios para pesquisa de intenção na PWA.
// A origem é exclusivamente o código-fonte. NÃO são relatos de usuários,
// dados de terapia nem material revisado por profissionais.
// A base inicial é um protótipo; expansão e revisão cega são obrigatórias.
export const SYNTHETIC_INTENT_EXAMPLES = Object.freeze({
  clarify: [
    'como assim', 'o que você quer dizer', 'não entendi', 'explica melhor',
    'pode explicar de novo', 'pode reformular a pergunta', 'não saquei',
    'o que significa essa pergunta', 'consegue dizer de outro jeito',
    'poderia ser mais claro', 'não ficou claro', 'me explica isso',
    'qual é a pergunta', 'não sei o que você perguntou',
    'pode dar um exemplo dessa pergunta', 'explica com outras palavras',
    'o que você quis dizer', 'não compreendi a pergunta', 'que quer dizer com isso',
    'fiquei confuso com o que perguntou', 'repete de um jeito mais fácil',
    'não entendi a última mensagem', 'fala mais simples', 'dá para esclarecer',
    'não consegui entender sua pergunta'
  ],
  summary: [
    'me ajuda a dizer isso', 'quero montar uma síntese', 'faz um resumo',
    'me ajuda a organizar o que falei', 'como posso contar isso na sessão',
    'quero preparar o que vou dizer', 'pode resumir o que eu contei',
    'vamos organizar meu relato', 'preciso de um rascunho',
    'monta uma síntese para mim', 'transforma isso num texto',
    'me ajuda a explicar para o psicólogo', 'quero levar isso para a sessão',
    'pode fazer um roteiro do que eu disse', 'me ajuda a pôr isso em palavras',
    'pode organizar as minhas falas', 'vamos preparar a síntese',
    'quero revisar meu resumo', 'dá para juntar o que eu escrevi',
    'pode criar um rascunho editável', 'vamos para o resumo',
    'prefiro sair daqui com o texto', 'quero escrever isso para a consulta',
    'organiza minhas anotações', 'preciso colocar o que falei em ordem'
  ],
  continue: [
    'quero continuar', 'pode continuar', 'vamos seguir', 'quero explorar mais',
    'quero falar mais sobre isso', 'ainda quero conversar', 'vamos em frente',
    'podemos seguir com a conversa', 'quero continuar explorando',
    'pode fazer outra pergunta', 'pode perguntar mais uma coisa',
    'vamos conversar um pouco mais', 'quero ir um pouco além',
    'não quero encerrar agora', 'quero seguir falando', 'vamos continuar',
    'ainda tenho coisas para escrever', 'gostaria de acrescentar mais',
    'pode prosseguir', 'vamos seguir para o próximo ponto',
    'ainda não terminei de contar', 'mais um pouco', 'quero continuar nesse assunto',
    'a gente pode continuar', 'estou pronto para seguir'
  ],
  uncertainty: [
    'não sei', 'sei lá', 'não faço ideia', 'não tenho certeza',
    'não sei responder', 'é difícil dizer', 'não consegui pensar nisso',
    'não encontro palavras', 'ainda não sei', 'não saberia explicar',
    'não tenho uma resposta', 'não consigo colocar em palavras',
    'estou sem resposta', 'tenho dúvida', 'não sei como dizer',
    'não me vem nada', 'não tenho clareza', 'não sei direito',
    'não faço a menor ideia', 'acho difícil responder',
    'não sei o que sinto', 'não consigo explicar isso', 'estou indeciso',
    'não consigo escolher', 'não sei por onde começar'
  ],
  scope_all: [
    'em tudo isso', 'em todas essas áreas', 'um pouco em tudo',
    'em cada uma dessas partes', 'nas quatro coisas', 'em todas elas',
    'isso tudo', 'em todas as opções', 'em todos esses lugares',
    'em todos os aspectos', 'tudo que você falou',
    'em todas essas partes da vida', 'em todas as alternativas',
    'em todos esses pontos', 'todas as coisas que você citou',
    'nas opções todas', 'tudo ao mesmo tempo', 'em praticamente tudo',
    'de um jeito ou outro em tudo', 'em várias dessas áreas'
  ],
  stop: [
    'quero parar', 'não quero continuar', 'chega por hoje', 'quero encerrar',
    'não quero mais falar', 'prefiro parar por aqui', 'vamos parar',
    'por hoje é só', 'pode encerrar', 'quero sair da conversa',
    'já deu por hoje', 'não desejo prosseguir', 'prefiro terminar agora',
    'não estou confortável em continuar', 'vamos encerrar por aqui',
    'quero interromper essa conversa', 'não quero aprofundar',
    'quero descansar e terminar', 'encerrar por favor',
    'não pergunte mais nada', 'não quero seguir', 'não continue perguntando'
  ],
  skip: [
    'prefiro não responder', 'pula essa pergunta', 'não vou responder essa',
    'pode pular', 'essa pergunta eu passo', 'vamos saltar essa parte',
    'não quero responder isso', 'passo essa', 'prefiro não entrar nisso',
    'podemos deixar essa pergunta de lado', 'não vou falar desse ponto',
    'quero pular essa parte', 'me faz outra pergunta', 'não quero dizer',
    'deixa essa sem resposta', 'não me pergunte isso', 'pular pergunta',
    'prefiro deixar em branco', 'não estou pronto para responder',
    'melhor não responder isso'
  ],
  other: [
    'hoje foi um dia cansativo', 'estou sentindo saudade',
    'aconteceu algo na escola', 'pensei nisso durante a tarde',
    'não quero perder essa amizade', 'minha irmã me ligou',
    'tive uma conversa com alguém', 'fiquei com medo ontem',
    'gostaria de contar algo que aconteceu', 'meu trabalho está difícil',
    'não consegui dormir', 'o céu estava colorido',
    'lembrei de um assunto antigo', 'quando cheguei em casa chorei',
    'o que aconteceu foi inesperado', 'queria que a pessoa soubesse',
    'não sei se ela vai entender o que aconteceu',
    'ela disse que quer continuar a conversa',
    'minha amiga falou para eu parar de pensar nisso',
    'ontem escutei alguém dizer quero parar',
    'tenho medo de contar uma história', 'quero mudar de cidade',
    'eu disse sim mas depois fiquei inseguro',
    'ela perguntou como assim e eu respondi',
    'preciso organizar minha mochila', 'falei com o psicólogo na terça',
    'senti um aperto no peito', 'fiz uma anotação para mim',
    'não consegui prestar atenção na aula',
    'gostaria de conversar sobre meu dia'
  ]
});
