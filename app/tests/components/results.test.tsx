import { render, screen } from '@testing-library/react-native';
import { VoteBars } from '../../src/components/VoteBars';
import { ForecastCard } from '../../src/components/ForecastCard';
import { describeRejections } from '../../src/components/vote-messages';

describe('VoteBars', () => {
  it('shows all six options, including zeros, and the total', async () => {
    await render(<VoteBars counts={[0, 2, 0, 5, 0, 1]} testID="bars" />);
    expect(
      [0, 1, 2, 3, 4, 5].map((value) => screen.getByTestId(`bars-count-${value}`).props.children),
    ).toEqual([0, 2, 0, 5, 0, 1]);
    expect(screen.getByText("5 - Pé-d'água")).toBeTruthy();
    expect(screen.getByText('8 votos na sua cidade')).toBeTruthy();
  });

  it('handles a single vote and missing positions', async () => {
    await render(<VoteBars counts={[1]} testID="bars" />);
    expect(screen.getByText('1 voto na sua cidade')).toBeTruthy();
    expect(screen.getByTestId('bars-count-5').props.children).toBe(0);
    expect(screen.getByLabelText('0 - Não vai chover: 1 voto')).toBeTruthy();
  });
});

describe('ForecastCard', () => {
  it('shows rain and probability', async () => {
    await render(
      <ForecastCard periodLabel="tarde" forecast={{ probability: 80, willRain: true }} />,
    );
    expect(screen.getByText('Vai chover · 80% de chance de chuva')).toBeTruthy();
  });

  it('shows no rain', async () => {
    await render(
      <ForecastCard periodLabel="noite" forecast={{ probability: 10, willRain: false }} />,
    );
    expect(screen.getByText('Não vai chover · 10% de chance de chuva')).toBeTruthy();
  });

  it('shows the unavailable and loading states', async () => {
    const { rerender } = await render(<ForecastCard periodLabel="noite" forecast={null} />);
    expect(screen.getByText('Previsão temporariamente indisponível')).toBeTruthy();
    await rerender(<ForecastCard periodLabel="noite" forecast={undefined} />);
    expect(screen.getByText('Carregando previsão…')).toBeTruthy();
  });
});

describe('describeRejections', () => {
  it('describes each rejected period', () => {
    expect(describeRejections([])).toBeNull();
    expect(
      describeRejections([
        { targetPeriod: 'manha', reason: 'period_ended' },
        { targetPeriod: 'noite', reason: 'already_voted' },
        { targetPeriod: 'tarde', reason: 'not_offered' },
      ]),
    ).toBe(
      'Não registramos: manhã (o período já terminou), noite (você já votou), tarde (o período não está disponível).',
    );
  });
});
