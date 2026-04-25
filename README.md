# Sistema de Satisfacao Hospitalar (Sentores)

Base inicial do monorepo para implementacao do sistema descrito em `planejamento-sistema-satisfacao-gpt-codex.md`.

## Estrutura atual

- `apps/api`: API backend com NestJS + Prisma (Etapa 2 iniciada: auth + RBAC base)
- `apps/web-admin`: reservado para painel administrativo
- `apps/web-public`: reservado para fluxo publico por QR
- `packages/*`: reservado para pacotes compartilhados

## Pre-requisitos

- Node.js 20+
- npm 10+
- PostgreSQL 15+ (local ou remoto)

## Setup local (PowerShell)

1. Instale as dependencias do monorepo:

	```bash
	npm install
	```

2. Crie o arquivo de ambiente da API a partir do exemplo:

	```powershell
	Copy-Item apps/api/.env.example apps/api/.env
	```

3. Ajuste os valores em `apps/api/.env`:

	- `DATABASE_URL` para seu PostgreSQL
	- `PUBLIC_BASE_URL` para a URL base do ambiente (ex.: `http://localhost:3333`)

4. Gere o Prisma Client e execute a migracao inicial:

	```bash
	npm run prisma:generate
	npm run prisma:migrate
	```

5. Crie/atualize usuario administrador inicial:

	```bash
	npm run prisma:seed
	```

6. Inicie a API em desenvolvimento:

	```bash
	npm run dev:api
	```

7. Valide o health check:

	- `http://localhost:3333/api/health`

## Auth (MVP)

Endpoints disponiveis:

- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`

Payload de login:

```json
{
  "email": "admin@sarisfacao.local",
  "senha": "Admin@123456"
}
```

Payload de refresh:

```json
{
  "refreshToken": "<token>"
}
```

Payload de logout:

```json
{
	"refreshToken": "<token>"
}
```

Observacao:

- O refresh token e persistido em sessao no banco.
- No `refresh`, o token anterior e revogado e um novo par de tokens e emitido (rotacao).
- No `logout`, a sessao vinculada ao refresh token informado e revogada.

## Sentores (MVP protegido)

Todos os endpoints abaixo exigem Bearer token no header `Authorization`.

- `POST /api/sentores` (somente `USUARIO_MAIOR`)
- `GET /api/sentores` (`USUARIO_MAIOR`, `GESTOR_SENTOR`, `OPERADOR_SENTOR`)
- `GET /api/sentores/:id` (`USUARIO_MAIOR`, `GESTOR_SENTOR`, `OPERADOR_SENTOR`)
- `PUT /api/sentores/:id` (somente `USUARIO_MAIOR`)
- `PATCH /api/sentores/:id/status` (somente `USUARIO_MAIOR`)

No cadastro, o sistema ja cria o QR permanente com slug unico e URL publica.

## Scripts disponiveis

- `npm install`
- `npm run dev:api`
- `npm run build`
- `npm run start:api`
- `npm run prisma:generate`
- `npm run prisma:migrate`
- `npm run prisma:seed`
- `npm run prisma:format`
