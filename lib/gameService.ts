import { GameMode, GameType } from '../types/game';
import { supabase } from './supabase';

class GameService {
  async createGame(
    gameMode: GameMode,
    gameType: GameType,
    maxPlayersPerTeam?: number
  ): Promise<string> {
    const { data, error } = await supabase.rpc('create_game', {
      p_game_mode: gameMode,
      p_game_type: gameType,
      p_max_players_per_team: maxPlayersPerTeam,
    });

    if (error) {
      console.error('Error creating game:', error);
      throw new Error('Failed to create game.');
    }

    if (!data) {
      throw new Error('No game code returned.');
    }

    return data;
  }

  async getPlayersForGame(gameId: string) {
    const { data, error } = await supabase
      .from('game_players')
      .select('id, game_id, user_id, team, score, is_winner, joined_at, profiles(hoopname, avatar_url)')
      .eq('game_id', gameId)
      .order('joined_at', { ascending: true });
    if (error) {
      console.error('Error fetching players:', error);
      throw new Error('Failed to fetch players.');
    }
    // Map hoopname and avatar_url from profiles join to top-level for UI convenience
    return (data || []).map((p: any) => ({ ...p, hoopname: p.profiles?.hoopname || '', avatar_url: p.profiles?.avatar_url || '' }));
  }

  async getGameByCode(gameCode: string) {
    const { data, error } = await supabase
      .from('games')
      .select('*')
      .eq('game_code', gameCode)
      .single();
    if (error) {
      // Only log and throw for errors that are not 'no rows' (PGRST116)
      if (error.code === 'PGRST116' && error.message && error.message.includes('multiple (or no) rows returned')) {
        // Game not found, return null silently
        return null;
      }
      console.error('Error fetching game:', error);
      throw new Error('Failed to fetch game.');
    }
    return data;
  }

  async leaveGame(gameId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('game_players')
      .delete()
      .match({ game_id: gameId, user_id: userId });
    if (error) {
      console.error('Error leaving game:', error);
      throw new Error('Failed to leave game.');
    }
  }

  async joinGameByCode(gameCode: string, userId: string, username?: string) {
    // 1. Find the game by code
    const game = await this.getGameByCode(gameCode);
    if (!game) throw new Error('Game not found');
    // 2. Check if user is already in the game
    const { data: existing, error: existingError } = await supabase
      .from('game_players')
      .select('id')
      .eq('game_id', game.id)
      .eq('user_id', userId)
      .maybeSingle();
    if (existingError) throw existingError;
    if (existing) return game; // Already joined
    // 3. Insert the user into game_players
    const { error } = await supabase
      .from('game_players')
      .insert({ game_id: game.id, user_id: userId });
    if (error) throw error;
    return game;
  }

  async updateOnCourtPlayers(gameId: string, player1Id: string | null, player2Id: string | null) {
    const { error } = await supabase
      .from('games')
      .update({
        on_court_player_1: player1Id,
        on_court_player_2: player2Id
      })
      .eq('id', gameId);
    if (error) {
      console.error('Error updating on-court players:', error);
      throw new Error('Failed to update on-court players.');
    }
  }
}

export const gameService = new GameService(); 