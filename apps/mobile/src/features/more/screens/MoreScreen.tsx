import React from "react";
import { Pressable, StyleSheet, View, useColorScheme } from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { useTranslation } from "react-i18next";
import { ScreenContainer } from "../../../components/layout/ScreenContainer";
import { Typography } from "../../../components/ui/Typography";
import { usePermission } from "../../../hooks/usePermission";
import { MoreStackParamList } from "../../../navigation/types";
import { colors, spacing } from "../../../theme";

type MoreScreenNavigationProp = StackNavigationProp<MoreStackParamList, "MoreHome">;

type MenuItem = {
  id: string;
  label: string;
  icon: string;
  screen: keyof MoreStackParamList;
  show: boolean;
};

export const MoreScreen = ({ navigation }: { navigation: MoreScreenNavigationProp }) => {
  const { t } = useTranslation();
  const isDark = useColorScheme() === "dark";

  const canViewAnnouncements = usePermission("view_announcements");
  const canViewOrgChart = usePermission("view_org_chart");

  const menuItems: MenuItem[] = [
    {
      id: "issues",
      label: t("Issues.label", { defaultValue: "Issues & Complaints" }),
      icon: "!",
      screen: "Issues",
      show: true,
    },
    {
      id: "documents",
      label: t("Documents.label", { defaultValue: "Documents" }),
      icon: "DOC",
      screen: "Documents",
      show: true,
    },
    {
      id: "verification",
      label: t("Verification.label", { defaultValue: "Verification Status" }),
      icon: "ID",
      screen: "VerificationStatus",
      show: true,
    },
    {
      id: "property",
      label: t("Property.label"),
      icon: "HOME",
      screen: "Property",
      show: true,
    },
    {
      id: "notifications",
      label: t("Notifications.label"),
      icon: "BELL",
      screen: "Notifications",
      show: true,
    },
    {
      id: "announcements",
      label: t("Announcements.label"),
      icon: "NEWS",
      screen: "Announcements",
      show: canViewAnnouncements,
    },
    {
      id: "orgchart",
      label: t("OrgChart.label", { defaultValue: "Org Chart" }),
      icon: "ORG",
      screen: "OrgChart",
      show: canViewOrgChart,
    },
    {
      id: "privacy",
      label: t("Privacy.label", { defaultValue: "Privacy & Consents" }),
      icon: "LOCK",
      screen: "PrivacySettings",
      show: true,
    },
    {
      id: "settings",
      label: t("Common.settings", { defaultValue: "Settings" }),
      icon: "CFG",
      screen: "Settings",
      show: true,
    },
  ];

  return (
    <ScreenContainer scrollable style={styles.container}>
      <View style={styles.section}>
        {menuItems.filter((item) => item.show).map((item) => (
          <Pressable
            key={item.id}
            onPress={() => navigation.navigate(item.screen)}
            style={({ pressed }) => [
              styles.menuItem,
              {
                backgroundColor: isDark ? colors.surface.dark : colors.surface.light,
                borderColor: isDark ? colors.border.dark : colors.border.light,
              },
              pressed && styles.menuItemPressed,
            ]}
          >
            <View style={styles.row}>
              <View style={[styles.iconBadge, { backgroundColor: isDark ? colors.background.dark : "#f3f4f6" }]}>
                <Typography variant="caption" style={styles.iconText}>
                  {item.icon}
                </Typography>
              </View>
              <Typography variant="h3">{item.label}</Typography>
            </View>
            <Typography variant="h2" style={styles.arrow}>
              {">"}
            </Typography>
          </Pressable>
        ))}
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 0,
  },
  section: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  menuItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing.lg,
    borderRadius: 16,
    borderWidth: 1,
  },
  menuItemPressed: {
    opacity: 0.7,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  iconBadge: {
    minWidth: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
  },
  iconText: {
    fontSize: 11,
    fontWeight: "700",
  },
  arrow: {
    color: "#9ca3af",
  },
});
