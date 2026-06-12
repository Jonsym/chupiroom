import { useRouter } from 'expo-router';
import { DoorOpen } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { BOTTOM_NAV_SPACE } from '@/components/BottomNav';
import { Screen } from '@/components/Screen';
import { colors, fontSize, radius, spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { joinRoom } from '@/lib/rooms';
import { AVATAR_COLORS } from '@/store/useGameStore';

export default function RoomsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const defaultName =
    (user?.user_metadata as { first_name?: string } | undefined)?.first_name ?? '';

  const [name, setName] = useState(defaultName);
  const [code, setCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onJoin = async () => {
    const trimmedCode = code.trim().toUpperCase();
    if (!name.trim()) return setError('Introduce tu nombre.');
    if (trimmedCode.length < 4) return setError('Introduce un código de sala válido.');
    setError(null);
    setJoining(true);
    try {
      await joinRoom(trimmedCode, { displayName: name.trim(), color: AVATAR_COLORS[3] });
      router.replace({ pathname: '/room/[code]', params: { code: trimmedCode } });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo unir a la sala.');
    } finally {
      setJoining(false);
    }
  };

  return (
    <Screen scroll contentStyle={styles.content}>
      <Text style={styles.title}>Salas</Text>

      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <DoorOpen size={28} color={colors.accent} strokeWidth={2.2} />
        </View>
        <Text style={styles.heroTitle}>Únete a una sala</Text>
        <Text style={styles.heroSub}>Pide el código a quien creó la partida e introdúcelo aquí.</Text>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Tu nombre</Text>
        <TextInput
          value={name}
          onChangeText={(t) => {
            setName(t);
            if (error) setError(null);
          }}
          placeholder="¿Cómo te ven en la sala?"
          placeholderTextColor={colors.mutedText}
          style={styles.input}
          maxLength={20}
          autoCapitalize="words"
          editable={!joining}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Código de sala</Text>
        <TextInput
          value={code}
          onChangeText={(t) => {
            setCode(t.toUpperCase());
            if (error) setError(null);
          }}
          placeholder="Ej. K7M2P"
          placeholderTextColor={colors.mutedText}
          style={[styles.input, styles.codeInput]}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={8}
          editable={!joining}
          onSubmitEditing={onJoin}
          returnKeyType="go"
        />
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      <AppButton label="Unirse a la sala" onPress={onJoin} loading={joining} disabled={joining} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: BOTTOM_NAV_SPACE + spacing.lg,
  },
  title: {
    color: colors.white,
    fontSize: fontSize.xxl,
    fontWeight: '900',
    letterSpacing: -1,
    marginBottom: spacing.lg,
  },
  hero: {
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xl,
  },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(224,221,238,0.12)',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  heroTitle: {
    color: colors.white,
    fontSize: fontSize.xl,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  heroSub: {
    color: colors.mutedText,
    fontSize: fontSize.md,
    textAlign: 'center',
    maxWidth: 320,
    lineHeight: 22,
  },
  field: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  label: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.white,
    fontSize: fontSize.md,
  },
  codeInput: {
    fontSize: fontSize.xl,
    fontWeight: '800',
    letterSpacing: 6,
    textAlign: 'center',
  },
  error: {
    color: colors.danger,
    fontSize: fontSize.sm,
    fontWeight: '600',
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
  },
});
