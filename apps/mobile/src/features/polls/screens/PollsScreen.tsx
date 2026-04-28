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
import { colors, spacing } from '../../../theme';
import { Typography } from '../../../components/ui/Typography';
import { ScreenContainer } from '../../../components/layout/ScreenContainer';
import type { RootStackParamList } from '../../../navigation/types';
import type { Poll } from '@compound/contracts';

type PollsNavProp = NavigationProp<RootStackParamList>;

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  draft: { bg: '#fef3c7', text: '#92400e' },
  active: { bg: '#d1fae5', text: '#065f46' },
  closed: { bg: '#dbeafe', text: '#1e40af' },
  archived: { bg: '#f3f4f6', text: '#6b7280' },
};

export const PollsScreen = () => {
  const isDark = useColorScheme() === 'dark';
  const navigation = useNavigation<PollsNavProp>();

  const { data: polls = [], isLoading, refetch } = useGetPollsQuery();

  const renderPollItem = ({ item }: { item: Poll }) => {
    const statusColor = STATUS_COLORS[item.status] ?? STATUS_COLORS.draft;

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
          <View style={[styles.statusBadge, { backgroundColor: statusColor.bg }]}>
            <Typography
              variant="caption"
              style={[styles.statusText, { color: statusColor.text }]}
            >
              {item.status}
            </Typography>
          </View>
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

        <Typography variant="h3" style={styles.title}>
          {item.title}
        </Typography>

        {item.description ? (
          <Typography
            variant="body"
            style={[
              styles.description,
              { color: isDark ? '#9ca3af' : '#6b7280' },
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
            style={{ color: isDark ? '#9ca3af' : '#6b7280' }}
          >
            {item.eligibility.replace(/_/g, ' ')}
          </Typography>
          <Typography
            variant="caption"
            style={{ color: isDark ? '#9ca3af' : '#6b7280' }}
          >
            {item.votesCount ?? 0} votes
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
    padding: spacing.md,
    flexGrow: 1,
  },
  card: {
    padding: spacing.lg,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
    flexWrap: 'wrap',
  },
  statusBadge: {
    borderRadius: 100,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  statusText: {
    fontWeight: '700',
    textTransform: 'capitalize',
    fontSize: 11,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 8,
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
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xl,
  },
});
