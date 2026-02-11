// import React from 'react';

// const WelcomePopup = ({ onClose }) => {
//   return (
//     <>

// <style>{`
//         .popup-overlay {
//           position: fixed;
//           inset: 0;
//           display: flex;
//           justify-content: center;
//           align-items: center;
//           background: rgba(0, 0, 0, 0.5);
//           z-index: 999;
//         }
//         .popup-container {
//           background: #fff;
//           padding: 24px;
//           border-radius: 16px;
//           width: 320px;
//           text-align: center;
//           box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
//           position: relative;
//           animation: fadeInScale 0.3s ease;
//         }
//         .close-button {
//           position: absolute;
//           top: 8px;
//           right: 12px;
//           background: transparent;
//           border: none;
//           font-size: 24px;
//           cursor: pointer;
//           color: #666;
//         }
//         .close-button:hover {
//           color: #000;
//         }
//         .points-text {
//           font-weight: bold;
//           color: #16a34a;
//         }
//         @keyframes fadeInScale {
//           from {
//             opacity: 0;
//             transform: scale(0.9);
//           }
//           to {
//             opacity: 1;
//             transform: scale(1);
//           }
//         }
//       `}</style>
//       <div className="popup-overlay">
//         <div className="popup-container">
//           <button onClick={onClose} className="close-button">×</button>
//           <h2>Welcome to Web3Today News</h2>
//           <p>You got <span className="points-text">50 points</span> 🎉</p>
//         </div>
//       </div>
//     </>
//   );
// };

// export default WelcomePopup;


import React from 'react';
import { useReferral } from '../../reactContext/ReferralContext';

const WelcomePopup = ({ onClose }) => {
  const { referrerName } = useReferral();

  return (
    <>
      <style>{`
        .popup-overlay {
          position: fixed;
          inset: 0;
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 9999;
          background: rgba(15, 23, 42, 0.8); /* Darker backdrop for premium feel */
          backdrop-filter: blur(8px);
        }
        .popup-container {
          background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 30px;
          border-radius: 24px;
          width: 320px;
          text-align: center;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          position: relative;
          animation: fadeInScale 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .close-button {
          position: absolute;
          top: 15px;
          right: 15px;
          background: rgba(255, 255, 255, 0.05);
          border: none;
          width: 30px;
          height: 30px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          cursor: pointer;
          color: #94a3b8;
          transition: all 0.2s;
        }
        .close-button:hover {
          background: rgba(255, 255, 255, 0.1);
          color: white;
        }
        .popup-icon {
          font-size: 40px;
          margin-bottom: 20px;
          display: block;
        }
        .popup-title {
          font-size: 1.5rem;
          font-weight: 800;
          color: white;
          margin-bottom: 10px;
          background: linear-gradient(to right, #f472b6, #fbbf24);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .popup-subtitle {
          font-size: 1rem;
          color: #94a3b8;
          margin-bottom: 25px;
          line-height: 1.5;
        }
        .referrer-name {
          color: #fbbf24;
          font-weight: 700;
        }
        .points-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          background: linear-gradient(90deg, #fbbf24 0%, #f59e0b 100%);
          color: #000;
          font-weight: 900;
          font-size: 1.25rem;
          border-radius: 12px;
          padding: 10px 25px;
          margin-bottom: 20px;
          box-shadow: 0 10px 15px -3px rgba(245, 158, 11, 0.3);
          transform: rotate(-2deg);
        }
        @keyframes fadeInScale {
          from {
            opacity: 0;
            transform: scale(0.8) translateY(20px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        .claim-btn {
          background: white;
          color: black;
          font-weight: 700;
          padding: 12px 30px;
          border-radius: 12px;
          border: none;
          width: 100%;
          cursor: pointer;
          transition: all 0.2s;
        }
        .claim-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 15px -3px rgba(255, 255, 255, 0.1);
        }
      `}</style>
      <div className="popup-overlay">
        <div className="popup-container">
          <button onClick={onClose} className="close-button" aria-label="Close">&times;</button>
          <span className="popup-icon">🎁</span>
          <div className="popup-title">Welcome!</div>
          <div className="popup-subtitle">
            You were referred by <span className="referrer-name">{referrerName || "a friend"}</span>.
            Enjoy your welcome bonus!
          </div>
          <div className="points-badge">
            +50 XP ⚡
          </div>
          <button className="claim-btn" onClick={onClose}>
            Awesome!
          </button>
        </div>
      </div>
    </>
  );
};

export default WelcomePopup;
