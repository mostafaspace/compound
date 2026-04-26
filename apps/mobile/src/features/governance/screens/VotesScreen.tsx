import React, { useState } from 'react';
import { 
  View, 
  StyleSheet, 
  FlatList, 
  useColorScheme,
  Pressable,
  Text
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useGetVotesQuery, useLazyGetVoteEligibilityQuery, useCastVoteMutation } from '../../../services/governance';
import { colors, spacing } from '../../../theme';
import { Button } from '../../../components/ui/Button';
import { Typography } from '../../../components/ui/Typography';
import { ScreenContainer } from '../../../components/layout/ScreenContainer';
import { formatDate } from '../../../utils/formatters';

export const VotesScreen = () => {
  const { t } = useTranslation();
  const isDark = useColorScheme() === 'dark';
  
  const { data: votes = [], isLoading, refetch } = useGetVotesQuery();
  const [triggerEligibilityCheck, { isFetching: isChecking }] = useLazyGetVoteEligibilityQuery();
  const [castVote, { isLoading: isCasting }] = useCastVoteMutation();

  const [eligibilityData, setEligibilityData] = useState<Record<string, any>>({});
  const [selectedOptions, setSelectedOptions] = useState<Record<string, number>>({});
  const [message, setMessage] = useState<string | null>(null);

  const handleCheckEligibility = async (voteId: string) => {
    try {
      const result = await triggerEligibilityCheck(voteId).unwrap();
      setEligibilityData(prev => ({ ...prev, [voteId]: result }));
    } catch (err) {
      console.error("Eligibility check failed", err);
    }
  };

  const handleVote = async (voteId: string) => {
    const optionId = selectedOptions[voteId];
    if (!optionId) return;
    
    setMessage(null);
    try {
      await castVote({ voteId, optionId }).unwrap();
      setMessage(t("Governance.voteSuccess"));
      // Refresh eligibility to show "Already voted"
      await handleCheckEligibility(voteId);
    } catch (err: any) {
      setMessage(err.data?.message || t("Governance.voteError"));
    }
  };

  const renderVoteItem = ({ item }: { item: any }) => {
    const eligibility = eligibilityData[item.id];
    const pickedOption = selectedOptions[item.id];

    return (
      <View style={[styles.card, { backgroundColor: isDark ? colors.surface.dark : colors.surface.light, borderColor: isDark ? colors.border.dark : colors.border.light }]}>
        <Typography variant="h3">{item.title}</Typography>
        {item.description ? <Typography variant="body" style={styles.description}>{item.description}</Typography> : null}
        <Typography variant="caption" style={styles.dateText}>{t("Governance.endsAt")}: {formatDate(item.endsAt)}</Typography>

        {!eligibility ? (
          <Button 
            variant="outline" 
            title={t("Governance.checkEligibility")} 
            onPress={() => handleCheckEligibility(item.id)}
            loading={isChecking}
            style={styles.actionButton}
          />
        ) : eligibility.hasVoted ? (
          <View style={styles.infoBox}>
            <Typography variant="body" style={styles.infoText}>{t("Governance.alreadyVoted")}</Typography>
          </View>
        ) : eligibility.eligible ? (
          <View style={styles.voteForm}>
            <Typography variant="h3" style={styles.subTitle}>{t("Governance.selectOption")}</Typography>
            <View style={styles.optionsGrid}>
              {item.options?.map((opt: any) => (
                <Pressable 
                  key={opt.id} 
                  onPress={() => setSelectedOptions(prev => ({ ...prev, [item.id]: opt.id }))}
                  style={[styles.optionChip, pickedOption === opt.id && styles.optionChipSelected]}
                >
                  <Text style={[styles.optionText, pickedOption === opt.id && styles.optionTextSelected]}>{opt.label}</Text>
                </Pressable>
              ))}
            </View>
            <Button 
              title={t("Governance.castVote")} 
              onPress={() => handleVote(item.id)}
              disabled={!pickedOption}
              loading={isCasting}
              style={styles.voteButton}
            />
          </View>
        ) : (
          <View style={[styles.infoBox, { borderColor: colors.error }]}>
            <Typography variant="error" style={styles.infoText}>
              {t("Governance.ineligible", { reason: eligibility.reason || "" })}
            </Typography>
          </View>
        )}
      </View>
    );
  };

  return (
    <ScreenContainer withKeyboard={false} style={styles.container}>
      {message && <Typography variant="body" style={styles.globalMessage}>{message}</Typography>}
      <FlatList
        data={votes.filter((v: any) => v.status === 'active')}
        keyExtractor={(item) => item.id}
        renderItem={renderVoteItem}
        refreshing={isLoading}
        onRefresh={refetch}
        ListEmptyComponent={
          <View style={styles.center}>
            <Typography variant="caption">
              {isLoading ? t("Common.loading") : t("Governance.noActiveVotes")}
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
  },
  card: {
    padding: spacing.lg,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  description: {
    color: '#6b7280',
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  dateText: {
    marginBottom: spacing.md,
  },
  actionButton: {
    marginTop: spacing.sm,
  },
  infoBox: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary.dark,
    backgroundColor: 'rgba(20, 184, 166, 0.05)',
  },
  infoText: {
    textAlign: 'center',
    fontWeight: '600',
  },
  voteForm: {
    marginTop: spacing.md,
  },
  subTitle: {
    marginBottom: spacing.sm,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  optionChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  optionChipSelected: {
    backgroundColor: colors.primary.dark,
    borderColor: colors.primary.dark,
  },
  optionText: {
    fontSize: 13,
    color: '#4b5563',
  },
  optionTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  voteButton: {
    marginTop: spacing.sm,
  },
  globalMessage: {
    padding: spacing.md,
    backgroundColor: colors.primary.dark,
    color: '#fff',
    textAlign: 'center',
    fontWeight: '600',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xl,
  }
});
