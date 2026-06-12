import { Redirect } from 'expo-router';
import { View } from 'react-native';

import { colors } from '@/constants/theme';
import { useAuth } from '@/lib/auth';

/**
 * Entry route. The old marketing Welcome was removed — the first screen is now
 * Auth. Unauthenticated users go to /auth/welcome; authenticated users and
 * guests (and offline, when Supabase isn't configured) go straight to /home.
 */
export default function Index() {
  const { session, loading, configured } = useAuth();

  if (configured && loading) {
    // Brief boot while restoring a persisted session.
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }
  if (configured && !session) {
    return <Redirect href="/auth/welcome" />;
  }
  return <Redirect href="/home" />;
}
