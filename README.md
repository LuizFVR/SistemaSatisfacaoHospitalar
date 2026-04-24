# Sistema de Satisfacao Hospitalar (Sentores)

Base inicial do monorepo para implementacao do sistema descrito em `planejamento-sistema-satisfacao-gpt-codex.md`.

## Estrutura atual

- `apps/api`: API backend com NestJS + Prisma (Etapa 1 iniciada)
- `apps/web-admin`: reservado para painel administrativo
- `apps/web-public`: reservado para fluxo publico por QR
- `packages/*`: reservado para pacotes compartilhados

## Comandos

- `npm install`
- `npm run dev:api`
- `npm run build`
- `npm run prisma:generate`
- `npm run prisma:migrate`
