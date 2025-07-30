// // src/App.js
// import React, { useState } from "react";
// import GameUI from "./GameUI";
// import Game from "./Game";
// import InstructionsPopup from "./InstructionsPopup";
// import GameOverPopup from "./GameOverPopup";
// import "../../Styles/gameComponent.css";

// function GameComponent() {
//   const [gameStarted, setGameStarted] = useState(false);
//   const [gameOver, setGameOver] = useState(false);
//   const [finalScore, setFinalScore] = useState(0);
//   const [highScore, setHighScore] = useState(0);
//   const [gameKey, setGameKey] = useState(0); // for remounting on restart

//   const handleStartGame = () => {
//     setGameStarted(true);
//     setGameOver(false);
//   };

//   const handleGameOver = (score, high) => {
//     setFinalScore(score);
//     setHighScore(high);
//     setGameOver(true);
//   };

//   const handleRestart = () => {
//     setGameKey(prev => prev + 1); // force remount
//     setGameOver(false);
//     // For try-again, you might automatically start the game,
//     // so no need to set gameStarted to false.
//   };

//   return (
//     <div id="app-container">
//       <GameUI />
//       <Game key={gameKey} startGame={gameStarted} onGameOver={handleGameOver} />
//       {!gameStarted && (
//         <InstructionsPopup show={true} onStart={handleStartGame} />
//       )}
//       <GameOverPopup
//         show={gameOver}
//         finalScore={finalScore}
//         highScore={highScore}
//         onRestart={handleRestart}
//       />

      
//     </div>
//   );
// }

// export default GameComponent;
import React, { useState, useCallback } from "react";
import GameUI from "./GameUI";
import Game from "./Game";
import InstructionsPopup from "./InstructionsPopup";
import GameOverPopup from "./GameOverPopup";
import { useTelegram } from "../../reactContext/TelegramContext.js";
import { database } from "../../services/FirebaseConfig.js";
import { ref, get, update } from "firebase/database";
import "../../Styles/gameComponent.css";

function GameComponent() {
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameKey, setGameKey] = useState(0);
  const { user } = useTelegram();

  const decreaseTicketCount = useCallback(async (userId) => {
    if (!userId) return;
    const ticketRef = ref(database, `users/${userId}/Score/no_of_tickets`);
    try {
      const snapshot = await get(ticketRef);
      if (snapshot.exists()) {
        let currentTickets = snapshot.val();
        if (currentTickets > 0) {
          await update(ref(database, `users/${userId}/Score`), {
            no_of_tickets: currentTickets - 1,
          });
        }
      }
    } catch (error) {
      console.error("Error updating ticket count:", error);
    }
  }, []);

  const handleStartGame = useCallback(() => {
    setGameStarted(true);
    setGameOver(false);
    decreaseTicketCount(user.id);
  }, [decreaseTicketCount, user.id]);

  const handleGameOver = useCallback((score, high) => {
    setFinalScore(score);
    setHighScore(high);
    setGameOver(true);
  }, []);

  const handleRestart = useCallback(async () => {
    setGameKey((prev) => prev + 1);
    setGameStarted(false);
    setGameOver(false);
    const taskRef = ref(database, `connections/${user.id}/tasks/daily`);
    try {
      await update(taskRef, { game: true });
    } catch (error) {
      console.error("Error updating game task in Firebase:", error);
    }
  }, [user.id]);

  const handleBack = useCallback(() => {
    setGameStarted(false);
  }, []);

  return (
    <div id="app-container">
      <GameUI />
      <Game key={gameKey} startGame={gameStarted} onGameOver={handleGameOver} />
      {!gameStarted && (
        <InstructionsPopup show={true} onStart={handleStartGame} onBack={handleBack} />
      )}
      <GameOverPopup
        show={gameOver}
        finalScore={finalScore}
        highScore={highScore}
        onRestart={handleRestart}
        onBack={handleBack}
      />
    </div>
  );
}

export default GameComponent;
