import React, { createContext, useContext, useEffect, useState } from "react";
import { useTelegram } from "./TelegramContext";
import { database } from "../services/FirebaseConfig";
import { ref, get, update, onValue, off } from "firebase/database";

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
     1️⃣ DETECT TELEGRAM START PARAM
  ================================================= */
  useEffect(() => {
    if (!user?.id || hasProcessed) return;

    const tg = window.Telegram?.WebApp;
    if (!tg) return;

    const startParam = tg.initDataUnsafe?.start_param;

    if (!startParam || !startParam.startsWith("ref_")) return;

    const referrerId = startParam.split("_")[1];

    // Block self referral
    if (!referrerId || referrerId === String(user.id)) return;

    const checkAndProcess = async () => {
      try {
        const referredCheckRef = ref(database, `users/${user.id}/referredBy`);
        const referredSnap = await get(referredCheckRef);

        // Only process if referredBy does NOT exist
        if (!referredSnap.exists()) {
          await processReferral(referrerId, String(user.id));
        }

      } catch (err) {
        console.error("Referral detection error:", err);
      }
    };

    checkAndProcess();

  }, [user?.id]);

  /* =================================================
     2️⃣ PROCESS REFERRAL
  ================================================= */
  const processReferral = async (referrerId, referredId) => {
    try {
      setHasProcessed(true);

      const referrerRef = ref(database, `users/${referrerId}`);
      const referrerSnap = await get(referrerRef);
      if (!referrerSnap.exists()) return;

      const referredRef = ref(database, `users/${referredId}`);
      const referredSnap = await get(referredRef);

      const referrerData = referrerSnap.val();
      const referredData = referredSnap.val() || {};

      const referrerScore = referrerData.Score || {};
      const referredScore = referredData.Score || {};

      const now = Date.now();
      const referrerDisplayName = referrerData.name || "A Friend";

      const updates = {};

      /* --- Save referredBy under new user --- */
      updates[`users/${referredId}/referredBy`] = {
        id: referrerId,
        name: referrerDisplayName,
        at: now
      };

      /* --- Add 50 XP to referred user (ADD, not overwrite) --- */
      updates[`users/${referredId}/Score/network_score`] =
        (referredScore.network_score || 0) + 50;

      updates[`users/${referredId}/Score/total_score`] =
        (referredScore.total_score || 0) + 50;

      /* --- Add referral record under referrer --- */
      updates[`users/${referrerId}/referrals/${referredId}`] = {
        id: referredId,
        name: user.username || referredData.name || "Friend",
        referredAt: now
      };

      /* --- Add 100 XP to referrer (ADD, not overwrite) --- */
      updates[`users/${referrerId}/Score/network_score`] =
        (referrerScore.network_score || 0) + 100;

      updates[`users/${referrerId}/Score/total_score`] =
        (referrerScore.total_score || 0) + 100;

      await update(ref(database), updates);

      setReferrerName(referrerDisplayName);
      setShowWelcomePopup(true);

      console.log("Referral processed successfully");

    } catch (err) {
      console.error("Referral processing error:", err);
    }
  };

  /* =================================================
     3️⃣ GENERATE TELEGRAM INVITE LINK
  ================================================= */
  useEffect(() => {
    if (!user?.id || !BOT_USERNAME) return;

    setInviteLink(
      `https://t.me/${BOT_USERNAME}/app?startapp=ref_${user.id}`
    );

  }, [user?.id]);

  /* =================================================
     4️⃣ LOAD MY REFERRALS
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
    window.open(
      `https://wa.me/?text=${encodeURIComponent(inviteLink)}`,
      "_blank"
    );
  };

  const shareToTwitter = () => {
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(inviteLink)}`,
      "_blank"
    );
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
