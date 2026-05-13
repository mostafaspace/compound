import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  FlatList,
  Animated,
  Pressable,
  useColorScheme,
  Text,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import type { RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import {
  useGetPollQuery,
  useGetPollEligibilityQuery,
  useGetPollVotersQuery,
  useCastPollVoteMutation,
  useRemovePollVoteMutation,
  usePublishPollMutation,
  useClosePollMutation,
} from '../../../services/polls';
import { getEffectiveRoleType } from '@compound/contracts';
import type { PollEligibleUnit } from '@compound/contracts';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../../../store/authSlice';
import { colors, layout, radii, shadows, spacing } from '../../../theme';
import { Typography } from '../../../components/ui/Typography';
import { Button } from '../../../components/ui/Button';
import { ScreenContainer } from '../../../components/layout/ScreenContainer';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { pollStatusPalette } from '../../../theme/semantics';
import type { RootStackParamList } from '../../../navigation/types';
import type { PollOption } from '@compound/contracts';
import { isRtlLanguage, rowDirectionStyle, textDirectionStyle } from '../../../i18n/direction';

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
        { backgroundColor: isDark ? colors.border.dark : colors.border.light },
      ]}
    >
      <Animated.View
        style={[
          styles.barFill,
          {
            backgroundColor: selected ? colors.primary.light : (isDark ? colors.text.secondary.dark : colors.text.secondary.light),
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
  const { t, i18n } = useTranslation();
  const isRtl = isRtlLanguage(i18n.language);
  const { pollId } = route.params;
  const isDark = useColorScheme() === 'dark';
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);

  const { data: poll, isLoading, refetch } = useGetPollQuery({ pollId, unitId: selectedUnitId });
  const { data: eligibility } = useGetPollEligibilityQuery({ pollId, unitId: selectedUnitId });
  const { data: voters } = useGetPollVotersQuery(pollId);
  const user = useSelector(selectCurrentUser);
  const roleType = getEffectiveRoleType(user);
  const isAdmin = roleType === 'admin';

  const [castVote, { isLoading: isCasting }] = useCastPollVoteMutation();
  const [removeVote, { isLoading: isRemoving }] = useRemovePollVoteMutation();
  const [publishPoll, { isLoading: isPublishing }] = usePublishPollMutation();
  const [closePoll, { isLoading: isClosing }] = useClosePollMutation();

  const [selectedOptionIds, setSelectedOptionIds] = useState<number[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const isActive = poll?.status === 'active';
  const isDraft = poll?.status === 'draft';
  const hasStarted = !poll?.startsAt || new Date(poll.startsAt).getTime() <= Date.now();
  const hasVoted = poll?.hasVoted ?? eligibility?.hasVoted ?? false;
  const isEligible = eligibility?.eligible ?? false;
  const eligibleUnits: PollEligibleUnit[] = eligibility?.eligibleUnits ?? [];
  const requiresUnitSelection = eligibility?.requiresUnitSelection ?? false;
  const allowMultiple = poll?.allowMultiple ?? false;
  const maxChoices = poll?.maxChoices ?? null;
  const votingOpen = isActive && hasStarted;

  const options: PollOption[] = poll?.options ?? [];
  const totalVotes = poll?.votesCount ?? 0;
  const selectedUnit = eligibleUnits.find((unit) => unit.id === selectedUnitId) ?? null;

  useEffect(() => {
    if (!eligibility) {
      return;
    }

    if (selectedUnitId && eligibleUnits.some((unit) => unit.id === selectedUnitId)) {
      return;
    }

    setSelectedUnitId(eligibility.selectedUnitId ?? eligibleUnits[0]?.id ?? null);
  }, [eligibility, eligibleUnits, selectedUnitId]);

  const toggleOption = (optionId: number) => {
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
      await castVote({ pollId, optionIds: selectedOptionIds, unitId: selectedUnitId ?? undefined }).unwrap();
      setSuccessMsg(t('Polls.voteSuccess'));
      setSelectedOptionIds([]);
      refetch();
    } catch (err: any) {
      setErrorMsg(err?.data?.message ?? t('Polls.voteError'));
    }
  };

  const handleUnvote = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await removeVote({ pollId, unitId: selectedUnitId ?? undefined }).unwrap();
      setSuccessMsg(t('Polls.voteSuccess'));
      setSelectedOptionIds([]);
      refetch();
    } catch (err: any) {
      setErrorMsg(err?.data?.message ?? t('Polls.voteError'));
    }
  };

  const handlePublish = async () => {
    try {
      await publishPoll(pollId).unwrap();
      setSuccessMsg(t('Polls.publishSuccess', { defaultValue: 'Poll published successfully.' }));
      refetch();
    } catch (err: any) {
      setErrorMsg(err?.data?.message ?? t('Polls.publishError', { defaultValue: 'Failed to publish poll.' }));
    }
  };

  const handleClose = async () => {
    try {
      await closePoll(pollId).unwrap();
      setSuccessMsg(t('Polls.closeSuccess', { defaultValue: 'Poll closed successfully.' }));
      refetch();
    } catch (err: any) {
      setErrorMsg(err?.data?.message ?? t('Polls.closeError', { defaultValue: 'Failed to close poll.' }));
    }
  };

  const pct = (count: number) => {
    if (totalVotes === 0) return 0;
    return Math.round((count / totalVotes) * 100);
  };

  if (isLoading || !poll) {
    return (
      <ScreenContainer withKeyboard={false} edges={['left', 'right', 'bottom']}>
        <View style={[styles.center, textDirectionStyle(isRtl)]}>
          {isLoading ? (
            <Typography variant="caption" style={textDirectionStyle(isRtl)}>{t('Common.loading')}</Typography>
          ) : (
            <View style={[{ alignItems: 'center', padding: spacing.xl }, textDirectionStyle(isRtl)]}>
              <Typography variant="body" style={[{ color: colors.error, marginBottom: spacing.md }, textDirectionStyle(isRtl)]}>
                {t('Polls.loadError')}
              </Typography>
              <Button title={t('Common.retry')} onPress={refetch} variant="outline" />
            </View>
          )}
        </View>
      </ScreenContainer>
    );
  }

  const showResults = !isDraft;
  const statusPalette = pollStatusPalette(poll.status);
  const mutedText = isDark ? colors.text.secondary.dark : colors.text.secondary.light;
  const getOptionVoterNames = (optionLabel: string) => {
    const names: string[] = [];
    for (const voter of voters ?? []) {
      if (voter.options.includes(optionLabel)) {
        names.push(voter.userName ?? t('Polls.unknownResident'));
      }
    }

    return names.join(', ');
  };

  const renderEligibleUnit = ({ item: unit }: { item: PollEligibleUnit }) => {
    const active = unit.id === selectedUnitId;

    return (
      <Pressable
        onPress={() => {
          setSelectedUnitId(unit.id);
          setSelectedOptionIds([]);
          setErrorMsg(null);
          setSuccessMsg(null);
        }}
        style={[
          styles.unitChip,
          {
            borderColor: active ? colors.primary.dark : (isDark ? colors.border.dark : colors.border.light),
            backgroundColor: active ? colors.palette.blue[50] : 'transparent',
          },
          isRtl && { marginEnd: 0, marginStart: spacing.sm }
        ]}
      >
        <Typography
          variant="caption"
          style={[styles.unitChipText, active ? { color: colors.primary.dark, fontWeight: '700' } : null, textDirectionStyle(isRtl)]}
        >
          {unit.unitNumber ? t('Apartments.unitNumber', { number: unit.unitNumber }) : t('Apartments.types.apartment')}
        </Typography>
      </Pressable>
    );
  };

  const renderOption = ({ item: opt }: { item: PollOption }) => {
    const optPct = pct(opt.votesCount);
    const isSelected = selectedOptionIds.includes(opt.id);
    const userVoted = poll.userVoteOptionIds?.includes(opt.id) ?? false;
    const optionVoterNames = getOptionVoterNames(opt.label);

    return (
      <Pressable
        onPress={() => {
          if (votingOpen && isEligible) {
            toggleOption(opt.id);
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
          textDirectionStyle(isRtl)
        ]}
      >
        <View style={[styles.optionTop, rowDirectionStyle(isRtl)]}>
          <View style={[styles.optionLabelRow, rowDirectionStyle(isRtl)]}>
            <View
              style={[
                styles.optionIndicator,
                allowMultiple ? styles.checkbox : styles.radio,
                isSelected || userVoted
                  ? { backgroundColor: colors.primary.dark, borderColor: colors.primary.dark }
                  : {
                      borderColor: isDark ? colors.border.dark : colors.border.light,
                      backgroundColor: 'transparent',
                    },
                isRtl ? { marginStart: spacing.sm, marginEnd: 0 } : { marginEnd: spacing.sm, marginStart: 0 }
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
                textDirectionStyle(isRtl)
              ]}
            >
              {opt.label}
            </Typography>
          </View>
          {showResults ? (
            <Typography
              variant="caption"
              style={[{ color: mutedText, minWidth: 50 }, isRtl ? { textAlign: 'left' } : { textAlign: 'right' }]}
            >
              {opt.votesCount} ({optPct}%)
            </Typography>
          ) : null}
        </View>

        {showResults ? (
          <>
            <AnimatedBar
              pct={optPct}
              isDark={isDark}
              selected={userVoted}
            />
            {optionVoterNames ? (
              <View style={[styles.optionVoters, rowDirectionStyle(isRtl)]}>
                <Typography variant="caption" style={[styles.optionVoterName, textDirectionStyle(isRtl)]}>
                  {optionVoterNames}
                </Typography>
              </View>
            ) : null}
          </>
        ) : null}
      </Pressable>
    );
  };

  const renderVoter = ({ item: voter, index }: { item: any; index: number }) => (
    <View style={[styles.voterRow, rowDirectionStyle(isRtl)]}>
      <View style={[styles.voterInfo, textDirectionStyle(isRtl)]}>
        <Typography variant="label" style={textDirectionStyle(isRtl)}>{voter.userName ?? t('Polls.unknownResident')}</Typography>
        <Typography variant="caption" style={[styles.voterMeta, textDirectionStyle(isRtl)]}>
          {voter.unitNumber ? t('Apartments.unitNumber', { number: voter.unitNumber }) : t('Polls.unitNotRecorded')}
        </Typography>
        <Typography variant="caption" style={[styles.voterMeta, textDirectionStyle(isRtl)]}>
          {voter.options.join(', ') || t('Polls.noOptionRecorded')}
        </Typography>
      </View>
      <Typography variant="caption" style={[styles.voterMeta, textDirectionStyle(isRtl)]}>
        {voter.votedAt ? new Date(voter.votedAt).toLocaleString(i18n.language === 'ar' ? 'ar-EG' : 'en-US') : t('Polls.noTimestamp')}
      </Typography>
    </View>
  );

  const renderViewLog = ({ item: log }: { item: any }) => (
    <View style={[styles.logRow, rowDirectionStyle(isRtl)]}>
      <Typography variant="caption" style={textDirectionStyle(isRtl)}>{log.userName}</Typography>
      <Typography variant="caption" style={[styles.logTime, textDirectionStyle(isRtl)]}>
        {log.lastViewedAt ? new Date(log.lastViewedAt).toLocaleTimeString(i18n.language === 'ar' ? 'ar-EG' : 'en-US') : t('Polls.noTimestamp')}
      </Typography>
    </View>
  );

  const renderNotificationLog = ({ item: log }: { item: any }) => (
    <View style={[styles.logRow, rowDirectionStyle(isRtl)]}>
      <Typography variant="caption" style={textDirectionStyle(isRtl)}>{log.userName}</Typography>
      <Typography variant="caption" style={[styles.logStatus, { color: log.delivered ? colors.success : colors.error }, textDirectionStyle(isRtl)]}>
        {log.delivered ? t('Polls.delivered') : t('Polls.failed')}
      </Typography>
    </View>
  );

  return (
    <ScreenContainer withKeyboard={false} style={styles.container} edges={['left', 'right', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Title + status */}
        <Typography variant="h2" style={[styles.title, textDirectionStyle(isRtl)]}>
          {poll.title}
        </Typography>

        {poll.description ? (
          <Typography
            variant="body"
            style={[styles.description, { color: mutedText }, textDirectionStyle(isRtl)]}
          >
            {poll.description}
          </Typography>
        ) : null}

        <View style={[styles.metaRow, rowDirectionStyle(isRtl)]}>
          <StatusBadge
            label={t(`Common.statuses.${poll.status}`, { defaultValue: poll.status })}
            backgroundColor={statusPalette.background}
            textColor={statusPalette.text}
          />
          {isAdmin && poll.status === 'draft' && (
            <Button
              title={t('Polls.publishNow')}
              variant="outline"
              onPress={handlePublish}
              loading={isPublishing}
              style={styles.inlineAction}
              textStyle={styles.inlineActionText}
            />
          )}
          {isAdmin && poll.status === 'active' && (
            <Button
              title={t('Polls.closePoll')}
              variant="outline"
              onPress={handleClose}
              loading={isClosing}
              style={[styles.inlineAction, { borderColor: colors.error }]}
              textStyle={[styles.inlineActionText, { color: colors.error }]}
            />
          )}
          {allowMultiple ? (
            <Typography variant="caption" style={[{ color: mutedText }, textDirectionStyle(isRtl)]}>
              {t('Polls.multiChoice')}{maxChoices ? ` ${t('Polls.maxChoices', { count: maxChoices })}` : ''}
            </Typography>
          ) : null}
          <Typography variant="caption" style={[{ color: mutedText }, textDirectionStyle(isRtl)]}>
            {t('Polls.votesCount', { count: totalVotes })}
          </Typography>
        </View>

        {/* Success / Error banners */}
        {successMsg ? (
          <View style={[styles.successBanner, textDirectionStyle(isRtl)]}>
            <Typography variant="body" style={[{ color: colors.palette.emerald[600], fontWeight: '600' }, textDirectionStyle(isRtl)]}>
              {successMsg}
            </Typography>
          </View>
        ) : null}
        {errorMsg ? (
          <View style={[styles.errorBanner, textDirectionStyle(isRtl)]}>
            <Typography variant="body" style={[{ color: colors.palette.red[600], fontWeight: '600' }, textDirectionStyle(isRtl)]}>
              {errorMsg}
            </Typography>
          </View>
        ) : null}

        {eligibleUnits.length > 1 ? (
          <View
            style={[
              styles.unitSelectorCard,
              {
                backgroundColor: isDark ? colors.surface.dark : colors.surface.light,
                borderColor: isDark ? colors.border.dark : colors.border.light,
              },
            ]}
          >
            <Typography variant="h3" style={[styles.optionsTitle, textDirectionStyle(isRtl)]}>
              {t('Polls.votingUnitTitle')}
            </Typography>
            <Typography variant="caption" style={[styles.votersHelper, textDirectionStyle(isRtl)]}>
              {t('Polls.votersHelper')}
            </Typography>
            <FlatList
              data={eligibleUnits}
              keyExtractor={(unit) => unit.id}
              renderItem={renderEligibleUnit}
              horizontal
              inverted={isRtl}
              scrollEnabled={false}
              contentContainerStyle={[styles.unitChipRow, rowDirectionStyle(isRtl)]}
            />
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
          <Typography variant="h3" style={[styles.optionsTitle, textDirectionStyle(isRtl)]}>
            {showResults ? t('Polls.results') : t('Polls.options')}
          </Typography>
          <FlatList
            data={options}
            keyExtractor={(opt) => String(opt.id)}
            renderItem={renderOption}
            scrollEnabled={false}
            ListEmptyComponent={
              <Typography variant="caption" style={textDirectionStyle(isRtl)}>{t('Polls.noActiveVotes')}</Typography>
            }
          />
        </View>

        {/* Vote action */}
        {!hasStarted && isActive ? (
          <View style={[styles.infoBox, textDirectionStyle(isRtl)]}>
            <Typography variant="body" style={[styles.infoText, textDirectionStyle(isRtl)]}>
              {t('Polls.endsAt', { date: poll.startsAt ? new Date(poll.startsAt).toLocaleString(i18n.language === 'ar' ? 'ar-EG' : 'en-US') : '' })}
            </Typography>
          </View>
        ) : isActive && isEligible && (!hasVoted || selectedOptionIds.length > 0) ? (
          <Button
            title={isCasting ? t('Common.loading') : (hasVoted ? t('Polls.updateVote') : t('Polls.submitVote'))}
            onPress={handleVote}
            disabled={selectedOptionIds.length === 0 || isCasting || (requiresUnitSelection && !selectedUnitId)}
            loading={isCasting}
            style={styles.voteButton}
          />
        ) : isActive && !hasVoted && eligibility && !isEligible ? (
          <View style={[styles.ineligibleBox, textDirectionStyle(isRtl)]}>
            <Typography variant="body" style={[styles.ineligibleText, textDirectionStyle(isRtl)]}>
              {t('Polls.ineligible', { reason: '' })}
            </Typography>
          </View>
        ) : isActive && hasVoted && selectedOptionIds.length === 0 ? (
          <View style={[styles.votedBox, textDirectionStyle(isRtl)]}>
            <Typography variant="body" style={[styles.votedText, textDirectionStyle(isRtl)]}>
              {selectedUnit?.unitNumber
                ? t('Polls.alreadyVotedMessage', { unit: selectedUnit.unitNumber })
                : t('Polls.noApartmentVoted')}
            </Typography>
            <Button
              title={isRemoving ? t('Common.loading') : t('Polls.removeVote')}
              variant="ghost"
              onPress={handleUnvote}
              disabled={isRemoving}
              loading={isRemoving}
              style={styles.unvoteButton}
              textStyle={{ color: colors.error }}
            />
          </View>
        ) : null}

        <View
          style={[
            styles.votersCard,
            {
              backgroundColor: isDark ? colors.surface.dark : colors.surface.light,
              borderColor: isDark ? colors.border.dark : colors.border.light,
            },
          ]}
        >
          <Typography variant="h3" style={[styles.optionsTitle, textDirectionStyle(isRtl)]}>
            {t('Polls.namedBallots')}
          </Typography>
          <Typography variant="caption" style={[styles.votersHelper, textDirectionStyle(isRtl)]}>
            {t('Polls.ballotsTransparency')}
          </Typography>
          <FlatList
            data={voters ?? []}
            keyExtractor={(voter, index) => `${voter.userId}-${index}`}
            renderItem={renderVoter}
            scrollEnabled={false}
            ListEmptyComponent={
              <Typography variant="caption" style={[styles.emptyStateText, textDirectionStyle(isRtl)]}>
                {t('Polls.noBallots')}
              </Typography>
            }
          />
        </View>

        {/* Transparency Logs */}
        {isAdmin && (
          <View style={[styles.logsSection, textDirectionStyle(isRtl)]}>
            <Typography variant="h3" style={[styles.logsTitle, textDirectionStyle(isRtl)]}>
              {t('Polls.transparencyTitle')}
            </Typography>
            
            <View style={[styles.logCard, textDirectionStyle(isRtl)]}>
              <Typography variant="label" style={[styles.logLabel, textDirectionStyle(isRtl)]}>
                {t('Polls.seenBy', { count: poll.viewLogs?.length || 0 })}
              </Typography>
              <FlatList
                data={poll.viewLogs ?? []}
                keyExtractor={(log, index) => `${log.userId ?? log.userName}-${index}`}
                renderItem={renderViewLog}
                scrollEnabled={false}
              />
            </View>

            <View style={[styles.logCard, textDirectionStyle(isRtl)]}>
              <Typography variant="label" style={[styles.logLabel, textDirectionStyle(isRtl)]}>
                {t('Polls.notifiedResidents', { count: poll.notificationLogs?.length || 0 })}
              </Typography>
              <FlatList
                data={poll.notificationLogs ?? []}
                keyExtractor={(log, index) => `${log.userId ?? log.userName}-${index}`}
                renderItem={renderNotificationLog}
                scrollEnabled={false}
              />
            </View>
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 0,
  },
  scroll: {
    padding: layout.screenGutter,
    paddingBottom: layout.screenBottom,
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
  inlineAction: {
    height: 32,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1.5,
  },
  inlineActionText: {
    fontSize: 12,
    fontWeight: '700',
  },
  successBanner: {
    backgroundColor: colors.palette.emerald[50],
    borderRadius: radii.md,
    padding: layout.cardPadding,
    marginBottom: layout.listGap,
  },
  errorBanner: {
    backgroundColor: colors.palette.red[50],
    borderRadius: radii.md,
    padding: layout.cardPadding,
    marginBottom: layout.listGap,
  },
  optionsCard: {
    borderRadius: radii.xl,
    borderWidth: 1,
    padding: layout.cardPadding,
    marginBottom: layout.listGap,
    ...shadows.sm,
  },
  unitSelectorCard: {
    borderRadius: radii.xl,
    borderWidth: 1,
    padding: layout.cardPadding,
    marginBottom: layout.listGap,
    ...shadows.sm,
  },
  optionsTitle: {
    marginBottom: spacing.md,
  },
  unitChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  unitChip: {
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  unitChipText: {
    color: colors.text.secondary.light,
  },
  optionRow: {
    borderRadius: radii.md,
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
    color: colors.text.inverse,
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
  infoBox: {
    backgroundColor: colors.palette.blue[50],
    borderRadius: radii.md,
    padding: layout.cardPadding,
    marginTop: spacing.sm,
  },
  infoText: {
    color: colors.palette.blue[700],
    textAlign: 'center',
    fontWeight: '600',
  },
  ineligibleBox: {
    backgroundColor: colors.palette.red[50],
    borderRadius: radii.md,
    padding: layout.cardPadding,
    marginTop: spacing.sm,
  },
  ineligibleText: {
    color: colors.palette.red[600],
    textAlign: 'center',
    fontWeight: '600',
  },
  votedBox: {
    backgroundColor: 'rgba(20, 184, 166, 0.08)',
    borderRadius: radii.md,
    padding: layout.cardPadding,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primary.dark,
  },
  votedText: {
    color: colors.primary.dark,
    textAlign: 'center',
    fontWeight: '600',
  },
  unvoteButton: {
    marginTop: spacing.sm,
  },
  votersCard: {
    borderRadius: radii.xl,
    borderWidth: 1,
    padding: layout.cardPadding,
    marginTop: layout.listGap,
    ...shadows.sm,
  },
  voterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.light,
    gap: spacing.md,
  },
  voterInfo: {
    flex: 1,
    gap: 2,
  },
  voterMeta: {
    color: colors.text.secondary.light,
  },
  votersHelper: {
    color: colors.text.secondary.light,
    marginBottom: spacing.md,
  },
  emptyStateText: {
    color: colors.text.secondary.light,
  },
  optionVoters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.xs,
    gap: 4,
  },
  optionVoterName: {
    color: colors.primary.dark,
    fontSize: 10,
    fontWeight: '500',
  },
  logsSection: {
    marginTop: layout.sectionGap,
    paddingTop: layout.sectionGap,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  logsTitle: {
    marginBottom: spacing.md,
  },
  logCard: {
    marginBottom: layout.listGap,
    backgroundColor: 'rgba(0,0,0,0.02)',
    padding: layout.cardPadding,
    borderRadius: radii.lg,
  },
  logLabel: {
    marginBottom: spacing.sm,
    color: colors.text.primary.light,
  },
  logRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  logTime: {
    color: colors.text.secondary.light,
  },
  logStatus: {
    fontWeight: '600',
  },
});
