import { SetMetadata } from '@nestjs/common';
import { PerfilGlobal } from '@prisma/client';

export const ROLES_KEY = 'roles';

export const Roles = (...roles: PerfilGlobal[]): ReturnType<typeof SetMetadata> =>
  SetMetadata(ROLES_KEY, roles);
