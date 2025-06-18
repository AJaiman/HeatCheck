export interface Drill {
  id: string;
  name: string;
  description: string;
  drill_type: 'time_based' | 'completion_based';
  duration_seconds?: number;
  target_count?: number;
  instructions: string;
  difficulty_level: 'beginner' | 'intermediate' | 'advanced';
  category: string;
  created_at?: string;
  updated_at?: string;
}

export interface Workout {
  id: string;
  name: string;
  description: string;
  difficulty_level: 'beginner' | 'intermediate' | 'advanced';
  estimated_duration_minutes: number;
  category: string;
  is_public: boolean;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  save_count?: number;
  average_rating?: number;
  rating_count?: number;
  is_saved?: boolean;
}

export interface WorkoutWithDrills extends Workout {
  drills: (Drill & { order_index: number; rest_time_seconds: number })[];
}

export interface WorkoutRating {
  id: string;
  user_id: string;
  workout_id: string;
  rating: number;
  review?: string;
  created_at: string;
} 