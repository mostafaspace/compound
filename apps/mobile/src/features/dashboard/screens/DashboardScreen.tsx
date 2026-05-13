import React from 'react';
import { FlatList, View, StyleSheet, useColorScheme, Pressable } from 'react-native';
import { formatRoleLabel, getPrimaryEffectiveRole } from '@compound/contracts';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { selectCurrentUser } from '../../../store/authSlice';
import { colors, layout, radii, shadows, spacing } from '../../../theme';
import { Typography } from '../../../components/ui/Typography';
import { ScreenContainer } from '../../../components/layout/ScreenContainer';
import { useGetDashboardQuery } from '../../../services/dashboard';
import { Card } from '../../../components/ui/Card';
import { Icon, type AppIconName } from '../../../components/ui/Icon';
import { useIsRtl, rowDirectionStyle, textDirectionStyle } from '../../../i18n/direction';

const shortcutRouteMap: Record<string, { screen: string; params?: object }> = {
  '/units/assign': { screen: 'Admin', params: { screen: 'Units' } },
  '/visitors/create': { screen: 'CreateVisitor' },
  '/issues/create': { screen: 'AddEditIssue' },
  '/polls': { screen: 'Main', params: { screen: 'Polls' } },
  '/org-chart': { screen: 'Main', params: { screen: 'More', params: { screen: 'OrgChart', initial: false } } },
  '/visitors': { screen: 'Main', params: { screen: 'Visitors' } },
  '/apartments': { screen: 'Main', params: { screen: 'Apartments', params: { screen: 'ApartmentsList' } } },
  '/property': { screen: 'Main', params: { screen: 'Apartments', params: { screen: 'ApartmentsList' } } },
  '/finance': { screen: 'Main', params: { screen: 'Apartments', params: { screen: 'ApartmentsList' } } },
  '/documents': { screen: 'Main', params: { screen: 'Apartments', params: { screen: 'ApartmentsList' } } },
  '/issues': { screen: 'Main', params: { screen: 'More', params: { screen: 'Issues', initial: false } } },
  '/security/scanner': { screen: 'Guard', params: { screen: 'Scanner' } },
  '/security/entries': { screen: 'Guard', params: { screen: 'Gate' } },
  '/security/manual-entry': { screen: 'Guard', params: { screen: 'Gate' } },
  '/governance': { screen: 'Main', params: { screen: 'Polls' } },
};

type DashboardRow =
  | { type: 'hero' }
  | { type: 'attentionHeader' }
  | { type: 'attentionItem'; item: NonNullable<ReturnType<typeof useGetDashboardQuery>['data']>['attentionItems'][number]; key: string }
  | { type: 'quickHeader' }
  | { type: 'shortcutRow'; items: NonNullable<ReturnType<typeof useGetDashboardQuery>['data']>['shortcuts']; key: string }
  | { type: 'emptyShortcuts' };

export const DashboardScreen = () => {
  const { t } = useTranslation();
  const isDark = useColorScheme() === 'dark';
  const isRtl = useIsRtl();
  const user = useSelector(selectCurrentUser);
  const navigation = useNavigation<any>();
  const { data: dashboard } = useGetDashboardQuery();

  const navigateToRoute = (route: string) => {
    const mapping = shortcutRouteMap[route];
    if (mapping) {
      navigation.navigate(mapping.screen, mapping.params);
    }
  };

  if (!user) return null;

  const primaryRole = getPrimaryEffectiveRole(user);
  const attentionItems = dashboard?.attentionItems ?? [];
  const shortcuts = dashboard?.shortcuts ?? [];
  const localizeLabel = (label: string) => {
    if (label === 'Invite Guest') return t('QuickActions.inviteGuest');
    if (label === 'Report Issue') return t('QuickActions.reportIssue');
    if (label === 'Polls & Voting') return t('QuickActions.pollsAndVoting');
    if (label === 'Org Chart') return t('QuickActions.orgChart');
    return label;
  };

  const shortcutIcon = (route: string): AppIconName => {
    if (route.includes('visitor')) return 'visitors';
    if (route.includes('apartment') || route.includes('property') || route.includes('finance') || route.includes('document')) return 'building';
    if (route.includes('poll')) return 'polls';
    if (route.includes('issue')) return 'issues';
    if (route.includes('security')) return 'qr';
    if (route.includes('unit')) return 'units';
    if (route.includes('org-chart')) return 'building';
    return 'dashboard';
  };

  const rows: DashboardRow[] = [{ type: 'hero' }];

  if (attentionItems.length > 0) {
    rows.push({ type: 'attentionHeader' });
    for (let index = 0; index < attentionItems.length; index += 1) {
      const item = attentionItems[index];
      rows.push({ type: 'attentionItem', item, key: item.type + index });
    }
  }

  rows.push({ type: 'quickHeader' });
  if (shortcuts.length === 0) {
    rows.push({ type: 'emptyShortcuts' });
  } else {
    for (let index = 0; index < shortcuts.length; index += 2) {
      rows.push({
        type: 'shortcutRow',
        items: shortcuts.slice(index, index + 2),
        key: `shortcut-row-${index}`,
      });
    }
  }

  const renderRow = ({ item }: { item: DashboardRow }) => {
    if (item.type === 'hero') {
      return (
        <Card style={styles.hero}>
          <View style={[styles.heroTop, rowDirectionStyle(isRtl)]}>
            <View style={styles.heroIcon}>
              <Icon name="building" color={colors.primary.light} size={26} />
            </View>
            <Typography variant="label" style={textDirectionStyle(isRtl)}>{t("Auth.signedIn")}</Typography>
          </View>
          <Typography variant="h1" style={[styles.heroTitle, textDirectionStyle(isRtl)]}>{user.name}</Typography>
          <Typography variant="body" style={[styles.heroSubtitle, textDirectionStyle(isRtl)]}>
            {t(`Common.roles.${primaryRole}`)}
          </Typography>
        </Card>
      );
    }

    if (item.type === 'attentionHeader') {
      return (
        <Typography variant="h3" style={[styles.sectionTitle, textDirectionStyle(isRtl)]}>
          {t("Dashboard.needsAttention")}
        </Typography>
      );
    }

    if (item.type === 'attentionItem') {
      return (
        <Pressable
          style={[styles.attentionItem, rowDirectionStyle(isRtl), { backgroundColor: isDark ? colors.surface.dark : colors.surface.light, borderColor: isDark ? colors.border.dark : colors.border.light }]}
          onPress={() => navigateToRoute(item.item.route)}
          accessibilityRole="button"
        >
          <View style={[styles.attentionBadge, { marginEnd: spacing.md }]}>
            <Typography style={styles.attentionCount}>{item.item.count}</Typography>
          </View>
          <Typography style={[styles.attentionLabel, textDirectionStyle(isRtl)]}>{item.item.label}</Typography>
          <Icon name="chevron-right" color={isDark ? colors.text.secondary.dark : colors.text.secondary.light} size={20} />
        </Pressable>
      );
    }

    if (item.type === 'quickHeader') {
      return (
        <Typography variant="h3" style={[styles.sectionTitle, styles.quickHeader, textDirectionStyle(isRtl)]}>
          {t("QuickActions.label")}
        </Typography>
      );
    }

    if (item.type === 'emptyShortcuts') {
      return (
        <Typography variant="caption" style={textDirectionStyle(isRtl)}>
          {t("Dashboard.noShortcuts")}
        </Typography>
      );
    }

    const firstShortcut = item.items[0];
    const secondShortcut = item.items[1];

    return (
      <View style={[styles.shortcutRow, rowDirectionStyle(isRtl)]}>
        <ShortcutCard
          icon={shortcutIcon(firstShortcut.route)}
          label={localizeLabel(firstShortcut.label)}
          onPress={() => navigateToRoute(firstShortcut.route)}
          isDark={isDark}
          isRtl={isRtl}
        />
        {secondShortcut ? (
          <ShortcutCard
            icon={shortcutIcon(secondShortcut.route)}
            label={localizeLabel(secondShortcut.label)}
            onPress={() => navigateToRoute(secondShortcut.route)}
            isDark={isDark}
            isRtl={isRtl}
          />
        ) : (
          <View style={styles.widgetPlaceholder} />
        )}
      </View>
    );
  };

  return (
    <ScreenContainer withKeyboard={false}>
      <FlatList
        data={rows}
        keyExtractor={(item, index) => 'key' in item ? item.key : `${item.type}-${index}`}
        renderItem={renderRow}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </ScreenContainer>
  );
};

function ShortcutCard({
  icon,
  label,
  onPress,
  isDark,
  isRtl,
}: {
  icon: AppIconName;
  label: string;
  onPress: () => void;
  isDark: boolean;
  isRtl: boolean;
}) {
  return (
    <Pressable
      style={[styles.widget, { backgroundColor: isDark ? colors.surface.dark : colors.surface.light, borderColor: isDark ? colors.border.dark : colors.border.light }]}
      onPress={onPress}
      accessibilityRole="button"
    >
      <View style={styles.widgetIcon}>
        <Icon name={icon} color={colors.primary.light} size={22} />
      </View>
      <Typography variant="body" style={[styles.widgetLabel, textDirectionStyle(isRtl)]}>{label}</Typography>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingBottom: layout.screenBottom,
  },
  hero: {
    marginBottom: layout.sectionGap,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  heroIcon: {
    width: 44,
    height: 44,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.palette.teal[50],
  },
  heroTitle: {
    marginBottom: spacing.xs,
  },
  heroSubtitle: {
    color: colors.primary.light,
    fontWeight: '700',
  },
  sectionTitle: {
    marginBottom: spacing.md,
  },
  attentionItem: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    padding: layout.cardPadding,
    borderRadius: radii.lg,
    borderWidth: 1,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  attentionBadge: {
    minWidth: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: colors.palette.red[50],
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  attentionCount: {
    fontWeight: '800',
    color: colors.error,
    fontSize: 15,
  },
  attentionLabel: {
    flex: 1,
    fontWeight: '700',
  },
  quickHeader: {
    marginTop: spacing.md,
  },
  shortcutRow: {
    flexDirection: 'row',
    gap: layout.cardGap,
    marginBottom: layout.cardGap,
  },
  widget: {
    flex: 1,
    minHeight: 132,
    padding: layout.cardPadding,
    borderRadius: radii.xl,
    borderWidth: 1,
    justifyContent: 'space-between',
    ...shadows.sm,
  },
  widgetIcon: {
    width: 48,
    height: 48,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted.light,
    marginBottom: spacing.md,
    alignSelf: 'flex-start',
  },
  widgetLabel: {
    fontWeight: '800',
  },
  widgetPlaceholder: {
    flex: 1,
  },
});
