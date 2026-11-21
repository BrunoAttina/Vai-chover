# Vai chover?

Aplicativo móvel (Android primeiro, iOS depois) em que as pessoas dão palpites sobre a chuva do
dia na sua cidade, veem os palpites da vizinhança, comparam com a previsão oficial e descobrem,
ao fim de cada período, se pensaram como a maioria e se a maioria acertou.

- **App**: React Native + Expo (SDK 58, Expo Router), roda no **Expo Go** — sem código nativo.
- **Backend**: Firebase (Authentication, Firestore, Cloud Functions, Secret Manager, extensão
  Trigger Email).
- **Clima**: Open-Meteo (previsão e chuva observada), consultado só pelas Cloud Functions.

Especificação, plano e tarefas: [specs/001-rain-prediction-voting/](specs/001-rain-prediction-voting/).
Princípios do projeto: [.specify/memory/constitution.md](.specify/memory/constitution.md).

## Estrutura

```text
app/               App Expo (rotas em app/src/app, componentes, hooks, serviços)
functions/         Cloud Functions (callables + job agendado closePeriods)
packages/shared/   Regras de domínio e schemas compartilhados (períodos, perguntas, análise)
firestore.rules    Regras de segurança (deny by default)
```

## Pré-requisitos

- Node.js 22+ e npm 10+
- **Java 21+** (exigido pelo Firebase Emulator Suite)
- Expo Go no aparelho Android ou um emulador Android (API 26+)
- Maestro CLI (opcional, testes E2E)

## Começando

```bash
npm install
cp app/.env.example app/.env   # preencha com a configuração do app web do Firebase
npm run emulators              # Auth, Firestore e Functions locais (http://localhost:4000)
npm run app                    # abre o Metro; leia o QR code com o Expo Go
```

Com `EXPO_PUBLIC_USE_EMULATORS=true` o app usa os emuladores. Nos emuladores os e-mails não são
enviados: o código de acesso aparece na coleção `mail` da Emulator UI.

## Qualidade (mesmos comandos do CI)

```bash
npm run lint              # ESLint + Prettier
npm run typecheck         # TypeScript strict em todos os pacotes
npm test                  # testes unitários e de contrato com cobertura (mínimo 80%)
npm run test:integration  # Cloud Functions contra os emuladores
npm run test:rules        # regras do Firestore no emulador
npm run test:e2e          # fluxos Maestro (app no Expo Go + emuladores)
```

## Deploy

Veja [docs/operations.md](docs/operations.md): segredos, extensão de e-mail, regras, índices,
TTL e build Android com EAS.
