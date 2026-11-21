import { render, screen } from '@testing-library/react-native';
import { LastPeriodCard, type LastPeriodResult } from '../../src/components/LastPeriodCard';

const base: LastPeriodResult = {
  period: 'manha',
  localDate: '2026-11-21',
  myValue: 3,
  regionRoundedMean: 3,
  matchedRegion: true,
  status: 'majorityRight',
};

describe('LastPeriodCard', () => {
  it('shows the vote, the city mean and that the person matched the majority', async () => {
    await render(<LastPeriodCard result={base} />);
    expect(screen.getByText('Como foi o último período (manhã)')).toBeTruthy();
    expect(
      screen.getByText(
        'Seu palpite: 3 - Chuva normal/média · Média da cidade: 3 - Chuva normal/média',
      ),
    ).toBeTruthy();
    expect(screen.getByText('Você pensou como a maioria')).toBeTruthy();
    expect(screen.getByText('A maioria acertou')).toBeTruthy();
  });

  it.each([
    ['majorityWrong', 'A maioria errou'],
    ['pending', 'Aguardando dados da chuva real'],
    ['noData', 'Sem dados da chuva real'],
  ] as const)('status %s → %s', async (status, text) => {
    await render(
      <LastPeriodCard
        result={{ ...base, status, matchedRegion: false, myValue: 0, regionRoundedMean: 4 }}
      />,
    );
    expect(screen.getByText(text)).toBeTruthy();
    expect(screen.getByText('Você pensou diferente da maioria')).toBeTruthy();
  });
});
