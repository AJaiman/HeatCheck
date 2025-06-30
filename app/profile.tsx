import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../lib/supabase';

export default function Profile() {
  const [activeTab, setActiveTab] = useState<'games' | 'workouts'>('games');
  const [hoopname, setHoopname] = useState<string | null>(null);
  const [elo, setElo] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('hoopname, elo')
          .eq('id', user.id)
          .maybeSingle();
        setHoopname(profile?.hoopname || '');
        setElo(typeof profile?.elo === 'number' ? profile.elo : null);
      }
      setLoading(false);
    };
    fetchProfile();
  }, []);

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        Alert.alert('Logout Error', error.message);
      } else {
        Alert.alert('Success', 'Logged out successfully!');
        // Redirect to index page after successful logout
        router.replace('/');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    }
  };

  // Placeholder data
  const winPercentage = 68;
  const workoutsCompleted = 24;
  
  const gameHistory = [
    { id: 1, gameMode: 'Classic', gameType: 'Ranked', result: 'W', eloChange: '+15', date: '2024-01-15' },
    { id: 2, gameMode: '21', gameType: 'Casual', result: 'L', eloChange: null, date: '2024-01-12' },
    { id: 3, gameMode: 'King of the Court', gameType: 'Ranked', result: 'W', eloChange: '+12', date: '2024-01-10' },
    { id: 4, gameMode: 'Classic', gameType: 'Casual', result: 'W', eloChange: null, date: '2024-01-08' },
    { id: 5, gameMode: '21', gameType: 'Ranked', result: 'L', eloChange: '-5', date: '2024-01-05' },
  ];

  const workoutHistory = [
    { id: 1, name: 'Shooting Drills', duration: '45 min', date: '2024-01-15' },
    { id: 2, name: 'Dribbling Mastery', duration: '30 min', date: '2024-01-14' },
    { id: 3, name: 'Defensive Training', duration: '60 min', date: '2024-01-12' },
    { id: 4, name: 'Speed & Agility', duration: '40 min', date: '2024-01-10' },
    { id: 5, name: 'Strength Building', duration: '50 min', date: '2024-01-08' },
  ];

  const StatCard = ({ title, value, subtitle, icon }: { title: string; value: string; subtitle: string; icon: keyof typeof Ionicons.glyphMap }) => (
    <View style={styles.statCard}>
      <View style={styles.statHeader}>
        <Ionicons name={icon} size={24} color="#FF6B35" />
        <Text style={styles.statTitle}>{title}</Text>
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statSubtitle}>{subtitle}</Text>
    </View>
  );

  const GameHistoryItem = ({ game }: { game: any }) => (
    <View style={styles.historyItem}>
      <View style={styles.historyLeft}>
        <View style={styles.gameInfo}>
          <Text style={styles.historyTitle}>{game.gameMode}</Text>
          <View style={[styles.gameTypeBadge, game.gameType === 'Ranked' ? styles.rankedBadge : styles.casualBadge]}>
            <Text style={styles.gameTypeText}>{game.gameType}</Text>
          </View>
        </View>
        <Text style={styles.historyDate}>{game.date}</Text>
      </View>
      <View style={styles.historyRight}>
        <View style={[styles.resultBadge, game.result === 'W' ? styles.winBadge : styles.lossBadge]}>
          <Text style={styles.resultText}>{game.result}</Text>
        </View>
        {game.eloChange ? (
          <Text style={[styles.eloChange, game.eloChange.startsWith('+') ? styles.positiveElo : styles.negativeElo]}>
            {game.eloChange}
          </Text>
        ) : (
          <Text style={styles.noEloChange}>No change</Text>
        )}
      </View>
    </View>
  );

  const WorkoutHistoryItem = ({ workout }: { workout: any }) => (
    <View style={styles.historyItem}>
      <View style={styles.historyLeft}>
        <Text style={styles.historyTitle}>{workout.name}</Text>
        <Text style={styles.historyDate}>{workout.date}</Text>
      </View>
      <View style={styles.historyRight}>
        <Text style={styles.workoutDuration}>{workout.duration}</Text>
        <Ionicons name="checkmark-circle" size={20} color="#10B981" />
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      {/* Hoopname at the top */}
      <View style={styles.hoopnameContainer}>
        {loading ? (
          <ActivityIndicator size="small" color="#FF6B35" />
        ) : (
          <Text style={styles.hoopname}>{hoopname}</Text>
        )}
      </View>
      {/* Elo Card */}
      <View style={styles.eloCard}>
        <LinearGradient colors={['#FF8C66', '#FF6B35']} style={styles.eloGradient}>
          <Text style={styles.eloLabel}>ELO RATING</Text>
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" style={{ marginVertical: 16 }} />
          ) : (
            <Text style={styles.eloValue}>{elo !== null ? elo : 'N/A'}</Text>
          )}
          <Text style={styles.eloSubtitle}>Competitive Rank</Text>
        </LinearGradient>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <StatCard 
          title="Win Rate" 
          value={`${winPercentage}%`} 
          subtitle="Last 30 days"
          icon="trophy-outline"
        />
        <StatCard 
          title="Workouts" 
          value={workoutsCompleted.toString()} 
          subtitle="Completed"
          icon="barbell-outline"
        />
      </View>

      {/* History Section */}
      <View style={styles.historySection}>
        <Text style={styles.sectionTitle}>History</Text>
        
        {/* Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'games' && styles.activeTab]} 
            onPress={() => setActiveTab('games')}
          >
            <Text style={[styles.tabText, activeTab === 'games' && styles.activeTabText]}>Games</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'workouts' && styles.activeTab]} 
            onPress={() => setActiveTab('workouts')}
          >
            <Text style={[styles.tabText, activeTab === 'workouts' && styles.activeTabText]}>Workouts</Text>
          </TouchableOpacity>
        </View>

        {/* History List */}
        <View style={styles.historyList}>
          {activeTab === 'games' ? (
            gameHistory.map(game => (
              <GameHistoryItem key={game.id} game={game} />
            ))
          ) : (
            workoutHistory.map(workout => (
              <WorkoutHistoryItem key={workout.id} workout={workout} />
            ))
          )}
        </View>
      </View>

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Log Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    paddingTop: 60,
  },
  hoopnameContainer: {
    marginTop: -30,
    marginBottom: 18,
    alignItems: 'center',
  },
  hoopname: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 1,
  },
  eloCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  eloGradient: {
    padding: 24,
    alignItems: 'center',
  },
  eloLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    opacity: 0.9,
    letterSpacing: 1,
  },
  eloValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginVertical: 8,
  },
  eloSubtitle: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.8,
  },
  statsContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 30,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#2C2C2C',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B35',
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#CCCCCC',
    marginLeft: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  statSubtitle: {
    fontSize: 12,
    color: '#888888',
  },
  historySection: {
    marginHorizontal: 20,
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF6B35',
    marginBottom: 16,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#333333',
    borderRadius: 10,
    padding: 4,
    marginBottom: 16,
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
    color: '#CCCCCC',
  },
  activeTabText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  historyList: {
    gap: 8,
  },
  historyItem: {
    backgroundColor: '#2C2C2C',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyLeft: {
    flex: 1,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  historyDate: {
    fontSize: 14,
    color: '#888888',
  },
  historyRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  resultBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 24,
    alignItems: 'center',
  },
  winBadge: {
    backgroundColor: '#10B981',
  },
  lossBadge: {
    backgroundColor: '#EF4444',
  },
  resultText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  eloChange: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  positiveElo: {
    color: '#10B981',
  },
  negativeElo: {
    color: '#EF4444',
  },
  workoutDuration: {
    fontSize: 14,
    color: '#CCCCCC',
    marginBottom: 4,
  },
  logoutButton: {
    backgroundColor: '#FF6B35',
    marginHorizontal: 20,
    marginBottom: 40,
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  noEloChange: {
    fontSize: 14,
    color: '#888888',
  },
  gameInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  gameTypeBadge: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 4,
  },
  gameTypeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  rankedBadge: {
    backgroundColor: '#FF6B35',
  },
  casualBadge: {
    backgroundColor: '#888888',
  },
}); 