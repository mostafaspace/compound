import React from 'react';
import { View, StyleSheet, FlatList, useColorScheme, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSelector } from 'react-redux';
import { useGetIssuesQuery, useGetAllIssuesQuery } from '../../../services/property';
import { selectCurrentUser } from '../../../store/authSlice';
import { getEffectiveRoleType } from '@compound/contracts';
import { RootStackParamList } from '../../../navigation/types';
import { colors, layout, radii, shadows, spacing } from '../../../theme';
import { issuePriorityPalette, issueStatusPalette } from '../../../theme/semantics';
import { Button } from '../../../components/ui/Button';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { Typography } from '../../../components/ui/Typography';
import { ScreenContainer } from '../../../components/layout/ScreenContainer';
import type { Issue } from '@compound/contracts';
import { formatDate } from '../../../utils/formatters';
import { Icon } from '../../../components/ui/Icon';

export const IssuesScreen = () => {
  const { t } = useTranslation();
  const isDark = useColorScheme() === 'dark';
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  
  const user = useSelector(selectCurrentUser);
  const roleType = getEffectiveRoleType(user);
  const isAdminOrGuard = roleType === 'admin' || roleType === 'security';

  const { data: myIssues = [], isLoading: isLoadingMy, refetch: refetchMy } = useGetIssuesQuery(undefined, { skip: isAdminOrGuard });
  const { data: allIssues = [], isLoading: isLoadingAll, refetch: refetchAll } = useGetAllIssuesQuery(undefined, { skip: !isAdminOrGuard });

  const issues = isAdminOrGuard ? allIssues : myIssues;
  const isLoading = isAdminOrGuard ? isLoadingAll : isLoadingMy;
  const refetch = isAdminOrGuard ? refetchAll : refetchMy;

  const renderItem = ({ item }: { item: Issue }) => {
    const statusPalette = issueStatusPalette(item.status);
    const priorityPalette = issuePriorityPalette(item.priority);

    return (
      <Pressable
        onPress={() => navigation.navigate('IssueDetail' as any, { issue: item })}
        style={[
          styles.card,
          {
            backgroundColor: isDark ? colors.surface.dark : colors.surface.light,
            borderColor: isDark ? colors.border.dark : colors.border.light,
          },
        ]}
        accessibilityRole="button"
      >
        <View style={styles.cardHeader}>
          <View style={styles.titleRow}>
            <View style={styles.iconBadge}>
              <Icon name="issues" color={colors.primary.light} size={20} />
            </View>
            <Typography variant="h3" numberOfLines={1} style={styles.title}>
              {item.title}
            </Typography>
          </View>
          <StatusBadge
            label={t(`Issues.statuses.${item.status}`, { defaultValue: item.status })}
            backgroundColor={statusPalette.background}
            textColor={statusPalette.text}
          />
        </View>
        <View style={styles.row}>
          <StatusBadge
            label={t(`Issues.priorities.${item.priority}`, { defaultValue: item.priority })}
            backgroundColor={priorityPalette.background}
            textColor={priorityPalette.text}
          />
          <Typography variant="caption" style={styles.category}>
            {t(`Issues.categories.${item.category}`, { defaultValue: item.category })}
          </Typography>
        </View>
        <Typography variant="caption" style={styles.date}>
          {formatDate(item.createdAt)}
        </Typography>
      </Pressable>
    );
  };

  return (
    <ScreenContainer withKeyboard={false} style={styles.container}>
      <FlatList
        data={issues}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        refreshing={isLoading}
        onRefresh={refetch}
        ListEmptyComponent={
          <View style={styles.center}>
            <Typography variant="caption">
              {isLoading ? t('Common.loading') : t('Issues.empty', { defaultValue: 'No issues reported.' })}
            </Typography>
          </View>
        }
        contentContainerStyle={styles.listContent}
      />
      <View style={styles.fabContainer}>
        <Button
          title={t('Issues.create', { defaultValue: 'Report Issue' })}
          onPress={() => navigation.navigate('AddEditIssue' as any)}
          style={styles.fab}
          leftIcon="plus"
        />
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: { padding: 0 },
  listContent: { padding: layout.screenGutter, paddingBottom: layout.screenBottom + 72 },
  card: { padding: layout.cardPadding, borderRadius: radii.xl, borderWidth: 1, marginBottom: layout.listGap, ...shadows.sm },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.sm, gap: spacing.sm },
  titleRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconBadge: { width: 40, height: 40, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceMuted.light },
  title: { flex: 1, marginRight: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.xs, alignItems: 'center', flexWrap: 'wrap' },
  category: { color: colors.text.secondary.light, textTransform: 'capitalize' },
  date: { color: colors.text.secondary.light, marginBottom: spacing.sm },
  detailBtn: { alignSelf: 'flex-start', paddingHorizontal: 0 },
  center: { padding: spacing.xl, alignItems: 'center' },
  fabContainer: { position: 'absolute', bottom: layout.fabInset, left: layout.fabInset, right: layout.fabInset },
  fab: { borderRadius: radii.lg },
});
