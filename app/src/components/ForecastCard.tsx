import { Text } from 'react-native';
import type { PeriodForecast } from '@vai-chover/shared';
import { colors, typography } from '../theme';
import { Card } from './ui';

interface ForecastCardProps {
  periodLabel: string;
  /** `undefined` enquanto carrega; `null` quando a previsão está indisponível. */
  forecast: PeriodForecast | null | undefined;
  testID?: string;
}

/** Comparativo com a previsão oficial (FR-017, FR-019). */
export function ForecastCard({ periodLabel, forecast, testID }: ForecastCardProps) {
  return (
    <Card testID={testID}>
      <Text style={typography.caption}>Previsão oficial · {periodLabel}</Text>
      {forecast === undefined ? (
        <Text style={typography.body}>Carregando previsão…</Text>
      ) : forecast === null ? (
        <Text style={typography.body}>Previsão temporariamente indisponível</Text>
      ) : (
        <Text
          style={[typography.subtitle, { color: forecast.willRain ? colors.primary : colors.text }]}
        >
          {forecast.willRain ? 'Vai chover' : 'Não vai chover'} · {forecast.probability}% de chance
          de chuva
        </Text>
      )}
    </Card>
  );
}
