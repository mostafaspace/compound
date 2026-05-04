import React from 'react';
import { View, StyleSheet, FlatList, useColorScheme } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useGetIssuesQuery } from '../../../services/property';
import { RootStackParamList } from '../../../navigation/types';
import { colors, spacing } from '../../../theme';
import { issuePriorityPalette, issueStatusPalette } from '../../../theme/semantics';
import { Button } from '../../../components/ui/Button';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { Typography } from '../../../components/ui/Typography';
import { ScreenContainer } from '../../../components/layout/ScreenContainer';
import type { Issue } from '@compound/contracts';
import { formatDate } from '../../../utils/formatters';

export const IssuesScreen = () => {
  const { t } = useTranslation();
  const isDark = useColorScheme() === 'dark';
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { data: issues = [], isLoading, refetch } = useGetIssuesQuery();

  const renderItem = ({ item }: { item: Issue }) => {
    const statusPalette = issueStatusPalette(item.status);
    const priorityPalette = issuePriorityPalette(item.priority);

    return (
      <View
        style={[
          styles.card,
          {
            backgroundColor: isDark ? colors.surface.dark : colors.surface.light,
            borderColor: isDark ? colors.border.dark : colors.border.light,
          },
        ]}
      >
        <View style={styles.cardHeader}>
          <Typography variant="h3" numberOfLines={1} style={styles.title}>
            {item.title}
          </Typography>
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
        <Button
          variant="ghost"
          title={t('Common.viewAll', { defaultValue: 'View details' })}
          onPress={() => navigation.navigate('IssueDetail' as any, { issue: item })}
          style={styles.detailBtn}
          textStyle={{ fontSize: 13 }}
        />
      </View>
    );
  };

  return (
    <ScreenContainer withKeyboard={false} style={styles.container} edges={['left', 'right']}>
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
          onPress={() => navigation.navigate('CreateIssue' as any)}
          style={styles.fab}
        />
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: { padding: 0 },
  listContent: { padding: spacing.md, paddingBottom: 100 },
  card: { padding: spacing.md, borderRadius: 12, borderWidth: 1, marginBottom: spacing.md },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.xs },
  title: { flex: 1, marginRight: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.xs, alignItems: 'center', flexWrap: 'wrap' },
  category: { color: '#6b7280', textTransform: 'capitalize' },
  date: { color: '#9ca3af', marginBottom: spacing.sm },
  detailBtn: { alignSelf: 'flex-start', paddingHorizontal: 0 },
  center: { padding: spacing.xl, alignItems: 'center' },
  fabContainer: { position: 'absolute', bottom: spacing.xl, left: spacing.md, right: spacing.md },
  fab: { borderRadius: 12 },
});
