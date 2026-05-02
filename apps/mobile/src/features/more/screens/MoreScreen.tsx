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
import { colors, spacing } from "../../../theme";

type MoreScreenNavigationProp = StackNavigationProp<MoreStackParamList, "MoreHome">;

export const MoreScreen = ({ navigation }: { navigation: MoreScreenNavigationProp }) => {
  const { t } = useTranslation();
  const isDark = useColorScheme() === "dark";

  const user = useSelector(selectCurrentUser);
  const roleType = getEffectiveRoleType(user);
  const isAdmin = roleType === 'admin';

  const canViewAnnouncements = usePermission("view_announcements");
  const canViewOrgChart = usePermission("view_org_chart") || isAdmin;

  const sections = [
    {
      title: t("More.sections.property", "Property & Community"),
      items: [
        {
          id: "property",
          label: t("Property.label", "Property Registry"),
          icon: "🏘️",
          screen: "Property",
          show: true,
        },
        {
          id: "announcements",
          label: t("Announcements.label", "Announcements"),
          icon: "📢",
          screen: "Announcements",
          show: canViewAnnouncements,
        },
        {
          id: "orgchart",
          label: t("OrgChart.label", "Org Chart"),
          icon: "📊",
          screen: "OrgChart",
          show: canViewOrgChart,
        },
        {
          id: "polls",
          label: t("Polls.label", "Polls"),
          icon: "📈",
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
          icon: "🛠️",
          screen: "Issues",
          show: true,
        },
      ],
    },
    {
      title: t("More.sections.account", "Account & Settings"),
      items: [
        {
          id: "documents",
          label: t("Documents.label", "Documents"),
          icon: "📄",
          screen: "Documents",
          show: true,
        },
        {
          id: "verification",
          label: t("Verification.label", "Verification Status"),
          icon: "🪪",
          screen: "VerificationStatus",
          show: true,
        },
        {
          id: "notifications",
          label: t("Notifications.label", "Notifications"),
          icon: "🔔",
          screen: "Notifications",
          show: true,
        },
        {
          id: "privacy",
          label: t("Privacy.label", "Privacy & Consents"),
          icon: "🛡️",
          screen: "PrivacySettings",
          show: true,
        },
        {
          id: "settings",
          label: t("Common.settings", "Settings"),
          icon: "⚙️",
          screen: "Settings",
          show: true,
        },
      ],
    },
  ];

  return (
    <ScreenContainer 
      scrollable 
      edges={['bottom', 'left', 'right']} 
      style={styles.container}
    >
      {sections.map((section, idx) => {
        const visibleItems = section.items.filter(item => item.show);
        if (visibleItems.length === 0) return null;

        return (
          <View key={idx} style={styles.section}>
            <Typography variant="label" style={styles.sectionTitle}>
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
                    itemIdx < visibleItems.length - 1 && styles.borderBottom,
                    { borderBottomColor: isDark ? colors.border.dark : colors.border.light },
                    pressed && styles.menuItemPressed,
                  ]}
                >
                  <View style={styles.row}>
                    <View style={[styles.iconBadge, { backgroundColor: isDark ? "#1E293B" : "#F1F5F9" }]}>
                      <Typography style={{ fontSize: 20 }}>
                        {item.icon}
                      </Typography>
                    </View>
                    <Typography variant="h3" style={styles.label}>{item.label}</Typography>
                  </View>
                  <Typography variant="h3" style={styles.arrow}>
                    {"›"}
                  </Typography>
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
    paddingTop: spacing.lg,
  },
  section: {
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  sectionTitle: {
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
    color: "#64748B",
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontSize: 10,
    fontWeight: '700',
  },
  group: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  menuItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing.md,
    paddingVertical: spacing.lg,
    minHeight: 80,
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
  arrow: {
    color: "#94A3B8",
    fontSize: 24,
    fontWeight: '300',
  },
});
