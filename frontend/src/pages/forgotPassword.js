import React, { useState } from 'react';
import { FaPhone } from 'react-icons/fa';
import { Link, useNavigate } from 'react-router-dom';
import './styles/App.css';
import pic from './styles/pics/pic2.png';

const ForgotPassword = () => {
  const [stage, setStage] = useState('select'); 
  const [username, setUsername] = useState('');
  const [maskedPhone, setMaskedPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const navigate = useNavigate();

  // Step 1: Handle username submission and trigger OTP sending
  const handleUsernameSubmit = async () => {
    if (!username.trim()) return alert('Please enter your username.');

    try {
      const response = await fetch("http://127.0.0.1:5000/recover-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Recovery failed.');
      }

      setMaskedPhone(data.maskedPhone);
      setStage('confirmation');
    } catch (err) {
      alert(err.message || 'Something went wrong.');
    }
  };

  // Step 2: Handle OTP and new password submission
  const handleResetSubmit = async () => {
    if (!otp.trim() || !newPassword.trim()) {
        return alert('Please enter the OTP and your new password.');
    }
    if (newPassword !== confirmPassword) {
        return alert('Passwords do not match.');
    }

    try {
        const response = await fetch("http://127.0.0.1:5000/reset-with-otp", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, otp, new_password: newPassword }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Password reset failed.');
        }

        alert('Password has been reset successfully!');
        navigate('/sign-in');

    } catch (err) {
        alert(err.message || 'Something went wrong.');
    }
  };


  return (
    <div className="auth-container">
      <div className="auth-left">
        <img src={pic} alt="App Logo" className="auth-image" />
      </div>
      <div className="auth-card">
        <h2>Forgot Password</h2>

        {stage === 'select' && (
          <>
            <p>Select a recovery method:</p>
            <div className="recovery-methods" style={{ marginTop: '20px' }}>
              <button
                className="auth-button recovery-option"
                onClick={() => setStage('input')}>
                <FaPhone /> Recover via Phone
              </button>
              <div className="auth-links">
                <Link to="/sign-in" className="auth-link">
                  Do you remember your password? Sign In!
                </Link>
              </div>
            </div>
          </>
        )}

        {stage === 'input' && (
          <form onSubmit={(e) => { e.preventDefault(); handleUsernameSubmit(); }}>
            <input
              type="text"
              className="input-field form-control"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
            <button
              type="submit"
              className="auth-button btn btn-primary"
            >
              Continue
            </button>
            <div className="auth-links">
              <Link to="/sign-in" className="auth-link">
                Do you remember your password? Sign In!
              </Link>
            </div>
          </form>
        )}

        {stage === 'confirmation' && (
          <form onSubmit={(e) => { e.preventDefault(); handleResetSubmit(); }}>
            <p>We sent a verification code to your phone number: <strong>{maskedPhone}</strong></p>
            <input
                type="text"
                className="input-field form-control"
                placeholder="Enter OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
            />
            <input
                type="password"
                className="input-field form-control"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
            />
            <input
                type="password"
                className="input-field form-control"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
            />
            <div className="confirmation-buttons">
              <button className="auth-button" type="button" onClick={() => setStage('input')} style={{ marginRight: '12px' }}>Try Again</button>
              <button type="submit" className="auth-button">Confirm</button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
};

export default ForgotPassword;