import { StyleSheet, Text, View } from 'react-native';
import { RAIN_SCALE } from '@vai-chover/shared';
import { colors, radius, spacing, typography } from '../theme';

interface VoteBarsProps {
  /** counts[i] = votos na opção i (0–5). */
  counts: readonly number[];
  testID?: string;
}

/** Contagem de votos por opção, incluindo as opções sem votos (FR-016). */
export function VoteBars({ counts, testID }: VoteBarsProps) {
  const total = counts.reduce((sum, count) => sum + count, 0);
  const max = Math.max(1, ...counts);
  return (
    <View style={styles.container} testID={testID}>
      {RAIN_SCALE.map((option) => {
        const count = counts[option.value] ?? 0;
        return (
          <View
            key={option.value}
            style={styles.row}
            accessible
            accessibilityLabel={`${option.value} - ${option.label}: ${count} ${count === 1 ? 'voto' : 'votos'}`}
          >
            <Text style={[typography.caption, styles.label]} numberOfLines={1}>
              {option.value} - {option.label}
            </Text>
            <View style={styles.track}>
              <View style={[styles.fill, { flex: count / max }]} />
              <View style={{ flex: 1 - count / max }} />
            </View>
            <Text
              style={[typography.body, styles.count]}
              testID={testID ? `${testID}-count-${option.value}` : undefined}
            >
              {count}
            </Text>
          </View>
        );
      })}
      <Text style={typography.caption}>
        {total} {total === 1 ? 'voto' : 'votos'} na sua cidade
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  label: { width: 150 },
  track: {
    flex: 1,
    height: 14,
    flexDirection: 'row',
    backgroundColor: colors.barEmpty,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  fill: { backgroundColor: colors.bar },
  count: { width: 32, textAlign: 'right' },
});
