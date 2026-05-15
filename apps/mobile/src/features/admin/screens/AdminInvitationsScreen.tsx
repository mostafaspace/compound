import React from 'react';
import { View, StyleSheet, FlatList, useColorScheme, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { ScreenContainer } from '../../../components/layout/ScreenContainer';
import { Typography } from '../../../components/ui/Typography';
import { colors, layout, radii, shadows, spacing } from '../../../theme';
import { useGetResidentInvitationsQuery } from '../../../services/admin';
import { RootStackParamList } from '../../../navigation/types';
import { Button } from '../../../components/ui/Button';
import { Icon } from '../../../components/ui/Icon';
import { isRtlLanguage, rowDirectionStyle, textDirectionStyle } from '../../../i18n/direction';

export const AdminInvitationsScreen = () => {
  const { t, i18n } = useTranslation();
  const isDark = useColorScheme() === 'dark';
  const isRtl = isRtlLanguage(i18n.language);
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  
  const { data: invitations = [], isLoading, refetch } = useGetResidentInvitationsQuery();

  const renderInvitation = ({ item }: { item: any }) => (
    <View
      style={[
        styles.card,
        {
          backgroundColor: isDark ? colors.surface.dark : colors.surface.light,
          borderColor: isDark ? colors.border.dark : colors.border.light,
        },
      ]}
    >
      <View style={[styles.cardHeader, rowDirectionStyle(isRtl)]}>
        <View style={textDirectionStyle(isRtl)}>
          <Typography variant="body" style={[styles.residentName, textDirectionStyle(isRtl)]}>
            {item.email}
          </Typography>
          <Typography variant="caption" style={[styles.roleLabel, textDirectionStyle(isRtl)]}>
            {t(`Common.roles.${item.role}`, { defaultValue: item.role.replace('_', ' ') })}
          </Typography>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Typography variant="caption" style={styles.statusText}>
            {t(`Common.statuses.${item.status}`, { defaultValue: item.status.toUpperCase() })}
          </Typography>
        </View>
      </View>
      
      {item.unit && (
        <View style={[styles.unitInfo, rowDirectionStyle(isRtl)]}>
          <Typography variant="caption" style={[styles.label, textDirectionStyle(isRtl)]}>
            {t('Admin.unit')}:
          </Typography>
          <Typography variant="body" style={[styles.value, textDirectionStyle(isRtl)]}>
             {item.unit.unitNumber}
          </Typography>
        </View>
      )}

      <View style={[styles.cardFooter, textDirectionStyle(isRtl)]}>
        <Typography variant="caption" style={[styles.date, textDirectionStyle(isRtl)]}>
          {new Date(item.createdAt).toLocaleDateString(i18n.language === 'ar' ? 'ar-EG' : 'en-US')}
        </Typography>
      </View>
    </View>
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted': return colors.primary.light;
      case 'pending': return colors.warning;
      case 'revoked': return colors.error;
      default: return colors.text.secondary.light;
    }
  };

  return (
    <ScreenContainer withKeyboard={false} style={styles.container} edges={['left', 'right', 'bottom']}>
      <FlatList
        data={invitations}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderInvitation}
        onRefresh={refetch}
        refreshing={isLoading}
        ListHeaderComponent={
          <View style={[styles.header, textDirectionStyle(isRtl)]}>
            <Typography variant="label" style={[styles.eyebrow, textDirectionStyle(isRtl)]}>
              {t('Admin.invites')}
            </Typography>
            <Typography variant="h2" style={[styles.title, textDirectionStyle(isRtl)]}>
              {t('Admin.activeInvitations')}
            </Typography>
            <Typography variant="body" style={[styles.subtitle, textDirectionStyle(isRtl)]}>
              {t('Admin.invitationsSubtitle')}
            </Typography>
          </View>
        }
        ListEmptyComponent={
          <View
            style={[
              styles.emptyContainer,
              {
                backgroundColor: isDark ? colors.surface.dark : colors.surface.light,
                borderColor: isDark ? colors.border.dark : colors.border.light,
              },
            ]}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.primary.light} size="large" />
            ) : (
              <>
                <View style={[styles.emptyIcon, { backgroundColor: isDark ? colors.surfaceMuted.dark : colors.surfaceMuted.light }]}>
                  <Icon name="user" color={colors.primary.light} size={24} />
                </View>
                <Typography variant="h3" style={[styles.emptyTitle, textDirectionStyle(isRtl)]}>
                  {t('Admin.noInvitations')}
                </Typography>
                <Typography variant="body" style={[styles.emptyText, textDirectionStyle(isRtl)]}>
                  {t('Admin.noInvitationsHint')}
                </Typography>
              </>
            )}
          </View>
        }
        contentContainerStyle={styles.listContent}
      />
      <View style={styles.fabContainer}>
        <Button 
          title={t('Admin.inviteResident')} 
          onPress={() => navigation.navigate('CreateInvitation' as any)}
          style={styles.fab}
        />
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 0,
    paddingTop: 0,
  },
  listContent: {
    padding: layout.screenGutter,
    paddingBottom: layout.screenBottom + 72,
  },
  header: {
    marginBottom: layout.sectionGap,
  },
  eyebrow: {
    color: colors.primary.light,
    marginBottom: spacing.xs,
  },
  title: {
    marginBottom: spacing.xs,
  },
  subtitle: {
    color: colors.text.secondary.light,
  },
  card: {
    borderRadius: radii.xl,
    padding: layout.cardPadding,
    marginBottom: layout.listGap,
    borderWidth: 1,
    ...shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  residentName: {
    fontWeight: '700',
    fontSize: 16,
  },
  roleLabel: {
    textTransform: 'capitalize',
    marginTop: 2,
    color: colors.text.secondary.light,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 10,
  },
  unitInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  label: {
    color: colors.text.secondary.light,
    marginEnd: spacing.xs,
  },
  value: {
    fontWeight: '600',
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
    paddingTop: spacing.sm,
  },
  date: {
    color: colors.text.secondary.light,
    fontSize: 12,
  },
  emptyContainer: {
    marginTop: spacing.xl,
    alignItems: 'center',
    borderRadius: radii.xl,
    borderWidth: 1,
    padding: layout.heroPadding,
    ...shadows.sm,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: {
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  emptyText: {
    color: colors.text.secondary.light,
    textAlign: 'center',
  },
  fabContainer: {
    position: 'absolute',
    bottom: spacing.xl,
    left: layout.screenGutter,
    right: layout.screenGutter,
  },
  fab: {
    borderRadius: radii.lg,
  },
});
