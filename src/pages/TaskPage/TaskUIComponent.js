import { useEffect, useState } from "react";
import {
  ChevronLeft,
  Zap,
  CheckSquare,
  Trophy,
  Star,
  Bell,
  PlayCircle,
  Share2,
  ClipboardCheck
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@radix-ui/react-tabs";
import { useTelegram } from "../../reactContext/TelegramContext";
import { useNavigate, useLocation } from "react-router-dom";
import { database } from "../../services/FirebaseConfig";
import { ref, onValue, update, get, set } from "firebase/database";
import "../../Styles/TaskPagePremium.css";

export default function TasksPage() {
  const { user, scores } = useTelegram();
  const navigate = useNavigate();
  const location = useLocation();

  const [tasks, setTasks] = useState({});
  const [userTasks, setUserTasks] = useState({});
  const [watchCodes, setWatchCodes] = useState({});
  const [activeTab, setActiveTab] = useState(location.state?.tab || "daily");

  const userTasksRef = ref(database, `connections/${user.id}/tasks`);
  const userScoreRef = ref(database, `users/${user.id}/Score`);

  /* ---------------- LOAD TASKS & USER PROGRESS ---------------- */
  useEffect(() => {
    onValue(ref(database, "tasks"), snap => {
      setTasks(snap.val() || {});
    });
    onValue(userTasksRef, snap => {
      setUserTasks(snap.val() || {});
    });
  }, [user.id]);

  /* ---------------- DAILY → WEEKLY TRACKING (UNCHANGED) ---------------- */
  const handleDailyCompletionForWeekly = async () => {
    const allDailyTasks = tasks.daily || {};
    const userDailyTasks = userTasks.daily || {};

    if (Object.keys(allDailyTasks).length === 0) return;

    const allCompleted = Object.keys(allDailyTasks).every(
      taskId => userDailyTasks[taskId]?.completed === true
    );

    if (!allCompleted) return;

    const today = new Date().toDateString();
    const lastDateRef = ref(
      database,
      `connections/${user.id}/meta/lastDailyCompleteDate`
    );
    const lastSnap = await get(lastDateRef);

    if (lastSnap.val() === today) return;

    const weeklyTasks = tasks.weekly || {};

    for (const [weeklyTaskId, weeklyTask] of Object.entries(weeklyTasks)) {
      if (weeklyTask.weeklyMode === "tracked") {
        const userWeeklyRef = ref(
          database,
          `connections/${user.id}/tasks/weekly/${weeklyTaskId}`
        );
        const userWeeklySnap = await get(userWeeklyRef);

        const current = userWeeklySnap.val()?.progress || 0;
        const next = current + 1;

        await update(userWeeklyRef, {
          progress: next,
          completed: next >= weeklyTask.target,
          lastUpdated: Date.now()
        });
      }
    }

    await set(lastDateRef, today);
  };

  /* ---------------- CLAIM REWARD ---------------- */
  const claimReward = async (category, taskId, task) => {
    const xp = Number(task.xp || 0);
    const snap = await get(userScoreRef);
    const s = snap.val() || {};

    await update(userScoreRef, {
      task_score: (s.task_score || 0) + xp,
      total_score: (s.total_score || 0) + xp
    });

    const userTaskRef = ref(
      database,
      `connections/${user.id}/tasks/${category}/${taskId}`
    );

    if (category === "achievements") {
      await set(userTaskRef, {
        progress: 0,
        completed: false,
        claimed: false,
        lastUpdated: Date.now()
      });
    } else {
      await update(userTaskRef, {
        claimed: true,
        claimedAt: Date.now()
      });
    }

    if (category === "daily") {
      await handleDailyCompletionForWeekly();
    }
  };

  /* ---------------- START TASK (WATCH UPDATED) ---------------- */
  const startTask = async (task) => {
    const userTaskRef = ref(
      database,
      `connections/${user.id}/tasks/${task.category}/${task.id}`
    );

    if (task.type === "watch") {
      await update(userTaskRef, {
        started: true,
        lastStartedAt: Date.now()
      });
      window.open(task.url, "_blank");
      return;
    }

    if (task.type === "news") navigate("/news");
    else if (task.type === "game") navigate("/game");
    else if (task.type === "partnership") navigate("/network");
  };

  /* ---------------- VERIFY WATCH CODE ---------------- */
  const verifyWatchCode = async (task) => {
    const enteredCode = (watchCodes[task.id] || "").trim();

    if (!enteredCode || enteredCode !== task.watchCode) {
      alert("Invalid verification code");
      return;
    }

    await update(
      ref(database, `connections/${user.id}/tasks/${task.category}/${task.id}`),
      {
        completed: true,
        progress: 1,
        codeVerified: true,
        verifiedAt: Date.now()
      }
    );
  };

  /* ---------------- FILTER TASKS ---------------- */
  const getFilteredTasks = (tab) => {
    const allTasks = Object.entries(tasks).flatMap(([category, catTasks]) =>
      Object.entries(catTasks || {}).map(([id, task]) => ({
        id,
        category,
        ...task
      }))
    );

    switch (tab) {
      case "daily": return allTasks.filter(t => t.category === "daily");
      case "weekly": return allTasks.filter(t => t.category === "weekly");
      case "achievements": return allTasks.filter(t => t.category === "achievements");
      case "watch": return allTasks.filter(t => t.type === "watch");
      case "social": return allTasks.filter(t => t.type === "social");
      case "partnership": return allTasks.filter(t => t.type === "partnership");
      case "misc": return allTasks.filter(t => t.type === "misc");
      default: return allTasks;
    }
  };

  /* ---------------- ICON LOGIC (UNCHANGED) ---------------- */
  const getTaskIcon = (task) => {
    if (task.type === "news") return <ClipboardCheck size={20} className="text-blue-400" />;
    if (task.type === "game") return <Trophy size={20} className="text-pink-400" />;
    if (task.type === "watch") return <PlayCircle size={20} className="text-amber-400" />;
    if (task.type === "social") return <Share2 size={20} className="text-indigo-400" />;
    if (task.category === "daily") return <Zap size={20} className="text-blue-400" />;
    if (task.category === "achievements") return <Star size={20} className="text-amber-400" />;
    return <Bell size={20} className="text-purple-400" />;
  };

  /* ---------------- RENDER TASKS ---------------- */
  const renderTasksByTab = (tab) =>
    getFilteredTasks(tab).map((task) => {
      const userTask = userTasks?.[task.category]?.[task.id] || {};
      const progress = userTask.progress || 0;
      const completed = userTask.completed || progress >= task.target;
      const claimed = userTask.claimed;
      const percent = Math.min((progress / (task.target || 1)) * 100, 100);

      const isWeeklyTracked =
        task.category === "weekly" && task.weeklyMode === "tracked";

      return (
        <div key={`${task.category}-${task.id}`} className="task-card-premium">
          <div className="task-card-header">
            <div className="task-icon-circle bg-white/10">
              {getTaskIcon(task)}
            </div>

            <div className="task-main-info">
              <h3 className="task-title-premium">{task.title}</h3>
              <p className="task-desc-premium">{task.description}</p>
            </div>

            <div className="task-badges-container">
              <div className="xp-badge-premium">+{task.xp} XP</div>

              {claimed ? (
                <Button disabled className="start-btn-premium opacity-50">
                  Claimed
                </Button>
              ) : completed ? (
                <Button
                  className="start-btn-premium claim-btn-premium"
                  onClick={() => claimReward(task.category, task.id, task)}
                >
                  Claim Reward
                </Button>
              ) : !isWeeklyTracked ? (
                <Button
                  className="start-btn-premium"
                  onClick={() => startTask(task)}
                >
                  Start Task
                </Button>
              ) : null}
            </div>
          </div>

          {/* ✅ WATCH CODE VERIFICATION UI */}
          {task.type === "watch" &&
            userTask.started &&
            !userTask.codeVerified &&
            !completed && (
              <div className="watch-verify-row">
                <input
                  className="watch-code-input"
                  type="text"
                  placeholder="Enter code"
                  value={watchCodes[task.id] || ""}
                  onChange={(e) =>
                    setWatchCodes(p => ({ ...p, [task.id]: e.target.value }))
                  }
                />
                <Button
                  className="watch-verify-btn"
                  onClick={() => verifyWatchCode(task)}
                >
                  Verify
                </Button>
              </div>
            )}

          <div className="progress-section-premium">
            <div className="progress-labels">
              <span>Progress</span>
              <span>{progress} / {task.target}</span>
            </div>
            <div className="progress-bar-container-premium">
              <div
                className={`progress-fill-premium ${completed ? "completed" : ""}`}
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        </div>
      );
    });

  /* ---------------- UI ---------------- */
  return (
    <div className="task-page-premium relative overflow-hidden">
      <div className="relative z-10 p-4">
        <header className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ChevronLeft size={24} />
          </Button>
          <h1 className="text-xl font-bold">Tasks</h1>
        </header>

        <div className="score-card-premium">
          <div>
            <p className="score-text-label">Your Task Score</p>
            <p className="score-value">
              {scores?.task_score || 0} <span>XP</span>
            </p>
          </div>
          <div className="checkbox-icon-container">
            <CheckSquare size={32} />
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="tabs-list-premium">
            <TabsTrigger className="tabs-trigger-premium" value="daily">Daily</TabsTrigger>
            <TabsTrigger className="tabs-trigger-premium" value="weekly">Weekly</TabsTrigger>
            <TabsTrigger className="tabs-trigger-premium" value="achievements">Achievements</TabsTrigger>
            <TabsTrigger className="tabs-trigger-premium" value="all">All</TabsTrigger>
            <TabsTrigger className="tabs-trigger-premium" value="watch">Watch</TabsTrigger>
            <TabsTrigger className="tabs-trigger-premium" value="social">Social</TabsTrigger>
            <TabsTrigger className="tabs-trigger-premium" value="partnership">Partnership</TabsTrigger>
            <TabsTrigger className="tabs-trigger-premium" value="misc">Misc</TabsTrigger>
          </TabsList>

          <div className="mt-4">
            <TabsContent value="all">{renderTasksByTab("all")}</TabsContent>
            <TabsContent value="daily">{renderTasksByTab("daily")}</TabsContent>
            <TabsContent value="weekly">{renderTasksByTab("weekly")}</TabsContent>
            <TabsContent value="achievements">{renderTasksByTab("achievements")}</TabsContent>
            <TabsContent value="watch">{renderTasksByTab("watch")}</TabsContent>
            <TabsContent value="social">{renderTasksByTab("social")}</TabsContent>
            <TabsContent value="partnership">{renderTasksByTab("partnership")}</TabsContent>
            <TabsContent value="misc">{renderTasksByTab("misc")}</TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
