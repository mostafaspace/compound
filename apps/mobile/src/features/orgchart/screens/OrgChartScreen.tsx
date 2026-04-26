import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  ScrollView,
  Pressable,
  Image,
  useColorScheme,
  ListRenderItemInfo,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../../../store/authSlice';
import { useGetOrgChartQuery } from '../../../services/orgchart';
import type { OrgChartBuilding, OrgChartFloor, OrgChartRepresentative } from '../../../services/orgchart';
import { colors, spacing, shadows } from '../../../theme';
import { Typography } from '../../../components/ui/Typography';
import { ScreenContainer } from '../../../components/layout/ScreenContainer';

// ─── Role helpers ─────────────────────────────────────────────────────────────

const ROLE_BADGE: Record<string, { bg: string; text: string }> = {
  president: { bg: '#fef3c7', text: '#92400e' },
  treasurer: { bg: '#d1fae5', text: '#065f46' },
  building_representative: { bg: '#dbeafe', text: '#1e40af' },
  floor_representative: { bg: '#ede9fe', text: '#5b21b6' },
  admin_contact: { bg: '#ffedd5', text: '#9a3412' },
  security_contact: { bg: '#fee2e2', text: '#991b1b' },
  association_member: { bg: '#f3f4f6', text: '#374151' },
};

const AVATAR_COLORS = [
  '#3b82f6', '#10b981', '#8b5cf6', '#f59e0b',
  '#ef4444', '#06b6d4', '#ec4899', '#6366f1',
];

function avatarColor(id: number) {
  return AVATAR_COLORS[id % AVATAR_COLORS.length];
}

function getInitials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

function formatRole(role: string) {
  return role.split('_').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');
}

// ─── Person Card ──────────────────────────────────────────────────────────────

function PersonCard({ rep, isDark }: { rep: OrgChartRepresentative; isDark: boolean }) {
  const badge = ROLE_BADGE[rep.role] ?? { bg: '#f3f4f6', text: '#374151' };
  return (
    <View style={[
      styles.personCard,
      {
        backgroundColor: isDark ? colors.surface.dark : '#ffffff',
        borderColor: isDark ? colors.border.dark : '#e5e7eb',
      },
    ]}>
      {rep.user.photoUrl ? (
        <Image
          source={{ uri: rep.user.photoUrl }}
          style={styles.avatar}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.avatar, { backgroundColor: avatarColor(rep.user.id) }]}>
          <Typography style={styles.avatarText}>{getInitials(rep.user.name)}</Typography>
        </View>
      )}
      <Typography
        style={[styles.personName, { color: isDark ? colors.text.primary.dark : colors.text.primary.light }]}
        numberOfLines={2}
      >
        {rep.user.name}
      </Typography>
      <View style={[styles.roleBadge, { backgroundColor: badge.bg }]}>
        <Typography style={[styles.roleText, { color: badge.text }]}>{formatRole(rep.role)}</Typography>
      </View>
    </View>
  );
}

// ─── Representatives Row ─────────────────────────────────────────────────────

function RepresentativesRow({ reps, isDark }: { reps: OrgChartRepresentative[]; isDark: boolean }) {
  if (reps.length === 0) {
    return (
      <Typography style={[styles.noRep, { color: isDark ? colors.text.secondary.dark : colors.text.secondary.light }]}>
        No representative assigned
      </Typography>
    );
  }
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.repRow}>
      {reps.map((rep) => (
        <PersonCard key={rep.id} rep={rep} isDark={isDark} />
      ))}
    </ScrollView>
  );
}

// ─── Flat list item types ─────────────────────────────────────────────────────

type CompoundHeaderItem = { type: 'compound_header'; name: string; code: string; reps: OrgChartRepresentative[] };
type BuildingItem = { type: 'building'; building: OrgChartBuilding; isExpanded: boolean };
type FloorItem = { type: 'floor'; floor: OrgChartFloor; buildingId: string };
type ListItem = CompoundHeaderItem | BuildingItem | FloorItem;

// ─── Main Screen ──────────────────────────────────────────────────────────────

export const OrgChartScreen = () => {
  const { t } = useTranslation();
  const isDark = useColorScheme() === 'dark';
  const user = useSelector(selectCurrentUser);
  const compoundId = user?.compoundId ?? '';

  const { data, isLoading, refetch } = useGetOrgChartQuery(compoundId, { skip: !compoundId });

  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggleBuilding = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const listItems = useMemo<ListItem[]>(() => {
    if (!data) return [];
    const items: ListItem[] = [
      {
        type: 'compound_header',
        name: data.compound.name,
        code: data.compound.code,
        reps: data.compound.representatives,
      },
    ];
    for (const building of data.buildings ?? []) {
      const isExpanded = expanded.has(building.id);
      items.push({ type: 'building', building, isExpanded });
      if (isExpanded) {
        for (const floor of building.floors ?? []) {
          items.push({ type: 'floor', floor, buildingId: building.id });
        }
      }
    }
    return items;
  }, [data, expanded]);

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<ListItem>) => {
      if (item.type === 'compound_header') {
        return (
          <View style={[
            styles.compoundCard,
            { backgroundColor: isDark ? colors.surface.dark : '#ffffff', borderColor: isDark ? colors.border.dark : '#e5e7eb' },
            shadows.md,
          ]}>
            <View style={styles.compoundHeader}>
              <View style={[styles.iconCircle, { backgroundColor: isDark ? '#1a3a35' : '#f0fdf4' }]}>
                <Typography style={styles.iconEmoji}>🏛️</Typography>
              </View>
              <View style={styles.compoundInfo}>
                <Typography variant="h2" style={{ color: isDark ? colors.text.primary.dark : colors.text.primary.light }}>
                  {item.name}
                </Typography>
                <Typography variant="caption" style={{ color: isDark ? colors.text.secondary.dark : colors.text.secondary.light }}>
                  {item.code} · Association Leadership
                </Typography>
              </View>
            </View>
            <RepresentativesRow reps={item.reps} isDark={isDark} />
          </View>
        );
      }

      if (item.type === 'building') {
        const { building, isExpanded } = item;
        const hasFloors = (building.floors ?? []).length > 0;
        return (
          <Pressable
            onPress={() => hasFloors && toggleBuilding(building.id)}
            style={({ pressed }) => [
              styles.buildingRow,
              {
                backgroundColor: isDark ? colors.surface.dark : '#ffffff',
                borderColor: isDark ? colors.border.dark : '#e5e7eb',
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <View style={styles.buildingLeft}>
              <View style={[styles.buildingDot, { backgroundColor: colors.primary.light }]} />
              <View style={styles.buildingMeta}>
                <Typography
                  variant="h3"
                  style={{ color: isDark ? colors.text.primary.dark : colors.text.primary.light }}
                >
                  🏢 {building.name}
                </Typography>
                <Typography
                  variant="caption"
                  style={{ color: isDark ? colors.text.secondary.dark : colors.text.secondary.light }}
                >
                  {building.code}
                  {hasFloors ? ` · ${building.floors.length} floor${building.floors.length !== 1 ? 's' : ''}` : ''}
                </Typography>
              </View>
            </View>
            {hasFloors ? (
              <Typography style={[styles.chevron, { color: isDark ? colors.text.secondary.dark : colors.text.secondary.light }]}>
                {isExpanded ? '▼' : '›'}
              </Typography>
            ) : null}
            {building.representatives.length > 0 && (
              <View style={styles.buildingRepBadge}>
                {building.representatives.slice(0, 3).map((rep) => (
                  rep.user.photoUrl ? (
                    <Image
                      key={rep.id}
                      source={{ uri: rep.user.photoUrl }}
                      style={[styles.miniAvatar, { borderColor: isDark ? colors.surface.dark : '#ffffff' }]}
                    />
                  ) : (
                    <View
                      key={rep.id}
                      style={[styles.miniAvatar, { backgroundColor: avatarColor(rep.user.id), borderColor: isDark ? colors.surface.dark : '#ffffff' }]}
                    >
                      <Typography style={styles.miniAvatarText}>{getInitials(rep.user.name)}</Typography>
                    </View>
                  )
                ))}
              </View>
            )}
          </Pressable>
        );
      }

      if (item.type === 'floor') {
        const { floor } = item;
        const hasReps = floor.representatives.length > 0;
        return (
          <View style={[
            styles.floorRow,
            { borderColor: isDark ? colors.border.dark : '#f3f4f6' },
          ]}>
            <View style={styles.floorIndent}>
              <View style={[styles.floorLine, { backgroundColor: isDark ? '#374151' : '#e5e7eb' }]} />
            </View>
            <View style={styles.floorContent}>
              <View style={styles.floorHeader}>
                <Typography
                  variant="body"
                  style={[styles.floorLabel, { color: isDark ? colors.text.primary.dark : colors.text.primary.light }]}
                >
                  {floor.label}
                </Typography>
                {!hasReps && (
                  <Typography
                    variant="caption"
                    style={{ color: isDark ? colors.text.secondary.dark : colors.text.secondary.light }}
                  >
                    No rep
                  </Typography>
                )}
              </View>
              {hasReps && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.repRow}>
                  {floor.representatives.map((rep) => (
                    <PersonCard key={rep.id} rep={rep} isDark={isDark} />
                  ))}
                </ScrollView>
              )}
            </View>
          </View>
        );
      }

      return null;
    },
    [isDark, toggleBuilding],
  );

  const keyExtractor = useCallback((item: ListItem) => {
    if (item.type === 'compound_header') return 'compound';
    if (item.type === 'building') return `b-${item.building.id}`;
    return `f-${item.floor.id}`;
  }, []);

  if (!compoundId) {
    return (
      <ScreenContainer style={styles.centerContainer}>
        <Typography variant="caption" style={{ textAlign: 'center' }}>
          No compound associated with your account.
        </Typography>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer withKeyboard={false} style={styles.container}>
      <FlatList<ListItem>
        data={listItems}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        refreshing={isLoading}
        onRefresh={refetch}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.centerContainer}>
              <Typography variant="caption" style={{ textAlign: 'center', marginTop: spacing.xl }}>
                {t('Common.noData', { defaultValue: 'No data available.' })}
              </Typography>
            </View>
          ) : null
        }
      />
    </ScreenContainer>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    padding: 0,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  listContent: {
    padding: spacing.md,
    gap: spacing.sm,
    paddingBottom: spacing['2xl'],
  },

  // Compound card
  compoundCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: spacing.lg,
    marginBottom: spacing.sm,
  },
  compoundHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconEmoji: {
    fontSize: 22,
  },
  compoundInfo: {
    flex: 1,
  },

  // Person card
  personCard: {
    width: 100,
    borderRadius: 12,
    borderWidth: 1,
    padding: spacing.sm,
    alignItems: 'center',
    marginRight: spacing.sm,
    gap: spacing.xs,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  personName: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 15,
  },
  roleBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 20,
  },
  roleText: {
    fontSize: 9,
    fontWeight: '600',
  },
  repRow: {
    flexDirection: 'row',
    marginTop: spacing.xs,
  },
  noRep: {
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: spacing.xs,
  },

  // Building row
  buildingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    gap: spacing.sm,
  },
  buildingLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  buildingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  buildingMeta: {
    flex: 1,
  },
  buildingRepBadge: {
    flexDirection: 'row',
  },
  miniAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    marginLeft: -6,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  miniAvatarText: {
    color: '#ffffff',
    fontSize: 8,
    fontWeight: '700',
  },
  chevron: {
    fontSize: 18,
    fontWeight: '400',
  },

  // Floor row
  floorRow: {
    flexDirection: 'row',
    paddingLeft: spacing.md,
    paddingBottom: spacing.sm,
  },
  floorIndent: {
    width: 20,
    alignItems: 'center',
    paddingTop: spacing.sm,
  },
  floorLine: {
    width: 1,
    flex: 1,
  },
  floorContent: {
    flex: 1,
    paddingLeft: spacing.sm,
  },
  floorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  floorLabel: {
    fontWeight: '600',
    fontSize: 13,
  },
});
