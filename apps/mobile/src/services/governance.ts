import { api } from "./api";
import type { 
  ApiEnvelope, 
  Vote,
  VoteEligibilityResult,
} from "@compound/contracts";

export const governanceApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getVotes: builder.query<Vote[], void>({
      query: () => "/governance/votes",
      transformResponse: (response: ApiEnvelope<Vote[]>) => response.data,
      providesTags: ["Vote"],
    }),
    getVoteEligibility: builder.query<VoteEligibilityResult, string>({
      query: (id) => `/governance/votes/${id}/eligibility`,
      transformResponse: (response: ApiEnvelope<VoteEligibilityResult>) => response.data,
    }),
    castVote: builder.mutation<void, { voteId: string; optionId: number }>({
      query: ({ voteId, optionId }) => ({
        url: `/governance/votes/${voteId}/cast`,
        method: "POST",
        body: { optionId },
      }),
      invalidatesTags: ["Vote"],
    }),
  }),
});

export const { 
  useGetVotesQuery, 
  useGetVoteEligibilityQuery,
  useLazyGetVoteEligibilityQuery,
  useCastVoteMutation,
} = governanceApi;
