export type SentorQrResponse = {
  slugPublicoUnico: string;
  urlPublica: string;
};

export type SentorResponse = {
  id: string;
  hospitalId: string;
  nome: string;
  codigo: string | null;
  localizacao: string | null;
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
  qr: SentorQrResponse | null;
};
