import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, useColorScheme, Pressable, ActivityIndicator, Alert, TextInput, Switch } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../../../store/authSlice';
import {
  useCreateUnitMembershipMutation,
  useGetBuildingsQuery,
  useGetUnitQuery,
  useGetUnitsByBuildingQuery,
  useGetUnassignedUsersQuery,
  useUpdateUnitMembershipMutation,
} from '../../../services/admin';
import { colors, layout, spacing } from '../../../theme';
import { Typography } from '../../../components/ui/Typography';
import { ScreenContainer } from '../../../components/layout/ScreenContainer';
import { Icon } from '../../../components/ui/Icon';

export const AdminUnitsScreen = () => {
  const { t } = useTranslation();
  const isDark = useColorScheme() === 'dark';
  const user = useSelector(selectCurrentUser);
  
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [selectedMembershipId, setSelectedMembershipId] = useState<number | null>(null);
  const [profileForm, setProfileForm] = useState({
    residentName: '',
    residentPhone: '',
    phonePublic: false,
    residentEmail: '',
    emailPublic: false,
    hasVehicle: false,
    vehiclePlate: '',
    parkingSpotCode: '',
    garageStickerCode: '',
  });

  const { data: buildings = [], isLoading: loadingBuildings } = useGetBuildingsQuery(user?.compoundId || '', {
    skip: !user?.compoundId,
  });

  const { data: units = [], isLoading: loadingUnits, refetch: refetchUnits } = useGetUnitsByBuildingQuery(selectedBuildingId || '', {
    skip: !selectedBuildingId,
  });
  const { data: selectedUnitDetail, isLoading: loadingSelectedUnit, refetch: refetchSelectedUnit } = useGetUnitQuery(selectedUnitId || '', {
    skip: !selectedUnitId,
  });
  const { data: unassignedUsers = [], isLoading: loadingUnassigned, refetch: refetchUnassigned } = useGetUnassignedUsersQuery();
  const [createUnitMembership, { isLoading: assigning }] = useCreateUnitMembershipMutation();
  const [updateUnitMembership, { isLoading: savingProfile }] = useUpdateUnitMembershipMutation();

  const selectedUnit = units.find((unit) => String(unit.id) === selectedUnitId) ?? null;
  const memberships = selectedUnitDetail?.memberships ?? [];
  const selectedMembership = memberships.find((membership) => membership.id === selectedMembershipId) ?? memberships[0] ?? null;

  const handleSelectBuilding = (buildingId: string) => {
    setSelectedBuildingId(buildingId);
    setSelectedUnitId(null);
    setSelectedMembershipId(null);
  };

  const handleSelectUnit = (unitId: string) => {
    setSelectedUnitId(unitId);
    setSelectedMembershipId(null);
  };

  useEffect(() => {
    if (!selectedMembership) {
      setSelectedMembershipId(null);
      return;
    }

    if (selectedMembershipId === null) {
      setSelectedMembershipId(selectedMembership.id);
    }

    setProfileForm({
      residentName: selectedMembership.residentName ?? selectedMembership.user?.name ?? '',
      residentPhone: selectedMembership.residentPhone ?? selectedMembership.user?.phone ?? '',
      phonePublic: selectedMembership.phonePublic,
      residentEmail: selectedMembership.residentEmail ?? selectedMembership.user?.email ?? '',
      emailPublic: selectedMembership.emailPublic,
      hasVehicle: selectedMembership.hasVehicle,
      vehiclePlate: selectedMembership.vehiclePlate ?? '',
      parkingSpotCode: selectedMembership.parkingSpotCode ?? '',
      garageStickerCode: selectedMembership.garageStickerCode ?? '',
    });
  }, [selectedMembership?.id]);

  const handleAssign = async (residentUserId: number) => {
    if (!selectedUnitId) {
      Alert.alert(
        t("Admin.units", "Units"),
        t("Property.selectUnitFirst", { defaultValue: "Select a unit first before assigning a resident." }),
      );
      return;
    }

    try {
      await createUnitMembership({
        unitId: selectedUnitId,
        body: {
          userId: residentUserId,
          relationType: 'resident',
          isPrimary: true,
          startsAt: new Date().toISOString().slice(0, 10),
          verificationStatus: 'verified',
        },
      }).unwrap();

      await Promise.all([refetchUnits(), refetchSelectedUnit(), refetchUnassigned()]);
      Alert.alert(
        t("Common.success", { defaultValue: "Success" }),
        t("Property.assignmentSaved", { defaultValue: "Apartment assignment saved." }),
      );
    } catch {
      Alert.alert(
        t("Common.error", { defaultValue: "Error" }),
        t("Property.assignmentFailed", { defaultValue: "Could not assign the resident to this apartment." }),
      );
    }
  };

  const handleSaveMembershipProfile = async () => {
    if (!selectedMembershipId) {
      return;
    }

    try {
      await updateUnitMembership({
        membershipId: selectedMembershipId,
        body: profileForm,
      }).unwrap();

      await Promise.all([refetchSelectedUnit(), refetchUnits()]);
      Alert.alert(
        t("Common.success", { defaultValue: "Success" }),
        t("Property.profileSaved", { defaultValue: "Resident profile saved." }),
      );
    } catch {
      Alert.alert(
        t("Common.error", { defaultValue: "Error" }),
        t("Property.profileSaveFailed", { defaultValue: "Could not save this resident profile." }),
      );
    }
  };

  const renderBuilding = ({ item }: { item: any }) => (
    <Pressable 
      onPress={() => handleSelectBuilding(item.id)}
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
        <Icon name="building" color={colors.primary.light} size={24} />
        <View style={styles.buildingInfo}>
          <Typography variant="h3">{item.name}</Typography>
          <Typography variant="caption">{item.unitsCount} {t("Property.unitsCount", { defaultValue: "Units" })}</Typography>
        </View>
      </View>
    </Pressable>
  );

  const renderUnit = ({ item }: { item: any }) => (
    <Pressable
      onPress={() => handleSelectUnit(String(item.id))}
      style={[
        styles.unitCard,
        {
          backgroundColor: isDark ? colors.surface.dark : colors.surface.light,
          borderColor:
            selectedUnitId === String(item.id)
              ? colors.primary.light
              : (isDark ? colors.border.dark : colors.border.light),
        },
      ]}
    >
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
      <Typography variant="body" style={styles.unitDetail}>
        {item.type ?? t("Common.notAvailable", { defaultValue: "N/A" })} • {item.areaSqm ?? t("Common.notAvailable", { defaultValue: "N/A" })} sqm
      </Typography>
      <Typography variant="caption">{item.residentName || t("Property.noResident", { defaultValue: "No Resident Assigned" })}</Typography>
      {selectedUnitId === String(item.id) ? (
        <Typography variant="caption" style={styles.selectedHint}>
          {t("Property.assignmentTarget", { defaultValue: "Selected for next apartment assignment" })}
        </Typography>
      ) : null}
    </Pressable>
  );

  const renderUnassignedUser = ({ item }: { item: any }) => (
    <View style={[styles.unassignedCard, { backgroundColor: isDark ? colors.surface.dark : colors.surface.light, borderColor: isDark ? colors.border.dark : colors.border.light }]}>
      <View style={styles.unassignedInfo}>
        <Typography variant="label">{item.name}</Typography>
        <Typography variant="caption">{item.email}</Typography>
        <Typography variant="caption">{item.phone || t("Common.notAvailable", { defaultValue: "No phone" })}</Typography>
      </View>
      <Pressable
        disabled={!selectedUnitId || assigning}
        onPress={() => handleAssign(item.id)}
        style={[
          styles.assignButton,
          {
            backgroundColor: !selectedUnitId || assigning
              ? (isDark ? '#334155' : '#cbd5e1')
              : colors.primary.light,
          },
        ]}
      >
        <Typography variant="label" style={styles.assignButtonText}>
          {assigning ? t("Common.loading", { defaultValue: "Saving..." }) : t("Property.assignApartment", { defaultValue: "Assign" })}
        </Typography>
      </Pressable>
    </View>
  );

  const renderMembership = ({ item }: { item: any }) => (
    <Pressable
      onPress={() => setSelectedMembershipId(item.id)}
      style={[
        styles.membershipCard,
        {
          backgroundColor: isDark ? colors.surface.dark : colors.surface.light,
          borderColor:
            selectedMembershipId === item.id
              ? colors.primary.light
              : (isDark ? colors.border.dark : colors.border.light),
        },
      ]}
    >
      <Typography variant="label">{item.residentName || item.user?.name || `User ${item.userId}`}</Typography>
      <Typography variant="caption">{item.relationType} · {item.verificationStatus}</Typography>
      <Typography variant="caption">{item.residentPhone || item.user?.phone || t("Common.notAvailable", { defaultValue: "No phone" })}</Typography>
    </Pressable>
  );

  return (
    <ScreenContainer withKeyboard={false} scrollable style={styles.container}>
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
            scrollEnabled
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
            scrollEnabled={false}
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

      <View style={styles.assignmentSection}>
        <Typography variant="h3" style={styles.sectionTitle}>
          {t("Property.assignApartment", { defaultValue: "Assign Apartment" })}
        </Typography>
        <Typography variant="caption" style={styles.assignmentCopy}>
          {selectedUnit
            ? t("Property.selectedUnitSummary", {
                defaultValue: "Selected unit: {{unit}}",
                unit: `${selectedUnit.unitNumber}`,
              })
            : t("Property.selectUnitFirst", { defaultValue: "Select a unit above, then assign one of the unassigned residents below." })}
        </Typography>
        {loadingUnassigned ? (
          <ActivityIndicator color={colors.primary.light} style={{ padding: spacing.md }} />
        ) : (
          <FlatList
            data={unassignedUsers}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderUnassignedUser}
            ListEmptyComponent={
              <Typography variant="caption" style={styles.emptyText}>
                {t("Property.noUnassignedUsers", { defaultValue: "No unassigned users right now." })}
              </Typography>
            }
            contentContainerStyle={styles.unassignedList}
            scrollEnabled={false}
          />
        )}
      </View>

      <View style={styles.assignmentSection}>
        <Typography variant="h3" style={styles.sectionTitle}>
          {t("Property.residentProfiles", { defaultValue: "Resident Profiles" })}
        </Typography>
        {!selectedUnitId ? (
          <Typography variant="caption" style={styles.assignmentCopy}>
            {t("Property.selectUnitToEditProfile", { defaultValue: "Select a unit first to edit resident details and vehicle information." })}
          </Typography>
        ) : loadingSelectedUnit ? (
          <ActivityIndicator color={colors.primary.light} style={{ padding: spacing.md }} />
        ) : memberships.length === 0 ? (
          <Typography variant="caption" style={styles.assignmentCopy}>
            {t("Property.noLinkedUsers", { defaultValue: "No linked residents for this unit yet." })}
          </Typography>
        ) : (
          <>
            <FlatList
              data={memberships}
              keyExtractor={(item) => String(item.id)}
              renderItem={renderMembership}
              contentContainerStyle={styles.unassignedList}
              scrollEnabled={false}
            />
            {selectedMembership ? (
              <View style={[styles.profileEditor, { backgroundColor: isDark ? colors.surface.dark : colors.surface.light, borderColor: isDark ? colors.border.dark : colors.border.light }]}>
                <Typography variant="label" style={styles.editorTitle}>
                  {t("Property.editResidentProfile", { defaultValue: "Edit resident profile" })}
                </Typography>
                <TextInput
                  style={[styles.input, { backgroundColor: isDark ? colors.background.dark : colors.background.light, borderColor: isDark ? colors.border.dark : colors.border.light, color: isDark ? colors.text.primary.dark : colors.text.primary.light }]}
                  placeholder={t("Property.residentName", { defaultValue: "Resident name" })}
                  placeholderTextColor="#94a3b8"
                  value={profileForm.residentName}
                  onChangeText={(residentName) => setProfileForm((current) => ({ ...current, residentName }))}
                />
                <TextInput
                  style={[styles.input, { backgroundColor: isDark ? colors.background.dark : colors.background.light, borderColor: isDark ? colors.border.dark : colors.border.light, color: isDark ? colors.text.primary.dark : colors.text.primary.light }]}
                  placeholder={t("Property.residentPhone", { defaultValue: "Resident phone" })}
                  placeholderTextColor="#94a3b8"
                  value={profileForm.residentPhone}
                  onChangeText={(residentPhone) => setProfileForm((current) => ({ ...current, residentPhone }))}
                />
                <View style={styles.switchRow}>
                  <Typography variant="caption">{t("Property.phonePublic", { defaultValue: "Show phone publicly" })}</Typography>
                  <Switch value={profileForm.phonePublic} onValueChange={(phonePublic) => setProfileForm((current) => ({ ...current, phonePublic }))} />
                </View>
                <TextInput
                  style={[styles.input, { backgroundColor: isDark ? colors.background.dark : colors.background.light, borderColor: isDark ? colors.border.dark : colors.border.light, color: isDark ? colors.text.primary.dark : colors.text.primary.light }]}
                  placeholder={t("Property.residentEmail", { defaultValue: "Resident email" })}
                  placeholderTextColor="#94a3b8"
                  value={profileForm.residentEmail}
                  onChangeText={(residentEmail) => setProfileForm((current) => ({ ...current, residentEmail }))}
                />
                <View style={styles.switchRow}>
                  <Typography variant="caption">{t("Property.emailPublic", { defaultValue: "Show email publicly" })}</Typography>
                  <Switch value={profileForm.emailPublic} onValueChange={(emailPublic) => setProfileForm((current) => ({ ...current, emailPublic }))} />
                </View>
                <View style={styles.switchRow}>
                  <Typography variant="caption">{t("Property.hasVehicle", { defaultValue: "Has vehicle" })}</Typography>
                  <Switch value={profileForm.hasVehicle} onValueChange={(hasVehicle) => setProfileForm((current) => ({ ...current, hasVehicle }))} />
                </View>
                <TextInput
                  style={[styles.input, { backgroundColor: isDark ? colors.background.dark : colors.background.light, borderColor: isDark ? colors.border.dark : colors.border.light, color: isDark ? colors.text.primary.dark : colors.text.primary.light }]}
                  placeholder={t("Property.vehiclePlate", { defaultValue: "Vehicle plate" })}
                  placeholderTextColor="#94a3b8"
                  value={profileForm.vehiclePlate}
                  onChangeText={(vehiclePlate) => setProfileForm((current) => ({ ...current, vehiclePlate }))}
                />
                <TextInput
                  style={[styles.input, { backgroundColor: isDark ? colors.background.dark : colors.background.light, borderColor: isDark ? colors.border.dark : colors.border.light, color: isDark ? colors.text.primary.dark : colors.text.primary.light }]}
                  placeholder={t("Property.parkingSpotCode", { defaultValue: "Parking spot code" })}
                  placeholderTextColor="#94a3b8"
                  value={profileForm.parkingSpotCode}
                  onChangeText={(parkingSpotCode) => setProfileForm((current) => ({ ...current, parkingSpotCode }))}
                />
                <TextInput
                  style={[styles.input, { backgroundColor: isDark ? colors.background.dark : colors.background.light, borderColor: isDark ? colors.border.dark : colors.border.light, color: isDark ? colors.text.primary.dark : colors.text.primary.light }]}
                  placeholder={t("Property.garageStickerCode", { defaultValue: "Garage sticker code" })}
                  placeholderTextColor="#94a3b8"
                  value={profileForm.garageStickerCode}
                  onChangeText={(garageStickerCode) => setProfileForm((current) => ({ ...current, garageStickerCode }))}
                />
                <Pressable
                  disabled={savingProfile}
                  onPress={handleSaveMembershipProfile}
                  style={[styles.assignButton, { backgroundColor: savingProfile ? '#94a3b8' : colors.primary.light }]}
                >
                  <Typography variant="label" style={styles.assignButtonText}>
                    {savingProfile ? t("Common.loading", { defaultValue: "Saving..." }) : t("Common.save", { defaultValue: "Save" })}
                  </Typography>
                </Pressable>
              </View>
            ) : null}
          </>
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
    padding: layout.screenGutter,
    paddingBottom: 0,
  },
  buildingsSection: {
    paddingVertical: spacing.md,
  },
  sectionTitle: {
    paddingHorizontal: layout.screenGutter,
    marginBottom: spacing.sm,
    fontSize: 14,
    textTransform: 'uppercase',
    color: colors.text.secondary.light,
    fontWeight: '700',
  },
  buildingList: {
    paddingHorizontal: layout.screenGutter,
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
    marginBottom: spacing.md,
  },
  unitListContent: {
    padding: layout.screenGutter,
  },
  unitCard: {
    padding: layout.cardPadding,
    borderRadius: 16,
    borderWidth: 2,
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
    color: colors.text.secondary.light,
    marginTop: 2,
    marginBottom: 4,
  },
  selectedHint: {
    marginTop: spacing.sm,
    color: colors.primary.light,
    fontWeight: '600',
  },
  emptyText: {
    paddingHorizontal: layout.screenGutter,
    fontStyle: 'italic',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  assignmentSection: {
    paddingHorizontal: layout.screenGutter,
    paddingBottom: layout.screenBottom,
    gap: spacing.sm,
  },
  assignmentCopy: {
    color: colors.text.secondary.light,
    marginBottom: spacing.sm,
  },
  unassignedList: {
    gap: spacing.sm,
  },
  unassignedCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  unassignedInfo: {
    flex: 1,
    gap: 2,
  },
  assignButton: {
    minWidth: 84,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  assignButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  membershipCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: spacing.md,
    gap: 4,
    marginBottom: spacing.sm,
  },
  profileEditor: {
    borderWidth: 1,
    borderRadius: 16,
    padding: spacing.md,
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  editorTitle: {
    marginBottom: spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
