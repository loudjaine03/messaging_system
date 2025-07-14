import React, { useState } from "react";
import { initializeApp } from "firebase/app";
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";

const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "...",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
auth.settings.appVerificationDisabledForTesting = true;

const setupRecaptcha = () => {
  if (!window.recaptchaVerifier) {
    window.recaptchaVerifier = new RecaptchaVerifier(
      "recaptcha-container",
      {
        size: "invisible",
        callback: () => {

        },
      },
      auth
    );
    window.recaptchaVerifier.render();
  }
};


export default function PhoneSignIn() {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [message, setMessage] = useState("");

  const setupRecaptcha = () => {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(
        "recaptcha-container",
        {
          size: "invisible",
          appVerificationDisabledForTesting: true,
          callback: () => {

          },
        },
        auth
      );
      window.recaptchaVerifier.render();
    }
  };

  const requestOtp = () => {
    setMessage("");
    setupRecaptcha();
    signInWithPhoneNumber(auth, phone, window.recaptchaVerifier)
      .then((confirmationResult) => {
        setConfirmationResult(confirmationResult);
        setMessage("OTP sent!");
      })
      .catch((error) => {
        setMessage("Error: " + error.message);
      });
  };

  const verifyOtp = () => {
    if (!confirmationResult) {
      setMessage("Request OTP first");
      return;
    }
    confirmationResult
      .confirm(otp)
      .then((result) => {
        setMessage("OTP verified");
      })
      .catch((error) => {
        setMessage("Verification failed: " + error.message);
      });
  };

  return (
    <div>
      <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1234567890" />
      <button onClick={requestOtp}>Send OTP</button>
      <div id="recaptcha-container"></div>
      <input value={otp} onChange={e => setOtp(e.target.value)} placeholder="Enter OTP" />
      <button onClick={verifyOtp}>Verify OTP</button>
      <p>{message}</p>
    </div>
  );
}
