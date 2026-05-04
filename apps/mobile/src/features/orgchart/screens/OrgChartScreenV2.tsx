import React, { useState, useMemo, useCallback, useRef } from 'react';
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
import { colors, spacing, shadows } from '../../../theme';
import { Typography } from '../../../components/ui/Typography';

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

const AVATAR_COLORS = ['#4F46E5', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#06B6D4', '#EC4899', '#6366F1'];

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

// ─── Main Screen Component ─────────────────────────────────────────────────────

export const OrgChartScreen = ({ navigation }: any) => {
  const { t } = useTranslation();
  const isDark = useColorScheme() === 'dark';
  const currentUser = useSelector(selectCurrentUser);
  const compoundId = currentUser?.compoundId || (currentUser as any)?.memberships?.[0]?.compoundId || '';
  
  // 1. Data Hooks
  const { data, isLoading } = useGetOrgChartQuery(compoundId, { skip: !compoundId });
  const [fetchPersonDetail] = useLazyGetOrgChartPersonDetailQuery();

  // 2. State Hooks
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const [selectedRep, setSelectedRep] = useState<OrgChartRepresentative | null>(null);
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
      const isCollapsed = collapsedIds.has(b.id);
      
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
  }, [data, collapsedIds, t]);

  // 6. Interaction Handlers
  const toggleCollapse = useCallback((id: string) => {
    setCollapsedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

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
  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: isDark ? '#020617' : '#F8FAFC' }]}>
        <ActivityIndicator color={colors.primary.light} size="large" />
      </View>
    );
  }

  const { nodes, links } = layoutData;
  const centerX = containerLayout.width / 2;

  return (
    <GestureHandlerRootView style={styles.container}>
      <View 
        style={[styles.canvasContainer, { backgroundColor: isDark ? '#020617' : '#F8FAFC' }]} 
        onLayout={(e) => setContainerLayout(e.nativeEvent.layout)}
      >
        <TapGestureHandler
          ref={doubleTapRef}
          numberOfTaps={2}
          onHandlerStateChange={onDoubleTap}
        >
          <Animated.View style={styles.container}>
            <PinchGestureHandler
              ref={pinchRef}
              simultaneousHandlers={panRef}
              onGestureEvent={onPinchEvent}
              onHandlerStateChange={onPinchStateChange}
            >
              <Animated.View style={styles.container}>
                <PanGestureHandler
                  ref={panRef}
                  simultaneousHandlers={pinchRef}
                  onGestureEvent={onPanEvent}
                  onHandlerStateChange={onPanStateChange}
                >
                  <Animated.View style={styles.canvas}>
                {/* The main coordinate system. Transformed by gestures + initial centerX */}
                <Animated.View style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  width: 1, // Pivot point
                  height: 1,
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
                      const badge = ROLE_BADGE[node.role] || { bg: "#F9FAFB", text: "#4B5563", border: "#E5E7EB" };
                      const hasChildren = node._allChildren && node._allChildren.length > 0;
                      
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
                            onPress={() => !node.isVacant && setSelectedRep(node.rep)}
                            style={[
                              styles.nodeCard,
                              {
                                backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                                borderColor: node.isVacant ? '#E2E8F0' : (isDark ? '#334155' : '#F1F5F9'),
                                borderStyle: node.isVacant ? 'dashed' : 'solid',
                              },
                              !node.isVacant && shadows.md
                            ]}
                          >
                            <View style={styles.nodeHeader}>
                              <View style={[styles.avatar, { backgroundColor: node.isVacant ? '#F1F5F9' : AVATAR_COLORS[i % 8] }]}>
                                {node.rep?.user.photoUrl ? (
                                  <Image source={{ uri: node.rep.user.photoUrl }} style={styles.avatarImg} />
                                ) : (
                                  <Typography style={[styles.avatarText, node.isVacant && { color: '#94A3B8' }]}>
                                    {node.isVacant ? '👤' : getInitials(node.name)}
                                  </Typography>
                                )}
                              </View>
                              <View style={{ flex: 1, marginLeft: 10 }}>
                                <Typography numberOfLines={1} style={[styles.nodeName, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>
                                  {node.name}
                                </Typography>
                                <Typography numberOfLines={1} style={styles.nodeLabel}>
                                  {node.label}
                                </Typography>
                              </View>
                            </View>
                            <View style={[styles.roleBadge, { backgroundColor: badge.bg, borderColor: badge.border, borderWidth: 1 }]}>
                              <Typography style={[styles.roleText, { color: badge.text }]}>
                                {t(`Common.roles.${node.role}`).toUpperCase()}
                              </Typography>
                            </View>
                          </Pressable>

                          {hasChildren && (
                            <Pressable 
                              onPress={() => toggleCollapse(node.id)}
                              style={[styles.collapseBtn, { backgroundColor: isDark ? '#334155' : '#FFF' }]}
                            >
                              <Typography style={styles.collapseText}>
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

      </View>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  canvasContainer: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  canvas: { flex: 1, overflow: 'hidden' },
  nodeCard: { width: NODE_WIDTH, height: NODE_HEIGHT, borderRadius: 18, borderWidth: 1.5, padding: 10, justifyContent: 'center' },
  nodeHeader: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImg: { width: '100%', height: '100%' },
  avatarText: { color: '#FFF', fontSize: 14, fontWeight: '900' },
  nodeName: { fontSize: 12, fontWeight: '900' },
  nodeLabel: { fontSize: 8, color: '#64748B', fontWeight: '700', marginTop: 1 },
  roleBadge: { alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6, marginTop: 6 },
  roleText: { fontSize: 7, fontWeight: '900', letterSpacing: 0.5 },
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
  collapseText: { fontSize: 10, fontWeight: '900', color: '#64748B' },
});
