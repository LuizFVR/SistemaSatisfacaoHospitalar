import { randomUUID } from 'node:crypto';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PerfilGlobal, Prisma } from '@prisma/client';
import { env } from '../../config/env';
import { AuthenticatedUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateSentorInput,
  UpdateSentorInput,
  UpdateSentorStatusInput,
} from './sentores.schemas';
import { SentorResponse } from './sentores.types';

const sentorSelect = {
  id: true,
  hospitalId: true,
  nome: true,
  codigo: true,
  localizacao: true,
  ativo: true,
  createdAt: true,
  updatedAt: true,
  qr: {
    select: {
      slugPublicoUnico: true,
      urlPublica: true,
    },
  },
} satisfies Prisma.SentorSelect;

@Injectable()
export class SentoresService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, input: CreateSentorInput): Promise<SentorResponse> {
    const slugPublicoUnico = this.generateSlug();
    const baseUrl = env.PUBLIC_BASE_URL.replace(/\/$/, '');

    try {
      const sentor = await this.prisma.sentor.create({
        data: {
          hospitalId: user.hospitalId,
          nome: input.nome,
          codigo: input.codigo ?? null,
          localizacao: input.localizacao ?? null,
          qr: {
            create: {
              slugPublicoUnico,
              urlPublica: `${baseUrl}/public/f/${slugPublicoUnico}`,
            },
          },
        },
        select: sentorSelect,
      });

      return this.toResponse(sentor);
    } catch (error) {
      this.handlePrismaConflict(error);
      throw error;
    }
  }

  async findAll(user: AuthenticatedUser): Promise<SentorResponse[]> {
    const sentores = await this.prisma.sentor.findMany({
      where: this.buildAccessWhere(user),
      orderBy: {
        createdAt: 'desc',
      },
      select: sentorSelect,
    });

    return sentores.map((sentor) => this.toResponse(sentor));
  }

  async findOne(user: AuthenticatedUser, id: string): Promise<SentorResponse> {
    const sentor = await this.prisma.sentor.findFirst({
      where: {
        ...this.buildAccessWhere(user),
        id,
      },
      select: sentorSelect,
    });

    if (!sentor) {
      throw new NotFoundException('Sentor nao encontrado.');
    }

    return this.toResponse(sentor);
  }

  async update(
    user: AuthenticatedUser,
    id: string,
    input: UpdateSentorInput,
  ): Promise<SentorResponse> {
    await this.assertExistsInHospital(user.hospitalId, id);

    try {
      const sentor = await this.prisma.sentor.update({
        where: { id },
        data: {
          nome: input.nome,
          codigo: input.codigo ?? null,
          localizacao: input.localizacao ?? null,
        },
        select: sentorSelect,
      });

      return this.toResponse(sentor);
    } catch (error) {
      this.handlePrismaConflict(error);
      throw error;
    }
  }

  async updateStatus(
    user: AuthenticatedUser,
    id: string,
    input: UpdateSentorStatusInput,
  ): Promise<SentorResponse> {
    await this.assertExistsInHospital(user.hospitalId, id);

    const sentor = await this.prisma.sentor.update({
      where: { id },
      data: {
        ativo: input.ativo,
      },
      select: sentorSelect,
    });

    return this.toResponse(sentor);
  }

  private buildAccessWhere(user: AuthenticatedUser): Prisma.SentorWhereInput {
    if (user.perfilGlobal === PerfilGlobal.USUARIO_MAIOR) {
      return { hospitalId: user.hospitalId };
    }

    return {
      hospitalId: user.hospitalId,
      usuariosSentor: {
        some: {
          usuarioId: user.id,
        },
      },
    };
  }

  private async assertExistsInHospital(hospitalId: string, sentorId: string): Promise<void> {
    const sentor = await this.prisma.sentor.findFirst({
      where: {
        id: sentorId,
        hospitalId,
      },
      select: { id: true },
    });

    if (!sentor) {
      throw new NotFoundException('Sentor nao encontrado.');
    }
  }

  private handlePrismaConflict(error: unknown): void {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('Ja existe sentor com este codigo neste hospital.');
    }
  }

  private generateSlug(): string {
    return `snt-${randomUUID().replace(/-/g, '').slice(0, 20)}`;
  }

  private toResponse(sentor: {
    id: string;
    hospitalId: string;
    nome: string;
    codigo: string | null;
    localizacao: string | null;
    ativo: boolean;
    createdAt: Date;
    updatedAt: Date;
    qr: { slugPublicoUnico: string; urlPublica: string } | null;
  }): SentorResponse {
    return {
      id: sentor.id,
      hospitalId: sentor.hospitalId,
      nome: sentor.nome,
      codigo: sentor.codigo,
      localizacao: sentor.localizacao,
      ativo: sentor.ativo,
      createdAt: sentor.createdAt.toISOString(),
      updatedAt: sentor.updatedAt.toISOString(),
      qr: sentor.qr
        ? {
            slugPublicoUnico: sentor.qr.slugPublicoUnico,
            urlPublica: sentor.qr.urlPublica,
          }
        : null,
    };
  }
}
