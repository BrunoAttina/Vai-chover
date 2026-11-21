# Operações: deploy e configuração do Firebase

Projeto Firebase: `vai-chover-c102e` (alias `prod` em `.firebaserc`). Os emuladores usam o
projeto fictício `demo-vai-chover`.

## 1. Pré-requisitos no console

1. Plano **Blaze**, necessário para Cloud Functions, Cloud Scheduler e Secret Manager.
2. **Firestore** criado na região `southamerica-east1` (modo produção).
3. **Authentication** ativado. Nenhum provedor precisa ser habilitado: o login usa custom tokens
   emitidos pelas functions.
4. Permissão para assinar tokens: conceda à conta de serviço padrão das functions
   (`<número>-compute@developer.gserviceaccount.com`) o papel **Service Account Token Creator**
   (`roles/iam.serviceAccountTokenCreator`). Sem ele, `createCustomToken` falha em produção.

## 2. Segredos

```bash
firebase use prod
firebase functions:secrets:set OTP_PEPPER          # valor aleatório longo (ex.: openssl rand -hex 32)
```

O segredo SMTP da extensão de e-mail é pedido no passo 3.

## 3. Extensão Trigger Email

A configuração está em `extensions/firestore-send-email.env` (coleção `mail`, remetente).
No deploy, informe `SMTP_CONNECTION_URI` de um provedor transacional, por exemplo
`smtps://usuario:senha@smtp.provedor.com:465`. O valor fica guardado no Secret Manager.

## 4. Deploy

```bash
npm run build -w functions
firebase deploy --only firestore:rules,firestore:indexes,functions,extensions --project prod
```

`firestore.indexes.json` também ativa as políticas de **TTL** em `loginCodes.expiresAt`,
`forecasts.expiresAt` e `mail.expiresAt`. Para conferir ou ativar manualmente:

```bash
gcloud firestore fields ttls update expiresAt --collection-group=loginCodes --enable-ttl --project vai-chover-c102e
gcloud firestore fields ttls update expiresAt --collection-group=forecasts --enable-ttl --project vai-chover-c102e
gcloud firestore fields ttls update expiresAt --collection-group=mail --enable-ttl --project vai-chover-c102e
```

## 5. Open-Meteo

O uso gratuito é **não comercial**. Se o app for monetizado, contrate o plano comercial e defina:

```bash
# functions/.env.vai-chover-c102e (parâmetros das functions; a chave não deve ser versionada)
OPEN_METEO_BASE_URL=https://customer-api.open-meteo.com
OPEN_METEO_API_KEY=<chave>
```

## 6. App apontando para produção

Em `app/.env`, defina `EXPO_PUBLIC_USE_EMULATORS=false`. Os perfis `preview` e `production`
do `app/eas.json` já fazem isso nos builds.

```bash
npx eas-cli@latest build --platform android --profile preview      # APK para testes
npx eas-cli@latest build --platform android --profile production   # AAB para a Play Store
```

As variáveis `EXPO_PUBLIC_FIREBASE_*` precisam existir no EAS
(`npx eas-cli@latest env:create`) ou no `app/.env` da máquina que gera o build.

## 7. Antes do lançamento público: Firebase App Check (pendente)

O App Check com Play Integrity exige `@react-native-firebase/app-check`, que não roda no Expo
Go. Quando o app sair do Expo Go:

1. Instalar `expo-dev-client`, `@react-native-firebase/app` e `@react-native-firebase/app-check`
   (via `npx expo install`) e adicionar os config plugins no `app.json`. Não é preciso escrever
   código nativo.
2. Registrar o app Android no Firebase e ativar o provedor Play Integrity no App Check.
3. Em `functions/src/handlers.ts`, trocar `enforceAppCheck: false` por `true`.
4. Usar o perfil `development` do `eas.json` para desenvolvimento.
