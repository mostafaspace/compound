import React from 'react';
import { View, StyleSheet, FlatList, useColorScheme, Image } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useGetAnnouncementsQuery, useAcknowledgeAnnouncementMutation } from '../../../services/property';
import { colors, layout, radii, shadows, spacing } from '../../../theme';
import { Button } from '../../../components/ui/Button';
import { Typography } from '../../../components/ui/Typography';
import { ScreenContainer } from '../../../components/layout/ScreenContainer';
import { formatDate } from '../../../utils/formatters';
import { useSelector } from 'react-redux';
import { selectCurrentToken, selectCurrentUser } from '../../../store/authSlice';
import { getEffectiveRoleType } from '@compound/contracts';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../../navigation/types';
import { Icon } from '../../../components/ui/Icon';
import { isRtlLanguage, rowDirectionStyle, textDirectionStyle } from '../../../i18n/direction';
import { defaultApiBaseUrl } from '../../../services/api';

const apiOrigin = defaultApiBaseUrl.replace(/\/api\/v1\/?$/, '');

function localizedText(value: any, language: string): string {
  if (typeof value === 'string') return value;
  if (!value) return '';
  return language === 'ar' ? value.ar || value.en || '' : value.en || value.ar || '';
}

function attachmentUri(attachment: any): string | null {
  const raw = attachment?.downloadUrl ?? attachment?.url;
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  return `${apiOrigin}/${String(raw).replace(/^\/+/, '')}`;
}

function isPhotoAttachment(attachment: any): boolean {
  const uri = attachmentUri(attachment);
  return Boolean(
    attachment?.mimeType?.startsWith?.('image/') ||
    uri?.match(/\.(jpg|jpeg|png|webp|gif|heic|heif)(\?|$)/i),
  );
}

export const AnnouncementsScreen = () => {
  const { t, i18n } = useTranslation();
  const isDark = useColorScheme() === 'dark';
  const isRtl = isRtlLanguage(i18n.language);
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

  const user = useSelector(selectCurrentUser);
  const token = useSelector(selectCurrentToken);
  const roleType = getEffectiveRoleType(user);
  const isAdmin = roleType === 'admin';

  const { data: announcements = [], isLoading, refetch } = useGetAnnouncementsQuery();
  const [acknowledge, { isLoading: isAcknowledging }] = useAcknowledgeAnnouncementMutation();

  const renderPhoto = ({ item: attachment, index }: { item: any; index: number }) => {
    const uri = attachmentUri(attachment);
    if (!uri) return null;

    return (
      <Image
        key={attachment.id ?? `${uri}-${index}`}
        source={{
          uri,
          headers: attachment.downloadUrl && token ? { Authorization: `Bearer ${token}` } : undefined,
        }}
        style={styles.announcementPhoto}
        resizeMode="cover"
      />
    );
  };

  const renderItem = ({ item }: { item: any }) => {
    const title = localizedText(item.title, i18n.language);
    const body = localizedText(item.body ?? item.content, i18n.language);
    const photos = (item.attachments ?? []).filter(isPhotoAttachment);

    return (
      <View style={[styles.card, { backgroundColor: isDark ? colors.surface.dark : colors.surface.light, borderColor: isDark ? colors.border.dark : colors.border.light }]}>
        {photos.length > 0 && (
          <FlatList
            data={photos}
            keyExtractor={(attachment, index) => String(attachment.id ?? attachmentUri(attachment) ?? index)}
            renderItem={renderPhoto}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[styles.photoStrip, rowDirectionStyle(isRtl)]}
          />
        )}
        <View style={[styles.titleRow, rowDirectionStyle(isRtl)]}>
          <View style={styles.iconBadge}>
            <Icon name="announcements" color={colors.primary.light} size={20} />
          </View>
          <Typography variant="h3" style={[styles.title, textDirectionStyle(isRtl)]}>{title}</Typography>
        </View>
        <Typography variant="body" style={[styles.content, textDirectionStyle(isRtl)]}>{body}</Typography>
        <View style={[styles.footer, rowDirectionStyle(isRtl)]}>
          <Typography variant="caption" style={textDirectionStyle(isRtl)}>{formatDate(item.publishedAt ?? item.createdAt, i18n.language === 'ar' ? 'ar-EG' : 'en-US')}</Typography>
          {item.category && (
            <View style={styles.categoryBadge}>
              <Typography variant="label" style={[styles.categoryText, textDirectionStyle(isRtl)]}>{t(`Announcements.categories.${item.category}`, { defaultValue: item.category })}</Typography>
            </View>
          )}
        </View>

        {!item.acknowledgedAt && (item.requiresAcknowledgement || item.mustAcknowledge) && (
          <Button
            title={t("Announcements.acknowledge")}
            onPress={() => acknowledge(item.id)}
            loading={isAcknowledging}
            style={styles.ackButton}
          />
        )}
      </View>
    );
  };

  return (
    <ScreenContainer withKeyboard={false} style={styles.container}>
      <FlatList
        data={announcements}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        refreshing={isLoading}
        onRefresh={refetch}
        ListEmptyComponent={
          <View style={styles.center}>
            <Typography variant="caption">
              {isLoading ? t("Common.loading") : t("Announcements.empty")}
            </Typography>
          </View>
        }
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: isAdmin ? layout.screenBottom + 72 : layout.screenBottom },
        ]}
      />
      {isAdmin && (
        <View style={styles.fabContainer}>
          <Button
            title={t("Announcements.create")}
            onPress={() => navigation.navigate('CreateAnnouncement' as any)}
            style={styles.fab}
            leftIcon="plus"
          />
        </View>
      )}
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 0,
  },
  listContent: {
    padding: layout.screenGutter,
  },
  card: {
    padding: layout.cardPadding,
    borderRadius: radii.xl,
    borderWidth: 1,
    marginBottom: layout.listGap,
    ...shadows.sm,
  },
  photoStrip: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  announcementPhoto: {
    width: 280,
    height: 140,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceMuted.light,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted.light,
  },
  title: {
    flex: 1,
  },
  content: {
    color: colors.text.secondary.light,
    lineHeight: 22,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: colors.surfaceMuted.light,
    borderRadius: radii.sm,
  },
  categoryText: {
    fontSize: 10,
    color: colors.text.secondary.light,
  },
  ackButton: {
    marginTop: spacing.md,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  fabContainer: {
    position: 'absolute',
    bottom: layout.fabInset,
    end: layout.fabInset,
    start: layout.fabInset,
  },
  fab: {
    borderRadius: radii.lg,
  }
});
