import React from "react";
import { Pressable, StyleSheet, View, useColorScheme } from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { useTranslation } from "react-i18next";
import { ScreenContainer } from "../../../components/layout/ScreenContainer";
import { Typography } from "../../../components/ui/Typography";
import { usePermission } from "../../../hooks/usePermission";
import { useSelector } from "react-redux";
import { selectCurrentUser } from "../../../store/authSlice";
import { getEffectiveRoleType } from "@compound/contracts";
import { MoreStackParamList } from "../../../navigation/types";
import { colors, layout, radii, shadows, spacing } from "../../../theme";
import { Icon, type AppIconName } from "../../../components/ui/Icon";
import { isRtlLanguage, rowDirectionStyle, textDirectionStyle } from "../../../i18n/direction";

type MoreScreenNavigationProp = StackNavigationProp<MoreStackParamList, "MoreHome">;

export const MoreScreen = ({ navigation }: { navigation: MoreScreenNavigationProp }) => {
  const { t, i18n } = useTranslation();
  const isDark = useColorScheme() === "dark";
  const isRtl = isRtlLanguage(i18n.language);

  const user = useSelector(selectCurrentUser);
  const roleType = getEffectiveRoleType(user);
  const isAdmin = roleType === 'admin';

  const canViewAnnouncements = usePermission("view_announcements");
  const canViewOrgChart = usePermission("view_org_chart") || isAdmin || roleType === 'resident';

  const sections: Array<{
    title: string;
    items: Array<{ id: string; label: string; icon: AppIconName; screen: string; show: boolean }>;
  }> = [
    {
      title: t("More.sections.property", "Property & Community"),
      items: [
        {
          id: "announcements",
          label: t("Announcements.label", "Announcements"),
          icon: "announcements",
          screen: "Announcements",
          show: canViewAnnouncements,
        },
        {
          id: "orgchart",
          label: t("OrgChart.label", "Org Chart"),
          icon: "building",
          screen: "OrgChart",
          show: canViewOrgChart,
        },
        {
          id: "polls",
          label: t("Polls.label", "Polls"),
          icon: "polls",
          screen: "Polls",
          show: true,
        },
      ],
    },
    {
      title: t("More.sections.support", "Support & Feedback"),
      items: [
        {
          id: "issues",
          label: t("Issues.label", "Issues & Complaints"),
          icon: "issues",
          screen: "Issues",
          show: true,
        },
      ],
    },
    {
      title: t("More.sections.account", "Account & Settings"),
      items: [
        {
          id: "verification",
          label: t("Verification.label", "Verification Status"),
          icon: "id",
          screen: "VerificationStatus",
          show: true,
        },
        {
          id: "notifications",
          label: t("Notifications.label", "Notifications"),
          icon: "notifications",
          screen: "Notifications",
          show: true,
        },
        {
          id: "privacy",
          label: t("Privacy.label", "Privacy & Consents"),
          icon: "privacy",
          screen: "PrivacySettings",
          show: true,
        },
        {
          id: "settings",
          label: t("Common.settings", "Settings"),
          icon: "settings",
          screen: "Settings",
          show: true,
        },
      ],
    },
  ];

  return (
    <ScreenContainer 
      scrollable 
      style={styles.container}
    >
      {sections.map((section, idx) => {
        const visibleItems = section.items.filter(item => item.show);
        if (visibleItems.length === 0) return null;

        return (
          <View key={idx} style={styles.section}>
            <Typography variant="label" style={[styles.sectionTitle, textDirectionStyle(isRtl)]}>
              {section.title}
            </Typography>
            <View style={[
              styles.group,
              { backgroundColor: isDark ? colors.surface.dark : colors.surface.light }
            ]}>
              {visibleItems.map((item, itemIdx) => (
                <Pressable
                  key={item.id}
                  onPress={() => navigation.navigate(item.screen as any)}
                  style={({ pressed }) => [
                    styles.menuItem,
                    rowDirectionStyle(isRtl),
                    itemIdx < visibleItems.length - 1 && styles.borderBottom,
                    { borderBottomColor: isDark ? colors.border.dark : colors.border.light },
                    pressed && styles.menuItemPressed,
                  ]}
                >
                  <View style={[styles.row, rowDirectionStyle(isRtl)]}>
                    <View style={[styles.iconBadge, { backgroundColor: isDark ? colors.surfaceMuted.dark : colors.surfaceMuted.light }]}>
                      <Icon name={item.icon} color={colors.primary.light} size={22} />
                    </View>
                    <Typography variant="h3" style={[styles.label, textDirectionStyle(isRtl)]}>{item.label}</Typography>
                  </View>
                  <Icon name={isRtl ? "chevron-left" : "chevron-right"} color={isDark ? colors.text.secondary.dark : colors.text.secondary.light} size={20} />
                </Pressable>
              ))}
            </View>
          </View>
        );
      })}
      <View style={{ height: spacing.xl }} />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: layout.screenTop,
  },
  section: {
    marginBottom: layout.sectionGap,
  },
  sectionTitle: {
    marginBottom: spacing.sm,
  },
  group: {
    borderRadius: radii.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border.light,
    ...shadows.sm,
  },
  menuItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: layout.cardPadding,
    minHeight: 72,
  },
  borderBottom: {
    borderBottomWidth: 1,
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
});
