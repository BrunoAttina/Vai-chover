import { HttpsError } from 'firebase-functions/v2/https';
import type { z } from 'zod';

/** Valida a entrada de uma callable; erros expõem só os campos inválidos, nunca os valores. */
export function parseInput<T extends z.ZodType>(schema: T, data: unknown): z.infer<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    const fields = [...new Set(result.error.issues.map((issue) => issue.path.join('.')))];
    throw new HttpsError('invalid-argument', 'Invalid input.', { fields });
  }
  return result.data;
}
