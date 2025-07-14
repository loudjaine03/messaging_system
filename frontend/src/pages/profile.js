import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft, FaUser, FaLock, FaSave, FaShieldAlt, FaMobileAlt } from "react-icons/fa";
import Switch from "react-switch";
import "./styles/profile.css"; 
import DSIConnectLogo from './styles/pics/DSIConnect.png';
const Profile = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("personal");
  const [userData, setUserData] = useState(null);
  const [passwordData, setPasswordData] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [updatedUserData, setUpdatedUserData] = useState({});
  const [profilePic, setProfilePic] = useState(null);
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [tempPhone, setTempPhone] = useState("");
  const [confirmPasswordForPhone, setConfirmPasswordForPhone] = useState("");
  const [loading, setLoading] = useState(true); 

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          navigate("/signin");
          return;
        }

        const response = await fetch("http://127.0.0.1:5000/profile", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) throw new Error("Failed to fetch profile");
        const data = await response.json();
        const birthdayString = data.birthday ? data.birthday : '';
        setUserData(data);
        setUpdatedUserData({
          username: data.username,
          firstName: data.firstName,
          lastName: data.lastName,
          birthday: birthdayString,
          job_title: data.position,
          bio: data.bio,
          backupPhone: data.backupPhone
        });
        setTwoFAEnabled(data.twoFAEnabled || false);
        setProfilePic(data.profilePicturePath || null);
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [navigate]);

  const handlePhoneInputChange = (e) => {
    setUpdatedUserData(prev => ({ ...prev, backupPhone: e.target.value }));
  };

  const handleUpdateBackupPhone = () => {
    setTempPhone(updatedUserData.backupPhone);
    setShowPasswordModal(true);
  };

  const confirmPhoneWithPassword = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await fetch("http://127.0.0.1:5000/confirm-phone-change", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone: tempPhone,
          password: confirmPasswordForPhone,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error);
      }

      setUserData((prev) => ({ ...prev, phone: tempPhone, backupPhone: tempPhone }));
      setUpdatedUserData((prev) => ({ ...prev, backupPhone: tempPhone }));
      setShowPasswordModal(false);
      setConfirmPasswordForPhone("");
      alert("Phone number updated successfully!");
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({ ...prev, [name]: value }));
  };

  const handleUserDataChange = (e) => {
    const { name, value } = e.target;
    if (name === 'birthday') {
      setUpdatedUserData(prev => ({ ...prev, [name]: value }));
    } else {
      setUpdatedUserData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleProfilePicChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("http://127.0.0.1:5000/upload-profile-pic", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to upload profile picture");
      }

      const result = await response.json();
      setProfilePic(result.profilePicturePath);
      setUserData((prev) => ({ ...prev, profilePicturePath: result.profilePicturePath }));
      alert("Profile picture updated successfully!");
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUserData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await fetch("http://127.0.0.1:5000/update-user", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: updatedUserData.username,
          firstName: updatedUserData.firstName,
          lastName: updatedUserData.lastName,
          birthday: updatedUserData.birthday,
          job_title: updatedUserData.job_title,
          bio: updatedUserData.bio
        }),
      });

      if (!response.ok) throw new Error("Failed to update profile");
      alert("Profile updated successfully");
      setUserData((prev) => ({ ...prev, ...updatedUserData }));
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert("Passwords don't match");
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await fetch("http://127.0.0.1:5000/update-password", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          oldPassword: passwordData.oldPassword,
          newPassword: passwordData.newPassword,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to change password");
      }
      alert("Password changed successfully");
      setPasswordData({ oldPassword: "", newPassword: "", confirmPassword: "" });
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handle2FAToggle = async (checked) => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await fetch("http://127.0.0.1:5000/update-backup", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          twoFAEnabled: checked,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update 2FA");
      }

      const result = await response.json();
      setTwoFAEnabled(result.twoFAEnabled);
      if (checked) alert("2FA enabled successfully!");
      else alert("2FA disabled successfully!");
    } catch (error) {
      alert(error.message);
      setTwoFAEnabled(!checked);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="profile-home">
      <div className="loading-spinner">Loading...</div>
    </div>
  );

  if (!userData) return (
    <div className="profile-home">
      <div className="error-message">Failed to load profile data.</div>
    </div>
  );

  return (
    <div className="profile-home">
      <aside className="sidebar">
        <div className="logo-container">
                <img src={DSIConnectLogo} alt="App Logo" className="app-logo" />
        
        <nav className="menu">
          <button
            className={`menu-item ${activeTab === "personal" ? "active" : ""}`}
            onClick={() => setActiveTab("personal")}
          >
            <FaUser /> Personal
          </button>
          <button
            className={`menu-item ${activeTab === "security" ? "active" : ""}`}
            onClick={() => setActiveTab("security")}
          >
            <FaLock /> Security
          </button>
        </nav>
        <button className="back-button" onClick={() => navigate("/home")}>
          <FaArrowLeft /> Back
        </button>
        </div>
      </aside>

      <main className="inbox">
        <div className="inbox-header">
          <h1>Profile</h1>
        </div>

        <div className="email-list">
          {activeTab === "personal" && (
            <div className="profile-section">
              <div className="personal-info-container">
                <div className="profile-picture-container">
                  {profilePic ? (
                    <img src={profilePic} alt="Profile" className="profile-pic-preview" />
                  ) : (
                    <div className="profile-pic-preview default-pic">
                      <FaUser size={60} />
                    </div>
                  )}
                  <div className="file-input-wrapper">
                    <label htmlFor="profilePicture" className="file-input-label">
                      Change Photo
                    </label>
                    <input
                      type="file"
                      id="profilePicture"
                      accept="image/*"
                      onChange={handleProfilePicChange}
                    />
                  </div>
                </div>

                <div className="personal-details-container">
                  {["username", "firstName", "lastName", "birthday"].map((field) => (
                    <div className="input-group" key={field}>
                      <label>{field.charAt(0).toUpperCase() + field.slice(1)}</label>
                      <input
                        type={field === "birthday" ? "date" : "text"}
                        name={field}
                        value={updatedUserData[field] || ""}
                        onChange={handleUserDataChange}
                        readOnly={field === "username"}
                      />
                    </div>
                  ))}
                  <div className="input-group">
                    <label>Position</label>
                    <input
                      name="job_title"
                      value={updatedUserData.job_title || ""}
                      onChange={handleUserDataChange}
                      placeholder="Position"
                    />
                  </div>
                  <div className="input-group">
                    <label>Bio</label>
                    <textarea
                      name="bio"
                      value={updatedUserData.bio || ""}
                      onChange={handleUserDataChange}
                      placeholder="Tell us about yourself..."
                    />
                  </div>
                  <button className="save-btn" onClick={handleUpdateUserData}>
                    <FaSave /> Save Changes
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "security" && (
            <div className="profile-section">
              <h2>Security Settings</h2>
              <div className="security-container">
                <div className="security-box">
                  <div className="security-header">
                    <FaLock className="security-icon" />
                    <h3>Password</h3>
                  </div>
                  <div className="input-group">
                    <label>Current Password</label>
                    <input
                      type="password"
                      name="oldPassword"
                      value={passwordData.oldPassword}
                      onChange={handlePasswordChange}
                    />
                  </div>
                  <div className="input-group">
                    <label>New Password</label>
                    <input type="password"
                      name="newPassword"
                      value={passwordData.newPassword}
                      onChange={handlePasswordChange}
                    />
                  </div>
                  <div className="input-group">
                    <label>Confirm Password</label>
                    <input
                      type="password"
                      name="confirmPassword"
                      value={passwordData.confirmPassword}
                      onChange={handlePasswordChange}
                    />
                  </div>
                  <button className="save-btn" onClick={handleChangePassword}>
                    <FaSave /> Update Password
                  </button>
                </div>

                <div className="security-box">
                  <div className="security-header">
                    <FaShieldAlt className="security-icon" />
                    <h3>Backup Info</h3>
                  </div>
                  <div className="input-group">
                    <label>Recovery Phone</label>
                    <input
                      type="tel"
                      name="backupPhone"
                      value={updatedUserData.backupPhone || ""}
                      onChange={handlePhoneInputChange}
                      placeholder="+1 (123) 456-7890"
                    />
                  </div>
                  <button className="save-btn" onClick={handleUpdateBackupPhone}>
                    <FaSave /> Update Backup Phone
                  </button>
                </div>

                <div className="security-box">
                  <div className="security-header">
                    <FaMobileAlt className="security-icon" />
                    <h3>2FA</h3>
                  </div>
                  <div className="twofa-toggle">
                    <label>Enable 2FA</label>
                    <Switch
                      checked={twoFAEnabled}
                      onChange={handle2FAToggle}
                      height={24}
                      width={48}
                      handleDiameter={20}
                    />
                  </div>

                  {!twoFAEnabled && (
                    <p>
                      Enable 2FA for enhanced security.
                    </p>
                  )}
                </div>

              </div>
            </div>
          )}
        </div>
        {showPasswordModal && (
          <div className="modal-overlay">
            <div className="security-modal">
              <h4>Confirm Phone Change</h4>
              <p>Enter your password to update phone number:</p>
              <input
                type="password"
                placeholder="Current Password"
                value={confirmPasswordForPhone}
                onChange={(e) => setConfirmPasswordForPhone(e.target.value)}
              />
              <div className="modal-actions">
                <button
                  className="cancel-btn"
                  onClick={() => setShowPasswordModal(false)}
                >
                  Cancel
                </button>
                <button
                  className="confirm-btn"
                  onClick={confirmPhoneWithPassword}
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Profile;
