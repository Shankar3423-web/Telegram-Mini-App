import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Zap, ChevronLeft, Users, Share2, Gift, Trophy, UserPlus } from "lucide-react";
import { ref, onValue } from "firebase/database";
import { database } from "../../services/FirebaseConfig";
import InviteModal from "./InviteModel";
import { useTelegram } from "../../reactContext/TelegramContext";
import { useReferral } from "../../reactContext/ReferralContext";

// Custom Button component
const Button = ({ children, className = "", variant = "default", size = "default", onClick = () => { }, ...props }) => {
  const baseStyles =
    "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background";
  const variants = {
    default: "bg-primary text-primary-foreground hover:bg-primary/90",
    destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
    outline: "border border-input hover:bg-accent hover:text-accent-foreground",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
    ghost: "hover:bg-accent hover:text-accent-foreground",
    link: "underline-offset-4 hover:underline text-primary",
  };
  const sizes = {
    default: "h-10 py-2 px-4",
    sm: "h-9 px-3 rounded-md",
    lg: "h-11 px-8 rounded-md",
    icon: "h-10 w-10",
  };
  return (
    <button className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`} onClick={onClick} {...props}>
      {children}
    </button>
  );
};

// Custom Card components
const Card = ({ children, className = "", ...props }) => (
  <div className={`rounded-lg border bg-card text-card-foreground shadow-sm ${className}`} {...props}>
    {children}
  </div>
);
const CardHeader = ({ children, className = "", ...props }) => (
  <div className={`flex flex-col space-y-1.5 p-6 ${className}`} {...props}>
    {children}
  </div>
);
const CardTitle = ({ children, className = "", ...props }) => (
  <h3 className={`text-2xl font-semibold leading-none tracking-tight ${className}`} {...props}>
    {children}
  </h3>
);
const CardContent = ({ children, className = "", ...props }) => (
  <div className={`p-6 pt-0 ${className}`} {...props}>
    {children}
  </div>
);
const CardFooter = ({ children, className = "", ...props }) => (
  <div className={`flex items-center p-6 pt-0 ${className}`} {...props}>
    {children}
  </div>
);

// Custom Avatar components
const Avatar = ({ children, className = "", ...props }) => (
  <div className={`relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full ${className}`} {...props}>
    {children}
  </div>
);
const AvatarFallback = ({ children, className = "", ...props }) => (
  <div className={`flex h-full w-full items-center justify-center rounded-full bg-muted ${className}`} {...props}>
    {children}
  </div>
);

// Custom Badge component
const Badge = ({ children, className = "", ...props }) => (
  <div
    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${className}`}
    {...props}
  >
    {children}
  </div>
);

// Custom Progress component
const Progress = ({ value = 0, className = "", indicatorClassName = "", ...props }) => (
  <div className={`relative h-4 w-full overflow-hidden rounded-full bg-secondary ${className}`} {...props}>
    <div
      className={`h-full w-full flex-1 bg-primary transition-all ${indicatorClassName}`}
      style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
    />
  </div>
);

export default function NetworkComponent() {
  const [showShareOptions, setShowShareOptions] = useState(false);
  const [activeTab, setActiveTab] = useState("leaderboard");
  const [userId, setUserId] = useState(null);
  const [userScore, setUserScore] = useState(0);
  const [leaderboardTotal, setLeaderboardTotal] = useState([]);
  const [leaderboardHighest, setLeaderboardHighest] = useState([]);
  const [isModalOpen, setModalOpen] = useState(false);
  const [globalExpanded, setGlobalExpanded] = useState(false);
  const [gameExpanded, setGameExpanded] = useState(false);

  const { inviteLink, invitedFriends, shareToTelegram, shareToWhatsApp, shareToTwitter, copyToClipboard } = useReferral();
  const { user, scores } = useTelegram();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && user.id) {
      setUserId(user.id);
    }
  }, [user]);

  // ✅ Read score from users/{id}
  useEffect(() => {
    if (!userId) return;
    const scoreRef = ref(database, `users/${userId}/Score/network_score`);
    const unsubscribe = onValue(scoreRef, (snapshot) => {
      setUserScore(snapshot.exists() ? snapshot.val() : 0);
    });
    return () => unsubscribe();
  }, [userId]);

  // ✅ Read leaderboard from users/
  useEffect(() => {
    const usersRef = ref(database, "users");
    const unsubscribe = onValue(usersRef, (snapshot) => {
      if (snapshot.exists()) {
        const usersData = snapshot.val();
        const leaderboardData = Object.keys(usersData)
          .map((uid) => ({
            id: uid,
            name: usersData[uid].meta?.name || usersData[uid].name || "User",
            highest: Math.floor(usersData[uid].Score?.game_highest_score || 0),
            total: Math.floor(usersData[uid].Score?.total_score || 0),
          }))
          .filter((player) => player.name && player.name.trim() !== "");

        setLeaderboardHighest([...leaderboardData].sort((a, b) => b.highest - a.highest));
        setLeaderboardTotal([...leaderboardData].sort((a, b) => b.total - a.total));
      }
    });
    return () => unsubscribe();
  }, []);

  const shareInvite = () => {
    setShowShareOptions(!showShareOptions);
  };

  const handleGameOpen = () => {
    navigate("/game");
  };

  const formatLeaderboardData = (data) => {
    return data.map((player, index) => ({
      ...player,
      rank: index + 1,
      isCurrentUser: player.id === userId,
      points: player.total,
    }));
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 flex flex-col">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/90 via-purple-600/80 to-pink-600/90 z-0">
        {/* Background patterns omitted for brevity */}
      </div>

      <div className="flex-1 flex flex-col relative z-10">
        <header className="sticky top-0 z-20 bg-white/10 backdrop-blur-md border-b border-white/20 p-4">
          <div className="flex items-center justify-between max-w-md mx-auto">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full text-white hover:bg-white/10"
                onClick={() => navigate("/")}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <span className="font-bold text-base text-white">Network</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center">
                <span className="text-white font-medium mr-1">{Math.floor(scores?.network_score || 0)}</span>
                <Zap className="h-4 w-4 text-amber-300 fill-amber-300 mr-3" />
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 overflow-auto">
          <div className="max-w-md mx-auto">
            <Card className="mb-6 overflow-hidden border-none shadow-lg bg-white/10 backdrop-blur-sm">
              <CardContent className="p-4">
                <h2 className="text-xl font-bold text-white mb-2 flex items-center">
                  <UserPlus className="h-5 w-5 mr-2 text-indigo-300" />
                  Invite Friends
                </h2>
                <p className="text-sm text-white/80 mb-4">Invite friends and both earn rewards!</p>

                {/* ✅ CORRECTED XP LABELS */}
                <div className="flex items-center justify-center gap-6 mb-6 text-center">
                  <div className="flex flex-col items-center">
                    <Avatar className="h-14 w-14 border-2 border-indigo-300 mb-2">
                      <AvatarFallback className="bg-indigo-600/30 text-white">You</AvatarFallback>
                    </Avatar>
                    <div className="bg-indigo-500/20 px-3 py-1 rounded-full text-white flex items-center">
                      <Zap className="h-4 w-4 text-amber-300 fill-amber-300 mr-1" />
                      <span className="font-bold">+100 XP</span> {/* 👈 YOU get 100 */}
                    </div>
                  </div>
                  <div className="text-white opacity-70">
                    <Gift className="h-7 w-7" />
                  </div>
                  <div className="flex flex-col items-center">
                    <Avatar className="h-14 w-14 border-2 border-pink-300 mb-2">
                      <AvatarFallback className="bg-pink-600/30 text-white">Friend</AvatarFallback>
                    </Avatar>
                    <div className="bg-pink-500/20 px-3 py-1 rounded-full text-white flex items-center">
                      <Zap className="h-4 w-4 text-amber-300 fill-amber-300 mr-1" />
                      <span className="font-bold">+50 XP</span> {/* 👈 FRIEND gets 50 */}
                    </div>
                  </div>
                </div>

                <Button
                  onClick={shareInvite}
                  className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white py-2 h-12 font-bold"
                >
                  <Share2 className="h-5 w-5 mr-2" />
                  Share Invite Link
                </Button>

                {showShareOptions && (
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <Button
                      variant="outline"
                      className="text-white border-white/20 bg-white/5 flex flex-col items-center py-3"
                      onClick={shareToWhatsApp}
                    >
                      WhatsApp
                    </Button>
                    <Button
                      id="inviteButton"
                      onClick={() => setModalOpen(true)}
                      variant="outline"
                      className="text-white border-white/20 bg-white/5 flex flex-col items-center py-3"
                    >
                      Telegram
                    </Button>
                    <Button
                      variant="outline"
                      className="text-white border-white/20 bg-white/5 flex flex-col items-center py-3"
                      onClick={shareToTwitter}
                    >
                      Twitter
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Tabs */}
            <div className="relative z-10">
              <div className="grid grid-cols-2 bg-white/10 p-0.5 rounded-md mb-4">
                <button
                  onClick={() => setActiveTab("invites")}
                  className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium text-white transition-all ${activeTab === "invites" ? "bg-white/20" : "hover:bg-white/10"
                    }`}
                >
                  <Users className="h-4 w-4 mr-1" />
                  <span className="text-xs">My Invites</span>
                </button>
                <button
                  onClick={() => setActiveTab("leaderboard")}
                  className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium text-white transition-all ${activeTab === "leaderboard" ? "bg-white/20" : "hover:bg-white/10"
                    }`}
                >
                  <Trophy className="h-4 w-4 mr-1" />
                  <span className="text-xs">Leaderboard</span>
                </button>
              </div>
            </div>

            {/* My Invites Tab */}
            {activeTab === "invites" && (
              <Card className="border-none shadow-lg bg-white/10 backdrop-blur-md">
                <CardHeader className="p-4 pb-2">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-lg text-white flex items-center">
                      <Users className="h-5 w-5 mr-2 text-pink-300" />
                      Invited Friends
                    </CardTitle>
                    <Badge className="bg-pink-600 text-white">
                      {invitedFriends.filter((f) => f.status === "active").length}/{invitedFriends.length}
                    </Badge>
                  </div>
                  <Progress
                    value={
                      (invitedFriends.filter((f) => f.status === "active").length / (invitedFriends.length || 1)) * 100
                    }
                    className="h-1 bg-white/20 mt-2"
                    indicatorClassName="bg-pink-400"
                  />
                </CardHeader>
                <CardContent className="p-4 pt-2">
                  <div className="space-y-3 mt-2">
                    {invitedFriends.map((friend) => (
                      <div
                        key={friend.id}
                        className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 border border-white/20">
                            <AvatarFallback className="bg-white/10 text-white">{friend.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium text-white">{friend.name}</p>
                            <p className="text-xs flex items-center">
                              <span className="text-green-400 flex items-center gap-1">
                                <span className="h-2 w-2 bg-green-400 rounded-full"></span> Active
                              </span>
                            </p>
                          </div>
                        </div>
                        <Badge className="bg-indigo-600/80 flex items-center text-gray-100">
                          <Zap className="h-3 w-3 mr-1 text-amber-300 fill-amber-300" />
                          100 XP
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
                <CardFooter className="p-4 pt-0">
                  <div className="text-white text-sm p-3 bg-white/5 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium">Active Friends</span>
                      <span className="font-bold">{invitedFriends.filter((f) => f.status === "active").length}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Points Earned</span>
                      <span className="font-bold flex items-center">
                        <Zap className="h-4 w-4 mr-1 text-amber-300 fill-amber-300" />
                        {invitedFriends.filter((f) => f.status === "active").length * 100}
                      </span>
                    </div>
                  </div>
                </CardFooter>
              </Card>
            )}

            {/* Leaderboard Tab */}
            {activeTab === "leaderboard" && (
              <Card className="border-none shadow-lg bg-white/10 backdrop-blur-md">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-lg text-white flex items-center">
                    <Trophy className="h-5 w-5 mr-2 text-amber-300" />
                    Global Score
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-2">
                  {(() => {
                    const globalList = formatLeaderboardData(leaderboardTotal);
                    const displayedList = globalExpanded ? globalList : globalList.slice(0, 3);
                    return (
                      <>
                        <div className="space-y-2 mt-2">
                          {displayedList.map((player) => (
                            <div
                              key={player.id}
                              className={`flex items-center justify-between p-3 rounded-lg border ${player.isCurrentUser
                                ? "bg-indigo-500/20 border-indigo-400/50"
                                : "bg-white/5 border-white/10"
                                }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-7 flex justify-center">
                                  {player.rank <= 3 ? (
                                    <div
                                      className={`w-6 h-6 rounded-full flex items-center justify-center font-bold ${player.rank === 1
                                        ? "bg-amber-500/80"
                                        : player.rank === 2
                                          ? "bg-gray-300/80"
                                          : "bg-amber-700/80"
                                        }`}
                                    >
                                      {player.rank}
                                    </div>
                                  ) : (
                                    <span className="text-white/70 font-medium">{player.rank}</span>
                                  )}
                                </div>
                                <Avatar className="h-8 w-8 border border-white/20">
                                  <AvatarFallback className="bg-white/10 text-white">
                                    {player.name.charAt(0)}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p
                                    className={`text-sm font-medium ${player.isCurrentUser ? "text-indigo-200" : "text-white"
                                      }`}
                                  >
                                    {player.name} {player.isCurrentUser && <span className="text-xs">(You)</span>}
                                  </p>
                                </div>
                              </div>
                              <Badge
                                className={`${player.rank === 1
                                  ? "bg-amber-500"
                                  : player.rank === 2
                                    ? "bg-gray-400"
                                    : player.rank === 3
                                      ? "bg-amber-700"
                                      : "bg-indigo-600/80"
                                  } flex items-center text-gray-100`}
                              >
                                <Zap className="h-3 w-3 mr-1 text-white fill-white" />
                                {player.points} XP
                              </Badge>
                            </div>
                          ))}
                        </div>
                        {globalList.length > 3 && (
                          <div className="mt-2">
                            <Button
                              variant="outline"
                              className="w-full border-white/20 text-white hover:bg-white/10"
                              onClick={() => setGlobalExpanded(!globalExpanded)}
                            >
                              {globalExpanded ? "Collapse" : "View Leaderboard"}
                            </Button>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </CardContent>
              </Card>
            )}

            {/* Game Leaderboard */}
            <Card className="mb-6 mt-3 overflow-hidden border-none shadow-lg bg-white/10 backdrop-blur-sm">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-lg text-white flex items-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-5 w-5 mr-2 text-rose-300"
                  >
                    <path d="M12 2L15.09 8.41 22 9.27 17 14.15 18.18 21.02 12 17.77 5.82 21.02 7 14.15 2 9.27 8.91 8.41 12 2z" />
                  </svg>
                  Game Highest Score
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-2">
                {(() => {
                  const gameList = leaderboardHighest;
                  const displayedGameList = gameExpanded ? gameList : gameList.slice(0, 3);
                  return (
                    <>
                      <div className="space-y-2 mt-2">
                        {displayedGameList.map((player, index) => (
                          <div
                            key={player.id}
                            className={`flex items-center justify-between p-3 ${index === 0
                              ? "bg-rose-500/20 border border-rose-400/30"
                              : index === 1
                                ? "bg-white/5 border border-white/10"
                                : "bg-indigo-500/20 border border-indigo-400/30"
                              } rounded-lg`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-7 flex justify-center">
                                <div
                                  className={`w-6 h-6 rounded-full flex items-center justify-center font-bold ${index === 0 ? "bg-amber-500/80" : index === 1 ? "bg-gray-300/80" : "bg-transparent"
                                    }`}
                                >
                                  {index === 2 ? <span className="text-white/70 font-medium">3</span> : index + 1}
                                </div>
                              </div>
                              <Avatar className="h-8 w-8 border border-white/20">
                                <AvatarFallback className="bg-white/10 text-white">
                                  {player.name.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className={`text-sm font-medium ${index === 2 ? "text-indigo-200" : "text-white"}`}>
                                  {player.name} {player.id === userId && <span className="text-xs">(You)</span>}
                                </p>
                              </div>
                            </div>
                            <Badge
                              className={`${index === 0 ? "bg-rose-500" : index === 1 ? "bg-gray-500" : "bg-indigo-600"
                                } flex items-center text-gray-100`}
                            >
                              {player.highest} pts
                            </Badge>
                          </div>
                        ))}
                      </div>
                      {gameList.length > 3 && (
                        <div className="mt-2">
                          <Button
                            variant="outline"
                            className="w-full border-white/20 text-white hover:bg-white/10"
                            onClick={() => setGameExpanded(!gameExpanded)}
                          >
                            {gameExpanded ? "Collapse" : "View Leaderboard"}
                          </Button>
                        </div>
                      )}
                    </>
                  );
                })()}
              </CardContent>
              <CardFooter className="p-4 pt-0">
                <Button
                  className="w-full max-w-xs bg-gradient-to-r from-rose-500 to-pink-600 text-white py-2 h-10 font-bold shadow-md hover:brightness-110 transition-all"
                  onClick={handleGameOpen}
                >
                  Play Again
                </Button>
              </CardFooter>
            </Card>
          </div>
          <InviteModal isOpen={isModalOpen} onClose={() => setModalOpen(false)} />
        </main>
      </div>
    </div>
  );
}