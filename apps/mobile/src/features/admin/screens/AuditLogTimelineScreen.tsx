import React from 'react';
import { View, StyleSheet, FlatList, useColorScheme, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { RouteProp, useRoute } from '@react-navigation/native';
import { ScreenContainer } from '../../../components/layout/ScreenContainer';
import { Typography } from '../../../components/ui/Typography';
import { colors, layout, spacing } from '../../../theme';
import { useGetAuditLogTimelineQuery } from '../../../services/admin';
import { RootStackParamList } from '../../../navigation/types';
import { isRtlLanguage, rowDirectionStyle, textDirectionStyle } from '../../../i18n/direction';

export const AuditLogTimelineScreen = () => {
  const { t, i18n } = useTranslation();
  const isDark = useColorScheme() === 'dark';
  const isRtl = isRtlLanguage(i18n.language);
  const route = useRoute<RouteProp<RootStackParamList, 'AuditLogTimeline'>>();
  const { entityType, entityId } = route.params;

  const { data: timeline = [], isLoading } = useGetAuditLogTimelineQuery({
    entity_type: entityType,
    entity_id: entityId,
  });

  const renderTimelineItem = ({ item, index }: { item: any, index: number }) => (
    <View style={[styles.timelineItem, rowDirectionStyle(isRtl)]}>
      <View style={styles.leftColumn}>
        <View style={[styles.dot, index === 0 && styles.activeDot]} />
        {index < timeline.length - 1 && <View style={styles.line} />}
      </View>
      <View style={[styles.rightColumn, { paddingStart: spacing.md }]}>
        <Typography variant="body" style={[styles.action, textDirectionStyle(isRtl)]}>
          {item.action}
        </Typography>
        <Typography variant="caption" style={[styles.actor, textDirectionStyle(isRtl)]}>
          {item.actorName || t('Common.roles.system', { defaultValue: 'System' })}
        </Typography>
        {item.reason && (
          <Typography variant="caption" style={[styles.reason, textDirectionStyle(isRtl)]}>
            {item.reason}
          </Typography>
        )}
        <Typography variant="caption" style={[styles.timestamp, textDirectionStyle(isRtl)]}>
          {new Date(item.createdAt).toLocaleString(i18n.language === 'ar' ? 'ar-EG' : 'en-US')}
        </Typography>
      </View>
    </View>
  );

  return (
    <ScreenContainer edges={['left', 'right', 'bottom']}>
      <View style={[styles.header, textDirectionStyle(isRtl)]}>
        <Typography variant="h2" style={textDirectionStyle(isRtl)}>
          {t('Admin.investigationTimeline')}
        </Typography>
        <Typography variant="caption" style={[styles.subtitle, textDirectionStyle(isRtl)]}>
          {entityType} #{entityId}
        </Typography>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary.light} size="large" />
        </View>
      ) : (
        <FlatList
          data={timeline}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderTimelineItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.center}>
              <Typography variant="body" style={[styles.emptyText, textDirectionStyle(isRtl)]}>
                {t('Admin.noTimelineEvents')}
              </Typography>
            </View>
          }
        />
      )}
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  header: {
    padding: layout.screenGutter,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  subtitle: {
    marginTop: 4,
    color: colors.primary.light,
    fontWeight: '700',
  },
  listContent: {
    padding: layout.screenGutter,
    paddingBottom: layout.screenBottom,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 0,
  },
  leftColumn: {
    width: 30,
    alignItems: 'center',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#cbd5e1',
    zIndex: 1,
  },
  activeDot: {
    backgroundColor: colors.primary.light,
    transform: [{ scale: 1.2 }],
  },
  line: {
    width: 2,
    flex: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 2,
  },
  rightColumn: {
    flex: 1,
    paddingBottom: spacing.xl,
  },
  action: {
    fontWeight: '700',
    fontSize: 15,
  },
  actor: {
    color: colors.text.secondary.light,
    marginTop: 2,
  },
  reason: {
    marginTop: 6,
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: 8,
    fontSize: 12,
    fontStyle: 'italic',
  },
  timestamp: {
    marginTop: 8,
    color: '#94a3b8',
    fontSize: 11,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 100,
  },
  emptyText: {
    color: '#94a3b8',
  },
});
