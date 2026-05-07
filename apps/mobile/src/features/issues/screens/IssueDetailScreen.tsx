import React, { useState } from "react";
import { ScrollView, StyleSheet, View, useColorScheme, TextInput, Image, ActivityIndicator, TouchableOpacity } from "react-native";
import { RouteProp, useRoute, useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { useTranslation } from "react-i18next";
import { ScreenContainer } from "../../../components/layout/ScreenContainer";
import { StatusBadge } from "../../../components/ui/StatusBadge";
import { Typography } from "../../../components/ui/Typography";
import { Button } from "../../../components/ui/Button";
import { ImageViewer } from "../../../components/ui/ImageViewer";
import { RootStackParamList } from "../../../navigation/types";
import { colors, layout, radii, spacing, shadows } from "../../../theme";
import { issuePriorityPalette, issueStatusPalette } from "../../../theme/semantics";
import { useSelector } from "react-redux";
import { selectCurrentUser, selectCurrentToken } from "../../../store/authSlice";
import { getEffectiveRoleNames, getPrimaryEffectiveRole, type Issue } from "@compound/contracts";
import { useEscalateIssueMutation, useGetIssueQuery, useUpdateIssueMutation } from "../../../services/property";
import { Alert } from "react-native";
import { canEscalateIssueFromMobile } from "../issue-flow-utils";
import { formatDate } from "../../../utils/formatters";
import { defaultApiBaseUrl } from "../../../services/api";
import { Icon } from "../../../components/ui/Icon";

export const IssueDetailScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const isDark = useColorScheme() === "dark";
  const route = useRoute<RouteProp<RootStackParamList, "IssueDetail">>();
  const { issue } = route.params;

  const user = useSelector(selectCurrentUser);
  const token = useSelector(selectCurrentToken);
  const { data: fetchedIssue, isLoading: isLoadingFull } = useGetIssueQuery(issue.id);
  const currentIssue = fetchedIssue || issue;
  
  const primaryRole = user ? getPrimaryEffectiveRole(user) : 'resident';
  const effectiveRoles = user ? getEffectiveRoleNames(user) : [primaryRole];
  const canManageStatus = ['super_admin', 'compound_admin', 'president', 'board_member', 'support_agent'].includes(primaryRole);
  const canEscalate = canEscalateIssueFromMobile({
    effectiveRoles,
    assignedTo: currentIssue.assignedTo,
    currentUserId: user?.id,
  });

  const isReporter = currentIssue.reportedBy === user?.id;
  const canEdit = (isReporter && !['resolved', 'closed'].includes(currentIssue.status)) || canManageStatus;

  const [updateIssue, { isLoading: isUpdating }] = useUpdateIssueMutation();
  const [escalateIssue, { isLoading: isEscalating }] = useEscalateIssueMutation();
  const [escalationReason, setEscalationReason] = useState("");
  const [viewerImage, setViewerImage] = useState<string | null>(null);

  const handleUpdateStatus = async (status: string) => {
    try {
      await updateIssue({ id: currentIssue.id, body: { status } as any }).unwrap();
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
      await escalateIssue({ id: currentIssue.id, reason: escalationReason.trim() }).unwrap();
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
  const subtext = isDark ? colors.text.secondary.dark : colors.text.secondary.light;
  const statusPalette = issueStatusPalette(currentIssue.status);
  const priorityPalette = issuePriorityPalette(currentIssue.priority);

  return (
    <ScreenContainer withKeyboard={false} style={styles.container} edges={['left', 'right', 'bottom']}>
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
          <Typography variant="caption" style={{ color: subtext, marginBottom: spacing.sm }}>
            {t(`Issues.categories.${currentIssue.category}`, { defaultValue: currentIssue.category })} {"\u2022"}{" "}
            {formatDate(currentIssue.createdAt)}
          </Typography>
          <Typography style={{ color: text, lineHeight: 22 }}>{currentIssue.description}</Typography>
          
          {currentIssue.attachments && currentIssue.attachments.length > 0 && (
            <View style={styles.attachmentsSection}>
              <Typography variant="label" style={{ marginBottom: spacing.xs }}>
                {t('Issues.attachments', 'Attachments')}
              </Typography>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {currentIssue.attachments.map((att: any) => {
                  const imageUri = att.url.startsWith('http') ? att.url : `${defaultApiBaseUrl}${att.url}`;
                  const authHeaders = token ? { Authorization: `Bearer ${token}` } : undefined;
                  return (
                    <View key={att.id} style={styles.attachmentCard}>
                      {att.mimeType?.startsWith('image/') ? (
                        <TouchableOpacity activeOpacity={0.8} onPress={() => setViewerImage(imageUri)}>
                          <Image
                            source={{ uri: imageUri, headers: authHeaders }}
                            style={styles.attachmentImage}
                            resizeMode="cover"
                          />
                        </TouchableOpacity>
                      ) : (
                        <View style={[styles.attachmentImage, styles.attachmentFallback]}>
                          <Icon name="camera" color={colors.primary.light} size={24} />
                        </View>
                      )}
                    </View>
                  );
                })}
              </ScrollView>
            </View>
          )}

          <ImageViewer
            visible={viewerImage !== null}
            uri={viewerImage ?? ''}
            headers={token ? { Authorization: `Bearer ${token}` } : undefined}
            onClose={() => setViewerImage(null)}
          />

          {currentIssue.resolvedAt ? (
            <Typography variant="caption" style={{ color: colors.success, marginTop: spacing.md }}>
              {t("Issues.resolvedAt", {
                defaultValue: "Resolved: {{date}}",
                date: formatDate(currentIssue.resolvedAt),
              })}
            </Typography>
          ) : null}

          {canEdit && (
            <Button
              title={t('Common.edit', 'Edit')}
              onPress={() => navigation.navigate('AddEditIssue', { issue: currentIssue } as any)}
              variant="secondary"
              style={styles.editBtn}
            />
          )}
        </View>

        {isLoadingFull && !fetchedIssue && (
          <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.primary.light} />
        )}

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
              placeholderTextColor={colors.text.secondary.light}
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
  scroll: { padding: layout.screenGutter, paddingBottom: layout.screenBottom },
  card: { padding: layout.cardPadding, borderRadius: radii.xl, borderWidth: 1, ...shadows.sm },
  attachmentsSection: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  attachmentCard: {
    marginEnd: spacing.xs,
    borderRadius: radii.md,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  attachmentImage: {
    width: 100,
    height: 100,
    backgroundColor: colors.surfaceMuted.light,
  },
  attachmentFallback: {
    backgroundColor: colors.surfaceMuted.light,
    justifyContent: "center",
    alignItems: "center",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  title: { marginBottom: 2 },
  adminSection: {
    marginTop: layout.listGap,
    padding: layout.cardPadding,
    borderRadius: radii.xl,
    borderWidth: 1,
    ...shadows.sm,
  },
  adminTitle: {
    marginBottom: spacing.sm,
  },
  actionGrid: {
    gap: spacing.xs,
  },
  actionBtn: {
    height: 44,
    borderRadius: radii.md,
  },
  reasonInput: {
    minHeight: 80,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  editBtn: {
    marginTop: spacing.sm,
    borderRadius: radii.md,
    height: 44,
  },
});
