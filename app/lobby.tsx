import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Clipboard, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { GameMode, GamePlayer } from '../types/game';

// Mock Data
const MOCK_PLAYERS: GamePlayer[] = [
  { id: '1', game_id: '123', user_id: 'user_a', username: 'PointGodWithAReallyLongName', team: 'Team A', score: 0, is_winner: false, joined_at: '' },
  { id: '2', game_id: '123', user_id: 'user_b', username: 'AnkleBreaker', team: 'Team A', score: 0, is_winner: false, joined_at: '' },
  { id: '3', game_id: '123', user_id: 'user_c', username: 'DunkMaster', team: 'Team B', score: 0, is_winner: false, joined_at: '' },
  { id: '4', game_id: '123', user_id: 'user_d', username: 'Swish', team: 'Team B', score: 0, is_winner: false, joined_at: '' },
  { id: '5', game_id: '123', user_id: 'user_e', username: 'TheRookie', team: 'Team A', score: 0, is_winner: false, joined_at: '' },
  { id: '6', game_id: '123', user_id: 'user_f', username: 'Clutch', team: 'Team B', score: 0, is_winner: false, joined_at: '' },
];
const MOCK_CURRENT_USER_ID = 'user_a'; 

const TEAM_A_COLOR = '#3B82F6'; // Blue
const TEAM_B_COLOR = '#8B5CF6'; // Purple

// Colors for 21 game mode players
const PLAYER_COLORS = ['#FF6B35', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];

export default function LobbyScreen() {
  const router = useRouter();
  const { game_code, game_mode, host_id } = useLocalSearchParams<{ game_code: string; game_mode: GameMode; host_id: string }>();
  const [players] = useState<GamePlayer[]>(MOCK_PLAYERS);

  const isHost = MOCK_CURRENT_USER_ID === host_id;

  const handleLeave = () => {
    Alert.alert('Leave Game', 'Are you sure you want to leave the lobby?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Leave', style: 'destructive', onPress: () => router.back() },
    ]);
  };

  const handleCopyCode = () => {
    if(game_code) {
        Clipboard.setString(game_code);
        Alert.alert('Copied!', 'Game code copied to clipboard.');
    }
  };

  const PlayerCard = ({ player, rank, teamColor, role }: { player: GamePlayer; rank?: number; teamColor?: string; role?: string }) => (
    <View style={[styles.playerCard, teamColor ? { borderLeftColor: teamColor, borderLeftWidth: 4 } : {}]}>
        <View style={styles.playerInfo}>
            {rank && <Text style={styles.playerRank}>#{rank}</Text>}
            <LinearGradient colors={['#4A4A4A', '#2C2C2C']} style={styles.playerAvatar} />
            <View style={styles.playerDetails}>
              <Text style={styles.playerText} numberOfLines={1}>{player.username}</Text>
              {role && <Text style={styles.playerRole}>{role}</Text>}
            </View>
        </View>
        {host_id === player.user_id && <Ionicons name="ribbon" size={20} color="#FFD700" />}
    </View>
  );

  const ClassicView = () => {
    const teamA = players.filter(p => p.team === 'Team A');
    const teamB = players.filter(p => p.team === 'Team B');
    const maxTeamSize = 5; // Example value

    return (
      <>
        <Text style={[styles.sectionHeader, { color: TEAM_A_COLOR }]}>TEAM A ({teamA.length}/{maxTeamSize})</Text>
        {teamA.map((p) => <PlayerCard key={p.id} player={p} teamColor={TEAM_A_COLOR} />)}

        <View style={styles.divider} />

        <Text style={[styles.sectionHeader, { color: TEAM_B_COLOR }]}>TEAM B ({teamB.length}/{maxTeamSize})</Text>
        {teamB.map((p) => <PlayerCard key={p.id} player={p} teamColor={TEAM_B_COLOR} />)}
      </>
    );
  };
  
  const KOTCView = () => {
    const onCourt = players.slice(0, 2);
    const queue = players.slice(2);
    const offensivePlayer = onCourt.length > 0 ? onCourt[0] : null;
    const defensivePlayer = onCourt.length > 1 ? onCourt[1] : null;

    return (
      <>
        <Text style={styles.sectionHeader}>ON COURT</Text>
        {offensivePlayer && (
            <PlayerCard player={offensivePlayer} role="KING" teamColor="#FF6B35" />
        )}

        {offensivePlayer && defensivePlayer && (
            <View style={styles.vsContainerKOTC}>
                <Text style={styles.vsText}>VS</Text>
            </View>
        )}
        
        {defensivePlayer && (
            <PlayerCard player={defensivePlayer} role="CHALLENGER" teamColor="#3B82F6" />
        )}

        {queue.length > 0 && <Text style={styles.sectionHeader}>QUEUE</Text>}
        {queue.map((p, i) => <PlayerCard key={p.id} player={p} rank={i+1} />)}
      </>
    );
  };

  const TwentyOneView = () => (
    <>
      <Text style={styles.sectionHeader}>PLAYERS ({players.length})</Text>
      {players.map((p, i) => <PlayerCard key={p.id} player={p} rank={i+1} teamColor={PLAYER_COLORS[i % PLAYER_COLORS.length]} />)}
    </>
  );

  return (
    <LinearGradient colors={['#1D1D1D', '#121212']} style={styles.container}>
      <Stack.Screen options={{ headerShown: false, presentation: 'modal' }} />
      <View style={styles.header}>
        <Text style={styles.gameModeText}>{game_mode}</Text>
        <TouchableOpacity onPress={handleLeave} style={styles.leaveButton}>
          <Ionicons name="log-out-outline" size={32} color="#FF4444" />
        </TouchableOpacity>
      </View>

      <View style={styles.gameCodeContainer}>
        <Text style={styles.gameCodeLabel}>GAME CODE</Text>
        <View style={styles.gameCodeBox}>
            <Text style={styles.gameCodeText}>{game_code}</Text>
            <TouchableOpacity onPress={handleCopyCode}>
                <Ionicons name="copy-outline" size={24} color="#FF6B35" />
            </TouchableOpacity>
        </View>
      </View>
      
      <ScrollView contentContainerStyle={{paddingBottom: 120}}>
        {game_mode === 'Classic' && <ClassicView />}
        {game_mode === '21' && <TwentyOneView />}
        {game_mode === 'King of the Court' && <KOTCView />}
      </ScrollView>

      {isHost && (
        <TouchableOpacity style={styles.startButton}>
            <LinearGradient colors={['#FF8C66', '#FF6B35']} style={styles.startButtonGradient}>
                <Text style={styles.startButtonText}>Start Game</Text>
                <Ionicons name="rocket-outline" size={20} color="#FFFFFF" />
            </LinearGradient>
        </TouchableOpacity>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: 60,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    gameModeText: {
        fontSize: 32,
        fontWeight: '900',
        color: '#FFFFFF',
    },
    leaveButton: {
        padding: 4,
    },
    gameCodeContainer: {
        marginHorizontal: 20,
        marginBottom: 30,
    },
    gameCodeLabel: {
        color: '#888',
        fontSize: 12,
        fontWeight: '600',
        letterSpacing: 1,
        marginBottom: 8,
    },
    gameCodeBox: {
        backgroundColor: '#1A1A1A',
        borderRadius: 12,
        paddingHorizontal: 20,
        paddingVertical: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    gameCodeText: {
        color: '#FFFFFF',
        fontSize: 24,
        fontWeight: '700',
        letterSpacing: 3,
    },
    divider: {
        height: 1,
        backgroundColor: '#2C2C2C',
        marginVertical: 30,
        marginHorizontal: 20,
    },
    sectionHeader: {
        color: '#888',
        fontSize: 12,
        fontWeight: '600',
        letterSpacing: 1,
        marginBottom: 15,
        paddingHorizontal: 20,
    },
    playerCard: {
        backgroundColor: '#2C2C2C',
        borderRadius: 12,
        padding: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
        marginHorizontal: 20,
    },
    playerInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: 10,
    },
    playerDetails: {
      flex: 1,
    },
    playerAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 15,
    },
    playerText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#FFFFFF',
        flex: 1,
    },
    playerRole: {
      fontSize: 12,
      color: '#AAAAAA',
      fontWeight: '500',
      marginTop: 2,
    },
    playerRank: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#888',
        marginRight: 10,
        minWidth: 24,
        textAlign: 'center',
    },
    highlightCard: {
        borderRadius: 16,
        marginHorizontal: 20,
        marginBottom: 10,
    },
    vsText: {
        color: '#FF6B35',
        fontWeight: '900',
        fontSize: 18,
        marginVertical: 10,
    },
    vsContainerKOTC: {
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: -5,
    },
    startButton: {
        position: 'absolute',
        bottom: 40,
        left: 20,
        right: 20,
        shadowColor: '#FF6B35',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 15,
        elevation: 10,
    },
    startButtonGradient: {
        borderRadius: 16,
        padding: 18,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    startButtonText: {
        fontSize: 18,
        color: '#FFFFFF',
        fontWeight: 'bold',
        marginRight: 10,
    },
}); 