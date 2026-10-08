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
- armazenamento local cifrado quando IndexedDB/Web Crypto estão disponíveis, com fallback somente em memória;
- motor de conversa separado da interface;
- regras de segurança separadas;
- síntese revisável;
- base de cenários de teste;
- sem backend e sem envio automático de dados.

## Teste público

A versão pública de testes está disponível em:

https://madeirareflo.github.io/Ombro-amigo/

Os dados da conversa continuam armazenados somente no navegador do usuário; a publicação no GitHub Pages serve apenas os arquivos estáticos da aplicação.

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

## Contrato de comportamento

O motor de conversa é governado por [`docs/CONVERSATION_POLICY_V2.md`](docs/CONVERSATION_POLICY_V2.md), com IDs de regra, fontes, limitações e testes adversariais. O escopo está em [`docs/INTENDED_USE.md`](docs/INTENDED_USE.md) e a política de claims em [`docs/CLAIMS_POLICY.md`](docs/CLAIMS_POLICY.md).

## Base de evidências

As decisões de comportamento conversacional e segurança são rastreadas em [`docs/EVIDENCE_BASE.md`](docs/EVIDENCE_BASE.md), com referências oficiais e literatura revisada por pares. Essa base orienta o design, mas não constitui validação clínica do produto.

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

Todo o conteúdo da conversa fica no navegador do próprio dispositivo. Não existe servidor, conta, sincronização, analytics, pixel de rastreamento ou painel do psicólogo nesta primeira versão.

Quando IndexedDB e Web Crypto estão disponíveis, conversa e síntese são persistidas como AES-GCM com uma `CryptoKey` não extraível do perfil local. Navegadores sem essas APIs degradam para memória: o app continua funcionando, mas não cria nova persistência sensível em texto claro.

A página também declara uma Content Security Policy com `connect-src 'none'`, bloqueando conexões iniciadas pelo aplicativo via fetch/XHR/WebSocket. O GitHub Pages serve somente os arquivos estáticos do app; não há endpoint no projeto para receber o texto digitado.

Essa cifra é defesa em profundidade, não uma promessa de sigilo contra o próprio navegador/origem: a chave fica no mesmo perfil e pode ser usada por código autorizado nessa origem. O modelo de ameaça, estratégia de chave, migração e limites estão em [`docs/THREAT_MODEL.md`](docs/THREAT_MODEL.md).

## Aviso

Este projeto é um protótipo para discussão e validação com profissionais de Psicologia. Não é ferramenta clínica validada e não substitui psicoterapia, avaliação profissional, serviços de emergência ou atendimento em crise.
