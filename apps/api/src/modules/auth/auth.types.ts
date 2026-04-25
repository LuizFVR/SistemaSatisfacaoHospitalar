import { PerfilGlobal } from '@prisma/client';

export type AuthenticatedUser = {
  id: string;
  hospitalId: string;
  email: string;
  perfilGlobal: PerfilGlobal;
};

export type AccessTokenPayload = {
  sub: string;
  hospitalId: string;
  email: string;
  perfilGlobal: PerfilGlobal;
  typ: 'access';
};

export type RefreshTokenPayload = {
  sub: string;
  jti: string;
  typ: 'refresh';
  exp?: number;
};

export type LogoutResponse = {
  message: string;
  userId: string;
};

export type AuthAuditContext = {
  ip: string | null;
  userAgent: string | null;
};

export type AuthTokensResponse = {
  tokenType: 'Bearer';
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: string;
  refreshTokenExpiresIn: string;
  user: {
    id: string;
    nome: string;
    email: string;
    hospitalId: string;
    perfilGlobal: PerfilGlobal;
  };
};
