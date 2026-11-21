export type Severity = 'INFO' | 'WARNING' | 'ERROR';
export type LogSink = (severity: Severity, entry: Record<string, unknown>) => void;

export interface Logger {
  info(event: string, fields?: Record<string, unknown>): void;
  warn(event: string, fields?: Record<string, unknown>): void;
  error(event: string, fields?: Record<string, unknown>): void;
}

/** Logger estruturado. Nunca registrar e-mails, nomes, códigos ou coordenadas. */
export function createLogger(sink: LogSink): Logger {
  const write =
    (severity: Severity) =>
    (event: string, fields: Record<string, unknown> = {}) =>
      sink(severity, { event, ...fields });
  return { info: write('INFO'), warn: write('WARNING'), error: write('ERROR') };
}
