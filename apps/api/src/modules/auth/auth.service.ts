import { createHash, randomUUID } from 'node:crypto';
import {
  InternalServerErrorException,
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
    const payload = await this.verifyRefreshToken(refreshToken);
    const session = await this.validateRefreshSession(payload, refreshToken);

    const user = await this.findActiveUserById(payload.sub);

    if (!user) {
      throw new UnauthorizedException('Usuario nao encontrado ou inativo.');
    }

    await this.revokeSessionById(session.id);

    return this.issueTokens(user);
  }

  async logout(userId: string, refreshToken: string): Promise<{ message: string }> {
    const payload = await this.verifyRefreshToken(refreshToken);

    if (payload.sub !== userId) {
      throw new UnauthorizedException('Refresh token invalido para este usuario.');
    }

    const session = await this.validateRefreshSession(payload, refreshToken);
    await this.revokeSessionById(session.id);

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
    const refreshTokenId = randomUUID();

    const accessPayload: AccessTokenPayload = {
      sub: user.id,
      hospitalId: user.hospitalId,
      email: user.email,
      perfilGlobal: user.perfilGlobal,
      typ: 'access',
    };

    const refreshPayload: RefreshTokenPayload = {
      sub: user.id,
      jti: refreshTokenId,
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

    await this.prisma.sessaoAuth.create({
      data: {
        usuarioId: user.id,
        tokenId: refreshTokenId,
        tokenHash: this.hashToken(refreshToken),
        expiraEm: this.resolveRefreshTokenExpiry(refreshToken),
      },
    });

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

  private async verifyRefreshToken(refreshToken: string): Promise<RefreshTokenPayload> {
    let payload: RefreshTokenPayload;

    try {
      payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(refreshToken, {
        secret: env.JWT_REFRESH_SECRET,
      });
    } catch {
      throw new UnauthorizedException('Refresh token invalido.');
    }

    if (payload.typ !== 'refresh' || !payload.sub || !payload.jti) {
      throw new UnauthorizedException('Refresh token invalido.');
    }

    return payload;
  }

  private async validateRefreshSession(
    payload: RefreshTokenPayload,
    refreshToken: string,
  ): Promise<{ id: string }> {
    const session = await this.prisma.sessaoAuth.findUnique({
      where: {
        tokenId: payload.jti,
      },
      select: {
        id: true,
        usuarioId: true,
        tokenHash: true,
        expiraEm: true,
        revogadoEm: true,
      },
    });

    if (!session || session.usuarioId !== payload.sub) {
      throw new UnauthorizedException('Sessao de refresh token nao encontrada.');
    }

    if (session.revogadoEm) {
      throw new UnauthorizedException('Refresh token revogado.');
    }

    if (session.expiraEm.getTime() <= Date.now()) {
      throw new UnauthorizedException('Refresh token expirado.');
    }

    if (session.tokenHash !== this.hashToken(refreshToken)) {
      throw new UnauthorizedException('Refresh token invalido.');
    }

    return { id: session.id };
  }

  private async revokeSessionById(sessionId: string): Promise<void> {
    await this.prisma.sessaoAuth.updateMany({
      where: {
        id: sessionId,
        revogadoEm: null,
      },
      data: {
        revogadoEm: new Date(),
      },
    });
  }

  private resolveRefreshTokenExpiry(refreshToken: string): Date {
    const decoded = this.jwtService.decode(refreshToken);

    if (
      decoded &&
      typeof decoded === 'object' &&
      'exp' in decoded &&
      typeof decoded.exp === 'number'
    ) {
      return new Date(decoded.exp * 1000);
    }

    const fallbackMs = this.parseDurationToMs(env.JWT_REFRESH_TTL);

    if (!fallbackMs) {
      throw new InternalServerErrorException('JWT_REFRESH_TTL invalido para calcular expiracao.');
    }

    return new Date(Date.now() + fallbackMs);
  }

  private parseDurationToMs(duration: string): number | null {
    const match = /^([0-9]+)([smhd])$/i.exec(duration.trim());

    if (!match) {
      return null;
    }

    const value = Number(match[1]);
    const unit = match[2].toLowerCase();

    if (unit === 's') {
      return value * 1000;
    }

    if (unit === 'm') {
      return value * 60 * 1000;
    }

    if (unit === 'h') {
      return value * 60 * 60 * 1000;
    }

    if (unit === 'd') {
      return value * 24 * 60 * 60 * 1000;
    }

    return null;
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
