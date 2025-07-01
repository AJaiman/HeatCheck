import { Workout, WorkoutRating, WorkoutWithDrills } from '../types/workout';
import { supabase } from './supabase';

export const workoutService = {
  // Get popular workouts
  async getPopularWorkouts(): Promise<Workout[]> {
    const { data: { user } } = await supabase.auth.getUser();
    
    let query = supabase
      .from('popular_workouts')
      .select('*')
      .order('save_count', { ascending: false })
      .limit(20);
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    if (!user) {
      // If no user, return workouts without saved status
      return (data || []).map(workout => ({ ...workout, is_saved: false }));
    }
    
    // Get user's saved workout IDs
    const { data: savedWorkouts } = await supabase
      .from('user_saved_workouts')
      .select('workout_id')
      .eq('user_id', user.id);
    
    const savedWorkoutIds = new Set(savedWorkouts?.map(sw => sw.workout_id) || []);
    
    // Add is_saved field to each workout
    return (data || []).map(workout => ({
      ...workout,
      is_saved: savedWorkoutIds.has(workout.id)
    }));
  },

  // Get user's saved workouts
  async getSavedWorkouts(): Promise<Workout[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('workouts')
      .select(`
        *,
        user_saved_workouts!inner(user_id)
      `)
      .eq('user_saved_workouts.user_id', user.id);
    
    if (error) throw error;
    return data || [];
  },

  // Save/unsave a workout
  async toggleSaveWorkout(workoutId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Check if already saved
    const { data: existing } = await supabase
      .from('user_saved_workouts')
      .select('id')
      .eq('user_id', user.id)
      .eq('workout_id', workoutId)
      .single();

    if (existing) {
      // Unsave
      const { error } = await supabase
        .from('user_saved_workouts')
        .delete()
        .eq('user_id', user.id)
        .eq('workout_id', workoutId);
      
      if (error) throw error;
    } else {
      // Save
      const { error } = await supabase
        .from('user_saved_workouts')
        .insert({ user_id: user.id, workout_id: workoutId });
      
      if (error) throw error;
    }
  },

  // Get workout with all drills
  async getWorkoutWithDrills(workoutId: string): Promise<WorkoutWithDrills> {
    const { data, error } = await supabase
      .from('workouts')
      .select(`
        *,
        workout_drills(
          order_index,
          rest_time_seconds,
          drills(*)
        )
      `)
      .eq('id', workoutId)
      .single();
    
    if (error) throw error;
    
    // Transform the data
    const drills = data.workout_drills
      .sort((a: any, b: any) => a.order_index - b.order_index)
      .map((wd: any) => ({
        ...wd.drills,
        order_index: wd.order_index,
        rest_time_seconds: wd.rest_time_seconds,
      }));

    return {
      ...data,
      drills,
    } as WorkoutWithDrills;
  },

  // Rate a workout
  async rateWorkout(workoutId: string, rating: number, review?: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('workout_ratings')
      .upsert({
        user_id: user.id,
        workout_id: workoutId,
        rating,
        review,
      });
    
    if (error) throw error;
  },

  // Get user's rating for a workout
  async getUserRating(workoutId: string): Promise<WorkoutRating | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('workout_ratings')
      .select('*')
      .eq('user_id', user.id)
      .eq('workout_id', workoutId)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned
    return data;
  },

  // Record Complete Workout
  async recordCompletedWorkout(userId: string, workoutId: string) {
    const { error } = await supabase
      .from('user_completed_workouts')
      .insert([{ user_id: userId, workout_id: workoutId }]);
    if (error) throw error;
  },

  // Fetch Completed Workouts
  async fetchCompletedWorkouts(userId: string) {
    const { data, error } = await supabase
      .from('user_completed_workouts')
      .select('id, completed_at, workout:workout_id(name)')
      .eq('user_id', userId)
      .order('completed_at', { ascending: false });
    if (error) throw error;
    return data;
  },
}; 