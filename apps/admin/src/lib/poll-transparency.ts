import type { Poll, PollVoter, Vote, VoteVoter } from "@compound/contracts";

function percent(count: number, total: number): number {
  if (total <= 0) {
    return 0;
  }

  return Math.round((count / total) * 100);
}

function latestTimestamp(values: Array<string | null | undefined>): string | null {
  const timestamps = values.filter((value): value is string => Boolean(value));
  if (timestamps.length === 0) {
    return null;
  }

  return timestamps.reduce((latest, value) => (value > latest ? value : latest));
}

function uniqueCount(values: Array<string | number | null | undefined>): number {
  return new Set(values.filter((value): value is string | number => value !== null && value !== undefined)).size;
}

export function summarizePollTransparency(
  poll: Pick<Poll, "publishedAt" | "closedAt" | "votesCount" | "voters" | "notificationLogs" | "viewLogs">,
) {
  const notifications = poll.notificationLogs ?? [];
  const views = poll.viewLogs ?? [];
  const voters = poll.voters ?? [];
  const deliveredNotifications = notifications.filter((log) => log.delivered).length;
  const totalViews = views.reduce((sum, log) => sum + log.viewCount, 0);
  const uniqueViewers = views.length;
  const uniqueVoterCount = uniqueCount(voters.map((voter) => voter.userId));
  const uniqueUnitCount = uniqueCount(voters.map((voter) => voter.unitId));

  return {
    totalNotifications: notifications.length,
    deliveredNotifications,
    deliveryRate: percent(deliveredNotifications, notifications.length),
    totalViews,
    uniqueViewers,
    averageViewsPerViewer: uniqueViewers === 0 ? "0.0" : (totalViews / uniqueViewers).toFixed(1),
    uniqueVoterCount,
    uniqueUnitCount,
    firstPublicationAt: poll.publishedAt ?? null,
    closedAt: poll.closedAt ?? null,
    latestActivityAt: latestTimestamp([
      ...voters.map((voter) => voter.votedAt),
      ...views.map((log) => log.lastViewedAt),
      ...notifications.map((log) => log.notifiedAt),
      poll.closedAt,
    ]),
  };
}

export function summarizeVoteTransparency(
  vote: Pick<Vote, "isAnonymous" | "requiresDocCompliance" | "participationsCount" | "resultAppliedAt">,
  voters: VoteVoter[] | null,
) {
  return {
    transparencyMode: vote.isAnonymous ? "anonymous_ballots" : "named_ballots",
    docComplianceMode: vote.requiresDocCompliance ? "required" : "not_required",
    totalBallots: vote.participationsCount ?? 0,
    uniqueVoterCount: voters ? uniqueCount(voters.map((voter) => voter.userId)) : null,
    uniqueUnitCount: voters ? uniqueCount(voters.map((voter) => voter.unitId)) : null,
    latestParticipationAt: voters ? latestTimestamp(voters.map((voter) => voter.votedAt)) : null,
    resultAppliedAt: vote.resultAppliedAt ?? null,
  };
}

export function groupVoteSelections(voters: VoteVoter[]): Array<PollVoter & { selections: string[] }> {
  const groups = new Map<number, PollVoter & { selections: string[] }>();

  for (const voter of voters) {
    const existing = groups.get(voter.userId);
    if (existing) {
      if (voter.option) {
        existing.selections.push(voter.option);
      }
      if (voter.votedAt && (!existing.votedAt || voter.votedAt > existing.votedAt)) {
        existing.votedAt = voter.votedAt;
      }
      continue;
    }

    groups.set(voter.userId, {
      userId: voter.userId,
      userName: voter.userName,
      unitId: voter.unitId,
      unitNumber: voter.unitNumber,
      options: voter.option ? [voter.option] : [],
      selections: voter.option ? [voter.option] : [],
      votedAt: voter.votedAt,
    });
  }

  return Array.from(groups.values());
}
