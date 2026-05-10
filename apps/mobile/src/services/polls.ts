import { api } from "./api";
import type {
  ApiEnvelope,
  PaginatedEnvelope,
  Poll,
  PollEligibilityResult,
  PollVoter,
  PollVoteInput,
  CreatePollInput,
} from "@compound/contracts";

export const pollsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getPolls: builder.query<Poll[], void>({
      query: () => "/polls",
      transformResponse: (response: PaginatedEnvelope<Poll>) => response.data,
      providesTags: ["Poll"],
    }),
    getPoll: builder.query<Poll, { pollId: string; unitId?: string | null }>({
      query: ({ pollId, unitId }) =>
        unitId ? `/polls/${pollId}?unitId=${encodeURIComponent(unitId)}` : `/polls/${pollId}`,
      transformResponse: (response: ApiEnvelope<Poll>) => response.data,
      providesTags: (_result, _err, { pollId }) => [{ type: "Poll" as const, id: pollId }],
    }),
    getPollEligibility: builder.query<PollEligibilityResult, { pollId: string; unitId?: string | null }>({
      query: ({ pollId, unitId }) =>
        unitId ? `/polls/${pollId}/eligibility?unitId=${encodeURIComponent(unitId)}` : `/polls/${pollId}/eligibility`,
      transformResponse: (response: ApiEnvelope<PollEligibilityResult>) => response.data,
    }),
    getPollVoters: builder.query<PollVoter[], string>({
      query: (id) => `/polls/${id}/voters`,
      transformResponse: (response: { data: PollVoter[] }) => response.data,
      providesTags: (_result, _err, id) => [{ type: "Poll" as const, id }],
    }),
    castPollVote: builder.mutation<void, { pollId: string } & PollVoteInput>({
      query: ({ pollId, optionIds, unitId }) => ({
        url: `/polls/${pollId}/vote`,
        method: "POST",
        body: { optionIds, unitId },
      }),
      invalidatesTags: (_result: void | undefined, _err: unknown, { pollId }: { pollId: string } & PollVoteInput) => [
        { type: "Poll" as const, id: pollId },
        "Poll",
      ],
    }),
    removePollVote: builder.mutation<void, { pollId: string; unitId?: string | null }>({
      query: ({ pollId, unitId }) => ({
        url: unitId ? `/polls/${pollId}/vote?unitId=${encodeURIComponent(unitId)}` : `/polls/${pollId}/vote`,
        method: "DELETE",
      }),
      invalidatesTags: (_result: void | undefined, _err: unknown, { pollId }) => [
        { type: "Poll" as const, id: pollId },
        "Poll",
      ],
    }),
    publishPoll: builder.mutation<Poll, string>({
      query: (id) => ({
        url: `/polls/${id}/publish`,
        method: "POST",
      }),
      invalidatesTags: (_result, _err, id) => [{ type: "Poll" as const, id }, "Poll"],
    }),
    closePoll: builder.mutation<Poll, string>({
      query: (id) => ({
        url: `/polls/${id}/close`,
        method: "POST",
      }),
      invalidatesTags: (_result, _err, id) => [{ type: "Poll" as const, id }, "Poll"],
    }),
    createPoll: builder.mutation<Poll, CreatePollInput>({
      query: (body) => ({
        url: "/polls",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Poll"],
    }),
  }),
});

export const {
  useGetPollsQuery,
  useGetPollQuery,
  useGetPollEligibilityQuery,
  useLazyGetPollEligibilityQuery,
  useGetPollVotersQuery,
  useCastPollVoteMutation,
  useRemovePollVoteMutation,
  usePublishPollMutation,
  useClosePollMutation,
  useCreatePollMutation,
} = pollsApi;
