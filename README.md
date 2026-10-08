# Ombro-amigo / Ponte

PWA experimental de apoio à comunicação em psicoterapia.

## Princípio do produto

A ferramenta **não é terapeuta**, não diagnostica e não interpreta clinicamente. Ela ajuda a pessoa a:

1. começar a falar quando está difícil;
2. organizar fatos, emoções declaradas, pensamentos e dúvidas;
3. transformar o relato em uma síntese em primeira pessoa;
4. revisar e editar essa síntese;
5. compartilhar somente o que autorizar explicitamente.

O psicólogo recebe apenas conteúdo autorizado pelo paciente.

## Estado atual

Primeira fundação técnica do MVP:

- PWA instalável;
- funcionamento local-first;
- armazenamento local no dispositivo;
- motor de conversa separado da interface;
- regras de segurança separadas;
- síntese revisável;
- base de cenários de teste;
- sem backend e sem envio automático de dados.

## Rodar localmente

Requer Node.js 20+.

```bash
npm install
npm run dev
```

Depois abra:

```
http://localhost:4173
```

## Testes

```bash
npm test
```

## Estrutura

```
app/                 interface e orquestração
conversation/        motor de conversa
safety/              limites e respostas de segurança
storage/             persistência local
tests/scenarios/     cenários comportamentais
docs/                especificação do produto
index.html            shell da PWA
manifest.webmanifest  manifesto instalável
service-worker.js     cache offline mínimo
```

## Privacidade no MVP

Todo o conteúdo fica no navegador do próprio dispositivo usando armazenamento local. Não existe servidor, conta, sincronização ou painel do psicólogo nesta primeira versão.

Isso **não deve ser confundido com armazenamento criptografado de produção**. A criptografia local e o compartilhamento autorizado com o profissional entram em uma etapa posterior.

## Aviso

Este projeto é um protótipo para discussão e validação com profissionais de Psicologia. Não é ferramenta clínica validada e não substitui psicoterapia, avaliação profissional, serviços de emergência ou atendimento em crise.
