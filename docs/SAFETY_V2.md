# Safety Interrupt v2

## Escopo

Este mecanismo é uma barreira de UX local para um conjunto pequeno de **declarações literais de perigo imediato**. Ele não é triagem, avaliação clínica, predição, score ou diagnóstico de risco.

## O que o runtime faz

- reconhece algumas formulações explícitas em primeira pessoa no presente/futuro próximo;
- interrompe o fluxo comum;
- mostra ajuda humana e recursos regionais;
- não envia a frase para servidor algum.

## O que ele deliberadamente não faz

- inferir risco a partir de tristeza, desesperança ou sofrimento vago;
- classificar “baixo/médio/alto risco”;
- aplicar ASQ, C-SSRS ou outro instrumento clínico;
- interpretar metáforas, citações ou fala de terceiros como intenção do usuário;
- concluir que ausência do gatilho significa segurança.

## Corpus de revisão

`tests/safety/danger-language-corpus.json` contém casos técnicos de regressão: intenção explícita, negação, citação, terceira pessoa, passado, metáfora, hipótese e sofrimento vago.

**O corpus ainda não foi validado por psicólogos.** Ele é material preparado para revisão profissional. Qualquer ampliação de gatilhos deve passar pelo protocolo de revisão antes de release.

## Fontes e limites

A base científica e profissional está documentada em `docs/EVIDENCE_BASE.md` e `docs/CONVERSATION_POLICY_V2.md`. A literatura sustenta cautela com chatbots em crises; não demonstra que este detector seja clinicamente sensível ou específico.
