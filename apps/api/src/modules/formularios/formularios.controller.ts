import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
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
  createFormularioSchema,
  createFormularioVersaoSchema,
  updateFormularioSchema,
} from './formularios.schemas';
import { FormulariosService } from './formularios.service';
import { FormularioResponse, FormularioVersaoResponse } from './formularios.types';

type RequestWithUser = Request & { user?: AuthenticatedUser };

function parseBody<Schema extends z.ZodTypeAny>(
  schema: Schema,
  input: unknown,
): z.infer<Schema> {
  const parsed = schema.safeParse(input);

  if (!parsed.success) {
    const detail = parsed.error.issues
      .map((issue) => `${issue.path.join('.') || 'body'}: ${issue.message}`)
      .join('; ');

    throw new BadRequestException(`Payload invalido. ${detail}`);
  }

  return parsed.data;
}

@UseGuards(AccessTokenGuard, RolesGuard)
@Controller('formularios')
export class FormulariosController {
  constructor(private readonly formulariosService: FormulariosService) {}

  @Post()
  @Roles(PerfilGlobal.USUARIO_MAIOR, PerfilGlobal.GESTOR_SENTOR)
  async create(
    @Req() req: RequestWithUser,
    @Body() body: unknown,
  ): Promise<FormularioResponse> {
    const user = req.user;

    if (!user) {
      throw new BadRequestException('Usuario autenticado ausente na requisicao.');
    }

    const input = parseBody(createFormularioSchema, body);

    return this.formulariosService.create(user, input);
  }

  @Get()
  @Roles(
    PerfilGlobal.USUARIO_MAIOR,
    PerfilGlobal.GESTOR_SENTOR,
    PerfilGlobal.OPERADOR_SENTOR,
  )
  async findAll(@Req() req: RequestWithUser): Promise<FormularioResponse[]> {
    const user = req.user;

    if (!user) {
      throw new BadRequestException('Usuario autenticado ausente na requisicao.');
    }

    return this.formulariosService.findAll(user);
  }

  @Get(':id')
  @Roles(
    PerfilGlobal.USUARIO_MAIOR,
    PerfilGlobal.GESTOR_SENTOR,
    PerfilGlobal.OPERADOR_SENTOR,
  )
  async findOne(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
  ): Promise<FormularioResponse> {
    const user = req.user;

    if (!user) {
      throw new BadRequestException('Usuario autenticado ausente na requisicao.');
    }

    return this.formulariosService.findOne(user, id);
  }

  @Put(':id')
  @Roles(PerfilGlobal.USUARIO_MAIOR, PerfilGlobal.GESTOR_SENTOR)
  async update(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<FormularioResponse> {
    const user = req.user;

    if (!user) {
      throw new BadRequestException('Usuario autenticado ausente na requisicao.');
    }

    const input = parseBody(updateFormularioSchema, body);

    return this.formulariosService.update(user, id, input);
  }

  @Post(':id/versoes')
  @Roles(PerfilGlobal.USUARIO_MAIOR, PerfilGlobal.GESTOR_SENTOR)
  async createVersao(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<FormularioVersaoResponse> {
    const user = req.user;

    if (!user) {
      throw new BadRequestException('Usuario autenticado ausente na requisicao.');
    }

    const input = parseBody(createFormularioVersaoSchema, body);

    return this.formulariosService.createVersao(user, id, input);
  }

  @Post(':id/versoes/:versaoId/publicar')
  @Roles(PerfilGlobal.USUARIO_MAIOR, PerfilGlobal.GESTOR_SENTOR)
  async publicarVersao(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Param('versaoId') versaoId: string,
  ): Promise<FormularioVersaoResponse> {
    const user = req.user;

    if (!user) {
      throw new BadRequestException('Usuario autenticado ausente na requisicao.');
    }

    return this.formulariosService.publishVersao(user, id, versaoId);
  }
}
