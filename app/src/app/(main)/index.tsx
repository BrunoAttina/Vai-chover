import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Body, Button, Card, ErrorText, Field, Screen, Title } from '../../components/ui';
import { useRegionContext } from '../../context/region';
import { useRegion } from '../../hooks/useRegion';
import { toUserMessage } from '../../services/api';
import { getApi } from '../../services/firebase';
import { colors, spacing, typography } from '../../theme';

const UFS = [
  'AC',
  'AL',
  'AM',
  'AP',
  'BA',
  'CE',
  'DF',
  'ES',
  'GO',
  'MA',
  'MG',
  'MS',
  'MT',
  'PA',
  'PB',
  'PE',
  'PI',
  'PR',
  'RJ',
  'RN',
  'RO',
  'RR',
  'RS',
  'SC',
  'SE',
  'SP',
  'TO',
];

const MANUAL_MESSAGES = {
  denied: 'Sem acesso à localização. Escolha sua cidade na lista.',
  unavailable: 'Não conseguimos obter sua localização. Escolha sua cidade na lista.',
  notFound: 'Não identificamos sua cidade. Escolha-a na lista.',
} as const;

/** Tela de localização (contracts/ui-screens.md `/location`). */
export default function LocationScreen() {
  const { setRegion } = useRegionContext();
  const { status, error, manualReason, locate, chooseManual } = useRegion();

  async function proceed(resolve: () => Promise<Parameters<typeof setRegion>[0]>) {
    const region = await resolve();
    if (region) {
      setRegion(region);
      router.replace('/vote');
    }
  }

  return (
    <Screen testID="location-screen">
      <Title>Onde você está?</Title>
      <Body>
        Usamos sua localização só para descobrir sua cidade e o horário local. A localização exata
        não é guardada.
      </Body>
      {status !== 'manual' ? (
        <Button
          label="Usar minha localização"
          onPress={() => proceed(locate)}
          loading={status === 'locating'}
          testID="use-location-button"
        />
      ) : null}
      {error ? <ErrorText>{error}</ErrorText> : null}
      {status === 'manual' || status === 'error' ? (
        <ManualCityPicker
          message={manualReason ? MANUAL_MESSAGES[manualReason] : null}
          onChoose={(ibgeCode) => proceed(() => chooseManual(ibgeCode))}
        />
      ) : null}
    </Screen>
  );
}

function ManualCityPicker({
  message,
  onChoose,
}: {
  message: string | null;
  onChoose: (ibgeCode: string) => void;
}) {
  const [uf, setUf] = useState<string | null>(null);
  const [cities, setCities] = useState<{ ibgeCode: string; name: string }[]>([]);
  const [filter, setFilter] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!uf) {
      return;
    }
    let active = true;
    getApi()
      .listMunicipalities({ state: uf })
      .then((result) => active && setCities(result.items))
      .catch((caught: unknown) => active && setError(toUserMessage(caught)));
    return () => {
      active = false;
    };
  }, [uf]);

  const visible = cities.filter((city) =>
    city.name.toLocaleLowerCase('pt-BR').includes(filter.toLocaleLowerCase('pt-BR')),
  );

  return (
    <Card testID="manual-picker">
      {message ? <Body>{message}</Body> : null}
      <Text style={typography.caption}>Estado (UF)</Text>
      <View style={styles.grid}>
        {UFS.map((code) => (
          <Pressable
            key={code}
            accessibilityRole="button"
            accessibilityState={{ selected: code === uf }}
            onPress={() => {
              setUf(code);
              setCities([]);
            }}
            style={[styles.chip, code === uf && styles.chipSelected]}
            testID={`uf-${code}`}
          >
            <Text style={code === uf ? styles.chipTextSelected : typography.body}>{code}</Text>
          </Pressable>
        ))}
      </View>
      {error ? <ErrorText>{error}</ErrorText> : null}
      {uf ? (
        <>
          <Field
            label="Buscar cidade"
            value={filter}
            onChangeText={setFilter}
            testID="city-filter"
          />
          {visible.slice(0, 50).map((city) => (
            <Pressable
              key={city.ibgeCode}
              accessibilityRole="button"
              onPress={() => onChoose(city.ibgeCode)}
              style={styles.city}
              testID={`city-${city.ibgeCode}`}
            >
              <Text style={typography.body}>{city.name}</Text>
            </Pressable>
          ))}
        </>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    minWidth: 48,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
  },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipTextSelected: { color: colors.primaryText, fontSize: 16 },
  city: { paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
});
