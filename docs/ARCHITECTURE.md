# Arquitetura inicial

## Objetivo

Separar desde o começo quatro responsabilidades: interface, motor de conversa, segurança e persistência.

## Camadas

### app/
Apresentação e orquestração da experiência.

### conversation/
Decide a próxima pergunta, respeita o nível de abertura escolhido, registra apenas declarações do usuário e monta rascunhos de síntese.

No protótipo inicial, o motor é determinístico e baseado em regras. Primeiro validamos a interação; depois podemos substituir ou complementar esse motor por um modelo local.

### safety/
Responsável por interrupções e limites do produto. Não diagnostica; apenas interrompe o fluxo comum quando a situação exige redirecionamento para ajuda humana.

### storage/
Persistência local separada em duas classes de dado:

- `local-store.js`: somente confirmação 18+/aviso inicial e leitura temporária de formatos legados para migração;
- `secure-store.js`: conversa, histórico e síntese, usando IndexedDB + AES-GCM quando as APIs seguras do navegador estão disponíveis;
- `crypto.js`: geração de chave AES não extraível e envelope autenticado.

Se IndexedDB ou Web Crypto não estiverem disponíveis, nova informação sensível fica apenas em memória. O aplicativo não volta a persistir conversa em `localStorage`.

A chave cifradora fica no mesmo perfil do navegador. Isso melhora a proteção em repouso contra exposição casual do armazenamento, mas não isola os dados do próprio código executado na mesma origem. O modelo completo e as alternativas de chave estão em [THREAT_MODEL.md](THREAT_MODEL.md).

## Migração e recuperação

A conversa legada permanece intacta até que uma gravação cifrada seja confirmada. Cada nova gravação preserva a versão cifrada anterior como recuperação de corrupção isolada do registro atual. Exclusão remove registro atual, backup e chave.

## Evolução para modelo local

```
UI
 ↓
Conversation Orchestrator
 ↓
Safety Gate
 ↓
Local Language Model
 ↓
Structured Conversation State
 ↓
Local Encrypted Storage
```

Um backend só entra depois da validação profissional, para transmitir exclusivamente conteúdo autorizado, e exigirá nova análise de privacidade e ameaça antes de qualquer implementação.
