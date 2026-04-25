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

3. Ajuste o valor de `DATABASE_URL` em `apps/api/.env`.

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

## Scripts disponiveis

- `npm install`
- `npm run dev:api`
- `npm run build`
- `npm run start:api`
- `npm run prisma:generate`
- `npm run prisma:migrate`
- `npm run prisma:seed`
- `npm run prisma:format`
