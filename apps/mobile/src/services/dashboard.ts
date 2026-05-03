import { api } from "./api";

export interface AttentionItem {
  type: string;
  label: string;
  count: number;
  route: string;
}

export interface Shortcut {
  key: string;
  label: string;
  route: string;
  icon: string;
}

export interface DashboardData {
  role: string;
  attentionItems: AttentionItem[];
  shortcuts: Shortcut[];
  stats: Record<string, number>;
}

export const dashboardApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getDashboard: builder.query<DashboardData, void>({
      query: () => "/dashboard",
      transformResponse: (response: { data: DashboardData }) => response.data,
    }),
  }),
});

export const { useGetDashboardQuery } = dashboardApi;
