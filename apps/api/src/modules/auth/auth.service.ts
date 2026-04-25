import { randomUUID } from 'node:crypto';
import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PerfilGlobal } from '@prisma/client';
import { compare } from 'bcryptjs';
import { env } from '../../config/env';
import { PrismaService } from '../prisma/prisma.service';
import {
  AccessTokenPayload,
  AuthTokensResponse,
  RefreshTokenPayload,
} from './auth.types';

type AuthUserRecord = {
  id: string;
  hospitalId: string;
  nome: string;
  email: string;
  senhaHash: string;
  perfilGlobal: PerfilGlobal;
  ativo: boolean;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(email: string, senha: string): Promise<AuthTokensResponse> {
    const sanitizedEmail = email.trim().toLowerCase();
    const user = await this.findActiveUserByEmail(sanitizedEmail);

    if (!user) {
      throw new UnauthorizedException('Credenciais invalidas.');
    }

    const senhaConfere = await compare(senha, user.senhaHash);

    if (!senhaConfere) {
      throw new UnauthorizedException('Credenciais invalidas.');
    }

    return this.issueTokens(user);
  }

  async refresh(refreshToken: string): Promise<AuthTokensResponse> {
    let payload: RefreshTokenPayload;

    try {
      payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(refreshToken, {
        secret: env.JWT_REFRESH_SECRET,
      });
    } catch {
      throw new UnauthorizedException('Refresh token invalido.');
    }

    if (payload.typ !== 'refresh' || !payload.sub) {
      throw new UnauthorizedException('Refresh token invalido.');
    }

    const user = await this.findActiveUserById(payload.sub);

    if (!user) {
      throw new UnauthorizedException('Usuario nao encontrado ou inativo.');
    }

    return this.issueTokens(user);
  }

  logout(): { message: string } {
    return { message: 'Logout realizado com sucesso.' };
  }

  private async findActiveUserByEmail(email: string): Promise<AuthUserRecord | null> {
    const user = await this.prisma.usuario.findUnique({
      where: { email },
      select: {
        id: true,
        hospitalId: true,
        nome: true,
        email: true,
        senhaHash: true,
        perfilGlobal: true,
        ativo: true,
      },
    });

    if (!user?.ativo) {
      return null;
    }

    return user;
  }

  private async findActiveUserById(id: string): Promise<AuthUserRecord | null> {
    const user = await this.prisma.usuario.findUnique({
      where: { id },
      select: {
        id: true,
        hospitalId: true,
        nome: true,
        email: true,
        senhaHash: true,
        perfilGlobal: true,
        ativo: true,
      },
    });

    if (!user?.ativo) {
      return null;
    }

    return user;
  }

  private async issueTokens(user: AuthUserRecord): Promise<AuthTokensResponse> {
    const accessPayload: AccessTokenPayload = {
      sub: user.id,
      hospitalId: user.hospitalId,
      email: user.email,
      perfilGlobal: user.perfilGlobal,
      typ: 'access',
    };

    const refreshPayload: RefreshTokenPayload = {
      sub: user.id,
      jti: randomUUID(),
      typ: 'refresh',
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(accessPayload, {
        secret: env.JWT_ACCESS_SECRET,
        expiresIn: env.JWT_ACCESS_TTL,
      }),
      this.jwtService.signAsync(refreshPayload, {
        secret: env.JWT_REFRESH_SECRET,
        expiresIn: env.JWT_REFRESH_TTL,
      }),
    ]);

    return {
      tokenType: 'Bearer',
      accessToken,
      refreshToken,
      accessTokenExpiresIn: env.JWT_ACCESS_TTL,
      refreshTokenExpiresIn: env.JWT_REFRESH_TTL,
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        hospitalId: user.hospitalId,
        perfilGlobal: user.perfilGlobal,
      },
    };
  }
}
