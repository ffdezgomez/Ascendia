export type Profile = {
  user: string;                    // username visible (Nombre)
  email?: string;                  // opcional, solo lectura
  avatar: string;
  bio: string;
  habits: string[];
  stats: {
    readingHours: number;
    workoutHours: number;
    streak: number;
  };
}

export interface HabitStats {
  habitName: string;
  totalValue: number;
  avgValue: number;
  streak: number;
}

export interface ProfileStats {
  readingHours: number;
  workoutHours: number;
  streak: number;
  habitStats?: HabitStats[];
}
