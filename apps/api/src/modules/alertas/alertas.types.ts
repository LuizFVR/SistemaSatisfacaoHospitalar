import { SeveridadeAlerta, StatusAlerta, TipoAlerta } from '@prisma/client';

export type AlertaResponse = {
  id: string;
  tipoAlerta: TipoAlerta;
  sentorId: string;
  sentorNome: string;
  severidade: SeveridadeAlerta;
  titulo: string;
  descricao: string;
  status: StatusAlerta;
  disparadoEm: string;
  resolvidoEm: string | null;
  createdAt: string;
  updatedAt: string;
};
