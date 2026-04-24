export type EscalaNota = 'CSAT_1_A_5' | 'NPS_0_A_10';

type ValidarSugestaoInput = {
  notaBaixa: boolean;
  sugestaoMelhoria?: string | null;
  tamanhoMinimo?: number;
};

export function ehNotaBaixa(nota: number, escala: EscalaNota): boolean {
  if (!Number.isInteger(nota)) {
    throw new Error('Nota invalida. A nota deve ser um numero inteiro.');
  }

  if (escala === 'CSAT_1_A_5') {
    if (nota < 1 || nota > 5) {
      throw new Error('Nota invalida para CSAT. Esperado valor entre 1 e 5.');
    }

    return nota <= 2;
  }

  if (nota < 0 || nota > 10) {
    throw new Error('Nota invalida para NPS. Esperado valor entre 0 e 10.');
  }

  return nota <= 6;
}

export function validarSugestaoMelhoriaObrigatoria({
  notaBaixa,
  sugestaoMelhoria,
  tamanhoMinimo = 10,
}: ValidarSugestaoInput): void {
  if (!notaBaixa) {
    return;
  }

  const texto = sugestaoMelhoria?.trim() ?? '';

  if (texto.length < tamanhoMinimo) {
    throw new Error(
      `Sugestao de melhoria obrigatoria para nota baixa (minimo de ${tamanhoMinimo} caracteres).`,
    );
  }
}
