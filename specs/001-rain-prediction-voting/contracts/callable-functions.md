# Contract: Callable Cloud Functions

Todas as funções: Firebase Callable (HTTPS), região `southamerica-east1`, entrada validada por
schema `zod` em `packages/shared/src/schemas.ts`. Entrada inválida → `invalid-argument`.

**Guarda de sessão** (todas exceto `requestLoginCode` e `verifyLoginCode`): exige
`request.auth`; rejeita com `unauthenticated` se ausente ou se `auth_time` tiver mais de 60 dias
(FR-007).

Erros seguem os códigos `HttpsError` do Firebase; mensagens para o usuário são definidas no app
(pt-BR) a partir do código, nunca repassando detalhes internos.

---

## requestLoginCode

Envia um código de 6 dígitos por e-mail. Usado tanto para cadastro quanto para login.

**Input**
```ts
{ email: string; displayName?: string }   // displayName: 2–30 chars após trim (cadastro)
```

**Output** — sempre o mesmo, exista a conta ou não (evita enumeração):
```ts
{ sent: true; expiresInSeconds: 900 }
```

**Erros**: `invalid-argument` (e-mail/nome inválidos), `resource-exhausted` (> 5 envios na
última hora para o e-mail — FR-006).

**Efeitos**: substitui `loginCodes/{emailHash}`; grava `mail/{id}` para a extensão Trigger Email.
Se a conta já existir, `displayName` é ignorado (não duplica conta — cenário US1.4).

---

## verifyLoginCode

**Input**
```ts
{ email: string; code: string }   // code: exatamente 6 dígitos
```

**Output**
```ts
{ customToken: string; isNewUser: boolean; needsProfile: boolean }
```
`needsProfile = true` quando a conta não tem `displayName` (ex.: entrou por "Entrar" sem ter
cadastro) — o app leva à tela de perfil.

**Erros**: `invalid-argument`; `permission-denied` com `details.reason` ∈
`"invalid_code" | "expired" | "locked"` (5 tentativas).

**Efeitos**: cria o usuário no Firebase Auth e `users/{uid}` se não existir; apaga o código
(uso único — FR-004).

---

## completeProfile

**Input** `{ displayName: string }` → **Output** `{ ok: true }`

Define/atualiza o nome de exibição.

---

## resolveRegion

**Input**
```ts
// a partir do GPS
{ source: "gps"; latitude: number; longitude: number; city?: string; state?: string }
// escolha manual
| { source: "manual"; ibgeCode: string }
```

**Output**
```ts
{ regionId: string; name: string; state: string; timezone: string;
  currentPeriod: Period; localDate: string; serverNow: string /* ISO */ }
```

**Erros**: `not-found` (não foi possível identificar o município — o app oferece a escolha
manual), `invalid-argument` (coordenadas fora de faixa ou fora do Brasil).

**Efeitos**: cria `regions/{ibgeCode}` se necessário; atualiza `users/{uid}.lastRegionId`.
Coordenadas **não são persistidas**.

---

## listMunicipalities

**Input** `{ state: string }` (UF) → **Output** `{ items: { ibgeCode: string; name: string }[] }`

Lista para a escolha manual de cidade (FR-008).

---

## submitVotes

**Input**
```ts
{ regionId: string;
  localDate: string;   // data local devolvida por resolveRegion quando as perguntas foram exibidas
  votes: { targetPeriod: Period; value: 0|1|2|3|4|5 }[] }   // 1–4 itens, sem períodos repetidos
```

**Output**
```ts
{ localDate: string;
  currentPeriod: Period;
  accepted: Period[];
  rejected: { targetPeriod: Period; reason: "period_ended" | "already_voted" | "not_offered" }[] }
```

**Regras**:
- Período atual e data local calculados com a **hora do servidor** no fuso da região.
- `targetPeriod` aceito somente se ∈ períodos oferecidos agora (atual + restantes do dia).
- `period_ended`: o período já terminou (ex.: perguntas abertas de manhã, confirmadas à tarde) ou
  `localDate` é anterior à data local atual (perguntas abertas às 23:59, confirmadas após 00:00).
- `not_offered`: `localDate` posterior à data local do servidor.
- `already_voted`: já existe `votes/{uid}_{localDate}_{targetPeriod}`.
- Cada voto aceito e o incremento em `tallies` ocorrem na mesma transação.

**Erros**: `invalid-argument`, `not-found` (região inexistente),
`failed-precondition` (nenhum voto aceito; `details.result` traz a mesma estrutura do output).

---

## getForecast

**Input** `{ regionId: string; localDate: string; periods: Period[] }`

**Output**
```ts
{ available: true;
  periods: Partial<Record<Period, { probability: number; willRain: boolean }>>;
  fetchedAt: string }
| { available: false }
```

Usa o cache `forecasts/` (60 min); em falha/timeout do provedor retorna `{ available: false }`
(FR-019) em vez de erro.

---

## deleteAccount

**Input** `{}` → **Output** `{ ok: true }`

Efeitos descritos em [data-model.md](../data-model.md#exclusão-de-conta-lgpd--fr-028).
