import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { workoutService } from '../lib/workoutService';
import { Workout } from '../types/workout';

export default function Workouts() {
  const [activeTab, setActiveTab] = useState<'popular' | 'saved'>('popular');
  const [popularWorkouts, setPopularWorkouts] = useState<Workout[]>([]);
  const [savedWorkouts, setSavedWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingWorkout, setSavingWorkout] = useState<string | null>(null);

  useEffect(() => {
    loadWorkouts();
  }, []);

  const loadWorkouts = async () => {
    try {
      setLoading(true);
      const [popular, saved] = await Promise.all([
        workoutService.getPopularWorkouts(),
        workoutService.getSavedWorkouts()
      ]);
      setPopularWorkouts(popular);
      setSavedWorkouts(saved);
    } catch (error) {
      Alert.alert('Error', 'Failed to load workouts');
      console.error('Error loading workouts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveWorkout = async (workoutId: string) => {
    try {
      setSavingWorkout(workoutId);
      await workoutService.toggleSaveWorkout(workoutId);
      
      // Refresh both lists to update save counts and saved status
      await loadWorkouts();
    } catch (error) {
      Alert.alert('Error', 'Failed to save workout');
      console.error('Error saving workout:', error);
    } finally {
      setSavingWorkout(null);
    }
  };

  const renderWorkoutCard = (workout: Workout, isSaved: boolean = false) => (
    <View key={workout.id} style={styles.workoutCard}>
      <View style={styles.workoutHeader}>
        <Text style={styles.workoutTitle}>{workout.name}</Text>
        <TouchableOpacity 
          style={[styles.saveButton, isSaved && styles.savedButton]} 
          onPress={() => handleSaveWorkout(workout.id)}
          disabled={savingWorkout === workout.id}
        >
          <Text style={styles.saveButtonText}>
            {savingWorkout === workout.id ? '...' : (isSaved ? '✓' : 'Save')}
          </Text>
        </TouchableOpacity>
      </View>
      
      <Text style={styles.workoutDescription}>{workout.description}</Text>
      
      <View style={styles.workoutStats}>
        <Text style={styles.workoutStat}>⏱️ {workout.estimated_duration_minutes} min</Text>
        <Text style={styles.workoutStat}>📊 {workout.difficulty_level}</Text>
        {workout.average_rating ? (
          <Text style={styles.workoutStat}>⭐ {workout.average_rating.toFixed(1)}</Text>
        ) : null}
        {workout.save_count && workout.save_count > 0 ? (
          <Text style={styles.workoutStat}>💾 {workout.save_count}</Text>
        ) : null}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B35" />
          <Text style={styles.loadingText}>Loading workouts...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Tab Switcher */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'popular' && styles.activeTab]} 
          onPress={() => setActiveTab('popular')}
        >
          <Text style={[styles.tabText, activeTab === 'popular' && styles.activeTabText]}>
            Popular
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'saved' && styles.activeTab]} 
          onPress={() => setActiveTab('saved')}
        >
          <Text style={[styles.tabText, activeTab === 'saved' && styles.activeTabText]}>
            Saved
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === 'popular' ? (
          <PopularWorkouts 
            workouts={popularWorkouts} 
            renderWorkoutCard={renderWorkoutCard}
          />
        ) : (
          <SavedWorkouts 
            workouts={savedWorkouts} 
            renderWorkoutCard={renderWorkoutCard}
          />
        )}
      </ScrollView>
    </View>
  );
}

function PopularWorkouts({ 
  workouts, 
  renderWorkoutCard 
}: { 
  workouts: Workout[]; 
  renderWorkoutCard: (workout: Workout, isSaved?: boolean) => React.ReactElement;
}) {
  return (
    <View style={styles.workoutSection}>
      <Text style={styles.sectionTitle}>Popular Workouts</Text>
      <Text style={styles.sectionSubtitle}>Discover trending workouts from the community</Text>
      
      {workouts.length > 0 ? (
        workouts.map(workout => renderWorkoutCard(workout, false))
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No popular workouts available</Text>
          <Text style={styles.emptyStateSubtext}>Check back later for new workouts!</Text>
        </View>
      )}
    </View>
  );
}

function SavedWorkouts({ 
  workouts, 
  renderWorkoutCard 
}: { 
  workouts: Workout[]; 
  renderWorkoutCard: (workout: Workout, isSaved?: boolean) => React.ReactElement;
}) {
  return (
    <View style={styles.workoutSection}>
      <Text style={styles.sectionTitle}>Saved Workouts</Text>
      <Text style={styles.sectionSubtitle}>Your personal workout collection</Text>
      
      {workouts.length > 0 ? (
        workouts.map(workout => renderWorkoutCard(workout, true))
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No saved workouts yet</Text>
          <Text style={styles.emptyStateSubtext}>Save workouts from the Popular section or create your own!</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A1A',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 10,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#333333',
    margin: 15,
    borderRadius: 10,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#FF6B35',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  activeTabText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    paddingHorizontal: 15,
  },
  workoutSection: {
    paddingBottom: 20,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF6B35',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 16,
    color: '#CCCCCC',
    marginBottom: 20,
  },
  workoutCard: {
    backgroundColor: '#333333',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B35',
  },
  workoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  workoutTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
    marginRight: 10,
  },
  saveButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    minWidth: 50,
    alignItems: 'center',
  },
  savedButton: {
    backgroundColor: '#4CAF50',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  workoutDescription: {
    fontSize: 14,
    color: '#CCCCCC',
    marginBottom: 12,
    lineHeight: 20,
  },
  workoutStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  workoutStat: {
    fontSize: 12,
    color: '#FF6B35',
    fontWeight: '500',
    marginRight: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#CCCCCC',
    textAlign: 'center',
    lineHeight: 20,
  },
}); 