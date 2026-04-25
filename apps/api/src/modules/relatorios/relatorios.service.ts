import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PerfilGlobal, Prisma, Turno } from '@prisma/client';
import { AuthenticatedUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import {
  ComparativoTurnosFiltroInput,
  RelatorioFiltroInput,
} from './relatorios.schemas';
import {
  ComparativoSentoresResponse,
  ComparativoTurnosResponse,
  CsatRelatorioResponse,
  NotaBaixaRelatorioItem,
  NotasBaixasRelatorioResponse,
  NpsRelatorioResponse,
  RelatorioPeriodo,
} from './relatorios.types';

type RespostaMetricaRecord = {
  sentorId: string;
  turno: Turno;
  notaPrincipal: number | null;
};

@Injectable()
export class RelatoriosService {
  constructor(private readonly prisma: PrismaService) {}

  async getCsat(
    user: AuthenticatedUser,
    filtro: RelatorioFiltroInput,
  ): Promise<CsatRelatorioResponse> {
    const where = await this.buildRespostaWhere(user, filtro);
    const respostas = await this.prisma.resposta.findMany({
      where,
      select: {
        sentorId: true,
        turno: true,
        notaPrincipal: true,
      },
    });

    const totalValidasCsat = respostas.filter(
      (item) => item.notaPrincipal !== null && item.notaPrincipal >= 1 && item.notaPrincipal <= 5,
    );
    const respostasPositivas = totalValidasCsat.filter((item) => (item.notaPrincipal ?? 0) >= 4);

    return {
      sentorId: filtro.sentorId ?? null,
      totalRespostas: respostas.length,
      totalValidasCsat: totalValidasCsat.length,
      respostasPositivas: respostasPositivas.length,
      csat:
        totalValidasCsat.length === 0
          ? 0
          : this.round((respostasPositivas.length / totalValidasCsat.length) * 100),
      periodo: this.toPeriodo(filtro),
      turno: filtro.turno ?? null,
    };
  }

  async getNps(
    user: AuthenticatedUser,
    filtro: RelatorioFiltroInput,
  ): Promise<NpsRelatorioResponse> {
    const where = await this.buildRespostaWhere(user, filtro);
    const respostas = await this.prisma.resposta.findMany({
      where,
      select: {
        sentorId: true,
        turno: true,
        notaPrincipal: true,
      },
    });

    const validas = respostas.filter(
      (item) => item.notaPrincipal !== null && item.notaPrincipal >= 0 && item.notaPrincipal <= 10,
    );
    const promotores = validas.filter((item) => (item.notaPrincipal ?? 0) >= 9);
    const neutros = validas.filter(
      (item) => (item.notaPrincipal ?? -1) >= 7 && (item.notaPrincipal ?? -1) <= 8,
    );
    const detratores = validas.filter((item) => (item.notaPrincipal ?? 99) <= 6);

    const nps =
      validas.length === 0
        ? 0
        : this.round(((promotores.length - detratores.length) / validas.length) * 100);

    return {
      sentorId: filtro.sentorId ?? null,
      totalRespostas: respostas.length,
      totalValidasNps: validas.length,
      promotores: promotores.length,
      neutros: neutros.length,
      detratores: detratores.length,
      nps,
      periodo: this.toPeriodo(filtro),
      turno: filtro.turno ?? null,
    };
  }

  async getComparativoSentores(
    user: AuthenticatedUser,
    filtro: RelatorioFiltroInput,
  ): Promise<ComparativoSentoresResponse> {
    const where = await this.buildRespostaWhere(user, filtro);

    const respostas = await this.prisma.resposta.findMany({
      where,
      select: {
        sentorId: true,
        turno: true,
        notaPrincipal: true,
      },
    });

    const sentores = await this.prisma.sentor.findMany({
      where: {
        id: {
          in: Array.from(new Set(respostas.map((item) => item.sentorId))),
        },
      },
      select: {
        id: true,
        nome: true,
      },
    });

    const sentorById = new Map(sentores.map((item) => [item.id, item.nome]));
    const agrupado = new Map<string, RespostaMetricaRecord[]>();

    for (const resposta of respostas) {
      const bucket = agrupado.get(resposta.sentorId) ?? [];
      bucket.push(resposta);
      agrupado.set(resposta.sentorId, bucket);
    }

    const itens = Array.from(agrupado.entries())
      .map(([sentorId, itensSentor]) => {
        const nome = sentorById.get(sentorId) ?? 'Sentor sem nome';
        const csatNotas = itensSentor.filter(
          (item) => item.notaPrincipal !== null && item.notaPrincipal >= 1 && item.notaPrincipal <= 5,
        );
        const csatPositivas = csatNotas.filter((item) => (item.notaPrincipal ?? 0) >= 4).length;

        const npsNotas = itensSentor.filter(
          (item) => item.notaPrincipal !== null && item.notaPrincipal >= 0 && item.notaPrincipal <= 10,
        );
        const npsPromotores = npsNotas.filter((item) => (item.notaPrincipal ?? 0) >= 9).length;
        const npsDetratores = npsNotas.filter((item) => (item.notaPrincipal ?? 99) <= 6).length;

        return {
          sentorId,
          sentorNome: nome,
          totalRespostas: itensSentor.length,
          csat:
            csatNotas.length === 0
              ? null
              : this.round((csatPositivas / csatNotas.length) * 100),
          nps:
            npsNotas.length === 0
              ? null
              : this.round(((npsPromotores - npsDetratores) / npsNotas.length) * 100),
        };
      })
      .sort((a, b) => b.totalRespostas - a.totalRespostas);

    return {
      periodo: this.toPeriodo(filtro),
      turno: filtro.turno ?? null,
      itens,
    };
  }

  async getComparativoTurnos(
    user: AuthenticatedUser,
    filtro: ComparativoTurnosFiltroInput,
  ): Promise<ComparativoTurnosResponse> {
    const accessibleSentorIds = await this.getAccessibleSentorIds(user);

    if (!accessibleSentorIds.includes(filtro.sentorId)) {
      throw new ForbiddenException('Sem permissao para consultar este sentor.');
    }

    const sentor = await this.prisma.sentor.findFirst({
      where: {
        id: filtro.sentorId,
        hospitalId: user.hospitalId,
      },
      select: {
        id: true,
        nome: true,
      },
    });

    if (!sentor) {
      throw new NotFoundException('Sentor nao encontrado.');
    }

    const where: Prisma.RespostaWhereInput = {
      sentorId: filtro.sentorId,
      createdAt: this.toDateRangeWhere(filtro.de, filtro.ate),
    };

    const respostas = await this.prisma.resposta.findMany({
      where,
      select: {
        sentorId: true,
        turno: true,
        notaPrincipal: true,
      },
    });

    const turnos: Turno[] = [Turno.MANHA, Turno.TARDE, Turno.NOITE];
    const itens = turnos.map((turno) => {
      const itensTurno = respostas.filter((item) => item.turno === turno);

      const csatNotas = itensTurno.filter(
        (item) => item.notaPrincipal !== null && item.notaPrincipal >= 1 && item.notaPrincipal <= 5,
      );
      const csatPositivas = csatNotas.filter((item) => (item.notaPrincipal ?? 0) >= 4).length;

      const npsNotas = itensTurno.filter(
        (item) => item.notaPrincipal !== null && item.notaPrincipal >= 0 && item.notaPrincipal <= 10,
      );
      const npsPromotores = npsNotas.filter((item) => (item.notaPrincipal ?? 0) >= 9).length;
      const npsDetratores = npsNotas.filter((item) => (item.notaPrincipal ?? 99) <= 6).length;

      return {
        turno,
        totalRespostas: itensTurno.length,
        csat:
          csatNotas.length === 0 ? null : this.round((csatPositivas / csatNotas.length) * 100),
        nps:
          npsNotas.length === 0
            ? null
            : this.round(((npsPromotores - npsDetratores) / npsNotas.length) * 100),
      };
    });

    return {
      sentorId: sentor.id,
      sentorNome: sentor.nome,
      periodo: this.toPeriodo(filtro),
      itens,
    };
  }

  async getNotasBaixas(
    user: AuthenticatedUser,
    filtro: RelatorioFiltroInput,
  ): Promise<NotasBaixasRelatorioResponse> {
    const where = await this.buildRespostaWhere(user, filtro);

    const itens = await this.prisma.resposta.findMany({
      where: {
        ...where,
        notaBaixa: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 100,
      select: {
        id: true,
        sentorId: true,
        turno: true,
        notaPrincipal: true,
        sugestaoMelhoria: true,
        createdAt: true,
        sentor: {
          select: {
            nome: true,
          },
        },
      },
    });

    const totalNotasBaixas = await this.prisma.resposta.count({
      where: {
        ...where,
        notaBaixa: true,
      },
    });

    const mappedItens: NotaBaixaRelatorioItem[] = itens.map((item) => ({
      respostaId: item.id,
      sentorId: item.sentorId,
      sentorNome: item.sentor.nome,
      turno: item.turno,
      notaPrincipal: item.notaPrincipal,
      sugestaoMelhoria: item.sugestaoMelhoria,
      createdAt: item.createdAt.toISOString(),
    }));

    return {
      sentorId: filtro.sentorId ?? null,
      periodo: this.toPeriodo(filtro),
      totalNotasBaixas,
      itens: mappedItens,
    };
  }

  private async buildRespostaWhere(
    user: AuthenticatedUser,
    filtro: RelatorioFiltroInput,
  ): Promise<Prisma.RespostaWhereInput> {
    const accessibleSentorIds = await this.getAccessibleSentorIds(user);

    if (filtro.sentorId && !accessibleSentorIds.includes(filtro.sentorId)) {
      throw new ForbiddenException('Sem permissao para consultar este sentor.');
    }

    const sentorIds = filtro.sentorId ? [filtro.sentorId] : accessibleSentorIds;

    return {
      sentorId: {
        in: sentorIds,
      },
      turno: filtro.turno,
      createdAt: this.toDateRangeWhere(filtro.de, filtro.ate),
    };
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

  private toPeriodo(filtro: {
    de?: string;
    ate?: string;
  }): RelatorioPeriodo {
    return {
      de: filtro.de ?? null,
      ate: filtro.ate ?? null,
    };
  }

  private round(value: number): number {
    return Number(value.toFixed(2));
  }
}
