import React from "react";
import { ActivityIndicator, Animated, NativeScrollEvent, NativeSyntheticEvent, StyleSheet, useColorScheme, View, FlatList, TouchableOpacity } from "react-native";
import { Typography } from "../../../components/ui/Typography";
import { createMaterialTopTabNavigator, type MaterialTopTabBarProps } from "@react-navigation/material-top-tabs";
import { ScreenContainer } from "../../../components/layout/ScreenContainer";
import { useTranslation } from "react-i18next";
import { isRtlLanguage, rowDirectionStyle, textDirectionStyle } from "../../../i18n/direction";
import { colors, radii, spacing, typography } from "../../../theme";
import { useGetAdminApartmentQuery, useGetApartmentQuery } from "../../../services/apartments/apartmentsApi";
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
      adminMode?: boolean;
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

export type ApartmentTabRefreshProps = {
  onRefresh?: () => void | Promise<unknown>;
  refreshing?: boolean;
  onContentScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
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
  const { unitId, adminMode } = route.params;
  const isAdmin = adminMode === true;
  const residentQuery = useGetApartmentQuery(unitId, { skip: isAdmin });
  const adminQuery = useGetAdminApartmentQuery(unitId, { skip: !isAdmin });
  const activeQuery = isAdmin ? adminQuery : residentQuery;
  const { data, isLoading, isError, isFetching, refetch } = activeQuery;
  const collapseAnim = React.useRef(new Animated.Value(0)).current;
  const collapsedRef = React.useRef(false);
  const lastScrollYRef = React.useRef(0);

  const setHeaderCollapsed = React.useCallback((collapsed: boolean) => {
    if (collapsedRef.current === collapsed) {
      return;
    }

    collapsedRef.current = collapsed;
    Animated.timing(collapseAnim, {
      toValue: collapsed ? 1 : 0,
      duration: 220,
      useNativeDriver: false,
    }).start();
  }, [collapseAnim]);

  const handleTabScroll = React.useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextY = event.nativeEvent.contentOffset.y;
    const previousY = lastScrollYRef.current;
    const delta = nextY - previousY;

    if (nextY <= 8) {
      setHeaderCollapsed(false);
    } else if (delta > 8) {
      setHeaderCollapsed(true);
    } else if (delta < -8) {
      setHeaderCollapsed(false);
    }

    lastScrollYRef.current = nextY;
  }, [setHeaderCollapsed]);

  const heroStyle = {
    maxHeight: collapseAnim.interpolate({ inputRange: [0, 1], outputRange: [156, 0] }),
    opacity: collapseAnim.interpolate({ inputRange: [0, 0.75, 1], outputRange: [1, 0.2, 0] }),
    marginBottom: collapseAnim.interpolate({ inputRange: [0, 1], outputRange: [spacing.md, 0] }),
    transform: [
      {
        translateY: collapseAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -18] }),
      },
    ],
  };

  const tabRefreshProps: ApartmentTabRefreshProps = {
    onRefresh: refetch,
    refreshing: Boolean(isFetching),
    onContentScroll: handleTabScroll,
  };

  if (isLoading || !data) {
    return (
      <ScreenContainer style={styles.center}>
        {isError ? (
          <>
            <Typography variant="h3" style={textDirectionStyle(isRtl)}>
              {t("Apartments.loadError", { defaultValue: "Could not load apartment detail." })}
            </Typography>
            <Typography variant="caption" color="secondary" style={[styles.loadingCopy, textDirectionStyle(isRtl)]}>
              {t("Apartments.loadErrorHint", { defaultValue: "Please go back and try opening the unit again." })}
            </Typography>
          </>
        ) : (
          <>
            <ActivityIndicator color={colors.primary.dark} />
            <Typography variant="caption" color="secondary" style={[styles.loadingCopy, textDirectionStyle(isRtl)]}>
              {t("Common.loading")}
            </Typography>
          </>
        )}
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer withKeyboard={false} style={styles.container}>
      <Animated.View style={[styles.heroContainer, heroStyle]}>
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
      </Animated.View>

      <View style={styles.tabs}>
        <Tab.Navigator
          tabBar={props => <CustomTabBar {...props} />}
          screenOptions={{
            lazy: true,
            swipeEnabled: true,
          }}
        >
          <Tab.Screen name="Residents" options={{ title: t("Apartments.tabs.residents") }}>{() => <ApartmentTabScene isDark={isDark}><ResidentsTab apartment={data} {...tabRefreshProps} /></ApartmentTabScene>}</Tab.Screen>
          <Tab.Screen name="Vehicles & Parking" options={{ title: t("Apartments.tabs.vehicles") }}>{() => <ApartmentTabScene isDark={isDark}><VehiclesParkingTab apartment={data} {...tabRefreshProps} /></ApartmentTabScene>}</Tab.Screen>
          <Tab.Screen name="Violations" options={{ title: t("Apartments.tabs.violations") }}>{() => <ApartmentTabScene isDark={isDark}><ViolationsTab apartment={data} {...tabRefreshProps} /></ApartmentTabScene>}</Tab.Screen>
          <Tab.Screen name="Notes" options={{ title: t("Apartments.tabs.notes") }}>{() => <ApartmentTabScene isDark={isDark}><NotesTab apartment={data} {...tabRefreshProps} /></ApartmentTabScene>}</Tab.Screen>
          <Tab.Screen name="Documents" options={{ title: t("Apartments.tabs.documents") }}>{() => <ApartmentTabScene isDark={isDark}><DocumentsTab apartment={data} {...tabRefreshProps} /></ApartmentTabScene>}</Tab.Screen>
          <Tab.Screen name="Contributions" options={{ title: t("Apartments.tabs.finance") }}>{() => <ApartmentTabScene isDark={isDark}><FinanceTab apartment={data} {...tabRefreshProps} /></ApartmentTabScene>}</Tab.Screen>
        </Tab.Navigator>
      </View>
    </ScreenContainer>
  );
}

function ApartmentTabScene({ children, isDark }: { children: React.ReactNode; isDark: boolean }) {
  return (
    <View style={[styles.tabScene, { backgroundColor: colors.background[isDark ? "dark" : "light"] }]}>
      {children}
    </View>
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
    padding: spacing.lg,
  },
  loadingCopy: {
    marginTop: spacing.sm,
    textAlign: "center",
  },
  container: {
    paddingHorizontal: 0,
  },
  heroContainer: {
    overflow: "hidden",
  },
  hero: {
    borderRadius: radii.xl,
    marginHorizontal: spacing.md,
    padding: spacing.md,
  },
  tabs: {
    flex: 1,
  },
  tabScene: {
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
