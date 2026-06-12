import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/theme';

type PlayerAvatarProps = {
  name: string;
  color: string;
  size?: number;
};

/** Returns up to two uppercase initials from a display name. */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function PlayerAvatar({ name, color, size = 44 }: PlayerAvatarProps) {
  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        },
      ]}
    >
      <Text style={[styles.initials, { fontSize: size * 0.36 }]}>{initials(name)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },
  initials: {
    // Dark glyphs read clearly on the light, muted avatar tones.
    color: colors.background,
    fontWeight: '800',
  },
});
