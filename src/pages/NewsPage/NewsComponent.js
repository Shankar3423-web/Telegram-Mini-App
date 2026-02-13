import { useState, useEffect, useRef } from "react";
import {
  Zap,
  ThumbsUp,
  ThumbsDown,
  ChevronLeft,
  CheckCircle2,
  Heart,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { useNavigate } from "react-router-dom";
import { ref, query, orderByChild, onValue, update, get, set } from "firebase/database";
import { database } from "../../services/FirebaseConfig";
import { useTelegram } from "../../reactContext/TelegramContext";
import { incrementTaskProgress } from "../../services/taskService";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination, EffectCoverflow } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/effect-coverflow";
import "../../Styles/NewsPagePremium.css";

export default function NewsComponent() {
  const [newsItems, setNewsItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentNewsIndex, setCurrentNewsIndex] = useState(0);

  const [isFeedComplete, setIsFeedComplete] = useState(false);
  const [likedId, setLikedId] = useState(null);
  const [processedIds, setProcessedIds] = useState(new Set());
  const [swiper, setSwiper] = useState(null);
  const processingRef = useRef(new Set());
  const navigate = useNavigate();
  const { user, scores } = useTelegram();

  useEffect(() => {
    const newsRef = query(ref(database, "news"), orderByChild("createdAt"));
    const unsubscribe = onValue(
      newsRef,
      async (snapshot) => {
        const data = snapshot.val();
        if (!data) {
          setNewsItems([]);
          setIsLoading(false);
          return;
        }

        const allNews = Object.entries(data).map(([id, item]) => ({ id, ...item }));
        const userNewsRef = ref(database, `connections/${user.id}/tasks/daily/news`);
        const userSnapshot = await get(userNewsRef);
        const completedNews = userSnapshot.exists() ? userSnapshot.val() : {};

        const unreadNews = allNews
          .filter((news) => !completedNews[news.id])
          .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

        setNewsItems(unreadNews);
        if (unreadNews.length === 0) {
          setIsFeedComplete(true);
        }

        setCurrentNewsIndex(0);
        setIsLoading(false);
      },
      (error) => {
        console.error("Error loading news: ", error);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user.id]);

  const handleSwipe = async (dir, newsId) => {
    if (!newsId) return;

    // Use a ref-based check to prevent race conditions and double processing
    if (processingRef.current.has(newsId) && dir !== "right_update") return;

    // Also check state for extra safety (e.g. if already in DB)
    if (processedIds.has(newsId) && dir !== "right_update") return;

    // Mark as being processed immediately
    if (dir !== "right_update") {
      processingRef.current.add(newsId);
    }

    if (dir === "right") {
      setLikedId(newsId);
    }

    const userRef = ref(database, `users/${user.id}/Score`);
    const newsItemRef = ref(database, `news/${newsId}`);

    try {
      // 1. Update User Score
      const userSnapshot = await get(userRef);
      if (userSnapshot.exists()) {
        const userData = userSnapshot.val();
        await update(userRef, {
          news_score: (userData?.news_score || 0) + 5,
          total_score: (userData?.total_score || 0) + 5,
        });
      }

      // 1.5 Update News Likes in database if swiped right/Interesting
      if (dir === "right") {
        const newsSnapshot = await get(newsItemRef);
        let currentLikes = 0;
        if (newsSnapshot.exists()) {
          currentLikes = newsSnapshot.val().likes || 0;
        }
        await update(newsItemRef, {
          likes: currentLikes + 1,
        });
      }

      // 2. Track Task Progress across all categories (Daily, Weekly, Achievements)
      await incrementTaskProgress(user.id, "news", 1);

      // 3. Mark this specific news item as read
      const readNewsRef = ref(database, `connections/${user.id}/tasks/daily/news/${newsId}`);
      await set(readNewsRef, true);

      setProcessedIds((prev) => new Set(prev).add(newsId));

      // If triggered by button, move to next slide after a short delay
      if (dir === "right" || dir === "left") {
        setTimeout(() => {
          if (swiper) {
            if (swiper.isEnd) {
              setIsFeedComplete(true);
            } else {
              swiper.slideNext();
            }
          }
        }, dir === "right" ? 1000 : 300);
      }

    } catch (err) {
      console.error("News swipe error:", err);
    }
  };

  const onSlideChange = (s) => {
    const prevIndex = s.previousIndex;
    const activeIndex = s.activeIndex;

    // Only process the previous item if we moved FORWARD (activeIndex > prevIndex)
    // This prevents rewarding points when the user swipes BACK to a previous article
    const prevItem = newsItems[prevIndex];
    if (activeIndex > prevIndex && prevItem && !processedIds.has(prevItem.id) && !processingRef.current.has(prevItem.id)) {
      // If user swiped forward manually without clicking buttons, treat as read
      handleSwipe("left_manual", prevItem.id);
    }
    setCurrentNewsIndex(activeIndex);
  };

  const handleReadMore = () => {
    window.open("https://web3today-website.vercel.app/", "_blank");
  };

  if (isLoading) {
    return (
      <div className="news-page-premium flex items-center justify-center">
        <div className="text-xl animate-pulse">Loading amazing news...</div>
      </div>
    );
  }

  return (
    <div className="news-page-premium">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-pink-500/10 blur-[100px] pointer-events-none"></div>

      <header className="news-header-premium relative z-20">
        <div className="header-left-group">
          <Button
            variant="ghost"
            size="icon"
            className="back-icon-btn"
            onClick={() => navigate("/")}
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <div className="news-header-titles">
            <h1 className="text-xl font-bold">News Score</h1>
            <p className="text-xs text-white/60">Based on your interactions</p>
          </div>
        </div>
        <div className="news-score-display">
          <span className="score-number">{scores?.news_score || 0}</span>
          <Zap className="h-5 w-5 text-amber-300 fill-amber-300" />
        </div>
      </header>

      <main className="relative z-10 pt-4">
        {isFeedComplete ? (
          <div className="feed-complete-premium">
            <div className="complete-icon-wrapper">
              <CheckCircle2 size={48} />
            </div>
            <h2 className="text-2xl font-bold mb-2">Caught Up!</h2>
            <p className="text-white/60 mb-8 px-8">
              You've read all the latest news. Return to the tasks page to claim your daily rewards!
            </p>
            <Button
              className="bg-white/10 text-white hover:bg-white/20 border-none px-10 py-6 rounded-2xl font-bold transition-all"
              onClick={() => navigate("/network")}
            >
              Go to Tasks
            </Button>
          </div>
        ) : (
          <>
            <div className="news-swiper-container">
              <Swiper
                grabCursor={true}
                centeredSlides={true}
                slidesPerView={1}
                spaceBetween={0}
                coverflowEffect={{
                  rotate: 0,
                  stretch: 0,
                  depth: 0,
                  modifier: 1,
                  slideShadows: false,
                }}
                autoplay={{
                  delay: 8000,
                  disableOnInteraction: true,
                }}
                pagination={false}
                modules={[Autoplay, Pagination, EffectCoverflow]}
                onSwiper={setSwiper}
                onSlideChange={onSlideChange}
                onReachEnd={() => {
                  // After seeing the last one for some time, complete feed
                  setTimeout(() => {
                    const lastItem = newsItems[newsItems.length - 1];
                    if (lastItem && processedIds.has(lastItem.id)) {
                      setIsFeedComplete(true);
                    }
                  }, 8000);
                }}
                className="news-swiper"
              >
                {newsItems.map((item, index) => (
                  <SwiperSlide key={item.id}>
                    <div className="news-card-premium">
                      <div className="news-image-wrap">
                        <img
                          src={item.imageUrl || "/placeholder.svg"}
                          alt={item.title || "News"}
                          className="news-item-img"
                        />
                        {item.category && (
                          <div className="news-category-tag">
                            {item.category}
                          </div>
                        )}
                      </div>

                      <div className="news-info-content">
                        <h2 className="news-title-text">
                          {item.title}
                        </h2>
                        <p className="news-description-text">
                          {item.summary}
                        </p>

                        <div className="news-meta-row">
                          <a
                            href="https://web3today-website.vercel.app/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="news-readmore-link"
                            onClick={(e) => {
                              e.preventDefault();
                              handleReadMore();
                            }}
                          >
                            Read More →
                          </a>
                        </div>

                        <div className="news-interaction-btns">
                          <button
                            onClick={() => handleSwipe("left", item.id)}
                            className="news-btn-action btn-skip"
                          >
                            <ThumbsDown size={24} />
                            <span>Skip</span>
                          </button>
                          <button
                            onClick={() => handleSwipe("right", item.id)}
                            className={`news-btn-action btn-interest ${likedId === item.id ? 'active' : ''}`}
                            disabled={likedId === item.id}
                          >
                            {likedId === item.id ? (
                              <>
                                <Heart size={24} fill="white" />
                                <span>Liked</span>
                              </>
                            ) : (
                              <>
                                <ThumbsUp size={24} />
                                <span>Interesting</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </SwiperSlide>
                ))}
              </Swiper>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
