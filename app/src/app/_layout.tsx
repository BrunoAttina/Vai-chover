import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SessionProvider, useSession } from '../context/session';
import { colors } from '../theme';

function RootNavigator() {
  const session = useSession();
  if (session.status === 'loading') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }} testID="splash">
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }
  const ready = session.status === 'signedIn' && !session.needsProfile;
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={ready}>
        <Stack.Screen name="(main)" />
      </Stack.Protected>
      <Stack.Protected guard={!ready}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SessionProvider>
        <StatusBar style="dark" />
        <RootNavigator />
      </SessionProvider>
    </SafeAreaProvider>
  );
}
