# Roteiro de teste do MVP

## Objetivo

Validar experiência, autonomia, privacidade local e comportamento do motor antes de qualquer uso como produto de saúde.

## Preparação

1. Rode `npm run check`.
2. Inicie com `npm run dev`.
3. Abra `http://localhost:4173` em um navegador compatível.
4. Para testar como PWA instalada, use HTTPS ou localhost.

## Fluxos mínimos

- primeira abertura mostra o aviso inicial;
- conversa pode ser iniciada pelos diferentes modos;
- “Prefiro não responder” não cria conteúdo clínico;
- “Me ajuda a dizer isso” produz síntese editável;
- síntese só libera cópia após confirmação;
- recarregar preserva conversa local;
- apagar conversa remove o estado local;
- “Apagar todos os dados locais” volta ao aviso inicial;
- botão de ajuda urgente continua acessível;
- após primeira carga, os arquivos essenciais permanecem disponíveis offline.

## Privacidade

Durante os testes, DevTools > Network não deve mostrar requisições contendo texto digitado pelo usuário. O runtime do app não contém primitivas de envio de rede e a CSP usa `connect-src 'none'`.

A suíte de navegador real valida em Chromium:

- migração real de `localStorage` para IndexedDB;
- persistência e structured clone de uma `CryptoKey` não extraível;
- ausência de relato em texto claro no registro cifrado;
- restauração após reload;
- recuperação da versão cifrada anterior após adulteração do registro atual;
- remoção do registro atual, backup e chave;
- reload offline da PWA depois da primeira carga;
- gerenciamento de foco nas mudanças de vista;
- foco após adicionar/remover pontos da síntese;
- alvos interativos visíveis com altura mínima de 44 px;
- varredura Axe nas vistas principais com regras WCAG A/AA.

Além disso, um teste reduzido de compatibilidade do armazenamento cifrado roda nos engines Chromium, Firefox e WebKit para verificar migração, persistência da `CryptoKey` não extraível e restauração após reload.

O job de navegador instala versões fixadas do Playwright/Axe somente no ambiente efêmero de CI; o aplicativo publicado continua sem dependência de runtime externa.

Playwright WebKit oferece cobertura útil do engine, mas **não equivale a teste em Safari/iOS real**. Antes de um piloto em dispositivos pessoais, fazer pelo menos uma rodada manual em Safari/iOS e em leitor de tela disponível à equipe.

## Limite do teste

Passar neste roteiro não significa validação clínica nem certificação WCAG. Também não prova segurança contra código malicioso na mesma origem, navegador ou sistema operacional comprometido. Axe e Playwright não substituem teste manual com tecnologia assistiva. O comportamento conversacional ainda precisa ser avaliado por profissionais de Psicologia e por testes de usabilidade com consentimento adequado.
