import React from 'react';
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
import { colors, layout, radii, shadows, spacing } from '../../../theme';
import { Typography } from '../../../components/ui/Typography';
import { ScreenContainer } from '../../../components/layout/ScreenContainer';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { pollStatusPalette } from '../../../theme/semantics';
import type { RootStackParamList } from '../../../navigation/types';
import type { Poll } from '@compound/contracts';
import { Icon } from '../../../components/ui/Icon';

type PollsNavProp = NavigationProp<RootStackParamList>;

export const PollsScreen = () => {
  const isDark = useColorScheme() === 'dark';
  const navigation = useNavigation<PollsNavProp>();

  const { data: polls = [], isLoading, refetch } = useGetPollsQuery();
  const mutedText = isDark ? colors.text.secondary.dark : colors.text.secondary.light;

  const renderPollItem = ({ item }: { item: Poll }) => {
    const statusColor = pollStatusPalette(item.status);

    return (
      <Pressable
        onPress={() => navigation.navigate('PollDetail', { pollId: item.id })}
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: isDark ? colors.surface.dark : colors.surface.light,
            borderColor: isDark ? colors.border.dark : colors.border.light,
            opacity: pressed ? 0.85 : 1,
          },
        ]}
      >
        {/* Header row: status badge + poll type chip */}
        <View style={styles.cardHeader}>
          <View style={styles.titleRow}>
            <View style={styles.iconBadge}>
              <Icon name="polls" color={colors.primary.light} size={20} />
            </View>
            <View style={styles.titleBlock}>
              <Typography variant="h3" style={styles.title}>
                {item.title}
              </Typography>
              <View style={styles.badgeRow}>
                <StatusBadge
                  label={item.status}
                  backgroundColor={statusColor.background}
                  textColor={statusColor.text}
                />
                {item.pollType ? (
                  <View
                    style={[
                      styles.typeBadge,
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
              { color: isDark ? colors.text.secondary.dark : colors.text.secondary.light },
            ]}
            numberOfLines={2}
          >
            {item.description}
          </Typography>
        ) : null}

        {/* Footer: eligibility + votes */}
        <View style={styles.cardFooter}>
          <Typography
            variant="caption"
            style={{ color: mutedText }}
          >
            {item.eligibility.replace(/_/g, ' ')}
          </Typography>
          <Typography
            variant="caption"
            style={{ color: mutedText }}
          >
            {item.votesCount ?? 0} votes
          </Typography>
        </View>
      </Pressable>
    );
  };

  return (
    <ScreenContainer withKeyboard={false} style={styles.container} edges={['left', 'right', 'bottom']}>
      <FlatList
        data={polls}
        keyExtractor={(item) => item.id}
        renderItem={renderPollItem}
        refreshing={isLoading}
        onRefresh={refetch}
        ListEmptyComponent={
          <View style={styles.center}>
            <Typography variant="caption">
              {isLoading ? 'Loading…' : 'No polls available.'}
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
    padding: 0,
  },
  listContent: {
    padding: layout.screenGutter,
    paddingBottom: layout.screenBottom,
    flexGrow: 1,
  },
  card: {
    padding: layout.cardPadding,
    borderRadius: radii.xl,
    borderWidth: 1,
    marginBottom: layout.listGap,
    ...shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  titleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
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
    marginBottom: spacing.sm,
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
