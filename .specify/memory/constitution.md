<!--
Sync Impact Report
- Version change: (template, unversioned) → 1.0.0
- Modified principles (placeholder → new title):
  - [PRINCIPLE_1_NAME] → I. Código Limpo (Clean Code)
  - [PRINCIPLE_2_NAME] → II. Testes Automatizados em Tudo (NÃO NEGOCIÁVEL)
  - [PRINCIPLE_3_NAME] → III. Segurança por Padrão
  - [PRINCIPLE_4_NAME] → IV. Qualidade Verificável e Automatizada
  - [PRINCIPLE_5_NAME] → V. Simplicidade e Manutenibilidade
- Added sections:
  - Requisitos de Segurança (SECTION_2)
  - Fluxo de Desenvolvimento e Portões de Qualidade (SECTION_3)
  - Governance (filled)
- Removed sections: none
- Follow-up TODOs: none (stack tecnológica ainda não definida; princípios são
  agnósticos de linguagem e serão concretizados no plan.md de cada feature)
-->

# Vai Chover Constitution

## Core Principles

### I. Código Limpo (Clean Code)

Todo código do projeto MUST seguir as práticas de Clean Code:

- Nomes MUST revelar intenção (variáveis, funções, classes, módulos); abreviações
  obscuras e nomes genéricos (`data`, `tmp`, `foo`) são proibidos fora de escopos triviais.
- Funções MUST ter responsabilidade única e ser pequenas; uma função que exige
  comentários para explicar "o que" faz MUST ser refatorada.
- Módulos MUST respeitar os princípios SOLID e separar regras de negócio de
  detalhes de infraestrutura (I/O, rede, banco, UI).
- Duplicação de lógica (DRY) MUST ser eliminada quando a mesma regra aparece em
  mais de um lugar.
- Comentários MUST explicar o "porquê", nunca repetir o "o quê"; código morto e
  código comentado MUST NOT ser commitados.
- Erros MUST ser tratados explicitamente; exceções MUST NOT ser silenciadas.

**Racional**: código legível reduz defeitos, acelera revisões e torna o projeto
sustentável a longo prazo.

### II. Testes Automatizados em Tudo (NÃO NEGOCIÁVEL)

Toda alteração de comportamento MUST vir acompanhada de testes automatizados:

- Desenvolvimento orientado a testes (TDD) é o fluxo padrão: escrever o teste →
  confirmar que falha → implementar → refatorar (Red-Green-Refactor).
- Toda regra de negócio MUST ter testes unitários; toda integração externa
  (APIs, banco, sistema de arquivos) MUST ter testes de integração ou de contrato;
  todo fluxo crítico de usuário MUST ter teste ponta a ponta.
- Toda correção de bug MUST incluir um teste de regressão que reproduza o bug.
- Cobertura de linhas e de branches MUST ser ≥ 80% no código novo ou alterado;
  queda de cobertura global bloqueia o merge.
- Testes MUST ser determinísticos, independentes entre si e executáveis
  localmente com um único comando; testes instáveis (flaky) MUST ser corrigidos
  ou removidos imediatamente, nunca ignorados.
- Dependências externas em testes unitários MUST ser isoladas (mocks, fakes ou stubs).

**Racional**: testes são a rede de segurança que permite refatorar e evoluir o
código com confiança; código sem teste é considerado código incompleto.

### III. Segurança por Padrão

Segurança MUST ser considerada desde o design, não adicionada depois:

- Toda entrada externa (usuário, API, arquivo, variável de ambiente) MUST ser
  validada e sanitizada antes do uso.
- Segredos (chaves de API, senhas, tokens) MUST NOT ser commitados no
  repositório; MUST ser fornecidos via variáveis de ambiente ou cofre de segredos.
- O código MUST seguir as recomendações do OWASP Top 10 aplicáveis ao contexto
  (injeção, XSS, autenticação quebrada, exposição de dados sensíveis, etc.).
- Comunicação com serviços externos MUST usar canais criptografados (HTTPS/TLS).
- Princípio do menor privilégio MUST ser aplicado a credenciais, permissões e acessos.
- Mensagens de erro e logs MUST NOT expor dados sensíveis ou detalhes internos.

**Racional**: falhas de segurança têm custo alto e frequentemente irreversível;
prevenir é mais barato que remediar.

### IV. Qualidade Verificável e Automatizada

Qualidade MUST ser verificada por ferramentas, não apenas por opinião:

- Linter e formatador automáticos MUST estar configurados e o código MUST
  passar sem erros nem avisos não justificados.
- Análise estática (incluindo tipagem estática quando a linguagem suportar)
  MUST rodar em cada alteração.
- Varredura de vulnerabilidades em dependências e de segredos vazados MUST rodar
  no pipeline de integração contínua.
- O pipeline de CI MUST executar lint, análise estática, testes e verificação de
  cobertura; qualquer falha bloqueia o merge.

**Racional**: verificações automatizadas são consistentes, rápidas e impedem que
regressões de qualidade cheguem à branch principal.

### V. Simplicidade e Manutenibilidade

- Soluções MUST ser as mais simples que atendam aos requisitos (KISS, YAGNI);
  funcionalidades especulativas MUST NOT ser implementadas.
- Toda complexidade adicional (nova camada, padrão, dependência ou serviço) MUST
  ser justificada por escrito no plano da feature.
- Novas dependências MUST ser avaliadas quanto a manutenção ativa, licença e
  histórico de segurança antes de serem adicionadas.

**Racional**: complexidade desnecessária aumenta a superfície de bugs e de ataque
e dificulta testes e manutenção.

## Requisitos de Segurança

- Dependências MUST ser fixadas em versões explícitas (lockfile versionado) e
  atualizadas regularmente; vulnerabilidades de severidade alta ou crítica MUST
  ser corrigidas antes do próximo release.
- Arquivos de configuração com segredos (`.env`, credenciais) MUST constar no
  `.gitignore`; um arquivo de exemplo sem valores reais (`.env.example`) MUST
  documentar as variáveis necessárias.
- Chamadas a APIs externas (ex.: provedores de dados meteorológicos) MUST ter
  timeout, tratamento de falhas e limites de taxa respeitados.
- Dados pessoais de usuários, se coletados, MUST ser minimizados e tratados em
  conformidade com a LGPD.

## Fluxo de Desenvolvimento e Portões de Qualidade

- Todo trabalho MUST seguir o fluxo Spec Kit: especificação → plano → tarefas →
  implementação; o plano de cada feature MUST incluir uma verificação de
  conformidade com esta constituição.
- Toda alteração MUST ser integrada via pull request com revisão de código; a
  revisão MUST verificar legibilidade, testes, segurança e aderência aos princípios.
- Uma alteração só é considerada concluída (Definition of Done) quando:
  testes escritos e passando, cobertura mínima atingida, lint e análise estática
  sem erros, varreduras de segurança sem achados altos/críticos e revisão aprovada.
- Commits MUST ser pequenos, coesos e com mensagens descritivas (Conventional Commits).

## Governance

- Esta constituição prevalece sobre quaisquer outras práticas ou convenções do
  projeto. Em caso de conflito, a constituição vence.
- Emendas MUST ser propostas por escrito (via `/speckit-constitution`), conter
  justificativa, ser revisadas e aprovadas antes de entrar em vigor, e incluir
  plano de migração quando afetarem código existente.
- Versionamento semântico da constituição:
  - MAJOR: remoção ou redefinição incompatível de princípios ou governança.
  - MINOR: novo princípio/seção ou expansão material de orientação.
  - PATCH: esclarecimentos, redação e correções não semânticas.
- Todo pull request e toda revisão MUST verificar conformidade com esta
  constituição; exceções MUST ser documentadas e justificadas na seção de
  rastreamento de complexidade do plano da feature.
- A conformidade MUST ser reavaliada a cada nova feature durante o `/speckit-plan`
  e o `/speckit-analyze`.

**Version**: 1.0.0 | **Ratified**: 2026-11-20 | **Last Amended**: 2026-11-20
