import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Patch,
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
import { AlertasService } from './alertas.service';
import { listarAlertasFiltroSchema } from './alertas.schemas';
import { AlertaResponse } from './alertas.types';

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
@Controller('alertas')
export class AlertasController {
  constructor(private readonly alertasService: AlertasService) {}

  @Get()
  @Roles(PerfilGlobal.USUARIO_MAIOR, PerfilGlobal.GESTOR_SENTOR)
  async list(
    @Req() req: RequestWithUser,
    @Query() query: unknown,
  ): Promise<AlertaResponse[]> {
    const user = this.getUser(req);
    const filtro = parseQuery(listarAlertasFiltroSchema, query);

    return this.alertasService.list(user, filtro);
  }

  @Patch(':id/resolver')
  @Roles(PerfilGlobal.USUARIO_MAIOR, PerfilGlobal.GESTOR_SENTOR)
  async resolve(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
  ): Promise<AlertaResponse> {
    const user = this.getUser(req);

    return this.alertasService.resolve(user, id);
  }

  private getUser(req: RequestWithUser): AuthenticatedUser {
    const user = req.user;

    if (!user) {
      throw new BadRequestException('Usuario autenticado ausente na requisicao.');
    }

    return user;
  }
}
