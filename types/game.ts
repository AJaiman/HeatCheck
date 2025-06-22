export type GameMode = 'Classic' | '21' | 'King of the Court';
export type GameType = 'Casual' | 'Ranked';
export type GameStatus = 'lobby' | 'in_progress' | 'completed' | 'cancelled';

export interface Game {
  id: string;
  game_code: string;
  host_id: string;
  game_mode: GameMode;
  game_type: GameType;
  status: GameStatus;
  max_players_per_team?: number;
  winner_id?: string;
  on_court_player_1?: string;
  on_court_player_2?: string;
  created_at: string;
}

export interface GamePlayer {
  id: string;
  game_id: string;
  user_id: string;
  team?: 'Team A' | 'Team B';
  score: number;
  is_winner: boolean;
  joined_at: string;
  // This will be joined from the users table
  username: string;
} 