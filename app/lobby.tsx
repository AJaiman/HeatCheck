import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Clipboard, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
  const presenceChannelRef = useRef<any>(null);
  const existingPlayersRef = useRef<GamePlayer[]>([]);
  const refreshIntervalRef = useRef<number | null>(null);

  const isHost = currentUserId === hostId;

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
          
          // Remove from presence channel first
          if (presenceChannelRef.current) {
            console.log('📡 Removing from presence channel...');
            await presenceChannelRef.current.untrack();
            presenceChannelRef.current.unsubscribe();
            presenceChannelRef.current = null;
            console.log('✅ Removed from presence channel');
          }
          
          // Get the game ID and remove from database
          const game = await gameService.getGameByCode(game_code);
          if (!game) throw new Error('Game not found');
          console.log('🗄️ Removing from database...');
          await gameService.leaveGame(game.id, userId);
          console.log('✅ Removed from database');
          
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

        <View style={styles.divider} />

        <Text style={[styles.sectionHeader, { color: TEAM_B_COLOR }]}>TEAM B ({teamB.length}/{maxPlayersPerTeam})</Text>
        {teamB.map((p) => renderPlayerOrGhost(p, p.id, TEAM_B_COLOR))}
        {[...Array(Math.max(0, maxPlayersPerTeam - teamB.length))].map((_, i) => renderPlayerOrGhost(null, `B-${i}`, TEAM_B_COLOR))}
      </>
    );
  };
  
  const TwentyOneView = () => {
    const maxPlayers = 4;
    const numGhosts = Math.max(0, maxPlayers - players.length);
    return (
      <>
        <Text style={styles.sectionHeader}>PLAYERS ({players.length})</Text>
        {players.slice(0, maxPlayers).map((p, i) => <PlayerCard key={p.id} player={p} rank={i+1} teamColor={PLAYER_COLORS[i % PLAYER_COLORS.length]} />)}
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
        
        channel.on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
          console.log('➖ Player left presence:', key, leftPresences);
          updatePlayerListFromPresence(channel, existingPlayersRef.current);
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
          
          // Add any database players not in presence (offline players)
          existingPlayers.forEach(dbPlayer => {
            if (!presenceUserIds.has(dbPlayer.user_id)) {
              console.log('👤 Adding offline player from DB:', dbPlayer.hoopname);
              mergedPlayers.push({
                ...dbPlayer,
                id: dbPlayer.id, // Keep original database id
              });
            }
          });
          
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
          }
        });
        
        presenceChannelRef.current = channel;
        console.log('✅ Lobby setup complete');
        
        // Set up periodic refresh of database players
        const refreshInterval = setInterval(async () => {
          if (mounted) {
            try {
              console.log('🔄 Periodic refresh of database players...');
              // Try to get the latest game info to check if it still exists
              let refreshedPlayers;
              try {
                const refreshedGame = await gameService.getGameByCode(game_code);
                if (!refreshedGame) throw new Error('Game not found');
                if (mounted) setHostId(refreshedGame.host_id);
                refreshedPlayers = await gameService.getPlayersForGame(refreshedGame.id);
                existingPlayersRef.current = refreshedPlayers || [];
                console.log('📋 Refreshed DB players:', refreshedPlayers);
                // Update the player list with fresh data
                if (presenceChannelRef.current) {
                  updatePlayerListFromPresence(presenceChannelRef.current, refreshedPlayers || []);
                }
              } catch (err: any) {
                // If the game is not found, clean up and exit lobby silently
                const isNotFound = (err && err.message && (err.message.includes('Failed to fetch game') || err.message.includes('Game not found')));
                if (isNotFound) {
                  if (refreshIntervalRef.current) {
                    clearInterval(refreshIntervalRef.current);
                    refreshIntervalRef.current = null;
                  }
                  if (presenceChannelRef.current) {
                    presenceChannelRef.current.unsubscribe();
                    presenceChannelRef.current = null;
                  }
                  console.log('ℹ️ Game deleted or not found during refresh. Cleaning up and leaving lobby silently.');
                  // Silently navigate out of the lobby
                  if (router.canGoBack()) {
                    router.back();
                  } else {
                    router.replace('/');
                  }
                  return;
                } else {
                  // Log other errors
                  console.error('❌ Error refreshing players:', err);
                }
              }
            } catch (error) {
              console.error('❌ Error refreshing players:', error);
            }
          }
        }, 5000); // Refresh every 5 seconds
        
        // Store the interval for cleanup
        refreshIntervalRef.current = refreshInterval;
        
      } catch (error) {
        console.error('❌ Error joining lobby:', error);
      }
    }
    
    fetchUserAndJoinPresence();
    
    return () => {
      console.log('🧹 Cleaning up lobby...');
      mounted = false;
      if (presenceChannelRef.current) {
        presenceChannelRef.current.unsubscribe();
        presenceChannelRef.current = null;
      }
      // Clear the refresh interval
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