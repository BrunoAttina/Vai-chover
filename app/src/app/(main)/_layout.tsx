import { Link, Stack } from 'expo-router';
import { Text } from 'react-native';
import { RegionProvider } from '../../context/region';
import { colors } from '../../theme';

function AccountLink() {
  return (
    <Link href="/account" testID="account-link" accessibilityLabel="Minha conta">
      <Text style={{ color: colors.primary, fontSize: 16 }}>Conta</Text>
    </Link>
  );
}

export default function MainLayout() {
  return (
    <RegionProvider>
      <Stack
        screenOptions={{
          headerTitle: 'Vai chover?',
          headerRight: AccountLink,
          headerStyle: { backgroundColor: colors.background },
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen
          name="account"
          options={{ headerTitle: 'Minha conta', headerRight: () => null }}
        />
      </Stack>
    </RegionProvider>
  );
}
