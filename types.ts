
export enum Gender {
  Male = 'Male',
  Female = 'Female',
  Other = 'Other'
}

export enum Goal {
  LoseWeight = 'Lose Weight',
  BuildMuscle = 'Build Muscle',
  ImproveEndurance = 'Improve Endurance',
  Flexibility = 'Flexibility & Mobility',
  GeneralFitness = 'General Fitness'
}

export enum ExperienceLevel {
  Beginner = 'Beginner',
  Intermediate = 'Intermediate',
  Advanced = 'Advanced'
}

export enum Equipment {
  None = 'Bodyweight Only',
  YogaMat = 'Yoga Mat',
  JumpRope = 'Jump Rope',
  Dumbbells = 'Dumbbells',
  Kettlebell = 'Kettlebell',
  ResistanceBands = 'Resistance Bands',
  PullUpBar = 'Pull-up Bar',
  Bench = 'Adjustable Bench',
  FoamRoller = 'Foam Roller',
  Barbell = 'Barbell & Plates',
  FullHomeGym = 'Full Home Gym'
}

export interface UserProfile {
  age: number;
  height: number; // cm
  weight: number; // kg
  gender: Gender;
  goal: Goal;
  level: ExperienceLevel;
  equipment: Equipment[];
  daysPerWeek: number;
  durationPerSession: number; // minutes
  injuries?: string;
}

export interface Exercise {
  name: string;
  sets: string;
  reps: string;
  rest: string;
  notes?: string;
  instructions?: string;
  videoUrl?: string;
}

export interface DayPlan {
  dayName: string; // e.g., "Monday", "Day 1"
  focus: string; // e.g., "Upper Body Push", "Active Recovery"
  exercises: Exercise[];
  estimatedDuration: string;
}

export interface WeeklyPlan {
  weekNumber: number;
  focus: string; // e.g., "Foundation & Stability"
  schedule: DayPlan[];
}

export interface WorkoutCurriculum {
  programName: string;
  description: string;
  weeks: WeeklyPlan[];
  nutritionTips: string[];
  startDate?: string;
}

export interface ProgressEntry {
  date: string;
  weight: number;
}

export interface WorkoutLog {
  id: string;
  date: string;
  dayId: string;
  dayName: string;
  focus: string;
  duration: string;
  notes?: string;
}
