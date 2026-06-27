import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { AppButton } from './AppButton';
import { COLORS, FONT_SIZE, RADIUS, SHADOWS, SPACING } from '../theme';

interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  loading?: boolean;
  destructive?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmModal({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  loading,
  destructive,
  onCancel,
  onConfirm,
}: ConfirmModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.overlay} onPress={onCancel}>
        <Pressable style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.actions}>
            <AppButton label="Cancel" variant="outline" style={styles.action} onPress={onCancel} />
            <AppButton
              label={confirmLabel}
              loading={loading}
              style={[styles.action, destructive && styles.destructiveButton]}
              onPress={onConfirm}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    ...SHADOWS.md,
  },
  title: {
    fontSize: FONT_SIZE.xl,
    color: COLORS.text,
    fontWeight: '800',
  },
  message: {
    marginTop: SPACING.sm,
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  actions: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.xl,
  },
  action: {
    flex: 1,
  },
  destructiveButton: {
    backgroundColor: COLORS.danger,
  },
});
