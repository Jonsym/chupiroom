import { useRouter } from 'expo-router';
import { LogOut } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BOTTOM_NAV_SPACE } from '@/components/BottomNav';
import { PlayerAvatar } from '@/components/PlayerAvatar';
import { colors, fontSize, radius, spacing } from '@/constants/theme';
import {
  fetchProfileRow,
  profileFromUser,
  useAuth,
  validateSession,
  type Profile,
} from '@/lib/auth';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, configured, signOut } = useAuth();
  const [profile, setProfile] = useState<Profile>(() => profileFromUser(user));
  const [signingOut, setSigningOut] = useState(false);

  const goToAuth = () => router.replace('/auth/welcome');

  useEffect(() => {
    let active = true;
    // Show metadata immediately (works offline), then validate + refine online.
    setProfile(profileFromUser(user));
    (async () => {
      if (!configured || !user) return;
      const status = await validateSession();
      if (!active) return;
      if (status === 'invalid') {
        // Stale / deleted user → clear the local session and bounce to auth.
        await signOut();
        if (active) goToAuth();
        return;
      }
      const row = await fetchProfileRow(user.id);
      if (active && row) {
        setProfile((prev) => ({
          firstName: row.firstName ?? prev.firstName,
          lastName: row.lastName ?? prev.lastName,
          phone: row.phone ?? prev.phone,
          email: row.email ?? prev.email,
        }));
      }
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, configured]);

  const onSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await signOut();
    } catch {
      // signOut still clears the local session; redirect regardless.
    } finally {
      goToAuth();
    }
  };

  const fullName = `${profile.firstName} ${profile.lastName}`.trim();
  const displayName = fullName || 'Tu cuenta';
  const email = profile.email || '—';
  const phone = profile.phone || '—';

  return (
    <View style={styles.bg}>
      <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* Header — navigation handled by the bottom menu, no back arrow */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Perfil</Text>
          </View>

          {/* Identity card */}
          <View style={styles.identity}>
            <PlayerAvatar name={displayName} color={colors.accent} size={76} />
            <Text style={styles.name} numberOfLines={1}>
              {displayName}
            </Text>
            <Text style={styles.email} numberOfLines={1}>
              {email}
            </Text>
          </View>

          {/* Info */}
          <Text style={styles.section}>Tu información</Text>
          <View style={styles.card}>
            <InfoRow label="Nombre completo" value={displayName} />
            <View style={styles.divider} />
            <InfoRow label="Teléfono" value={phone} />
            <View style={styles.divider} />
            <InfoRow label="Email" value={email} />
          </View>

          {/* Logout */}
          <Pressable
            onPress={onSignOut}
            disabled={signingOut}
            accessibilityLabel="Cerrar sesión"
            style={({ pressed }) => [styles.logout, pressed && styles.logoutPressed]}
          >
            {signingOut ? (
              <ActivityIndicator color={colors.danger} />
            ) : (
              <>
                <LogOut size={20} color={colors.danger} strokeWidth={2.4} />
                <Text style={styles.logoutText}>Cerrar sesión</Text>
              </>
            )}
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bg: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: { flex: 1 },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: BOTTOM_NAV_SPACE + spacing.lg,
    gap: spacing.lg,
  },
  header: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
  },
  headerTitle: {
    color: colors.white,
    fontSize: fontSize.lg,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  identity: {
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  name: {
    color: colors.white,
    fontSize: fontSize.xxl,
    fontWeight: '900',
    letterSpacing: -0.8,
    marginTop: spacing.xs,
  },
  email: {
    color: colors.mutedText,
    fontSize: fontSize.md,
  },
  section: {
    color: colors.mutedText,
    fontSize: fontSize.xs,
    fontWeight: '800',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginTop: spacing.sm,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  rowLabel: {
    color: colors.mutedText,
    fontSize: fontSize.md,
  },
  rowValue: {
    flex: 1,
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: '700',
    textAlign: 'right',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  logout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 56,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.sm,
  },
  logoutPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  logoutText: {
    color: colors.danger,
    fontSize: fontSize.md,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
});
