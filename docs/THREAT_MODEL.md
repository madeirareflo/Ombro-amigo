# Modelo de ameaças do armazenamento local

## Objetivo

Reduzir a exposição acidental de relatos pessoais armazenados no aparelho sem criar uma promessa falsa de “segurança absoluta”.

A decisão desta fase é usar criptografia local como **defesa em profundidade**, não como fronteira de confiança contra o próprio aplicativo ou contra alguém que já controle o navegador/dispositivo.

## Arquitetura escolhida

- conteúdo de conversa e síntese: IndexedDB;
- cifra: AES-GCM via Web Crypto, com IV aleatório de 96 bits por gravação;
- chave: `CryptoKey` AES-256 não extraível, guardada em um object store separado no mesmo IndexedDB;
- registro anterior: uma cópia cifrada de backup é mantida para recuperar corrupção isolada do registro corrente;
- confirmação 18+/aviso inicial: localStorage, pois não contém o relato pessoal;
- formato antigo em localStorage: migrado e removido somente após uma gravação cifrada bem-sucedida;
- navegador sem IndexedDB/Web Crypto: conversa funciona apenas em memória; nenhuma nova conversa sensível é persistida em texto claro.

## Modelo de ameaça

### Ajuda a reduzir

- exposição casual por inspeção direta de valores de `localStorage`;
- leitura de uma cópia isolada do ciphertext sem a chave correspondente;
- permanência desnecessária do formato legado em texto claro após migração;
- escrita acidental futura de rascunhos ou transcrições nas chaves antigas;
- perda por corrupção isolada do registro atual, quando a cópia cifrada anterior ainda estiver íntegra.

### Não protege

- JavaScript malicioso executado na mesma origem;
- deploy futuro comprometido ou malicioso;
- XSS capaz de usar a chave enquanto a origem está aberta;
- navegador, extensão, sistema operacional ou dispositivo comprometido;
- pessoa com acesso ao aparelho e ao perfil do navegador desbloqueados;
- conteúdo copiado para clipboard, screenshots ou exportado pelo usuário;
- backups/sincronização feitos pelo navegador ou sistema fora do controle do app.

Por isso a interface não deve usar “ponta a ponta”, “ninguém consegue ler” ou promessas equivalentes. O runtime atual não transmite o relato e a CSP bloqueia conexões iniciadas pelo app; isso é diferente de garantir confidencialidade contra todo código futuro servido pela mesma origem.

## Estratégia de chaves e alternativas avaliadas

### Opção adotada nesta fase: chave local não extraível

A `CryptoKey` é criada pelo Web Crypto como `extractable: false` e persistida pelo próprio navegador. Isso dificulta a cópia trivial da chave como bytes e elimina texto claro do armazenamento normal, sem exigir senha nem servidor.

**Limite essencial:** a chave e o ciphertext continuam sob a mesma origem. Um script autorizado nessa origem não precisa extrair a chave para pedir ao Web Crypto que descriptografe os dados. Portanto, essa opção protege principalmente contra exposição de dados em repouso fora do fluxo normal do app, não contra comprometimento da origem.

### Opção não adotada ainda: frase secreta do usuário

Derivar uma chave de uma frase secreta e usá-la para proteger a chave de dados aumentaria a proteção contra cópia do armazenamento quando o app está fechado. Porém introduz custos relevantes:

- se a frase for esquecida, não há recuperação local sem enfraquecer o modelo;
- uma frase fraca reduz a proteção;
- o próprio app precisa receber a frase durante o desbloqueio, então XSS/origem comprometida continuam fora do escopo;
- desbloqueios frequentes afetam acessibilidade e podem incentivar escolhas de senha ruins.

Essa opção deve ser testada com usuários antes de virar padrão. Não será adicionada silenciosamente.

### Opções descartadas nesta fase

Não haverá chave enviada para backend, conta obrigatória ou “chave de recuperação” mantida pelo projeto. Isso criaria uma nova superfície de dados e contradiria o desenho offline/local atual.

## Migração

1. abrir o backend cifrado e garantir uma chave local;
2. ler a conversa legada sem alterá-la;
3. cifrar e confirmar a gravação no IndexedDB;
4. somente então remover as chaves antigas de conversa;
5. se qualquer etapa falhar, manter o legado e disponibilizá-lo apenas como fallback de leitura/memória.

Se uma cópia cifrada válida já existir e o legado tiver sobrado de uma tentativa anterior, o app confirma que consegue ler o registro cifrado antes de limpar o legado.

## Corrupção e recuperação

Cada nova gravação move o registro cifrado anterior para um slot de backup na mesma transação do IndexedDB. Se a autenticação AES-GCM do registro principal falhar, o app tenta a cópia anterior e marca o estado como recuperado de backup.

Isso **não** é backup independente: perda/corrupção da chave torna principal e backup ilegíveis. Nesta fase não existe recuperação remota da chave. O produto deve informar a limitação em vez de prometer recuperação impossível.

Se o navegador ainda contiver ciphertext, mas a chave local tiver desaparecido, o app entra em modo bloqueado: preserva os registros cifrados, não cria silenciosamente uma nova chave e não grava por cima deles. Novas alterações ficam somente em memória. A pessoa pode apagar explicitamente os dados inacessíveis para reiniciar com uma nova chave. Essa escolha evita transformar uma perda parcial de chave em sobrescrita destrutiva automática.

## Exclusão

“Apagar conversa” remove registro atual, backup e chave de dados em uma transação. A confirmação 18+ permanece separada, exceto quando a pessoa escolhe apagar todos os dados do aplicativo.

A remoção lógica do navegador não é uma garantia de sanitização forense de blocos físicos do dispositivo.

## Critérios de segurança

- nenhum novo relato deve ser salvo em localStorage;
- AES-GCM usa IV aleatório de 96 bits;
- a chave é não extraível;
- adulteração do ciphertext falha na autenticação;
- uma cópia anterior cifrada pode recuperar corrupção isolada do registro atual;
- ausência de chave diante de ciphertext existente bloqueia sobrescrita automática;
- apagar a conversa remove ciphertext atual, backup e chave;
- migração só apaga o legado depois de persistência cifrada bem-sucedida;
- falha de APIs seguras degrada para memória, nunca para nova persistência sensível em texto claro.
