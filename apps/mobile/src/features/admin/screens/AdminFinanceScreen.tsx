import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, useColorScheme, Pressable, ActivityIndicator, Alert, TextInput } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { 
  useApplyCollectionCampaignChargesMutation,
  useArchiveCollectionCampaignMutation,
  useCreateCollectionCampaignMutation,
  useGetBuildingsQuery,
  useGetCollectionCampaignsQuery,
  useGetFinancePaymentSubmissionsQuery, 
  useLazyGetFloorsByBuildingQuery,
  usePublishCollectionCampaignMutation,
  useApprovePaymentMutation, 
  useRejectPaymentMutation 
} from '../../../services/admin';
import { colors, layout, radii, shadows, spacing } from '../../../theme';
import { Typography } from '../../../components/ui/Typography';
import { ScreenContainer } from '../../../components/layout/ScreenContainer';
import { Button } from '../../../components/ui/Button';
import { formatDate } from '../../../utils/formatters';
import { isRtlLanguage, rowDirectionStyle, textDirectionStyle } from '../../../i18n/direction';
import { selectCurrentUser } from '../../../store/authSlice';

const FINANCE_FILTERS = ["submitted", "under_review", "approved", "rejected"] as const;
const CONTRIBUTION_TARGETS = ["compound", "building", "floor"] as const;

function unitLabel(account: any): string {
  const unit = account?.unit ?? account?.unitAccount?.unit;
  if (!unit) return "Unknown apartment";

  return [unit.unitNumber, unit.building?.name, unit.floor?.label, unit.residentName].filter(Boolean).join(" · ");
}

function campaignAudienceLabel(
  campaign: any,
  buildings: any[],
  labels: { compound: string; selectedBuildings: string; selectedFloors: string },
): string {
  if (!campaign?.targetType || campaign.targetType === "compound") {
    return labels.compound;
  }

  const targetIds = campaign.targetIds ?? [];

  if (campaign.targetType === "building") {
    const names = buildings.filter((building: any) => targetIds.includes(building.id)).map((building: any) => building.name);
    return names.length > 0 ? names.join(", ") : labels.selectedBuildings;
  }

  const floors = buildings.flatMap((building: any) =>
    ((building.floors ?? []) as any[])
      .filter((floor: any) => targetIds.includes(floor.id))
      .map((floor: any) => `${building.name} · ${floor.label}`),
  );

  return floors.length > 0 ? floors.join(", ") : labels.selectedFloors;
}

export const AdminFinanceScreen = () => {
  const { t, i18n } = useTranslation();
  const user = useSelector(selectCurrentUser);
  const isDark = useColorScheme() === 'dark';
  const isRtl = isRtlLanguage(i18n.language);
  
  const [filter, setFilter] = useState<string>("submitted");
  const [accountQuery, setAccountQuery] = useState("");
  const [targetType, setTargetType] = useState<(typeof CONTRIBUTION_TARGETS)[number]>("compound");
  const [selectedTargetIds, setSelectedTargetIds] = useState<string[]>([]);
  const [floorsByBuilding, setFloorsByBuilding] = useState<Record<string, any[]>>({});
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const { data: submissions = [], isLoading, refetch } = useGetFinancePaymentSubmissionsQuery(filter);
  const { data: campaigns = [], refetch: refetchCampaigns } = useGetCollectionCampaignsQuery();
  const { data: buildings = [], isLoading: isLoadingBuildings } = useGetBuildingsQuery(user?.compoundId || "", {
    skip: !user?.compoundId,
  });
  const [loadFloors] = useLazyGetFloorsByBuildingQuery();
  
  const [createCampaign, { isLoading: isCreatingCampaign }] = useCreateCollectionCampaignMutation();
  const [publishCampaign, { isLoading: isPublishingCampaign }] = usePublishCollectionCampaignMutation();
  const [archiveCampaign, { isLoading: isArchivingCampaign }] = useArchiveCollectionCampaignMutation();
  const [applyCampaignCharges, { isLoading: isApplyingCampaign }] = useApplyCollectionCampaignChargesMutation();
  const [approvePayment, { isLoading: isApproving }] = useApprovePaymentMutation();
  const [rejectPayment, { isLoading: isRejecting }] = useRejectPaymentMutation();
  const surfaceColor = isDark ? colors.surface.dark : colors.surface.light;
  const borderColor = isDark ? colors.border.dark : colors.border.light;
  const secondaryText = isDark ? colors.text.secondary.dark : colors.text.secondary.light;
  const isCreatingContribution = isCreatingCampaign || isPublishingCampaign || isApplyingCampaign;
  useEffect(() => {
    let cancelled = false;

    const hydrateFloors = async () => {
      const entries = await Promise.all(
        buildings.map(async (building: any) => {
          try {
            const floors = await loadFloors(building.id).unwrap();
            return [building.id, floors] as const;
          } catch {
            return [building.id, []] as const;
          }
        }),
      );

      if (!cancelled) {
        setFloorsByBuilding(Object.fromEntries(entries));
      }
    };

    if (buildings.length > 0) {
      hydrateFloors();
    } else {
      setFloorsByBuilding({});
    }

    return () => {
      cancelled = true;
    };
  }, [buildings, loadFloors]);

  const buildingOptions = buildings;
  const buildingsWithFloors = buildings.map((building: any) => ({
    ...building,
    floors: floorsByBuilding[building.id] ?? [],
  }));
  const floorOptions = buildingsWithFloors.flatMap((building: any) =>
    building.floors.map((floor: any) => ({
      ...floor,
      buildingName: building.name,
    })),
  );
  const audienceOptions = (targetType === "building" ? buildingOptions : floorOptions)
    .filter((item: any) => {
      if (!accountQuery.trim()) return true;
      return `${item.name ?? ""} ${item.label ?? ""} ${item.buildingName ?? ""}`.toLowerCase().includes(accountQuery.trim().toLowerCase());
    });

  const handleCreateContribution = async () => {
    const parsedAmount = Number(amount);

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0 || !description.trim()) {
      Alert.alert(
        t("Common.error"),
        t("Finance.contributionMissing", "Choose the audience, amount, and description."),
      );
      return;
    }

    if (targetType !== "compound" && selectedTargetIds.length === 0) {
      Alert.alert(t("Common.error"), t("Finance.contributionAudienceMissing", "Choose at least one building or floor."));
      return;
    }

    try {
      const campaign = await createCampaign({
        name: description.trim(),
        description: description.trim(),
        targetAmount: parsedAmount,
        targetType,
        targetIds: selectedTargetIds,
        currency: "EGP",
      }).unwrap();
      const activeCampaign = await publishCampaign(campaign.id).unwrap();
      await applyCampaignCharges({
        campaignId: activeCampaign.id,
        amount: parsedAmount,
        description: description.trim(),
      }).unwrap();
      setAmount("");
      setDescription("");
      setSelectedTargetIds([]);
      setTargetType("compound");
      refetchCampaigns();
      Alert.alert(t("Common.success"), t("Finance.contributionCreated", "Contribution request posted."));
    } catch {
      Alert.alert(t("Common.error"), t("Finance.contributionError", "Could not post contribution request."));
    }
  };

  const handleArchiveCampaign = (campaignId: string) => {
    Alert.alert(
      t("Finance.archiveCampaign", "Archive contribution"),
      t("Finance.archiveCampaignConfirm", "Future apartments will no longer inherit this contribution. Existing balances stay unchanged."),
      [
        { text: t("Common.cancel"), style: "cancel" },
        {
          text: t("Finance.archive", "Archive"),
          style: "destructive",
          onPress: async () => {
            try {
              await archiveCampaign(campaignId).unwrap();
              refetchCampaigns();
              Alert.alert(t("Common.success"), t("Finance.campaignArchived", "Contribution campaign archived."));
            } catch {
              Alert.alert(t("Common.error"), t("Finance.campaignArchiveError", "Could not archive contribution campaign."));
            }
          },
        },
      ],
    );
  };

  const handleApprove = (id: string) => {
    Alert.alert(
      t("Admin.approvePaymentTitle", "Approve Payment"),
      t("Admin.approvePaymentConfirm", "Are you sure you want to approve this payment?"),
      [
        { text: t("Common.cancel"), style: "cancel" },
        { 
          text: t("Common.approve"), 
          onPress: async () => {
            try {
              await approvePayment({ id }).unwrap();
              Alert.alert(t("Common.success"), t("Admin.paymentApproved", "Payment has been approved."));
            } catch (err) {
              Alert.alert(t("Common.error"), t("Admin.approveError", "Failed to approve payment."));
            }
          } 
        }
      ]
    );
  };

  const handleReject = (id: string) => {
    Alert.prompt(
      t("Admin.rejectPaymentTitle", "Reject Payment"),
      t("Admin.rejectPaymentReason", "Please enter the reason for rejection:"),
      [
        { text: t("Common.cancel"), style: "cancel" },
        { 
          text: t("Common.reject"), 
          onPress: async (reason: string | undefined) => {
            if (!reason) return;
            try {
              await rejectPayment({ id, reason }).unwrap();
              Alert.alert(t("Common.success"), t("Admin.paymentRejected", "Payment has been rejected."));
            } catch (err) {
              Alert.alert(t("Common.error"), t("Admin.rejectError", "Failed to reject payment."));
            }
          },
          style: "destructive"
        }
      ]
    );
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={[styles.card, { backgroundColor: isDark ? colors.surface.dark : colors.surface.light, borderColor: isDark ? colors.border.dark : colors.border.light }, textDirectionStyle(isRtl)]}>
      <View style={[styles.cardHeader, rowDirectionStyle(isRtl)]}>
        <View style={textDirectionStyle(isRtl)}>
          <Typography variant="h3" style={textDirectionStyle(isRtl)}>{unitLabel(item)}</Typography>
          <Typography variant="caption" style={textDirectionStyle(isRtl)}>{item.submitter?.name}</Typography>
        </View>
        <Typography variant="h2" style={[{ color: colors.primary.light }, textDirectionStyle(isRtl)]}>
          {item.amount} {item.currency}
        </Typography>
      </View>
      
      <View style={[styles.cardBody, textDirectionStyle(isRtl)]}>
        <View style={[styles.infoRow, rowDirectionStyle(isRtl)]}>
          <Typography variant="label" style={textDirectionStyle(isRtl)}>{t("Finance.method")}:</Typography>
          <Typography variant="body" style={[styles.infoValue, textDirectionStyle(isRtl)]}>{t(`Finance.methods.${item.method}`)}</Typography>
        </View>
        <View style={[styles.infoRow, rowDirectionStyle(isRtl)]}>
          <Typography variant="label" style={textDirectionStyle(isRtl)}>{t("Finance.reference")}:</Typography>
          <Typography variant="body" style={[styles.infoValue, textDirectionStyle(isRtl)]}>{item.reference || "-"}</Typography>
        </View>
        <View style={[styles.infoRow, rowDirectionStyle(isRtl)]}>
          <Typography variant="label" style={textDirectionStyle(isRtl)}>{t("Common.date")}:</Typography>
          <Typography variant="body" style={[styles.infoValue, textDirectionStyle(isRtl)]}>{formatDate(item.createdAt, isRtl ? 'ar-EG' : 'en-US')}</Typography>
        </View>
      </View>

      {(item.status === 'submitted' || item.status === 'under_review') && (
        <View style={[styles.actions, rowDirectionStyle(isRtl)]}>
          <Button 
            title={t("Common.reject")} 
            variant="outline" 
            onPress={() => handleReject(item.id)} 
            loading={isRejecting}
            style={styles.actionButton}
            textStyle={{ color: colors.error }}
          />
          <Button 
            title={t("Common.approve")} 
            onPress={() => handleApprove(item.id)} 
            loading={isApproving}
            style={styles.actionButton}
          />
        </View>
      )}
      
      {item.status !== 'submitted' && item.status !== 'under_review' && (
        <View style={[styles.statusBadge, { backgroundColor: item.status === 'approved' ? 'rgba(20, 184, 166, 0.1)' : 'rgba(239, 68, 68, 0.1)', alignSelf: isRtl ? 'flex-end' : 'flex-start' }]}>
          <Typography variant="label" style={[{ color: item.status === 'approved' ? colors.success : colors.error, textTransform: 'uppercase' }, textDirectionStyle(isRtl)]}>
            {t(`Common.statuses.${item.status}`)}
          </Typography>
        </View>
      )}
    </View>
  );
  const toggleTarget = (id: string) => {
    setSelectedTargetIds((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
  };

  const renderTargetOption = ({ item }: { item: any }) => {
    const isSelected = selectedTargetIds.includes(item.id);

    return (
      <Pressable
        onPress={() => toggleTarget(item.id)}
        style={[
          styles.accountChip,
          {
            backgroundColor: isSelected ? colors.primary.light : surfaceColor,
            borderColor: isSelected ? colors.primary.light : borderColor,
          },
        ]}
      >
        <Typography
          variant="label"
          numberOfLines={1}
          style={[{ color: isSelected ? colors.text.inverse : (isDark ? colors.text.primary.dark : colors.text.primary.light) }, textDirectionStyle(isRtl)]}
        >
          {item.name ?? `${item.buildingName} · ${item.label}`}
        </Typography>
        <Typography
          variant="caption"
          style={[{ color: isSelected ? colors.text.inverse : secondaryText }, textDirectionStyle(isRtl)]}
        >
          {isSelected ? t("Finance.selected", "Selected") : t("Finance.tapToInclude")}
        </Typography>
      </Pressable>
    );
  };
  const renderTargetType = ({ item }: { item: (typeof CONTRIBUTION_TARGETS)[number] }) => (
    <Pressable
      onPress={() => {
        setTargetType(item);
        setSelectedTargetIds([]);
      }}
      style={[
        styles.targetTypeCard,
        {
          backgroundColor: targetType === item ? colors.primary.light : surfaceColor,
          borderColor: targetType === item ? colors.primary.light : borderColor,
        },
      ]}
    >
      <Typography
        variant="label"
        style={[{ color: targetType === item ? colors.text.inverse : (isDark ? colors.text.primary.dark : colors.text.primary.light) }, textDirectionStyle(isRtl)]}
      >
        {t(`Finance.audience.${item}`, item)}
      </Typography>
      <Typography
        variant="caption"
        style={[{ color: targetType === item ? colors.text.inverse : secondaryText }, textDirectionStyle(isRtl)]}
      >
        {t(`Finance.audience.${item}Help`, "")}
      </Typography>
    </Pressable>
  );
  const renderCampaign = ({ item }: { item: any }) => (
    <View style={[styles.campaignCard, { backgroundColor: isDark ? colors.background.dark : colors.background.light, borderColor }, textDirectionStyle(isRtl)]}>
      <View style={[styles.cardHeader, rowDirectionStyle(isRtl)]}>
        <View style={[styles.campaignText, textDirectionStyle(isRtl)]}>
          <Typography variant="label" style={[{ color: colors.primary.light }, textDirectionStyle(isRtl)]}>
            {String(t(`Finance.campaignStatuses.${item.status}`, item.status))}
          </Typography>
          <Typography variant="h3" numberOfLines={2} style={textDirectionStyle(isRtl)}>{item.name}</Typography>
          <Typography variant="caption" numberOfLines={2} style={[{ color: secondaryText }, textDirectionStyle(isRtl)]}>
            {campaignAudienceLabel(item, buildingsWithFloors, {
              compound: String(t("Finance.audience.compound")),
              selectedBuildings: String(t("Finance.audience.building")),
              selectedFloors: String(t("Finance.audience.floor")),
            })}
          </Typography>
        </View>
        <Typography variant="h3" style={[{ color: colors.primary.light }, textDirectionStyle(isRtl)]}>
          {item.targetAmount ?? "-"} {item.currency ?? "EGP"}
        </Typography>
      </View>
      {item.status === "active" ? (
        <Button
          title={t("Finance.archive", "Archive")}
          variant="outline"
          onPress={() => handleArchiveCampaign(item.id)}
          loading={isArchivingCampaign}
          style={styles.archiveButton}
        />
      ) : null}
    </View>
  );
  const renderFilter = ({ item: f }: { item: (typeof FINANCE_FILTERS)[number] }) => (
    <Pressable
      onPress={() => setFilter(f)}
      style={[
        styles.filterChip,
        { backgroundColor: filter === f ? colors.primary.light : (isDark ? colors.background.dark : "#f3f4f6") }
      ]}
    >
      <Typography
        variant="label"
        style={[{
          color: filter === f ? colors.text.inverse : (isDark ? colors.text.secondary.dark : colors.text.secondary.light),
          textTransform: 'capitalize',
        }, textDirectionStyle(isRtl)]}
      >
        {t(`Common.statuses.${f}`, f.replace(/_/g, " "))}
      </Typography>
    </Pressable>
  );

  return (
    <ScreenContainer withKeyboard={false} style={styles.container}>
      <FlatList
        data={submissions}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        refreshing={isLoading}
        onRefresh={refetch}
        ListHeaderComponent={
          <>
            <View style={[styles.header, { backgroundColor: surfaceColor, borderColor }, textDirectionStyle(isRtl)]}>
              <Typography variant="label" style={[styles.eyebrow, textDirectionStyle(isRtl)]}>
                {t("Finance.label")}
              </Typography>
              <Typography variant="h1" style={textDirectionStyle(isRtl)}>{t("Finance.label")}</Typography>
              <Typography variant="body" style={[styles.headerSubtitle, { color: secondaryText }, textDirectionStyle(isRtl)]}>{t("Admin.financeDescription")}</Typography>
            </View>

            <View style={[styles.contributionCard, { backgroundColor: surfaceColor, borderColor }, textDirectionStyle(isRtl)]}>
              <Typography variant="h3" style={textDirectionStyle(isRtl)}>
                {t("Finance.requestContribution", "Request contribution")}
              </Typography>
              <Typography variant="body" style={[styles.headerSubtitle, { color: secondaryText }, textDirectionStyle(isRtl)]}>
          {t("Finance.requestContributionHint", "Charge the compound, selected buildings, or selected floors. Future apartments in the same active campaign scope will receive the same contribution.")}
        </Typography>
        <FlatList
          data={CONTRIBUTION_TARGETS}
          keyExtractor={(item) => item}
          renderItem={renderTargetType}
          horizontal
          inverted={isRtl}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.targetTypeList, rowDirectionStyle(isRtl)]}
        />
        <TextInput
          value={accountQuery}
          onChangeText={setAccountQuery}
          editable={targetType !== "compound"}
          placeholder={targetType === "compound" ? t("Finance.allApartments", "All apartments in this compound") : t("Finance.searchApartment", "Search building or floor")}
          placeholderTextColor={secondaryText}
          style={[styles.input, { backgroundColor: isDark ? colors.background.dark : colors.background.light, borderColor, color: isDark ? colors.text.primary.dark : colors.text.primary.light }, textDirectionStyle(isRtl)]}
        />
        {targetType !== "compound" && isLoadingBuildings ? (
          <ActivityIndicator color={colors.primary.light} />
        ) : targetType !== "compound" ? (
          <FlatList
            data={audienceOptions}
            keyExtractor={(item) => item.id}
            renderItem={renderTargetOption}
            horizontal
            inverted={isRtl}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[styles.accountList, rowDirectionStyle(isRtl)]}
          />
        ) : null}
              <View style={[styles.formRow, rowDirectionStyle(isRtl)]}>
                <TextInput
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="decimal-pad"
                  placeholder={t("Finance.amount")}
                  placeholderTextColor={secondaryText}
                  style={[styles.input, styles.formInput, { backgroundColor: isDark ? colors.background.dark : colors.background.light, borderColor, color: isDark ? colors.text.primary.dark : colors.text.primary.light }, textDirectionStyle(isRtl)]}
                />
                <TextInput
                  value={description}
                  onChangeText={setDescription}
                  placeholder={t("Finance.description", "Description")}
                  placeholderTextColor={secondaryText}
                  style={[styles.input, styles.formInput, { backgroundColor: isDark ? colors.background.dark : colors.background.light, borderColor, color: isDark ? colors.text.primary.dark : colors.text.primary.light }, textDirectionStyle(isRtl)]}
                />
              </View>
              <Button
                title={t("Finance.requestContribution", "Request contribution")}
                onPress={handleCreateContribution}
                loading={isCreatingContribution}
              />
            </View>

            <View style={[styles.contributionCard, { backgroundColor: surfaceColor, borderColor }, textDirectionStyle(isRtl)]}>
              <Typography variant="h3" style={textDirectionStyle(isRtl)}>
                {t("Finance.campaigns", "Contribution campaigns")}
              </Typography>
              <Typography variant="body" style={[styles.headerSubtitle, { color: secondaryText }, textDirectionStyle(isRtl)]}>
                {t("Finance.campaignsHint", "Active campaigns keep charging future apartments in the selected scope. Archive a campaign to stop future inheritance.")}
              </Typography>
              <FlatList
                data={campaigns.slice(0, 8)}
                keyExtractor={(item) => item.id}
                renderItem={renderCampaign}
                scrollEnabled={false}
                ItemSeparatorComponent={() => <View style={styles.campaignSeparator} />}
                ListEmptyComponent={
                  <Typography variant="body" style={[styles.emptyText, { color: secondaryText }, textDirectionStyle(isRtl)]}>
                    {t("Finance.noCampaigns", "No contribution campaigns yet.")}
                  </Typography>
                }
              />
            </View>

            <FlatList
              data={FINANCE_FILTERS}
              keyExtractor={(f) => f}
              renderItem={renderFilter}
              horizontal
              inverted={isRtl}
              scrollEnabled={false}
              contentContainerStyle={[styles.filterRow, rowDirectionStyle(isRtl)]}
            />
          </>
        }
        ListEmptyComponent={
          <View style={[styles.emptyCard, { backgroundColor: surfaceColor, borderColor }, textDirectionStyle(isRtl)]}>
            {isLoading ? (
              <ActivityIndicator color={colors.primary.light} />
            ) : (
              <>
                <Typography variant="h3" style={textDirectionStyle(isRtl)}>
                  {t("Finance.noSubmissions", "No payment submissions found")}
                </Typography>
                <Typography variant="body" style={[styles.emptyText, { color: secondaryText }, textDirectionStyle(isRtl)]}>
                  {t("Admin.financeDescription")}
                </Typography>
              </>
            )}
          </View>
        }
        contentContainerStyle={styles.listContent}
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 0,
  },
  header: {
    borderRadius: radii.xl,
    borderWidth: 1,
    margin: layout.screenGutter,
    marginBottom: layout.cardGap,
    padding: layout.heroPadding,
    ...shadows.sm,
  },
  eyebrow: {
    color: colors.primary.light,
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    marginTop: spacing.xs,
    lineHeight: 24,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: layout.screenGutter,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    minHeight: 44,
    justifyContent: 'center',
  },
  listContent: {
    padding: layout.screenGutter,
    paddingTop: 0,
  },
  contributionCard: {
    borderRadius: radii.xl,
    borderWidth: 1,
    marginHorizontal: layout.screenGutter,
    marginBottom: layout.cardGap,
    padding: layout.cardPadding,
    ...shadows.sm,
  },
  input: {
    minHeight: 48,
    borderRadius: radii.lg,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    marginTop: spacing.md,
    fontSize: 15,
    fontWeight: '600',
  },
  targetTypeList: {
    gap: spacing.sm,
    paddingTop: spacing.md,
  },
  targetTypeCard: {
    width: 132,
    minHeight: 88,
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.md,
    justifyContent: 'center',
  },
  accountList: {
    gap: spacing.sm,
    paddingTop: spacing.md,
    paddingEnd: spacing.md,
  },
  accountChip: {
    width: 184,
    minHeight: 72,
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.md,
    justifyContent: 'center',
  },
  campaignCard: {
    borderRadius: radii.lg,
    borderWidth: 1,
    marginTop: spacing.md,
    padding: spacing.md,
  },
  campaignText: {
    flex: 1,
    paddingEnd: spacing.md,
  },
  campaignSeparator: {
    height: spacing.xs,
  },
  archiveButton: {
    minHeight: 42,
  },
  formRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  formInput: {
    flex: 1,
  },
  card: {
    padding: layout.cardPadding,
    borderRadius: radii.xl,
    borderWidth: 1,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  cardBody: {
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoValue: {
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  actionButton: {
    flex: 1,
    height: 44,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  emptyCard: {
    alignItems: 'center',
    borderRadius: radii.xl,
    borderWidth: 1,
    padding: layout.heroPadding,
    ...shadows.sm,
  },
  emptyText: {
    marginTop: spacing.xs,
    textAlign: 'center',
  }
});
