import React, { useEffect } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native";
import { ScreenContainer } from "../../../components/layout/ScreenContainer";
import { colors, radii, shadows, spacing, typography } from "../../../theme";
import { useListApartmentsQuery } from "../../../services/apartments/apartmentsApi";
import type { ApartmentSummary } from "../../../services/apartments/types";

type ApartmentsListScreenProps = {
  navigation: {
    navigate: (screen: string, params?: Record<string, unknown>) => void;
    replace: (screen: string, params?: Record<string, unknown>) => void;
  };
};

export function ApartmentsListScreen({ navigation }: ApartmentsListScreenProps) {
  const isDark = useColorScheme() === "dark";
  const { data = [], isLoading, refetch } = useListApartmentsQuery();

  useEffect(() => {
    if (data.length === 1) {
      navigation.replace("ApartmentDetail", { unitId: data[0].id });
    }
  }, [data, navigation]);

  if (isLoading) {
    return (
      <ScreenContainer style={styles.center}>
        <ActivityIndicator color={colors.primary.dark} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer withKeyboard={false}>
      <View style={styles.header}>
        <Text style={[styles.eyebrow, { color: colors.primary[isDark ? "dark" : "light"] }]}>
          My Apartment(s)
        </Text>
        <Text style={[styles.title, { color: colors.text.primary[isDark ? "dark" : "light"] }]}>
          Choose a unit
        </Text>
        <Text style={[styles.subtitle, { color: colors.text.secondary[isDark ? "dark" : "light"] }]}>
          Residents, vehicles, documents, notes, violations, and finance all live here now.
        </Text>
      </View>

      <FlatList
        data={data}
        keyExtractor={(apartment) => apartment.id}
        contentContainerStyle={styles.list}
        refreshing={isLoading}
        onRefresh={refetch}
        renderItem={({ item }) => (
          <ApartmentCard
            apartment={item}
            isDark={isDark}
            onPress={() => navigation.navigate("ApartmentDetail", { unitId: item.id })}
          />
        )}
        ListEmptyComponent={
          <View style={[styles.emptyCard, { backgroundColor: colors.surface[isDark ? "dark" : "light"] }]}>
            <Text style={[styles.emptyTitle, { color: colors.text.primary[isDark ? "dark" : "light"] }]}>
              No apartments yet
            </Text>
            <Text style={[styles.emptyText, { color: colors.text.secondary[isDark ? "dark" : "light"] }]}>
              Verified units will appear here after registration is approved.
            </Text>
          </View>
        }
      />
    </ScreenContainer>
  );
}

function ApartmentCard({
  apartment,
  isDark,
  onPress,
}: {
  apartment: ApartmentSummary;
  isDark: boolean;
  onPress: () => void;
}) {
  const surface = colors.surface[isDark ? "dark" : "light"];
  const text = colors.text.primary[isDark ? "dark" : "light"];
  const secondary = colors.text.secondary[isDark ? "dark" : "light"];
  const border = colors.border[isDark ? "dark" : "light"];
  const pendingTotal = apartment.violationsSummary?.total ?? "0.00";

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: surface, borderColor: border, opacity: pressed ? 0.86 : 1 },
      ]}
    >
      <View style={styles.cardTop}>
        <View>
          <Text style={[styles.unitNumber, { color: text }]}>Unit {apartment.unit.unitNumber}</Text>
          <Text style={[styles.meta, { color: secondary }]}>Status: {apartment.unit.status}</Text>
        </View>
        <Text style={[styles.chevron, { color: colors.primary[isDark ? "dark" : "light"] }]}>Open</Text>
      </View>

      <View style={styles.badges}>
        <Text style={[styles.badge, { borderColor: border, color: secondary }]}>
          {apartment.unit.hasVehicle ? "Vehicles" : "No vehicles"}
        </Text>
        <Text style={[styles.badge, { borderColor: border, color: secondary }]}>
          {apartment.unit.hasParking ? "Parking" : "No parking"}
        </Text>
        <Text style={[styles.badge, { borderColor: border, color: secondary }]}>
          Pending violations: {pendingTotal}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  eyebrow: {
    ...typography.label,
  },
  title: {
    ...typography.h1,
  },
  subtitle: {
    ...typography.body,
  },
  list: {
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  card: {
    borderRadius: radii.xl,
    borderWidth: 1,
    padding: spacing.md,
    ...shadows.md,
  },
  cardTop: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  unitNumber: {
    ...typography.h2,
  },
  meta: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
  chevron: {
    ...typography.label,
    minHeight: 44,
    paddingTop: spacing.sm,
  },
  badges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  badge: {
    ...typography.caption,
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.ms,
    paddingVertical: spacing.sm,
  },
  emptyCard: {
    borderRadius: radii.xl,
    padding: spacing.lg,
  },
  emptyTitle: {
    ...typography.h3,
  },
  emptyText: {
    ...typography.body,
    marginTop: spacing.xs,
  },
});
