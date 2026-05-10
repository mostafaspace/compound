import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, useColorScheme, View } from "react-native";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import { useNavigation } from "@react-navigation/native";
import type { StackNavigationProp } from "@react-navigation/stack";
import type { RootStackParamList } from "../../../navigation/types";
import { ScreenContainer } from "../../../components/layout/ScreenContainer";
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
  Finance: undefined;
};

const Tab = createMaterialTopTabNavigator<ApartmentTabParamList>();

export function ApartmentDetailScreen({ route }: ApartmentDetailScreenProps) {
  const isDark = useColorScheme() === "dark";
  const { unitId } = route.params;
  const { data, isLoading } = useGetApartmentQuery(unitId);
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

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
        <View style={styles.heroActions}>
          <Pressable style={[styles.heroBtn, { borderColor: colors.primary[isDark ? "dark" : "light"] }]} onPress={() => navigation.navigate("VehicleNotifySearch")}>
            <Text style={[styles.heroBtnText, { color: colors.primary[isDark ? "dark" : "light"] }]}>Notify a vehicle</Text>
          </Pressable>
          <Pressable style={[styles.heroBtn, { borderColor: colors.border[isDark ? "dark" : "light"] }]} onPress={() => navigation.navigate("VehicleNotifyInbox")}>
            <Text style={[styles.heroBtnText, { color: colors.text.secondary[isDark ? "dark" : "light"] }]}>Vehicle messages</Text>
          </Pressable>
        </View>
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
          <Tab.Screen name="Vehicles & Parking">{() => <VehiclesParkingTab apartment={data} />}</Tab.Screen>
          <Tab.Screen name="Violations">{() => <ViolationsTab apartment={data} />}</Tab.Screen>
          <Tab.Screen name="Notes">{() => <NotesTab apartment={data} />}</Tab.Screen>
          <Tab.Screen name="Documents">{() => <DocumentsTab apartment={data} />}</Tab.Screen>
          <Tab.Screen name="Finance">{() => <FinanceTab apartment={data} />}</Tab.Screen>
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
  heroActions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  heroBtn: {
    borderRadius: radii.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  heroBtnText: {
    ...typography.caption,
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
