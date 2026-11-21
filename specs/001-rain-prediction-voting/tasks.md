---

description: "Task list for Vai chover? — Palpites coletivos de chuva"
---

# Tasks: Vai chover? — Palpites coletivos de chuva

**Input**: Design documents from `/specs/001-rain-prediction-voting/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: INCLUÍDOS e obrigatórios — a constituição (Princípio II, NÃO NEGOCIÁVEL) exige TDD e
testes automatizados em tudo. Em cada fase, as tarefas de teste vêm antes da implementação e
MUST falhar antes de a implementação começar.

**Organization**: tarefas agrupadas por user story para implementação e teste independentes.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência de tarefas incompletas)
- **[Story]**: user story da tarefa (US1, US2, US3, US4)
- Citações de restrições de campo usam `data-model.md` + `coleção.campo` (ex.: `votes.value`)

## Path Conventions

Monorepo (ver plan.md): `packages/shared/`, `functions/`, `app/`, arquivos Firebase na raiz.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: inicialização do monorepo, ferramentas de qualidade e Firebase local

- [X] T001 Create root `package.json` with npm workspaces (`app`, `functions`, `packages/*`) and scripts `lint`, `typecheck`, `test`, `test:rules`, `test:integration`, `test:e2e`, `emulators`, `app` per quickstart.md
- [X] T002 [P] Create `tsconfig.base.json` with `strict: true`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` at repo root
- [X] T003 [P] Initialize `packages/shared/` (package.json, tsconfig.json extending base, `src/index.ts`, Jest config with 80% line/branch coverage threshold)
- [X] T004 [P] Initialize `functions/` (package.json with Node 22 engine, `firebase-functions` v2, `firebase-admin`, `zod`, `date-fns`, `date-fns-tz`, `tz-lookup`; tsconfig; `esbuild.config.mjs` bundling `packages/shared` into `lib/index.js`; Jest config with 80% coverage threshold)
- [X] T005 [P] Create Expo app in `app/` with TypeScript and Expo Router; add `expo-location`, `@react-native-community/slider`, `firebase`, `@react-native-async-storage/async-storage`; configure `jest-expo` + React Native Testing Library with 80% coverage threshold in `app/jest.config.js`
- [X] T006 [P] Configure ESLint (typescript-eslint strict, react, react-hooks) and Prettier in `eslint.config.mjs` and `.prettierrc` at repo root
- [X] T007 [P] Create `firebase.json` (emulators Auth/Firestore/Functions/UI, functions source `functions` with esbuild predeploy, region `southamerica-east1`), `.firebaserc`, empty `firestore.rules` (deny all) and `firestore.indexes.json`
- [X] T008 [P] Create `.gitignore` (node_modules, `.env`, `lib/`, coverage, `.expo/`) and `.env.example` documenting `EXPO_PUBLIC_FIREBASE_*`, `EXPO_PUBLIC_USE_EMULATORS`, `EXPO_PUBLIC_EMULATOR_HOST`
- [X] T009 [P] Create CI workflow `.github/workflows/ci.yml` running lint, typecheck, unit tests with coverage, rules tests and integration tests (Firebase emulators), `npm audit --audit-level=high` and gitleaks
- [X] T010 [P] Add gitleaks config `.gitleaks.toml` and Firebase emulator seed folder `seed/` with README

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: domínio compartilhado, infraestrutura das functions e base do app usados por todas as stories

**⚠️ CRITICAL**: nenhuma user story começa antes desta fase terminar

### Tests (write first, must fail)

- [X] T011 [P] Unit tests for rain scale (values 0–5 and pt-BR labels) in `packages/shared/tests/rain-scale.test.ts`
- [X] T012 [P] Unit tests for periods: period for local time, boundaries 23:59/00:00/05:59/06:00/11:59/12:00/17:59/18:00, madrugada belongs to new day, offered periods (current + remaining), period start/end instants in `America/Sao_Paulo` and `America/Manaus` in `packages/shared/tests/periods.test.ts`
- [X] T013 [P] Unit tests for zod schemas of all callable inputs/outputs (valid and invalid cases) in `packages/shared/tests/schemas.test.ts`
- [X] T014 [P] Unit tests for clock (real time; `CLOCK_OVERRIDE` honored only when `FUNCTIONS_EMULATOR=true`) in `functions/tests/unit/clock.test.ts`
- [X] T015 [P] Unit tests for session guard (missing auth → `unauthenticated`; `auth_time` older than 60 days → `unauthenticated`; valid → passes) in `functions/tests/unit/session-guard.test.ts`
- [X] T016 [P] Rules test harness with `@firebase/rules-unit-testing` and baseline "unauthenticated reads nothing / unknown paths denied" cases in `functions/tests/rules/baseline.rules.test.ts`

### Implementation

- [X] T017 [P] Implement `Period` and `RainValue` types in `packages/shared/src/types.ts` (enum values per data-model.md conventions `Period`, `RainValue`)
- [X] T018 [P] Implement rain scale labels in `packages/shared/src/rain-scale.ts`
- [X] T019 Implement period logic (`getPeriodAt`, `getLocalDate`, `getOfferedPeriods`, `getPeriodWindow`) in `packages/shared/src/periods.ts` (depends on T017)
- [X] T020 Implement zod schemas for every callable in contracts/callable-functions.md, including `displayName` per data-model.md `users.displayName` and vote `value` per data-model.md `votes.value`, in `packages/shared/src/schemas.ts` (depends on T017)
- [X] T021 [P] Implement injectable clock in `functions/src/infra/clock.ts`
- [X] T022 [P] Implement Firebase Admin init and typed collection refs in `functions/src/infra/firestore.ts`
- [X] T023 Implement session guard (`requireSession`) checking `auth_time` ≤ 60 days in `functions/src/infra/session-guard.ts`
- [X] T024 [P] Implement `HttpsError` helpers and structured logger without personal data in `functions/src/infra/errors.ts` and `functions/src/infra/logger.ts`
- [X] T025 Implement `validSession()` helper and deny-by-default baseline in `firestore.rules` per contracts/firestore-rules.md
- [X] T026 Create callable export skeleton in `functions/src/index.ts` (region `southamerica-east1`)
- [X] T027 [P] Implement Firebase client init (`initializeAuth` with `getReactNativePersistence(AsyncStorage)`, Firestore, Functions in `southamerica-east1`, emulator connection when `EXPO_PUBLIC_USE_EMULATORS=true`) in `app/src/services/firebase.ts`
- [X] T028 [P] Implement typed callable client using shared schemas and pt-BR error message mapping in `app/src/services/functions-client.ts` with tests in `app/tests/services/functions-client.test.ts`
- [X] T029 [P] Create theme tokens (colors, spacing, typography) in `app/src/theme/index.ts`
- [X] T030 Implement `useSession` hook (auth state, local sign-out when session older than 60 days) with tests in `app/src/hooks/useSession.ts` and `app/tests/hooks/useSession.test.tsx`
- [X] T031 Implement root layout with route groups `(auth)` and `(main)` and session-based redirect in `app/app/_layout.tsx`

**Checkpoint**: domínio compartilhado testado, functions e app inicializam contra os emuladores

---

## Phase 3: User Story 1 - Criar conta e entrar sem senha (Priority: P1) 🎯 MVP

**Goal**: cadastro com nome + e-mail e login por código de 6 dígitos enviado por e-mail, sem senha

**Independent Test**: criar conta, pegar o código em `mail/*` no emulador, entrar; sair e entrar
novamente só com o e-mail (quickstart.md cenários 1–3)

### Tests for User Story 1 ⚠️

- [X] T032 [P] [US1] Unit tests for OTP (6-digit generation, HMAC hashing, constant-time compare) in `functions/tests/unit/otp.test.ts`
- [X] T033 [P] [US1] Unit tests for login rate limiter (5 requests per rolling hour) in `functions/tests/unit/rate-limit.test.ts`
- [X] T034 [P] [US1] Integration test `requestLoginCode` (generic response for new/existing e-mail, `mail` doc created, code replaced on resend, 6th request → `resource-exhausted`, existing account ignores `displayName`) in `functions/tests/integration/request-login-code.test.ts`
- [X] T035 [P] [US1] Integration test `verifyLoginCode` (creates Auth user + `users` doc, returns custom token, `needsProfile`, `invalid_code`, `expired` after 15 min via clock, `locked` after 5 attempts, single use) in `functions/tests/integration/verify-login-code.test.ts`
- [X] T036 [P] [US1] Integration test `completeProfile` (valid name saved, invalid name rejected) in `functions/tests/integration/complete-profile.test.ts`
- [X] T037 [P] [US1] Rules tests for `users`, `loginCodes` and `mail` per contracts/firestore-rules.md cases 1, 2, 3, 5 in `functions/tests/rules/auth.rules.test.ts`
- [X] T038 [P] [US1] Component tests for sign-up, sign-in, verify-code and profile screens (validation messages, resend countdown, error codes) in `app/tests/screens/auth.test.tsx`
- [X] T039 [P] [US1] Maestro flow sign-up → verify code → home in `app/e2e/sign-up.yaml`

### Implementation for User Story 1

- [X] T040 [P] [US1] Implement OTP generation and HMAC hashing with `OTP_PEPPER` secret in `functions/src/auth/otp.ts`
- [X] T041 [P] [US1] Implement login code repository for data-model.md `loginCodes.codeHash`, `loginCodes.expiresAt`, `loginCodes.attempts`, `loginCodes.pendingDisplayName`, `loginCodes.requestTimestamps` (doc ID = HMAC of normalized e-mail) in `functions/src/auth/login-code-repository.ts`
- [X] T042 [P] [US1] Implement users repository for data-model.md `users.displayName`, `users.emailLower`, `users.createdAt`, `users.lastRegionId` in `functions/src/infra/users-repository.ts`
- [X] T043 [P] [US1] Implement mailer writing data-model.md `mail.to`, `mail.message` (pt-BR subject/text/html with the code) in `functions/src/infra/mailer.ts`
- [X] T044 [US1] Implement rate limiter in `functions/src/auth/rate-limit.ts` (depends on T041)
- [X] T045 [US1] Implement `requestLoginCode` callable in `functions/src/auth/request-login-code.ts` (depends on T040, T041, T043, T044)
- [X] T046 [US1] Implement `verifyLoginCode` callable (create Auth user if missing, apply pending name, `createCustomToken`, delete code) in `functions/src/auth/verify-login-code.ts` (depends on T040–T042)
- [X] T047 [US1] Implement `completeProfile` callable in `functions/src/auth/complete-profile.ts` (depends on T042)
- [X] T048 [US1] Export auth callables in `functions/src/index.ts` and declare secrets `OTP_PEPPER`
- [X] T049 [US1] Add `users`, `loginCodes`, `mail` rules in `firestore.rules`
- [X] T050 [US1] Configure Trigger Email extension (`extensions/firestore-send-email.env`, collection `mail`, `SMTP_CONNECTION_URI` secret) and register it in `firebase.json`
- [X] T051 [P] [US1] Implement sign-up screen in `app/app/(auth)/sign-up.tsx`
- [X] T052 [P] [US1] Implement sign-in screen in `app/app/(auth)/sign-in.tsx`
- [X] T053 [US1] Implement verify-code screen (`signInWithCustomToken`, 60 s resend countdown) in `app/app/(auth)/verify-code.tsx`
- [X] T054 [US1] Implement profile screen in `app/app/(auth)/profile.tsx`
- [X] T055 [US1] Implement placeholder home in `app/app/(main)/index.tsx` and account screen with display name and "Sair" in `app/app/(main)/account.tsx`

**Checkpoint**: US1 funcional e testada de forma independente (MVP)

---

## Phase 4: User Story 2 - Dar palpites de chuva conforme o período do dia (Priority: P1)

**Goal**: detectar município e período e registrar palpites 0–5 (madrugada 4, manhã 3, tarde 2, noite 1 pergunta)

**Independent Test**: com `CLOCK_OVERRIDE` em 03:00/09:00/15:00/21:00, verificar perguntas
corretas, voto único e rejeição na virada de período (quickstart.md cenários 4–7)

### Tests for User Story 2 ⚠️

- [X] T056 [P] [US2] Unit tests for questions per period (exact pt-BR texts and order from spec User Story 2) in `packages/shared/tests/questions.test.ts`
- [X] T057 [P] [US2] Unit tests for municipality matcher (accent/case-insensitive, filtered by UF, not found) in `functions/tests/unit/municipality-matcher.test.ts`
- [X] T058 [P] [US2] Unit tests for vote service (offered periods, `period_ended`, `not_offered`, duplicate periods in input) in `functions/tests/unit/vote-service.test.ts`
- [X] T059 [P] [US2] Integration test `resolveRegion` (gps and manual sources, region doc created with timezone, coordinates not persisted, `not-found`, outside Brazil) and `listMunicipalities` in `functions/tests/integration/resolve-region.test.ts`
- [X] T060 [P] [US2] Integration test `submitVotes` (votes + tally increment in one transaction, `already_voted`, 11:59→12:00 transition, `failed-precondition` when none accepted, server clock used) in `functions/tests/integration/submit-votes.test.ts`
- [X] T061 [P] [US2] Rules tests for `regions`, `votes`, `tallies` (owner-only vote reads, no client writes, query without uid filter denied, 61-day session denied) in `functions/tests/rules/votes.rules.test.ts`
- [X] T062 [P] [US2] Component tests for `RainSlider` (no initial value, step 1, label "N - Rótulo", accessibility props) in `app/tests/components/RainSlider.test.tsx`
- [X] T063 [P] [US2] Screen tests for location (permission granted/denied, manual UF + city picker) and vote (1–4 questions, confirm disabled until all answered, rejected items warning) in `app/tests/screens/vote.test.tsx`
- [X] T064 [P] [US2] Maestro flow location denied → manual city → vote in `app/e2e/vote.yaml`

### Implementation for User Story 2

- [X] T065 [P] [US2] Implement questions per period in `packages/shared/src/questions.ts`
- [X] T066 [P] [US2] Add IBGE municipalities dataset (code, name, UF, lat, lon) with generation script in `functions/src/data/municipios.json` and `functions/scripts/build-municipios.ts`
- [X] T067 [US2] Implement municipality matcher and UF listing in `functions/src/regions/municipality-matcher.ts` (depends on T066)
- [X] T068 [US2] Implement regions repository for data-model.md `regions.name`, `regions.state`, `regions.timezone` (via `tz-lookup` on centroid), `regions.lat`, `regions.lon` in `functions/src/regions/regions-repository.ts`
- [X] T069 [US2] Implement `resolveRegion` and `listMunicipalities` callables (update `users.lastRegionId` per data-model.md) in `functions/src/regions/resolve-region.ts` and `functions/src/regions/list-municipalities.ts` (depends on T067, T068)
- [X] T070 [US2] Implement vote service computing offered periods and rejections with server clock in `functions/src/votes/vote-service.ts`
- [X] T071 [US2] Implement votes/tallies transaction for data-model.md `votes.uid`, `votes.regionId`, `votes.localDate`, `votes.targetPeriod`, `votes.askedInPeriod`, `votes.value`, `votes.createdAt` (deterministic ID, `create` fails if exists) and `tallies.counts`, `tallies.total`, `tallies.sum`, `tallies.periodEndsAt`, `tallies.closed` in `functions/src/votes/votes-repository.ts`
- [X] T072 [US2] Implement `submitVotes` callable in `functions/src/votes/submit-votes.ts` (depends on T070, T071) and export it with region callables in `functions/src/index.ts`
- [X] T073 [US2] Add `regions`, `votes`, `tallies` rules in `firestore.rules` and index `votes(regionId, localDate, targetPeriod)` in `firestore.indexes.json`
- [X] T074 [P] [US2] Implement location service (foreground permission, current position, `reverseGeocodeAsync`) in `app/src/services/location.ts`
- [X] T075 [US2] Implement `useRegion` hook (gps → `resolveRegion`, fallback manual) with tests in `app/src/hooks/useRegion.ts` and `app/tests/hooks/useRegion.test.tsx`
- [X] T076 [P] [US2] Implement `RainSlider` component in `app/src/components/RainSlider.tsx`
- [X] T077 [US2] Implement location screen with explanation and manual picker in `app/app/(main)/location.tsx`
- [X] T078 [US2] Implement vote screen (header with city/period, questions from `questions.ts`, `submitVotes`, rejection warnings, navigate to results) in `app/app/(main)/vote.tsx`
- [X] T079 [US2] Replace placeholder home with redirect to location/vote flow in `app/app/(main)/index.tsx`

**Checkpoint**: US1 e US2 funcionam de forma independente

---

## Phase 5: User Story 3 - Ver resultado coletivo e comparar com a previsão real (Priority: P2)

**Goal**: contagens 0–5 da cidade em tempo real e cartão com a previsão oficial (sim/não + %)

**Independent Test**: com votos conhecidos e fixture de previsão, as contagens e o cartão batem
exatamente; com provedor indisponível, contagens continuam visíveis (quickstart.md cenários 8–9)

### Tests for User Story 3 ⚠️

- [X] T080 [P] [US3] Contract tests for Open-Meteo client with fixtures (rainy day, dry day, `null` hours, HTTP 500, timeout + 1 retry) and zod response validation in `functions/tests/contract/open-meteo.test.ts` with fixtures in `functions/tests/contract/fixtures/`
- [X] T081 [P] [US3] Unit tests for hourly → period mapping (max probability, `willRain` at ≥ 50, sum precipitation, null → unavailable) in `functions/tests/unit/weather-mapping.test.ts`
- [X] T082 [P] [US3] Integration test `getForecast` (cache hit within 60 min, refresh after, `{ available: false }` on provider failure) in `functions/tests/integration/get-forecast.test.ts`
- [X] T083 [P] [US3] Rules tests for `forecasts` in `functions/tests/rules/forecasts.rules.test.ts`
- [X] T084 [P] [US3] Component tests for `VoteBars` (six options including zeros) and `ForecastCard` (rain/no rain, %, unavailable) in `app/tests/components/results.test.tsx`
- [X] T085 [P] [US3] Screen test for results (periods shown match voted periods, live tally update, already-voted redirect from vote screen) in `app/tests/screens/results.test.tsx`

### Implementation for User Story 3

- [X] T086 [P] [US3] Implement Open-Meteo client (5 s timeout, 1 retry, optional `OPEN_METEO_API_KEY`, `OPEN_METEO_BASE_URL` override in emulator) per contracts/open-meteo.md in `functions/src/weather/open-meteo-client.ts`
- [X] T087 [P] [US3] Implement hourly → period mapping in `functions/src/weather/weather-mapping.ts`
- [X] T088 [US3] Implement forecasts repository for data-model.md `forecasts.periods`, `forecasts.fetchedAt`, `forecasts.expiresAt` in `functions/src/weather/forecasts-repository.ts`
- [X] T089 [US3] Implement `getForecast` callable and export it in `functions/src/weather/get-forecast.ts` and `functions/src/index.ts` (depends on T086–T088)
- [X] T090 [US3] Add `forecasts` rules in `firestore.rules`
- [X] T091 [P] [US3] Implement `useTallies` hook (`onSnapshot` on `tallies` for region/date/periods) in `app/src/hooks/useTallies.ts`
- [X] T092 [P] [US3] Implement `useForecast` and `useMyVotes` hooks in `app/src/hooks/useForecast.ts` and `app/src/hooks/useMyVotes.ts`
- [X] T093 [P] [US3] Implement `VoteBars` component in `app/src/components/VoteBars.tsx`
- [X] T094 [P] [US3] Implement `ForecastCard` component in `app/src/components/ForecastCard.tsx`
- [X] T095 [US3] Implement results screen in `app/app/(main)/results.tsx` and redirect from vote screen when already voted in the current period in `app/app/(main)/vote.tsx`

**Checkpoint**: US1, US2 e US3 funcionam de forma independente

---

## Phase 6: User Story 4 - Análise ao fim de cada período (Priority: P3)

**Goal**: ao fim de cada período, mostrar à pessoa se pensou como a maioria e se a maioria acertou

**Independent Test**: com votos conhecidos, avançar o relógio, executar `closePeriods` com fixture
de chuva/sem chuva e verificar análise e `LastPeriodCard` (quickstart.md cenários 10–11)

### Tests for User Story 4 ⚠️

- [X] T096 [P] [US4] Unit tests for analysis (mean, half-up rounding incl. 0.5 and 2.5, `crowdSaysRain`, matched, status from observed rain, 24 h → `noData`) in `packages/shared/tests/analysis.test.ts`
- [X] T097 [P] [US4] Integration test `closePeriods` stage 1 (closes only ended tallies, `noData` for zero votes, marks votes `matchedRegion`/`regionRoundedMean`, idempotent rerun) in `functions/tests/integration/close-periods.test.ts`
- [X] T098 [P] [US4] Integration test `closePeriods` stage 2 (`majorityRight`, `majorityWrong`, pending retry, `noData` after 24 h, one provider request per region/date) in `functions/tests/integration/resolve-observations.test.ts`
- [X] T099 [P] [US4] Rules tests for `periodAnalyses` in `functions/tests/rules/analyses.rules.test.ts`
- [X] T100 [P] [US4] Component test for `LastPeriodCard` (all match/status messages) in `app/tests/components/LastPeriodCard.test.tsx`

### Implementation for User Story 4

- [X] T101 [P] [US4] Implement analysis functions in `packages/shared/src/analysis.ts`
- [X] T102 [US4] Implement period analyses repository for data-model.md `periodAnalyses.votes`, `periodAnalyses.mean`, `periodAnalyses.roundedMean`, `periodAnalyses.crowdSaysRain`, `periodAnalyses.observedPrecipitationMm`, `periodAnalyses.observedRain`, `periodAnalyses.status` (state transitions), `periodAnalyses.observationAttempts`, `periodAnalyses.closedAt`, `periodAnalyses.resolvedAt` in `functions/src/analysis/analyses-repository.ts`
- [X] T103 [US4] Implement stage 1 (close ended tallies, write data-model.md `votes.matchedRegion` and `votes.regionRoundedMean` with BulkWriter) in `functions/src/analysis/close-tallies.ts` (depends on T101, T102)
- [X] T104 [US4] Implement stage 2 (observed rain via Open-Meteo client, grouped by region/date) in `functions/src/analysis/resolve-observations.ts` (depends on T102, T086, T087)
- [X] T105 [US4] Implement scheduled `closePeriods` (`every 15 minutes`, `maxInstances: 1`, structured run log) and export it in `functions/src/analysis/close-periods.ts` and `functions/src/index.ts`
- [X] T106 [US4] Add `periodAnalyses` rules in `firestore.rules` and indexes `tallies(closed, periodEndsAt)` and `periodAnalyses(status, closedAt)` in `firestore.indexes.json`
- [X] T107 [P] [US4] Implement `useLastResult` hook (latest closed voted period: own vote + analysis) in `app/src/hooks/useLastResult.ts`
- [X] T108 [P] [US4] Implement `LastPeriodCard` component in `app/src/components/LastPeriodCard.tsx`
- [X] T109 [US4] Show "Como foi o último período" section on vote and results screens in `app/app/(main)/vote.tsx` and `app/app/(main)/results.tsx`

**Checkpoint**: todas as user stories funcionam de forma independente

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: LGPD, endurecimento de segurança, release e validação final

- [X] T110 [P] Integration test `deleteAccount` (user doc, votes and Auth user removed; open-period tallies decremented; closed-period aggregates kept) in `functions/tests/integration/delete-account.test.ts`
- [X] T111 Implement `deleteAccount` callable and export it in `functions/src/auth/delete-account.ts` and `functions/src/index.ts`
- [X] T112 Add "Excluir conta" with confirmation to `app/app/(main)/account.tsx` with tests in `app/tests/screens/account.test.tsx`
- [X] T113 [P] Configure Firestore TTL policies on data-model.md `loginCodes.expiresAt`, `forecasts.expiresAt` and `mail` (7 days) and document the commands in `docs/operations.md`
- [X] T114 [P] Accessibility pass (labels, contrast, font scaling) on all screens in `app/app/`
- [X] T115 [P] Create `app/eas.json` with `preview` (APK) and `production` (AAB) Android profiles and set `android.package` and location permission strings in `app/app.json`
- [ ] T116 (PENDENTE — exige development build; ver docs/operations.md §7) Pre-release: enable Firebase App Check (development build with `expo-dev-client` + `@react-native-firebase/app-check` config plugin, Play Integrity provider; `enforceAppCheck: true` on callables) per plan.md Complexity Tracking in `app/app.json`, `app/src/services/firebase.ts` and `functions/src/index.ts`
- [X] T117 [P] Write project `README.md` (overview, setup, scripts, links to specs)
- [X] T118 Run full CI locally and confirm coverage ≥ 80% in all workspaces; fix gaps
- [ ] T119 (PENDENTE — validação manual em aparelho/emulador Android) Execute all 12 scenarios of `specs/001-rain-prediction-voting/quickstart.md` and record results

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sem dependências
- **Foundational (Phase 2)**: depende do Setup — BLOQUEIA todas as stories
- **US1–US4 (Phases 3–6)**: dependem da Foundational
- **Polish (Phase 7)**: depende das stories desejadas (T111 depende de T071)

### User Story Dependencies

- **US1 (P1)**: só Foundational
- **US2 (P1)**: só Foundational nos testes (usuários criados direto no Auth Emulator); no app, o
  fluxo real usa a entrada da US1
- **US3 (P2)**: lê `tallies` criados pela US2 (testes usam seed próprio); integra na navegação da
  US2 (T095 edita `vote.tsx`)
- **US4 (P3)**: lê `tallies`/`votes` da US2 e reutiliza o cliente Open-Meteo da US3 (T104 depende
  de T086/T087)

### Within Each User Story

- Testes escritos e falhando antes da implementação
- Domínio/repositórios → serviços → callables → regras → telas
- Story completa e validada antes da próxima prioridade

### Parallel Opportunities

- Setup: T002–T010 em paralelo após T001
- Foundational: todos os testes T011–T016 em paralelo; T017, T018, T021, T022, T024, T027–T029 em paralelo
- Em cada story, todas as tarefas de teste marcadas [P] em paralelo; repositórios e componentes [P] em paralelo
- Com equipe: US1 e US2 em paralelo após a Foundational; US3 em paralelo com US2 (functions) até T095

---

## Parallel Example: User Story 2

```bash
# Testes juntos:
Task: "Unit tests for questions per period in packages/shared/tests/questions.test.ts"
Task: "Unit tests for municipality matcher in functions/tests/unit/municipality-matcher.test.ts"
Task: "Integration test submitVotes in functions/tests/integration/submit-votes.test.ts"
Task: "Component tests for RainSlider in app/tests/components/RainSlider.test.tsx"

# Implementação independente junta:
Task: "Implement questions per period in packages/shared/src/questions.ts"
Task: "Add IBGE municipalities dataset in functions/src/data/municipios.json"
Task: "Implement location service in app/src/services/location.ts"
Task: "Implement RainSlider component in app/src/components/RainSlider.tsx"
```

---

## Implementation Strategy

### MVP First

1. Phase 1 + Phase 2
2. Phase 3 (US1) → validar cenários 1–3 do quickstart
3. Phase 4 (US2) → validar cenários 4–7 — **primeiro incremento com valor de produto** (a US1 sozinha só prova a entrada)

### Incremental Delivery

1. Setup + Foundational → base pronta
2. US1 → login sem senha (demo)
3. US2 → palpites registrados (MVP de produto)
4. US3 → resultados + previsão
5. US4 → análise de fim de período
6. Polish → LGPD, App Check, build de release

---

## Notes

- [P] = arquivos diferentes, sem dependências pendentes
- Verificar que os testes falham antes de implementar (Red-Green-Refactor)
- Commits pequenos por tarefa ou grupo lógico (Conventional Commits)
- Nenhum segredo em código; `CLOCK_OVERRIDE` só funciona no emulador
