import React, { useState } from 'react';
import { View, StyleSheet, FlatList, useColorScheme, Pressable, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../../../store/authSlice';
import { useGetBuildingsQuery, useGetUnitsByBuildingQuery } from '../../../services/admin';
import { colors, spacing } from '../../../theme';
import { Typography } from '../../../components/ui/Typography';
import { ScreenContainer } from '../../../components/layout/ScreenContainer';

export const AdminUnitsScreen = () => {
  const { t } = useTranslation();
  const isDark = useColorScheme() === 'dark';
  const user = useSelector(selectCurrentUser);
  
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);

  const { data: buildings = [], isLoading: loadingBuildings } = useGetBuildingsQuery(user?.compoundId || '', {
    skip: !user?.compoundId,
  });

  const { data: units = [], isLoading: loadingUnits, refetch: refetchUnits } = useGetUnitsByBuildingQuery(selectedBuildingId || '', {
    skip: !selectedBuildingId,
  });

  const renderBuilding = ({ item }: { item: any }) => (
    <Pressable 
      onPress={() => setSelectedBuildingId(item.id)}
      style={({ pressed }) => [
        styles.buildingCard, 
        { 
          backgroundColor: isDark ? colors.surface.dark : colors.surface.light, 
          borderColor: selectedBuildingId === item.id ? colors.primary.light : (isDark ? colors.border.dark : colors.border.light) 
        },
        pressed && styles.pressed
      ]}
    >
      <View style={styles.buildingHeader}>
        <Typography style={{ fontSize: 24 }}>🏢</Typography>
        <View style={styles.buildingInfo}>
          <Typography variant="h3">{item.name}</Typography>
          <Typography variant="caption">{item.unitsCount} {t("Property.unitsCount", { defaultValue: "Units" })}</Typography>
        </View>
      </View>
    </Pressable>
  );

  const renderUnit = ({ item }: { item: any }) => (
    <View style={[styles.unitCard, { backgroundColor: isDark ? colors.surface.dark : colors.surface.light, borderColor: isDark ? colors.border.dark : colors.border.light }]}>
      <View style={styles.unitHeader}>
        <Typography variant="h2">
          {item.unitNumber}
        </Typography>
        <View style={[styles.statusBadge, { backgroundColor: item.status === 'active' ? 'rgba(20, 184, 166, 0.1)' : 'rgba(245, 158, 11, 0.1)' }]}>
          <Typography variant="label" style={{ color: item.status === 'active' ? colors.success : colors.warning }}>
            {item.status}
          </Typography>
        </View>
      </View>
      <Typography variant="body" style={styles.unitDetail}>{item.propertyType} • {item.area} sqm</Typography>
      <Typography variant="caption">{item.residentName || t("Property.noResident", { defaultValue: "No Resident Assigned" })}</Typography>
    </View>
  );

  return (
    <ScreenContainer withKeyboard={false} style={styles.container} edges={['left', 'right', 'bottom']}>
      <View style={styles.header}>
        <Typography variant="h1">{t("Admin.units", "Units")}</Typography>
        <Typography variant="caption">{t("Admin.propertyDescription", "Manage property units and buildings")}</Typography>
      </View>

      <View style={styles.buildingsSection}>
        <Typography variant="h3" style={styles.sectionTitle}>{t("Property.buildings", "Buildings")}</Typography>
        {loadingBuildings ? (
          <ActivityIndicator color={colors.primary.light} style={{ padding: spacing.md }} />
        ) : (
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={buildings}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderBuilding}
            contentContainerStyle={styles.buildingList}
            ListEmptyComponent={<Typography variant="caption" style={styles.emptyText}>{t("Property.noBuildings", "No buildings found")}</Typography>}
          />
        )}
      </View>

      <View style={styles.unitsSection}>
        <Typography variant="h3" style={styles.sectionTitle}>
          {selectedBuildingId 
            ? `${t("Admin.units", "Units")} (${units.length})` 
            : t("Property.selectBuilding", "Select a building to view units")}
        </Typography>
        
        {selectedBuildingId && (
          <FlatList
            data={units}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderUnit}
            refreshing={loadingUnits}
            onRefresh={refetchUnits}
            ListEmptyComponent={
              <View style={styles.center}>
                <Typography variant="caption">
                  {loadingUnits ? t("Common.loading") : t("Property.empty")}
                </Typography>
              </View>
            }
            contentContainerStyle={styles.unitListContent}
          />
        )}
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 0,
  },
  header: {
    padding: spacing.lg,
    paddingBottom: 0,
  },
  buildingsSection: {
    paddingVertical: spacing.md,
  },
  sectionTitle: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    fontSize: 14,
    textTransform: 'uppercase',
    color: '#64748B',
    fontWeight: '700',
  },
  buildingList: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  buildingCard: {
    width: 160,
    padding: spacing.md,
    borderRadius: 16,
    borderWidth: 2,
  },
  buildingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  buildingInfo: {
    flex: 1,
  },
  pressed: {
    opacity: 0.8,
  },
  unitsSection: {
    flex: 1,
  },
  unitListContent: {
    padding: spacing.lg,
  },
  unitCard: {
    padding: spacing.lg,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  unitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  unitDetail: {
    color: '#64748B',
    marginTop: 2,
    marginBottom: 4,
  },
  emptyText: {
    paddingHorizontal: spacing.lg,
    fontStyle: 'italic',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xl,
  }
});
