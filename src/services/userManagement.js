import { database } from "../services/FirebaseConfig";
import { ref, get, update } from "firebase/database";

export const initializeUser = async (user) => {
  if (!user) return null;

  const userId = user.id.toString();
  const userRef = ref(database, `users/${userId}`);

  try {
    const snapshot = await get(userRef);
    const userData = snapshot.val();
    const now = Date.now();

    // 🟢 NON-DESTRUCTIVE INITIALIZATION
    // We use 'update' so we don't overwrite referral data if it got there first
    const baseProfile = {
      name: user.username || user.first_name || "Anonymous",
      lastUpdated: now,
    };

    if (!snapshot.exists()) {
      // New user: Set creation fields
      baseProfile.createdAt = now;
      baseProfile.lastPlayed = now;
      baseProfile.lastReset = { daily: new Date().toISOString().split('T')[0] };
      baseProfile.streak = {
        currentStreakCount: 1,
        lastStreakCheckDateUTC: new Date().toISOString().split('T')[0],
        longestStreakCount: 1
      };
    }

    // Always update name/lastUpdated
    await update(userRef, baseProfile);

    // Only set scores if they don't already exist
    const scoreRef = ref(database, `users/${userId}/Score`);
    const scoreSnap = await get(scoreRef);

    if (!scoreSnap.exists()) {
      await update(scoreRef, {
        farming_score: 0,
        game_highest_score: 0,
        game_score: 0,
        network_score: 0,
        news_score: 0,
        no_of_tickets: 3,
        task_score: 0,
        total_score: 0
      });
      console.log("Default scores initialized for new user.");
    }

    return userId;
  } catch (error) {
    console.error("Error during user init:", error);
    return null;
  }
};
