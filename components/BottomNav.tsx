import * as Haptics from 'expo-haptics';
import { usePathname, useRouter } from 'expo-router';
import { DoorOpen, House, Plus, Search, User } from 'lucide-react-native';
import type { ComponentType } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fontSize, radius, spacing } from '@/constants/theme';

type IconType = ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;

/**
 * Routes that show the dock. It's intentionally hidden on the auth/welcome
 * screens, the game screen, the summary and the match-setup flow (those have
 * their own fixed CTAs, so a floating dock would overlap / hurt UX). Extend
 * this set as the Buscar / Salas / Perfil destinations are built.
 */
const VISIBLE_ROUTES = new Set(['/home', '/profile', '/rooms', '/create-room']);

/** Vertical room a screen should reserve at the bottom so its own CTA clears the dock. */
export const BOTTOM_NAV_SPACE = 88;

export function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  if (!VISIBLE_ROUTES.has(pathname)) return null;

  const soon = (label: string) =>
    Alert.alert('Próximamente', `${label} estará disponible muy pronto.`);

  const go = (action: () => void) => {
    Haptics.selectionAsync().catch(() => {});
    action();
  };

  const activeKey =
    pathname === '/home'
      ? 'home'
      : pathname === '/profile'
        ? 'perfil'
        : pathname === '/rooms'
          ? 'salas'
          : null;

  const items: { key: string; label: string; icon: IconType; onPress: () => void }[] = [
    { key: 'home', label: 'Inicio', icon: House, onPress: () => go(() => router.navigate('/home')) },
    { key: 'buscar', label: 'Buscar', icon: Search, onPress: () => soon('Buscar') },
    { key: 'salas', label: 'Salas', icon: DoorOpen, onPress: () => go(() => router.navigate('/rooms')) },
    { key: 'perfil', label: 'Perfil', icon: User, onPress: () => go(() => router.navigate('/profile')) },
  ];

  // The highlighted center action creates an online room.
  const startMatch = () => go(() => router.navigate('/create-room'));

  return (
    <View style={[styles.wrap, { paddingBottom: insets.bottom + 8 }]} pointerEvents="box-none">
      <View style={styles.dock}>
        {items.slice(0, 2).map((item) => (
          <TabItem
            key={item.key}
            label={item.label}
            icon={item.icon}
            onPress={item.onPress}
            active={activeKey === item.key}
          />
        ))}

        {/* Center highlighted "Crear" action */}
        <Pressable
          onPress={startMatch}
          accessibilityLabel="Crear partida"
          style={({ pressed }) => [styles.center, pressed && styles.pressed]}
        >
          <View style={styles.centerButton}>
            <Plus size={26} color={colors.background} strokeWidth={2.6} />
          </View>
          <Text style={styles.centerLabel}>Crear</Text>
        </Pressable>

        {items.slice(2).map((item) => (
          <TabItem
            key={item.key}
            label={item.label}
            icon={item.icon}
            onPress={item.onPress}
            active={activeKey === item.key}
          />
        ))}
      </View>
    </View>
  );
}

function TabItem({
  label,
  icon: Icon,
  onPress,
  active,
}: {
  label: string;
  icon: IconType;
  onPress: () => void;
  active: boolean;
}) {
  const tint = active ? colors.accent : colors.mutedText;
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      style={({ pressed }) => [styles.tab, pressed && styles.pressed]}
    >
      <View style={[styles.tabIcon, active && styles.tabIconActive]}>
        <Icon size={22} color={tint} strokeWidth={active ? 2.6 : 2.2} />
      </View>
      <Text style={[styles.tabLabel, { color: tint, fontWeight: active ? '800' : '600' }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  dock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 460,
    height: 66,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.xl,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    // Premium float
    shadowColor: '#000000',
    shadowOpacity: 0.45,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 14,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: spacing.xs,
  },
  tabIcon: {
    width: 40,
    height: 26,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconActive: {
    backgroundColor: 'rgba(224,221,238,0.14)',
  },
  tabLabel: {
    fontSize: fontSize.xs,
    letterSpacing: 0.2,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 3,
  },
  centerButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    marginTop: -24,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.background,
    shadowColor: colors.accent,
    shadowOpacity: 0.45,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  centerLabel: {
    fontSize: fontSize.xs,
    fontWeight: '800',
    color: colors.accent,
    letterSpacing: 0.2,
  },
  pressed: {
    opacity: 0.7,
  },
});
