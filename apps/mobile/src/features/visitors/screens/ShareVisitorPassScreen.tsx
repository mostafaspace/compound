import React, { useRef } from 'react';
import { View, StyleSheet, useColorScheme, Platform, Image, TouchableOpacity, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import ViewShot from 'react-native-view-shot';
import Share from 'react-native-share';
import QRCode from 'react-native-qrcode-svg';
import { RootStackParamList } from '../../../navigation/types';
import { useGetVisitorRequestQuery, useMarkAsSharedMutation } from '../../../services/property';
import { ScreenContainer } from '../../../components/layout/ScreenContainer';
import { Typography } from '../../../components/ui/Typography';
import { Button } from '../../../components/ui/Button';
import { colors, layout, spacing, shadows } from '../../../theme';
import { formatDate } from '../../../utils/formatters';
import { Icon } from '../../../components/ui/Icon';

type ShareVisitorPassRouteProp = RouteProp<RootStackParamList, 'ShareVisitorPass'>;

export const ShareVisitorPassScreen = () => {
  const { t } = useTranslation();
  const isDark = useColorScheme() === 'dark';
  const route = useRoute<ShareVisitorPassRouteProp>();
  const navigation = useNavigation<any>();
  const { visitorId } = route.params;
  const viewShotRef = useRef<ViewShot>(null);

  const { data: visitor, isLoading, error, refetch } = useGetVisitorRequestQuery(visitorId);
  const [markAsShared] = useMarkAsSharedMutation();
  const qrToken = visitor?.qrToken ?? null;

  React.useEffect(() => {
    // Retry once if the screen opens before the pass payload is available.
    const timer = setTimeout(() => {
      if (!visitor && !isLoading && !error) {
        refetch();
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [visitor, isLoading, error, visitorId, refetch]);

  if (isLoading) {
    return (
      <ScreenContainer style={styles.center}>
        <Typography>Loading pass details...</Typography>
      </ScreenContainer>
    );
  }

  if (error || !visitor) {
    return (
      <ScreenContainer style={styles.center}>
        <Typography variant="h3" style={{ marginBottom: spacing.md }}>Could not load pass</Typography>
        <Typography style={{ marginBottom: spacing.sm }}>There was an error retrieving the visitor pass details.</Typography>
        <Typography variant="caption" style={{ color: colors.error, marginBottom: layout.sectionGap, textAlign: 'center' }}>
          {error ? JSON.stringify(error) : 'Visitor not found'}
        </Typography>
        <Button title="Back to Dashboard" onPress={() => navigation.popToTop()} />
      </ScreenContainer>
    );
  }

  if (!qrToken) {
    return (
      <ScreenContainer style={styles.center}>
        <Typography variant="h3" style={{ marginBottom: spacing.md }}>
          {t("Visitors.passUnavailable", { defaultValue: "Pass unavailable" })}
        </Typography>
        <Typography style={{ marginBottom: layout.sectionGap, textAlign: 'center' }}>
          {t("Visitors.passUnavailableBody", {
            defaultValue: "This visitor pass does not have a QR token yet. Please refresh or regenerate the pass before sharing it.",
          })}
        </Typography>
        <Button
          title={t("Common.retry", { defaultValue: "Retry" })}
          onPress={() => refetch()}
          style={{ marginBottom: spacing.md }}
        />
        <Button
          variant="outline"
          title={t("Common.backToDashboard", "Back to Dashboard")}
          onPress={() => navigation.popToTop()}
        />
      </ScreenContainer>
    );
  }

  const handleShare = async () => {
    try {
      if (viewShotRef.current) {
        const uri = await (viewShotRef.current as any).capture({
          format: 'png',
          quality: 1.0,
          result: 'tmpfile',
          captureAllScrollableViews: true,
        });
        await Share.open({
          url: Platform.OS === 'android' ? 'file://' + uri : uri,
          title: 'Visitor Pass',
          message: `Here is your visitor pass for ${visitor.unit?.compoundName || 'our compound'}.`,
        });
        // Mark as shared after successful share
        await markAsShared(visitorId).unwrap();
      }
    } catch (err) {
      console.error("Error sharing pass", err);
    }
  };

  const cardStyle = [
    styles.card,
    {
      backgroundColor: isDark ? colors.surface.dark : colors.surface.light,
      borderColor: isDark ? colors.border.dark : colors.border.light,
    }
  ];

  const valueStyle = { color: isDark ? colors.text.primary.dark : colors.text.primary.light };
  const labelStyle = { color: '#718096' };

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <ViewShot
          ref={viewShotRef}
          options={{ format: "png", quality: 1.0, result: 'tmpfile' }}
          style={styles.viewShotContainer}
        >
          <View style={cardStyle}>
            {/* Header / Accent */}
            <View style={[styles.cardHeader, { backgroundColor: isDark ? colors.primary.dark : colors.primary.light }]}>
              <Typography variant="h3" style={{ color: isDark ? colors.text.primary.dark : '#FFF', fontSize: 22 }}>
                {visitor.unit?.compoundName || 'Compound Pass'}
              </Typography>
              <View style={[styles.vipBadge, { backgroundColor: colors.cta.light }]}>
                <Typography variant="caption" style={{ color: '#FFF', fontWeight: '800', letterSpacing: 0.5 }}>
                  VISITOR PASS
                </Typography>
              </View>
            </View>

            <View style={styles.cardBody}>
              {/* Visitor Photo if exists */}
              <View style={styles.photoSection}>
                <View style={[styles.visitorPhotoContainer, { borderColor: isDark ? colors.surface.dark : '#FFF' }]}>
                  {visitor.pictureUrl ? (
                    <Image source={{ uri: visitor.pictureUrl }} style={styles.visitorPhoto} />
                  ) : (
                    <View style={styles.photoPlaceholder}>
                      <Icon name="user" color={colors.text.secondary.light} size={24} />
                    </View>
                  )}
                </View>
              </View>

              {/* Name Display */}
              <View style={styles.nameHeader}>
                <Typography variant="h2" style={[valueStyle, { fontSize: 26 }]}>{visitor.visitorName}</Typography>
                <Typography variant="caption" style={labelStyle}>{t("Visitors.authorizedGuest", "Authorized Guest")}</Typography>
              </View>

              {/* QR Code */}
              <View style={[styles.qrContainer, { backgroundColor: isDark ? '#1a202c' : '#f8fafc' }]}>
                <QRCode
                  value={qrToken}
                  size={180}
                  backgroundColor="transparent"
                  color={isDark ? '#FFF' : colors.primary.light}
                />
              </View>

              <View style={styles.divider}>
                <View style={styles.dot} />
                <View style={styles.dashLine} />
                <View style={styles.dot} />
              </View>

              {/* Details Grid */}
              <View style={styles.detailsGrid}>
                <View style={styles.detailRow}>
                  <View style={styles.detailCol}>
                    <Typography variant="caption" style={labelStyle}>{t("Visitors.unit", "Unit")}</Typography>
                    <Typography variant="body" style={[styles.bold, valueStyle]}>
                      {visitor.unit?.buildingName ? `${visitor.unit.buildingName} - ` : ''}{visitor.unit?.unitNumber}
                    </Typography>
                  </View>
                  <View style={styles.detailCol}>
                    <Typography variant="caption" style={labelStyle}>{t("Visitors.host", "Host")}</Typography>
                    <Typography variant="body" style={[styles.bold, valueStyle]}>{visitor.host?.name || 'Resident'}</Typography>
                  </View>
                </View>

                <View style={styles.detailRow}>
                  <View style={styles.detailCol}>
                    <Typography variant="caption" style={labelStyle}>{t("Visitors.guestsCount", "Guests")}</Typography>
                    <Typography variant="body" style={[styles.bold, valueStyle]}>{visitor.numberOfVisitors || 1}</Typography>
                  </View>
                  <View style={styles.detailCol}>
                    <Typography variant="caption" style={labelStyle}>{t("Visitors.validUntil", "Valid Until")}</Typography>
                    <Typography variant="body" style={[styles.bold, valueStyle]}>{formatDate(visitor.visitEndsAt)}</Typography>
                  </View>
                </View>
              </View>

              <View style={styles.footerNote}>
                <Typography variant="caption" style={{ color: colors.primary.light, textAlign: 'center', fontWeight: '600' }}>
                  Please present this QR code at the gate for entry.
                </Typography>
              </View>
            </View>
          </View>
        </ViewShot>

        <View style={styles.actions}>
          <Button
            title={t("Common.share", "Share Invitation")}
            onPress={handleShare}
            style={styles.shareButton}
          />
          <Button
            variant="outline"
            title={t("Common.backToDashboard", "Back to Dashboard")}
            onPress={() => navigation.popToTop()}
            style={styles.doneButton}
          />
        </View>
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.xxl,
    alignItems: 'center',
  },
  cardWrapper: {
    width: '100%',
    marginBottom: layout.sectionGap,
  },
  viewShotContainer: {
    width: '100%',
    alignItems: 'center',
    backgroundColor: 'transparent',
    padding: 10,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 32,
    borderWidth: 1,
    overflow: 'hidden',
    ...shadows.premium,
  },
  cardHeader: {
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  vipBadge: {
    backgroundColor: '#FFF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: spacing.sm,
  },
  cardBody: {
    padding: spacing.xl,
    alignItems: 'center',
    marginTop: -20,
  },
  photoSection: {
    marginBottom: spacing.lg,
  },
  visitorPhotoContainer: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 4,
    backgroundColor: '#f8fafc',
    overflow: 'hidden',
    ...shadows.md,
  },
  visitorPhoto: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrContainer: {
    padding: spacing.xl,
    borderRadius: 24,
    marginBottom: layout.sectionGap,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    ...shadows.sm,
  },
  nameHeader: {
    alignItems: 'center',
    marginBottom: layout.sectionGap,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: layout.sectionGap,
    paddingHorizontal: spacing.md,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.background.light,
    marginHorizontal: -6,
  },
  dashLine: {
    flex: 1,
    height: 1,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    borderStyle: 'dashed',
  },
  detailsGrid: {
    width: '100%',
    paddingHorizontal: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  detailCol: {
    flex: 1,
  },
  bold: {
    fontWeight: '700',
    marginTop: 4,
    fontSize: 16,
  },
  footerNote: {
    marginTop: spacing.md,
    paddingTop: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    width: '100%',
  },
  actions: {
    width: '100%',
    marginTop: layout.sectionGap,
    paddingHorizontal: spacing.md,
  },
  shareButton: {
    marginBottom: spacing.md,
  },
  doneButton: {
    height: 50,
  }
});
