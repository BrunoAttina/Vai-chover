import { getQuestionsFor, getQuestionText } from '../src/questions';

describe('questions per period', () => {
  it('madrugada asks four questions', () => {
    expect(getQuestionsFor('madrugada')).toEqual([
      { targetPeriod: 'madrugada', text: 'Você acha que vai chover agora de madrugada?' },
      { targetPeriod: 'manha', text: 'Você acha que vai chover pela manhã?' },
      { targetPeriod: 'tarde', text: 'Você acha que vai chover à tarde?' },
      { targetPeriod: 'noite', text: 'Você acha que vai chover à noite?' },
    ]);
  });

  it('manhã asks three questions', () => {
    expect(getQuestionsFor('manha')).toEqual([
      { targetPeriod: 'manha', text: 'Você acha que vai chover agora pela manhã?' },
      { targetPeriod: 'tarde', text: 'Você acha que vai chover à tarde?' },
      { targetPeriod: 'noite', text: 'Você acha que vai chover à noite?' },
    ]);
  });

  it('tarde asks two questions', () => {
    expect(getQuestionsFor('tarde')).toEqual([
      { targetPeriod: 'tarde', text: 'Você acha que vai chover agora pela tarde?' },
      { targetPeriod: 'noite', text: 'Você acha que vai chover à noite?' },
    ]);
  });

  it('noite asks one question', () => {
    expect(getQuestionsFor('noite')).toEqual([
      { targetPeriod: 'noite', text: 'Você acha que vai chover agora à noite?' },
    ]);
  });

  it('builds the question text for a target period asked in another period', () => {
    expect(getQuestionText('manha', 'tarde')).toBe('Você acha que vai chover à tarde?');
    expect(getQuestionText('tarde', 'tarde')).toBe('Você acha que vai chover agora pela tarde?');
  });
});
