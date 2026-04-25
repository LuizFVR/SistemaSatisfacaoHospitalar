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
