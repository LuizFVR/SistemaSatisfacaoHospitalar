import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { env } from '../../config/env';
import { AccessTokenPayload, AuthenticatedUser } from './auth.types';

type RequestWithUser = Request & { user?: AuthenticatedUser };

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const authorization = request.headers.authorization;

    if (!authorization || !authorization.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token de acesso ausente.');
    }

    const token = authorization.slice(7).trim();

    if (!token) {
      throw new UnauthorizedException('Token de acesso ausente.');
    }

    let payload: AccessTokenPayload;

    try {
      payload = await this.jwtService.verifyAsync<AccessTokenPayload>(token, {
        secret: env.JWT_ACCESS_SECRET,
      });
    } catch {
      throw new UnauthorizedException('Token de acesso invalido.');
    }

    if (
      payload.typ !== 'access' ||
      !payload.sub ||
      !payload.hospitalId ||
      !payload.email ||
      !payload.perfilGlobal
    ) {
      throw new UnauthorizedException('Token de acesso invalido.');
    }

    request.user = {
      id: payload.sub,
      hospitalId: payload.hospitalId,
      email: payload.email,
      perfilGlobal: payload.perfilGlobal,
    };

    return true;
  }
}
