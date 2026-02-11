import React, { useEffect } from 'react';
import { Route, Routes, Link, useLocation } from 'react-router-dom';
import './App.css';
import './Styles/AdminCommon.css';
import AdminTask from './pages/AdminTask';
import AdminNews from './pages/AdminNews';
import NetworkComponent from './pages/NetworkPage/NetworkComponent';
import GameComponent from './pages/GamePage/GameComponent';
import NewsComponent from "./pages/NewsPage/NewsComponent";
import WalletComponent from './pages/WalletPage/WalletComponent';
import HomeComponent from './pages/HomePage/HomeComponent';
import { useTelegram } from "./reactContext/TelegramContext.js";
import { initializeUser } from "./services/userManagement.js";
import Navbar from './components/Navbar.js';
import TaskUIComponent from "./pages/TaskPage/TaskUIComponent.js";
import UserProfile from "./pages/ProfilePage/UserProfile.js";
import History from "./pages/ProfilePage/History.js";
import { WalletProvider } from './reactContext/WalletContext.js';
import { ReferralProvider } from "./reactContext/ReferralContext.js";
import { ref, get, update, remove } from "firebase/database";
import { database } from "./services/FirebaseConfig.js";
import { format } from 'date-fns';
import { addHistoryLog } from "./services/addHistory.js";
import { HistoryProvider } from "./reactContext/HistoryContext.js";
import StreakTracker, { useStreak } from './reactContext/StreakTracker.js';
import StreakPopup from "./pages/streakPopup.js";

/* ===============================
   ADMIN NAVBAR
================================ */
function AdminNavbar() {
  const location = useLocation();
  const showNavbar =
    location.pathname === "/admintask" ||
    location.pathname === "/adminNews";

  if (!showNavbar) return null;

  return (
    <nav className="admin-header">
      <h1>Dashboard</h1>
      <div className="header-actions">
        <Link
          to="/admintask"
          className={`admin-nav-btn ${location.pathname === "/admintask" ? "active" : "secondary"}`}
        >
          Admin Task
        </Link>
        <Link
          to="/adminNews"
          className={`admin-nav-btn ${location.pathname === "/adminNews" ? "active" : "secondary"}`}
        >
          Admin News
        </Link>
      </div>
    </nav>
  );
}

/* ===============================
   MAIN APP
================================ */
function App() {
  const { user } = useTelegram();
  const location = useLocation();
  const {
    showStreakPopup,
    popupMessage,
    popupCurrentStreak,
    closeStreakPopup,
  } = useStreak() || {};

  /* ===========================================
     1️⃣ TELEGRAM INITIALIZATION
  ============================================ */
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (!tg) return;

    tg.ready();
    tg.expand();

    const telegramUser = tg.initDataUnsafe?.user;

    const fetchData = async () => {
      if (telegramUser) {
        await initializeUser(telegramUser);
      } else {
        console.error("User data not available");
      }
    };

    fetchData();
  }, []);

  /* ===========================================
     2️⃣ RESET TASKS
  ============================================ */
  useEffect(() => {
    if (user?.id) {
      resetTasksIfNeeded(user.id);
    }
  }, [user?.id]);

  const resetTasksIfNeeded = async (userId) => {
    if (!userId) return;

    const today = format(new Date(), "yyyy-MM-dd");

    const connectionRef = ref(database, `users/${userId}`);
    const snapshot = await get(connectionRef);
    const data = snapshot.val();

    if (!data) return;

    const updates = {};

    if (data.lastReset?.daily !== today) {
      await update(ref(database, `connections/${userId}/tasks`), {
        daily: {},
      });

      updates[`users/${userId}/lastReset/daily`] = today;
      updates[`users/${userId}/Score/no_of_tickets`] = 3;

      const textData = {
        action: "Daily login reward",
        points: 10,
        type: "Home",
      };

      addHistoryLog(userId, textData);
    }

    const weekDay = new Date().getDay();
    if (data.lastReset?.weekly !== today && weekDay === 1) {
      await remove(ref(database, `connections/${userId}/tasks/weekly`));
      await update(ref(database, `history/${userId}`), {});
    }

    if (Object.keys(updates).length > 0) {
      await update(ref(database), updates);
    }
  };

  const hideNavbarRoutes = ["/game"];
  const shouldShowNavbar = !hideNavbarRoutes.includes(location.pathname);

  return (
    <WalletProvider>
      <ReferralProvider>
        <HistoryProvider>
          <StreakTracker>
            <>
              <div className="App mb-3 flex flex-col min-h-screen">
                <AdminNavbar />
                <div className="content flex-1">
                  <Routes>
                    <Route path="/" element={<HomeComponent />} />
                    <Route path="/profile" element={<UserProfile />} />
                    <Route path="/game" element={<GameComponent />} />
                    <Route path="/network" element={<NetworkComponent />} />
                    <Route path="/news" element={<NewsComponent />} />
                    <Route path="/tasks" element={<TaskUIComponent />} />
                    <Route path="/history" element={<History />} />
                    <Route path="/wallet" element={<WalletComponent />} />
                    <Route path="/admintask" element={<AdminTask />} />
                    <Route path="/adminNews" element={<AdminNews />} />
                  </Routes>
                </div>
                {shouldShowNavbar && <Navbar />}
              </div>

              <StreakPopup
                show={showStreakPopup}
                message={popupMessage}
                currentStreak={popupCurrentStreak}
                onClose={closeStreakPopup}
              />
            </>
          </StreakTracker>
        </HistoryProvider>
      </ReferralProvider>
    </WalletProvider>
  );
}

export default App;
