# Contract: Telas e navegação (Expo Router)

Textos de interface em pt-BR. Cada tela tem `testID` estável para RNTL e Maestro.

```text
Inicialização
 ├─ sem sessão válida ─► /sign-in ◄──► /sign-up
 │                         └─► /verify-code ─► (needsProfile) /profile
 └─ com sessão ─────────► /location ─► /vote ─► /results
                                        └─ (já votou neste período) ─► /results
/account (acessível pelo cabeçalho): nome, sair, excluir conta
```

| Rota | Conteúdo | Ações / regras |
|------|----------|----------------|
| `/sign-up` | campos Nome de exibição, E-mail | valida 2–30 chars e e-mail; chama `requestLoginCode` |
| `/sign-in` | campo E-mail | chama `requestLoginCode` |
| `/verify-code` | campo de 6 dígitos, "Reenviar código" (contagem regressiva 60 s) | `verifyLoginCode` → `signInWithCustomToken`; mensagens para `invalid_code`, `expired`, `locked`, `resource-exhausted` |
| `/profile` | campo Nome de exibição | `completeProfile` |
| `/location` | explica o uso da localização; pede permissão | concedida → `resolveRegion(gps)`; negada/`not-found` → seletor UF + município (`listMunicipalities`, `resolveRegion(manual)`) |
| `/vote` | cabeçalho com município e período; 1–4 perguntas (`questions.ts`), cada uma com `RainSlider` 0–5 e rótulo do valor; seção "Como foi o último período" se houver | "Confirmar" habilitado só com todas respondidas; `submitVotes`; avisa sobre itens `rejected` |
| `/results` | por período-alvo: pergunta + `VoteBars` com contagens 0–5 (inclusive zeros); abaixo, `ForecastCard` ("Vai chover"/"Não vai chover" + %) ou "Previsão temporariamente indisponível" | contagens em tempo real via `onSnapshot` em `tallies`; previsão via `getForecast` |
| `/account` | nome, e-mail | "Sair"; "Excluir conta" com confirmação → `deleteAccount` |

## Componente `RainSlider`

- `minimumValue=0`, `maximumValue=5`, `step=1`; sem valor inicial selecionado até a primeira
  interação (evita voto "0" acidental).
- Exibe "N - Rótulo" (ex.: "3 - Chuva normal/média").
- Acessível: `accessibilityLabel` com a pergunta e `accessibilityValue` com o rótulo.

## Componente `LastPeriodCard`

- "Seu palpite: N - Rótulo · Média da cidade: M - Rótulo" + "Você pensou como a maioria" /
  "Você pensou diferente da maioria".
- "A maioria acertou" / "A maioria errou" / "Aguardando dados da chuva real" / "Sem dados".
