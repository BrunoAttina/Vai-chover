# Contract: Firestore Security Rules

Princípio: **deny by default**. O cliente só lê; toda escrita de dado de negócio passa pelas
Cloud Functions (Admin SDK ignora as regras).

Função auxiliar: `validSession()` = `request.auth != null` **e**
`request.time < timestamp(request.auth.token.auth_time * 1000) + duration.value(60, 'd')`.

| Coleção | read | write | Observação |
|---------|------|-------|------------|
| `users/{uid}` | `validSession() && request.auth.uid == uid` | negado | perfil via `completeProfile` |
| `loginCodes/*` | negado | negado | só servidor |
| `mail/*` | negado | negado | só servidor/extensão |
| `regions/*` | `validSession()` | negado | |
| `votes/{id}` | `validSession() && resource.data.uid == request.auth.uid` | negado | dono lê os próprios votos e resultado individual |
| `tallies/*` | `validSession()` | negado | apenas números agregados (FR-027) |
| `forecasts/*` | `validSession()` | negado | |
| `periodAnalyses/*` | `validSession()` | negado | |
| demais caminhos | negado | negado | |

## Casos de teste obrigatórios (`@firebase/rules-unit-testing`)

1. Não autenticado não lê nenhuma coleção.
2. Usuário A não lê `users/B` nem votos de B.
3. Usuário autenticado não cria/edita/apaga em nenhuma coleção (inclusive o próprio voto e
   `tallies`).
4. Usuário com `auth_time` de 61 dias atrás não lê `tallies`.
5. `loginCodes` e `mail` inacessíveis mesmo autenticado.
6. Consulta em `votes` sem filtro `uid == request.auth.uid` é negada.
