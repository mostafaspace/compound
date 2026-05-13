import React from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  useColorScheme,
  View,
  ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, radii, shadows, spacing, typography } from "../../theme";
import { Icon } from "./Icon";

type BottomSheetProps = {
  visible?: boolean;
  title?: string;
  subtitle?: string;
  header?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  onClose: () => void;
  closeLabel?: string;
  contentContainerStyle?: StyleProp<ViewStyle>;
  maxHeight?: `${number}%`;
  sheetStyle?: StyleProp<ViewStyle>;
  titleStyle?: StyleProp<TextStyle>;
};

export function BottomSheet({
  visible = true,
  title,
  subtitle,
  header,
  children,
  footer,
  onClose,
  closeLabel = "Close sheet",
  contentContainerStyle,
  maxHeight = "88%",
  sheetStyle,
  titleStyle,
}: BottomSheetProps) {
  const isDark = useColorScheme() === "dark";
  const insets = useSafeAreaInsets();
  const mode = isDark ? "dark" : "light";

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable accessibilityRole="button" accessibilityLabel={closeLabel} onPress={onClose} style={styles.backdrop}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          pointerEvents="box-none"
          style={styles.keyboardAvoider}
        >
          <Pressable
            onPress={(event) => event.stopPropagation()}
            style={[
              styles.sheet,
              {
                backgroundColor: colors.surface[mode],
                maxHeight,
                paddingBottom: Math.max(insets.bottom, spacing.sm),
              },
              sheetStyle,
            ]}
          >
            <View style={styles.handle} />
            <View style={styles.headerRow}>
              <View style={styles.headerText}>
                {header ?? (
                  <>
                    {title ? (
                      <Text style={[styles.title, { color: colors.text.primary[mode] }, titleStyle]}>{title}</Text>
                    ) : null}
                    {subtitle ? (
                      <Text style={[styles.subtitle, { color: colors.text.secondary[mode] }]}>{subtitle}</Text>
                    ) : null}
                  </>
                )}
              </View>
              <Pressable
                accessibilityLabel={closeLabel}
                accessibilityRole="button"
                hitSlop={8}
                onPress={onClose}
                style={({ pressed }) => [
                  styles.closeButton,
                  {
                    backgroundColor: colors.surfaceMuted[mode],
                    borderColor: colors.border[mode],
                  },
                  pressed && styles.pressed,
                ]}
              >
                <Icon name="x" color={colors.text.primary[mode]} size={18} />
              </Pressable>
            </View>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              style={styles.content}
              contentContainerStyle={[styles.contentContainer, contentContainerStyle]}
            >
              {children}
            </ScrollView>

            {footer ? (
              <View
                style={[
                  styles.footer,
                  {
                    backgroundColor: colors.surface[mode],
                    borderColor: colors.border[mode],
                  },
                ]}
              >
                {footer}
              </View>
            ) : null}
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: "rgba(7, 17, 31, 0.58)",
    flex: 1,
    justifyContent: "flex-end",
  },
  keyboardAvoider: {
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopEndRadius: radii.xl,
    borderTopStartRadius: radii.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    ...shadows.lg,
  },
  handle: {
    alignSelf: "center",
    backgroundColor: colors.border.light,
    borderRadius: radii.pill,
    height: 4,
    marginBottom: spacing.md,
    width: 48,
  },
  headerRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md,
  },
  headerText: {
    flex: 1,
  },
  title: {
    ...typography.h2,
  },
  subtitle: {
    ...typography.body,
    marginTop: spacing.xs,
  },
  closeButton: {
    alignItems: "center",
    borderRadius: radii.pill,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  content: {
    marginTop: spacing.md,
  },
  contentContainer: {
    paddingBottom: spacing.lg,
  },
  footer: {
    borderTopWidth: 1,
    paddingTop: spacing.md,
  },
  pressed: {
    opacity: 0.68,
  },
});
