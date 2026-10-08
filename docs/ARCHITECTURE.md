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
Ficará responsável por interrupções e limites do produto. Não deve diagnosticar; deve apenas interromper o fluxo comum quando a situação exigir ajuda humana.

### storage/
Persistência local. O MVP usa localStorage apenas para prototipação. Produção deverá usar armazenamento local criptografado.

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

Um backend só entra depois da validação profissional, para transmitir exclusivamente sínteses autorizadas.
