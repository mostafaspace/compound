import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Animated,
  Pressable,
  useColorScheme,
  Text,
} from 'react-native';
import type { RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import {
  useGetPollQuery,
  useGetPollEligibilityQuery,
  useCastPollVoteMutation,
} from '../../../services/polls';
import { colors, spacing } from '../../../theme';
import { Typography } from '../../../components/ui/Typography';
import { Button } from '../../../components/ui/Button';
import { ScreenContainer } from '../../../components/layout/ScreenContainer';
import type { RootStackParamList } from '../../../navigation/types';
import type { PollOption } from '@compound/contracts';

type PollDetailRouteProp = RouteProp<RootStackParamList, 'PollDetail'>;
type PollDetailNavProp = StackNavigationProp<RootStackParamList, 'PollDetail'>;

interface Props {
  route: PollDetailRouteProp;
  navigation: PollDetailNavProp;
}

// Animated bar for a single option
const AnimatedBar = ({
  pct,
  isDark,
  selected,
}: {
  pct: number;
  isDark: boolean;
  selected: boolean;
}) => {
  const widthAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: pct,
      duration: 600,
      useNativeDriver: false,
    }).start();
  }, [pct]);

  return (
    <View
      style={[
        styles.barTrack,
        { backgroundColor: isDark ? '#374151' : '#e5e7eb' },
      ]}
    >
      <Animated.View
        style={[
          styles.barFill,
          {
            backgroundColor: selected ? colors.primary.dark : (isDark ? '#6b7280' : '#9ca3af'),
            width: widthAnim.interpolate({
              inputRange: [0, 100],
              outputRange: ['0%', '100%'],
            }),
          },
        ]}
      />
    </View>
  );
};

export const PollDetailScreen = ({ route, navigation }: Props) => {
  const { pollId } = route.params;
  const isDark = useColorScheme() === 'dark';

  const { data: poll, isLoading, refetch } = useGetPollQuery(pollId);
  const { data: eligibility } = useGetPollEligibilityQuery(pollId, {
    skip: !poll || poll.status !== 'active',
  });
  const [castVote, { isLoading: isCasting }] = useCastPollVoteMutation();

  const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const isActive = poll?.status === 'active';
  const hasVoted = poll?.hasVoted ?? eligibility?.hasVoted ?? false;
  const isEligible = eligibility?.eligible ?? false;
  const allowMultiple = poll?.allowMultiple ?? false;
  const maxChoices = poll?.maxChoices ?? null;

  const options: PollOption[] = poll?.options ?? [];
  const totalVotes = poll?.votesCount ?? 0;

  const toggleOption = (optionId: string) => {
    if (!allowMultiple) {
      setSelectedOptionIds([optionId]);
      return;
    }
    setSelectedOptionIds((prev) => {
      if (prev.includes(optionId)) {
        return prev.filter((id) => id !== optionId);
      }
      if (maxChoices && prev.length >= maxChoices) return prev;
      return [...prev, optionId];
    });
  };

  const handleVote = async () => {
    if (selectedOptionIds.length === 0) return;
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await castVote({ pollId, optionIds: selectedOptionIds }).unwrap();
      setSuccessMsg('Your vote has been recorded!');
      setSelectedOptionIds([]);
      refetch();
    } catch (err: any) {
      setErrorMsg(err?.data?.message ?? 'Failed to cast vote. Please try again.');
    }
  };

  const pct = (count: number) => {
    if (totalVotes === 0) return 0;
    return Math.round((count / totalVotes) * 100);
  };

  if (isLoading || !poll) {
    return (
      <ScreenContainer withKeyboard={false}>
        <View style={styles.center}>
          <Typography variant="caption">Loading…</Typography>
        </View>
      </ScreenContainer>
    );
  }

  const showResults = hasVoted || !isActive;

  return (
    <ScreenContainer withKeyboard={false} style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Back button */}
        <Pressable onPress={() => navigation.goBack()} style={styles.backRow}>
          <Typography
            variant="caption"
            style={{ color: colors.primary.dark, fontWeight: '700' }}
          >
            ← Back
          </Typography>
        </Pressable>

        {/* Title + status */}
        <Typography variant="h2" style={styles.title}>
          {poll.title}
        </Typography>

        {poll.description ? (
          <Typography
            variant="body"
            style={[styles.description, { color: isDark ? '#9ca3af' : '#6b7280' }]}
          >
            {poll.description}
          </Typography>
        ) : null}

        <View style={styles.metaRow}>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: STATUS_COLORS[poll.status]?.bg ?? '#f3f4f6' },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                { color: STATUS_COLORS[poll.status]?.text ?? '#6b7280' },
              ]}
            >
              {poll.status}
            </Text>
          </View>
          {allowMultiple ? (
            <Typography variant="caption" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
              Multi-choice{maxChoices ? ` (max ${maxChoices})` : ''}
            </Typography>
          ) : null}
          <Typography variant="caption" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
            {totalVotes} votes
          </Typography>
        </View>

        {/* Success / Error banners */}
        {successMsg ? (
          <View style={styles.successBanner}>
            <Typography variant="body" style={{ color: '#065f46', fontWeight: '600' }}>
              {successMsg}
            </Typography>
          </View>
        ) : null}
        {errorMsg ? (
          <View style={styles.errorBanner}>
            <Typography variant="body" style={{ color: '#991b1b', fontWeight: '600' }}>
              {errorMsg}
            </Typography>
          </View>
        ) : null}

        {/* Options */}
        <View
          style={[
            styles.optionsCard,
            {
              backgroundColor: isDark ? colors.surface.dark : colors.surface.light,
              borderColor: isDark ? colors.border.dark : colors.border.light,
            },
          ]}
        >
          <Typography variant="h3" style={styles.optionsTitle}>
            {showResults ? 'Results' : 'Options'}
          </Typography>
          {options.length === 0 ? (
            <Typography variant="caption">No options available.</Typography>
          ) : (
            options.map((opt) => {
              const optPct = pct(opt.votesCount);
              const isSelected = selectedOptionIds.includes(String(opt.id));
              const userVoted =
                poll.userVoteOptionIds?.includes(String(opt.id)) ?? false;

              return (
                <Pressable
                  key={opt.id}
                  onPress={() => {
                    if (!showResults && isEligible && isActive) {
                      toggleOption(String(opt.id));
                    }
                  }}
                  style={[
                    styles.optionRow,
                    isSelected && styles.optionRowSelected,
                    {
                      borderColor: isSelected
                        ? colors.primary.dark
                        : isDark
                        ? colors.border.dark
                        : colors.border.light,
                    },
                  ]}
                >
                  <View style={styles.optionTop}>
                    <View style={styles.optionLabelRow}>
                      {/* Selection indicator */}
                      <View
                        style={[
                          styles.optionIndicator,
                          allowMultiple ? styles.checkbox : styles.radio,
                          isSelected || userVoted
                            ? { backgroundColor: colors.primary.dark, borderColor: colors.primary.dark }
                            : {
                                borderColor: isDark ? '#6b7280' : '#d1d5db',
                                backgroundColor: 'transparent',
                              },
                        ]}
                      >
                        {(isSelected || userVoted) ? (
                          <Text style={styles.checkmark}>
                            {allowMultiple ? '✓' : '•'}
                          </Text>
                        ) : null}
                      </View>
                      <Typography
                        variant="body"
                        style={[
                          styles.optionLabel,
                          (isSelected || userVoted) && { fontWeight: '700' },
                        ]}
                      >
                        {opt.label}
                      </Typography>
                    </View>
                    {showResults ? (
                      <Typography
                        variant="caption"
                        style={{ color: isDark ? '#9ca3af' : '#6b7280', minWidth: 50, textAlign: 'right' }}
                      >
                        {opt.votesCount} ({optPct}%)
                      </Typography>
                    ) : null}
                  </View>

                  {showResults ? (
                    <AnimatedBar
                      pct={optPct}
                      isDark={isDark}
                      selected={userVoted}
                    />
                  ) : null}
                </Pressable>
              );
            })
          )}
        </View>

        {/* Vote action */}
        {isActive && !hasVoted && isEligible ? (
          <Button
            title={isCasting ? 'Submitting…' : 'Submit Vote'}
            onPress={handleVote}
            disabled={selectedOptionIds.length === 0 || isCasting}
            loading={isCasting}
            style={styles.voteButton}
          />
        ) : isActive && !hasVoted && eligibility && !isEligible ? (
          <View style={styles.ineligibleBox}>
            <Typography variant="body" style={styles.ineligibleText}>
              You are not eligible to vote in this poll.
            </Typography>
          </View>
        ) : isActive && hasVoted ? (
          <View style={styles.votedBox}>
            <Typography variant="body" style={styles.votedText}>
              You have already voted.
            </Typography>
          </View>
        ) : null}
      </ScrollView>
    </ScreenContainer>
  );
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  draft: { bg: '#fef3c7', text: '#92400e' },
  active: { bg: '#d1fae5', text: '#065f46' },
  closed: { bg: '#dbeafe', text: '#1e40af' },
  archived: { bg: '#f3f4f6', text: '#6b7280' },
};

const styles = StyleSheet.create({
  container: {
    padding: 0,
  },
  scroll: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backRow: {
    marginBottom: spacing.md,
  },
  title: {
    marginBottom: spacing.sm,
  },
  description: {
    marginBottom: spacing.md,
    lineHeight: 22,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
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
  successBanner: {
    backgroundColor: '#d1fae5',
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorBanner: {
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  optionsCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  optionsTitle: {
    marginBottom: spacing.md,
  },
  optionRow: {
    borderRadius: 10,
    borderWidth: 1.5,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  optionRowSelected: {
    backgroundColor: 'rgba(20, 184, 166, 0.06)',
  },
  optionTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  optionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.sm,
  },
  optionIndicator: {
    width: 20,
    height: 20,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkbox: {
    borderRadius: 4,
  },
  radio: {
    borderRadius: 10,
  },
  checkmark: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '700',
  },
  optionLabel: {
    fontSize: 14,
    flex: 1,
  },
  barTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: spacing.xs,
  },
  barFill: {
    height: 6,
    borderRadius: 3,
  },
  voteButton: {
    marginTop: spacing.sm,
  },
  ineligibleBox: {
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  ineligibleText: {
    color: '#991b1b',
    textAlign: 'center',
    fontWeight: '600',
  },
  votedBox: {
    backgroundColor: 'rgba(20, 184, 166, 0.08)',
    borderRadius: 8,
    padding: spacing.md,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primary.dark,
  },
  votedText: {
    color: colors.primary.dark,
    textAlign: 'center',
    fontWeight: '600',
  },
});
