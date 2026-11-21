import Slider from '@react-native-community/slider';
import { StyleSheet, Text, View } from 'react-native';
import { formatRainValue, type RainValue } from '@vai-chover/shared';
import { colors, spacing, typography } from '../theme';

interface RainSliderProps {
  question: string;
  value: RainValue | null;
  onChange: (value: RainValue) => void;
  testID?: string;
}

/**
 * Seletor 0–5 (contracts/ui-screens.md). Começa sem valor escolhido para evitar um "0" acidental:
 * o rótulo pede uma escolha até a primeira interação.
 */
export function RainSlider({ question, value, onChange, testID }: RainSliderProps) {
  const label = value === null ? 'Arraste para escolher' : formatRainValue(value);
  return (
    <View style={styles.container} testID={testID}>
      <Text style={typography.subtitle}>{question}</Text>
      <Slider
        testID={testID ? `${testID}-slider` : undefined}
        accessibilityLabel={question}
        accessibilityValue={{ text: label }}
        minimumValue={0}
        maximumValue={5}
        step={1}
        value={value ?? 0}
        onValueChange={(next: number) => onChange(Math.round(next) as RainValue)}
        minimumTrackTintColor={colors.primary}
        maximumTrackTintColor={colors.border}
        thumbTintColor={value === null ? colors.textMuted : colors.primary}
      />
      <Text
        style={[typography.body, value === null && styles.placeholder]}
        testID={testID ? `${testID}-label` : undefined}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  placeholder: { color: colors.textMuted, fontStyle: 'italic' },
});
