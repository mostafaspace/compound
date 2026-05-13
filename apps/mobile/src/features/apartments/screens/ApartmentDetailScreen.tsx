import React from "react";
import { ActivityIndicator, StyleSheet, useColorScheme, View, FlatList, TouchableOpacity } from "react-native";
import { Typography } from "../../../components/ui/Typography";
import { createMaterialTopTabNavigator, type MaterialTopTabBarProps } from "@react-navigation/material-top-tabs";
import { ScreenContainer } from "../../../components/layout/ScreenContainer";
import { useTranslation } from "react-i18next";
import { isRtlLanguage, rowDirectionStyle, textDirectionStyle } from "../../../i18n/direction";
import { colors, radii, spacing, typography } from "../../../theme";
import { useGetApartmentQuery } from "../../../services/apartments/apartmentsApi";
import type { ApartmentDetail } from "../../../services/apartments/types";
import { DocumentsTab } from "./tabs/DocumentsTab";
import { FinanceTab } from "./tabs/FinanceTab";
import { NotesTab } from "./tabs/NotesTab";
import { ResidentsTab } from "./tabs/ResidentsTab";
import { VehiclesParkingTab } from "./tabs/VehiclesParkingTab";
import { ViolationsTab } from "./tabs/ViolationsTab";

type ApartmentDetailScreenProps = {
  route: {
    params: {
      unitId: string;
    };
  };
};

type ApartmentTabParamList = {
  Residents: undefined;
  "Vehicles & Parking": undefined;
  Violations: undefined;
  Notes: undefined;
  Documents: undefined;
  Contributions: undefined;
};

const Tab = createMaterialTopTabNavigator<ApartmentTabParamList>();

function CustomTabBar({ state, descriptors, navigation }: MaterialTopTabBarProps) {
  const isDark = useColorScheme() === "dark";
  const { i18n } = useTranslation();
  const isRtl = isRtlLanguage(i18n.language);
  const flatListRef = React.useRef<FlatList>(null);

  React.useEffect(() => {
    // Small timeout to ensure layout is ready before scrolling
    const timer = setTimeout(() => {
      try {
        flatListRef.current?.scrollToIndex({
          index: state.index,
          animated: true,
          viewPosition: 0.5,
        });
      } catch (e) {
        // ignore layout errors on first render
      }
    }, 50);
    return () => clearTimeout(timer);
  }, [state.index]);

  const renderItem = ({ item: route, index }: { item: any; index: number }) => {
    const { options } = descriptors[route.key];
    const label = options.title !== undefined ? options.title : route.name;
    const isFocused = state.index === index;

    const onPress = () => {
      const event = navigation.emit({
        type: "tabPress",
        target: route.key,
        canPreventDefault: true,
      });

      if (!isFocused && !event.defaultPrevented) {
        navigation.navigate(route.name);
      }
    };

    return (
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityState={isFocused ? { selected: true } : {}}
        onPress={onPress}
        style={{
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.md,
          borderBottomWidth: 2,
          borderBottomColor: isFocused ? colors.primary[isDark ? "dark" : "light"] : "transparent",
        }}
      >
        <Typography
          variant="label"
          style={{
            color: isFocused
              ? colors.primary[isDark ? "dark" : "light"]
              : colors.text.secondary[isDark ? "dark" : "light"],
          }}
        >
          {label as string}
        </Typography>
      </TouchableOpacity>
    );
  };

  const renderTabBar = () => (
    <View style={{ backgroundColor: colors.background[isDark ? "dark" : "light"], borderBottomWidth: 1, borderBottomColor: colors.border[isDark ? "dark" : "light"] }}>
      <FlatList
        ref={flatListRef}
        data={state.routes}
        renderItem={renderItem}
        keyExtractor={(item) => item.key}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[{ paddingHorizontal: spacing.sm }, rowDirectionStyle(isRtl)]}
        onScrollToIndexFailed={(info) => {
          setTimeout(() => {
            try {
              flatListRef.current?.scrollToIndex({ index: info.index, animated: true, viewPosition: 0.5 });
            } catch (e) { }
          }, 100);
        }}
      />
    </View>
  );

  return renderTabBar();
}

export function ApartmentDetailScreen({ route }: ApartmentDetailScreenProps) {
  const { t, i18n } = useTranslation();
  const isDark = useColorScheme() === "dark";
  const isRtl = isRtlLanguage(i18n.language);
  const { unitId } = route.params;
  const { data, isLoading, refetch } = useGetApartmentQuery(unitId);
  if (isLoading || !data) {
    return (
      <ScreenContainer style={styles.center}>
        <ActivityIndicator color={colors.primary.dark} />
        <Typography variant="caption" color="secondary" style={{ marginTop: spacing.sm }}>
          {t("Common.loading")}
        </Typography>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer withKeyboard={false} style={styles.container}>
      <View style={[styles.hero, { backgroundColor: colors.surface[isDark ? "dark" : "light"] }, textDirectionStyle(isRtl)]}>
        <Typography variant="label" color="primary">
          {t("Apartments.hubLabel")}
        </Typography>
        <Typography variant="h1" style={{ marginTop: spacing.xs }}>
          {t("Apartments.unitNumber", { number: data.unit.unitNumber })}
        </Typography>
        <Typography variant="caption" color="secondary" style={{ marginTop: spacing.xs }}>
          {t("Apartments.counts", { residents: data.residents.length, vehicles: data.vehicles.length, documents: data.documents.length })}
        </Typography>
      </View>

      <View style={styles.tabs}>
        <Tab.Navigator
          tabBar={props => <CustomTabBar {...props} />}
          screenOptions={{
            lazy: true,
            swipeEnabled: true,
          }}
        >
          <Tab.Screen name="Residents" options={{ title: t("Apartments.tabs.residents") }}>{() => <ResidentsTab apartment={data} />}</Tab.Screen>
          <Tab.Screen name="Vehicles & Parking" options={{ title: t("Apartments.tabs.vehicles") }}>{() => <VehiclesParkingTab apartment={data} />}</Tab.Screen>
          <Tab.Screen name="Violations" options={{ title: t("Apartments.tabs.violations") }}>{() => <ViolationsTab apartment={data} />}</Tab.Screen>
          <Tab.Screen name="Notes" options={{ title: t("Apartments.tabs.notes") }}>{() => <NotesTab apartment={data} />}</Tab.Screen>
          <Tab.Screen name="Documents" options={{ title: t("Apartments.tabs.documents") }}>{() => <DocumentsTab apartment={data} />}</Tab.Screen>
          <Tab.Screen name="Contributions" options={{ title: t("Apartments.tabs.finance") }}>{() => <FinanceTab apartment={data} onRefresh={refetch} />}</Tab.Screen>
        </Tab.Navigator>
      </View>
    </ScreenContainer>
  );
}

function ApartmentPlaceholderTab({ apartment, label }: { apartment: ApartmentDetail; label: string }) {
  const isDark = useColorScheme() === "dark";
  const { t, i18n } = useTranslation();
  const isRtl = isRtlLanguage(i18n.language);

  return (
    <View style={[styles.placeholder, { backgroundColor: colors.surface[isDark ? "dark" : "light"] }, textDirectionStyle(isRtl)]}>
      <Typography variant="h2">{label}</Typography>
      <Typography variant="body" color="secondary" style={{ marginTop: spacing.sm }}>
        {t("Apartments.placeholderHint", { number: apartment.unit.unitNumber, label: label.toLowerCase() })}
      </Typography>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  container: {
    paddingHorizontal: 0,
  },
  hero: {
    borderRadius: radii.xl,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  tabs: {
    flex: 1,
  },
  tabLabel: {
    ...typography.label,
    textTransform: "none",
  },
  placeholder: {
    borderRadius: radii.xl,
    margin: spacing.md,
    padding: spacing.lg,
  },
});
