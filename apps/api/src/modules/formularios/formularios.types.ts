import { StatusFormulario } from '@prisma/client';

export type FormularioResponse = {
  id: string;
  hospitalId: string;
  nome: string;
  descricao: string | null;
  status: StatusFormulario;
  criadoPorId: string;
  ultimaVersaoNumero: number | null;
  createdAt: string;
  updatedAt: string;
};

export type FormularioVersaoResponse = {
  id: string;
  formularioId: string;
  numeroVersao: number;
  estruturaJson: unknown;
  publicadoEm: string | null;
  publicadoPorId: string | null;
  createdAt: string;
};
