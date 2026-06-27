import { GlassView } from 'expo-glass-effect';
import { StyleSheet, Platform, View } from 'react-native';

interface GlassCardProps {
  children: React.ReactNode;
  intensity?: number;
}

export function GlassCard({ children, intensity = 50 }: GlassCardProps) {
  // Only use GlassView on iOS — use regular View on Android
  if (Platform.OS !== 'ios') {
    return (
      <View style={styles.androidFallback}>
        {children}
      </View>
    );
  }

  return (
    <GlassView
      style={styles.glassContainer}
      glassEffectStyle="regular"
      tintColor="rgba(255, 255, 255, 0.3)"
    >
      {children}
    </GlassView>
  );
}

const styles = StyleSheet.create({
  glassContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  androidFallback: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
});
