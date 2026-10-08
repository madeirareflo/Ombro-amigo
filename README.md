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
npm run check
```

A suíte também verifica o contrato de privacidade local e os arquivos necessários para a PWA funcionar offline depois da primeira carga.

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

Todo o conteúdo da conversa fica no navegador do próprio dispositivo usando armazenamento local. Não existe servidor, conta, sincronização, analytics, pixel de rastreamento ou painel do psicólogo nesta primeira versão.

A página também declara uma Content Security Policy com `connect-src 'none'`, bloqueando conexões iniciadas pelo aplicativo via fetch/XHR/WebSocket. O GitHub Pages serve somente os arquivos estáticos do app; não há endpoint no projeto para receber o texto digitado.

O usuário pode apagar o estado local a qualquer momento. Isso **não deve ser confundido com armazenamento criptografado de produção**: a criptografia local é uma etapa posterior.

## Aviso

Este projeto é um protótipo para discussão e validação com profissionais de Psicologia. Não é ferramenta clínica validada e não substitui psicoterapia, avaliação profissional, serviços de emergência ou atendimento em crise.
