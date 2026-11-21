import { RAIN_SCALE, getRainLabel, formatRainValue, isRainValue } from '../src/rain-scale';

describe('rain scale', () => {
  it('has six options from 0 to 5 with pt-BR labels', () => {
    expect(RAIN_SCALE.map((option) => option.value)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(RAIN_SCALE.map((option) => option.label)).toEqual([
      'Não vai chover',
      'Garoa',
      'Chuva fraca',
      'Chuva normal/média',
      'Chuva intensa',
      "Pé-d'água",
    ]);
  });

  it('returns the label of a value', () => {
    expect(getRainLabel(3)).toBe('Chuva normal/média');
  });

  it('formats a value as "N - Rótulo"', () => {
    expect(formatRainValue(5)).toBe("5 - Pé-d'água");
  });

  it.each([
    [0, true],
    [5, true],
    [-1, false],
    [6, false],
    [2.5, false],
    ['3', false],
  ])('isRainValue(%p) is %p', (input, expected) => {
    expect(isRainValue(input)).toBe(expected);
  });
});
