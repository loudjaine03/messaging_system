import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import ReCAPTCHA from "react-google-recaptcha";
import pic from './styles/pics/pic2.png';

const RECAPTCHA_SITE_KEY = "6Lf5kj4rAAAAAPT8KsOBSyeO2LLJl_q8f43wmYdk";

const SignIn = () => {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [showCaptcha, setShowCaptcha] = useState(false);
  const [captchaValue, setCaptchaValue] = useState(null);
  const [captchaError, setCaptchaError] = useState("");

  const [otpRequired, setOtpRequired] = useState(false);
  const [activationRequired, setActivationRequired] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [tempUserId, setTempUserId] = useState(null);

  const navigate = useNavigate();

  const handleCaptchaChange = (value) => {
    setCaptchaValue(value);
    if (value) setCaptchaError("");
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    if (otpRequired) {
      alert("Please enter the OTP code and click Verify OTP.");
      return;
    }

    if (showCaptcha && !captchaValue) {
      setCaptchaError("Please complete the captcha.");
      return;
    }

    setLoading(true);

    try {
      const bodyData = {
        username: identifier,
        password: password,
      };

      if (showCaptcha) {
        bodyData['g-recaptcha-response'] = captchaValue;
      }

      const response = await fetch("http://127.0.0.1:5000/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(bodyData),
      });

      const data = await response.json();
      console.log("Response from server:", data);

      if (response.ok && data.token) {
        localStorage.setItem("token", data.token);
        alert("Login successful!");
        setFailedAttempts(0);
        setShowCaptcha(false);
        setCaptchaValue(null);
        setCaptchaError("");
        navigate("/home");

      } else if (response.ok && data.require_otp) {
        setOtpRequired(true);
        setTempUserId(data.user_id);
        alert("OTP sent to your phone. Please enter the code below.");

      } else if (response.status === 403 && data.require_activation) {
        setOtpRequired(true);
        setActivationRequired(true);
        setTempUserId(data.user_id);
        alert(`Your account is not activated. A code has been sent to your phone (${data.phonenumber}).`);

      } else {
        alert(data.error || "Login failed!");
        setFailedAttempts(prev => {
          const newFailCount = prev + 1;
          if (newFailCount >= 2) setShowCaptcha(true);
          return newFailCount;
        });
        setCaptchaValue(null);
        setCaptchaError("");
      }

    } catch (error) {
      console.error("Error during sign-in:", error);
      alert("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();

    if (!otpCode) {
      alert("Please enter the OTP code.");
      return;
    }

    setLoading(true);

    try {
      const bodyData = {
        otp: otpCode,
        user_id: tempUserId,
      };

      const response = await fetch("http://127.0.0.1:5000/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(bodyData),
      });

      const data = await response.json();
      console.log("OTP verify response:", data);

      if (response.ok && data.token) {
        localStorage.setItem("token", data.token);
        alert("OTP verified! Login successful.");
        setOtpRequired(false);
        setActivationRequired(false);
        setOtpCode("");
        setTempUserId(null);
        setFailedAttempts(0);
        setShowCaptcha(false);
        setCaptchaValue(null);
        setCaptchaError("");
        navigate("/home");

      } else {
        alert(data.error || "Invalid or expired OTP.");
      }
    } catch (error) {
      console.error("Error during OTP verification:", error);
      alert("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-left">
        <img src={pic} alt="App Logo" className="auth-image" />
      </div>
      <div className="auth-card">
        <h2>Sign In</h2>
        <form onSubmit={handleLogin}>
          <input
            type="text"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="Enter your username"
            className="input-field form-control"
            required={!otpRequired}
            disabled={otpRequired}
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            className="input-field form-control"
            required={!otpRequired}
            disabled={otpRequired}
          />

          {showCaptcha && (
            <div style={{ margin: "15px 0" }}>
              <ReCAPTCHA
                sitekey={RECAPTCHA_SITE_KEY}
                onChange={handleCaptchaChange}
              />
              {captchaError && (
                <p style={{ color: "red", marginTop: "8px" }}>{captchaError}</p>
              )}
            </div>
          )}

          {otpRequired && (
            <div style={{ marginTop: "20px" }}>
              <p>
                {activationRequired
                  ? "Enter the account activation code sent to your phone"
                  : "Enter the 2FA verification code sent to your phone"}
              </p>
              <input
                type="text"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                placeholder="Enter OTP"
                className="input-field form-control"
                required
              />
              <button
                onClick={handleOtpSubmit}
                className="auth-button btn btn-warning"
                style={{ marginTop: "10px" }}
                disabled={loading}
                type="button"
              >
                Verify OTP
              </button>
            </div>
          )}

          {!otpRequired && (
            <button
              type="submit"
              className="auth-button btn btn-primary"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          )}
        </form>

        <div className="auth-links">
          <Link to="/forgot-password" className="auth-link-pass">
            Forgot your password?
          </Link>
          <Link to="/sign-up" className="auth-link">
            Don't have an account? Sign up
          </Link>
        </div>
      </div>
    </div>
  );
};

export default SignIn;
