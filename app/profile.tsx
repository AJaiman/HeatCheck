import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../lib/supabase';
import { workoutService } from '../lib/workoutService';

export default function Profile() {
  const [activeTab, setActiveTab] = useState<'games' | 'workouts'>('games');
  const [hoopname, setHoopname] = useState<string | null>(null);
  const [elo, setElo] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [workoutsLoading, setWorkoutsLoading] = useState(false);
  const [completedWorkouts, setCompletedWorkouts] = useState<any[]>([]);
  const [gameHistory, setGameHistory] = useState<any[]>([]);
  const [gamesLoading, setGamesLoading] = useState(false);

  // Fetch profile and game history on mount and when focused
  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      const fetchProfileAndGames = async () => {
        setLoading(true);
        setGamesLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Fetch profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('hoopname, elo')
            .eq('id', user.id)
            .maybeSingle();
          if (isActive) {
            setHoopname(profile?.hoopname || '');
            setElo(typeof profile?.elo === 'number' ? profile.elo : null);
          }
          // Fetch game history
          const { data: games, error } = await supabase
            .from('game_players')
            .select(`
              id,
              score,
              is_winner,
              elo_before,
              elo_after,
              game_id,
              games(game_code, game_mode, game_type, status)
            `)
            .eq('user_id', user.id)
            .order('id', { ascending: false });
          if (error) {
            Alert.alert('Error', error.message || 'Failed to fetch game history.');
          } else if (isActive) {
            // Map to UI format
            const mapped = (games || []).map((g: any) => ({
              id: g.id,
              gameMode: g.games?.game_mode || '',
              gameType: g.games?.game_type || '',
              result: g.tie ? 'T' : (g.is_winner === true ? 'W' : (g.is_winner === false ? 'L' : 'T')),
              eloChange: (g.games?.game_type === 'Ranked' && typeof g.elo_before === 'number' && typeof g.elo_after === 'number')
                ? (g.elo_after - g.elo_before === 0 ? null : (g.elo_after - g.elo_before > 0 ? `+${g.elo_after - g.elo_before}` : `${g.elo_after - g.elo_before}`))
                : null,
              // No date field since created_at does not exist
            }));
            setGameHistory(mapped);
          }
        }
        setLoading(false);
        setGamesLoading(false);
      };
      fetchProfileAndGames();
      return () => { isActive = false; };
    }, [])
  );

  useEffect(() => {
    const fetchWorkouts = async () => {
      setWorkoutsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        try {
          const workouts = await workoutService.fetchCompletedWorkouts(user.id);
          setCompletedWorkouts(workouts || []);
        } catch (err: any) {
          Alert.alert('Error', err.message || 'Failed to fetch completed workouts.');
        }
      }
      setWorkoutsLoading(false);
    };
    if (activeTab === 'workouts') {
      fetchWorkouts();
    }
  }, [activeTab]);

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
  const workoutsCompleted = completedWorkouts.length;
  
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
        {/* Remove date display since there is no date */}
      </View>
      <View style={styles.historyRight}>
        <View style={[styles.resultBadge, game.result === 'W' ? styles.winBadge : (game.result === 'L' ? styles.lossBadge : styles.tieBadge)]}>
          <Text style={styles.resultText}>{game.result}</Text>
        </View>
        {/* Only show eloChange for ranked games, nothing for casual */}
        {game.gameType === 'Ranked' && (
          game.eloChange ? (
            <Text style={[styles.eloChange, game.eloChange.startsWith('+') ? styles.positiveElo : styles.negativeElo]}>
              {game.eloChange}
            </Text>
          ) : (
            <Text style={styles.noEloChange}>No change</Text>
          )
        )}
      </View>
    </View>
  );

  const WorkoutHistoryItem = ({ workout }: { workout: any }) => (
    <View style={styles.historyItem}>
      <View style={styles.historyLeft}>
        <Text style={styles.historyTitle}>{workout.workout?.name || 'Workout'}</Text>
        <Text style={styles.historyDate}>{workout.completed_at ? new Date(workout.completed_at).toLocaleDateString() : ''}</Text>
      </View>
      <View style={styles.historyRight}>
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
        <ScrollView 
          style={styles.historyList}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled={true}
        >
          {activeTab === 'games' ? (
            gamesLoading ? (
              <ActivityIndicator size="small" color="#FF6B35" style={{ marginTop: 20 }} />
            ) : gameHistory.length === 0 ? (
              <Text style={{ color: '#888', textAlign: 'center', marginTop: 20 }}>No games played yet.</Text>
            ) : (
              gameHistory.map(game => (
                <GameHistoryItem key={game.id} game={game} />
              ))
            )
          ) : (
            workoutsLoading ? (
              <ActivityIndicator size="small" color="#FF6B35" style={{ marginTop: 20 }} />
            ) : completedWorkouts.length === 0 ? (
              <Text style={{ color: '#888', textAlign: 'center', marginTop: 20 }}>No completed workouts yet.</Text>
            ) : (
              completedWorkouts.map(workout => (
                <WorkoutHistoryItem key={workout.id} workout={workout} />
              ))
            )
          )}
        </ScrollView>
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
    maxHeight: 400,
    paddingBottom: 8,
  },
  historyItem: {
    backgroundColor: '#2C2C2C',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
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
  tieBadge: {
    backgroundColor: '#888',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 8,
  },
}); 