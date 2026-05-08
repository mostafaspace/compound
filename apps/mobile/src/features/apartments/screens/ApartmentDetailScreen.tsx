import React from "react";
import { ActivityIndicator, StyleSheet, Text, useColorScheme, View } from "react-native";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import { ScreenContainer } from "../../../components/layout/ScreenContainer";
import { colors, radii, spacing, typography } from "../../../theme";
import { useGetApartmentQuery } from "../../../services/apartments/apartmentsApi";
import type { ApartmentDetail } from "../../../services/apartments/types";
import { DocumentsTab } from "./tabs/DocumentsTab";
import { NotesTab } from "./tabs/NotesTab";
import { ParkingTab } from "./tabs/ParkingTab";
import { ResidentsTab } from "./tabs/ResidentsTab";
import { VehiclesTab } from "./tabs/VehiclesTab";
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
  Vehicles: undefined;
  Parking: undefined;
  Violations: undefined;
  Notes: undefined;
  Documents: undefined;
  Finance: undefined;
};

const Tab = createMaterialTopTabNavigator<ApartmentTabParamList>();

export function ApartmentDetailScreen({ route }: ApartmentDetailScreenProps) {
  const isDark = useColorScheme() === "dark";
  const { unitId } = route.params;
  const { data, isLoading } = useGetApartmentQuery(unitId);

  if (isLoading || !data) {
    return (
      <ScreenContainer style={styles.center}>
        <ActivityIndicator color={colors.primary.dark} />
        <Text style={[styles.loadingText, { color: colors.text.secondary[isDark ? "dark" : "light"] }]}>
          Loading apartment...
        </Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer withKeyboard={false} style={styles.container}>
      <View style={[styles.hero, { backgroundColor: colors.surface[isDark ? "dark" : "light"] }]}>
        <Text style={[styles.eyebrow, { color: colors.primary[isDark ? "dark" : "light"] }]}>
          Apartment hub
        </Text>
        <Text style={[styles.title, { color: colors.text.primary[isDark ? "dark" : "light"] }]}>
          Unit {data.unit.unitNumber}
        </Text>
        <Text style={[styles.subtitle, { color: colors.text.secondary[isDark ? "dark" : "light"] }]}>
          {data.residents.length} residents · {data.vehicles.length} vehicles · {data.documents.length} documents
        </Text>
      </View>

      <View style={styles.tabs}>
        <Tab.Navigator
          screenOptions={{
            lazy: true,
            swipeEnabled: true,
            tabBarScrollEnabled: true,
            tabBarIndicatorStyle: { backgroundColor: colors.primary[isDark ? "dark" : "light"] },
            tabBarStyle: { backgroundColor: colors.background[isDark ? "dark" : "light"] },
            tabBarLabelStyle: styles.tabLabel,
            tabBarActiveTintColor: colors.text.primary[isDark ? "dark" : "light"],
            tabBarInactiveTintColor: colors.text.secondary[isDark ? "dark" : "light"],
          }}
        >
          <Tab.Screen name="Residents">{() => <ResidentsTab apartment={data} />}</Tab.Screen>
          {data.unit.hasVehicle ? (
            <Tab.Screen name="Vehicles">{() => <VehiclesTab apartment={data} />}</Tab.Screen>
          ) : null}
          {data.unit.hasParking ? (
            <Tab.Screen name="Parking">{() => <ParkingTab apartment={data} />}</Tab.Screen>
          ) : null}
          <Tab.Screen name="Violations">{() => <ViolationsTab apartment={data} />}</Tab.Screen>
          <Tab.Screen name="Notes">{() => <NotesTab apartment={data} />}</Tab.Screen>
          <Tab.Screen name="Documents">{() => <DocumentsTab apartment={data} />}</Tab.Screen>
          <Tab.Screen name="Finance">{() => <ApartmentPlaceholderTab apartment={data} label="Finance" />}</Tab.Screen>
        </Tab.Navigator>
      </View>
    </ScreenContainer>
  );
}

function ApartmentPlaceholderTab({ apartment, label }: { apartment: ApartmentDetail; label: string }) {
  const isDark = useColorScheme() === "dark";

  return (
    <View style={[styles.placeholder, { backgroundColor: colors.surface[isDark ? "dark" : "light"] }]}>
      <Text style={[styles.placeholderTitle, { color: colors.text.primary[isDark ? "dark" : "light"] }]}>
        {label}
      </Text>
      <Text style={[styles.placeholderText, { color: colors.text.secondary[isDark ? "dark" : "light"] }]}>
        Unit {apartment.unit.unitNumber} {label.toLowerCase()} controls land in the next implementation slice.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    ...typography.caption,
    marginTop: spacing.sm,
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
  eyebrow: {
    ...typography.label,
  },
  title: {
    ...typography.h1,
    marginTop: spacing.xs,
  },
  subtitle: {
    ...typography.caption,
    marginTop: spacing.xs,
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
  placeholderTitle: {
    ...typography.h2,
  },
  placeholderText: {
    ...typography.body,
    marginTop: spacing.sm,
  },
});
