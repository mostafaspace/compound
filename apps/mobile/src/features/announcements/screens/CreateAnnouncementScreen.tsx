import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, TextInput, ScrollView, Switch, Alert, TouchableOpacity, ActivityIndicator, FlatList } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import Ionicons from 'react-native-vector-icons/Ionicons';

import { ScreenContainer } from '../../../components/layout/ScreenContainer';
import { Typography } from '../../../components/ui/Typography';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { colors, layout, spacing, radii } from '../../../theme';
import { useCreateAnnouncementMutation, usePreviewAnnouncementRecipientsMutation } from '../../../services/property';
import { useGetBuildingsQuery, useLazyGetFloorsByBuildingQuery } from '../../../services/admin';
import { selectCurrentUser } from '../../../store/authSlice';

const ANNOUNCEMENT_CATEGORIES = [
  'general',
  'building',
  'association_decision',
  'security_alert',
  'maintenance_notice',
  'meeting_reminder',
] as const;

type TargetType = 'compound' | 'building' | 'floor';

export const CreateAnnouncementScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const user = useSelector(selectCurrentUser);
  const [createAnnouncement, { isLoading: isCreating }] = useCreateAnnouncementMutation();
  const [previewRecipients, { data: previewData, isLoading: isPreviewing }] = usePreviewAnnouncementRecipientsMutation();
  const [loadFloors] = useLazyGetFloorsByBuildingQuery();

  const { data: buildings = [], isLoading: isLoadingBuildings } = useGetBuildingsQuery(user?.compoundId || '', {
    skip: !user?.compoundId,
  });

  const [titleEn, setTitleEn] = useState('');
  const [titleAr, setTitleAr] = useState('');
  const [bodyEn, setBodyEn] = useState('');
  const [bodyAr, setBodyAr] = useState('');
  const [category, setCategory] = useState<(typeof ANNOUNCEMENT_CATEGORIES)[number]>('general');
  const [mustAcknowledge, setMustAcknowledge] = useState(false);
  const [targetType, setTargetType] = useState<TargetType>('compound');
  const [selectedBuildings, setSelectedBuildings] = useState<string[]>([]);
  const [selectedFloors, setSelectedFloors] = useState<string[]>([]);
  const [floorsByBuilding, setFloorsByBuilding] = useState<Record<string, any[]>>({});
  const [targetSearch, setTargetSearch] = useState('');

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
    }

    return () => {
      cancelled = true;
    };
  }, [buildings, loadFloors]);

  const targetIds = useMemo(() => {
    if (targetType === 'compound') return user?.compoundId ? [user.compoundId] : [];
    if (targetType === 'building') return selectedBuildings;
    return selectedFloors;
  }, [selectedBuildings, selectedFloors, targetType, user?.compoundId]);
  const normalizedTargetSearch = targetSearch.trim().toLowerCase();
  const visibleBuildings = useMemo(() => {
    if (!normalizedTargetSearch) return buildings;

    return buildings.filter((building: any) => String(building.name).toLowerCase().includes(normalizedTargetSearch));
  }, [buildings, normalizedTargetSearch]);
  const visibleFloorGroups = useMemo(() => {
    return buildings
      .map((building: any) => {
        const floors = floorsByBuilding[building.id] ?? [];
        if (!normalizedTargetSearch) return { building, floors };

        const buildingMatches = String(building.name).toLowerCase().includes(normalizedTargetSearch);
        return {
          building,
          floors: buildingMatches
            ? floors
            : floors.filter((floor: any) => String(floor.label).toLowerCase().includes(normalizedTargetSearch)),
        };
      })
      .filter((group: { floors: any[] }) => group.floors.length > 0);
  }, [buildings, floorsByBuilding, normalizedTargetSearch]);

  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      try {
        await previewRecipients({
          targetType,
          targetIds,
          requiresVerifiedMembership: true,
        }).unwrap();
      } catch (err) {
        console.error('Preview failed', err);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [previewRecipients, targetIds, targetType]);

  const toggle = (id: string, values: string[], setter: (next: string[]) => void) => {
    setter(values.includes(id) ? values.filter((item) => item !== id) : [...values, id]);
  };

  const setScope = (nextType: TargetType) => {
    setTargetType(nextType);
    setTargetSearch('');
    if (nextType !== 'building') setSelectedBuildings([]);
    if (nextType !== 'floor') setSelectedFloors([]);
  };

  const renderCategory = ({ item: cat }: { item: (typeof ANNOUNCEMENT_CATEGORIES)[number] }) => (
    <TouchableOpacity
      onPress={() => setCategory(cat)}
      style={[styles.chip, category === cat && styles.chipActive]}
    >
      <Typography
        variant="caption"
        color={category === cat ? 'white' : 'primary'}
        style={styles.chipText}
      >
        {t(`Announcements.categories.${cat}`)}
      </Typography>
    </TouchableOpacity>
  );

  const renderTargetButton = (type: TargetType, icon: string, label: string, description: string) => (
    <TouchableOpacity
      onPress={() => setScope(type)}
      style={[styles.targetBtn, targetType === type && styles.targetBtnActive]}
    >
      <Ionicons
        name={icon}
        size={20}
        color={targetType === type ? 'white' : colors.primary.main}
      />
      <View style={styles.targetTextWrap}>
        <Typography variant="caption" color={targetType === type ? 'white' : 'primary'} style={styles.targetBtnLabel}>
          {label}
        </Typography>
        <Typography variant="caption" color={targetType === type ? 'white' : 'secondary'} style={styles.targetBtnHint}>
          {description}
        </Typography>
      </View>
    </TouchableOpacity>
  );

  const handleCreate = async () => {
    if (!titleEn || !titleAr || !bodyEn || !bodyAr) {
      Alert.alert(t('Common.error'), t('Announcements.fillRequired'));
      return;
    }

    if (targetType === 'compound' && !user?.compoundId) {
      Alert.alert(t('Common.error'), t('Announcements.selectCompound'));
      return;
    }

    if (targetType === 'building' && selectedBuildings.length === 0) {
      Alert.alert(t('Common.error'), t('Announcements.selectBuilding'));
      return;
    }

    if (targetType === 'floor' && selectedFloors.length === 0) {
      Alert.alert(t('Common.error'), t('Announcements.selectFloor'));
      return;
    }

    try {
      await createAnnouncement({
        titleEn,
        titleAr,
        bodyEn,
        bodyAr,
        category,
        priority: 'normal',
        requiresAcknowledgement: mustAcknowledge,
        requiresVerifiedMembership: true,
        targetType,
        targetIds,
      }).unwrap();
      Alert.alert(t('Common.success'), t('Announcements.created'));
      navigation.goBack();
    } catch (err) {
      Alert.alert(t('Common.error'), t('Announcements.createFailed'));
    }
  };

  return (
    <ScreenContainer withKeyboard={true} edges={['left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Typography variant="label" style={styles.label}>{t('Announcements.titleEn')}</Typography>
            <TextInput
              style={styles.input}
              value={titleEn}
              onChangeText={setTitleEn}
              placeholder={t('Announcements.titleEnPlaceholder')}
              placeholderTextColor="#94a3b8"
            />
          </View>

          <View style={styles.inputGroup}>
            <Typography variant="label" style={styles.label}>{t('Announcements.titleAr')}</Typography>
            <TextInput
              style={[styles.input, styles.rtlInput]}
              value={titleAr}
              onChangeText={setTitleAr}
              placeholder={t('Announcements.titleArPlaceholder')}
              placeholderTextColor="#94a3b8"
              textAlign="right"
            />
          </View>

          <View style={styles.inputGroup}>
            <Typography variant="label" style={styles.label}>{t('Announcements.category')}</Typography>
            <FlatList
              data={ANNOUNCEMENT_CATEGORIES}
              keyExtractor={(cat) => cat}
              renderItem={renderCategory}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipRow}
            />
          </View>

          <View style={styles.inputGroup}>
            <Typography variant="label" style={styles.label}>{t('Announcements.targeting')}</Typography>
            <View style={styles.targetStack}>
              {renderTargetButton('compound', 'people-outline', t('Announcements.targetCompound'), t('Announcements.targetCompoundHint'))}
              {renderTargetButton('building', 'business-outline', t('Announcements.targetBuilding'), t('Announcements.targetBuildingHint'))}
              {renderTargetButton('floor', 'layers-outline', t('Announcements.targetFloor'), t('Announcements.targetFloorHint'))}
            </View>

            {targetType !== 'compound' && (
              <TextInput
                style={styles.searchInput}
                value={targetSearch}
                onChangeText={setTargetSearch}
                placeholder={t('Announcements.targetSearchPlaceholder')}
                placeholderTextColor="#94a3b8"
              />
            )}

            {targetType === 'building' && (
              <View style={styles.selectionList}>
                {isLoadingBuildings ? (
                  <ActivityIndicator size="small" color={colors.primary.main} />
                ) : buildings.length === 0 ? (
                  <Typography variant="caption" color="secondary">{t('Announcements.noBuildings')}</Typography>
                ) : visibleBuildings.length > 0 ? (
                  visibleBuildings.map((building: any) => (
                    <TouchableOpacity
                      key={building.id}
                      onPress={() => toggle(building.id, selectedBuildings, setSelectedBuildings)}
                      style={[styles.selectionItem, selectedBuildings.includes(building.id) && styles.selectionItemActive]}
                    >
                      <Typography
                        variant="caption"
                        color={selectedBuildings.includes(building.id) ? 'white' : 'secondary'}
                        style={styles.selectionText}
                      >
                        {building.name}
                      </Typography>
                    </TouchableOpacity>
                  ))
                ) : (
                  <Typography variant="caption" color="secondary">{t('Announcements.noMatches')}</Typography>
                )}
              </View>
            )}

            {targetType === 'floor' && (
              <View style={styles.selectionList}>
                {isLoadingBuildings ? (
                  <ActivityIndicator size="small" color={colors.primary.main} />
                ) : buildings.length === 0 ? (
                  <Typography variant="caption" color="secondary">{t('Announcements.noBuildings')}</Typography>
                ) : visibleFloorGroups.length > 0 ? (
                  visibleFloorGroups.map(({ building, floors }: { building: any; floors: any[] }) => (
                    <View key={building.id} style={styles.floorGroup}>
                      <Typography variant="caption" style={styles.floorGroupTitle}>{building.name}</Typography>
                      {floors.map((floor: any) => (
                        <TouchableOpacity
                          key={floor.id}
                          onPress={() => toggle(floor.id, selectedFloors, setSelectedFloors)}
                          style={[styles.selectionItem, selectedFloors.includes(floor.id) && styles.selectionItemActive]}
                        >
                          <Typography
                            variant="caption"
                            color={selectedFloors.includes(floor.id) ? 'white' : 'secondary'}
                            style={styles.selectionText}
                          >
                            {floor.label}
                          </Typography>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ))
                ) : (
                  <Typography variant="caption" color="secondary">
                    {targetSearch ? t('Announcements.noMatches') : t('Announcements.noFloors')}
                  </Typography>
                )}
              </View>
            )}
          </View>

          <Card style={styles.previewCard}>
            <View style={styles.previewHeader}>
              <Ionicons name="stats-chart-outline" size={18} color={colors.text.secondary.light} />
              <Typography variant="body" color="secondary" style={styles.previewLabel}>
                {t('Announcements.targetType')}
              </Typography>
            </View>
            {isPreviewing ? (
              <ActivityIndicator size="small" color={colors.primary.main} />
            ) : (
              <Typography variant="h2" color="primary">
                {previewData?.recipientCount ?? 0} <Typography variant="body">{t('Announcements.recipients')}</Typography>
              </Typography>
            )}
          </Card>

          <View style={styles.inputGroup}>
            <Typography variant="label" style={styles.label}>{t('Announcements.bodyEn')}</Typography>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={bodyEn}
              onChangeText={setBodyEn}
              placeholder={t('Announcements.bodyEnPlaceholder')}
              placeholderTextColor="#94a3b8"
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.inputGroup}>
            <Typography variant="label" style={styles.label}>{t('Announcements.bodyAr')}</Typography>
            <TextInput
              style={[styles.input, styles.textArea, styles.rtlInput]}
              value={bodyAr}
              onChangeText={setBodyAr}
              placeholder={t('Announcements.bodyArPlaceholder')}
              placeholderTextColor="#94a3b8"
              multiline
              numberOfLines={6}
              textAlign="right"
              textAlignVertical="top"
            />
          </View>

          <View style={styles.switchGroup}>
            <View style={{ flex: 1 }}>
              <Typography variant="body" style={styles.switchTitle}>
                {t('Announcements.mustAcknowledge')}
              </Typography>
              <Typography variant="caption" style={styles.switchDescription}>
                {t('Announcements.ackDescription')}
              </Typography>
            </View>
            <Switch
              value={mustAcknowledge}
              onValueChange={setMustAcknowledge}
              trackColor={{ false: '#cbd5e1', true: colors.primary.light }}
              thumbColor="#fff"
            />
          </View>

          <Button
            title={t('Announcements.create')}
            onPress={handleCreate}
            loading={isCreating}
            style={styles.submitBtn}
          />
        </View>
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  scroll: {
    padding: spacing.md,
    paddingBottom: layout.screenBottom,
  },
  form: {
    gap: spacing.lg,
  },
  inputGroup: {
    gap: spacing.xs,
  },
  label: {
    fontWeight: '700',
    color: '#475569',
  },
  input: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    fontSize: 15,
    color: '#0f172a',
  },
  rtlInput: {
    writingDirection: 'rtl',
  },
  textArea: {
    minHeight: 120,
  },
  chipRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingEnd: spacing.md,
  },
  chip: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.light,
    backgroundColor: 'white',
  },
  chipActive: {
    backgroundColor: colors.primary.main,
    borderColor: colors.primary.main,
  },
  chipText: {
    fontWeight: '700',
  },
  targetStack: {
    gap: spacing.sm,
  },
  searchInput: {
    minHeight: 44,
    marginTop: spacing.sm,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: 'white',
    paddingHorizontal: spacing.md,
    color: '#0f172a',
  },
  targetBtn: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.light,
    backgroundColor: 'white',
  },
  targetBtnActive: {
    backgroundColor: colors.primary.main,
    borderColor: colors.primary.main,
  },
  targetTextWrap: {
    flex: 1,
    marginStart: spacing.sm,
  },
  targetBtnLabel: {
    fontWeight: '700',
  },
  targetBtnHint: {
    marginTop: 2,
  },
  selectionList: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    backgroundColor: '#f1f5f9',
    borderRadius: radii.md,
    gap: spacing.xs,
  },
  selectionItem: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  selectionItemActive: {
    backgroundColor: colors.secondary.main,
    borderColor: colors.secondary.main,
  },
  selectionText: {
    fontWeight: '700',
  },
  floorGroup: {
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  floorGroupTitle: {
    color: '#475569',
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  previewCard: {
    padding: spacing.md,
    backgroundColor: '#f0f9ff',
    borderColor: '#bae6fd',
    alignItems: 'center',
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  previewLabel: {
    marginStart: 6,
    color: '#0369a1',
    fontWeight: '600',
  },
  switchGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  switchTitle: {
    fontWeight: '600',
  },
  switchDescription: {
    color: '#64748b',
  },
  submitBtn: {
    marginTop: spacing.md,
    height: 56,
    borderRadius: 16,
  },
});
