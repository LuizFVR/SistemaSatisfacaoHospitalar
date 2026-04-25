import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  PerfilGlobal,
  Prisma,
  StatusFormulario,
} from '@prisma/client';
import { AuthenticatedUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateFormularioInput,
  CreateFormularioVersaoInput,
  UpdateFormularioInput,
} from './formularios.schemas';
import { FormularioResponse, FormularioVersaoResponse } from './formularios.types';

const formularioSelect = {
  id: true,
  hospitalId: true,
  nome: true,
  descricao: true,
  status: true,
  criadoPorId: true,
  createdAt: true,
  updatedAt: true,
  versoes: {
    select: {
      numeroVersao: true,
    },
    orderBy: {
      numeroVersao: 'desc',
    },
    take: 1,
  },
} satisfies Prisma.FormularioSelect;

const versaoSelect = {
  id: true,
  formularioId: true,
  numeroVersao: true,
  estruturaJson: true,
  publicadoEm: true,
  publicadoPorId: true,
  createdAt: true,
} satisfies Prisma.FormularioVersaoSelect;

@Injectable()
export class FormulariosService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    user: AuthenticatedUser,
    input: CreateFormularioInput,
  ): Promise<FormularioResponse> {
    const formulario = await this.prisma.formulario.create({
      data: {
        hospitalId: user.hospitalId,
        nome: input.nome,
        descricao: input.descricao ?? null,
        criadoPorId: user.id,
      },
      select: formularioSelect,
    });

    return this.toFormularioResponse(formulario);
  }

  async findAll(user: AuthenticatedUser): Promise<FormularioResponse[]> {
    const formularios = await this.prisma.formulario.findMany({
      where: this.buildReadWhere(user),
      orderBy: {
        createdAt: 'desc',
      },
      select: formularioSelect,
    });

    return formularios.map((formulario) => this.toFormularioResponse(formulario));
  }

  async findOne(user: AuthenticatedUser, id: string): Promise<FormularioResponse> {
    const formulario = await this.prisma.formulario.findFirst({
      where: {
        ...this.buildReadWhere(user),
        id,
      },
      select: formularioSelect,
    });

    if (!formulario) {
      throw new NotFoundException('Formulario nao encontrado.');
    }

    return this.toFormularioResponse(formulario);
  }

  async update(
    user: AuthenticatedUser,
    id: string,
    input: UpdateFormularioInput,
  ): Promise<FormularioResponse> {
    await this.assertWriteAccess(user, id);

    const formulario = await this.prisma.formulario.update({
      where: { id },
      data: {
        nome: input.nome,
        descricao: input.descricao ?? null,
      },
      select: formularioSelect,
    });

    return this.toFormularioResponse(formulario);
  }

  async createVersao(
    user: AuthenticatedUser,
    formularioId: string,
    input: CreateFormularioVersaoInput,
  ): Promise<FormularioVersaoResponse> {
    await this.assertWriteAccess(user, formularioId);

    try {
      const versao = await this.prisma.$transaction(async (tx) => {
        const ultimaVersao = await tx.formularioVersao.findFirst({
          where: { formularioId },
          orderBy: {
            numeroVersao: 'desc',
          },
          select: {
            numeroVersao: true,
          },
        });

        const numeroVersao = (ultimaVersao?.numeroVersao ?? 0) + 1;

        return tx.formularioVersao.create({
          data: {
            formularioId,
            numeroVersao,
            estruturaJson: input.estruturaJson as Prisma.InputJsonValue,
          },
          select: versaoSelect,
        });
      });

      return this.toVersaoResponse(versao);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Conflito ao gerar numero da versao. Tente novamente.');
      }

      throw error;
    }
  }

  async publishVersao(
    user: AuthenticatedUser,
    formularioId: string,
    versaoId: string,
  ): Promise<FormularioVersaoResponse> {
    await this.assertWriteAccess(user, formularioId);

    const versao = await this.prisma.formularioVersao.findFirst({
      where: {
        id: versaoId,
        formularioId,
      },
      select: versaoSelect,
    });

    if (!versao) {
      throw new NotFoundException('Versao de formulario nao encontrada.');
    }

    const publicadoEm = versao.publicadoEm ?? new Date();

    const versaoPublicada = await this.prisma.$transaction(async (tx) => {
      const updatedVersao = await tx.formularioVersao.update({
        where: { id: versaoId },
        data: {
          publicadoEm,
          publicadoPorId: user.id,
        },
        select: versaoSelect,
      });

      await tx.formulario.update({
        where: { id: formularioId },
        data: {
          status: StatusFormulario.PUBLICADO,
        },
      });

      return updatedVersao;
    });

    return this.toVersaoResponse(versaoPublicada);
  }

  private async assertWriteAccess(user: AuthenticatedUser, id: string): Promise<void> {
    const formulario = await this.prisma.formulario.findFirst({
      where: {
        ...this.buildWriteWhere(user),
        id,
      },
      select: {
        id: true,
      },
    });

    if (!formulario) {
      throw new NotFoundException('Formulario nao encontrado.');
    }
  }

  private buildReadWhere(user: AuthenticatedUser): Prisma.FormularioWhereInput {
    if (user.perfilGlobal === PerfilGlobal.USUARIO_MAIOR) {
      return {
        hospitalId: user.hospitalId,
      };
    }

    return {
      hospitalId: user.hospitalId,
      OR: [
        {
          criadoPorId: user.id,
        },
        {
          sentoresAtivos: {
            some: {
              sentor: {
                usuariosSentor: {
                  some: {
                    usuarioId: user.id,
                  },
                },
              },
            },
          },
        },
      ],
    };
  }

  private buildWriteWhere(user: AuthenticatedUser): Prisma.FormularioWhereInput {
    if (user.perfilGlobal === PerfilGlobal.USUARIO_MAIOR) {
      return {
        hospitalId: user.hospitalId,
      };
    }

    return {
      hospitalId: user.hospitalId,
      OR: [
        {
          criadoPorId: user.id,
        },
        {
          sentoresAtivos: {
            some: {
              sentor: {
                usuariosSentor: {
                  some: {
                    usuarioId: user.id,
                  },
                },
              },
            },
          },
        },
      ],
    };
  }

  private toFormularioResponse(formulario: {
    id: string;
    hospitalId: string;
    nome: string;
    descricao: string | null;
    status: StatusFormulario;
    criadoPorId: string;
    createdAt: Date;
    updatedAt: Date;
    versoes: Array<{ numeroVersao: number }>;
  }): FormularioResponse {
    return {
      id: formulario.id,
      hospitalId: formulario.hospitalId,
      nome: formulario.nome,
      descricao: formulario.descricao,
      status: formulario.status,
      criadoPorId: formulario.criadoPorId,
      ultimaVersaoNumero: formulario.versoes[0]?.numeroVersao ?? null,
      createdAt: formulario.createdAt.toISOString(),
      updatedAt: formulario.updatedAt.toISOString(),
    };
  }

  private toVersaoResponse(versao: {
    id: string;
    formularioId: string;
    numeroVersao: number;
    estruturaJson: Prisma.JsonValue;
    publicadoEm: Date | null;
    publicadoPorId: string | null;
    createdAt: Date;
  }): FormularioVersaoResponse {
    return {
      id: versao.id,
      formularioId: versao.formularioId,
      numeroVersao: versao.numeroVersao,
      estruturaJson: versao.estruturaJson,
      publicadoEm: versao.publicadoEm?.toISOString() ?? null,
      publicadoPorId: versao.publicadoPorId,
      createdAt: versao.createdAt.toISOString(),
    };
  }
}
