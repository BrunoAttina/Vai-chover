import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';

const CODE_SPACE = 1_000_000;

export type RandomSource = (maxExclusive: number) => number;

/** Código numérico de 6 dígitos gerado com fonte criptográfica. */
export function generateCode(random: RandomSource = randomInt): string {
  return String(random(CODE_SPACE)).padStart(6, '0');
}

/** HMAC-SHA256 em hex; usado para códigos e para o ID do e-mail (data-model.md `loginCodes`). */
export function hmac(pepper: string, value: string): string {
  return createHmac('sha256', pepper).update(value).digest('hex');
}

export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
