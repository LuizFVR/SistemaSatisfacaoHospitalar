import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PerfilGlobal, Prisma, StatusAlerta } from '@prisma/client';
import { AuthenticatedUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import { ListarAlertasFiltroInput } from './alertas.schemas';
import { AlertaResponse } from './alertas.types';

@Injectable()
export class AlertasService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    user: AuthenticatedUser,
    filtro: ListarAlertasFiltroInput,
  ): Promise<AlertaResponse[]> {
    const accessibleSentorIds = await this.getAccessibleSentorIds(user);

    if (filtro.sentorId && !accessibleSentorIds.includes(filtro.sentorId)) {
      throw new ForbiddenException('Sem permissao para consultar alertas deste sentor.');
    }

    const sentorIds = filtro.sentorId ? [filtro.sentorId] : accessibleSentorIds;

    const alertas = await this.prisma.alerta.findMany({
      where: {
        sentorId: {
          in: sentorIds,
        },
        status: filtro.status,
        disparadoEm: this.toDateRangeWhere(filtro.de, filtro.ate),
      },
      include: {
        sentor: {
          select: {
            nome: true,
          },
        },
      },
      orderBy: {
        disparadoEm: 'desc',
      },
      take: filtro.limit,
    });

    return alertas.map((item) => this.toResponse(item));
  }

  async resolve(user: AuthenticatedUser, alertaId: string): Promise<AlertaResponse> {
    const alerta = await this.prisma.alerta.findUnique({
      where: {
        id: alertaId,
      },
      include: {
        sentor: {
          select: {
            nome: true,
          },
        },
      },
    });

    if (!alerta) {
      throw new NotFoundException('Alerta nao encontrado.');
    }

    const accessibleSentorIds = await this.getAccessibleSentorIds(user);

    if (!accessibleSentorIds.includes(alerta.sentorId)) {
      throw new ForbiddenException('Sem permissao para resolver alerta deste sentor.');
    }

    const resolved = await this.prisma.alerta.update({
      where: {
        id: alerta.id,
      },
      data: {
        status: StatusAlerta.RESOLVIDO,
        resolvidoEm: alerta.resolvidoEm ?? new Date(),
      },
      include: {
        sentor: {
          select: {
            nome: true,
          },
        },
      },
    });

    return this.toResponse(resolved);
  }

  private async getAccessibleSentorIds(user: AuthenticatedUser): Promise<string[]> {
    if (user.perfilGlobal === PerfilGlobal.USUARIO_MAIOR) {
      const sentores = await this.prisma.sentor.findMany({
        where: {
          hospitalId: user.hospitalId,
        },
        select: {
          id: true,
        },
      });

      return sentores.map((item) => item.id);
    }

    const vinculacoes = await this.prisma.usuarioSentor.findMany({
      where: {
        usuarioId: user.id,
        sentor: {
          hospitalId: user.hospitalId,
        },
      },
      select: {
        sentorId: true,
      },
    });

    return vinculacoes.map((item) => item.sentorId);
  }

  private toDateRangeWhere(de?: string, ate?: string): Prisma.DateTimeFilter | undefined {
    if (!de && !ate) {
      return undefined;
    }

    return {
      gte: de ? new Date(de) : undefined,
      lte: ate ? new Date(ate) : undefined,
    };
  }

  private toResponse(alerta: {
    id: string;
    tipoAlerta: AlertaResponse['tipoAlerta'];
    sentorId: string;
    sentor: { nome: string };
    severidade: AlertaResponse['severidade'];
    titulo: string;
    descricao: string;
    status: AlertaResponse['status'];
    disparadoEm: Date;
    resolvidoEm: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): AlertaResponse {
    return {
      id: alerta.id,
      tipoAlerta: alerta.tipoAlerta,
      sentorId: alerta.sentorId,
      sentorNome: alerta.sentor.nome,
      severidade: alerta.severidade,
      titulo: alerta.titulo,
      descricao: alerta.descricao,
      status: alerta.status,
      disparadoEm: alerta.disparadoEm.toISOString(),
      resolvidoEm: alerta.resolvidoEm?.toISOString() ?? null,
      createdAt: alerta.createdAt.toISOString(),
      updatedAt: alerta.updatedAt.toISOString(),
    };
  }
}
