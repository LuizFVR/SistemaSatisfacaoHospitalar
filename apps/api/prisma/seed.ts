import { hash } from 'bcryptjs';
import { PrismaClient, PerfilGlobal } from '@prisma/client';
import { config } from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDir = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(currentDir, '../.env') });

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const hospitalNome = process.env.SEED_HOSPITAL_NOME?.trim() || 'Hospital Principal';
  const adminNome = process.env.SEED_ADMIN_NOME?.trim() || 'Usuario Maior';
  const adminEmail = (process.env.SEED_ADMIN_EMAIL ?? 'admin@sarisfacao.local')
    .trim()
    .toLowerCase();
  const adminSenha = process.env.SEED_ADMIN_SENHA ?? 'Admin@123456';

  if (adminSenha.length < 8) {
    throw new Error('SEED_ADMIN_SENHA deve ter no minimo 8 caracteres.');
  }

  let hospital = await prisma.hospital.findFirst({
    where: { nome: hospitalNome },
  });

  if (!hospital) {
    hospital = await prisma.hospital.create({
      data: {
        nome: hospitalNome,
      },
    });
  }

  const senhaHash = await hash(adminSenha, 12);

  const usuario = await prisma.usuario.upsert({
    where: { email: adminEmail },
    update: {
      nome: adminNome,
      senhaHash,
      perfilGlobal: PerfilGlobal.USUARIO_MAIOR,
      hospitalId: hospital.id,
      ativo: true,
    },
    create: {
      hospitalId: hospital.id,
      nome: adminNome,
      email: adminEmail,
      senhaHash,
      perfilGlobal: PerfilGlobal.USUARIO_MAIOR,
      ativo: true,
    },
  });

  console.log('Seed concluido com sucesso.');
  console.log(`Hospital: ${hospital.nome} (${hospital.id})`);
  console.log(`Usuario admin: ${usuario.email} (${usuario.id})`);
}

main()
  .catch((error) => {
    console.error('Falha no seed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
