import {
  BadRequestException,
  Controller,
  Get,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { PerfilGlobal } from '@prisma/client';
import { Request } from 'express';
import { z } from 'zod';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AuthenticatedUser } from '../auth/auth.types';
import {
  comparativoTurnosFiltroSchema,
  relatorioFiltroSchema,
} from './relatorios.schemas';
import { RelatoriosService } from './relatorios.service';
import {
  ComparativoSentoresResponse,
  ComparativoTurnosResponse,
  CsatRelatorioResponse,
  NotasBaixasRelatorioResponse,
  NpsRelatorioResponse,
} from './relatorios.types';

type RequestWithUser = Request & { user?: AuthenticatedUser };

function parseQuery<Schema extends z.ZodTypeAny>(
  schema: Schema,
  input: unknown,
): z.infer<Schema> {
  const parsed = schema.safeParse(input);

  if (!parsed.success) {
    const detail = parsed.error.issues
      .map((issue) => `${issue.path.join('.') || 'query'}: ${issue.message}`)
      .join('; ');

    throw new BadRequestException(`Query invalida. ${detail}`);
  }

  return parsed.data;
}

@UseGuards(AccessTokenGuard, RolesGuard)
@Controller('relatorios')
export class RelatoriosController {
  constructor(private readonly relatoriosService: RelatoriosService) {}

  @Get('csat')
  @Roles(
    PerfilGlobal.USUARIO_MAIOR,
    PerfilGlobal.GESTOR_SENTOR,
    PerfilGlobal.OPERADOR_SENTOR,
  )
  async getCsat(
    @Req() req: RequestWithUser,
    @Query() query: unknown,
  ): Promise<CsatRelatorioResponse> {
    const user = this.getUser(req);
    const filtro = parseQuery(relatorioFiltroSchema, query);

    return this.relatoriosService.getCsat(user, filtro);
  }

  @Get('nps')
  @Roles(
    PerfilGlobal.USUARIO_MAIOR,
    PerfilGlobal.GESTOR_SENTOR,
    PerfilGlobal.OPERADOR_SENTOR,
  )
  async getNps(
    @Req() req: RequestWithUser,
    @Query() query: unknown,
  ): Promise<NpsRelatorioResponse> {
    const user = this.getUser(req);
    const filtro = parseQuery(relatorioFiltroSchema, query);

    return this.relatoriosService.getNps(user, filtro);
  }

  @Get('comparativo-sentores')
  @Roles(
    PerfilGlobal.USUARIO_MAIOR,
    PerfilGlobal.GESTOR_SENTOR,
    PerfilGlobal.OPERADOR_SENTOR,
  )
  async getComparativoSentores(
    @Req() req: RequestWithUser,
    @Query() query: unknown,
  ): Promise<ComparativoSentoresResponse> {
    const user = this.getUser(req);
    const filtro = parseQuery(relatorioFiltroSchema, query);

    return this.relatoriosService.getComparativoSentores(user, filtro);
  }

  @Get('comparativo-turnos')
  @Roles(
    PerfilGlobal.USUARIO_MAIOR,
    PerfilGlobal.GESTOR_SENTOR,
    PerfilGlobal.OPERADOR_SENTOR,
  )
  async getComparativoTurnos(
    @Req() req: RequestWithUser,
    @Query() query: unknown,
  ): Promise<ComparativoTurnosResponse> {
    const user = this.getUser(req);
    const filtro = parseQuery(comparativoTurnosFiltroSchema, query);

    return this.relatoriosService.getComparativoTurnos(user, filtro);
  }

  @Get('notas-baixas')
  @Roles(
    PerfilGlobal.USUARIO_MAIOR,
    PerfilGlobal.GESTOR_SENTOR,
    PerfilGlobal.OPERADOR_SENTOR,
  )
  async getNotasBaixas(
    @Req() req: RequestWithUser,
    @Query() query: unknown,
  ): Promise<NotasBaixasRelatorioResponse> {
    const user = this.getUser(req);
    const filtro = parseQuery(relatorioFiltroSchema, query);

    return this.relatoriosService.getNotasBaixas(user, filtro);
  }

  private getUser(req: RequestWithUser): AuthenticatedUser {
    const user = req.user;

    if (!user) {
      throw new BadRequestException('Usuario autenticado ausente na requisicao.');
    }

    return user;
  }
}
