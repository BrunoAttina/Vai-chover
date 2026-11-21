import { Timestamp, type Firestore, type Transaction } from 'firebase-admin/firestore';
import { COLLECTIONS } from './firestore';

const MAIL_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** Documento da fila da extensão Trigger Email (data-model.md `mail.to`, `mail.message`). */
export interface MailDoc {
  to: string;
  message: { subject: string; text: string; html: string };
  expiresAt: Timestamp;
}

export function buildLoginCodeMail(to: string, code: string, now: Date): MailDoc {
  const text =
    `Seu código de acesso ao Vai chover? é ${code}.\n\n` +
    'Ele vale por 15 minutos e só pode ser usado uma vez. ' +
    'Se você não pediu este código, ignore este e-mail.';
  const html =
    `<p>Seu código de acesso ao <strong>Vai chover?</strong> é:</p>` +
    `<p style="font-size:28px;letter-spacing:6px"><strong>${code}</strong></p>` +
    '<p>Ele vale por 15 minutos e só pode ser usado uma vez.</p>' +
    '<p>Se você não pediu este código, ignore este e-mail.</p>';
  return {
    to,
    message: { subject: `${code} é seu código do Vai chover?`, text, html },
    expiresAt: Timestamp.fromMillis(now.getTime() + MAIL_TTL_MS),
  };
}

export function enqueueMail(db: Firestore, tx: Transaction, mail: MailDoc): void {
  tx.create(db.collection(COLLECTIONS.mail).doc(), mail);
}
