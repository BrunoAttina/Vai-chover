# Contract: Integração Open-Meteo (consumida pelas Cloud Functions)

**Endpoint**: `GET https://api.open-meteo.com/v1/forecast`

## Requisição

| Parâmetro | Valor |
|-----------|-------|
| `latitude`, `longitude` | centróide da região (`regions/{id}`) |
| `hourly` | `precipitation_probability,precipitation` |
| `timezone` | `regions/{id}.timezone` |
| `start_date`, `end_date` | `localDate` (previsão) ou data do período fechado (observado) |

- Timeout: 5 s; 1 nova tentativa com espera de 1 s em erro 5xx/timeout.
- Plano comercial (se aplicável): parâmetro `apikey` lido do Secret Manager (`OPEN_METEO_API_KEY`).

## Resposta consumida (subconjunto)

```json
{
  "timezone": "America/Sao_Paulo",
  "hourly": {
    "time": ["2026-11-21T00:00", "2026-11-21T01:00", "..."],
    "precipitation_probability": [10, 15, "..."],
    "precipitation": [0.0, 0.2, "..."]
  }
}
```

Validada com schema `zod`; resposta fora do formato = provedor indisponível.

## Mapeamento para o domínio

Horas por período (hora local): madrugada 00–05, manhã 06–11, tarde 12–17, noite 18–23.

- **Probabilidade do período** = `max(precipitation_probability)` nas horas do período (inteiro
  0–100). `willRain = probability >= 50`.
- **Precipitação observada** = `sum(precipitation)` nas horas do período (mm), somente quando
  todas as horas do período já passaram. `observedRain = soma >= 0.1`.
- Valores `null` em alguma hora do período → dado indisponível para aquele período.

## Testes de contrato

Fixtures gravadas em `functions/tests/contract/fixtures/` (dia com chuva, dia seco, resposta com
`null`, erro 500, timeout) usadas com `nock`; um teste opcional (`npm run test:live`, fora do CI
obrigatório) valida o formato contra a API real.
