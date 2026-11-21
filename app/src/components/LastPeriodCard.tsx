import { Text } from 'react-native';
import {
  formatRainValue,
  type AnalysisStatus,
  type Period,
  type RainValue,
} from '@vai-chover/shared';
import { colors, typography } from '../theme';
import { PERIOD_LABELS } from './period-labels';
import { Card } from './ui';

export interface LastPeriodResult {
  period: Period;
  localDate: string;
  myValue: RainValue;
  regionRoundedMean: RainValue;
  matchedRegion: boolean;
  status: AnalysisStatus;
}

const STATUS_TEXT: Record<AnalysisStatus, string> = {
  majorityRight: 'A maioria acertou',
  majorityWrong: 'A maioria errou',
  pending: 'Aguardando dados da chuva real',
  noData: 'Sem dados da chuva real',
};

/** "Como foi o último período" (spec User Story 4). */
export function LastPeriodCard({ result }: { result: LastPeriodResult }) {
  return (
    <Card testID="last-period-card">
      <Text style={typography.subtitle}>
        Como foi o último período ({PERIOD_LABELS[result.period]})
      </Text>
      <Text style={typography.body}>
        Seu palpite: {formatRainValue(result.myValue)} · Média da cidade:{' '}
        {formatRainValue(result.regionRoundedMean)}
      </Text>
      <Text
        style={[typography.body, { color: result.matchedRegion ? colors.success : colors.warning }]}
      >
        {result.matchedRegion ? 'Você pensou como a maioria' : 'Você pensou diferente da maioria'}
      </Text>
      <Text style={typography.body}>{STATUS_TEXT[result.status]}</Text>
    </Card>
  );
}
