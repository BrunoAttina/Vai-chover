# Research: Vai chover? — Palpites coletivos de chuva

**Feature**: 001-rain-prediction-voting | **Date**: 2026-11-21

Decisões técnicas que resolvem as incógnitas do Technical Context do [plan.md](plan.md).

---

## R1. É preciso código nativo para obter a localização? Expo Go ou development build?

**Decision**: **Não é preciso código nativo.** O desenvolvimento usa **Expo (managed workflow)
com Expo Go**. A localização usa `expo-location`, que já vem incluído no Expo Go e funciona igual
no Android e no iOS (permissão em primeiro plano, posição atual e geocodificação reversa).
Os builds de distribuição (Play Store e, no futuro, App Store) são gerados com **EAS Build**, sem
pastas `android/`/`ios/` escritas à mão.

**Rationale**:
- `expo-location` cobre tudo o que a spec pede: permissão "durante o uso do app",
  `getCurrentPositionAsync` e `reverseGeocodeAsync` (cidade/estado). Localização em segundo plano
  (que exigiria config extra) não é necessária.
- Todas as demais bibliotecas escolhidas (Firebase JS SDK, slider, AsyncStorage, Expo Router)
  rodam no Expo Go — nenhuma exige módulo nativo customizado.
- O mesmo código servirá para iOS no futuro sem alterações de plataforma.

**Ponto de atenção (pré-produção)**: o **Firebase App Check** com Play Integrity / App Attest só
existe via `@react-native-firebase/app-check`, que **não roda no Expo Go**. Ele não é necessário
para desenvolver nem para os requisitos funcionais, mas é recomendado antes do lançamento público
(protege as Cloud Functions contra chamadas fora do app). Quando for adotado, o projeto passa a
usar um **development build** (`expo-dev-client`) com config plugins — ainda **sem escrever
código nativo**. Até lá, a proteção é feita por autenticação obrigatória, validação de entrada e
rate limiting no servidor. Registrado em Complexity Tracking do plano.

**Alternatives considered**:
- *React Native CLI puro / bare workflow*: mais configuração nativa sem benefício para esta
  feature.
- *`@react-native-firebase/*` desde o início*: exige development build já no dia 1; o Firebase
  JS SDK atende todos os serviços usados (Auth, Firestore, Functions).

---

## R2. Autenticação sem senha por e-mail

**Decision**: **Código de 6 dígitos enviado por e-mail (OTP)**, emitido e verificado por Cloud
Functions, que retornam um **custom token** do Firebase Auth; o app faz
`signInWithCustomToken`. O envio de e-mail usa a extensão oficial **Firebase "Trigger Email"**
(grava um documento na coleção `mail`, a extensão envia via SMTP de um provedor transacional).

**Rationale**:
- O "Email Link sign-in" nativo do Firebase depende de deep links/App Links que abram o app. Com
  o fim do Firebase Dynamic Links (agosto/2025) isso exige domínio de Hosting + App Links
  verificados para o pacote do app — o que **não funciona no Expo Go** (o app roda dentro do
  pacote do Expo Go) e piora a experiência quando o e-mail é aberto em outro dispositivo.
- O OTP funciona em qualquer dispositivo, no Expo Go e em builds de produção, e a spec aceita
  "link ou código" (FR-003).
- Controle total das regras da spec: expiração de 15 min e uso único (FR-004), 5 envios/hora
  (FR-006), sem enumeração de contas (resposta sempre genérica).
- Códigos guardados apenas como HMAC-SHA256 com segredo no Secret Manager; máximo de 5
  tentativas por código.

**Alternatives considered**:
- *Firebase Email Link + Hosting App Links*: exige development build e domínio verificado;
  quebra no Expo Go.
- *Provedores externos (Auth0, Clerk, Supabase)*: contraria a diretriz de usar o Firebase.

**Sessão de 60 dias (FR-007)**: o claim `auth_time` do ID token é verificado nas Cloud Functions
e nas Firestore Security Rules (rejeita se > 60 dias); o app também faz `signOut` local ao
detectar sessão expirada. Persistência no dispositivo via
`initializeAuth(..., { persistence: getReactNativePersistence(AsyncStorage) })`.

---

## R3. Determinar o município (região) e o fuso horário

**Decision**:
1. O app obtém as coordenadas (`expo-location`) e chama a callable `resolveRegion` enviando
   coordenadas + cidade/UF da geocodificação reversa do aparelho.
2. A função casa o nome com a **lista oficial de municípios do IBGE** (embutida no deploy,
   comparação sem acentos/maiúsculas, filtrada pela UF) e retorna o código IBGE (7 dígitos).
3. O **fuso horário** de cada município vem da própria base pública de municípios (campo
   `fuso_horario`, gerada por `functions/scripts/build-municipios.mts`) e é salvo no documento da
   região. *(Implementação: dispensou a biblioteca `tz-lookup` prevista inicialmente.)*
4. As coordenadas exatas **não são armazenadas** (FR-028); a região guarda apenas o centróide do
   município (vindo da tabela IBGE), usado para consultar o tempo.
5. Escolha manual (FR-008): o app lista municípios por UF a partir da mesma tabela.

**Rationale**: o código IBGE é um identificador estável e oficial, evita duplicatas como
"Sao Paulo"/"São Paulo" e permite agrupar votos de forma confiável. O Brasil tem 4 fusos; o
cálculo por coordenada é mais correto do que por UF (AM, PA e PE têm exceções).

**Alternatives considered**: geocodificação reversa no servidor (Google/Nominatim) — custo,
chave extra ou política de uso restritiva; usar o nome da cidade como chave — frágil.

---

## R4. Fonte de previsão e de chuva observada

**Decision**: **Open-Meteo** (`/v1/forecast`), chamado **somente pelas Cloud Functions**:
- Previsão: `hourly=precipitation_probability,precipitation` com `timezone` da região.
  Probabilidade do período = **máximo** da probabilidade horária nas horas do período.
  "Vai chover" quando ≥ 50% (FR-018).
- Chuva observada: mesmo endpoint com `past_days=1`, soma de `precipitation` das horas do período.
  **"Choveu" quando a soma ≥ 0,1 mm** (resolução mínima do dado).
- Cache da previsão no Firestore por região/data, válido por 60 minutos; timeout de 5 s por
  chamada; em falha, a UI mostra "previsão indisponível" (FR-019).

**Rationale**: gratuito, sem chave para uso não comercial, cobertura global com dados horários
de probabilidade e precipitação, inclusive horas passadas. Chamar pelo servidor centraliza cache e
rate limit e mantém o app sem dependência direta do provedor.

**Limitações registradas**: (1) a "chuva observada" do Open-Meteo vem de modelos com assimilação
de dados, não de estações — é a melhor aproximação disponível com cobertura de todos os
municípios; (2) o plano gratuito é **não comercial**; se o app for monetizado, contratar o plano
comercial (mesma API, com chave no Secret Manager).

**Alternatives considered**: INMET (estações esparsas, API instável), OpenWeatherMap / Tomorrow.io
(exigem chave e têm limites menores no plano gratuito).

---

## R5. Modelagem de votos e contagens (Firestore)

**Decision**:
- Toda escrita de voto passa pela callable `submitVotes`; o cliente **não escreve** em `votes`
  nem em `tallies` (regras negam).
- Unicidade (FR-013) pelo ID determinístico `votes/{uid}_{dataLocal}_{período}` criado dentro
  de transação (`create` falha se já existir).
- Contagens agregadas em `tallies/{regionId}_{dataLocal}_{período}` (`counts[0..5]`, `total`,
  `sum`), atualizadas na mesma transação → leitura barata e em tempo real com `onSnapshot`.
- O período atual é calculado **no servidor** com a hora do servidor + fuso da região — o
  relógio do aparelho nunca é confiado (FR-014).

**Rationale**: consistência forte por transação, leitura de resultados em O(1) documentos por
período, regras simples. Volume esperado por região/período é baixo, então contenção no
documento de contagem não é problema (< 1 escrita/s por documento).

**Alternatives considered**: contar votos com aggregation queries a cada leitura (custo cresce
com votos e não oferece tempo real); contadores distribuídos (complexidade desnecessária para o
volume).

---

## R6. Fechamento de período e análise

**Decision**: Cloud Function agendada (`onSchedule`, `every 15 minutes`, região
`southamerica-east1`) que:
1. Para cada `tally` aberto cujo período já terminou no fuso da região, calcula média,
   média arredondada (meio para cima), "maioria diz chuva" (arredondada ≥ 1) e cria
   `periodAnalyses/{regionId}_{dataLocal}_{período}` (ID determinístico → idempotente, FR-026).
2. Marca em cada voto do período `matchedRegion` e `regionRoundedMean` (FR-022), em lotes de até
   500 escritas.
3. Busca a chuva observada; se indisponível, status `pending` e nova tentativa a cada execução por
   até 24 h, depois `noData` (FR-024).

**Rationale**: 15 min atende SC-007 (análise em até 15 min) e SC-009; IDs determinísticos tornam a
reexecução segura.

**Alternatives considered**: um job por fuso no horário exato de fim (4 fusos × 4 períodos =
16 agendamentos, mais frágil); Cloud Tasks por tally (mais peças sem ganho).

---

## R7. Stack de testes e qualidade (Constituição II e IV)

**Decision**:
| Camada | Ferramenta |
|--------|-----------|
| Domínio compartilhado (períodos, perguntas, escala, arredondamento) | Jest, cobertura ≥ 80% (meta 100%) |
| Componentes e hooks do app | Jest (`jest-expo`) + React Native Testing Library |
| Cloud Functions | Jest + Firebase Emulator Suite (Auth, Firestore, Functions) |
| Security Rules | `@firebase/rules-unit-testing` no emulador |
| Integração com Open-Meteo | testes de contrato com respostas gravadas (fixtures) + `nock` |
| Ponta a ponta | Maestro (suporta Expo Go) com emuladores Firebase |
| Qualidade | TypeScript `strict`, ESLint, Prettier, `npm audit`, gitleaks, GitHub Actions |

**Rationale**: todas rodam localmente com um comando e no CI; o emulador evita custos e torna os
testes determinísticos. Relógio controlado (injeção de `clock`) nos testes de período.

---

## R8. Organização do código

**Decision**: monorepo com **npm workspaces** e três pacotes: `app/` (Expo), `functions/`
(Cloud Functions) e `packages/shared/` (domínio puro + schemas `zod`). As functions são empacotadas
com **esbuild** antes do deploy, embutindo o `shared` (o deploy do Firebase não resolve
workspaces locais).

**Rationale**: as regras de período/perguntas/arredondamento precisam ser **idênticas** no app e no
servidor; um único pacote testado evita divergência (DRY, Constituição I).

**Alternatives considered**: duplicar a lógica em app e functions (risco de divergência); publicar
`shared` em registry privado (overhead).
