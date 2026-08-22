import { StyleSheet, Text, View } from 'react-native';
import { AppButton } from './AppButton';
import { COLORS, FONT_SIZE, SPACING } from '../theme';
import { normalizeApiError } from '../utils/apiError';

interface ErrorStateProps {
  error: unknown;
  onRetry?: () => void;
  title?: string;
  message?: string;
  retryLabel?: string;
}

export function ErrorState({ error, onRetry, title, message, retryLabel }: ErrorStateProps) {
  const normalized = normalizeApiError(error, 'Unable to load data');
  return (
    <View style={styles.container} accessibilityRole="alert" accessibilityLiveRegion="polite">
      <Text style={styles.title}>{title ?? 'Something went wrong'}</Text>
      <Text style={styles.message}>{message ?? normalized.message}</Text>
      {onRetry ? <AppButton label={retryLabel ?? 'Retry'} size="sm" onPress={onRetry} style={styles.button} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  title: {
    fontSize: FONT_SIZE.lg,
    color: COLORS.text,
    fontWeight: '800',
  },
  message: {
    marginTop: SPACING.xs,
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  button: {
    marginTop: SPACING.lg,
  },
});
