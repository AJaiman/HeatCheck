# HeatCheck - Basketball Game App

HeatCheck is a real-time multiplayer basketball game app built with React Native and Supabase. It lets you play, track, and compete in basketball games with friends, manage your profile, and log your workouts—all in one place.

## 🏀 What You Can Do

- **Join or create basketball games** in real time with friends
- **Play different game modes**: Classic (team), 21 (individual), and King of the Court
- **Choose between Ranked and Casual games** (ranked games affect your Elo rating)
- **See live updates** in the lobby as players join, leave, or start games
- **Submit scores** and see instant results
- **Track your game history** (wins, losses, ties, Elo changes, and more)
- **View your profile** with live Elo, win rate, and game stats
- **Log and review completed workouts**

## ⚡ How It Works

- **Real-time lobbies**: Players join a game lobby using a code, and see each other join/leave instantly.
- **Game flow**: The host starts the game when enough players are present. After the game, scores are submitted and results are broadcast to all players.
- **Elo system**: Ranked games update your Elo based on the outcome. Casual games do not affect Elo.
- **Profile page**: Shows your current Elo, win rate (for Classic games), and a history of your games and workouts.
- **Workout tracking**: Complete and log basketball workouts, and see your workout history alongside your game stats.
- **Network resilience**: If you lose connection, the app will alert you and return you to the main screen.

## 🚀 Tech Stack
- **Frontend**: React Native (Expo), TypeScript
- **Backend/Realtime**: Supabase (Postgres, Auth, Realtime Channels)

## 👀 Want to Try or Contribute?
- Clone the repo and run with Expo to explore the app.
- You'll need your own Supabase backend to use all features.
- For questions or feedback, open an issue or pull request!

---

**HeatCheck** — Where basketball meets technology! 🏀⚡
