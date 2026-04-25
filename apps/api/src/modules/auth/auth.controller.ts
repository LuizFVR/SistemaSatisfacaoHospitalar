import {
  BadRequestException,
  Body,
  Controller,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { z } from 'zod';
import { AccessTokenGuard } from './access-token.guard';
import { loginSchema, logoutSchema, refreshSchema } from './auth.schemas';
import { AuthService } from './auth.service';
import {
  AuthAuditContext,
  AuthenticatedUser,
  AuthTokensResponse,
  LogoutResponse,
} from './auth.types';

type RequestWithUser = ExpressRequest & { user?: AuthenticatedUser };

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

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(
    @Req() req: ExpressRequest,
    @Body() body: unknown,
  ): Promise<AuthTokensResponse> {
    const input = parseBody(loginSchema, body);

    return this.authService.login(input.email, input.senha, this.toAuditContext(req));
  }

  @Post('refresh')
  async refresh(
    @Req() req: ExpressRequest,
    @Body() body: unknown,
  ): Promise<AuthTokensResponse> {
    const input = parseBody(refreshSchema, body);

    return this.authService.refresh(input.refreshToken, this.toAuditContext(req));
  }

  @Post('logout')
  @UseGuards(AccessTokenGuard)
  async logout(
    @Req() req: RequestWithUser,
    @Body() body: unknown,
  ): Promise<LogoutResponse> {
    const user = req.user;

    if (!user) {
      throw new BadRequestException('Usuario autenticado ausente na requisicao.');
    }

    const input = parseBody(logoutSchema, body);

    return {
      ...(await this.authService.logout(
        user.id,
        input.refreshToken,
        this.toAuditContext(req),
      )),
      userId: user.id,
    };
  }

  private toAuditContext(req: ExpressRequest): AuthAuditContext {
    const ip = req.ip ?? null;
    const userAgentHeader = req.headers['user-agent'];
    const userAgent = typeof userAgentHeader === 'string' ? userAgentHeader : null;

    return {
      ip,
      userAgent,
    };
  }
}
