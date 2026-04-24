# Planejamento Completo - Sistema de Satisfacao Hospitalar (Sentores)

Data de referencia: 2026-04-24
Objetivo deste documento: servir como base unica para implementacao com GPT Codex.

## Status de Implementacao (Controle de Parada)

- Ultima atualizacao: 2026-04-24
- PONTO_DE_PARADA_ATUAL: fim da Etapa 1 (base inicial) com schema Prisma modelado e API NestJS inicial pronta para evolucao.
- Proximo passo imediato: criar e aplicar migracoes Prisma em banco local e iniciar Etapa 2 (auth + RBAC).

Concluido nesta execucao:
- [x] base do monorepo com scripts iniciais
- [x] estrutura inicial da API (NestJS) com healthcheck
- [x] modulo Prisma e conexao de banco via variavel de ambiente
- [x] modelagem inicial das entidades no schema Prisma
- [x] utilitarios de dominio para regra de turno e nota baixa

Pendencias para continuidade:
- [ ] criar migracao inicial do banco (prisma migrate dev)
- [ ] iniciar modulo de autenticacao (login, refresh, logout)
- [ ] implementar RBAC para usuario_maior, gestor_sentor e operador_sentor

## 1) Contexto e Premissas Confirmadas

- Existe 1 hospital com varios sentores.
- O termo oficial do projeto sera "sentor".
- O usuario maior (administrador principal) cadastra sentores no proprio sistema.
- Cada sentor possui formulario(s) de satisfacao.
- O QR code deve permanecer o mesmo para cada sentor.
- O formulario aceita duas modalidades de resposta:
  - anonima
  - identificada
- No modo identificado, os campos obrigatorios sao:
  - nome
  - telefone
  - CPF
- CPF completo pode ser visualizado por usuario_maior e gestor_sentor (apenas sentores atribuidos).
- Em nota baixa, deve ser coletada sugestao de melhoria obrigatoria.
- A interface deve ter estilizacao moderna, minimalista e de facil entendimento para qualquer usuario.
- Deve existir comparativo por sentor e por turno.
- Turnos sao padroes do sistema (fixos globais).
- Deve existir anti-spam de 10 minutos.
- Deve existir painel com alertas automaticos.

## 2) Objetivos do Sistema

- Coletar satisfacao dos pacientes/acompanhantes de forma simples por QR code.
- Garantir governanca por sentor com usuarios e permissoes.
- Permitir evolucao de formularios sem reimprimir QR code.
- Dar visibilidade gerencial por sentor, turno e periodo.
- Fornecer alertas proativos para tomada de acao rapida.
- Garantir experiencia visual limpa, clara e intuitiva para usuarios tecnicos e nao tecnicos.

## 3) Regras de Negocio Obrigatorias

### 3.1 Regra de QR Code Permanente por Sentor

- Ao criar sentor, o sistema gera um identificador publico unico (slug/token).
- O QR code aponta para URL publica fixa do sentor, por exemplo:
  - /f/{slug_publico_sentor}
- O QR do sentor nao muda ao longo do tempo.
- Mudancas de formulario ocorrem por troca de versao ativa no backend.
- Toda resposta deve registrar:
  - sentor_id
  - formulario_id
  - formulario_versao_id
  - timestamp da coleta

### 3.2 Regra de Versionamento de Formulario

- Formulario sempre tem versoes (v1, v2, v3...).
- Nao alterar historico de versao antiga apos publicada.
- Para mudar perguntas, cria-se nova versao.
- O sentor aponta para uma unica versao ativa por vez.

### 3.3 Regra de Resposta Anonima e Identificada

- O respondente escolhe entre:
  - resposta anonima
  - resposta identificada
- Se identificada, exigir nome, telefone e CPF validos.
- Exigir consentimento LGPD no modo identificado.

### 3.4 Regra Anti-Spam de 10 Minutos

- Bloquear nova resposta no mesmo sentor dentro de 10 minutos com base em sinais combinados:
  - token de sessao/dispositivo
  - hash de IP + user-agent
  - hash de CPF (somente em resposta identificada)
- Se bloqueado:
  - retornar HTTP 429
  - informar tempo restante para nova tentativa
- Registrar bloqueios para monitoramento.
- Em abuso repetido, habilitar captcha.

### 3.5 Regra de Turnos Padroes

- Turno manha: 06:00 ate 13:59
- Turno tarde: 14:00 ate 21:59
- Turno noite: 22:00 ate 05:59
- O turno calculado deve ser persistido na resposta no momento da coleta.

### 3.6 Regra de Alertas Automaticos

Alertas minimos:
- CSAT < 70% nas ultimas 24h por sentor.
- NPS < 0 no periodo selecionado por sentor.
- Queda >= 15 p.p. no CSAT versus periodo anterior.
- Pico de bloqueios anti-spam acima de limiar configurado.

Destinatarios:
- usuario maior
- gestor responsavel pelo sentor

### 3.7 Regra de Nota Baixa e Plano de Acao

- Definir pergunta principal de nota no formulario para classificar satisfacao.
- Regra padrao para nota baixa:
  - CSAT (escala 1..5): nota <= 2
  - NPS (escala 0..10): nota <= 6
- Em nota baixa, exibir campo obrigatorio "sugestao de melhoria".
- Tamanho minimo recomendado da sugestao: 10 caracteres.
- Persistir flag de nota_baixa para uso em relatorios e alertas.

## 4) Perfis e Permissoes (RBAC)

- usuario_maior:
  - acesso total ao hospital
  - cadastra sentores
  - gerencia usuarios, formularios, versoes e alertas
  - acessa todos os relatorios
- gestor_sentor:
  - gerencia formularios/versoes dos sentores atribuidos
  - visualiza relatorios dos sentores atribuidos
  - pode visualizar CPF completo das respostas identificadas dos sentores atribuidos
- operador_sentor:
  - consulta relatorios e exportacoes dos sentores atribuidos
  - visualiza CPF apenas mascarado
  - sem permissao de publicar novas versoes

Acoes criticas que exigem auditoria:
- criar/editar sentor
- publicar versao de formulario
- trocar versao ativa de sentor
- alterar permissao de usuario

## 5) Fluxos Principais

### 5.1 Fluxo Administrativo

1. usuario_maior cria sentor.
2. sistema gera slug publico e QR permanente.
3. usuario cria formulario e publica versao v1.
4. usuario vincula versao ativa ao sentor.
5. em evolucao, usuario publica v2 e troca versao ativa.
6. QR impresso permanece o mesmo.

### 5.2 Fluxo do Respondente (Publico)

1. paciente escaneia QR do sentor.
2. sistema abre formulario ativo do sentor.
3. paciente escolhe resposta anonima ou identificada.
4. sistema valida anti-spam e campos obrigatorios.
5. resposta e gravada com sentor, versao e turno.

## 6) Requisitos Funcionais (RF)

- RF-01: cadastrar sentor.
- RF-02: gerar QR permanente por sentor.
- RF-03: baixar QR em PNG e SVG.
- RF-04: criar formulario e perguntas dinamicas.
- RF-05: versionar formulario.
- RF-06: publicar versao e definir versao ativa por sentor.
- RF-07: coletar resposta publica via QR.
- RF-08: suportar resposta anonima e identificada.
- RF-09: validar CPF, telefone e nome no modo identificado.
- RF-10: aplicar anti-spam de 10 minutos.
- RF-11: calcular turno automaticamente.
- RF-12: dashboard com comparativos por sentor/turno/periodo.
- RF-13: gerar alertas automaticos.
- RF-14: exportar relatorios (CSV/XLSX).
- RF-15: registrar auditoria de acoes criticas.
- RF-16: coletar sugestao de melhoria obrigatoria em nota baixa.
- RF-17: permitir CPF completo para usuario_maior e gestor_sentor com auditoria de acesso.

## 7) Requisitos Nao Funcionais (RNF)

- RNF-01: seguranca com TLS e controle de acesso por perfil.
- RNF-02: conformidade LGPD para dados identificados.
- RNF-03: observabilidade (logs, metricas, alertas tecnicos).
- RNF-04: alta disponibilidade para fluxo publico de resposta.
- RNF-05: baixo tempo de resposta em endpoints publicos.
- RNF-06: rastreabilidade de versoes e auditoria completa.
- RNF-07: escalabilidade horizontal do backend.
- RNF-08: interface responsiva e acessivel para desktop, tablet e mobile.
- RNF-09: padrao visual moderno e minimalista, com linguagem simples e facil entendimento.
- RNF-10: consistencia visual entre painel admin e fluxo publico de resposta.

## 8) Modelo de Dados Recomendado

### 8.1 Entidades

- hospital
  - id, nome, timezone, ativo, created_at, updated_at

- sentor
  - id, hospital_id, nome, codigo, localizacao, ativo, created_at, updated_at

- sentor_qr
  - id, sentor_id, slug_publico_unico, url_publica, qr_png_url, qr_svg_url, created_at
  - regra: UNIQUE(slug_publico_unico), UNIQUE(sentor_id)

- usuario
  - id, hospital_id, nome, email, senha_hash, perfil_global, ativo, created_at, updated_at

- usuario_sentor
  - id, usuario_id, sentor_id, perfil_no_sentor, created_at

- formulario
  - id, hospital_id, nome, descricao, criado_por, status, created_at, updated_at

- formulario_versao
  - id, formulario_id, numero_versao, estrutura_json, publicado_em, publicado_por
  - regra: UNIQUE(formulario_id, numero_versao)

- sentor_formulario_ativo
  - id, sentor_id, formulario_id, versao_id, ativado_em, ativado_por
  - regra: 1 versao ativa por sentor

- resposta
  - id, sentor_id, formulario_id, versao_id, tipo_resposta, nome, telefone, cpf_masked, cpf_hash, cpf_encrypted, consentimento_lgpd, turno, nota_principal, nota_baixa, sugestao_melhoria, ip_hash, user_agent_hash, created_at

- resposta_item
  - id, resposta_id, pergunta_id, tipo_pergunta, valor_texto, valor_numero, valor_json

- alerta
  - id, tipo_alerta, sentor_id, severidade, titulo, descricao, status, disparado_em, resolvido_em

- auditoria
  - id, usuario_id, acao, entidade, entidade_id, antes_json, depois_json, created_at

### 8.2 Observacao de Privacidade

- Nao salvar CPF puro em banco para analytics.
- Salvar CPF mascarado para exibicao e hash para correlacao/anti-spam.
- Salvar versao criptografada de CPF para casos autorizados de consulta.
- CPF completo visivel apenas para usuario_maior e gestor_sentor com vinculo ao sentor.
- Toda visualizacao de CPF completo deve gerar evento de auditoria.
- Restringir acesso a dados identificados por permissao explicita.

## 9) Contrato Inicial de API (MVP)

### 9.1 Auth

- POST /api/auth/login
- POST /api/auth/refresh
- POST /api/auth/logout

### 9.2 Sentores

- POST /api/sentores
- GET /api/sentores
- GET /api/sentores/{id}
- PUT /api/sentores/{id}
- PATCH /api/sentores/{id}/status

### 9.3 QR

- GET /api/sentores/{id}/qr
- POST /api/sentores/{id}/qr/regenerar-imagem

### 9.4 Formularios

- POST /api/formularios
- GET /api/formularios
- PUT /api/formularios/{id}
- POST /api/formularios/{id}/versoes
- POST /api/formularios/{id}/versoes/{versaoId}/publicar

### 9.5 Vinculo Sentor x Formulario Ativo

- PUT /api/sentores/{id}/formulario-ativo
- GET /api/sentores/{id}/formulario-ativo

### 9.6 Publico (QR)

- GET /public/f/{slug}
- GET /api/public/f/{slug}
- POST /api/public/f/{slug}/respostas

### 9.7 Relatorios e Alertas

- GET /api/relatorios/csat?sentorId=&de=&ate=&turno=
- GET /api/relatorios/nps?sentorId=&de=&ate=&turno=
- GET /api/relatorios/comparativo-sentores?de=&ate=&turno=
- GET /api/relatorios/comparativo-turnos?sentorId=&de=&ate=
- GET /api/relatorios/notas-baixas?sentorId=&de=&ate=
- GET /api/alertas
- PATCH /api/alertas/{id}/resolver

### 9.8 Dados Identificados (com permissao)

- GET /api/respostas/{id}/identificacao
- GET /api/respostas/{id}/identificacao/auditoria

## 10) Regras de Validacao

### 10.1 CPF

- validar digitos verificadores
- rejeitar sequencias invalidas (ex.: 11111111111)

### 10.2 Telefone

- validar formato BR (DDD + numero)
- normalizar para padrao E.164 quando possivel

### 10.3 Nome

- obrigatorio
- tamanho minimo recomendado: 3

### 10.4 Nota Baixa

- Em nota baixa, campo "sugestao de melhoria" e obrigatorio.
- Tamanho minimo recomendado: 10 caracteres.
- Tamanho maximo recomendado: 1000 caracteres.
- Bloquear envio da resposta sem sugestao quando nota_baixa = true.

## 11) Regras de Calculo de Indicadores

- CSAT = (respostas positivas / total respostas) * 100
- NPS = %promotores - %detratores

Definicoes recomendadas:
- CSAT positivo: notas 4 e 5 em escala de 1..5
- NPS:
  - detratores: 0..6
  - neutros: 7..8
  - promotores: 9..10

## 12) Painel Gerencial

### 12.1 Cards Principais

- CSAT geral
- NPS geral
- total de respostas
- percentual anonimas x identificadas
- bloqueios anti-spam (ultimas 24h)
- total de notas baixas (ultimas 24h)

### 12.2 Comparativos

- ranking de sentores por CSAT
- ranking de sentores por NPS
- comparativo por turno (manha/tarde/noite)
- tendencia temporal (7, 30, 90 dias)
- principais sugestoes de melhoria por sentor

### 12.3 Filtros

- periodo
- sentor
- turno
- tipo de resposta (anonima/identificada)
- somente notas baixas

### 12.4 Diretrizes de UX/UI no Painel

- layout limpo, com hierarquia visual clara e baixa carga cognitiva.
- uso de espacos em branco para melhorar leitura e foco.
- tipografia legivel com contraste adequado.
- componentes consistentes para formularios, tabelas e graficos.
- estados de carregamento, vazio e erro com mensagens simples.
- navegacao intuitiva para qualquer perfil de usuario.

## 13) Seguranca, LGPD e Compliance

- minimo privilegio por perfil.
- criptografia em transito (TLS).
- criptografia de dados sensiveis em repouso.
- consentimento explicito para resposta identificada.
- acesso a CPF completo somente por perfil autorizado com auditoria obrigatoria.
- politica de retencao de dados definida por prazo.
- trilha de auditoria para mudancas sensiveis.

## 14) Monitoramento e Operacao

- logs estruturados por request_id.
- metricas de API (latencia, erro, throughput).
- metricas de negocio (respostas/hora, CSAT diario, bloqueios anti-spam).
- alertas tecnicos (queda de servico, aumento de erro 5xx).

## 15) Roadmap de Entrega (5 Sprints)

- Sprint 1:
  - auth, usuarios, perfis, cadastro de sentor
  - geracao de QR permanente por sentor

- Sprint 2:
  - builder de formulario
  - versionamento e publicacao
  - vinculo de versao ativa por sentor

- Sprint 3:
  - fluxo publico via QR
  - resposta anonima/identificada
  - validacoes e anti-spam 10 min

- Sprint 4:
  - dashboard executivo
  - comparativos por sentor e turno
  - exportacao CSV/XLSX

- Sprint 5:
  - alertas automaticos
  - auditoria completa
  - hardening de seguranca e homologacao

## 16) Criterios de Aceite (Checklist)

- CA-01: ao criar sentor, QR fixo e URL publica sao gerados.
- CA-02: troca de versao ativa nao altera o QR do sentor.
- CA-03: resposta identificada sem nome/telefone/CPF valido e rejeitada.
- CA-04: nova resposta no mesmo sentor em menos de 10 minutos e bloqueada.
- CA-05: turno calculado e persistido corretamente.
- CA-06: relatorios exibem comparacao por sentor e por turno.
- CA-07: alertas disparam com base nos limiares definidos.
- CA-08: acoes criticas aparecem na auditoria.
- CA-09: gestor_sentor e usuario_maior conseguem visualizar CPF completo apenas de sentores permitidos.
- CA-10: toda visualizacao de CPF completo gera log de auditoria.
- CA-11: em nota baixa, sistema obriga preenchimento de sugestao de melhoria.
- CA-12: interface final atende proposta moderna e minimalista com navegacao simples e entendimento rapido.

## 17) Prompt Base para GPT Codex

Use o texto abaixo como prompt inicial no GPT Codex:

"""
Voce e um arquiteto e engenheiro de software senior. Implemente o sistema de satisfacao hospitalar descrito neste documento, mantendo rigorosamente:
1) termo de dominio "sentor"
2) QR permanente por sentor
3) resposta anonima e identificada com nome/telefone/CPF obrigatorios no modo identificado
4) anti-spam de 10 minutos
5) turnos padroes (manha/tarde/noite)
6) dashboard com comparativos por sentor e turno
7) painel com alertas automaticos
8) visualizacao de CPF completo permitida para usuario_maior e gestor_sentor autorizado
9) em nota baixa, coleta obrigatoria de sugestao de melhoria
10) interface moderna e minimalista, com foco em clareza para qualquer usuario

Objetivos tecnicos:
- propor arquitetura backend/frontend
- definir schema de banco e migracoes
- implementar APIs REST com validacoes e seguranca
- implementar coleta publica via QR
- implementar relatorios e alertas
- auditar acessos a dados sensiveis (especialmente CPF completo)
- incluir testes automatizados (unitarios e integracao)
- documentar execucao local e deploy

Entregue por etapas:
- Etapa 1: modelo de dados e migracoes
- Etapa 2: autenticacao e RBAC
- Etapa 3: formularios/versionamento/publicacao
- Etapa 4: fluxo publico com anti-spam
- Etapa 5: dashboard/relatorios/alertas
- Etapa 6: testes, observabilidade e hardening

Sempre explique decisoes arquiteturais e riscos.
"""

## 18) Riscos e Mitigacoes

- risco: baixa adesao de respostas por QR.
  - mitigacao: UX simples, formulario curto, comunicacao visual clara no sentor.

- risco: fraude/spam em respostas publicas.
  - mitigacao: anti-spam 10 min, hash de sinais, captcha em abuso.

- risco: vazamento de dados identificados.
  - mitigacao: minimo privilegio, criptografia, auditoria e monitoramento.

- risco: confusao por troca de formulario.
  - mitigacao: versionamento formal + historico + trilha de auditoria.

## 19) Definicao de Pronto (DoD)

- funcionalidades implementadas e testadas.
- criterios de aceite atendidos.
- cobertura minima de testes definida pelo time.
- documentacao tecnica atualizada.
- monitoramento e alertas operacionais ativos.
- homologacao com usuario maior concluida.

## 20) Stack Recomendada para Implementacao com React

### 20.1 Frontend (React)

- React 18 + TypeScript + Vite
- React Router (rotas admin e publicas)
- TanStack Query (cache, fetch e invalidacao de dados)
- React Hook Form + Zod (formularios e validacao)
- Tailwind CSS + shadcn/ui (componentes e design system)
- ECharts (dashboards e comparativos)
- TanStack Table (tabelas de relatorio e filtros)
- Day.js + plugin timezone (periodos e turnos)
- qrcode.react (preview de QR no painel)
- Zustand (estado local de UI, quando necessario)

### 20.2 Backend Compativel

- Node.js LTS
- NestJS (API modular com boas praticas)
- Prisma ORM (schema e migracoes)
- PostgreSQL (persistencia principal)
- Redis (anti-spam, cache e rate-limit)
- BullMQ (jobs assincronos para alertas e rotinas)
- Swagger/OpenAPI (documentacao de API)

### 20.3 Bibliotecas de Regra de Negocio

- cpf-cnpj-validator (validacao de CPF)
- libphonenumber-js (telefone BR)
- rate-limiter-flexible (protecoes adicionais de abuso)
- Cloudflare Turnstile ou reCAPTCHA (captcha em abuso repetido)

### 20.4 Qualidade, Testes e Observabilidade

- Vitest + Testing Library (frontend)
- Jest + Supertest (backend)
- Playwright (testes E2E)
- ESLint + Prettier (padrao de codigo)
- Husky + lint-staged (qualidade em pre-commit)
- Sentry (erros frontend/backend)
- OpenTelemetry + Prometheus/Grafana (metricas e traces)

### 20.5 Estrutura de Projeto Recomendada (Monorepo)

- apps/web-admin (painel administrativo React)
- apps/web-public (pagina publica de resposta por QR)
- apps/api (backend NestJS)
- packages/ui (componentes compartilhados)
- packages/types (tipos compartilhados frontend/backend)
- packages/config (eslint, tsconfig e padroes)

### 20.6 Racional da Stack

- Permite alta produtividade no frontend com TypeScript e componentes reutilizaveis.
- Facilita manutencao de regras de negocio (versionamento, anti-spam e alertas).
- Suporta evolucao do projeto sem trocar QR dos sentores.
- Garante base robusta para comparativos por sentor e por turno.

## 21) Prompt GPT Codex Especifico para Stack React

Use este prompt quando quiser que o Codex implemente diretamente com a stack acima:

"""
Implemente este sistema de satisfacao hospitalar com as seguintes restricoes obrigatorias:

Dominio e regras:
1) usar o termo de dominio "sentor"
2) QR permanente por sentor (sem trocar link ao mudar formulario)
3) resposta anonima e identificada
4) no modo identificado, exigir nome, telefone e CPF
5) aplicar anti-spam de 10 minutos
6) usar turnos padroes: manha (06:00-13:59), tarde (14:00-21:59), noite (22:00-05:59)
7) painel com comparativos por sentor/turno/periodo
8) alertas automaticos de CSAT/NPS e anomalias de anti-spam
9) permitir CPF completo para usuario_maior e gestor_sentor com auditoria obrigatoria de acesso
10) em nota baixa, obrigar campo de sugestao de melhoria
11) aplicar estilizacao moderna e minimalista, com UX simples para qualquer usuario

Stack obrigatoria:
- Frontend: React 18 + TypeScript + Vite + React Router + TanStack Query + React Hook Form + Zod + Tailwind + shadcn/ui + ECharts
- Backend: NestJS + Prisma + PostgreSQL + Redis + BullMQ
- Testes: Vitest/Testing Library, Jest/Supertest e Playwright

Entregue por etapas:
- Etapa 1: schema de dados e migracoes Prisma
- Etapa 2: auth + RBAC
- Etapa 3: formularios, versoes e publicacao por sentor
- Etapa 4: fluxo publico por QR com anti-spam
- Etapa 5: dashboard, relatorios e alertas
- Etapa 6: testes automatizados, observabilidade e hardening

Requisitos de qualidade:
- gerar codigo tipado, limpo e testavel
- incluir validacoes de CPF e telefone
- documentar setup local e comandos de execucao
- explicar decisoes arquiteturais e riscos
"""
