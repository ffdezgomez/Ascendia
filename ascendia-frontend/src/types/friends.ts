export type FriendSummary = {
  id: string;
  username: string;
  avatar?: string;
}

export type FriendRequestSummary = {
  id: string;
  user: FriendSummary;
}

export type FriendsOverview = {
  friends: FriendSummary[];
  incoming: FriendRequestSummary[];
  outgoing: FriendRequestSummary[];
}

export type FriendHabitSummary = {
  id: string;
  name: string;
  emoji: string;
  color?: string;
  category: string;
  type: 'time' | 'count' | 'boolean' | 'number';
  unit: string;
  totalThisMonth: number;
  hoursThisMonth: number;
  completedToday: boolean;
  streak: number;
  history: { date: string; completed: boolean }[];
}

export type HabitComparisonSummary = {
  id: string;
  unit: string;
  type: FriendHabitSummary['type'];
  ownerHabit: FriendHabitSummary;
  friendHabit: FriendHabitSummary;
  deltaThisMonth: number;
  createdAt: string;
}

export type FriendDashboard = {
  habits: FriendHabitSummary[];
  comparisons: HabitComparisonSummary[];
}

export type ComparisonCandidatesResponse = {
  unit: string;
  type: FriendHabitSummary['type'];
  habits: FriendHabitSummary[];
}

export type PendingDirection = 'incoming' | 'outgoing' | null;

export type SearchFriendResult = {
  user: FriendSummary;
  alreadyFriends: boolean;
  pendingDirection: PendingDirection;
}
