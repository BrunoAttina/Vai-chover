import { Redirect, Stack, useSegments } from 'expo-router';
import { useSession } from '../../context/session';

export const unstable_settings = { anchor: 'sign-in' };

export default function AuthLayout() {
  const session = useSession();
  const segments = useSegments();
  const onProfile = segments[segments.length - 1] === 'profile';
  if (session.status === 'signedIn' && session.needsProfile && !onProfile) {
    return <Redirect href="/profile" />;
  }
  return <Stack screenOptions={{ headerShown: false }} />;
}
