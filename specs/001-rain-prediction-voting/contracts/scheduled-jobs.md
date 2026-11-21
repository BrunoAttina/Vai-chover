# Contract: Scheduled Jobs

## closePeriods

- **Trigger**: `onSchedule("every 15 minutes")`, região `southamerica-east1`, timeout 540 s,
  instância única (`maxInstances: 1`).
- **Idempotência**: todos os documentos criados usam IDs determinísticos; reexecutar não duplica
  resultados (FR-026).

### Etapa 1 — Fechar períodos encerrados

Consulta `tallies` com `closed == false` e `periodEndsAt <= now` (lotes de 200). Para cada um, em
transação:

1. Se `periodAnalyses/{id}` já existe → apenas marcar `closed = true`.
2. `total == 0` → criar análise com `status = "noData"`.
3. Senão: `mean = sum / total`; `roundedMean = floor(mean + 0.5)`;
   `crowdSaysRain = roundedMean >= 1`; `status = "pending"`; marcar `closed = true`.

Depois da transação, atualizar os votos do período (`regionId`, `localDate`,
`targetPeriod`) com `matchedRegion` e `regionRoundedMean`, em `BulkWriter`.

### Etapa 2 — Resolver chuva observada

Consulta `periodAnalyses` com `status == "pending"`. Para cada um, busca a precipitação das horas
do período ([open-meteo.md](open-meteo.md)):

- dado disponível → `observedRain = soma >= 0.1`; `status = crowdSaysRain == observedRain ?
  "majorityRight" : "majorityWrong"`; `resolvedAt = now`.
- indisponível → `observationAttempts++`; se `now - closedAt > 24 h` → `status = "noData"`.

Chamadas ao Open-Meteo agrupadas por região (uma requisição por região/data, cobrindo todos os
períodos pendentes).

### Observabilidade

Log estruturado por execução: `talliesClosed`, `analysesResolved`, `analysesPending`,
`providerErrors`, duração. Nenhum dado pessoal nos logs.

### Índices necessários

- `tallies`: `closed ASC, periodEndsAt ASC`
- `periodAnalyses`: `status ASC, closedAt ASC`
- `votes`: `regionId ASC, localDate ASC, targetPeriod ASC`
