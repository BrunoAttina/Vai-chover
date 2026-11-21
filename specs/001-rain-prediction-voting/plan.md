# Implementation Plan: Vai chover? — Palpites coletivos de chuva

**Branch**: `001-rain-prediction-voting` | **Date**: 2026-11-21 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-rain-prediction-voting/spec.md`

## Summary

App móvel "Vai chover?" (Android primeiro, iOS depois) em que a pessoa entra só com nome de
exibição e e-mail (código de 6 dígitos por e-mail, sem senha), tem seu município detectado pela
localização, dá palpites de 0 a 5 sobre chuva para o período atual e os restantes do dia
(madrugada, manhã, tarde, noite), vê as contagens de votos da cidade e a previsão oficial, e, ao
fim de cada período, descobre se pensou como a maioria e se a maioria acertou.

Abordagem: **React Native com Expo (managed, Expo Go no desenvolvimento)** — a localização via
`expo-location` **não exige código nativo** (ver [research.md §R1](research.md)). Backend 100%
**Firebase**: Authentication (custom token após OTP), Cloud Firestore, Cloud Functions (callables +
agendadas), Secret Manager, extensão Trigger Email e Emulator Suite. Dados de tempo do
**Open-Meteo**, acessados só pelo servidor.

## Technical Context

**Language/Version**: TypeScript 5.x (`strict`) em todo o código; Node.js 22 nas Cloud Functions

**Primary Dependencies**:
- App: Expo SDK (versão estável mais recente, compatível com o Expo Go da Play Store), React Native
  (New Architecture), Expo Router, `expo-location`, `@react-native-community/slider`,
  Firebase JS SDK (Auth, Firestore, Functions), `@react-native-async-storage/async-storage`
- Backend: `firebase-functions` (v7, API v2), `firebase-admin`, `date-fns-tz` (fusos vêm da base de municípios)
- Compartilhado: `zod` (schemas de entrada/saída), regras de domínio puras

**Storage**: Cloud Firestore (região `southamerica-east1`) com TTL policies para códigos de login
e cache de previsão

**Testing**: Jest (`jest-expo`) + React Native Testing Library; Jest + Firebase Emulator Suite
para functions; `@firebase/rules-unit-testing` para regras; Maestro para E2E; `nock` + fixtures
para o Open-Meteo

**Target Platform**: Android 8.0+ (API 26+) na v1; iOS 16+ futuramente com o mesmo código

**Project Type**: mobile-app + backend serverless (Firebase)

**Performance Goals**: resultados exibidos em ≤ 3 s após confirmar palpites (p95, SC-005); fluxo
de votação completo em < 30 s (SC-003); análise registrada em ≤ 15 min após o fim do período
(SC-007)

**Constraints**: hora do aparelho nunca é confiável (período sempre calculado no servidor);
coordenadas exatas não são persistidas; chamadas externas com timeout de 5 s; uso online
obrigatório; e-mail de acesso em ≤ 1 min (SC-002)

**Scale/Scope**: v1 dimensionada para até ~50 mil usuários e ~5.570 municípios; ~7 telas
(entrada, código, perfil, localização/cidade, palpites, resultados, conta)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Como o plano atende | Status |
|-----------|---------------------|--------|
| I. Código Limpo | Domínio puro em `packages/shared` (sem I/O); functions em camadas handler → serviço → repositório; app separa telas, hooks e serviços; nomes em inglês no código, textos de UI em pt-BR | ✅ |
| II. Testes em Tudo | TDD; unit (domínio, componentes, serviços), integração com emuladores (functions + rules), contrato (Open-Meteo, callables), E2E Maestro nos fluxos P1; cobertura ≥ 80% no CI; testes de fronteira de horário com relógio injetado | ✅ |
| III. Segurança por Padrão | Regras deny-by-default; escritas sensíveis só via functions; `zod` em toda entrada; OTP como HMAC, uso único, 15 min, 5 tentativas; rate limit 5/h; segredos no Secret Manager; sem enumeração de contas; HTTPS; coordenadas não persistidas; exclusão de conta (LGPD) | ⚠️ App Check adiado (ver Complexity Tracking) |
| IV. Qualidade Automatizada | `tsc --noEmit` strict, ESLint, Prettier, `npm audit`, gitleaks e testes com emuladores no GitHub Actions; falha bloqueia merge | ✅ |
| V. Simplicidade | Sem state manager global (hooks + listeners do Firestore); um único job agendado; sem contadores distribuídos; 3 pacotes justificados (ver Complexity Tracking) | ✅ |
| Requisitos de Segurança | Lockfile versionado; `.env.example`; timeout + cache para Open-Meteo; LGPD (minimização + `deleteAccount`) | ✅ |

**Resultado do gate (pré-pesquisa)**: aprovado, com uma exceção justificada.

**Reavaliação pós-design (Phase 1)**: aprovado. O [data-model.md](data-model.md) mantém
coordenadas fora do banco, os [contracts/](contracts/) validam toda entrada com schemas e as
[firestore rules](contracts/firestore-rules.md) negam escrita direta do cliente em dados
sensíveis. Nenhuma nova violação.

## Project Structure

### Documentation (this feature)

```text
specs/001-rain-prediction-voting/
├── plan.md              # This file
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/           # Phase 1
│   ├── callable-functions.md
│   ├── scheduled-jobs.md
│   ├── firestore-rules.md
│   ├── open-meteo.md
│   └── ui-screens.md
└── tasks.md             # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
package.json                 # npm workspaces: app, functions, packages/*
firebase.json                # emuladores, functions, firestore, extensões
firestore.rules
firestore.indexes.json
.firebaserc
.env.example
.github/workflows/ci.yml

packages/shared/
├── src/
│   ├── periods.ts           # faixas de horário, período atual, períodos restantes
│   ├── questions.ts         # perguntas por período (textos pt-BR)
│   ├── rain-scale.ts        # escala 0–5 e rótulos
│   ├── analysis.ts          # média, arredondamento, "maioria diz chuva", acerto
│   └── schemas.ts           # zod: entradas/saídas das callables
└── tests/

functions/
├── src/
│   ├── index.ts             # exporta callables e jobs
│   ├── auth/                # requestLoginCode, verifyLoginCode, completeProfile, deleteAccount
│   ├── regions/             # resolveRegion, listMunicipalities, tabela IBGE
│   ├── votes/               # submitVotes
│   ├── weather/             # getForecast, cliente Open-Meteo
│   ├── analysis/            # closePeriods (agendado)
│   ├── infra/               # firestore repos, clock, mailer, session guard
│   └── data/municipios.json # tabela IBGE (código, nome, UF, lat, lon)
├── tests/
│   ├── unit/
│   ├── integration/         # com Emulator Suite
│   └── contract/            # Open-Meteo (fixtures) e callables
└── esbuild.config.mjs

app/
├── src/app/                 # Expo Router (rotas = telas; convenção do SDK 58)
│   ├── (auth)/sign-in.tsx, sign-up.tsx, verify-code.tsx, profile.tsx
│   └── (main)/index.tsx (localização), vote.tsx, results.tsx, account.tsx
├── src/
│   ├── components/          # RainSlider, VoteBars, ForecastCard, LastPeriodCard
│   ├── hooks/               # useSession, useRegion, useTallies, useForecast, useLastResult
│   ├── services/            # firebase.ts, functions-client.ts, location.ts
│   └── theme/
├── tests/
├── e2e/                     # fluxos Maestro
└── app.json
```

**Structure Decision**: monorepo com npm workspaces (`app`, `functions`, `packages/shared`). O
pacote `shared` concentra as regras de domínio usadas tanto pelo app (exibir perguntas) quanto
pelas functions (validar e analisar), garantindo comportamento idêntico. As functions são
empacotadas com esbuild para embutir o `shared` no deploy.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Firebase App Check adiado para antes do lançamento público | App Check com Play Integrity exige `@react-native-firebase/app-check`, que não roda no Expo Go; o usuário pediu Expo Go se não houver necessidade de código nativo | Adotar development build desde o início aumenta o atrito do desenvolvimento sem impactar requisitos funcionais. Mitigação até lá: auth obrigatória em todas as callables, validação `zod`, rate limiting e regras deny-by-default. Ativar App Check (via config plugin, sem código nativo manual) é tarefa obrigatória antes do release |
| 3 pacotes (app, functions, shared) | Mesmas regras de período/análise precisam rodar no cliente e no servidor | Duplicar a lógica viola DRY e arrisca divergência entre o que o app mostra e o que o servidor aceita |
