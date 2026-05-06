import React, { useState } from 'react';
import { View, StyleSheet, FlatList, useColorScheme, ActivityIndicator, TouchableOpacity, TextInput } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { ScreenContainer } from '../../../components/layout/ScreenContainer';
import { Typography } from '../../../components/ui/Typography';
import { colors, spacing, shadows } from '../../../theme';
import { useGetAuditLogsQuery } from '../../../services/admin';
import { RootStackParamList } from '../../../navigation/types';

const SEVERITY_COLORS: Record<string, string> = {
  info: colors.info,
  warning: colors.warning,
  critical: colors.error,
};

export const AuditLogScreen = () => {
  const { t } = useTranslation();
  const isDark = useColorScheme() === 'dark';
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string | null>(null);

  const { data: logs = [], isLoading, refetch } = useGetAuditLogsQuery({
    q: search,
    severity: severityFilter || undefined,
  });

  const renderLog = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={[styles.card, { backgroundColor: isDark ? colors.surface.dark : colors.surface.light }]}
      onPress={() => {
        if (item.auditableType && item.auditableId) {
          navigation.navigate('AuditLogTimeline' as any, { 
            entityType: item.auditableType, 
            entityId: item.auditableId 
          });
        }
      }}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.severityDot, { backgroundColor: SEVERITY_COLORS[item.severity] ?? colors.text.secondary.light }]} />
        <Typography variant="body" style={styles.action}>
          {item.action}
        </Typography>
        <Typography variant="caption" style={styles.time}>
          {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Typography>
      </View>
      
      <Typography variant="caption" style={styles.actor}>
        {t('Admin.actor', 'Actor')}: {item.actorName || t('Common.system', 'System')}
      </Typography>

      {item.reason && (
        <Typography variant="caption" style={styles.reason} numberOfLines={1}>
          "{item.reason}"
        </Typography>
      )}

      <View style={styles.cardFooter}>
        <Typography variant="caption" style={styles.date}>
          {new Date(item.createdAt).toLocaleDateString()}
        </Typography>
        {item.auditableType && (
          <Typography variant="caption" style={styles.entity}>
            {item.auditableType} #{item.auditableId}
          </Typography>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <ScreenContainer edges={['left', 'right', 'bottom']}>
      <View style={styles.filterContainer}>
        <TextInput
          style={[styles.searchInput, { 
            backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
            color: isDark ? '#f8fafc' : '#0f172a'
          }]}
          placeholder={t('Admin.searchLogs', 'Search logs...')}
          placeholderTextColor="#94a3b8"
          value={search}
          onChangeText={setSearch}
        />
        <View style={styles.severityFilters}>
          {['info', 'warning', 'critical'].map((sev) => (
            <TouchableOpacity
              key={sev}
              style={[
                styles.sevBtn,
                severityFilter === sev && { backgroundColor: SEVERITY_COLORS[sev] + '20', borderColor: SEVERITY_COLORS[sev] }
              ]}
              onPress={() => setSeverityFilter(severityFilter === sev ? null : sev)}
            >
              <Typography 
                variant="label" 
                style={[
                  styles.sevBtnText, 
                  { color: severityFilter === sev ? SEVERITY_COLORS[sev] : '#94a3b8' }
                ]}
              >
                {sev.toUpperCase()}
              </Typography>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <FlatList
        data={logs}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderLog}
        onRefresh={refetch}
        refreshing={isLoading}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            {isLoading ? (
              <ActivityIndicator color={colors.primary.light} size="large" />
            ) : (
              <Typography variant="body" style={styles.emptyText}>
                {t('Admin.noLogs', 'No audit logs found')}
              </Typography>
            )}
          </View>
        }
        contentContainerStyle={styles.listContent}
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  filterContainer: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  searchInput: {
    height: 44,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    fontSize: 14,
  },
  severityFilters: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  sevBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: 'rgba(0,0,0,0.02)',
  },
  sevBtnText: {
    fontSize: 10,
    fontWeight: '800',
  },
  listContent: {
    padding: spacing.md,
  },
  card: {
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    ...shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  severityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  action: {
    fontWeight: '700',
    flex: 1,
  },
  time: {
    color: colors.text.secondary.light,
  },
  actor: {
    color: colors.text.secondary.light,
    marginBottom: 4,
  },
  reason: {
    fontStyle: 'italic',
    color: colors.text.secondary.light,
    backgroundColor: 'rgba(0,0,0,0.02)',
    padding: 4,
    borderRadius: 4,
    marginBottom: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.03)',
    paddingTop: spacing.xs,
  },
  date: {
    color: colors.text.secondary.light,
    fontSize: 10,
  },
  entity: {
    color: colors.primary.light,
    fontSize: 10,
    fontWeight: '600',
  },
  emptyContainer: {
    marginTop: 100,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.text.secondary.light,
  },
});
