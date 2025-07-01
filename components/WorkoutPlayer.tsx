import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Alert, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedProps,
  useSharedValue,
  withTiming
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { supabase } from '../lib/supabase';
import { workoutService } from '../lib/workoutService';
import { Drill as BaseDrill, WorkoutWithDrills } from '../types/workout';

type Drill = BaseDrill & { order_index: number; rest_time_seconds: number };

interface WorkoutPlayerProps {
  visible: boolean;
  workout: WorkoutWithDrills;
  onClose: () => void;
}

const PRE_WORKOUT_COUNTDOWN = 3;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// Custom Circular Timer Component using SVG
const CircularTimer = ({ 
  duration, 
  onComplete, 
  size = 240, 
  strokeWidth = 8,
  activeColor = "#FF6B35",
  inactiveColor = "rgba(255, 107, 53, 0.2)"
}: {
  duration: number;
  onComplete: () => void;
  size?: number;
  strokeWidth?: number;
  activeColor?: string;
  inactiveColor?: string;
}) => {
  const [timeLeft, setTimeLeft] = useState(duration);
  const progress = useSharedValue(0);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    // Start the progress animation
    progress.value = withTiming(1, { duration: duration * 1000 }, (finished) => {
      if (finished) {
        runOnJS(onComplete)();
      }
    });

    // Start the countdown timer
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [duration]);

  const animatedProps = useAnimatedProps(() => {
    const strokeDashoffset = circumference * progress.value;
    return {
      strokeDashoffset,
    };
  });

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <View style={{ width: size, height: size, position: 'relative' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        {/* Background circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={inactiveColor}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        
        {/* Progress circle */}
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={activeColor}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={circumference}
          animatedProps={animatedProps}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      
      {/* Timer text */}
      <View style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
      }}>
        <Text style={styles.progressValue}>
          {`${minutes}:${String(seconds).padStart(2, '0')}`}
        </Text>
      </View>
    </View>
  );
};

export default function WorkoutPlayer({ visible, workout, onClose }: WorkoutPlayerProps) {
  const [currentDrillIndex, setCurrentDrillIndex] = useState(-1);
  const [isResting, setIsResting] = useState(false);
  const [timerKey, setTimerKey] = useState(0);
  const [hasBegun, setHasBegun] = useState(false);
  const [isWorkoutComplete, setIsWorkoutComplete] = useState(false);

  const currentDrill = workout.drills[currentDrillIndex];

  useEffect(() => {
    if (visible) {
      setCurrentDrillIndex(-1);
      setIsResting(false);
      setHasBegun(false);
      setIsWorkoutComplete(false);
      setTimerKey(prev => prev + 1);
    }
  }, [visible]);

  const handleNext = () => {
    if (currentDrillIndex === -1) { // Finished "Get Ready"
      setCurrentDrillIndex(0);
      setIsResting(false);
    } else if (isResting) {
      // Finished resting, move to next drill
      setIsResting(false);
      setCurrentDrillIndex(prev => prev + 1);
    } else {
      // Finished drill, check if there's a next drill
      if (currentDrillIndex < workout.drills.length - 1) {
        // Move to rest period
        setIsResting(true);
      } else {
        // Workout finished
        setIsWorkoutComplete(true);
      }
    }
    setTimerKey(prev => prev + 1);
  };

  const handleClose = () => {
    Alert.alert(
      "Leave Workout?",
      "Are you sure you want to leave the workout?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Leave", onPress: onClose, style: "destructive" },
      ]
    );
  };

  const renderContent = () => {
    if (isWorkoutComplete) {
      return <CongratulationsView onClose={onClose} workout={workout} />;
    }

    if (currentDrillIndex === -1) {
      return <GetReadyView drill={workout.drills[0]} onComplete={handleNext} timerKey={timerKey} />;
    }

    if (isResting) {
      const nextDrill = workout.drills[currentDrillIndex + 1];
      return <RestView drill={currentDrill} onComplete={handleNext} nextDrillName={nextDrill?.name} timerKey={timerKey} />;
    }

    if (currentDrill.drill_type === 'time_based') {
      return <TimeBasedView drill={currentDrill} onComplete={handleNext} timerKey={timerKey} />;
    }

    if (currentDrill.drill_type === 'completion_based') {
      return <CompletionBasedView drill={currentDrill} onComplete={handleNext} />;
    }

    return null;
  };
  
  const PreWorkoutView = () => (
    <View style={styles.content}>
      <Text style={styles.preWorkoutTitle}>{workout.name}</Text>
      <TouchableOpacity onPress={() => setHasBegun(true)} style={styles.beginButton}>
        <Text style={styles.beginButtonText}>Begin</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <Modal visible={visible} animationType="fade" presentationStyle="fullScreen">
      <View style={styles.container}>
        {!isWorkoutComplete && (
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={32} color="#FFFFFF" />
            </TouchableOpacity>
        )}
        {hasBegun ? renderContent() : <PreWorkoutView />}
      </View>
    </Modal>
  );
}

const CongratulationsView = ({ onClose, workout }: { onClose: () => void, workout: WorkoutWithDrills }) => {
  const [saving, setSaving] = useState(false);

  const handleReturn = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      await workoutService.recordCompletedWorkout(user.id, workout.id);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to record completed workout.');
    } finally {
      setSaving(false);
      onClose();
    }
  };

  return (
    <View style={styles.content}>
      <Text style={styles.congratsTitle}>Congratulations!</Text>
      <Text style={styles.congratsSubtitle}>You've completed the workout.</Text>
      <TouchableOpacity onPress={handleReturn} style={styles.returnButton} disabled={saving}>
        {saving ? (
          <Text style={styles.returnButtonText}>Saving...</Text>
        ) : (
          <Text style={styles.returnButtonText}>Return to HeatCheck</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const GetReadyView = ({ drill, onComplete, timerKey }: { drill: Drill, onComplete: () => void, timerKey: number }) => (
  <View style={styles.content}>
    <Text style={styles.title}>Up Next</Text>
    <Text style={styles.drillName}>{drill.name}</Text>
    <CircularTimer
      key={timerKey}
      duration={PRE_WORKOUT_COUNTDOWN}
      onComplete={onComplete}
    />
  </View>
);

const RestView = ({ drill, onComplete, nextDrillName, timerKey }: { drill: Drill, onComplete: () => void, nextDrillName?: string, timerKey: number }) => (
  <View style={styles.content}>
    <Text style={styles.title}>Rest</Text>
    {nextDrillName && <Text style={styles.drillName}>Up Next: {nextDrillName}</Text>}
    <CircularTimer
      key={timerKey}
      duration={drill.rest_time_seconds || 30}
      onComplete={onComplete}
    />
  </View>
);

const TimeBasedView = ({ drill, onComplete, timerKey }: { drill: Drill, onComplete: () => void, timerKey: number }) => (
  <View style={styles.content}>
    <Text style={styles.title}>{drill.name}</Text>
    <CircularTimer
      key={timerKey}
      duration={drill.duration_seconds || 60}
      onComplete={onComplete}
    />
    <Text style={styles.instructions}>{drill.instructions}</Text>
  </View>
);

const CompletionBasedView = ({ drill, onComplete }: { drill: Drill, onComplete: () => void }) => (
  <View style={styles.content}>
    <Text style={styles.title}>{drill.name}</Text>
    <Text style={styles.targetText}>Complete {drill.target_count} reps</Text>
    <TouchableOpacity onPress={onComplete} style={styles.completeButton}>
      <Text style={styles.completeButtonText}>Complete</Text>
    </TouchableOpacity>
    <Text style={styles.instructions}>{drill.instructions}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    padding: 10,
    zIndex: 1,
  },
  content: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 20,
  },
  drillName: {
    fontSize: 24,
    color: '#FF6B35',
    textAlign: 'center',
    marginBottom: 40,
  },
  instructions: {
    fontSize: 16,
    color: '#CCCCCC',
    textAlign: 'center',
    marginTop: 40,
    paddingHorizontal: 20,
  },
  targetText: {
    fontSize: 24,
    color: '#FFFFFF',
    marginBottom: 40,
  },
  completeButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 30,
  },
  completeButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  preWorkoutTitle: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 60,
  },
  beginButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 48,
    paddingVertical: 16,
    borderRadius: 30,
  },
  beginButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  progressValue: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  congratsTitle: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#FF6B35',
    textAlign: 'center',
    marginBottom: 20,
  },
  congratsSubtitle: {
    fontSize: 20,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 60,
  },
  returnButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 30,
  },
  returnButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
}); 