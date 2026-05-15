import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  Pressable,
  Image,
  useColorScheme,
  ActivityIndicator,
  Animated,
  SafeAreaView,
  Platform,
} from 'react-native';
import Svg, { G, Path, Circle } from 'react-native-svg';
import { 
  GestureHandlerRootView, 
  PinchGestureHandler, 
  PanGestureHandler, 
  TapGestureHandler,
  State 
} from 'react-native-gesture-handler';
import * as d3 from 'd3-hierarchy';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../../../store/authSlice';
import { useGetOrgChartQuery, useLazyGetOrgChartPersonDetailQuery } from '../../../services/orgchart';
import type { OrgChartRepresentative } from '../../../services/orgchart';
import { useListApartmentsQuery } from '../../../services/apartments/apartmentsApi';
import { mergeRepresentativeWithPersonDetail } from '../orgchart-utils';
import { colors, radii, spacing, shadows } from '../../../theme';
import { Typography } from '../../../components/ui/Typography';
import { Icon } from '../../../components/ui/Icon';
import { isRtlLanguage, rowDirectionStyle, textDirectionStyle } from '../../../i18n/direction';

// ─── Constants ────────────────────────────────────────────────────────────────

const NODE_WIDTH = 190;
const NODE_HEIGHT = 90;
const HORIZONTAL_COLUMN_OFFSET = 160;
const FLOOR_STEP = 110; 

const ROLE_BADGE: Record<string, { bg: string; text: string; border: string }> = {
  president: { bg: "#EEF2FF", text: "#4F46E5", border: "#C7D2FE" },
  building_representative: { bg: "#F0F9FF", text: "#0284C7", border: "#BAE6FD" },
  floor_representative: { bg: "#F5F3FF", text: "#7C3AED", border: "#DDD6FE" },
};

const ROLE_BADGE_DARK: Record<string, { bg: string; text: string; border: string }> = {
  president: { bg: "rgba(99, 102, 241, 0.18)", text: "#C7D2FE", border: "rgba(199, 210, 254, 0.24)" },
  building_representative: { bg: "rgba(14, 165, 233, 0.16)", text: "#BAE6FD", border: "rgba(186, 230, 253, 0.24)" },
  floor_representative: { bg: "rgba(139, 92, 246, 0.18)", text: "#DDD6FE", border: "rgba(221, 214, 254, 0.24)" },
};

const AVATAR_COLORS = ['#4F46E5', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#06B6D4', '#EC4899', '#6366F1'];

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

// ─── Main Screen Component ─────────────────────────────────────────────────────

export const OrgChartScreen = ({ navigation }: any) => {
  const { t, i18n } = useTranslation();
  const isDark = useColorScheme() === 'dark';
  const isRtl = isRtlLanguage(i18n.language);
  const currentUser = useSelector(selectCurrentUser);
  const compoundIdFromUser =
    currentUser?.compoundId ||
    currentUser?.scopes?.find(scope => scope.scope_type === "compound")?.scope_id ||
    (currentUser as any)?.memberships?.[0]?.compoundId ||
    "";
  const { data: apartments = [], isLoading: isLoadingApartments } = useListApartmentsQuery(undefined, {
    skip: Boolean(compoundIdFromUser),
  });
  const compoundId = compoundIdFromUser || apartments[0]?.unit?.compoundId || "";
  
  // 1. Data Hooks
  const { data, isLoading, isError, refetch } = useGetOrgChartQuery(compoundId, { skip: !compoundId });
  const [fetchPersonDetail] = useLazyGetOrgChartPersonDetailQuery();

  // 2. State Hooks
  const [collapsedIds, setCollapsedIds] = useState<Set<string> | null>(null);
  const [selectedRep, setSelectedRep] = useState<OrgChartRepresentative | null>(null);
  const [selectedRepLoading, setSelectedRepLoading] = useState(false);
  const [selectedRepError, setSelectedRepError] = useState<string | null>(null);

  useEffect(() => {
    if (data && collapsedIds === null) {
      setCollapsedIds(new Set(data.buildings.map(b => b.id)));
    }
  }, [data, collapsedIds]);
  const [containerLayout, setContainerLayout] = useState({ width: 0, height: 0 });

  // Refs for gesture handler simultaneous interactions
  const panRef = useRef(null);
  const pinchRef = useRef(null);
  const doubleTapRef = useRef(null);

  // 3. Animation Hooks (Source of truth for position/scale)
  const baseX = useRef(new Animated.Value(0)).current;
  const baseY = useRef(new Animated.Value(80)).current;
  const panX = useRef(new Animated.Value(0)).current;
  const panY = useRef(new Animated.Value(0)).current;

  const baseScale = useRef(new Animated.Value(0.75)).current;
  const pinchScale = useRef(new Animated.Value(1)).current;

  // We use Animated.add and Animated.multiply so that gesture values and base values are independent.
  // This avoids tricky setOffset bugs where gestures "jump" due to initial state mismatches.
  const animX = useMemo(() => Animated.add(baseX, panX), [baseX, panX]);
  const animY = useMemo(() => Animated.add(baseY, panY), [baseY, panY]);
  const animScale = useMemo(() => Animated.multiply(baseScale, pinchScale), [baseScale, pinchScale]);

  // Internal state to track accumulated offsets for gesture continuity
  const offset = useRef({ x: 0, y: 80, s: 0.75 }).current;

  // 4. Layout Calculation
  const effectiveCollapsedIds = collapsedIds ?? new Set<string>();

  const layoutData = useMemo(() => {
    if (!data) return { nodes: [], links: [] };
    const nodes: any[] = [];
    const links: any[] = [];

    const rootRep = data.compound.representatives.find(r => r.role === 'president');
    const rootNode = {
      id: data.compound.id,
      x: 0,
      y: 0,
      name: rootRep?.user.name ?? t('OrgChart.vacant'),
      role: 'president',
      label: data.compound.name,
      rep: rootRep,
      isVacant: !rootRep,
      isCollapsed: false,
      _allChildren: data.buildings
    };
    nodes.push(rootNode);

    let currentYLeft = 180;
    let currentYRight = 180;

    data.buildings.forEach((b, i) => {
      const isLeft = i % 2 === 0;
      const bRep = b.representatives.find(r => r.role === 'building_representative');
      const isCollapsed = effectiveCollapsedIds.has(b.id);
      
      const bNode = {
        id: b.id,
        x: isLeft ? -HORIZONTAL_COLUMN_OFFSET : HORIZONTAL_COLUMN_OFFSET,
        y: isLeft ? currentYLeft : currentYRight,
        name: bRep?.user.name ?? t('OrgChart.vacant'),
        role: 'building_representative',
        label: b.name,
        rep: bRep,
        isVacant: !bRep,
        isCollapsed: isCollapsed,
        _allChildren: b.floors
      };
      nodes.push(bNode);
      links.push({ source: rootNode, target: bNode });

      if (!isCollapsed) {
        b.floors.forEach((f, floorIndex) => {
          const fRep = f.representatives.find(r => r.role === 'floor_representative');
          const fNode = {
            id: f.id,
            x: bNode.x,
            y: bNode.y + NODE_HEIGHT + (floorIndex + 1) * FLOOR_STEP,
            name: fRep?.user.name ?? t('OrgChart.vacant'),
            role: 'floor_representative',
            label: f.label,
            rep: fRep,
            isVacant: !fRep,
            isCollapsed: true,
            _allChildren: []
          };
          nodes.push(fNode);
          links.push({ source: bNode, target: fNode });
        });
      }

      const floorsHeight = !isCollapsed && b.floors.length > 0 ? (b.floors.length * FLOOR_STEP + NODE_HEIGHT) : 0;
      const addedHeight = NODE_HEIGHT + floorsHeight + 100;
      if (isLeft) currentYLeft += addedHeight;
      else currentYRight += addedHeight;
    });

    return { nodes, links };
  }, [data, effectiveCollapsedIds, t]);

  // 6. Interaction Handlers
  const toggleCollapse = useCallback((id: string) => {
    setCollapsedIds(prev => {
      const next = new Set(prev ?? []);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleSelectRepresentative = useCallback(async (rep: OrgChartRepresentative) => {
    setSelectedRep(rep);
    setSelectedRepError(null);
    setSelectedRepLoading(true);

    try {
      const detail = await fetchPersonDetail(rep.user.id).unwrap();
      setSelectedRep(current => {
        if (!current || current.id !== rep.id) return current;
        return mergeRepresentativeWithPersonDetail(current, detail);
      });
    } catch {
      setSelectedRepError(t('OrgChart.profileLoadError'));
    } finally {
      setSelectedRepLoading(false);
    }
  }, [fetchPersonDetail, t]);

  const onPanEvent = Animated.event(
    [{ nativeEvent: { translationX: panX, translationY: panY } }],
    { useNativeDriver: true }
  );

  const onPanStateChange = (event: any) => {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      offset.x += event.nativeEvent.translationX;
      offset.y += event.nativeEvent.translationY;
      baseX.setValue(offset.x);
      baseY.setValue(offset.y);
      panX.setValue(0);
      panY.setValue(0);
    }
  };

  const onPinchEvent = Animated.event(
    [{ nativeEvent: { scale: pinchScale } }],
    { useNativeDriver: true }
  );

  const onPinchStateChange = (event: any) => {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      offset.s *= event.nativeEvent.scale;
      baseScale.setValue(offset.s);
      pinchScale.setValue(1);
    }
  };

  const onDoubleTap = (event: any) => {
    if (event.nativeEvent.state === State.ACTIVE) {
      const currentScale = offset.s;
      const nextScale = currentScale < 1.2 ? 1.5 : 0.75;

      offset.s = nextScale;
      Animated.spring(baseScale, {
        toValue: nextScale,
        tension: 40,
        friction: 7,
        useNativeDriver: true
      }).start();
      pinchScale.setValue(1);

      if (nextScale === 0.75) {
        offset.x = 0;
        offset.y = 80;
        Animated.parallel([
          Animated.spring(baseX, { toValue: 0, useNativeDriver: true }),
          Animated.spring(baseY, { toValue: 80, useNativeDriver: true }),
        ]).start();
        panX.setValue(0);
        panY.setValue(0);
      }
    }
  };


  // 7. Render Logic
  const isResolvingCompound = !compoundId && isLoadingApartments;

  if (isResolvingCompound || isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: isDark ? '#020617' : '#F8FAFC' }]}>
        <ActivityIndicator color={colors.primary.light} size="large" />
        <Typography style={[styles.stateCopy, { color: colors.text.secondary[isDark ? "dark" : "light"] }, textDirectionStyle(isRtl)]}>
          {t('OrgChart.loading')}
        </Typography>
      </View>
    );
  }

  if (!compoundId || isError || !data) {
    return (
      <SafeAreaView style={[styles.center, styles.stateContainer, { backgroundColor: isDark ? '#020617' : '#F8FAFC' }]}>
        <View style={[styles.stateIcon, { backgroundColor: isDark ? colors.palette.ink[800] : colors.palette.teal[50] }]}>
          <Icon name="building" color={colors.primary[isDark ? "dark" : "light"]} size={30} />
        </View>
        <Typography style={[styles.stateTitle, { color: colors.text.primary[isDark ? "dark" : "light"] }, textDirectionStyle(isRtl)]}>
          {isError ? t('OrgChart.loadErrorTitle') : t('OrgChart.emptyTitle')}
        </Typography>
        <Typography style={[styles.stateCopy, { color: colors.text.secondary[isDark ? "dark" : "light"] }, textDirectionStyle(isRtl)]}>
          {isError ? t('OrgChart.loadErrorBody') : t('OrgChart.emptyBody')}
        </Typography>
        {compoundId && isError ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => refetch()}
            style={[styles.retryButton, { backgroundColor: colors.primary[isDark ? "dark" : "light"] }]}
          >
            <Typography style={styles.retryText}>{t('Common.retry')}</Typography>
          </Pressable>
        ) : null}
      </SafeAreaView>
    );
  }

  const { nodes, links } = layoutData;
  const centerX = containerLayout.width / 2;

  return (
    <GestureHandlerRootView style={styles.container}>
      <View 
        style={[styles.canvasContainer, styles.coordinateCanvas, { backgroundColor: isDark ? '#020617' : '#F8FAFC' }]}
        onLayout={(e) => setContainerLayout(e.nativeEvent.layout)}
      >
        <TapGestureHandler
          ref={doubleTapRef}
          numberOfTaps={2}
          onHandlerStateChange={onDoubleTap}
        >
          <Animated.View style={[styles.container, styles.coordinateCanvas]}>
            <PinchGestureHandler
              ref={pinchRef}
              simultaneousHandlers={panRef}
              onGestureEvent={onPinchEvent}
              onHandlerStateChange={onPinchStateChange}
            >
              <Animated.View style={[styles.container, styles.coordinateCanvas]}>
                <PanGestureHandler
                  ref={panRef}
                  simultaneousHandlers={pinchRef}
                  onGestureEvent={onPanEvent}
                  onHandlerStateChange={onPanStateChange}
                >
                  <Animated.View style={[styles.canvas, styles.coordinateCanvas]}>
                {/* The main coordinate system. Transformed by gestures + initial centerX */}
                <Animated.View style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  width: 1, // Pivot point
                  height: 1,
                  direction: 'ltr',
                  transform: [
                    { translateX: centerX }, // Global horizontal center
                    { translateX: animX },   // Panned X
                    { translateY: animY },   // Panned Y
                    { scale: animScale }     // Zoom
                  ]
                }}>
                  {/* Connectors Layer */}
                  <View style={{ position: 'absolute' }} pointerEvents="none">
                    <Svg width={4000} height={6000} style={{ left: -2000, top: 0 }}>
                      <G transform="translate(2000, 0)">
                        {links.map((link, i) => {
                          const s = link.source;
                          const t = link.target;
                          let path = '';
                          if (t.role === 'building_representative') {
                            const spineY = t.y + NODE_HEIGHT / 2;
                            path = `M0,${s.y + NODE_HEIGHT} V${spineY} H${t.x}`;
                          } else if (t.role === 'floor_representative') {
                            path = `M${s.x},${s.y + NODE_HEIGHT} V${t.y}`;
                          }
                          return (
                            <Path
                              key={`link-${i}`}
                              d={path}
                              stroke={isDark ? '#334155' : '#CBD5E1'}
                              strokeWidth={2}
                              fill="none"
                            />
                          );
                        })}
                        <Circle cx="0" cy={NODE_HEIGHT} r="4" fill={colors.primary.light} />
                      </G>
                    </Svg>
                  </View>

                  {/* Nodes Layer */}
                  <View style={{ position: 'absolute' }}>
                    {nodes.map((node, i) => {
                      const badgeSource = isDark ? ROLE_BADGE_DARK : ROLE_BADGE;
                      const badge = badgeSource[node.role] || (isDark
                        ? { bg: "rgba(148, 163, 184, 0.16)", text: "#CBD5E1", border: "rgba(203, 213, 225, 0.24)" }
                        : { bg: "#F9FAFB", text: "#4B5563", border: "#E5E7EB" });
                      const hasChildren = node._allChildren && node._allChildren.length > 0;
                      const surfaceColor = node.isVacant
                        ? isDark ? "rgba(15, 23, 42, 0.92)" : "#F8FAFC"
                        : isDark ? '#1E293B' : '#FFFFFF';
                      const borderColor = node.isVacant
                        ? isDark ? "rgba(148, 163, 184, 0.46)" : "#CBD5E1"
                        : isDark ? '#334155' : '#F1F5F9';
                      
                      return (
                        <View 
                          key={`node-${node.id}`} 
                          style={{ 
                            position: 'absolute', 
                            left: node.x - NODE_WIDTH / 2, 
                            top: node.y,
                            width: NODE_WIDTH,
                            alignItems: 'center'
                          }}
                        >
                          <Pressable
                            onPress={() => {
                              if (!node.isVacant && node.rep) {
                                handleSelectRepresentative(node.rep);
                              }
                            }}
                            style={[
                              styles.nodeCard,
                              {
                                backgroundColor: surfaceColor,
                                borderColor,
                                borderStyle: node.isVacant ? 'dashed' : 'solid',
                              },
                              !node.isVacant && shadows.md
                            ]}
                          >
                            <View style={[styles.nodeHeader, rowDirectionStyle(isRtl)]}>
                              <View style={[styles.avatar, { backgroundColor: node.isVacant ? (isDark ? colors.palette.ink[700] : '#F1F5F9') : AVATAR_COLORS[i % 8] }]}>
                                {node.rep?.user.photoUrl ? (
                                  <Image source={{ uri: node.rep.user.photoUrl }} style={styles.avatarImg} />
                                ) : (
                                  node.isVacant ? (
                                    <Icon name="user" color={colors.text.secondary[isDark ? "dark" : "light"]} size={22} />
                                  ) : (
                                    <Typography style={styles.avatarText}>
                                      {getInitials(node.name)}
                                    </Typography>
                                  )
                                )}
                              </View>
                              <View style={[styles.nodeCopy, textDirectionStyle(isRtl)]}>
                                <Typography numberOfLines={2} style={[styles.nodeName, { color: isDark ? '#F8FAFC' : '#0F172A' }, textDirectionStyle(isRtl)]}>
                                  {node.name}
                                </Typography>
                                <Typography numberOfLines={2} style={[styles.nodeLabel, { color: colors.text.secondary[isDark ? "dark" : "light"] }, textDirectionStyle(isRtl)]}>
                                  {node.label}
                                </Typography>
                              </View>
                            </View>
                            <View style={[styles.roleBadge, { backgroundColor: badge.bg, borderColor: badge.border, borderWidth: 1 }, isRtl ? styles.roleBadgeRtl : null]}>
                              <Typography numberOfLines={2} style={[styles.roleText, { color: badge.text }, textDirectionStyle(isRtl)]}>
                                {t(`Common.roles.${node.role}`)}
                              </Typography>
                            </View>
                          </Pressable>

                          {hasChildren && (
                            <Pressable 
                              onPress={() => toggleCollapse(node.id)}
                              style={[styles.collapseBtn, { backgroundColor: isDark ? '#334155' : '#FFF', borderColor: isDark ? colors.palette.ink[600] : '#E2E8F0' }]}
                            >
                              <Typography style={[styles.collapseText, { color: colors.text.secondary[isDark ? "dark" : "light"] }]}>
                                {node.isCollapsed ? `➕ ${node._allChildren.length}` : '➖'}
                              </Typography>
                            </Pressable>
                          )}
                        </View>
                      );
                    })}
                  </View>
                </Animated.View>
              </Animated.View>
            </PanGestureHandler>
          </Animated.View>
        </PinchGestureHandler>
      </Animated.View>
    </TapGestureHandler>

        {selectedRep ? (
          <View style={styles.profileSheet} pointerEvents="box-none">
            <View style={[styles.profileCard, { backgroundColor: isDark ? '#0F172A' : '#FFFFFF', borderColor: isDark ? colors.palette.ink[700] : '#E2E8F0' }, shadows.lg]}>
              <View style={[styles.profileHeader, rowDirectionStyle(isRtl)]}>
                <View style={[styles.profileAvatar, { backgroundColor: colors.primary.light }]}>
                  {selectedRep.user.photoUrl ? (
                    <Image source={{ uri: selectedRep.user.photoUrl }} style={styles.avatarImg} />
                  ) : (
                    <Typography style={styles.avatarText}>{getInitials(selectedRep.user.name)}</Typography>
                  )}
                </View>
                <View style={[styles.profileTitle, textDirectionStyle(isRtl)]}>
                  <Typography style={[styles.profileName, { color: isDark ? '#F8FAFC' : '#0F172A' }, textDirectionStyle(isRtl)]}>
                    {selectedRep.user.name}
                  </Typography>
                  <Typography style={[styles.profileRole, { color: colors.text.secondary[isDark ? "dark" : "light"] }, textDirectionStyle(isRtl)]}>
                    {t(`Common.roles.${selectedRep.role}`)}
                  </Typography>
                </View>
                <Pressable accessibilityRole="button" accessibilityLabel={t('Common.close')} onPress={() => setSelectedRep(null)} style={styles.profileClose}>
                  <Icon name="x" color={isDark ? '#CBD5E1' : '#64748B'} size={20} />
                </Pressable>
              </View>

              <View style={styles.profileRows}>
                <ProfileRow
                  isDark={isDark}
                  isRtl={isRtl}
                  label={t('OrgChart.phone')}
                  value={selectedRep.user.phone ?? t('OrgChart.noContact')}
                />
                <ProfileRow
                  isDark={isDark}
                  isRtl={isRtl}
                  label={t('OrgChart.email')}
                  value={selectedRep.user.email ?? t('OrgChart.noContact')}
                />
              </View>

              {selectedRepLoading ? (
                <Typography style={styles.profileHint}>{t('OrgChart.loadingProfile')}</Typography>
              ) : null}
              {selectedRepError ? (
                <Typography style={styles.profileError}>{selectedRepError}</Typography>
              ) : null}
            </View>
          </View>
        ) : null}

      </View>
    </GestureHandlerRootView>
  );
};

function ProfileRow({ isDark, isRtl, label, value }: { isDark: boolean; isRtl: boolean; label: string; value: string }) {
  return (
    <View style={[styles.profileRow, textDirectionStyle(isRtl)]}>
      <Typography style={[styles.profileRowLabel, textDirectionStyle(isRtl)]}>{label}</Typography>
      <Typography numberOfLines={1} style={[styles.profileRowValue, { color: isDark ? '#F8FAFC' : '#0F172A' }, textDirectionStyle(isRtl)]}>
        {value}
      </Typography>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  canvasContainer: { flex: 1 },
  coordinateCanvas: {
    direction: 'ltr',
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  stateContainer: {
    padding: spacing.xl,
  },
  stateIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  stateTitle: {
    fontSize: 22,
    lineHeight: 30,
    fontWeight: "900",
    textAlign: "center",
  },
  stateCopy: {
    marginTop: spacing.sm,
    fontSize: 14,
    lineHeight: 22,
    fontWeight: "600",
    textAlign: "center",
  },
  retryButton: {
    minHeight: 48,
    minWidth: 140,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  retryText: {
    color: colors.text.inverse,
    fontSize: 14,
    fontWeight: "900",
  },
  canvas: { flex: 1, overflow: 'hidden' },
  nodeCard: { width: NODE_WIDTH, minHeight: NODE_HEIGHT, borderRadius: 18, borderWidth: 1.5, padding: 10, justifyContent: 'center' },
  nodeHeader: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImg: { width: '100%', height: '100%' },
  avatarText: { color: '#FFF', fontSize: 14, fontWeight: '900' },
  nodeCopy: { flex: 1, marginStart: 10, minWidth: 0 },
  nodeName: { fontSize: 12, lineHeight: 16, fontWeight: '900' },
  nodeLabel: { fontSize: 9, lineHeight: 12, fontWeight: '700', marginTop: 1 },
  roleBadge: { alignSelf: 'flex-start', maxWidth: "100%", paddingHorizontal: 7, paddingVertical: 3, borderRadius: radii.sm, marginTop: 6 },
  roleBadgeRtl: { alignSelf: 'flex-end' },
  roleText: { fontSize: 8, lineHeight: 11, fontWeight: '900', letterSpacing: 0.1 },
  collapseBtn: {
    marginTop: -10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...shadows.sm,
    zIndex: 10,
    minWidth: 36,
    alignItems: 'center',
  },
  collapseText: { fontSize: 10, fontWeight: '900' },
  profileSheet: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.lg,
  },
  profileCard: {
    borderRadius: 24,
    padding: spacing.lg,
    borderWidth: 1,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileAvatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  profileTitle: {
    flex: 1,
    marginStart: spacing.md,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '900',
  },
  profileRole: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '700',
  },
  profileClose: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileRows: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  profileRow: {
    borderRadius: 16,
    backgroundColor: 'rgba(148, 163, 184, 0.12)',
    padding: spacing.md,
  },
  profileRowLabel: {
    color: colors.text.secondary.light,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  profileRowValue: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: '700',
  },
  profileHint: {
    marginTop: spacing.sm,
    color: colors.text.secondary.light,
    fontSize: 12,
    fontWeight: '700',
  },
  profileError: {
    marginTop: spacing.sm,
    color: colors.error,
    fontSize: 12,
    fontWeight: '700',
  },
});
