export type HabitCategory =
  | 'all'
  | 'fitness'
  | 'study'
  | 'health'
  | 'personal'
  | 'work'
  | 'creativity'
  | 'spirituality'
  | 'home';

export type HabitCardColor =
  | 'zinc'
  | 'emerald'
  | 'sky'
  | 'amber'
  | 'violet'
  | 'rose'
  | 'teal'
  | 'indigo'
  | 'lime'
  | 'orange';

export type HabitSummary = {
  id: string;
  name: string;
  emoji: string;
  color?: HabitCardColor;
  category: HabitCategory;
  type: 'time' | 'count' | 'boolean' | 'number';
  unit: string;
  /**
   * Suma de todos los logs de este mes para este hábito
   * (horas, veces, unidades... según el tipo).
   */
  totalThisMonth: number;
  /**
   * Solo horas este mes, para la tarjeta y la métrica global.
   * 0 para hábitos que no son de tipo tiempo.
   */
  hoursThisMonth: number;
  completedToday: boolean;
  streak: number;
  history: { date: string; completed: boolean }[];
};
