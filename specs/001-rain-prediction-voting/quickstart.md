# Quickstart: validar a feature ponta a ponta

Guia para rodar o projeto localmente e provar que os fluxos da [spec](spec.md) funcionam.
Detalhes de dados e interfaces: [data-model.md](data-model.md) e [contracts/](contracts/).

## Pré-requisitos

- Node.js 22 LTS e npm 10+
- Java 21+ (exigido pelo Firebase Emulator Suite)
- Firebase CLI (`npm i -g firebase-tools`) e EAS CLI (`npm i -g eas-cli`, só para builds)
- Android: emulador Android Studio (API 26+) **ou** aparelho físico com o app **Expo Go**
- Maestro CLI (testes E2E)
- Projeto Firebase (plano Blaze, exigido por Cloud Functions, Scheduler e Secret Manager)

## Configuração

```bash
npm install                      # instala todos os workspaces
cp app/.env.example app/.env     # preencher EXPO_PUBLIC_FIREBASE_* (config pública do app)
firebase use <alias-do-projeto>
```

Segredos (somente produção/homologação — nunca no `.env` do app):

```bash
firebase functions:secrets:set OTP_PEPPER
firebase functions:secrets:set SMTP_CONNECTION_URI   # usado pela extensão Trigger Email
```

## Rodar localmente com emuladores

```bash
npm run emulators                # Auth, Firestore, Functions (dados de seed em ./seed)
npm run app                      # expo start → abrir no Expo Go (tecla "a" para o emulador Android)
```

- O app conecta aos emuladores quando `EXPO_PUBLIC_USE_EMULATORS=true` (host `10.0.2.2` no
  emulador Android ou o IP da máquina na rede para aparelho físico).
- Nos emuladores, os e-mails não são enviados: o código aparece no documento `mail/*` na
  Emulator UI (http://localhost:4000/firestore).
- Para simular horários, as functions aceitam `CLOCK_OVERRIDE` (ISO) **apenas** em modo emulador.

## Comandos de qualidade (mesmos do CI)

```bash
npm run lint          # ESLint + Prettier check
npm run typecheck     # tsc --noEmit em todos os workspaces
npm test              # unit (shared, app, functions) com cobertura ≥ 80%
npm run test:rules    # regras do Firestore no emulador
npm run test:integration   # functions contra emuladores
npm run test:e2e      # Maestro (app no Expo Go + emuladores)
npm audit --audit-level=high
```

## Cenários de validação

| # | Cenário | Como validar | Resultado esperado |
|---|---------|--------------|--------------------|
| 1 | Cadastro sem senha (US1) | `/sign-up` com nome "Ana" e e-mail novo; pegar código em `mail/*`; digitar | Entra no app; `users/{uid}.displayName == "Ana"`; nenhuma senha pedida |
| 2 | Código expirado / reuso (US1) | `CLOCK_OVERRIDE` +16 min, ou usar o mesmo código duas vezes | Mensagem de código expirado/inválido; novo envio possível |
| 3 | Rate limit (FR-006) | Pedir código 6 vezes na mesma hora | 6ª tentativa: "Muitas solicitações, tente mais tarde" |
| 4 | Perguntas por período (US2) | `CLOCK_OVERRIDE` em 03:00, 09:00, 15:00, 21:00 (fuso da região) | 4, 3, 2 e 1 perguntas, com os textos da spec |
| 5 | Localização negada (US2) | Negar permissão no Android | Seletor de UF/município; votação segue normalmente |
| 6 | Voto único (FR-013) | Votar e reabrir o app no mesmo período | Vai direto para `/results`; nova tentativa via API retorna `already_voted` |
| 7 | Virada de período (edge case) | Abrir perguntas às 11:58, confirmar após 12:00 | Palpite da manhã rejeitado (`period_ended`) e avisado; demais aceitos |
| 8 | Resultados + previsão (US3) | Votar com 3 contas na mesma cidade | Contagens corretas para 0–5 (inclusive zeros) e cartão de previsão com % |
| 9 | Previsão indisponível (FR-019) | Functions com `OPEN_METEO_BASE_URL` apontando para endereço inválido (emulador) | Contagens visíveis; "Previsão temporariamente indisponível" |
| 10 | Fechamento do período (US4) | Avançar `CLOCK_OVERRIDE` para após o fim; executar `closePeriods` pelo shell das functions | `periodAnalyses` criado; votos com `matchedRegion`; `LastPeriodCard` mostra "pensou como a maioria"/"diferente" |
| 11 | Maioria acertou/errou (US4) | Fixture Open-Meteo com chuva e sem chuva | `status` = `majorityRight`/`majorityWrong` conforme a tabela de [scheduled-jobs.md](contracts/scheduled-jobs.md) |
| 12 | Exclusão de conta (LGPD) | `/account` → Excluir conta | Usuário e votos removidos; contagens de períodos abertos decrementadas |

## Build Android (homologação)

```bash
eas build --platform android --profile preview   # gera APK instalável, sem código nativo manual
```

> Antes do lançamento público: ativar Firebase App Check (exige development build com
> `expo-dev-client`), conforme Complexity Tracking do [plan.md](plan.md).
