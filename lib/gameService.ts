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
}

export const gameService = new GameService(); 