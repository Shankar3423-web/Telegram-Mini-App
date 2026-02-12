import React, { createContext, useContext, useEffect, useState } from "react";
import { useTelegram } from "./TelegramContext";
import { database } from "../services/FirebaseConfig";
import { ref, get, update, onValue, off, set } from "firebase/database";

const ReferralContext = createContext();
export const useReferral = () => useContext(ReferralContext);

const BOT_USERNAME = process.env.REACT_APP_BOT_USERNAME;

export const ReferralProvider = ({ children }) => {
  const { user } = useTelegram();

  const [inviteLink, setInviteLink] = useState("");
  const [invitedFriends, setInvitedFriends] = useState([]);
  const [showWelcomePopup, setShowWelcomePopup] = useState(false);
  const [referrerName, setReferrerName] = useState("");
  const [hasProcessed, setHasProcessed] = useState(false);

  /* =================================================
     1️⃣ GENERATE SESSION-BASED INVITE LINK
  ================================================= */
  useEffect(() => {
    if (!user?.id || !BOT_USERNAME) return;

    const generateSession = async () => {
      try {
        const sessionId =
          "ref_" + Math.random().toString(36).substring(2, 12);

        await set(ref(database, `referralSessions/${sessionId}`), {
          referrerId: String(user.id),
          referrerName: user.username || user.first_name || "Friend",
          used: false,
          expiresAt: Date.now() + 24 * 60 * 60 * 1000
        });

        setInviteLink(
          `https://t.me/${BOT_USERNAME}/app?startapp=${sessionId}`
        );
      } catch (err) {
        console.error("Session generation error:", err);
      }
    };

    generateSession();
  }, [user?.id]);

  /* =================================================
     2️⃣ DETECT SESSION TOKEN & PROCESS REFERRAL
  ================================================= */
  useEffect(() => {
    if (!user?.id || hasProcessed) return;

    const tg = window.Telegram?.WebApp;
    if (!tg) return;

    const startParam = tg.initDataUnsafe?.start_param;
    if (!startParam || !startParam.startsWith("ref_")) return;

    const processReferral = async () => {
      try {
        const sessionRef = ref(database, `referralSessions/${startParam}`);
        const sessionSnap = await get(sessionRef);

        if (!sessionSnap.exists()) return;

        const session = sessionSnap.val();

        // 🔒 Basic validation
        if (session.used) return;
        if (session.expiresAt < Date.now()) return;
        if (session.referrerId === String(user.id)) return;

        // 🔁 Ensure current user exists (wait if needed)
        const referredRef = ref(database, `users/${user.id}`);
        let referredSnap = await get(referredRef);

        if (!referredSnap.exists()) {
          // Wait briefly for initializeUser to complete
          await new Promise((resolve) => setTimeout(resolve, 500));
          referredSnap = await get(referredRef);
          if (!referredSnap.exists()) return;
        }

        // 🔁 Ensure referrer exists
        const referrerRef = ref(database, `users/${session.referrerId}`);
        const referrerSnap = await get(referrerRef);
        if (!referrerSnap.exists()) return;

        const referrerData = referrerSnap.val();
        const referredData = referredSnap.val();

        const referrerScore = referrerData.Score || {};
        const referredScore = referredData.Score || {};

        const now = Date.now();

        const updates = {};

        /* ---- Add referredBy under current user ---- */
        updates[`users/${user.id}/referredBy`] = {
          id: session.referrerId,
          name: session.referrerName,
          at: now
        };

        /* ---- Add under referrer referrals ---- */
        updates[`users/${session.referrerId}/referrals/${user.id}`] = {
          id: String(user.id),
          name: user.username || user.first_name || "Friend",
          referredAt: now
        };

        /* ---- XP Updates ---- */
        updates[`users/${session.referrerId}/Score/network_score`] =
          (referrerScore.network_score || 0) + 100;

        updates[`users/${session.referrerId}/Score/total_score`] =
          (referrerScore.total_score || 0) + 100;

        updates[`users/${user.id}/Score/total_score`] =
          (referredScore.total_score || 0) + 50;

        /* ---- Mark session used ---- */
        updates[`referralSessions/${startParam}/used`] = true;

        await update(ref(database), updates);

        setReferrerName(session.referrerName);
        setShowWelcomePopup(true);
        setHasProcessed(true);

        console.log("Referral processed successfully.");

      } catch (err) {
        console.error("Referral processing error:", err);
      }
    };

    processReferral();

  }, [user?.id]);

  /* =================================================
     3️⃣ LOAD MY REFERRALS
  ================================================= */
  useEffect(() => {
    if (!user?.id) return;

    const rRef = ref(database, `users/${user.id}/referrals`);

    const unsubscribe = onValue(rRef, (snap) => {
      const data = snap.val() || {};

      setInvitedFriends(
        Object.entries(data).map(([id, v]) => ({
          id: v.id || id,
          name: v.name || "Unknown",
          referredAt: v.referredAt || 0,
          status: "active"
        }))
      );
    });

    return () => off(rRef, "value", unsubscribe);

  }, [user?.id]);

  /* =================================================
     SHARE HELPERS
  ================================================= */
  const shareToTelegram = () => {
    window.open(
      `https://t.me/share/url?url=${encodeURIComponent(inviteLink)}`,
      "_blank"
    );
  };

  const shareToWhatsApp = () => {
    const text = `Join me on this awesome app and earn rewards! ${inviteLink}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  const shareToTwitter = () => {
    const text = `Join me on this awesome app and earn rewards! ${inviteLink}`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, "_blank");
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      return true;
    } catch {
      return false;
    }
  };

  return (
    <ReferralContext.Provider
      value={{
        inviteLink,
        invitedFriends,
        shareToTelegram,
        shareToWhatsApp,
        shareToTwitter,
        copyToClipboard,
        showWelcomePopup,
        setShowWelcomePopup,
        referrerName
      }}
    >
      {children}
    </ReferralContext.Provider>
  );
};
