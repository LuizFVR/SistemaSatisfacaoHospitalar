export type TurnoPadrao = 'MANHA' | 'TARDE' | 'NOITE';

export const TURNOS_PADRAO = {
  MANHA: { inicioHora: 6, fimHora: 13 },
  TARDE: { inicioHora: 14, fimHora: 21 },
  NOITE: { inicioHora: 22, fimHora: 5 },
} as const;

export function calcularTurnoPorHora(hora: number): TurnoPadrao {
  if (!Number.isInteger(hora) || hora < 0 || hora > 23) {
    throw new Error('Hora invalida. Use um inteiro entre 0 e 23.');
  }

  if (hora >= TURNOS_PADRAO.MANHA.inicioHora && hora <= TURNOS_PADRAO.MANHA.fimHora) {
    return 'MANHA';
  }

  if (hora >= TURNOS_PADRAO.TARDE.inicioHora && hora <= TURNOS_PADRAO.TARDE.fimHora) {
    return 'TARDE';
  }

  return 'NOITE';
}

export function calcularTurnoPorData(data: Date): TurnoPadrao {
  return calcularTurnoPorHora(data.getHours());
}
