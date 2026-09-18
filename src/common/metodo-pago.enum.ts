export const MetodoPago = {
  EFECTIVO: 'EFECTIVO',
  TRANSFERENCIA: 'TRANSFERENCIA',
  QR: 'QR',
  DEBITO: 'DEBITO',
  CREDITO: 'CREDITO',
  OTRO: 'OTRO',
} as const;

export type MetodoPago = (typeof MetodoPago)[keyof typeof MetodoPago];

export const METODOS_PAGO = Object.values(MetodoPago);
export const METODOS_PAGO_BANCARIZADOS = [
  MetodoPago.TRANSFERENCIA,
  MetodoPago.QR,
  MetodoPago.DEBITO,
  MetodoPago.CREDITO,
] as const;
export const METODOS_PAGO_PERSISTIDOS = [
  ...METODOS_PAGO,
  'BANCARIZADO',
] as const;

export type MetodoPagoPersistido = (typeof METODOS_PAGO_PERSISTIDOS)[number];
export type CategoriaPago = 'EFECTIVO' | 'BANCARIZADO';
export type CategoriaReportePago = CategoriaPago | 'OTRO';
export const DETALLE_PAGO_MAX_LENGTH = 120;

const METODO_PAGO_ALIASES: Record<string, MetodoPago> = {
  EFECTIVO: MetodoPago.EFECTIVO,
  CASH: MetodoPago.EFECTIVO,
  TRANSFERENCIA: MetodoPago.TRANSFERENCIA,
  TRANSFER: MetodoPago.TRANSFERENCIA,
  TRANSFERENCIAS: MetodoPago.TRANSFERENCIA,
  BANCARIZADO: MetodoPago.TRANSFERENCIA,
  DEBITO: MetodoPago.DEBITO,
  DEBIT: MetodoPago.DEBITO,
  CREDITO: MetodoPago.CREDITO,
  CREDIT: MetodoPago.CREDITO,
  QR: MetodoPago.QR,
  QR_EXTERNO: MetodoPago.OTRO,
  'QR EXTERNO': MetodoPago.OTRO,
  QR_EXT: MetodoPago.OTRO,
  OTRO: MetodoPago.OTRO,
  OTHER: MetodoPago.OTRO,
  MERCADO_PAGO: MetodoPago.OTRO,
  'MERCADO PAGO': MetodoPago.OTRO,
  MERCADOPAGO: MetodoPago.OTRO,
  MP: MetodoPago.OTRO,
  CHEQUE: MetodoPago.OTRO,
  GIFT_CARD: MetodoPago.OTRO,
  'GIFT CARD': MetodoPago.OTRO,
  GIFTCARD: MetodoPago.OTRO,
};

export function normalizarMetodoPago(value: unknown): MetodoPago | unknown {
  if (typeof value !== 'string') return value;

  const normalized = value.trim().toUpperCase();
  return METODO_PAGO_ALIASES[normalized] ?? normalized;
}

export function normalizarFiltroMetodoPago(
  value: unknown,
): MetodoPagoPersistido | undefined {
  if (typeof value !== 'string' || !value.trim()) return undefined;

  const normalized = value.trim().toUpperCase();
  if (normalized === 'BANCARIZADO') return 'BANCARIZADO';

  const metodo = normalizarMetodoPago(normalized);
  return esMetodoPagoPersistido(metodo) ? metodo : undefined;
}

export function esMetodoPago(value: unknown): value is MetodoPago {
  return METODOS_PAGO.includes(value as MetodoPago);
}

export function esMetodoPagoPersistido(
  value: unknown,
): value is MetodoPagoPersistido {
  return METODOS_PAGO_PERSISTIDOS.includes(value as MetodoPagoPersistido);
}

export function esMetodoPagoBancarizado(value: unknown): boolean {
  return (
    value === 'BANCARIZADO' || METODOS_PAGO_BANCARIZADOS.includes(value as any)
  );
}

export function requiereDetallePago(value: unknown): boolean {
  return value === MetodoPago.OTRO;
}

export function normalizarDetallePago(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const detalle = value.trim();
  return detalle.length > 0 ? detalle : null;
}

export function categoriaMetodoPago(value: unknown): CategoriaReportePago {
  if (value === MetodoPago.EFECTIVO) return 'EFECTIVO';
  if (value === MetodoPago.OTRO) return 'OTRO';
  return 'BANCARIZADO';
}

export function metodosParaFiltroPago(
  value?: MetodoPagoPersistido,
): MetodoPagoPersistido[] {
  if (!value) return [];
  if (value === 'BANCARIZADO') {
    return ['BANCARIZADO', ...METODOS_PAGO_BANCARIZADOS];
  }
  return [value];
}
