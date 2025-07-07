import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Clipboard, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { gameService } from '../lib/gameService';
import { supabase } from '../lib/supabase';
import { GameMode, GamePlayer } from '../types/game';

const TEAM_A_COLOR = '#3B82F6'; // Blue
const TEAM_B_COLOR = '#8B5CF6'; // Purple

// Colors for 21 game mode players
const PLAYER_COLORS = ['#FF6B35', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];

export default function LobbyScreen() {
  const router = useRouter();
  const { game_code, game_mode, host_id } = useLocalSearchParams<{ game_code: string; game_mode: GameMode; host_id: string }>();
  const [players, setPlayers] = useState<GamePlayer[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentHoopname, setCurrentHoopname] = useState<string>('');
  const [maxPlayersPerTeam, setMaxPlayersPerTeam] = useState<number>(5);
  const [hostId, setHostId] = useState<string | null>(host_id || null);
  const [gameStatus, setGameStatus] = useState<string>('lobby');
  const presenceChannelRef = useRef<any>(null);
  const existingPlayersRef = useRef<GamePlayer[]>([]);
  const refreshIntervalRef = useRef<number | null>(null);
  const mountedRef = useRef(true);
  const teamAScoreRef = useRef<TextInput>(null);
  const teamBScoreRef = useRef<TextInput>(null);
  const playerScoreRefs = useRef<{ [userId: string]: TextInput | null }>({});
  const [isStartingGame, setIsStartingGame] = useState(false);
  const [gameStarting, setGameStarting] = useState(false);
  const [isCancellingGame, setIsCancellingGame] = useState(false);
  const [isSubmittingScores, setIsSubmittingScores] = useState(false);
  const [teamAScore, setTeamAScore] = useState('');
  const [teamBScore, setTeamBScore] = useState('');
  const [playerScores, setPlayerScores] = useState<{ [userId: string]: string }>({});

  const isHost = currentUserId === hostId;

  // Elo calculation function
  const calculateElo = (playerElo: number, opponentElo: number, result: number, kFactor: number = 32): number => {
    // result: 1 for win, 0.5 for draw, 0 for loss
    const expectedScore = 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400));
    const newElo = Math.round(playerElo + kFactor * (result - expectedScore));
    return Math.max(newElo, 100); // Minimum Elo of 100
  };

  // Function to calculate Elo changes for all players
  const calculateEloChanges = async (): Promise<{ [userId: string]: number }> => {
    const eloChanges: { [userId: string]: number } = {};
    
    // Get current Elo ratings for all players
    const playerIds = players.map(p => p.user_id);
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, elo')
      .in('id', playerIds);
    
    if (error) throw error;
    
    const playerElos = profiles?.reduce((acc: any, profile: any) => {
      acc[profile.id] = profile.elo || 1200; // Default Elo of 1200
      return acc;
    }, {}) || {};
    
    switch (game_mode) {
      case 'Classic':
        // Team-based Elo calculation
        const teamAPlayers = players.filter(p => p.team === 'Team A');
        const teamBPlayers = players.filter(p => p.team === 'Team B');
        const teamAScoreValue = parseInt(teamAScore) || 0;
        const teamBScoreValue = parseInt(teamBScore) || 0;
        
        // Calculate average Elo for each team
        const teamAAvgElo = teamAPlayers.reduce((sum, p) => sum + playerElos[p.user_id], 0) / teamAPlayers.length;
        const teamBAvgElo = teamBPlayers.reduce((sum, p) => sum + playerElos[p.user_id], 0) / teamBPlayers.length;
        
        // Determine winner (1 for Team A win, 0 for Team B win, 0.5 for draw)
        let teamAResult = 0.5;
        if (teamAScoreValue > teamBScoreValue) teamAResult = 1;
        else if (teamAScoreValue < teamBScoreValue) teamAResult = 0;
        
        // Calculate Elo changes for each player
        teamAPlayers.forEach(player => {
          const currentElo = playerElos[player.user_id];
          const newElo = calculateElo(currentElo, teamBAvgElo, teamAResult);
          eloChanges[player.user_id] = newElo - currentElo;
        });
        
        teamBPlayers.forEach(player => {
          const currentElo = playerElos[player.user_id];
          const newElo = calculateElo(currentElo, teamAAvgElo, 1 - teamAResult);
          eloChanges[player.user_id] = newElo - currentElo;
        });
        break;
        
      case '21':
        // Individual Elo calculation for 21 mode
        const playerScoresArray = Object.entries(playerScores).map(([userId, score]) => ({
          userId,
          score: parseInt(score) || 0
        })).sort((a, b) => b.score - a.score); // Sort by score descending
        
        // Calculate Elo changes based on final rankings
        playerScoresArray.forEach((playerScore, index) => {
          const player = players.find(p => p.user_id === playerScore.userId);
          if (!player) return;
          
          const currentElo = playerElos[player.user_id];
          let totalEloChange = 0;
          
          // Compare against all other players
          playerScoresArray.forEach((otherScore, otherIndex) => {
            if (playerScore.userId === otherScore.userId) return;
            
            const otherPlayer = players.find(p => p.user_id === otherScore.userId);
            if (!otherPlayer) return;
            
            const otherElo = playerElos[otherPlayer.user_id];
            const result = index < otherIndex ? 1 : 0; // Higher rank wins
            const newElo = calculateElo(currentElo, otherElo, result, 16); // Lower K-factor for 21 mode
            totalEloChange += newElo - currentElo;
          });
          
          // Average the Elo change
          const avgEloChange = totalEloChange / (playerScoresArray.length - 1);
          eloChanges[player.user_id] = Math.round(avgEloChange);
        });
        break;
        
      default:
        throw new Error('Unsupported game mode for Elo calculation');
    }
    
    return eloChanges;
  };

  // Function to check if all score inputs are filled
  const canSubmitScores = (): boolean => {
    if (gameStatus !== 'in_progress') return false;
    
    switch (game_mode) {
      case 'Classic':
        // Both team scores must be filled
        return teamAScore.trim() !== '' && teamBScore.trim() !== '';
      
      case '21':
        // All active players must have scores
        const activePlayers = players.slice(0, 4); // Max 4 players in 21
        return activePlayers.every(player => {
          const score = playerScores[player.user_id];
          return score && score.trim() !== '';
        });
      
      case 'King of the Court':
        // No score inputs in KOTC mode
        return false;
      
      default:
        return false;
    }
  };

  // Function to check if the game can start based on game mode and player count
  const canStartGame = (): boolean => {
    if (!players || players.length === 0) return false;
    
    switch (game_mode) {
      case 'Classic':
        // Both teams must be full (each team has maxPlayersPerTeam players)
        const teamA = players.filter(p => p.team === 'Team A');
        const teamB = players.filter(p => p.team === 'Team B');
        return teamA.length >= maxPlayersPerTeam && teamB.length >= maxPlayersPerTeam;
      
      case '21':
        // Need at least 3 players
        return players.length >= 3;
      
      case 'King of the Court':
        // Need at least 3 players (1 king, 1 challenger, 1 in queue)
        return players.length >= 3;
      
      default:
        return false;
    }
  };

  const handleLeave = async () => {
    Alert.alert('Leave Game', 'Are you sure you want to leave the lobby?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Leave', style: 'destructive', onPress: async () => {
        try {
          console.log('🚪 User leaving lobby...');
          
          // Get the current user's ID
          let userId: string | null = currentUserId ?? null;
          if (!userId) {
            const { data: { user } } = await supabase.auth.getUser();
            userId = user?.id ?? null;
          }
          if (!userId) throw new Error('User not authenticated');
          
          console.log('👤 Leaving user ID:', userId);
          
          // Get the game ID first
          const game = await gameService.getGameByCode(game_code);
          if (!game) throw new Error('Game not found');
          
          // Do database leave and presence cleanup in parallel for speed
          const leavePromises = [];
          
          // Remove from database
          leavePromises.push(
            gameService.leaveGame(game.id, userId).then(() => {
              console.log('✅ Removed from database');
            }).catch((err: any) => {
              console.error('❌ Database leave error:', err);
              // Don't throw here, continue with presence cleanup
            })
          );
          
          // Remove from presence channel
          if (presenceChannelRef.current) {
            console.log('📡 Removing from presence channel...');
                         leavePromises.push(
               presenceChannelRef.current.untrack().then(() => {
                 console.log('✅ Removed from presence tracking');
               }).catch((err: any) => {
                 console.error('❌ Presence untrack error:', err);
               })
             );
          }
          
          // Wait for both operations to complete
          await Promise.all(leavePromises);
          
          // Unsubscribe from channel after operations complete
          if (presenceChannelRef.current) {
            presenceChannelRef.current.unsubscribe();
            presenceChannelRef.current = null;
            console.log('✅ Unsubscribed from presence channel');
          }
          
          router.back();
        } catch (err: any) {
          console.error('❌ Error leaving game:', err);
          Alert.alert('Error', err.message || 'Failed to leave the game.');
        }
      } },
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
              <Text style={styles.playerText} numberOfLines={1}>{player.hoopname || 'Unknown Player'}</Text>
              {role && <Text style={styles.playerRole}>{role}</Text>}
            </View>
        </View>
        {hostId === player.user_id && <Ionicons name="ribbon" size={20} color="#FFD700" />}
    </View>
  );

  const ClassicView = () => {
    const teamA = players.filter(p => p.team === 'Team A');
    const teamB = players.filter(p => p.team === 'Team B');

    // Helper to render player or ghost card
    const renderPlayerOrGhost = (player: GamePlayer | null, key: string | number, teamColor: string) => {
      if (player) {
        return <PlayerCard key={key} player={player} teamColor={teamColor} />;
      } else {
        return (
          <View key={`ghost-${key}`} style={[styles.playerCard, { borderLeftColor: teamColor, borderLeftWidth: 4, opacity: 0.5 }]}> 
            <View style={styles.playerInfo}>
              <LinearGradient colors={['#4A4A4A', '#2C2C2C']} style={styles.playerAvatar} />
              <View style={styles.playerDetails}>
                <Text style={styles.playerText} numberOfLines={1}>Waiting for player…</Text>
              </View>
            </View>
          </View>
        );
      }
    };

    return (
      <>
        <Text style={[styles.sectionHeader, { color: TEAM_A_COLOR }]}>TEAM A ({teamA.length}/{maxPlayersPerTeam})</Text>
        {teamA.map((p) => renderPlayerOrGhost(p, p.id, TEAM_A_COLOR))}
        {[...Array(Math.max(0, maxPlayersPerTeam - teamA.length))].map((_, i) => renderPlayerOrGhost(null, `A-${i}`, TEAM_A_COLOR))}
        {isHost && gameStatus === 'in_progress' && (
          <View style={styles.scoreInputRow}>
            <Text style={styles.scoreInputLabel}>Team A Score:</Text>
            <TextInput
              ref={teamAScoreRef}
              style={styles.scoreInput}
              value={teamAScore}
              onChangeText={(text) => {
                // Only allow numeric input and limit to 3 digits
                const numericText = text.replace(/[^0-9]/g, '');
                if (numericText.length <= 3) {
                  setTeamAScore(numericText);
                }
              }}
              keyboardType="numeric"
              placeholder="0"
              blurOnSubmit={false}
              returnKeyType="done"
              enablesReturnKeyAutomatically={false}
              selectTextOnFocus={true}
              autoCorrect={false}
              autoCapitalize="none"
              spellCheck={false}
              contextMenuHidden={true}
              multiline={false}
              onSubmitEditing={() => {
                // Keep focus to prevent keypad dismissal
                teamAScoreRef.current?.focus();
              }}
            />
          </View>
        )}

        <View style={styles.divider} />

        <Text style={[styles.sectionHeader, { color: TEAM_B_COLOR }]}>TEAM B ({teamB.length}/{maxPlayersPerTeam})</Text>
        {teamB.map((p) => renderPlayerOrGhost(p, p.id, TEAM_B_COLOR))}
        {[...Array(Math.max(0, maxPlayersPerTeam - teamB.length))].map((_, i) => renderPlayerOrGhost(null, `B-${i}`, TEAM_B_COLOR))}
        {isHost && gameStatus === 'in_progress' && (
          <View style={styles.scoreInputRow}>
            <Text style={styles.scoreInputLabel}>Team B Score:</Text>
            <TextInput
              ref={teamBScoreRef}
              style={styles.scoreInput}
              value={teamBScore}
              onChangeText={(text) => {
                // Only allow numeric input and limit to 3 digits
                const numericText = text.replace(/[^0-9]/g, '');
                if (numericText.length <= 3) {
                  setTeamBScore(numericText);
                }
              }}
              keyboardType="numeric"
              placeholder="0"
              blurOnSubmit={false}
              returnKeyType="done"
              enablesReturnKeyAutomatically={false}
              selectTextOnFocus={true}
              autoCorrect={false}
              autoCapitalize="none"
              spellCheck={false}
              contextMenuHidden={true}
              multiline={false}
              onSubmitEditing={() => {
                // Keep focus to prevent keypad dismissal
                teamBScoreRef.current?.focus();
              }}
            />
          </View>
        )}
      </>
    );
  };
  
  const TwentyOneView = () => {
    const maxPlayers = 4;
    const numGhosts = Math.max(0, maxPlayers - players.length);
    return (
      <>
        <Text style={styles.sectionHeader}>PLAYERS ({players.length})</Text>
        {players.slice(0, maxPlayers).map((p, i) => (
          <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center' }}>
            <PlayerCard player={p} rank={i+1} teamColor={PLAYER_COLORS[i % PLAYER_COLORS.length]} />
            {isHost && gameStatus === 'in_progress' && (
              <TextInput
                ref={(ref) => {
                  playerScoreRefs.current[p.user_id] = ref;
                }}
                style={styles.scoreInputSmall}
                value={playerScores[p.user_id] || ''}
                onChangeText={(text) => {
                  // Only allow numeric input and limit to 3 digits
                  const numericText = text.replace(/[^0-9]/g, '');
                  if (numericText.length <= 3) {
                    setPlayerScores(prev => ({ ...prev, [p.user_id]: numericText }));
                  }
                }}
                keyboardType="numeric"
                placeholder="0"
                blurOnSubmit={false}
                returnKeyType="done"
                enablesReturnKeyAutomatically={false}
                selectTextOnFocus={true}
                autoCorrect={false}
                autoCapitalize="none"
                spellCheck={false}
                contextMenuHidden={true}
                multiline={false}
                onSubmitEditing={() => {
                  // Keep focus to prevent keypad dismissal
                  playerScoreRefs.current[p.user_id]?.focus();
                }}
              />
            )}
          </View>
        ))}
        {[...Array(numGhosts)].map((_, i) => (
          <View key={`ghost-21-${i}`} style={[styles.playerCard, { borderLeftColor: PLAYER_COLORS[(players.length + i) % PLAYER_COLORS.length], borderLeftWidth: 4, opacity: 0.5 }]}> 
            <View style={styles.playerInfo}>
              <LinearGradient colors={['#4A4A4A', '#2C2C2C']} style={styles.playerAvatar} />
              <View style={styles.playerDetails}>
                <Text style={styles.playerText} numberOfLines={1}>Waiting for player…</Text>
              </View>
            </View>
          </View>
        ))}
      </>
    );
  };

  const maxPlayersForKOTC = 8; // You can make this dynamic if needed

  const KOTCView = () => {
    const maxQueue = 3;
    const onCourt = [players[0] || null, players[1] || null];
    const queue = players.slice(2, 2 + maxQueue);
    const numQueueGhosts = Math.max(0, maxQueue - queue.length);

    return (
      <>
        <Text style={styles.sectionHeader}>ON COURT</Text>
        {/* King */}
        {onCourt[0] ? (
          <PlayerCard player={onCourt[0]} role="KING" teamColor="#FF6B35" />
        ) : (
          <View key="ghost-king" style={[styles.playerCard, { borderLeftColor: '#FF6B35', borderLeftWidth: 4, opacity: 0.5 }]}> 
            <View style={styles.playerInfo}>
              <LinearGradient colors={['#4A4A4A', '#2C2C2C']} style={styles.playerAvatar} />
              <View style={styles.playerDetails}>
                <Text style={styles.playerText} numberOfLines={1}>Waiting for King…</Text>
              </View>
            </View>
          </View>
        )}
        {/* VS Divider */}
        <View style={styles.vsContainerKOTC}>
          <Text style={styles.vsText}>VS</Text>
        </View>
        {/* Challenger */}
        {onCourt[1] ? (
          <PlayerCard player={onCourt[1]} role="CHALLENGER" teamColor="#3B82F6" />
        ) : (
          <View key="ghost-challenger" style={[styles.playerCard, { borderLeftColor: '#3B82F6', borderLeftWidth: 4, opacity: 0.5 }]}> 
            <View style={styles.playerInfo}>
              <LinearGradient colors={['#4A4A4A', '#2C2C2C']} style={styles.playerAvatar} />
              <View style={styles.playerDetails}>
                <Text style={styles.playerText} numberOfLines={1}>Waiting for Challenger…</Text>
              </View>
            </View>
          </View>
        )}
        {/* Queue */}
        {(queue.length > 0 || numQueueGhosts > 0) && <Text style={styles.sectionHeader}>QUEUE</Text>}
        {queue.map((p, i) => <PlayerCard key={p.id} player={p} rank={i+1} />)}
        {[...Array(numQueueGhosts)].map((_, i) => (
          <View key={`ghost-kotc-queue-${i}`} style={[styles.playerCard, { borderLeftColor: '#888', borderLeftWidth: 4, opacity: 0.5 }]}> 
            <View style={styles.playerInfo}>
              <LinearGradient colors={['#4A4A4A', '#2C2C2C']} style={styles.playerAvatar} />
              <View style={styles.playerDetails}>
                <Text style={styles.playerText} numberOfLines={1}>Waiting for player…</Text>
              </View>
            </View>
          </View>
        ))}
      </>
    );
  };

  useEffect(() => {
    let mounted = true;
    async function fetchUserAndJoinPresence() {
      if (!game_code) return;
      
      try {
        console.log('🔄 Starting lobby setup for game:', game_code);
        
        // Get user info
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          console.log('❌ No user found');
          return;
        }
        console.log('👤 User found:', user.id);
        setCurrentUserId(user.id);
        
        // Fetch hoopname from profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('hoopname')
          .eq('id', user.id)
          .maybeSingle();
        const hoopname = profile?.hoopname || user.user_metadata?.display_name || '';
        console.log('🏷️ Hoopname:', hoopname);
        setCurrentHoopname(hoopname);
        
        // Get game info
        const game = await gameService.getGameByCode(game_code);
        if (!game) {
          console.log('❌ Game not found:', game_code);
          return;
        }
        console.log('🎮 Game found:', game.id, 'Max players:', game.max_players_per_team);
        if (mounted) setMaxPlayersPerTeam(game.max_players_per_team || 5);
        if (mounted) setHostId(game.host_id);
        if (mounted) setGameStatus(game.status || 'lobby');
        
        // Join the game in the database first
        try {
          await gameService.joinGameByCode(game_code, user.id);
          console.log('✅ Joined game in database');
        } catch (error) {
          console.log('⚠️ User already in game or join error:', error);
        }
        
        // Fetch existing players from database
        const existingPlayers = await gameService.getPlayersForGame(game.id);
        console.log('📋 Existing players from DB:', existingPlayers);
        existingPlayersRef.current = existingPlayers || [];
        if (mounted) setPlayers(existingPlayers || []);
        
        // Join presence channel
        const channelName = `lobby-presence-${game_code}`;
        console.log('📡 Joining presence channel:', channelName);
        
        const channel = supabase.channel(channelName, {
          config: { presence: { key: user.id } }
        });
        
        // Listen for presence sync events
        channel.on('presence', { event: 'sync' }, () => {
          console.log('🔄 Presence sync event triggered');
          updatePlayerListFromPresence(channel, existingPlayersRef.current);
        });
        
        // Listen for presence join/leave events
        channel.on('presence', { event: 'join' }, ({ key, newPresences }) => {
          console.log('➕ Player joined presence:', key, newPresences);
          updatePlayerListFromPresence(channel, existingPlayersRef.current);
        });
        
        channel.on('presence', { event: 'leave' }, async ({ key, leftPresences }) => {
          console.log('➖ Player left presence:', key, leftPresences);
          console.log('👤 Left presences details:', leftPresences);
          
          // Immediately remove the player from the current list for faster UI update
          const leftUserId = key;
          const currentPlayers = existingPlayersRef.current.filter(p => p.user_id !== leftUserId);
          existingPlayersRef.current = currentPlayers;
          
          // Update UI immediately with the filtered list
          if (mounted) {
            setPlayers(currentPlayers);
          }
          
          // Then refresh database data in the background to ensure consistency
          try {
            const refreshedGame = await gameService.getGameByCode(game_code);
            if (refreshedGame && mounted) {
              const refreshedPlayers = await gameService.getPlayersForGame(refreshedGame.id);
              console.log('🔄 Refreshed players from DB after leave:', refreshedPlayers);
              existingPlayersRef.current = refreshedPlayers || [];
              setHostId(refreshedGame.host_id);
              setGameStatus(refreshedGame.status || 'lobby');
              
              // Update UI with the final database state
              updatePlayerListFromPresence(channel, refreshedPlayers || []);
            }
          } catch (error) {
            console.log('⚠️ Error refreshing data on player leave:', error);
            // If database refresh fails, still update with the filtered presence state
            updatePlayerListFromPresence(channel, currentPlayers);
          }
        });
        
        // Listen for database changes to game_players and refresh player list
        channel.on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'game_players', filter: `game_id=eq.${game.id}` },
          async (payload) => {
            console.log('🔔 Detected change in game_players:', payload);
            
            // For DELETE events, immediately update the UI
            if (payload.eventType === 'DELETE' && payload.old && mounted) {
              const deletedUserId = payload.old.user_id;
              const currentPlayers = existingPlayersRef.current.filter(p => p.user_id !== deletedUserId);
              existingPlayersRef.current = currentPlayers;
              setPlayers(currentPlayers);
              console.log('🗑️ Immediately removed player from UI:', deletedUserId);
            }
            
            // Always fetch the latest game and players for consistency
            try {
              const refreshedGame = await gameService.getGameByCode(game_code);
              if (refreshedGame && mounted) {
                setHostId(refreshedGame.host_id);
                setGameStatus(refreshedGame.status || 'lobby');
                const refreshedPlayers = await gameService.getPlayersForGame(refreshedGame.id);
                existingPlayersRef.current = refreshedPlayers || [];
                if (presenceChannelRef.current) {
                  updatePlayerListFromPresence(presenceChannelRef.current, refreshedPlayers || []);
                }
              }
            } catch (error) {
              console.log('⚠️ Error refreshing data on database change:', error);
            }
          }
        );
        
        // Listen for database changes to games table for real-time game status updates
        channel.on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'games', filter: `id=eq.${game.id}` },
          async (payload) => {
            console.log('🎮 Detected change in games table:', payload);
            
            if (payload.new && mounted) {
              const updatedGame = payload.new;
              console.log('🔄 Game status updated:', updatedGame.status);
              
              // Update game status immediately
              setGameStatus(updatedGame.status || 'lobby');
              
              // Update host ID if it changed
              if (updatedGame.host_id) {
                setHostId(updatedGame.host_id);
              }
              
              // If game started, show notification to all players
              if (updatedGame.status === 'in_progress') {
                console.log('🎉 Game has started!');
                setGameStarting(false); // Clear the starting state
              }
              
              // If game cancelled/returned to lobby
              if (updatedGame.status === 'lobby') {
                console.log('🔄 Game returned to lobby!');
                // Clear any entered scores
                setTeamAScore('');
                setTeamBScore('');
                setPlayerScores({});
              }
            }
          }
        );
        
        // Alternative: Listen for any changes to the games table (more reliable)
        channel.on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'games' },
          async (payload) => {
            console.log('🎮 Detected any change in games table:', payload);
            
            // Check if this is our game
            if (payload.new && payload.new.game_code === game_code && mounted) {
              const updatedGame = payload.new;
              console.log('🔄 Our game status updated:', updatedGame.status);
              
              setGameStatus(updatedGame.status || 'lobby');
              if (updatedGame.host_id) {
                setHostId(updatedGame.host_id);
              }
              
              if (updatedGame.status === 'in_progress') {
                console.log('🎉 Our game has started!');
                setGameStarting(false);
              }
              
              // If game cancelled/returned to lobby
              if (updatedGame.status === 'lobby') {
                console.log('🔄 Our game returned to lobby!');
                // Clear any entered scores
                setTeamAScore('');
                setTeamBScore('');
                setPlayerScores({});
              }
            }
          }
        );
        
        // Listen for broadcast messages (fallback for real-time updates)
        channel.on('broadcast', { event: 'game_started' }, (payload) => {
          console.log('📡 Received game start broadcast:', payload);
          if (mounted && payload.payload?.game_code === game_code) {
            console.log('🎮 Updating game status from broadcast');
            setGameStatus('in_progress');
            setGameStarting(false);
          }
        });
        
        // Listen for game cancellation broadcast
        channel.on('broadcast', { event: 'game_cancelled' }, (payload) => {
          console.log('📡 Received game cancellation broadcast:', payload);
          if (mounted && payload.payload?.game_code === game_code) {
            console.log('🎮 Updating game status to lobby from broadcast');
            setGameStatus('lobby');
            // Clear any entered scores
            setTeamAScore('');
            setTeamBScore('');
            setPlayerScores({});
          }
        });
        
        // Listen for game completion broadcast
        channel.on('broadcast', { event: 'game_completed' }, async (payload) => {
          console.log('📡 Received game completion broadcast:', payload);
          if (mounted && payload.payload?.game_code === game_code) {
            console.log('🎉 Game completed! Showing results...');

            // Fetch the game to get game_type
            let gameType = null;
            try {
              const game = await gameService.getGameByCode(game_code);
              gameType = game?.game_type;
            } catch (e) {
              console.error('Failed to fetch game for type in broadcast handler', e);
            }

            // Show game completion results to all players
            const { elo_changes, game_mode, scores } = payload.payload;
            let alertTitle = 'Game Completed!';
            let alertMessage;
            if (gameType === 'Ranked') {
              const eloSummary = Object.entries(elo_changes as { [userId: string]: number })
                .map(([userId, change]) => {
                  const player = players.find(p => p.user_id === userId);
                  const changeText = change > 0 ? `+${change}` : change.toString();
                  return `${player?.hoopname || 'Unknown'}: ${changeText}`;
                })
                .join('\n');
              alertMessage = `Final scores and Elo changes:\n\n${eloSummary}`;
            } else {
              alertMessage = 'Scores submitted!';
            }

            Alert.alert(
              alertTitle,
              alertMessage,
              [{ 
                text: 'OK', 
                onPress: () => {
                  // Reload the profile page (navigate to /profile and force reload)
                  router.replace('/profile?reload=1');
                }
              }]
            );
            // Unsubscribe from the Supabase live channel for the game
            if (presenceChannelRef.current) {
              presenceChannelRef.current.unsubscribe();
              presenceChannelRef.current = null;
            }
          }
        });
        
        // Helper function to update player list from presence
        const updatePlayerListFromPresence = (channel: any, existingPlayers: GamePlayer[]) => {
          const state = channel.presenceState();
          console.log('👥 Current presence state:', state);
          
          // Merge presence data with database data
          const mergedPlayers: GamePlayer[] = [];
          const presenceUserIds = new Set();
          
          // First, add all presence players
          Object.values(state).forEach((arr: any) => {
            arr.forEach((presence: any) => {
              console.log('👤 Processing presence:', presence);
              presenceUserIds.add(presence.user_id);
              
              // Find corresponding database player
              const dbPlayer = existingPlayers.find(p => p.user_id === presence.user_id);
              
              mergedPlayers.push({
                id: presence.user_id, // Use user_id as id for presence players
                user_id: presence.user_id,
                hoopname: presence.hoopname || dbPlayer?.hoopname || 'Unknown Player',
                team: dbPlayer?.team || undefined, // Keep database team assignment
                score: dbPlayer?.score || 0,
                is_winner: dbPlayer?.is_winner || false,
                joined_at: dbPlayer?.joined_at || '',
                avatar_url: presence.avatar_url || dbPlayer?.avatar_url || '',
                game_id: game.id,
              });
            });
          });
          
          // Only add database players not in presence if they're still in the database
          // This prevents showing players who have left but haven't been removed from DB yet
          existingPlayers.forEach(dbPlayer => {
            if (!presenceUserIds.has(dbPlayer.user_id)) {
              console.log('👤 Adding offline player from DB:', dbPlayer.hoopname);
              mergedPlayers.push({
                ...dbPlayer,
                id: dbPlayer.id, // Keep original database id
              });
            }
          });
          
          // Sort players by joined_at to maintain consistent order
          mergedPlayers.sort((a, b) => new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime());
          
          console.log('📋 Final merged player list:', mergedPlayers);
          if (mounted) setPlayers(mergedPlayers);
        };
        
        // Track own presence
        channel.subscribe(async (status: string) => {
          console.log('📡 Channel subscription status:', status);
          if (status === 'SUBSCRIBED') {
            console.log('🎯 Tracking own presence...');
            await channel.track({
              user_id: user.id,
              hoopname,
              team: null,
              avatar_url: user.user_metadata?.avatar_url || '',
            });
            console.log('✅ Own presence tracked');
            // Fallback: if presence is empty after a delay, use database players
            setTimeout(() => {
              if (mounted) {
                const presenceState = channel.presenceState();
                const presencePlayers = Object.values(presenceState).flat();
                console.log('⏰ Fallback check - Presence players:', presencePlayers.length, 'DB players:', existingPlayersRef.current.length);
                if (presencePlayers.length === 0 && existingPlayersRef.current.length > 0) {
                  console.log('🔄 Using database players as fallback');
                  setPlayers(existingPlayersRef.current);
                }
              }
            }, 2000); // 2 second delay
          } else if (status === 'CHANNEL_ERROR') {
            console.error('❌ Supabase channel subscription error!');
          }
        });
        
        presenceChannelRef.current = channel;
        console.log('✅ Lobby setup complete');
        
        // Periodic refresh as fallback (every 3 seconds)
        refreshIntervalRef.current = setInterval(async () => {
          if (mountedRef.current) {
            try {
              const refreshedGame = await gameService.getGameByCode(game_code);
              if (refreshedGame) {
                const currentStatus = refreshedGame.status || 'lobby';
                if (currentStatus !== gameStatus) {
                  console.log('🔄 Periodic refresh detected status change:', currentStatus);
                  setGameStatus(currentStatus);
                  setHostId(refreshedGame.host_id);
                  if (currentStatus === 'in_progress') {
                    setGameStarting(false);
                  } else if (currentStatus === 'lobby') {
                    // Clear any entered scores when returning to lobby
                    setTeamAScore('');
                    setTeamBScore('');
                    setPlayerScores({});
                  }
                  // If the game is complete, stop the periodic refresh
                  if (currentStatus === 'complete' && refreshIntervalRef.current) {
                    clearInterval(refreshIntervalRef.current);
                    refreshIntervalRef.current = null;
                    console.log('🛑 Stopped periodic refresh after game completion');
                  }
                }
              }
            } catch (error) {
              console.log('⚠️ Error in periodic refresh:', error);
            }
          }
        }, 3000);
        
      } catch (error) {
        console.error('❌ Error joining lobby:', error);
      }
    }
    
    fetchUserAndJoinPresence();
    
    return () => {
      console.log('🧹 Cleaning up lobby...');
      mounted = false;
      mountedRef.current = false;
      if (presenceChannelRef.current) {
        presenceChannelRef.current.unsubscribe();
        presenceChannelRef.current = null;
      }
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    };
  }, [game_code]);

  // Debug log for current players state
  useEffect(() => {
    console.log('🎮 Current players state:', players);
  }, [players]);

  // Submit Scores handler
  const handleSubmitScores = async () => {
    setIsSubmittingScores(true);
    try {
      console.log('📊 Submitting scores...');
      if (!canSubmitScores()) {
        throw new Error('Please fill in all score fields');
      }

      // Get the current game
      const game = await gameService.getGameByCode(game_code);
      if (!game) throw new Error('Game not found');
      const gameId = game.id;
      const isRanked = game.game_type === 'Ranked';

      // Calculate Elo changes for all players
      console.log('🧮 Calculating Elo changes...');
      const eloChanges = await calculateEloChanges();
      console.log('📈 Elo changes calculated:', eloChanges);

      // Fetch current Elo ratings
      const playerIds = players.map(p => p.user_id);
      const { data: currentProfiles, error: fetchError } = await supabase
        .from('profiles')
        .select('id, elo')
        .in('id', playerIds);
      if (fetchError) throw new Error('Failed to fetch current Elo ratings');
      const playerElos = currentProfiles?.reduce((acc: any, profile: any) => {
        acc[profile.id] = profile.elo || 1200;
        return acc;
      }, {}) || {};

      // Prepare per-player game data
      const updates = players.map(player => {
        const userId = player.user_id;
        const eloBefore = playerElos[userId] || 1200;
        const eloChange = eloChanges[userId] || 0;
        const eloAfter = isRanked ? Math.max(eloBefore + eloChange, 100) : eloBefore;
        let score = null;
        let isWinner = false;
        let tie = false;
        let isWinnerValue: boolean | null = false;
        if (game_mode === 'Classic') {
          score = player.team === 'Team A' ? parseInt(teamAScore) : parseInt(teamBScore);
          const teamAScoreValue = parseInt(teamAScore) || 0;
          const teamBScoreValue = parseInt(teamBScore) || 0;
          if (teamAScoreValue > teamBScoreValue && player.team === 'Team A') { isWinner = true; isWinnerValue = true; }
          else if (teamBScoreValue > teamAScoreValue && player.team === 'Team B') { isWinner = true; isWinnerValue = true; }
          else if (teamAScoreValue === teamBScoreValue) { isWinner = false; tie = true; isWinnerValue = null; }
        } else if (game_mode === '21') {
          score = parseInt(playerScores[userId]) || 0;
          const maxScore = Math.max(...Object.values(playerScores).map(s => parseInt(s) || 0));
          isWinner = score === maxScore && maxScore > 0;
          isWinnerValue = isWinner;
        }
        return {
          userId,
          eloBefore,
          eloAfter,
          score,
          isWinner,
          tie,
          isWinnerValue
        };
      });

      // Update game_players table
      const updateGamePlayersPromises = updates.map(u =>
        supabase
          .from('game_players')
          .update({
            elo_before: u.eloBefore,
            elo_after: u.eloAfter,
            score: u.score,
            is_winner: u.isWinnerValue
          })
          .eq('game_id', gameId)
          .eq('user_id', u.userId)
      );
      const updateGamePlayersResults = await Promise.all(updateGamePlayersPromises);
      const updateGamePlayersErrors = updateGamePlayersResults.filter(r => r.error);
      if (updateGamePlayersErrors.length > 0) {
        throw new Error('Failed to update some game player records');
      }

      // Only update Elo ratings in the database if ranked
      if (isRanked) {
        console.log('💾 Updating Elo ratings in database...');
        const eloUpdates = updates.map(u =>
          supabase
            .from('profiles')
            .update({ elo: u.eloAfter })
            .eq('id', u.userId)
        );
        const updateResults = await Promise.all(eloUpdates);
        const updateErrors = updateResults.filter(result => result.error);
        if (updateErrors.length > 0) {
          console.error('❌ Errors updating Elo ratings:', updateErrors);
          throw new Error('Failed to update some Elo ratings');
        }
      }

      // Set game status to 'complete'
      await supabase
        .from('games')
        .update({ status: 'complete' })
        .eq('id', gameId);

      // Broadcast game completion to all players
      if (presenceChannelRef.current) {
        await presenceChannelRef.current.send({
          type: 'broadcast',
          event: 'game_completed',
          payload: {
            game_code,
            elo_changes: eloChanges,
            game_mode,
            scores: game_mode === 'Classic' ? { teamA: teamAScore, teamB: teamBScore } : playerScores
          }
        });
        console.log('📡 Broadcasted game completion to all players');
        // Close the Supabase live channel for the game
        presenceChannelRef.current.unsubscribe();
        presenceChannelRef.current = null;
      }

      // Show success feedback with Elo changes
      let alertTitle = 'Game Completed!';
      let alertMessage;
      if (isRanked) {
        const eloSummary = updates
          .map(u => {
            const player = players.find(p => p.user_id === u.userId);
            const change = u.eloAfter - u.eloBefore;
            const changeText = change > 0 ? `+${change}` : change.toString();
            return `${player?.hoopname || 'Unknown'}: ${changeText}`;
          })
          .join('\n');
        alertMessage = `Scores submitted and Elo ratings updated:\n\n${eloSummary}`;
      } else {
        alertMessage = 'Scores submitted!';
      }

      Alert.alert(
        alertTitle,
        alertMessage,
        [{
          text: 'OK',
          onPress: () => {
            // Reload the profile page (navigate to /profile and force reload)
            router.replace('/profile?reload=1');
          }
        }]
      );
    } catch (err: any) {
      console.error('❌ Error submitting scores:', err);
      Alert.alert('Error', err.message || 'Failed to submit scores.');
    } finally {
      setIsSubmittingScores(false);
    }
  };

  // Cancel Game handler
  const handleCancelGame = async () => {
    Alert.alert('Cancel Game', 'Are you sure you want to cancel the game and return to lobby?', [
      { text: 'No', style: 'cancel' },
      { text: 'Yes', style: 'destructive', onPress: async () => {
        setIsCancellingGame(true);
        try {
          console.log('🚫 Cancelling game...');
          
          // Update game status in database
          const { error } = await supabase
            .from('games')
            .update({ status: 'lobby' })
            .eq('game_code', game_code);
          
          if (error) throw error;
          
          console.log('✅ Game status updated to lobby');
          
          // Immediately update local state for instant feedback
          setGameStatus('lobby');
          
          // Clear any entered scores
          setTeamAScore('');
          setTeamBScore('');
          setPlayerScores({});
          
          // Broadcast game cancellation to all players via presence channel
          if (presenceChannelRef.current) {
            await presenceChannelRef.current.send({
              type: 'broadcast',
              event: 'game_cancelled',
              payload: { game_code, status: 'lobby' }
            });
            console.log('📡 Broadcasted game cancellation to all players');
          }
          
        } catch (err: any) {
          console.error('❌ Error cancelling game:', err);
          Alert.alert('Error', err.message || 'Failed to cancel game.');
        } finally {
          setIsCancellingGame(false);
        }
      } },
    ]);
  };

  // Start Game handler
  const handleStartGame = async () => {
    setIsStartingGame(true);
    setGameStarting(true);
    try {
      console.log('🚀 Starting game...');
      
      // Update game status in database
      const { error } = await supabase
        .from('games')
        .update({ status: 'in_progress' })
        .eq('game_code', game_code);
      
      if (error) throw error;
      
      console.log('✅ Game status updated to in_progress');
      
      // Immediately update local state for instant feedback
      setGameStatus('in_progress');
      
      // Broadcast game start to all players via presence channel
      if (presenceChannelRef.current) {
        await presenceChannelRef.current.send({
          type: 'broadcast',
          event: 'game_started',
          payload: { game_code, status: 'in_progress' }
        });
        console.log('📡 Broadcasted game start to all players');
      }
      
    } catch (err: any) {
      console.error('❌ Error starting game:', err);
      Alert.alert('Error', err.message || 'Failed to start game.');
    } finally {
      setIsStartingGame(false);
      setGameStarting(false);
    }
  };

  return (
    <LinearGradient colors={['#1D1D1D', '#121212']} style={styles.container}>
      <Stack.Screen options={{ headerShown: false, presentation: 'modal' }} />
      <View style={styles.header}>
        <Text style={styles.gameModeText}>{game_mode}</Text>
        {gameStatus === 'in_progress' && (
          <View style={styles.inProgressBubble}>
            <Text style={styles.inProgressText}>In Progress</Text>
          </View>
        )}
        {gameStarting && (
          <View style={styles.startingBubble}>
            <Text style={styles.startingText}>Starting...</Text>
          </View>
        )}
        {/* Show Leave Game button only if in lobby, or Cancel Game for host if in progress */}
        {gameStatus === 'lobby' ? (
          <TouchableOpacity onPress={handleLeave} style={styles.leaveButton}>
            <Ionicons name="log-out-outline" size={32} color="#FF4444" />
          </TouchableOpacity>
        ) : (
          isHost && (
            <TouchableOpacity onPress={handleCancelGame} style={styles.leaveButton} disabled={isCancellingGame}>
              <Ionicons 
                name="close-circle-outline" 
                size={32} 
                color={isCancellingGame ? "#666666" : "#FF4444"} 
              />
            </TouchableOpacity>
          )
        )}
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

      {isHost && gameStatus === 'lobby' && (
        <View style={styles.startButtonContainer}>
          {!canStartGame() && (
            <Text style={styles.startButtonHint}>
              {game_mode === 'Classic' 
                ? `Need ${maxPlayersPerTeam} players on each team`
                : game_mode === '21' 
                ? 'Need at least 3 players'
                : 'Need at least 3 players (1 king, 1 challenger, 1 in queue)'
              }
            </Text>
          )}
          <TouchableOpacity 
            style={[
              styles.startButton, 
              (!canStartGame() || isStartingGame) && styles.startButtonDisabled
            ]} 
            onPress={handleStartGame} 
            disabled={!canStartGame() || isStartingGame}
          >
            <LinearGradient 
              colors={(!canStartGame() || isStartingGame) ? ['#666666', '#444444'] : ['#FF8C66', '#FF6B35']} 
              style={styles.startButtonGradient}
            >
              <Text style={[
                styles.startButtonText,
                (!canStartGame() || isStartingGame) && styles.startButtonTextDisabled
              ]}>
                {isStartingGame ? 'Starting...' : 'Start Game'}
              </Text>
              <Ionicons 
                name="rocket-outline" 
                size={20} 
                color={(!canStartGame() || isStartingGame) ? "#999999" : "#FFFFFF"} 
              />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}

      {isHost && gameStatus === 'in_progress' && (game_mode === 'Classic' || game_mode === '21') && (
        <View style={styles.startButtonContainer}>
          {!canSubmitScores() && (
            <Text style={styles.startButtonHint}>
              {game_mode === 'Classic' 
                ? 'Fill in both team scores'
                : 'Fill in all player scores'
              }
            </Text>
          )}
          <TouchableOpacity 
            style={[
              styles.startButton, 
              (!canSubmitScores() || isSubmittingScores) && styles.startButtonDisabled
            ]} 
            onPress={handleSubmitScores} 
            disabled={!canSubmitScores() || isSubmittingScores}
          >
            <LinearGradient 
              colors={(!canSubmitScores() || isSubmittingScores) ? ['#666666', '#444444'] : ['#FF8C66', '#FF6B35']} 
              style={styles.startButtonGradient}
            >
              <Text style={[
                styles.startButtonText,
                (!canSubmitScores() || isSubmittingScores) && styles.startButtonTextDisabled
              ]}>
                {isSubmittingScores ? 'Submitting...' : 'Submit Scores'}
              </Text>
              <Ionicons 
                name="checkmark-circle-outline" 
                size={20} 
                color={(!canSubmitScores() || isSubmittingScores) ? "#999999" : "#FFFFFF"} 
              />
            </LinearGradient>
          </TouchableOpacity>
        </View>
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
    startButtonContainer: {
        position: 'absolute',
        bottom: 40,
        left: 20,
        right: 20,
    },
    startButton: {
        shadowColor: '#FF6B35',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 15,
        elevation: 10,
    },
    startButtonDisabled: {
        shadowColor: '#666666',
        shadowOpacity: 0.3,
    },
    startButtonHint: {
        color: '#FF6B35',
        fontSize: 14,
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: 8,
        paddingHorizontal: 20,
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
    startButtonTextDisabled: {
        color: '#999999',
    },
    inProgressBubble: {
        backgroundColor: '#FF6B35',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 4,
        alignSelf: 'flex-start',
        marginLeft: 12,
    },
    inProgressText: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 14,
        letterSpacing: 1,
    },
    startingBubble: {
        backgroundColor: '#FFD700',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 4,
        alignSelf: 'flex-start',
        marginLeft: 12,
    },
    startingText: {
        color: '#000',
        fontWeight: 'bold',
        fontSize: 14,
        letterSpacing: 1,
    },
    scoreInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
        marginBottom: 8,
        marginLeft: 20,
    },
    scoreInputLabel: {
        color: '#FFF',
        fontSize: 16,
        marginRight: 10,
        fontWeight: '600',
    },
    scoreInput: {
        backgroundColor: 'linear-gradient(90deg, #FF8C66 0%, #FF6B35 100%)',
        color: '#FFF',
        borderRadius: 16,
        paddingHorizontal: 18,
        paddingVertical: 10,
        fontSize: 22,
        width: 70,
        borderWidth: 2,
        borderColor: '#FF6B35',
        shadowColor: '#FF6B35',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 4,
        marginHorizontal: 4,
    },
    scoreInputSmall: {
        backgroundColor: 'linear-gradient(90deg, #FF8C66 0%, #FF6B35 100%)',
        color: '#FFF',
        borderRadius: 14,
        paddingHorizontal: 12,
        paddingVertical: 7,
        fontSize: 18,
        width: 54,
        borderWidth: 2,
        borderColor: '#FF6B35',
        shadowColor: '#FF6B35',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 4,
        marginLeft: 10,
        marginHorizontal: 2,
    },
}); 