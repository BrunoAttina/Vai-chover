import { getOfferedPeriods } from './periods';
import type { Period } from './types';

export interface Question {
  targetPeriod: Period;
  text: string;
}

const CURRENT_PERIOD_TEXT: Record<Period, string> = {
  madrugada: 'Você acha que vai chover agora de madrugada?',
  manha: 'Você acha que vai chover agora pela manhã?',
  tarde: 'Você acha que vai chover agora pela tarde?',
  noite: 'Você acha que vai chover agora à noite?',
};

const UPCOMING_PERIOD_TEXT: Record<Period, string> = {
  madrugada: 'Você acha que vai chover de madrugada?',
  manha: 'Você acha que vai chover pela manhã?',
  tarde: 'Você acha que vai chover à tarde?',
  noite: 'Você acha que vai chover à noite?',
};

export function getQuestionText(askedIn: Period, target: Period): string {
  return askedIn === target ? CURRENT_PERIOD_TEXT[target] : UPCOMING_PERIOD_TEXT[target];
}

/** Perguntas exibidas no período atual (spec, User Story 2). */
export function getQuestionsFor(current: Period): Question[] {
  return getOfferedPeriods(current).map((targetPeriod) => ({
    targetPeriod,
    text: getQuestionText(current, targetPeriod),
  }));
}
