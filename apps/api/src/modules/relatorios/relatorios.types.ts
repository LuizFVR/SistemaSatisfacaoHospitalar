import { Turno } from '@prisma/client';

export type RelatorioPeriodo = {
  de: string | null;
  ate: string | null;
};

export type CsatRelatorioResponse = {
  sentorId: string | null;
  totalRespostas: number;
  totalValidasCsat: number;
  respostasPositivas: number;
  csat: number;
  periodo: RelatorioPeriodo;
  turno: Turno | null;
};

export type NpsRelatorioResponse = {
  sentorId: string | null;
  totalRespostas: number;
  totalValidasNps: number;
  promotores: number;
  neutros: number;
  detratores: number;
  nps: number;
  periodo: RelatorioPeriodo;
  turno: Turno | null;
};

export type ComparativoSentoresItem = {
  sentorId: string;
  sentorNome: string;
  totalRespostas: number;
  csat: number | null;
  nps: number | null;
};

export type ComparativoSentoresResponse = {
  periodo: RelatorioPeriodo;
  turno: Turno | null;
  itens: ComparativoSentoresItem[];
};

export type ComparativoTurnosItem = {
  turno: Turno;
  totalRespostas: number;
  csat: number | null;
  nps: number | null;
};

export type ComparativoTurnosResponse = {
  sentorId: string;
  sentorNome: string;
  periodo: RelatorioPeriodo;
  itens: ComparativoTurnosItem[];
};

export type NotaBaixaRelatorioItem = {
  respostaId: string;
  sentorId: string;
  sentorNome: string;
  turno: Turno;
  notaPrincipal: number | null;
  sugestaoMelhoria: string | null;
  createdAt: string;
};

export type NotasBaixasRelatorioResponse = {
  sentorId: string | null;
  periodo: RelatorioPeriodo;
  totalNotasBaixas: number;
  itens: NotaBaixaRelatorioItem[];
};
