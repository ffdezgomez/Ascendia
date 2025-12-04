import type { Types } from "mongoose"

export interface IHabit extends Document {
  name: string;
  description?: string;
  type: string;
  unit: string;
  user: Types.ObjectId;
  logs: Types.ObjectId[];
  category?:
    | 'fitness'
    | 'study'
    | 'health'
    | 'personal'
    | 'work'
    | 'creativity'
    | 'spirituality'
    | 'home';
  emoji?: string;
  color?:
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
}