import React, { createContext, useContext, useEffect, useState } from "react";
import { useTelegram } from "./TelegramContext";
import { database } from "../services/FirebaseConfig";
import { ref, get, update, onValue, off } from "firebase/database";

const ReferralContext = createContext();
export const useReferral = () => useContext(ReferralContext);

export const ReferralProvider = ({ children }) => {
  const { user } = useTelegram();

  const [inviteLink, setInviteLink] = useState("");
  const [invitedFriends, setInvitedFriends] = useState([]);
  const [showWelcomePopup, setShowWelcomePopup] = useState(false);
  const [referrerName, setReferrerName] = useState("");
  const [hasProcessed, setHasProcessed] = useState(false);

  /* =================================================
     1️⃣ STORE REFERRAL FROM URL (?ref=123)
  ================================================= */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const refId = params.get("ref");

    if (refId) {
      localStorage.setItem("pending_referral", refId);
    }
  }, []);

  /* =================================================
     2️⃣ DETECT & PROCESS STORED REFERRAL
  ================================================= */
  useEffect(() => {
    if (!user?.id || hasProcessed) return;

    const storedReferral = localStorage.getItem("pending_referral");
    if (!storedReferral) return;

    // Prevent self referral
    if (storedReferral === String(user.id)) {
      localStorage.removeItem("pending_referral");
      return;
    }

    const checkAndProcess = async () => {
      try {
        const referredCheckRef = ref(database, `users/${user.id}/referredBy`);
        const referredSnap = await get(referredCheckRef);

        // If already referred before → stop
        if (referredSnap.exists()) {
          localStorage.removeItem("pending_referral");
          return;
        }

        await processReferral(storedReferral, String(user.id));
        localStorage.removeItem("pending_referral");

      } catch (err) {
        console.error("Referral check error:", err);
      }
    };

    checkAndProcess();

  }, [user?.id]);

  /* =================================================
     3️⃣ PROCESS REFERRAL
  ================================================= */
  const processReferral = async (referrerId, referredId) => {
    try {
      setHasProcessed(true);

      const referrerRef = ref(database, `users/${referrerId}`);
      const referrerSnap = await get(referrerRef);

      if (!referrerSnap.exists()) {
        console.log("Referrer not found.");
        return;
      }

      const rData = referrerSnap.val();
      const rName = rData.name || "A Friend";
      const now = Date.now();

      const updates = {};

      // --- Reward Joining User (+50) ---
      updates[`users/${referredId}/referredBy`] = {
        id: referrerId,
        name: rName,
        at: now
      };

      updates[`users/${referredId}/Score/network_score`] = 50;
      updates[`users/${referredId}/Score/total_score`] = 50;

      // --- Reward Referrer (+100) ---
      updates[`users/${referrerId}/referrals/${referredId}`] = {
        id: referredId,
        name: user.username || "Friend",
        referredAt: now
      };

      const rScore = rData.Score || {};
      updates[`users/${referrerId}/Score/network_score`] =
        (rScore.network_score || 0) + 100;

      updates[`users/${referrerId}/Score/total_score`] =
        (rScore.total_score || 0) + 100;

      await update(ref(database), updates);

      setReferrerName(rName);
      setShowWelcomePopup(true);

      console.log("Referral processed successfully.");

    } catch (err) {
      console.error("Referral error:", err);
    }
  };

  /* =================================================
     4️⃣ GENERATE INVITE LINK (NEW SYSTEM)
  ================================================= */
  useEffect(() => {
    if (!user?.id) return;

    setInviteLink(`${window.location.origin}/?ref=${user.id}`);

  }, [user?.id]);

  /* =================================================
     5️⃣ LOAD MY REFERRALS
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
