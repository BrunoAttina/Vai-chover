# Data Model: Vai chover?

**Feature**: 001-rain-prediction-voting | **Storage**: Cloud Firestore (`southamerica-east1`)

Convenções:
- `localDate`: data no fuso da região, formato `YYYY-MM-DD`; a madrugada (00:00–05:59) pertence
  ao novo dia.
- `Period`: `"madrugada" | "manha" | "tarde" | "noite"`.
- `RainValue`: inteiro 0–5 (`0` Não vai chover, `1` Garoa, `2` Chuva fraca, `3` Chuva
  normal/média, `4` Chuva intensa, `5` Pé-d'água).
- Datas/horas armazenadas como `Timestamp` (UTC).
- "Server-only" = só Cloud Functions escrevem (Admin SDK); as regras negam escrita do cliente.

Permissões detalhadas em [contracts/firestore-rules.md](contracts/firestore-rules.md).

---

## users/{uid}

Perfil da pessoa. `uid` = UID do Firebase Auth.

| Campo | Tipo | Regras |
|-------|------|--------|
| `displayName` | string | obrigatório, 2–30 caracteres após `trim` (FR-002) |
| `emailLower` | string | e-mail normalizado em minúsculas; único (garantido pelo Firebase Auth) |
| `createdAt` | Timestamp | definido na criação |
| `lastRegionId` | string \| null | último município usado (código IBGE) |

Escrita: server-only (`completeProfile`, `verifyLoginCode`). Leitura: apenas o próprio usuário.

---

## loginCodes/{emailHash}

Código OTP pendente. `emailHash` = HMAC-SHA256 do e-mail normalizado (não expõe o e-mail no ID).

| Campo | Tipo | Regras |
|-------|------|--------|
| `codeHash` | string | HMAC-SHA256 do código de 6 dígitos com segredo `OTP_PEPPER` |
| `expiresAt` | Timestamp | criação + 15 min (FR-004); política de TTL do Firestore remove o doc |
| `attempts` | number | 0–5; ao atingir 5, o código é invalidado |
| `pendingDisplayName` | string \| null | nome informado no cadastro, aplicado no primeiro login |
| `requestTimestamps` | Timestamp[] | envios da última hora; > 5 → `resource-exhausted` (FR-006) |

**Estados**: `issued` → (`verified` ⇒ documento apagado) | (`expired` ⇒ removido) |
(`locked` após 5 tentativas). Um novo envio substitui o código anterior.

Acesso: server-only (leitura e escrita negadas ao cliente).

---

## mail/{autoId}

Fila consumida pela extensão **Trigger Email**. Campos: `to`, `message.subject`, `message.text`,
`message.html`. Server-only. TTL de 7 dias.

---

## regions/{ibgeCode}

Município. `ibgeCode` = código IBGE de 7 dígitos.

| Campo | Tipo | Regras |
|-------|------|--------|
| `name` | string | nome oficial (ex.: "São Paulo") |
| `state` | string | UF, 2 letras |
| `timezone` | string | IANA (ex.: `America/Sao_Paulo`, `America/Manaus`) |
| `lat`, `lon` | number | centróide do município (dado público do IBGE, não do usuário) |

Criado sob demanda por `resolveRegion`. Leitura: autenticados. Escrita: server-only.

---

## votes/{uid}_{localDate}_{period}

Palpite de uma pessoa para um período-alvo. O ID determinístico garante **um voto por pessoa por
período por data** (FR-013).

| Campo | Tipo | Regras |
|-------|------|--------|
| `uid` | string | dono |
| `regionId` | string | município no momento do voto |
| `localDate` | string | data local do período-alvo |
| `targetPeriod` | Period | período sobre o qual é o palpite |
| `askedInPeriod` | Period | período em que a pergunta foi feita |
| `value` | RainValue | 0–5 |
| `createdAt` | Timestamp | hora do servidor |
| `matchedRegion` | boolean \| null | preenchido no fechamento: `value == regionRoundedMean` (FR-022) |
| `regionRoundedMean` | RainValue \| null | média arredondada da região no fechamento |

**Validações (submitVotes)**: `targetPeriod` ∈ período atual do servidor + períodos restantes do
dia (FR-011/FR-014); `value` inteiro 0–5; não pode existir voto com o mesmo ID; imutável depois de
criado (exceto os campos de fechamento, escritos pelo servidor).

Leitura: apenas o dono. Escrita: server-only.

---

## tallies/{regionId}_{localDate}_{period}

Contagem agregada (FR-016). Atualizada na mesma transação do voto.

| Campo | Tipo | Regras |
|-------|------|--------|
| `regionId`, `localDate`, `period` | — | chaves |
| `counts` | number[6] | `counts[i]` = votos com valor `i` |
| `total` | number | soma de `counts` |
| `sum` | number | soma dos valores (para a média) |
| `periodEndsAt` | Timestamp | fim do período no fuso da região (UTC) |
| `closed` | boolean | `true` após a análise |

Índice composto: `closed ASC, periodEndsAt ASC` (consulta do job de fechamento).
Leitura: autenticados (apenas números agregados — FR-027). Escrita: server-only.

---

## forecasts/{regionId}_{localDate}

Cache da previsão oficial (FR-017).

| Campo | Tipo | Regras |
|-------|------|--------|
| `periods` | map<Period, `{ probability: number (0–100), willRain: boolean }`> | `willRain = probability ≥ 50` (FR-018) |
| `fetchedAt` | Timestamp | válido por 60 min |
| `expiresAt` | Timestamp | TTL (2 dias) |

Leitura: autenticados. Escrita: server-only (`getForecast`).

---

## periodAnalyses/{regionId}_{localDate}_{period}

Resultado do fechamento (FR-020 a FR-026). ID determinístico ⇒ idempotente.

| Campo | Tipo | Regras |
|-------|------|--------|
| `votes` | number | total considerado |
| `mean` | number \| null | `sum / total` |
| `roundedMean` | RainValue \| null | arredondamento "meio para cima" (FR-021) |
| `crowdSaysRain` | boolean \| null | `roundedMean ≥ 1` |
| `observedPrecipitationMm` | number \| null | soma no período |
| `observedRain` | boolean \| null | `observedPrecipitationMm ≥ 0.1` |
| `status` | enum | `pending` \| `majorityRight` \| `majorityWrong` \| `noData` |
| `observationAttempts` | number | tentativas de obter a chuva observada |
| `closedAt` | Timestamp | criação |
| `resolvedAt` | Timestamp \| null | quando o status deixou de ser `pending` |

**Transições de estado**:

```text
(período termina) ──► total == 0 ───────────────────────────► noData
                  └─► total > 0 ──► pending ──► observado ──► majorityRight | majorityWrong
                                         └──── 24 h sem dado ─► noData
```

Leitura: autenticados. Escrita: server-only.

---

## Relacionamentos

```text
users 1 ──── * votes * ──── 1 regions
regions 1 ── * tallies (1 por data × período)
regions 1 ── * forecasts (1 por data)
tallies 1 ── 0..1 periodAnalyses
votes * ──── 1 periodAnalyses (via regionId + localDate + targetPeriod)
```

## Exclusão de conta (LGPD — FR-028)

`deleteAccount` apaga `users/{uid}`, todos os `votes` do usuário e a conta do Firebase Auth. Votos
de períodos **ainda abertos** são descontados de `tallies`; votos de períodos já fechados
permanecem apenas como números agregados anônimos em `tallies`/`periodAnalyses`.
