import { Redirect, useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native';
import { PERIODS, getOfferedPeriods, getQuestionText, type Period } from '@vai-chover/shared';
import { ForecastCard } from '../../components/ForecastCard';
import { LastPeriodCard } from '../../components/LastPeriodCard';
import { PERIOD_LABELS } from '../../components/period-labels';
import { VoteBars } from '../../components/VoteBars';
import { Body, Card, Screen, Title } from '../../components/ui';
import { useRegionContext } from '../../context/region';
import { useSignedInUser } from '../../context/session';
import { useForecast, useLastResult, useTallies } from '../../hooks/useResults';
import { typography } from '../../theme';

function parsePeriods(raw: string | undefined, fallback: Period[]): Period[] {
  const parsed = (raw ?? '')
    .split(',')
    .filter((value): value is Period => (PERIODS as readonly string[]).includes(value));
  return parsed.length > 0 ? parsed : fallback;
}

/** Resultados da cidade + previsão oficial (contracts/ui-screens.md `/results`). */
export default function ResultsScreen() {
  const { region } = useRegionContext();
  if (!region) {
    return <Redirect href="/" />;
  }
  return (
    <Results
      regionId={region.regionId}
      localDate={region.localDate}
      currentPeriod={region.currentPeriod}
      cityName={region.name}
    />
  );
}

interface ResultsProps {
  regionId: string;
  localDate: string;
  currentPeriod: Period;
  cityName: string;
}

function Results({ regionId, localDate, currentPeriod, cityName }: ResultsProps) {
  const params = useLocalSearchParams<{ periods?: string; notice?: string }>();
  const user = useSignedInUser();
  const periods = parsePeriods(params.periods, getOfferedPeriods(currentPeriod));
  const counts = useTallies(regionId, localDate, periods);
  const forecast = useForecast(regionId, localDate, periods);
  const lastResult = useLastResult(user.uid);

  return (
    <Screen testID="results-screen">
      <Title>Palpites em {cityName}</Title>
      {params.notice ? <Body muted>{params.notice}</Body> : null}
      {lastResult ? <LastPeriodCard result={lastResult} /> : null}
      {periods.map((period) => (
        <Card key={period} testID={`result-${period}`}>
          <Text style={typography.subtitle}>{getQuestionText(currentPeriod, period)}</Text>
          <VoteBars counts={counts[period] ?? [0, 0, 0, 0, 0, 0]} testID={`bars-${period}`} />
        </Card>
      ))}
      <Title>Comparativo com a previsão</Title>
      {periods.map((period) => (
        <ForecastCard
          key={period}
          testID={`forecast-${period}`}
          periodLabel={PERIOD_LABELS[period]}
          forecast={
            forecast.status === 'loading'
              ? undefined
              : forecast.status === 'unavailable'
                ? null
                : (forecast.periods[period] ?? null)
          }
        />
      ))}
    </Screen>
  );
}
