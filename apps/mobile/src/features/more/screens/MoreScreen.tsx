import React from 'react';
import { StyleSheet, ScrollView, View, useColorScheme, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing } from '../../../theme';
import { Typography } from '../../../components/ui/Typography';
import { ScreenContainer } from '../../../components/layout/ScreenContainer';

export const MoreScreen = ({ navigation }: { navigation: any }) => {
  const { t } = useTranslation();
  const isDark = useColorScheme() === 'dark';

  const menuItems = [
    {
      id: 'property',
      label: t("Property.label"),
      icon: '🏠',
      screen: 'Property',
    },
    {
      id: 'notifications',
      label: t("Notifications.label"),
      icon: '🔔',
      screen: 'Notifications',
    },
    {
      id: 'announcements',
      label: t("Announcements.label"),
      icon: '📢',
      screen: 'Announcements',
    },
    {
      id: 'orgchart',
      label: t("OrgChart.label", { defaultValue: "Org Chart" }),
      icon: '🏛️',
      screen: 'OrgChart',
    },
    {
      id: 'settings',
      label: t("Common.settings", { defaultValue: "Settings" }),
      icon: '⚙️',
      screen: 'Settings',
    },
  ];

  return (
    <ScreenContainer scrollable style={styles.container}>
      <View style={styles.section}>
        {menuItems.map((item) => (
          <Pressable 
            key={item.id} 
            onPress={() => navigation.navigate(item.screen)}
            style={({ pressed }) => [
              styles.menuItem, 
              { 
                backgroundColor: isDark ? colors.surface.dark : colors.surface.light,
                borderColor: isDark ? colors.border.dark : colors.border.light,
              },
              pressed && styles.menuItemPressed
            ]}
          >
            <View style={styles.row}>
              <Typography style={styles.icon}>{item.icon}</Typography>
              <Typography variant="h3">{item.label}</Typography>
            </View>
            <Typography variant="h2" style={styles.arrow}>›</Typography>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: 16,
    borderWidth: 1,
  },
  menuItemPressed: {
    opacity: 0.7,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  icon: {
    fontSize: 24,
  },
  arrow: {
    color: '#9ca3af',
  }
});
