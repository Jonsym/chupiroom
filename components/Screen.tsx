import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { gradients, spacing } from '@/constants/theme';

type ScreenProps = {
  children?: ReactNode;
  /** When true the content is wrapped in a ScrollView. */
  scroll?: boolean;
  contentStyle?: ViewStyle;
};

/**
 * Base screen wrapper: dark gradient background + safe-area padding.
 * Every screen renders inside this so the look stays consistent.
 */
export function Screen({ children, scroll = false, contentStyle }: ScreenProps) {
  const inner = scroll ? (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[styles.content, contentStyle]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.flex, styles.content, contentStyle]}>{children}</View>
  );

  return (
    <LinearGradient colors={gradients.screen} style={styles.flex}>
      <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
        {inner}
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
});
