import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  useColorScheme,
  Pressable,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { useGetPollsQuery } from '../../../services/polls';
import { useTranslation } from 'react-i18next';
import { colors, layout, radii, shadows, spacing } from '../../../theme';
import { Typography } from '../../../components/ui/Typography';
import { ScreenContainer } from '../../../components/layout/ScreenContainer';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { pollStatusPalette } from '../../../theme/semantics';
import type { RootStackParamList } from '../../../navigation/types';
import type { Poll } from '@compound/contracts';
import { Icon } from '../../../components/ui/Icon';
import { isRtlLanguage, rowDirectionStyle, textDirectionStyle } from '../../../i18n/direction';

type PollsNavProp = NavigationProp<RootStackParamList>;

export const PollsScreen = () => {
  const { t, i18n } = useTranslation();
  const isDark = useColorScheme() === 'dark';
  const isRtl = isRtlLanguage(i18n.language);
  const navigation = useNavigation<PollsNavProp>();
  const [page, setPage] = useState(1);
  const [polls, setPolls] = useState<Poll[]>([]);

  const { data: pollPage, isFetching, isLoading, refetch } = useGetPollsQuery({ page, perPage: 20 });
  const mutedText = isDark ? colors.text.secondary.dark : colors.text.secondary.light;
  const hasMore = Boolean(pollPage && pollPage.meta.current_page < pollPage.meta.last_page);

  useEffect(() => {
    if (!pollPage) {
      return;
    }

    setPolls((current) => {
      if (pollPage.meta.current_page === 1) {
        return pollPage.data;
      }

      const next = [...current];
      const seenIds = new Set<string>();
      for (let index = 0; index < current.length; index += 1) {
        seenIds.add(current[index].id);
      }
      for (let index = 0; index < pollPage.data.length; index += 1) {
        const poll = pollPage.data[index];
        if (!seenIds.has(poll.id)) {
          next.push(poll);
        }
      }

      return next;
    });
  }, [pollPage]);

  const refreshPolls = () => {
    if (page === 1) {
      void refetch();
      return;
    }

    setPage(1);
  };

  const loadMorePolls = () => {
    if (!hasMore || isFetching) {
      return;
    }

    setPage((current) => current + 1);
  };

  const renderPollItem = ({ item }: { item: Poll }) => {
    const statusColor = pollStatusPalette(item.status);

    return (
      <Pressable
        accessibilityHint={t('Polls.openDetailHint', { defaultValue: 'Opens poll details and voting options.' })}
        accessibilityLabel={t('Polls.openDetailLabel', { title: item.title, defaultValue: `Open poll ${item.title}` })}
        accessibilityRole="button"
        onPress={() => navigation.navigate('PollDetail', { pollId: item.id })}
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: isDark ? colors.surface.dark : colors.surface.light,
            borderColor: isDark ? colors.border.dark : colors.border.light,
            opacity: pressed ? 0.85 : 1,
          },
        ]}
        testID={`poll-card-${item.id}`}
      >
        {/* Header row: status badge + poll type chip */}
        <View style={[styles.cardHeader, rowDirectionStyle(isRtl)]}>
          <View style={[styles.titleRow, rowDirectionStyle(isRtl)]}>
            <View style={styles.iconBadge}>
              <Icon name="polls" color={colors.primary.light} size={20} />
            </View>
            <View style={styles.titleBlock}>
              <Typography variant="h3" style={[styles.title, textDirectionStyle(isRtl)]}>
                {item.title}
              </Typography>
              <View style={[styles.badgeRow, rowDirectionStyle(isRtl)]}>
                <StatusBadge
                  label={t(`Common.statuses.${item.status}`)}
                  backgroundColor={statusColor.background}
                  textColor={statusColor.text}
                />
                {item.pollType ? (
                  <View
                    style={[
                      styles.typeBadge,
                      rowDirectionStyle(isRtl),
                      { backgroundColor: item.pollType.color + '22' },
                    ]}
                  >
                    <View
                      style={[
                        styles.typeDot,
                        { backgroundColor: item.pollType.color },
                      ]}
                    />
                    <Typography
                      variant="caption"
                      style={[styles.typeText, { color: item.pollType.color }]}
                    >
                      {item.pollType.name}
                    </Typography>
                  </View>
                ) : null}
              </View>
            </View>
          </View>
        </View>

        {item.description ? (
          <Typography
            variant="body"
            style={[
              styles.description,
              textDirectionStyle(isRtl),
              { color: isDark ? colors.text.secondary.dark : colors.text.secondary.light },
            ]}
            numberOfLines={2}
          >
            {item.description}
          </Typography>
        ) : null}

        {/* Footer: eligibility + votes */}
        <View style={[styles.cardFooter, rowDirectionStyle(isRtl)]}>
          <Typography
            variant="caption"
            style={[{ color: mutedText }, textDirectionStyle(isRtl)]}
          >
            {t(`Polls.eligibility_${item.eligibility}`, { defaultValue: item.eligibility.replace(/_/g, ' ') })}
          </Typography>
          <Typography
            variant="caption"
            style={[{ color: mutedText }, textDirectionStyle(isRtl)]}
          >
            {t('Polls.votes', { count: item.votesCount ?? 0 })}
          </Typography>
        </View>
      </Pressable>
    );
  };

  return (
    <ScreenContainer withKeyboard={false} style={styles.container}>
      <FlatList
        data={polls}
        keyExtractor={(item) => item.id}
        renderItem={renderPollItem}
        refreshing={isLoading || (isFetching && page === 1)}
        onRefresh={refreshPolls}
        onEndReached={loadMorePolls}
        onEndReachedThreshold={0.6}
        ListEmptyComponent={
          <View style={styles.center}>
            <Typography variant="caption" style={textDirectionStyle(isRtl)}>
              {isLoading ? t('Common.loading') : t('Polls.empty')}
            </Typography>
          </View>
        }
        contentContainerStyle={styles.listContent}
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 0,
    paddingTop: 0,
  },
  listContent: {
    paddingHorizontal: layout.screenGutter,
    paddingTop: spacing.sm,
    paddingBottom: layout.screenBottom,
    flexGrow: 1,
  },
  card: {
    padding: spacing.ms,
    borderRadius: radii.lg,
    borderWidth: 1,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  titleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted.light,
  },
  titleBlock: {
    flex: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  typeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  typeText: {
    fontWeight: '600',
    fontSize: 11,
  },
  title: {
    marginBottom: spacing.xs,
  },
  description: {
    marginBottom: spacing.xs,
    lineHeight: 20,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
    gap: spacing.md,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xl,
  },
});
