import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import WorkoutPlayer from '../components/WorkoutPlayer';
import { workoutService } from '../lib/workoutService';
import { Workout, WorkoutWithDrills } from '../types/workout';

export default function Workouts() {
  const [activeTab, setActiveTab] = useState<'popular' | 'saved'>('popular');
  const [popularWorkouts, setPopularWorkouts] = useState<Workout[]>([]);
  const [savedWorkouts, setSavedWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingWorkout, setSavingWorkout] = useState<string | null>(null);
  const [selectedWorkout, setSelectedWorkout] = useState<WorkoutWithDrills | null>(null);
  const [showWorkoutDetail, setShowWorkoutDetail] = useState(false);
  const [loadingWorkoutDetail, setLoadingWorkoutDetail] = useState(false);
  const [isWorkoutActive, setIsWorkoutActive] = useState(false);

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
      
      await loadWorkouts();
    } catch (error) {
      Alert.alert('Error', 'Failed to save workout');
      console.error('Error saving workout:', error);
    } finally {
      setSavingWorkout(null);
    }
  };

  const handleWorkoutPress = async (workout: Workout) => {
    try {
      setLoadingWorkoutDetail(true);
      const workoutWithDrills = await workoutService.getWorkoutWithDrills(workout.id);
      setSelectedWorkout(workoutWithDrills);
      setShowWorkoutDetail(true);
    } catch (error) {
      Alert.alert('Error', 'Failed to load workout details');
      console.error('Error loading workout details:', error);
    } finally {
      setLoadingWorkoutDetail(false);
    }
  };

  const handleStartWorkout = () => {
    setShowWorkoutDetail(false);
    setIsWorkoutActive(true);
  };

  const handleWorkoutFinish = () => {
    setIsWorkoutActive(false);
    setSelectedWorkout(null);
  };

  const renderWorkoutCard = (workout: Workout, isSaved: boolean = false) => (
    <TouchableOpacity 
      key={workout.id} 
      style={styles.workoutCard}
      onPress={() => handleWorkoutPress(workout)}
      disabled={loadingWorkoutDetail}
    >
      <View style={styles.workoutHeader}>
        <Text style={styles.workoutTitle}>{workout.name}</Text>
        <TouchableOpacity 
          style={[styles.heartButton, isSaved && styles.savedHeartButton]} 
          onPress={(e) => {
            e.stopPropagation();
            handleSaveWorkout(workout.id);
          }}
          disabled={savingWorkout === workout.id}
        >
          {savingWorkout === workout.id ? (
            <Text style={styles.heartIcon}>...</Text>
          ) : (
            <Ionicons 
              name={isSaved ? "heart" : "heart-outline"} 
              size={24} 
              color="#FF6B35" 
            />
          )}
        </TouchableOpacity>
      </View>
      
      <Text style={styles.workoutDescription}>{workout.description}</Text>
      
      <View style={styles.workoutStats}>
        <Text style={styles.workoutStat}>⏱️ {workout.estimated_duration_minutes} min</Text>
        <Text style={styles.workoutStat}>📊 {workout.difficulty_level}</Text>
        {workout.average_rating ? (
          <Text style={styles.workoutStat}>⭐ {workout.average_rating.toFixed(1)}</Text>
        ) : null}
      </View>
    </TouchableOpacity>
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

      {/* Workout Detail Modal */}
      {selectedWorkout && (
        <WorkoutDetailModal
          visible={showWorkoutDetail}
          workout={selectedWorkout}
          onClose={() => {
            setShowWorkoutDetail(false);
            setSelectedWorkout(null);
          }}
          onStart={handleStartWorkout}
        />
      )}

      {selectedWorkout && (
        <WorkoutPlayer
          visible={isWorkoutActive}
          workout={selectedWorkout}
          onClose={handleWorkoutFinish}
        />
      )}
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
        workouts.map(workout => renderWorkoutCard(workout, workout.is_saved))
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

// Workout Detail Modal Component
function WorkoutDetailModal({ 
  visible, 
  workout, 
  onClose,
  onStart,
}: { 
  visible: boolean; 
  workout: WorkoutWithDrills | null; 
  onClose: () => void;
  onStart: () => void;
}) {
  if (!workout) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={modalStyles.container}>
        {/* Header */}
        <View style={modalStyles.header}>
          <TouchableOpacity onPress={onClose} style={modalStyles.closeButton}>
            <Ionicons name="close-circle" size={28} color="#666" />
          </TouchableOpacity>
          <Text style={modalStyles.title} numberOfLines={1}>{workout.name}</Text>
          <TouchableOpacity onPress={onStart} style={modalStyles.startButton}>
            <Text style={modalStyles.startButtonText}>Start</Text>
          </TouchableOpacity>
        </View>

        {/* Description */}
        <Text style={modalStyles.description}>{workout.description}</Text>

        {/* Workout Stats */}
        <View style={modalStyles.statsContainer}>
          <View style={modalStyles.stat}>
            <Text style={modalStyles.statLabel}>Duration</Text>
            <Text style={modalStyles.statValue}>{workout.estimated_duration_minutes} min</Text>
          </View>
          <View style={modalStyles.stat}>
            <Text style={modalStyles.statLabel}>Difficulty</Text>
            <Text style={modalStyles.statValue}>{workout.difficulty_level}</Text>
          </View>
          <View style={modalStyles.stat}>
            <Text style={modalStyles.statLabel}>Drills</Text>
            <Text style={modalStyles.statValue}>{workout.drills.length}</Text>
          </View>
        </View>

        {/* Drills List */}
        <View style={modalStyles.drillsSection}>
          <Text style={modalStyles.sectionTitle}>Drills</Text>
          <ScrollView style={modalStyles.drillsList} showsVerticalScrollIndicator={false}>
            {workout.drills.map((drill) => (
              <View key={`${drill.id}-${drill.order_index}`} style={modalStyles.drillCard}>
                <View style={modalStyles.drillHeader}>
                  <Text style={modalStyles.drillNumber}>{drill.order_index}</Text>
                  <Text style={modalStyles.drillName}>{drill.name}</Text>
                  <View style={modalStyles.drillType}>
                    <Text style={modalStyles.drillTypeText}>
                      {drill.drill_type === 'time_based' ? '⏱️' : '🎯'}
                    </Text>
                  </View>
                </View>
                
                <Text style={modalStyles.drillDescription}>{drill.description}</Text>
                
                <View style={modalStyles.drillDetails}>
                  <Text style={modalStyles.drillInstructions}>{drill.instructions}</Text>
                  {drill.duration_seconds && (
                    <Text style={modalStyles.drillTarget}>
                      Duration: {Math.floor(drill.duration_seconds / 60)}:{(drill.duration_seconds % 60).toString().padStart(2, '0')}
                    </Text>
                  )}
                  {drill.target_count && (
                    <Text style={modalStyles.drillTarget}>
                      Target: {drill.target_count} reps
                    </Text>
                  )}
                  {drill.rest_time_seconds && (
                    <Text style={modalStyles.drillRest}>
                      Rest: {drill.rest_time_seconds}s
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
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
  heartButton: {
    padding: 8,
    minWidth: 40,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  savedHeartButton: {
    // No additional styling needed for saved state
  },
  heartIcon: {
    fontSize: 18,
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

const modalStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A1A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  closeButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },
  startButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  startButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  description: {
    fontSize: 16,
    color: '#CCCCCC',
    padding: 16,
    lineHeight: 24,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  stat: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#CCCCCC',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  drillsSection: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF6B35',
    padding: 16,
    paddingBottom: 8,
  },
  drillsList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  drillCard: {
    backgroundColor: '#333333',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B35',
  },
  drillHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  drillNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF6B35',
    marginRight: 12,
    minWidth: 24,
  },
  drillName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
  },
  drillType: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  drillTypeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  drillDescription: {
    fontSize: 14,
    color: '#CCCCCC',
    marginBottom: 12,
    lineHeight: 20,
  },
  drillDetails: {
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    padding: 12,
  },
  drillInstructions: {
    fontSize: 13,
    color: '#CCCCCC',
    lineHeight: 18,
    marginBottom: 8,
  },
  drillTarget: {
    fontSize: 12,
    color: '#FF6B35',
    fontWeight: '500',
    marginTop: 4,
  },
  drillRest: {
    fontSize: 12,
    color: '#CCCCCC',
    marginTop: 4,
  },
}); 