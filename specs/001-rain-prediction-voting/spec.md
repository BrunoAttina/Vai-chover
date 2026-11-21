# Feature Specification: Vai chover? — Palpites coletivos de chuva

**Feature Branch**: `001-rain-prediction-voting`

**Created**: 2026-11-20

**Status**: Draft

**Input**: User description: "Aplicativo 'Vai chover?' em que o usuário cria uma conta simples
(nome de exibição + e-mail, sem senha), o app captura sua localização e horário local, o usuário
responde perguntas sobre chuva conforme o período do dia (manhã: 3, tarde: 2, noite: 1) usando
uma escala de 0 a 5, vê a contagem de votos por opção e um comparativo com a previsão do tempo
real, e o sistema analisa ao fim de cada período se a previsão estava de acordo com a média das
pessoas da região."

## Clarifications

### Session 2026-11-20

- Q: O que a análise de fim de período compara? → A: O palpite de cada usuário × a média da
  região (mostrado ao usuário) e, adicionalmente, a média da região × a chuva que realmente
  ocorreu, mostrando se a maioria das pessoas acertou.
- Q: Como tratar acessos entre 00:00 e 05:59? → A: Criar um quarto período chamado "Madrugada".
- Q: O que define "região"? → A: Município/cidade.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Criar conta e entrar sem senha (Priority: P1)

Uma pessoa abre o "Vai chover?" pela primeira vez, informa o nome de exibição que deseja e seu
e-mail. Ela recebe no e-mail um link (ou código) de acesso e, ao usá-lo, entra no app já
autenticada. Nas próximas visitas, basta informar o e-mail para receber um novo link/código.

**Why this priority**: sem identificação não é possível garantir um voto por pessoa por período
nem associar palpites a uma região; é a porta de entrada de todo o resto.

**Independent Test**: criar uma conta com nome e e-mail, acessar pelo link/código recebido e
verificar que o app reconhece a pessoa pelo nome de exibição; sair e entrar novamente apenas com
o e-mail.

**Acceptance Scenarios**:

1. **Given** uma pessoa sem conta, **When** ela informa nome de exibição e e-mail válidos,
   **Then** a conta é criada e um link/código de acesso é enviado para o e-mail informado.
2. **Given** um link/código de acesso válido e não expirado, **When** a pessoa o utiliza,
   **Then** ela entra no app autenticada, sem nunca informar senha.
3. **Given** um link/código expirado ou já utilizado, **When** a pessoa tenta utilizá-lo,
   **Then** o acesso é negado e ela pode solicitar um novo envio.
4. **Given** um e-mail já cadastrado, **When** alguém tenta criar nova conta com ele,
   **Then** o sistema não cria conta duplicada e envia um link/código de acesso para a conta
   existente.
5. **Given** um e-mail em formato inválido ou nome de exibição vazio, **When** a pessoa envia o
   formulário, **Then** o sistema exibe mensagem clara indicando o campo a corrigir.

---

### User Story 2 - Dar palpites de chuva conforme o período do dia (Priority: P1)

Já autenticada, a pessoa abre o app. O app identifica sua localização e o horário local dessa
localização, determina o período do dia e exibe as perguntas correspondentes. Ela responde cada
pergunta deslizando um seletor de 0 a 5:

| Valor | Significado         |
|-------|---------------------|
| 0     | Não vai chover      |
| 1     | Garoa               |
| 2     | Chuva fraca         |
| 3     | Chuva normal/média  |
| 4     | Chuva intensa       |
| 5     | Pé-d'água           |

Perguntas por período:

- **Madrugada**: "Você acha que vai chover agora de madrugada?", "Você acha que vai chover pela
  manhã?", "Você acha que vai chover à tarde?", "Você acha que vai chover à noite?"
- **Manhã**: "Você acha que vai chover agora pela manhã?", "Você acha que vai chover à tarde?",
  "Você acha que vai chover à noite?"
- **Tarde**: "Você acha que vai chover agora pela tarde?", "Você acha que vai chover à noite?"
- **Noite**: "Você acha que vai chover agora à noite?"

**Why this priority**: os palpites são o dado central do produto; sem eles não há resultado
coletivo nem comparação.

**Independent Test**: com a localização e o horário simulados para cada período, verificar que
aparecem exatamente as perguntas esperadas, que cada uma aceita apenas valores inteiros de 0 a 5
com o rótulo correspondente visível, e que os palpites ficam registrados.

**Acceptance Scenarios**:

1. **Given** uma pessoa autenticada cujo horário local está no período da madrugada, **When**
   ela abre o app, **Then** são exibidas as quatro perguntas da madrugada, nesta ordem.
2. **Given** uma pessoa autenticada cujo horário local está no período da manhã, **When** ela
   abre o app, **Then** são exibidas as três perguntas da manhã, nesta ordem.
3. **Given** horário local no período da tarde, **When** ela abre o app, **Then** são exibidas
   apenas as duas perguntas da tarde.
4. **Given** horário local no período da noite, **When** ela abre o app, **Then** é exibida
   apenas a pergunta da noite.
5. **Given** as perguntas exibidas, **When** a pessoa move o seletor, **Then** o rótulo
   correspondente ao valor (ex.: "3 - Chuva normal/média") é exibido.
6. **Given** todas as perguntas respondidas, **When** a pessoa confirma, **Then** os palpites
   são registrados associados à pessoa, à sua região, à data e ao período a que cada pergunta se
   refere, e ela é levada à tela de resultados.
7. **Given** que a pessoa já registrou palpite para um período de uma data, **When** ela abre o
   app novamente no mesmo período, **Then** ela não pode votar de novo naquele período e é levada
   diretamente à tela de resultados.
8. **Given** que a pessoa negou acesso à localização, **When** ela abre o app, **Then** o app
   explica por que a localização é necessária e permite que ela informe sua cidade manualmente.

---

### User Story 3 - Ver resultado coletivo e comparar com a previsão real (Priority: P2)

Após registrar seus palpites, a pessoa vê, para cada pergunta relacionada aos períodos que ela
respondeu, a quantidade de votos recebida por cada uma das seis opções (0 a 5) entre as pessoas
da sua região. Logo abaixo, vê a previsão do tempo oficial para os mesmos períodos, indicando se
vai chover ou não e a probabilidade de chuva em porcentagem.

**Why this priority**: é a recompensa imediata de participar; depende dos palpites (P1) para
existir.

**Independent Test**: com um conjunto conhecido de votos de uma região e uma previsão simulada,
verificar que as contagens por opção e o comparativo exibidos batem exatamente com os dados.

**Acceptance Scenarios**:

1. **Given** que a pessoa votou no período da madrugada, **When** a tela de resultados é
   exibida, **Then** aparecem as quatro perguntas (madrugada, manhã, tarde, noite) com suas
   contagens.
2. **Given** que a pessoa votou no período da manhã, **When** a tela de resultados é exibida,
   **Then** aparecem as três perguntas (manhã, tarde, noite), cada uma com a quantidade de votos
   em cada opção de 0 a 5, incluindo opções com zero votos.
3. **Given** que a pessoa votou no período da tarde, **When** a tela de resultados é exibida,
   **Then** aparecem as perguntas da tarde e da noite com suas contagens.
4. **Given** a previsão do tempo disponível para a região, **When** a tela de resultados é
   exibida, **Then** abaixo das contagens aparece, para cada período mostrado, "Vai chover" ou
   "Não vai chover" e a probabilidade de chuva em porcentagem.
5. **Given** que a previsão do tempo está indisponível no momento, **When** a tela de resultados
   é exibida, **Then** as contagens de votos continuam visíveis e o comparativo informa que a
   previsão está temporariamente indisponível.
6. **Given** que novos votos são registrados na região, **When** a pessoa atualiza a tela,
   **Then** as contagens refletem os novos votos.

---

### User Story 4 - Análise ao fim de cada período (Priority: P3)

Ao término de cada período (madrugada, manhã, tarde e noite), o sistema fecha o período em cada
região (município) e faz duas comparações:

1. **Você × sua região**: para cada pessoa que deu palpite para aquele período, compara o valor
   que ela escolheu com a média dos palpites da região e informa se ela pensou como a maioria.
2. **Sua região × a realidade**: compara a média dos palpites da região com a chuva que realmente
   ocorreu no período e informa se a maioria das pessoas acertou.

Os dois resultados ficam visíveis para a pessoa na próxima vez que ela abrir o app (seção
"Como foi o último período").

**Why this priority**: dá motivo para a pessoa voltar e acompanhar seus acertos, mas o app já
entrega valor sem ela.

**Independent Test**: com votos conhecidos para uma região, um período encerrado e a chuva
observada simulada, disparar o fechamento do período e verificar que os dois resultados
registrados e exibidos estão corretos.

**Acceptance Scenarios**:

1. **Given** um período encerrado em que a pessoa votou 3 e a média da região arredondada é 3,
   **When** a análise é executada, **Then** a pessoa vê que seu palpite coincidiu com a média
   da região.
2. **Given** um período encerrado em que a pessoa votou 0 e a média da região arredondada é 4,
   **When** a análise é executada, **Then** a pessoa vê que seu palpite foi diferente da média
   da região, com os dois valores e seus rótulos.
3. **Given** um período encerrado em que a média da região indica chuva e choveu de fato,
   **When** a análise é executada, **Then** é registrado e exibido que a maioria acertou.
4. **Given** um período encerrado em que a média da região indica chuva e não choveu, **When** a
   análise é executada, **Then** é registrado e exibido que a maioria errou.
5. **Given** um período encerrado em uma região sem nenhum palpite, **When** a análise é
   executada, **Then** é registrado que não houve dados suficientes, sem indicar acerto.
6. **Given** que o dado de chuva observada ainda não está disponível no fim do período, **When**
   a análise é executada, **Then** a comparação com a realidade fica pendente e é concluída assim
   que o dado estiver disponível; a comparação "você × região" é exibida normalmente.
7. **Given** que a análise de um período já foi registrada, **When** ela é executada novamente,
   **Then** nenhum resultado duplicado é criado.

---

### Edge Cases

- **Virada do dia**: a madrugada (00:00–05:59) pertence ao novo dia; votos feitos às 23:59 são
  da noite do dia anterior e votos feitos às 00:00 são da madrugada do novo dia.
- **Virada de período durante o uso**: se a pessoa abriu as perguntas na manhã e confirma depois
  do início da tarde, o palpite sobre "manhã" não é aceito (o período já passou); os demais são
  aceitos e ela é informada.
- **Mudança de localização**: a região considerada é a do momento do voto; votar em outra região
  no mesmo período não é permitido (um voto por pessoa por período por data).
- **Fuso horário**: o período é sempre definido pelo horário local da localização da pessoa, não
  pelo horário do dispositivo nem do servidor.
- **Localização imprecisa ou indisponível** e entrada manual de cidade inexistente: o app pede que
  a pessoa escolha uma cidade válida de uma lista.
- **Região com poucos votos**: as contagens são exibidas mesmo com um único voto.
- **Envio repetido do link/código de acesso**: solicitações excessivas para o mesmo e-mail são
  limitadas para evitar abuso.

## Requirements *(mandatory)*

### Functional Requirements

**Conta e autenticação**

- **FR-001**: O sistema MUST permitir criar conta informando apenas nome de exibição e e-mail.
- **FR-002**: O sistema MUST validar o formato do e-mail e exigir nome de exibição de 2 a 30
  caracteres.
- **FR-003**: O sistema MUST autenticar a pessoa exclusivamente por um link ou código de uso único
  enviado ao e-mail cadastrado; nenhuma senha é solicitada em momento algum.
- **FR-004**: Links/códigos de acesso MUST expirar em 15 minutos e ser invalidados após o
  primeiro uso.
- **FR-005**: O sistema MUST impedir contas duplicadas para o mesmo e-mail (comparação sem
  diferenciar maiúsculas/minúsculas).
- **FR-006**: O sistema MUST limitar a 5 solicitações de link/código por e-mail por hora.
- **FR-007**: A sessão autenticada MUST permanecer válida por 60 dias a partir do login ou até a pessoa sair; o login fica gravado no aparelho durante esse período.

**Localização e período**

- **FR-008**: O app MUST solicitar permissão de localização e, se negada ou indisponível,
  permitir a escolha manual da cidade.
- **FR-009**: O sistema MUST determinar a região da pessoa a partir da localização, sendo a
  região o município (cidade) onde ela está.
- **FR-010**: O sistema MUST determinar o horário local da localização da pessoa e classificar o
  período: madrugada 00:00–05:59, manhã 06:00–11:59, tarde 12:00–17:59, noite 18:00–23:59.

**Palpites**

- **FR-011**: O app MUST exibir exatamente as perguntas definidas para o período atual
  (madrugada: 4; manhã: 3; tarde: 2; noite: 1), com os textos especificados na User Story 2.
- **FR-012**: Cada pergunta MUST ser respondida por um seletor deslizante com valores inteiros de
  0 a 5, exibindo o rótulo da opção selecionada.
- **FR-013**: O sistema MUST aceitar apenas um palpite por pessoa, por período-alvo, por data.
  Palpites registrados não podem ser alterados.
- **FR-014**: O sistema MUST rejeitar palpites para um período que já terminou no horário local
  da pessoa.
- **FR-015**: Cada palpite MUST ser registrado com: pessoa, região, data local, período-alvo,
  valor (0–5) e momento do registro.

**Resultados e comparativo**

- **FR-016**: Após registrar os palpites, o app MUST exibir, para cada período-alvo que a pessoa
  respondeu, a quantidade de votos em cada uma das seis opções entre as pessoas da mesma região,
  na mesma data.
- **FR-017**: Abaixo das contagens, o app MUST exibir, para os mesmos períodos, a previsão do
  tempo da região: indicação "Vai chover"/"Não vai chover" e probabilidade de chuva em %.
- **FR-018**: A previsão MUST ser considerada "Vai chover" quando a probabilidade de chuva do
  período for igual ou superior a 50%.
- **FR-019**: Se a previsão estiver indisponível, o app MUST exibir as contagens normalmente e
  informar a indisponibilidade da previsão.

**Análise de fim de período**

- **FR-020**: Ao término de cada período, o sistema MUST, para cada região com palpites,
  calcular a média dos palpites da região e registrar: região, data, período, média, número de
  votos e chuva observada no período.
- **FR-021**: A média dos palpites MUST ser arredondada para o inteiro mais próximo (0,5 arredonda
  para cima) e interpretada como "vai chover" quando for maior ou igual a 1 (Garoa) e como "não
  vai chover" quando for 0.
- **FR-022**: Para cada pessoa que votou no período, o sistema MUST registrar se o seu palpite
  coincidiu com a média arredondada da região e exibir esse resultado a ela, com os dois valores e
  seus rótulos.
- **FR-023**: O sistema MUST comparar a interpretação da média da região (chove / não chove) com
  a chuva observada no período e exibir às pessoas da região se a maioria acertou ou errou.
- **FR-024**: Chuva observada MUST ser considerada "choveu" quando houver precipitação registrada
  na região durante o período; se o dado não estiver disponível, a comparação fica pendente e é
  concluída quando o dado chegar, em até 24 horas, ou é marcada como "sem dados".
- **FR-025**: Os resultados do período encerrado mais recente em que a pessoa votou MUST ser
  exibidos na próxima vez que ela abrir o app.
- **FR-026**: A análise de um mesmo período, data e região MUST ser registrada uma única vez.

**Privacidade**

- **FR-027**: O sistema MUST exibir apenas dados agregados de outras pessoas (contagens); nomes,
  e-mails e localizações individuais MUST NOT ser expostos a outros usuários.
- **FR-028**: O sistema MUST armazenar apenas a região derivada da localização, não as
  coordenadas exatas, e permitir que a pessoa exclua sua conta e seus dados (LGPD).

### Key Entities

- **Usuário**: pessoa cadastrada; nome de exibição, e-mail (único), data de criação.
- **Acesso por e-mail**: link/código de uso único; usuário, validade, se já foi usado.
- **Região**: município que agrupa votos e previsão; identificação, nome, estado, fuso horário.
- **Palpite**: voto de um usuário; usuário, região, data local, período-alvo
  (madrugada/manhã/tarde/noite), valor 0–5, momento do registro.
- **Previsão do tempo**: previsão oficial para uma região, data e período; indicação de chuva e
  probabilidade (%), momento da consulta.
- **Chuva observada**: o que realmente aconteceu em uma região, data e período; se choveu ou não.
- **Análise de período**: resultado do fechamento de um período em uma região; data, período,
  média dos palpites, número de votos, chuva observada, resultado "maioria acertou / errou /
  pendente / sem dados".
- **Resultado individual**: para cada palpite de um período encerrado, se coincidiu com a média
  da região.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Uma pessoa nova consegue criar a conta e entrar no app em menos de 2 minutos
  (excluindo o tempo de chegada do e-mail).
- **SC-002**: O e-mail de acesso chega à caixa de entrada em até 1 minuto em 95% dos envios.
- **SC-003**: Uma pessoa autenticada consegue responder todas as perguntas do período e ver os
  resultados em menos de 30 segundos.
- **SC-004**: 100% dos acessos exibem o conjunto correto de perguntas para o período local
  (verificado por testes com horários de fronteira: 23:59, 00:00, 05:59, 06:00, 11:59, 12:00,
  17:59, 18:00).
- **SC-005**: A tela de resultados é exibida em até 3 segundos após a confirmação dos palpites em
  95% dos casos.
- **SC-006**: As contagens exibidas correspondem exatamente aos votos registrados para a região e
  data (zero divergências em testes de conferência).
- **SC-007**: A análise de cada período é registrada em até 15 minutos após o término do período,
  para 100% das regiões com palpites.
- **SC-008**: Pelo menos 80% das pessoas que iniciam a votação a concluem.
- **SC-009**: Em 95% dos períodos encerrados, o resultado "a maioria acertou/errou" é exibido em
  até 2 horas após o fim do período.

## Assumptions

- O app é usado em dispositivos com acesso à internet; o uso offline está fora do escopo da v1.
- Os períodos seguem as faixas: madrugada 00:00–05:59, manhã 06:00–11:59, tarde 12:00–17:59,
  noite 18:00–23:59, no horário local da localização da pessoa; a madrugada pertence ao novo dia.
- Na madrugada são feitas quatro perguntas (madrugada, manhã, tarde, noite), seguindo o padrão
  "período atual + períodos restantes do dia".
- A região é o município; capitais e grandes cidades formam uma única região na v1.
- A chuva observada vem de uma fonte externa de dados meteorológicos observados (não apenas da
  previsão); a fonte será escolhida no plano.
- A tela de resultados mostra os períodos-alvo das perguntas que a pessoa respondeu (ex.: quem
  votou à tarde vê tarde e noite).
- As contagens consideram apenas votos da mesma região e da mesma data local.
- A previsão "real" do tempo vem de um provedor externo de dados meteorológicos que informa
  probabilidade de chuva por período; a escolha do provedor será feita no plano.
- O limite de 50% de probabilidade para "Vai chover" é um padrão adotado e pode ser ajustado.
- Palpites não podem ser editados após confirmados, para preservar a integridade das contagens.
- Interface em português do Brasil; público inicial no Brasil.
- Rankings, notificações push e histórico pessoal de acertos (além do último período) estão fora
  do escopo da v1.
