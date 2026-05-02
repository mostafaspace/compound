import React from 'react';
import { View, StyleSheet, FlatList, useColorScheme } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useGetAnnouncementsQuery, useAcknowledgeAnnouncementMutation } from '../../../services/property';
import { colors, spacing } from '../../../theme';
import { Button } from '../../../components/ui/Button';
import { Typography } from '../../../components/ui/Typography';
import { ScreenContainer } from '../../../components/layout/ScreenContainer';
import { formatDate } from '../../../utils/formatters';

export const AnnouncementsScreen = () => {
  const { t } = useTranslation();
  const isDark = useColorScheme() === 'dark';
  
  const { data: announcements = [], isLoading, refetch } = useGetAnnouncementsQuery();
  const [acknowledge, { isLoading: isAcknowledging }] = useAcknowledgeAnnouncementMutation();

  const renderItem = ({ item }: { item: any }) => (
    <View style={[styles.card, { backgroundColor: isDark ? colors.surface.dark : colors.surface.light, borderColor: isDark ? colors.border.dark : colors.border.light }]}>
      <Typography variant="h3">{item.title}</Typography>
      <Typography variant="body" style={styles.content}>{item.content}</Typography>
      <View style={styles.footer}>
        <Typography variant="caption">{formatDate(item.createdAt)}</Typography>
        {item.category && (
          <View style={styles.categoryBadge}>
            <Typography variant="label" style={styles.categoryText}>{item.category}</Typography>
          </View>
        )}
      </View>
      
      {!item.acknowledgedAt && item.mustAcknowledge && (
        <Button 
          title={t("Announcements.acknowledge")} 
          onPress={() => acknowledge(item.id)}
          loading={isAcknowledging}
          style={styles.ackButton}
        />
      )}
    </View>
  );

  return (
    <ScreenContainer withKeyboard={false} style={styles.container} edges={['left', 'right', 'bottom']}>
      <FlatList
        data={announcements}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        refreshing={isLoading}
        onRefresh={refetch}
        ListEmptyComponent={
          <View style={styles.center}>
            <Typography variant="caption">
              {isLoading ? t("Common.loading") : t("Announcements.empty")}
            </Typography>
          </View>
        }
        contentContainerStyle={styles.listContent}
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 0,
  },
  listContent: {
    padding: spacing.md,
  },
  card: {
    padding: spacing.lg,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  content: {
    color: '#4b5563',
    lineHeight: 22,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 4,
  },
  categoryText: {
    fontSize: 10,
    color: '#6b7280',
  },
  ackButton: {
    marginTop: spacing.md,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xl,
  }
});
