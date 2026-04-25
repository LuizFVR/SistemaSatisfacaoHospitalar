import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PerfilGlobal } from '@prisma/client';
import { Request } from 'express';
import { AuthenticatedUser } from './auth.types';
import { ROLES_KEY } from './roles.decorator';

type RequestWithUser = Request & { user?: AuthenticatedUser };

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<PerfilGlobal[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Usuario nao autenticado.');
    }

    if (!requiredRoles.includes(user.perfilGlobal)) {
      throw new ForbiddenException('Perfil sem permissao para esta acao.');
    }

    return true;
  }
}
