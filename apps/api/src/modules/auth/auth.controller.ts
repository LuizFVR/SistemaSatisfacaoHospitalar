import {
  BadRequestException,
  Body,
  Controller,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { z } from 'zod';
import { AccessTokenGuard } from './access-token.guard';
import { loginSchema, refreshSchema } from './auth.schemas';
import { AuthService } from './auth.service';
import { AuthenticatedUser, AuthTokensResponse } from './auth.types';

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

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() body: unknown): Promise<AuthTokensResponse> {
    const input = parseBody(loginSchema, body);

    return this.authService.login(input.email, input.senha);
  }

  @Post('refresh')
  async refresh(@Body() body: unknown): Promise<AuthTokensResponse> {
    const input = parseBody(refreshSchema, body);

    return this.authService.refresh(input.refreshToken);
  }

  @Post('logout')
  @UseGuards(AccessTokenGuard)
  logout(@Req() req: RequestWithUser): { message: string; userId: string } {
    return {
      ...this.authService.logout(),
      userId: req.user?.id ?? 'desconhecido',
    };
  }
}
