import React, { useEffect } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  useColorScheme,
  View,
} from "react-native";
import { Typography } from "../../../components/ui/Typography";
import { useTranslation } from "react-i18next";
import { ScreenContainer } from "../../../components/layout/ScreenContainer";
import { colors, radii, shadows, spacing, typography } from "../../../theme";
import { useListApartmentsQuery } from "../../../services/apartments/apartmentsApi";
import type { ApartmentSummary } from "../../../services/apartments/types";
import { isRtlLanguage, rowDirectionStyle, textDirectionStyle } from "../../../i18n/direction";

type ApartmentsListScreenProps = {
  navigation: {
    navigate: (screen: string, params?: Record<string, unknown>) => void;
    replace: (screen: string, params?: Record<string, unknown>) => void;
  };
};

export function ApartmentsListScreen({ navigation }: ApartmentsListScreenProps) {
  const { t, i18n } = useTranslation();
  const isDark = useColorScheme() === "dark";
  const isRtl = isRtlLanguage(i18n.language);
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
      <View style={[styles.header, textDirectionStyle(isRtl)]}>
        <Typography variant="label" color="primary">
          {t("Apartments.listLabel")}
        </Typography>
        <Typography variant="h1">
          {t("Apartments.chooseUnit")}
        </Typography>
        <Typography variant="body" color="secondary" style={{ marginTop: spacing.xs }}>
          {t("Apartments.listSubtitle")}
        </Typography>
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
            isRtl={isRtl}
            onPress={() => navigation.navigate("ApartmentDetail", { unitId: item.id })}
            t={t}
          />
        )}
        ListEmptyComponent={
          <View style={[styles.emptyCard, { backgroundColor: colors.surface[isDark ? "dark" : "light"] }, textDirectionStyle(isRtl)]}>
            <Typography variant="h3">
              {t("Apartments.noApartments")}
            </Typography>
            <Typography variant="body" color="secondary" style={{ marginTop: spacing.xs }}>
              {t("Apartments.noApartmentsHint")}
            </Typography>
          </View>
        }
      />
    </ScreenContainer>
  );
}

function ApartmentCard({
  apartment,
  isDark,
  isRtl,
  onPress,
  t,
}: {
  apartment: ApartmentSummary;
  isDark: boolean;
  isRtl: boolean;
  onPress: () => void;
  t: any;
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
      <View style={[styles.cardTop, rowDirectionStyle(isRtl)]}>
        <View style={textDirectionStyle(isRtl)}>
          <Typography variant="h2">{t("Apartments.unitNumber", { number: apartment.unit.unitNumber })}</Typography>
          <Typography variant="caption" color="secondary" style={{ marginTop: spacing.xs }}>
            {t("Apartments.status", { status: t(`Property.statuses.${apartment.unit.status}`, { defaultValue: apartment.unit.status }) })}
          </Typography>
        </View>
        <Typography variant="label" color="primary" style={styles.chevron}>
          {t("Apartments.open")}
        </Typography>
      </View>

      <View style={[styles.badges, rowDirectionStyle(isRtl)]}>
        <Typography variant="caption" color="secondary" style={[styles.badge, { borderColor: border }]}>
          {t("Apartments.vehicles")}
        </Typography>
        <Typography variant="caption" color="secondary" style={[styles.badge, { borderColor: border }]}>
          {apartment.unit.hasParking ? t("Apartments.parking") : t("Apartments.noParking")}
        </Typography>
        <Typography variant="caption" color="secondary" style={[styles.badge, { borderColor: border }]}>
          {t("Apartments.pendingViolations", { total: pendingTotal })}
        </Typography>
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
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  chevron: {
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
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.ms,
    paddingVertical: spacing.sm,
  },
  emptyCard: {
    borderRadius: radii.xl,
    padding: spacing.lg,
  },
});
