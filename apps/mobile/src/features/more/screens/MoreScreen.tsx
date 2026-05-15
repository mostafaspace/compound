import React from "react";
import { FlatList, Pressable, StyleSheet, View, useColorScheme } from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { useTranslation } from "react-i18next";
import { ScreenContainer } from "../../../components/layout/ScreenContainer";
import { Typography } from "../../../components/ui/Typography";
import { usePermission } from "../../../hooks/usePermission";
import { useDispatch, useSelector } from "react-redux";
import * as Keychain from "react-native-keychain";
import { logout, selectCurrentUser } from "../../../store/authSlice";
import { getEffectiveRoleType } from "@compound/contracts";
import { MoreStackParamList } from "../../../navigation/types";
import { colors, layout, radii, shadows, spacing } from "../../../theme";
import { Icon, type AppIconName } from "../../../components/ui/Icon";
import { isRtlLanguage, rowDirectionStyle, textDirectionStyle } from "../../../i18n/direction";
import { api } from "../../../services/api";

const authTokenService = "compound.mobile.authToken";

type MoreScreenNavigationProp = StackNavigationProp<MoreStackParamList, "MoreHome">;

type MoreItem = { id: string; label: string; icon: AppIconName; screen: string; show: boolean; rootScreen?: boolean };
type MoreRow =
  | { type: "section"; id: string; title: string }
  | { type: "item"; id: string; item: MoreItem; isFirst: boolean; isLast: boolean }
  | { type: "logout" }
  | { type: "spacer" };

export const MoreScreen = ({ navigation }: { navigation: MoreScreenNavigationProp }) => {
  const { t, i18n } = useTranslation();
  const isDark = useColorScheme() === "dark";
  const isRtl = isRtlLanguage(i18n.language);
  const dispatch = useDispatch();

  const user = useSelector(selectCurrentUser);
  const roleType = getEffectiveRoleType(user);
  const isAdmin = roleType === 'admin';
  const surfaceColor = isDark ? colors.surface.dark : colors.surface.light;
  const mutedSurfaceColor = isDark ? colors.surfaceMuted.dark : colors.surfaceMuted.light;
  const borderColor = isDark ? colors.border.dark : colors.border.light;
  const secondaryText = isDark ? colors.text.secondary.dark : colors.text.secondary.light;
  const displayRole = formatRoleLabel(user?.role ?? roleType);

  const handleLogout = async () => {
    dispatch(logout());
    setTimeout(() => { dispatch(api.util.resetApiState()); }, 100);
    try { await Keychain.resetGenericPassword({ service: authTokenService }); } catch { /* ignore */ }
  };

  const canViewAnnouncements = usePermission("view_announcements");
  const canViewOrgChart = usePermission("view_org_chart") || isAdmin || roleType === 'resident';
  const canViewPolls = usePermission("view_governance");

  const sections: Array<{
    title: string;
    items: MoreItem[];
  }> = [
    {
      title: t("More.sections.property"),
      items: [
        {
          id: "announcements",
          label: t("Announcements.label"),
          icon: "announcements",
          screen: "Announcements",
          show: canViewAnnouncements,
        },
        {
          id: "orgchart",
          label: t("OrgChart.label"),
          icon: "building",
          screen: "OrgChart",
          show: canViewOrgChart,
        },
        {
          id: "polls",
          label: t("Polls.label"),
          icon: "polls",
          screen: "Polls",
          show: canViewPolls && isAdmin,
        },
      ],
    },
    {
      title: t("More.sections.vehicles"),
      items: [
        {
          id: "notify-vehicle",
          label: t("Vehicles.notifyOwner"),
          icon: "visitors",
          screen: "VehicleNotifySearch",
          rootScreen: true,
          show: roleType === 'resident',
        },
        {
          id: "vehicle-messages",
          label: t("Vehicles.inboxLabel"),
          icon: "notifications",
          screen: "VehicleNotifyInbox",
          rootScreen: true,
          show: roleType === 'resident',
        },
      ],
    },
    {
      title: t("More.sections.support"),
      items: [
        {
          id: "issues",
          label: t("Issues.label"),
          icon: "issues",
          screen: "Issues",
          show: true,
        },
      ],
    },
    {
      title: t("More.sections.account"),
      items: [
        {
          id: "verification",
          label: t("Verification.label"),
          icon: "id",
          screen: "VerificationStatus",
          show: true,
        },
        {
          id: "notifications",
          label: t("Notifications.label"),
          icon: "notifications",
          screen: "Notifications",
          show: false,
        },
        {
          id: "privacy",
          label: t("Privacy.label"),
          icon: "privacy",
          screen: "PrivacySettings",
          show: true,
        },
        {
          id: "settings",
          label: t("Common.settings"),
          icon: "settings",
          screen: "Settings",
          show: true,
        },
      ],
    },
  ];

  const rows: MoreRow[] = [];
  for (let sectionIndex = 0; sectionIndex < sections.length; sectionIndex += 1) {
    const section = sections[sectionIndex];
    const visibleItems: MoreItem[] = [];

    for (let itemIndex = 0; itemIndex < section.items.length; itemIndex += 1) {
      const item = section.items[itemIndex];
      if (item.show) {
        visibleItems.push(item);
      }
    }

    if (visibleItems.length === 0) {
      continue;
    }

    rows.push({ type: "section", id: `section-${sectionIndex}`, title: section.title });
    for (let itemIndex = 0; itemIndex < visibleItems.length; itemIndex += 1) {
      const item = visibleItems[itemIndex];
      rows.push({
        type: "item",
        id: item.id,
        item,
        isFirst: itemIndex === 0,
        isLast: itemIndex === visibleItems.length - 1,
      });
    }
  }
  rows.push({ type: "logout" }, { type: "spacer" });

  const renderRow = ({ item }: { item: MoreRow }) => {
    if (item.type === "section") {
      return (
        <Typography variant="label" style={[styles.sectionTitle, textDirectionStyle(isRtl)]}>
          {item.title}
        </Typography>
      );
    }

    if (item.type === "item") {
      return (
        <Pressable
          onPress={() => {
            if (item.item.rootScreen) {
              // Navigate to a screen in the parent root stack
              navigation.getParent()?.getParent()?.navigate(item.item.screen as never);
            } else {
              navigation.navigate(item.item.screen as never);
            }
          }}
          style={({ pressed }) => [
            styles.menuItem,
            rowDirectionStyle(isRtl),
            item.isFirst && styles.firstMenuItem,
            !item.isLast && styles.borderBottom,
            item.isLast && styles.lastMenuItem,
            { borderColor, borderBottomColor: borderColor, backgroundColor: surfaceColor },
            pressed && styles.menuItemPressed,
          ]}
        >
          <View style={[styles.row, rowDirectionStyle(isRtl)]}>
            <View style={[styles.iconBadge, { backgroundColor: mutedSurfaceColor }]}>
              <Icon name={item.item.icon} color={colors.primary.light} size={22} />
            </View>
            <Typography variant="h3" style={[styles.label, textDirectionStyle(isRtl)]}>{item.item.label}</Typography>
          </View>
          <Icon name="chevron-right" color={isDark ? colors.text.secondary.dark : colors.text.secondary.light} size={20} />
        </Pressable>
      );
    }

    if (item.type === "logout") {
      return (
        <Pressable
          onPress={handleLogout}
          style={({ pressed }) => [
            styles.logoutBtn,
            rowDirectionStyle(isRtl),
            { backgroundColor: surfaceColor, borderColor: colors.error },
            pressed && { opacity: 0.7 },
          ]}
          accessibilityRole="button"
          accessibilityLabel={t('Auth.logout')}
        >
          <Icon name="x" color={colors.error} size={20} />
          <Typography variant="h3" style={[styles.logoutText, textDirectionStyle(isRtl)]}>
            {t('Auth.logout')}
          </Typography>
        </Pressable>
      );
    }

    return <View style={{ height: spacing.xl }} />;
  };

  return (
    <ScreenContainer 
      style={styles.container}
      withKeyboard={false}
    >
      <FlatList
        data={rows}
        keyExtractor={(item) => {
          if (item.type === "spacer" || item.type === "logout") {
            return item.type;
          }

          return item.id;
        }}
        renderItem={renderRow}
        ListHeaderComponent={
          <View style={[styles.profileCard, { backgroundColor: surfaceColor, borderColor }, textDirectionStyle(isRtl)]}>
            <View style={[styles.profileTop, rowDirectionStyle(isRtl)]}>
              <View style={[styles.profileAvatar, { backgroundColor: mutedSurfaceColor }]}>
                <Icon name="user" color={colors.primary.light} size={26} />
              </View>
              <View style={[styles.profileCopy, textDirectionStyle(isRtl)]}>
                <Typography variant="h2" numberOfLines={1} style={textDirectionStyle(isRtl)}>
                  {user?.name ?? t("Common.profile")}
                </Typography>
                <Typography variant="caption" style={[styles.profileEmail, { color: secondaryText }, textDirectionStyle(isRtl)]} numberOfLines={1}>
                  {user?.email ?? ""}
                </Typography>
              </View>
            </View>
            <View style={[styles.profileMeta, rowDirectionStyle(isRtl)]}>
              <Typography variant="label" style={[styles.rolePill, textDirectionStyle(isRtl)]}>
                {displayRole}
              </Typography>
              {user?.status ? (
                <Typography variant="caption" style={[styles.statusText, { color: secondaryText }, textDirectionStyle(isRtl)]}>
                  {formatRoleLabel(user.status)}
                </Typography>
              ) : null}
            </View>
          </View>
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </ScreenContainer>
  );
};

function formatRoleLabel(value: string): string {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

const styles = StyleSheet.create({
  container: {
    paddingTop: layout.screenTop,
  },
  listContent: {
    paddingBottom: layout.screenBottom,
  },
  profileCard: {
    borderRadius: radii.xl,
    borderWidth: 1,
    padding: layout.heroPadding,
    marginBottom: layout.sectionGap,
    ...shadows.sm,
  },
  profileTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  profileAvatar: {
    width: 56,
    height: 56,
    borderRadius: radii.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  profileCopy: {
    flex: 1,
  },
  profileEmail: {
    marginTop: spacing.xs,
  },
  profileMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  rolePill: {
    backgroundColor: colors.primary.light,
    borderRadius: radii.pill,
    color: colors.text.inverse,
    overflow: "hidden",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  statusText: {
    textTransform: "capitalize",
  },
  sectionTitle: {
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  menuItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: layout.cardPadding,
    minHeight: 72,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderTopWidth: 1,
    borderColor: colors.border.light,
    ...shadows.sm,
  },
  borderBottom: {
    borderBottomWidth: 1,
  },
  firstMenuItem: {
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
  },
  lastMenuItem: {
    borderBottomLeftRadius: radii.xl,
    borderBottomRightRadius: radii.xl,
    borderBottomWidth: 1,
    marginBottom: layout.sectionGap,
  },
  menuItemPressed: {
    backgroundColor: 'rgba(0,0,0,0.02)',
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radii.xl,
    borderWidth: 1,
    paddingVertical: spacing.md,
    marginTop: spacing.md,
    ...shadows.sm,
  },
  logoutText: {
    color: colors.error,
    fontWeight: '700',
  },
});
