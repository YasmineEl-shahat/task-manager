export type StatisticsChangeType = 'positive' | 'negative' | 'neutral';

export interface DashboardStatistic {
  id: string;
  title: string;
  icon: string;
  value: number;
  change: string;
  changeLabel: string;
  changeType: StatisticsChangeType;
  color: string;
}

export interface DashboardStatisticsResponse {
  statistics: DashboardStatistic[];
  lastUpdated: string;
}
