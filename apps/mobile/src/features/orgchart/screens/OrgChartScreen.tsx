import React, { useState, useMemo, useCallback, useRef } from 'react';
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
import { useGetOrgChartQuery, useLazyGetOrgChartPersonDetailQuery } from '../../../services/orgchart';
import type { OrgChartBuilding, OrgChartFloor, OrgChartRepresentative } from '../../../services/orgchart';
import { colors, spacing, shadows } from '../../../theme';
import { Typography } from '../../../components/ui/Typography';
import { ScreenContainer } from '../../../components/layout/ScreenContainer';
import { mergeRepresentativeWithPersonDetail } from '../orgchart-utils';

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

// ─── Person Card ──────────────────────────────────────────────────────────────

// ─── Person Card ──────────────────────────────────────────────────────────────

function PersonCard({ 
  rep, 
  isVacant, 
  isDark, 
  onPress 
}: { 
  rep?: OrgChartRepresentative; 
  isVacant?: boolean; 
  isDark: boolean;
  onPress?: () => void;
}) {
  const badge = rep ? (ROLE_BADGE[rep.role] ?? { bg: '#f3f4f6', text: '#374151' }) : { bg: '#f3f4f6', text: '#64748b' };
  
  return (
    <Pressable 
      onPress={onPress}
      style={({ pressed }) => [
        styles.personCard,
        {
          backgroundColor: isDark ? '#1e293b' : '#ffffff',
          borderColor: isDark ? '#334155' : '#e2e8f0',
          opacity: isVacant ? 0.7 : (pressed ? 0.9 : 1),
          transform: [{ scale: pressed ? 0.98 : 1 }]
        },
        !isVacant && shadows.md
      ]}
    >
      <View style={styles.cardHeader}>
        {rep?.user.photoUrl ? (
          <Image
            source={{ uri: rep.user.photoUrl }}
            style={styles.avatar}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.avatar, { backgroundColor: isVacant ? (isDark ? '#334155' : '#f1f5f9') : avatarColor(rep?.user.id ?? 0) }]}>
            <Typography style={[styles.avatarText, isVacant && { color: '#94a3b8' }]}>{isVacant ? '+' : getInitials(rep?.user.name ?? 'V')}</Typography>
          </View>
        )}
        <View style={styles.cardInfo}>
          <Typography
            style={[styles.personName, { color: isDark ? '#f8fafc' : '#0f172a' }]}
            numberOfLines={1}
          >
            {isVacant ? 'Vacant' : rep?.user.name}
          </Typography>
          <Typography
            variant="caption"
            style={{ color: isDark ? '#94a3b8' : '#64748b', fontSize: 9 }}
            numberOfLines={1}
          >
            {isVacant ? 'Assign Representative' : formatRole(rep?.role ?? '')}
          </Typography>
        </View>
      </View>
      {!isVacant && (
        <View style={[styles.roleBadge, { backgroundColor: badge.bg }]}>
          <Typography style={[styles.roleText, { color: badge.text }]}>
            {rep?.role.replace('_', ' ').toUpperCase() ?? 'MEMBER'}
          </Typography>
        </View>
      )}
    </Pressable>
  );
}

// ─── Tree Node ──────────────────────────────────────────────────────────────

interface TreeNodeProps {
  node: any;
  isDark: boolean;
  isLast?: boolean;
  isFirst?: boolean;
  onSelect: (rep: OrgChartRepresentative) => void;
}

const TreeNode: React.FC<TreeNodeProps> = ({ node, isDark, isLast, isFirst, onSelect }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const hasChildren = node.children.length > 0;
  const reps = node.representatives;
  const showVacant = (node.type === 'building' || node.type === 'floor') && reps.length === 0;

  return (
    <View style={styles.treeNodeContainer}>
      {/* Connector lines above */}
      {node.type !== 'compound' && (
        <View style={styles.connectorsAbove}>
          <View style={[styles.horizontalLine, isFirst && styles.firstHorizontal, isLast && styles.lastHorizontal, { backgroundColor: isDark ? '#475569' : '#cbd5e1' }]} />
          <View style={[styles.verticalLineStem, { backgroundColor: isDark ? '#475569' : '#cbd5e1' }]} />
        </View>
      )}

      {/* The Node Content */}
      <View style={styles.nodeCardWrapper}>
        <View style={[styles.nodeTypeBadge, { backgroundColor: colors.primary.light + '15' }]}>
          <Typography style={[styles.nodeTypeText, { color: colors.primary.light }]}>{node.label.toUpperCase()}</Typography>
        </View>
        
        <View style={styles.repsContainer}>
          {reps.length > 0 ? (
            reps.map((r: any) => <PersonCard key={r.id} rep={r} isDark={isDark} onPress={() => onSelect(r)} />)
          ) : showVacant ? (
            <PersonCard isVacant={true} isDark={isDark} />
          ) : (
            <View style={[styles.labelOnlyNode, { backgroundColor: isDark ? '#1e293b' : '#f8fafc', borderColor: isDark ? '#334155' : '#e2e8f0' }]}>
               <Typography variant="h3" style={{ fontSize: 12 }}>{node.label}</Typography>
            </View>
          )}

          {/* Unit Stats for floors */}
          {node.type === 'floor' && node.units?.length > 0 && (
            <View style={[styles.statsRow, { backgroundColor: isDark ? '#0f172a' : '#f1f5f9' }]}>
              <Typography style={{ fontSize: 8, fontWeight: '800', color: isDark ? '#94a3b8' : '#64748b' }}>
                {node.units.length} UNITS · {node.units.reduce((acc: number, u: any) => acc + u.residents.length, 0)} RESIDENTS
              </Typography>
            </View>
          )}
        </View>

        {hasChildren && (
          <Pressable 
            onPress={() => setIsCollapsed(!isCollapsed)}
            style={[styles.collapseToggle, { backgroundColor: isDark ? '#1e293b' : '#ffffff', borderColor: isDark ? '#475569' : '#cbd5e1' }]}
          >
            <Typography style={[styles.toggleIcon, { color: colors.primary.light }]}>{isCollapsed ? '+' : '−'}</Typography>
          </Pressable>
        )}
      </View>

      {/* Connectors and Children below */}
      {hasChildren && !isCollapsed && (
        <View style={styles.childrenContainer}>
          <View style={[styles.verticalLineLong, { backgroundColor: isDark ? '#475569' : '#cbd5e1' }]} />
          <View style={styles.childrenRow}>
            {node.children.map((child: any, index: number) => (
              <TreeNode 
                key={child.id} 
                node={child} 
                isDark={isDark} 
                isFirst={index === 0}
                isLast={index === node.children.length - 1}
                onSelect={onSelect}
              />
            ))}
          </View>
        </View>
      )}
    </View>
  );
};

// ─── Detail Sheet ─────────────────────────────────────────────────────────────

function PersonDetailSheet({ rep, onClose, isDark }: { rep: OrgChartRepresentative | null; onClose: () => void; isDark: boolean }) {
  if (!rep) return null;

  return (
    <View style={[styles.sheetOverlay]}>
      <Pressable style={styles.sheetBackdrop} onPress={onClose} />
      <View style={[styles.sheetContent, { backgroundColor: isDark ? '#0f172a' : '#ffffff' }]}>
        <View style={styles.sheetHandle} />
        <View style={styles.sheetHeader}>
          <View style={styles.sheetAvatarContainer}>
            {rep.user.photoUrl ? (
              <Image source={{ uri: rep.user.photoUrl }} style={styles.sheetAvatar} />
            ) : (
              <View style={[styles.sheetAvatar, { backgroundColor: avatarColor(rep.user.id) }]}>
                <Typography style={styles.sheetAvatarText}>{getInitials(rep.user.name)}</Typography>
              </View>
            )}
          </View>
          <View style={styles.sheetInfo}>
            <Typography variant="h2">{rep.user.name}</Typography>
            <Typography style={{ color: colors.primary.light, fontWeight: '700' }}>{formatRole(rep.role)}</Typography>
          </View>
        </View>

        <View style={styles.sheetBody}>
           <View style={[styles.detailItem, { borderBottomColor: isDark ? '#1e293b' : '#f1f5f9' }]}>
              <Typography variant="caption" style={styles.detailLabel}>EMAIL</Typography>
              <Typography style={styles.detailValue}>{rep.user.email ?? 'Protected Info'}</Typography>
           </View>
           <View style={[styles.detailItem, { borderBottomColor: isDark ? '#1e293b' : '#f1f5f9' }]}>
              <Typography variant="caption" style={styles.detailLabel}>PHONE</Typography>
              <Typography style={styles.detailValue}>{rep.user.phone ?? 'Protected Info'}</Typography>
           </View>
           <View style={[styles.detailItem, { borderBottomColor: isDark ? '#1e293b' : '#f1f5f9' }]}>
              <Typography variant="caption" style={styles.detailLabel}>ASSIGNMENT ID</Typography>
              <Typography style={styles.detailValue}>{rep.id}</Typography>
           </View>
           <View style={[styles.detailItem, { borderBottomColor: isDark ? '#1e293b' : '#f1f5f9' }]}>
              <Typography variant="caption" style={styles.detailLabel}>SCOPE LEVEL</Typography>
              <Typography style={styles.detailValue}>{rep.scopeLevel.toUpperCase()}</Typography>
           </View>
           <View style={styles.detailItem}>
              <Typography variant="caption" style={styles.detailLabel}>STATUS</Typography>
              <Typography style={[styles.detailValue, { color: '#10b981' }]}>ACTIVE</Typography>
           </View>
        </View>

        <Pressable onPress={onClose} style={styles.closeSheetBtn}>
          <Typography style={styles.closeSheetText}>Close</Typography>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export const OrgChartScreen = () => {
  const { t } = useTranslation();
  const isDark = useColorScheme() === 'dark';
  const currentUser = useSelector(selectCurrentUser);
  const compoundId = currentUser?.compoundId ?? '';
  const [zoom, setZoom] = useState(0.9);
  const [selectedRep, setSelectedRep] = useState<OrgChartRepresentative | null>(null);

  const scrollRef = useRef<ScrollView>(null);

  const { data, isLoading, refetch } = useGetOrgChartQuery(compoundId, { skip: !compoundId });
  const [fetchPersonDetail] = useLazyGetOrgChartPersonDetailQuery();

  const treeData = useMemo(() => {
    if (!data) return null;
    return {
      id: data.compound.id,
      type: 'compound' as const,
      label: data.compound.name,
      representatives: data.compound.representatives,
      children: (data.buildings ?? []).map(b => ({
        id: b.id,
        type: 'building' as const,
        label: b.name,
        representatives: b.representatives,
        children: (b.floors ?? []).map(f => ({
          id: f.id,
          type: 'floor' as const,
          label: f.label,
          representatives: f.representatives,
          units: f.units,
          children: []
        }))
      }))
    };
  }, [data]);

  const centerOnMe = useCallback(() => {
    // Basic centering: scroll to top/center
    scrollRef.current?.scrollTo({ x: 0, y: 0, animated: true });
  }, []);

  const handleSelectRepresentative = useCallback(async (rep: OrgChartRepresentative) => {
    setSelectedRep(rep);

    try {
      const detail = await fetchPersonDetail(rep.user.id).unwrap();
      setSelectedRep((current) => {
        if (!current || current.id !== rep.id) {
          return current;
        }

        return mergeRepresentativeWithPersonDetail(current, detail);
      });
    } catch {
      // Keep the lightweight org-chart payload visible if detail hydration fails.
    }
  }, [fetchPersonDetail]);

  if (!compoundId) {
    return (
      <ScreenContainer style={styles.centerContainer}>
        <Typography variant="caption" style={{ textAlign: 'center' }}>No compound context found.</Typography>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer withKeyboard={false} style={StyleSheet.flatten([styles.container, { backgroundColor: isDark ? '#020617' : '#f8fafc' }])}>
      <ScrollView 
        ref={scrollRef}
        horizontal 
        contentContainerStyle={{ flexGrow: 1 }}
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 100 }}>
          <View style={{ transform: [{ scale: zoom }], transformOrigin: 'top center' }}>
            {isLoading ? (
              <View style={styles.loadingWrapper}><Typography>Syncing hierarchy...</Typography></View>
            ) : treeData ? (
              <TreeNode node={treeData} isDark={isDark} onSelect={handleSelectRepresentative} />
            ) : (
              <Typography style={{ textAlign: 'center' }}>No organizational data found.</Typography>
            )}
          </View>
        </ScrollView>
      </ScrollView>

      {/* Floating Controls */}
      <View style={styles.fabContainer}>
         <View style={[styles.zoomToolbar, { backgroundColor: isDark ? '#1e293b' : '#ffffff' }, shadows.lg]}>
            <Pressable onPress={() => setZoom(z => Math.max(0.3, z - 0.1))} style={styles.fabBtn}><Typography style={styles.fabIcon}>−</Typography></Pressable>
            <View style={styles.zoomDivider} />
            <Typography style={styles.zoomVal}>{Math.round(zoom * 100)}%</Typography>
            <View style={styles.zoomDivider} />
            <Pressable onPress={() => setZoom(z => Math.min(1.5, z + 0.1))} style={styles.fabBtn}><Typography style={styles.fabIcon}>+</Typography></Pressable>
         </View>
         
         <Pressable 
          onPress={centerOnMe} 
          style={[styles.positionFab, { backgroundColor: colors.primary.light }, shadows.lg]}
         >
            <Typography style={styles.positionText}>MY POSITION</Typography>
         </Pressable>
      </View>

      <PersonDetailSheet rep={selectedRep} isDark={isDark} onClose={() => setSelectedRep(null)} />
    </ScreenContainer>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    padding: 0,
  },
  loadingWrapper: {
    paddingTop: 100,
    alignItems: 'center',
  },
  treeNodeContainer: {
    alignItems: 'center',
  },
  nodeCardWrapper: {
    alignItems: 'center',
    gap: spacing.xs,
    zIndex: 10,
  },
  nodeTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  nodeTypeText: {
    fontSize: 7,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  repsContainer: {
    gap: spacing.sm,
  },
  labelOnlyNode: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 14,
    borderWidth: 1,
  },
  statsRow: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'center',
    marginTop: 4,
  },
  childrenContainer: {
    alignItems: 'center',
  },
  childrenRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  connectorsAbove: {
    width: '100%',
    height: 30,
    alignItems: 'center',
  },
  verticalLineStem: {
    width: 1.5,
    height: 30,
  },
  verticalLineLong: {
    width: 1.5,
    height: 30,
  },
  horizontalLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1.5,
  },
  firstHorizontal: { left: '50%' },
  lastHorizontal: { right: '50%' },

  personCard: {
    width: 180,
    borderRadius: 16,
    borderWidth: 1,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cardInfo: { flex: 1 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#ffffff', fontSize: 12, fontWeight: '700' },
  personName: { fontSize: 11, fontWeight: '800' },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4,
  },
  roleText: { fontSize: 7, fontWeight: '900', letterSpacing: 0.5 },
  collapseToggle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -11,
    zIndex: 20,
  },
  toggleIcon: { fontSize: 14, fontWeight: 'bold' },

  // FABs
  fabContainer: {
    position: 'absolute',
    bottom: spacing.xl,
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  zoomToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 4,
  },
  fabBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabIcon: { fontSize: 18, fontWeight: '800' },
  zoomVal: { fontSize: 11, fontWeight: '900', width: 45, textAlign: 'center' },
  zoomDivider: { width: 1, height: 20, backgroundColor: '#e2e8f0' },
  positionFab: {
    paddingHorizontal: spacing.lg,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  positionText: { color: '#ffffff', fontSize: 11, fontWeight: '900', letterSpacing: 1 },

  // Bottom Sheet
  sheetOverlay: {
    position: 'absolute',
    inset: 0,
    zIndex: 100,
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheetContent: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: spacing.xl,
    paddingBottom: 40,
  },
  sheetHandle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#e2e8f0',
    alignSelf: 'center',
    marginBottom: spacing.xl,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    marginBottom: spacing.xl,
  },
  sheetAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetAvatarText: { fontSize: 24, color: '#ffffff', fontWeight: '800' },
  sheetBody: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  detailLabel: { fontWeight: '900', fontSize: 9, letterSpacing: 1 },
  detailValue: { fontWeight: '700', fontSize: 13 },
  closeSheetBtn: {
    height: 54,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetAvatarContainer: {
    borderRadius: 32,
    borderWidth: 4,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  sheetInfo: {
    flex: 1,
  },
  closeSheetText: { fontWeight: '800', color: '#64748b' },
  centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
