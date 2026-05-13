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
import { isRtlLanguage, rowDirectionStyle, textDirectionStyle } from '../../../i18n/direction';

export const AdminInvitationsScreen = () => {
  const { t, i18n } = useTranslation();
  const isDark = useColorScheme() === 'dark';
  const isRtl = isRtlLanguage(i18n.language);
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  
  const { data: invitations = [], isLoading, refetch } = useGetResidentInvitationsQuery();

  const renderInvitation = ({ item }: { item: any }) => (
    <View style={[styles.card, { backgroundColor: isDark ? colors.surface.dark : colors.surface.light }]}>
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
    <ScreenContainer edges={['left', 'right', 'bottom']}>
      <FlatList
        data={invitations}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderInvitation}
        onRefresh={refetch}
        refreshing={isLoading}
        ListHeaderComponent={
          <View style={[styles.header, textDirectionStyle(isRtl)]}>
            <Typography variant="h2" style={textDirectionStyle(isRtl)}>
              {t('Admin.activeInvitations')}
            </Typography>
            <Typography variant="caption" style={textDirectionStyle(isRtl)}>
              {t('Admin.invitationsSubtitle')}
            </Typography>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            {isLoading ? (
              <ActivityIndicator color={colors.primary.light} size="large" />
            ) : (
              <Typography variant="body" style={[styles.emptyText, textDirectionStyle(isRtl)]}>
                {t('Admin.noInvitations')}
              </Typography>
            )}
          </View>
        }
        contentContainerStyle={styles.listContent}
      />
      <View style={[styles.fabContainer, { start: isRtl ? undefined : spacing.lg, end: isRtl ? spacing.lg : undefined }]}>
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
  listContent: {
    padding: layout.screenGutter,
    paddingBottom: layout.screenBottom + 72,
  },
  header: {
    marginBottom: layout.sectionGap,
  },
  card: {
    borderRadius: radii.xl,
    padding: layout.cardPadding,
    marginBottom: layout.listGap,
    borderWidth: 1,
    borderColor: colors.border.light,
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
    borderTopColor: 'rgba(0,0,0,0.05)',
    paddingTop: spacing.sm,
  },
  date: {
    color: colors.text.secondary.light,
    fontSize: 12,
  },
  emptyContainer: {
    marginTop: 100,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.text.secondary.light,
  },
  fabContainer: {
    position: 'absolute',
    bottom: spacing.xl,
    width: '100%',
    paddingHorizontal: spacing.lg,
  },
  fab: {
    borderRadius: 30,
    height: 56,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
});
