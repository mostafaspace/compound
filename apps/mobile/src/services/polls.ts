import { api } from "./api";
import type {
  ApiEnvelope,
  PaginatedEnvelope,
  Poll,
  PollEligibilityResult,
  PollVoteInput,
} from "@compound/contracts";

export const pollsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getPolls: builder.query<Poll[], void>({
      query: () => "/polls",
      transformResponse: (response: PaginatedEnvelope<Poll>) => response.data,
      providesTags: ["Poll"],
    }),
    getPoll: builder.query<Poll, string>({
      query: (id) => `/polls/${id}`,
      transformResponse: (response: ApiEnvelope<Poll>) => response.data,
      providesTags: (_result, _err, id) => [{ type: "Poll" as const, id }],
    }),
    getPollEligibility: builder.query<PollEligibilityResult, string>({
      query: (id) => `/polls/${id}/eligibility`,
      transformResponse: (response: ApiEnvelope<PollEligibilityResult>) => response.data,
    }),
    castPollVote: builder.mutation<void, { pollId: string } & PollVoteInput>({
      query: ({ pollId, optionIds }) => ({
        url: `/polls/${pollId}/vote`,
        method: "POST",
        body: { optionIds },
      }),
      invalidatesTags: (_result: void | undefined, _err: unknown, { pollId }: { pollId: string } & PollVoteInput) => [
        { type: "Poll" as const, id: pollId },
        "Poll",
      ],
    }),
  }),
});

export const {
  useGetPollsQuery,
  useGetPollQuery,
  useGetPollEligibilityQuery,
  useLazyGetPollEligibilityQuery,
  useCastPollVoteMutation,
} = pollsApi;
