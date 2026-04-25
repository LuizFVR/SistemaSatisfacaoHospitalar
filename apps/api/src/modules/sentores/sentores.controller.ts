import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { PerfilGlobal } from '@prisma/client';
import { Request } from 'express';
import { z } from 'zod';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { AuthenticatedUser } from '../auth/auth.types';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import {
  createSentorSchema,
  updateSentorSchema,
  updateSentorStatusSchema,
} from './sentores.schemas';
import { SentoresService } from './sentores.service';
import { SentorResponse } from './sentores.types';

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
@Controller('sentores')
export class SentoresController {
  constructor(private readonly sentoresService: SentoresService) {}

  @Post()
  @Roles(PerfilGlobal.USUARIO_MAIOR)
  async create(
    @Req() req: RequestWithUser,
    @Body() body: unknown,
  ): Promise<SentorResponse> {
    const user = req.user;

    if (!user) {
      throw new BadRequestException('Usuario autenticado ausente na requisicao.');
    }

    const input = parseBody(createSentorSchema, body);

    return this.sentoresService.create(user, input);
  }

  @Get()
  @Roles(
    PerfilGlobal.USUARIO_MAIOR,
    PerfilGlobal.GESTOR_SENTOR,
    PerfilGlobal.OPERADOR_SENTOR,
  )
  async findAll(@Req() req: RequestWithUser): Promise<SentorResponse[]> {
    const user = req.user;

    if (!user) {
      throw new BadRequestException('Usuario autenticado ausente na requisicao.');
    }

    return this.sentoresService.findAll(user);
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
  ): Promise<SentorResponse> {
    const user = req.user;

    if (!user) {
      throw new BadRequestException('Usuario autenticado ausente na requisicao.');
    }

    return this.sentoresService.findOne(user, id);
  }

  @Put(':id')
  @Roles(PerfilGlobal.USUARIO_MAIOR)
  async update(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<SentorResponse> {
    const user = req.user;

    if (!user) {
      throw new BadRequestException('Usuario autenticado ausente na requisicao.');
    }

    const input = parseBody(updateSentorSchema, body);

    return this.sentoresService.update(user, id, input);
  }

  @Patch(':id/status')
  @Roles(PerfilGlobal.USUARIO_MAIOR)
  async updateStatus(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<SentorResponse> {
    const user = req.user;

    if (!user) {
      throw new BadRequestException('Usuario autenticado ausente na requisicao.');
    }

    const input = parseBody(updateSentorStatusSchema, body);

    return this.sentoresService.updateStatus(user, id, input);
  }
}
