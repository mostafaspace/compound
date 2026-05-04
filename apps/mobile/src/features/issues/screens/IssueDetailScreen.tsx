import React, { useState } from "react";
import { ScrollView, StyleSheet, View, useColorScheme, TextInput } from "react-native";
import { RouteProp, useRoute } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { ScreenContainer } from "../../../components/layout/ScreenContainer";
import { StatusBadge } from "../../../components/ui/StatusBadge";
import { Typography } from "../../../components/ui/Typography";
import { Button } from "../../../components/ui/Button";
import { RootStackParamList } from "../../../navigation/types";
import { colors, spacing, shadows } from "../../../theme";
import { issuePriorityPalette, issueStatusPalette } from "../../../theme/semantics";
import { useSelector } from "react-redux";
import { selectCurrentUser } from "../../../store/authSlice";
import { getEffectiveRoleNames, getPrimaryEffectiveRole, type Issue } from "@compound/contracts";
import { useEscalateIssueMutation, useUpdateIssueMutation } from "../../../services/property";
import { Alert } from "react-native";
import { canEscalateIssueFromMobile } from "../issue-flow-utils";
import { formatDate } from "../../../utils/formatters";

export const IssueDetailScreen = () => {
  const { t } = useTranslation();
  const isDark = useColorScheme() === "dark";
  const route = useRoute<RouteProp<RootStackParamList, "IssueDetail">>();
  const { issue } = route.params;

  const user = useSelector(selectCurrentUser);
  const [currentIssue, setCurrentIssue] = useState<Issue>(issue);
  const primaryRole = user ? getPrimaryEffectiveRole(user) : 'resident';
  const effectiveRoles = user ? getEffectiveRoleNames(user) : [primaryRole];
  const canManageStatus = ['super_admin', 'compound_admin', 'president', 'board_member', 'support_agent'].includes(primaryRole);
  const canEscalate = canEscalateIssueFromMobile({
    effectiveRoles,
    assignedTo: currentIssue.assignedTo,
    currentUserId: user?.id,
  });

  const [updateIssue, { isLoading: isUpdating }] = useUpdateIssueMutation();
  const [escalateIssue, { isLoading: isEscalating }] = useEscalateIssueMutation();
  const [escalationReason, setEscalationReason] = useState("");

  const handleUpdateStatus = async (status: string) => {
    try {
      const updatedIssue = await updateIssue({ id: currentIssue.id, body: { status } as any }).unwrap();
      setCurrentIssue(updatedIssue);
      Alert.alert(t('Common.success'), t('Issues.statusUpdated', { defaultValue: 'Issue status updated successfully' }));
    } catch (err) {
      Alert.alert(t('Common.error'), t('Issues.updateFailed', { defaultValue: 'Failed to update issue status' }));
    }
  };

  const handleEscalate = async () => {
    if (!escalationReason.trim()) {
      Alert.alert(
        t('Common.error', { defaultValue: 'Error' }),
        t('Issues.escalationReasonRequired', { defaultValue: 'Add an escalation reason before sending this issue upward.' }),
      );
      return;
    }

    try {
      const updatedIssue = await escalateIssue({ id: currentIssue.id, reason: escalationReason.trim() }).unwrap();
      setCurrentIssue(updatedIssue);
      Alert.alert(
        t('Common.success', { defaultValue: 'Success' }),
        t('Issues.escalatedSuccess', { defaultValue: 'Issue escalated successfully.' }),
      );
      setEscalationReason("");
    } catch {
      Alert.alert(
        t('Common.error', { defaultValue: 'Error' }),
        t('Issues.escalationFailed', { defaultValue: 'Failed to escalate this issue.' }),
      );
    }
  };

  const surface = isDark ? colors.surface.dark : colors.surface.light;
  const border = isDark ? colors.border.dark : colors.border.light;
  const text = isDark ? colors.text.primary.dark : colors.text.primary.light;
  const subtext = "#6b7280";
  const statusPalette = issueStatusPalette(currentIssue.status);
  const priorityPalette = issuePriorityPalette(currentIssue.priority);

  return (
    <ScreenContainer withKeyboard={false} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={[styles.card, { backgroundColor: surface, borderColor: border }]}>
          <View style={styles.headerRow}>
            <StatusBadge
              label={t(`Issues.statuses.${currentIssue.status}`, { defaultValue: currentIssue.status })}
              backgroundColor={statusPalette.background}
              textColor={statusPalette.text}
            />
            <StatusBadge
              label={t(`Issues.priorities.${currentIssue.priority}`, { defaultValue: currentIssue.priority })}
              backgroundColor={priorityPalette.background}
              textColor={priorityPalette.text}
            />
          </View>
          <Typography variant="h2" style={[styles.title, { color: text }]}>
            {currentIssue.title}
          </Typography>
          <Typography variant="caption" style={{ color: subtext, marginBottom: spacing.md }}>
            {t(`Issues.categories.${currentIssue.category}`, { defaultValue: currentIssue.category })} {"\u2022"}{" "}
            {formatDate(currentIssue.createdAt)}
          </Typography>
          <Typography style={{ color: text, lineHeight: 22 }}>{currentIssue.description}</Typography>
          {currentIssue.resolvedAt ? (
            <Typography variant="caption" style={{ color: "#22c55e", marginTop: spacing.md }}>
              {t("Issues.resolvedAt", {
                defaultValue: "Resolved: {{date}}",
                date: formatDate(currentIssue.resolvedAt),
              })}
            </Typography>
          ) : null}
        </View>

        {canManageStatus && currentIssue.status !== 'resolved' && currentIssue.status !== 'closed' && (
          <View style={[styles.adminSection, { backgroundColor: surface, borderColor: border }]}>
            <Typography variant="h3" style={styles.adminTitle}>
              {t('Admin.manageIssue', 'Manage Issue')}
            </Typography>
            <View style={styles.actionGrid}>
              {currentIssue.status !== 'in_progress' && (
                <Button
                  title={t('Issues.statuses.in_progress', 'Start Working')}
                  onPress={() => handleUpdateStatus('in_progress')}
                  loading={isUpdating || isEscalating}
                  variant="primary"
                  style={styles.actionBtn}
                />
              )}
              <Button
                title={t('Issues.statuses.resolved', 'Mark Resolved')}
                onPress={() => handleUpdateStatus('resolved')}
                loading={isUpdating || isEscalating}
                variant="primary"
                style={[styles.actionBtn, { backgroundColor: colors.success }]}
              />
            </View>
          </View>
        )}

        {canEscalate && currentIssue.status !== 'resolved' && currentIssue.status !== 'closed' && currentIssue.status !== 'escalated' && (
          <View style={[styles.adminSection, { backgroundColor: surface, borderColor: border }]}>
            <Typography variant="h3" style={styles.adminTitle}>
              {t('Issues.statuses.escalated', 'Escalate')}
            </Typography>
            <TextInput
              style={[styles.reasonInput, { backgroundColor: surface, borderColor: border, color: text }]}
              value={escalationReason}
              onChangeText={setEscalationReason}
              placeholder={t('Issues.escalationReasonPlaceholder', { defaultValue: 'Explain why this issue needs escalation...' })}
              placeholderTextColor="#9ca3af"
              multiline
              textAlignVertical="top"
            />
            <Button
              title={t('Issues.escalateNow', { defaultValue: 'Escalate to President' })}
              onPress={handleEscalate}
              loading={isUpdating || isEscalating}
              variant="ghost"
              style={[styles.actionBtn, { borderColor: colors.error }]}
              textStyle={{ color: colors.error }}
            />
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: { padding: 0 },
  scroll: { padding: spacing.md },
  card: { padding: spacing.lg, borderRadius: 16, borderWidth: 1 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  title: { marginBottom: spacing.xs },
  adminSection: {
    marginTop: spacing.md,
    padding: spacing.lg,
    borderRadius: 16,
    borderWidth: 1,
    ...shadows.sm,
  },
  adminTitle: {
    marginBottom: spacing.md,
  },
  actionGrid: {
    gap: spacing.sm,
  },
  actionBtn: {
    height: 48,
    borderRadius: 12,
  },
  reasonInput: {
    minHeight: 96,
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
});
