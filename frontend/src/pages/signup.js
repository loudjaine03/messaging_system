import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './styles/App.css';
import pic from './styles/pics/pic2.png';

const SignUp = () => {
  const [step, setStep] = useState(1);
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    firstname: '',
    lastname: '',
    gender: '',
    birthday: '',
    password: '',
    confirmpassword: '',
  });
  const [errors, setErrors] = useState({});
  const [maskedPhone, setMaskedPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    let value = e.target.value;
    if (e.target.name === 'username') {
      value = value.replace(/@cerist\.dz/gi, '');
    }
    setFormData(prev => ({ ...prev, [e.target.name]: value }));
    setErrors(prev => ({ ...prev, [e.target.name]: '' }));
  };

  const validateStep = async () => {
    const newErrors = {};
    if (step === 1) {
      if (!formData.username) newErrors.username = 'Email is required';
      if (!formData.firstname) newErrors.firstname = 'First name is required';
      if (!formData.lastname) newErrors.lastname = 'Last name is required';

      if (formData.username) {
        const usernameRegex = /^[a-zA-Z0-9._-]+$/;
        if (!usernameRegex.test(formData.username)) {
          newErrors.username = 'Enter a valid Email';
        } else {
          try {
            const res = await fetch('http://localhost:5000/check-availability', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ username: formData.username })
            });
            if (!res.ok) {
              const err = await res.json();
              throw new Error(err.error || 'Availability check failed');
            }
            const data = await res.json();
            if (data.exists) newErrors.username = 'Account already exists';
          } catch (err) {
            newErrors.username = err.message;
          }
        }
      }
    }

    if (step === 2) {
      if (!formData.gender) newErrors.gender = 'Gender is required';
    }

    if (step === 3) {
      if (!formData.password) {
        newErrors.password = 'Password is required';
      } else {
        const strongRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{12,}$/;
        if (!strongRegex.test(formData.password)) {
          newErrors.password = 'Password must be 12+ chars with uppercase, lowercase, and numbers';
        }
      }
      if (!formData.confirmpassword) {
        newErrors.confirmpassword = 'Confirm password is required';
      } else if (formData.password !== formData.confirmpassword) {
        newErrors.confirmpassword = "Passwords don't match";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = async () => {
    if (await validateStep()) {
      setStep(s => s + 1);
    }
  };

  const handlePrev = () => setStep(s => Math.max(1, s - 1));

   const handleSubmit = async (e) => {
    e.preventDefault();
    if (step !== 3) return;
    if (!(await validateStep())) return;

    try {
      const res = await fetch('http://localhost:5000/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Signup failed');
      }
      const data = await res.json();
      setMaskedPhone(data.masked_phone);
      setStep(4);
    } catch (err) {
      setErrors({ general: err.message });
    }
  };
const handleVerifyOTP = async () => {
    if (!formData.code) {
        setErrors({ code: 'Verification code is required' });
        return;
    }
    
    try {
        console.log("Sending verification request...");
        const res = await fetch('http://localhost:5000/verify-signup-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                username: formData.username, 
                code: formData.code 
            }),
        });
        
        const responseData = await res.json(); 
        console.log("Response:", responseData);
        
        if (!res.ok) {
            throw new Error(responseData.error || 'Verification failed');
        }

        alert('Account verified successfully! You can now log in.');
        navigate('/sign-in');
    } catch (err) {
        console.error("Verification error:", err);
        setErrors({ code: err.message });
    }
};

const handleResendOTP = async () => {
  try {
    const res = await fetch('http://localhost:5000/resend-signup-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: formData.username })
    });

    const data = await res.json();

    if (!res.ok) throw new Error(data.error || 'Failed to resend OTP');

    alert('A new verification code has been sent!');
    setMaskedPhone(data.masked_phone); 
  } catch (err) {
    setErrors({ general: err.message });
  }
};



// Password generator function
const generatePassword = () => {
  const length = 12;
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lowercase = "abcdefghijklmnopqrstuvwxyz";
  const digits = "0123456789";
  const special = "!@#$%^&*()_+-=[]{}|;:,.<>?";
  const allChars = uppercase + lowercase + digits + special;

  let password = "";
  // Ensure at least one uppercase, one lowercase, one digit, one special character
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += digits[Math.floor(Math.random() * digits.length)];
  password += special[Math.floor(Math.random() * special.length)];

  for (let i = 4; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  // Shuffle password characters
  password = password.split('').sort(() => 0.5 - Math.random()).join('');

  setFormData(prev => ({ ...prev, password, confirmpassword: password }));
  setErrors(prev => ({ ...prev, password: '', confirmpassword: '' }));
  setShowPassword(true); 
};


  return (
    <div className="auth-container">
      <div className="auth-left">
        <img src={pic} alt="App Logo" className="auth-image" />
      </div>
      <div className="auth-card">
        <h2>Sign Up</h2>
        <div className="step-indicator">
          {[1, 2, 3].map(n => (
            <div key={n} className={step === n ? 'active' : ''}></div>
          ))}
        </div>

        {errors.general && <div className="error general">{errors.general}</div>}

        {step <= 3 ? (
          <form onSubmit={handleSubmit}>
            {step === 1 && (
              <>
                <div className="cerist-input">
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    placeholder="username@cerist.dz"
                    className={`input-field ${errors.username ? 'error-border' : ''}`}
                    required
                  />
                </div>
                <div className="error">
                  {errors.username && <span className="error">{errors.username}</span>}
                </div>
                <input
                  type="text"
                  name="firstname"
                  value={formData.firstname}
                  onChange={handleChange}
                  placeholder="First Name"
                  className={`input-field ${errors.firstname ? 'error-border' : ''}`}
                  required
                />
                <div className="error">
                  {errors.firstname && <span className="error">{errors.firstname}</span>}
                </div>
                <input
                  type="text"
                  name="lastname"
                  value={formData.lastname}
                  onChange={handleChange}
                  placeholder="Last Name"
                  className={`input-field ${errors.lastname ? 'error-border' : ''}`}
                  required
                />
                {errors.lastname && <span className="error">{errors.lastname}</span>}

                <button type="button" onClick={handleNext} className="auth-button">
                  Next
                </button>
                <Link to="/sign-in" className="auth-link">
                  Do you already have an account? Sign In!
                </Link>
              </>
            )}

            {step === 2 && (
              <>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  className={`input-field ${errors.gender ? 'error-border' : ''}`}
                  required
                >
                  <option value="">Select Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
                {errors.gender && <span className="error">{errors.gender}</span>}

                <input
                  type="date"
                  name="birthday"
                  value={formData.birthday}
                  onChange={handleChange}
                  placeholder="Birthday (optional)"
                  className="input-field"
                />

                <div className="button-group">
                  <button type="button" onClick={handlePrev} className="auth-button">
                    Back
                  </button>
                  <button type="button" onClick={handleNext} className="auth-button">
                    Next
                  </button>
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <div className="password-input-wrapper" style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Password"
                    className={`input-field ${errors.password ? 'error-border' : ''}`}
                    required
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="toggle-password-visibility"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#007bff',
                      fontWeight: 'bold',
                    }}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
                <div className="error">
                  {errors.password && <span className="error">{errors.password}</span>}
                </div>

                <div className="password-input-wrapper" style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? "text" : "password"}
                    name="confirmpassword"
                    value={formData.confirmpassword}
                    onChange={handleChange}
                    placeholder="Confirm Password"
                    className={`input-field ${errors.confirmpassword ? 'error-border' : ''}`}
                    required
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="toggle-password-visibility"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#007bff',
                      fontWeight: 'bold',
                    }}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
                {errors.confirmpassword && <span className="error">{errors.confirmpassword}</span>}

                <button
                  type="button"
                  className="auth-button generate-password-btn"
                  onClick={generatePassword}
                  style={{ margin: '10px 0' }}
                >
                  Generate Password
                </button>

                <div className="button-group">
                  <button type="button" onClick={handlePrev} className="auth-button">
                    Back
                  </button>
                  <button type="submit" className="auth-button">
                    Sign Up
                  </button>
                </div>
              </>
            )}
          </form>
        ) : (
          <div className="verification-message">
            <p>
              We've sent a verification code to your registered phone number ending with {maskedPhone}
            </p>
            <p>Your account will be activated after verification.</p>
            <br />
            <div className="cerist-input">
              <input
                type="text"
                name="code"
                placeholder="Verification Code"
                className={`input-field ${errors.code ? 'error-border' : ''}`}
                value={formData.code || ''}
                onChange={handleChange}
                required
              />
            </div>
            <div className="error">
              {errors.code && <span className="error">{errors.code}</span>}
            </div>
            <button className="auth-button" onClick={handleResendOTP} style={{ marginRight: '12px' }}>
              Try Again
            </button>
            <button type="button" onClick={handleVerifyOTP}  className="auth-button">
              Confirm
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SignUp;
