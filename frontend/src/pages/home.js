import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaInbox,
  FaPaperPlane,
  FaFileAlt,
  FaTrash,
  FaSignOutAlt,
  FaUserCircle,
  FaTimes,
  FaPenFancy,
  FaDownload,
  FaUsers,
  FaUndo,
  FaBan,
  FaStar,
  FaRegStar,
  FaReply,
  FaShare,
  FaCamera,
} from "react-icons/fa";
import axios from "axios";
import "./styles/home.css";
import DSIConnectLogo from './styles/pics/DSIConnect.png';

const Home = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState("Inbox");
  const [showCompose, setShowCompose] = useState(false);
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [attachment, setAttachment] = useState(null);
  const [loading, setLoading] = useState(false);
  const [emails, setEmails] = useState({
    Inbox: [],
    Sent: [],
    Favourite: [],
    Trash: [],
  });
  const [userEmail, setUserEmail] = useState("");
  const [allEmails, setAllEmails] = useState([]); 
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [members, setMembers] = useState([]);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);

  const [position, setPosition] = useState({ x: 300, y: 100 });
  const [dragging, setDragging] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  const [sendError, setSendError] = useState('');

  const [profileData, setProfileData] = useState({
      firstName: '',
      lastName: '',
      job_title: '',
      bio: '',
      birthday: '',
  });
  const [profilePicture, setProfilePicture] = useState(null);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  const fileInputRef = useRef(null);
  const API_BASE_URL = "http://127.0.0.1:5000";

  const handleMouseDown = useCallback((e) => {
    setDragging(true);
    setOffset({ x: e.clientX - position.x, y: e.clientY - position.y });
  }, [position.x, position.y]);

  const handleMouseMove = useCallback((e) => {
    if (dragging) {
      setPosition({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    }
  }, [dragging, offset.x, offset.y]);

  const handleMouseUp = useCallback(() => {
    setDragging(false);
  }, []);

  useEffect(() => {
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const handleReply = () => {
    if (!selectedEmail) return;

    setTo(selectedEmail.sender);
    setSubject((prev) =>
      selectedEmail.subject.startsWith("Re:") ? selectedEmail.subject : `Re: ${selectedEmail.subject}`
    );
    setMessage(`\n\n--- Original Message ---\n${selectedEmail.message}`);
    setShowCompose(true);
  };

  const handleForward = (email) => {
    setTo("");
    setSubject(email.subject.startsWith("Fwd:") ? email.subject : `Fwd: ${email.subject}`);
    const forwardedMessage = `\n\n---------- Forwarded message ----------\nFrom: ${email.sender}\nDate: ${email.time}\nSubject: ${email.subject}\n\n${email.message}`;
    setMessage(forwardedMessage);
    setShowCompose(true);
  };

 
  const fetchEmails = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get("http://127.0.0.1:5000/get-emails", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const { user, emails: fetchedEmails } = response.data;
      setUserEmail(user);
      setAllEmails(fetchedEmails); 

    } catch (err) {
      console.error("Failed to fetch emails", err);
    }
  }, []); 

  useEffect(() => {
    fetchEmails();
  }, [fetchEmails]);

  useEffect(() => {
    const searchFilter = (email) =>
      email.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      email.message.toLowerCase().includes(searchTerm.toLowerCase());

    const inbox = allEmails
      .filter(email => email.folder === 'inbox')
      .filter(searchFilter);

    const sent = allEmails
      .filter(email => email.folder === 'sent')
      .filter(searchFilter);

    const trash = allEmails
      .filter(email => email.folder === 'trash')
      .filter(searchFilter);

    const favourite = allEmails
      .filter(email => email.isFavourite) 
      .filter(searchFilter);

    setEmails({
      Inbox: inbox,
      Sent: sent,
      Favourite: favourite,
      Trash: trash,
    });
  }, [searchTerm, allEmails]);

  const fetchMembers = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get("http://127.0.0.1:5000/get-all-users", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setMembers(response.data.users);
    } catch (error) {
      console.error("Error fetching members:", error);
      console.error("Failed to fetch members. Please try again.");
    }
  }, []);

  const handleSendEmail = async () => {
   setLoading(true);
    setSendError('');
    const formData = new FormData();
    formData.append("to", to);
    formData.append("subject", subject);
    formData.append("message", message);
    if (attachment) formData.append("attachment", attachment);

    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        "http://127.0.0.1:5000/send-email",
        formData,
        {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );
      
      const invalidRecipients = response.data.invalid_recipients;
      if (invalidRecipients && invalidRecipients.length > 0) {
        setSendError(`User(s) not found: ${invalidRecipients.join(', ')}. The email was sent to all other valid recipients.`);
      } else {
        setShowCompose(false);
        setTo(''); setSubject(''); setMessage(''); setAttachment(null);
      }

      fetchEmails();

    } catch (err) {
        const errorMsg = err.response?.data?.msg || "Failed to send email. Please try again.";
        setSendError(errorMsg);
        console.error("Error sending email:", err.response?.data || err.message);
    } finally {
      setLoading(false);
    }
  };

 
  const fetchProfile = useCallback(async () => {
      try {
          const token = localStorage.getItem("token");
          const response = await axios.get(`${API_BASE_URL}/profile`, {
              headers: { Authorization: `Bearer ${token}` }
          });
          const { data } = response;
          setProfileData({
              firstName: data.firstName || '',
              lastName: data.lastName || '',
              job_title: data.position || '',
              bio: data.bio || '',
              birthday: data.birthday || '',
          });
          if (data.profilePicturePath) {

              setProfilePicture(`${API_BASE_URL}${data.profilePicturePath}`);
          }
      } catch (err) {
          console.error("Failed to fetch profile:", err);
          setProfileError("Could not load profile data.");
      }
  }, []);

  const handleProfileInputChange = (e) => {
      const { name, value } = e.target;
      setProfileData(prev => ({ ...prev, [name]: value }));
  };

  const handleProfilePicChange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      setProfileError('');
      setProfileSuccess('');
      const formData = new FormData();
      formData.append('file', file);

      try {
          const token = localStorage.getItem("token");
          const response = await axios.post(`${API_BASE_URL}/upload-profile-pic`, formData, {
              headers: {
                  'Content-Type': 'multipart/form-data',
                  'Authorization': `Bearer ${token}`
              }
          });
          if (response.data.profilePicturePath) {
               setProfilePicture(`${API_BASE_URL}${response.data.profilePicturePath}`);
          }
          setProfileSuccess(response.data.message || "Profile picture updated!");
      } catch (err) {
          console.error("Profile picture upload failed:", err);
          setProfileError(err.response?.data?.error || "Failed to upload picture.");
      }
  };

  const handleSaveChanges = async () => {
      setProfileError('');
      setProfileSuccess('');
      try {
          const token = localStorage.getItem("token");
          const response = await axios.put(`${API_BASE_URL}/update-user`, profileData, {
              headers: { Authorization: `Bearer ${token}` }
          });
          setProfileSuccess(response.data.message);
      } catch (err) {
          console.error("Failed to update profile:", err);
          setProfileError(err.response?.data?.error || "Failed to update profile.");
      }
  };

  const handleOpenEmail = async (email) => {
    console.log("--- Opening Email Debug Info ---");
    console.log("Selected Email:", email);
    console.log("Email URLs from backend (selectedEmail.urls):", email.urls);
    console.log("Attachment danger levels:", email.attachments?.map(a => `${a.name}: ${a.danger_level}`));
    console.log("-------------------------------");

    setSelectedEmail(email);
    setShowModal(true);

    if (email.attachments && email.attachments.length > 0) {
      const updatedAttachments = await Promise.all(
        email.attachments.map(async (att) => {
          try {
            const token = localStorage.getItem("token");
            const response = await axios.get(
              `http://127.0.0.1:5000/download-attachment/${att.id}`,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
                responseType: 'blob',
              }
            );
            const blob = new Blob([response.data]);
            const imageUrl = URL.createObjectURL(blob);
            return { ...att, previewUrl: imageUrl };
          } catch (error) {
            console.error("Error fetching attachment for preview:", att.name, error);
            return att;
          }
        })
      );
      setSelectedEmail({ ...email, attachments: updatedAttachments });
    }
  };

 
  const handleCloseModal = () => {
    setShowModal(false);
    if (selectedEmail && selectedEmail.attachments) {
      selectedEmail.attachments.forEach(att => {
        if (att.previewUrl) {
          URL.revokeObjectURL(att.previewUrl);
        }
      });
    }
    setSelectedEmail(null);
  };


  const handleOpenMemberModal = (member) => {
    setSelectedMember(member);
    setShowMembersModal(true);
  };


  const handleCloseMemberModal = () => {
    setShowMembersModal(false);
    setSelectedMember(null);
  };


  const handleMoveToTrash = async () => {
    if (!selectedEmail?.id) return;

    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        "http://127.0.0.1:5000/move-to-trash",
        { emailId: selectedEmail.id },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      console.log(response.data.msg);
      setShowModal(false);
      setSelectedEmail(null);
      fetchEmails(); 
    } catch (error) {
      console.error("Error moving email to trash:", error.response || error);
      console.error("Error moving email to trash.");
    }
  };

  const handleRestoreFromTrash = async () => {
    if (!selectedEmail?.id) return;

    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        "http://127.0.0.1:5000/restore-from-trash",
        { emailId: selectedEmail.id, originalFolder: selectedEmail.folder },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      console.log(response.data.msg);
      setShowModal(false);
      setSelectedEmail(null);
      fetchEmails();
    } catch (error) {
      console.error("Error restoring email:", error.response || error);
      console.error("Error restoring email.");
    }
  };


  const handleDeletePermanently = async () => {
    if (!selectedEmail?.id) return;

    try {
      const token = localStorage.getItem("token");
      const response = await axios.delete(
        "http://127.0.0.1:5000/delete-permanently",
        {
          headers: { Authorization: `Bearer ${token}` },
          data: { emailId: selectedEmail.id }
        }
      );

      console.log(response.data.msg);
      setShowModal(false);
      setSelectedEmail(null);
      fetchEmails(); 
    } catch (error) {
      console.error("Error deleting email permanently:", error.response || error);
      console.error("Error deleting email permanently.");
    }
  };

  // Handles downloading an attachment
  const handleDownloadAttachment = async (attachmentId, filename) => {
    const token = localStorage.getItem("token");

    try {
      const response = await axios.get(`http://127.0.0.1:5000/download-attachment/${attachmentId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');

      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (error) {
      console.error("Error downloading attachment:", error);
      console.error("Failed to download the attachment.");
    }
  };


  const normalizeUrl = (url) => {
    if (!url) return '';
    try {
     
      const fullUrl = url.startsWith('http://') || url.startsWith('https://') ? url : `http://${url}`;
      const parsedUrl = new URL(fullUrl);

      let host = parsedUrl.hostname;
      
      if (host.startsWith('www.')) {
        host = host.substring(4);
      }

      let path = parsedUrl.pathname;
      
      if (path.endsWith('/')) {
        path = path.slice(0, -1);
      }

      
      const normalized = `${host}${path}`.toLowerCase();
      
      return normalized;
    } catch (e) {
      
      console.warn(`Could not parse URL "${url}" with URL constructor, falling back to regex:`, e);
      let normalized = url.toLowerCase();
      normalized = normalized.replace(/^(https?:\/\/)?(www\.)?/, '');
      normalized = normalized.replace(/\/+$/, '');
      return normalized;
    }
  };

  
  const renderMessageWithLinks = useCallback((message, urlsWithDanger) => {
    
    const urlRegex = /(https?:\/\/[\w\d.\-/?=#&%+~:_@]+|[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}[\w\d.\-/?=#&%+~:_@]*)/gi;

    console.log("--- renderMessageWithLinks Debug Info ---");
    console.log("Raw URLs from backend (urlsWithDanger):", urlsWithDanger);

    
    const normalizedUrlsWithDanger = (urlsWithDanger || []).map(u => {
      const normalized = normalizeUrl(u.url);
      console.log(`Backend URL: "${u.url}" -> Normalized Backend: "${normalized}" (Danger: ${u.danger_level})`);
      return { ...u, normalizedUrl: normalized };
    });

    
    const htmlMessage = message.replace(urlRegex, (matchedUrl) => {
      const normalizedMatchedUrl = normalizeUrl(matchedUrl);
      console.log(`Message URL Matched: "${matchedUrl}" -> Normalized Message: "${normalizedMatchedUrl}"`);

     
      const urlInfo = normalizedUrlsWithDanger.find(u =>
        u.normalizedUrl === normalizedMatchedUrl
      );

      const dangerLevel = urlInfo?.danger_level?.toLowerCase() || 'safe';
      console.log(`  -> Applied Danger Level for "${matchedUrl}": ${dangerLevel}`);

      const colorClass = `url-${dangerLevel}`;
 
      const hrefUrl = matchedUrl.startsWith('http') ? matchedUrl : `http://${matchedUrl}`;

      return `<a href="${hrefUrl}" class="${colorClass}" target="_blank" rel="noopener noreferrer">${matchedUrl}</a>`;
    });
    console.log("--- End renderMessageWithLinks Debug Info ---");
    return htmlMessage;
  }, [normalizeUrl]);

  const renderAttachments = (attachments) => {
    return (
      <div className="attachments-container">
        <h4>Attachments ({attachments.length})</h4>
        <div className="attachments-grid">
          {attachments.map((att) => {

            const dangerLevel = (att.danger_level || 'safe').toLowerCase();
            const dangerClass = {
              safe: 'attachment-safe',
              suspicious: 'attachment-suspicious',
              malicious: 'attachment-malicious',
            }[dangerLevel] || 'attachment-safe'; 

            return (
              <div key={att.id} className={`attachment-item ${dangerClass}`}>
                {att.previewUrl && att.name.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                  <div className="image-attachment" title={att.name}>
                    <img
                      src={att.previewUrl}
                      alt={att.name}
                      onClick={() => window.open(att.previewUrl, '_blank')} 
                    />
                    <div className="attachment-actions">
                      <span title={att.name}>
                        {att.name.length > 15 ? att.name.slice(0, 12) + '...' : att.name}
                      </span>
                      <FaDownload
                        onClick={(e) => {
                          e.stopPropagation(); 
                          handleDownloadAttachment(att.id, att.name);
                        }}
                        className="download-icon"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="file-attachment" title={att.name}>
                    <FaFileAlt className="file-icon" />
                    <div className="file-info">
                      <span>
                        {att.name.length > 15 ? att.name.slice(0, 12) + '...' : att.name}
                      </span>
                      <button
                        className="download-btn"
                        onClick={(e) => {
                          e.stopPropagation(); 
                          handleDownloadAttachment(att.id, att.name);
                        }}
                      >
                        <FaDownload /> Download
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };


  const handleToggleFavourite = async (emailId) => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        "http://127.0.0.1:5000/toggle-favourite",
        { emailId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      console.log(response.data.msg);

      fetchEmails();
    } catch (error) {
      console.error("Error toggling favourite:", error);

      fetchEmails();
    }
  };

  useEffect(() => {
    if (activeSection === "Members") {
      fetchMembers();
    }
  
  if (activeSection === "Profile") {
      fetchProfile();
    }
  }, [activeSection, fetchMembers, fetchProfile]);
  return (
    <div className="email-home">
      <aside className="sidebar">
        <div className="logo-container">
          <img src={DSIConnectLogo} alt="App Logo" className="app-logo" />

          <div className="menu">
            <button className="compose" onClick={() => setShowCompose(true)}>
              <FaPenFancy /> Compose
            </button>
            <button onClick={() => setActiveSection("Inbox")}>
              <FaInbox /> Inbox
            </button>
            <button onClick={() => setActiveSection("Sent")}>
              <FaPaperPlane /> Sent
            </button>
            <button onClick={() => setActiveSection("Favourite")}>
              <FaStar /> Favourite
            </button>
            <button onClick={() => setActiveSection("Trash")}>
              <FaTrash /> Trash
            </button>
          </div>
          <button className="logout" onClick={() => navigate("/sign-in")}>
            <FaSignOutAlt /> Logout
          </button>
        </div>
      </aside>
      <div className="inbox">
        <div className="inbox-header">
          <h1>{activeSection}</h1>
          <input
            type="text"
            placeholder="Search emails..."
            className="search-bar"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div className="top-buttons">
            <button
              className="profile-button"
              onClick={() => {
                setActiveSection("Members");
              }}
            >
              <FaUsers className="profile-icon" size={40} />
              <div className="button-label">Members</div>
            </button>
            <button className="profile-button" onClick={() => navigate("/profile")}>
              <FaUserCircle className="profile-icon" size={40} />
              <div className="button-label">Profile</div>
            </button>
          </div>
        </div>
              {activeSection === "Profile" && (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', flexDirection: 'column', marginBottom: '2rem' }}>
             <div style={{ position: 'relative', marginBottom: '1rem' }}>
                {profilePicture ? (
                    <img 
                        src={profilePicture} 
                        alt="Profile" 
                        style={{ width: '150px', height: '150px', borderRadius: '50%', objectFit: 'cover' }} 
                    />
                ) : (
                    <FaUserCircle size={150} color="#ccc" />
                )}
                <button 
                    onClick={() => fileInputRef.current.click()}
                    style={{ position: 'absolute', bottom: '5px', right: '5px', background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                    <FaCamera />
                </button>
                <input 
                    type="file" 
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    onChange={handleProfilePicChange}
                    accept="image/png, image/jpeg, image/gif"
                />
            </div>
        </div>

        {profileError && <p style={{ color: 'red', textAlign: 'center' }}>{profileError}</p>}
        {profileSuccess && <p style={{ color: 'green', textAlign: 'center' }}>{profileSuccess}</p>}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <input name="firstName" value={profileData.firstName} onChange={handleProfileInputChange} placeholder="First Name" style={{ padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }} />
            <input name="lastName" value={profileData.lastName} onChange={handleProfileInputChange} placeholder="Last Name" style={{ padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }} />
            <input name="job_title" value={profileData.job_title} onChange={handleProfileInputChange} placeholder="Position/Job Title" style={{ padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }} />
            <input name="birthday" type="date" value={profileData.birthday} onChange={handleProfileInputChange} placeholder="Birthday" style={{ padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }} />
        </div>
        <textarea name="bio" value={profileData.bio} onChange={handleProfileInputChange} placeholder="About me..." rows="4" style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ccc', boxSizing: 'border-box', marginBottom: '1rem' }} />

        <button onClick={handleSaveChanges} style={{ width: '100%', padding: '12px', background: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '16px' }}>
            Save Changes
        </button>
    </div>
)}
        {/* Inbox Section */}
        {activeSection === "Inbox" && (
          <div className="email-list">
            {emails[activeSection]?.length > 0 ? (
              emails[activeSection].map((email) => (
                <div
                  key={email.id}
                  className="email-item"
                  onClick={() => handleOpenEmail(email)}
                >
                  <p className="email-subject">{email.subject}</p>
                  <p className="email-preview">{email.message.slice(0, 50)}</p>
                  <span className="email-time">{email.time}</span>
                  {email.attachments && email.attachments.length > 0 && (
                    <div className="attachment-indicator">
                      <FaFileAlt /> {email.attachments.length}
                    </div>
                  )}
                  <button
                    className="favourite-button"
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent opening email when clicking star
                      handleToggleFavourite(email.id);
                    }}
                  >
                    
                    {email.isFavourite ? (
                      <FaStar color="gold" />
                    ) : (
                      <FaRegStar />
                    )}

                  </button>
                </div>
              ))
            ) : (
              <p className="no-emails">No emails in {activeSection}.</p>
            )}
          </div>
        )}

        {/* Sent Section */}
        {activeSection === "Sent" && (
          <div className="email-list">
            {emails[activeSection]?.length > 0 ? (
              emails[activeSection].map((email) => (
                <div
                  key={email.id}
                  className="email-item"
                  onClick={() => handleOpenEmail(email)}
                >
                  <p className="email-subject">{email.subject}</p>
                  <p className="email-preview">{email.message.slice(0, 50)}</p>
                  <span className="email-time">{email.time}</span>
                  {email.attachments && email.attachments.length > 0 && (
                    <div className="attachment-indicator">
                      <FaFileAlt /> {email.attachments.length}
                    </div>
                  )}
                  <button
                    className="favourite-button"
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent opening email when clicking star
                      handleToggleFavourite(email.id);
                    }}
                  >

                    {email.isFavourite ? (
                      <FaStar color="gold" />
                    ) : (
                      <FaRegStar />
                    )}

                  </button>
                </div>
              ))
            ) : (
              <p className="no-emails">No emails in {activeSection}.</p>
            )}
          </div>
        )}

        {/* Favourite Section */}
        {activeSection === "Favourite" && (
          <div className="email-list">
            {emails[activeSection]?.length > 0 ? (
              emails[activeSection].map((email) => (
                <div key={email.id} className="email-item" onClick={() => handleOpenEmail(email)}>
                  <p className="email-subject">{email.subject}</p>
                  <p className="email-preview">{email.message.slice(0, 50)}</p>
                  <span className="email-time">{email.time}</span>
                  {email.attachments && email.attachments.length > 0 && (
                    <div className="attachment-indicator">
                      <FaFileAlt /> {email.attachments.length}
                    </div>
                  )}
                  <button
                    className="favourite-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleFavourite(email.id);
                    }}
                  >

                    {email.isFavourite ? (
                      <FaStar color="gold" />
                    ) : (
                      <FaRegStar />
                    )}

                  </button>
                </div>
              ))
            ) : (
              <p className="no-emails">No favourites</p>
            )}
          </div>
        )}

        {/* Trash Section (favourite button intentionally omitted as per your original code) */}
        {activeSection === "Trash" && (
          <div className="email-list">
            {emails[activeSection]?.length > 0 ? (
              emails[activeSection].map((email) => (
                <div
                  key={email.id}
                  className="email-item"
                  onClick={() => handleOpenEmail(email)}
                >
                  <p className="email-subject">{email.subject}</p>
                  <p className="email-preview">{email.message.slice(0, 50)}</p>
                  <span className="email-time">{email.time}</span>
                  {email.attachments && email.attachments.length > 0 && (
                    <div className="attachment-indicator">
                      <FaFileAlt /> {email.attachments.length}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p className="no-emails">No emails in {activeSection}.</p>
            )}
          </div>
        )}

        {/* Members Section */}
        {activeSection === "Members" && (
          <div className="member-list">
            {members.length > 0 ? (
              members.map((member) => (
                <div
                  key={member.id_user}
                  className="member-item"
                  onClick={() => handleOpenMemberModal(member)}
                >
                  {member.profile_picture ? (
                    <img
                      src={member.profile_picture}
                      alt={member.username}
                      className="member-profile-pic"
                    />
                  ) : (
                    <FaUserCircle size={100} className="member-profile-pic" />
                  )}
                  <div className="member-info">
                    <p className="member-name">
                      {member.firstname} {member.lastname}
                    </p>
                    <p className="member-username">{member.username}</p>
                    <p className="member-job-title">{member.job_title}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="no-members">No members found.</p>
            )}
          </div>
        )}
      </div>

      {/* Compose Window */}
      {showCompose && (
        <div
          className="compose-window"
          style={{ top: `${position.y}px`, left: `${position.x}px` }}
          onMouseDown={handleMouseDown}
        >
          <div className="compose-header">
            <h2>Compose Email</h2>
            <button className="close-btn" onClick={() => setShowCompose(false)}>
              <FaTimes />
            </button>
          </div>

          <input
            type="text"
            placeholder="To"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
          <input
            type="text"
            placeholder="Subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
          <textarea
            placeholder="Write your message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          ></textarea>
          <input type="file" multiple onChange={(e) => setAttachment(e.target.files[0])} />
          {attachment && <p>Attachment: {attachment.name}</p>}
          <button className="send-btn" onClick={handleSendEmail} disabled={loading}>
            {loading ? "Sending..." : "Send"}
          </button>
          {sendError && (
            <p style={{ color: 'red', marginTop: '8px' }}>{sendError}</p>
          )}
        </div>
      )}

      {/* Email Modal (Read Email View) */}
      {showModal && selectedEmail && (
        <div className="email-overlay">
          <div className="email-content">
            <div className="email-title">
              <h3>{selectedEmail.subject}</h3>
              <button className="close-btn modal-close" onClick={handleCloseModal}>
                <FaTimes />
              </button>
            </div>

            <div className="email-body">
              <p><strong>From:</strong> {selectedEmail.sender}</p>
              <p><strong>To:</strong> {selectedEmail.receiver}</p>

              <div
                className="message-container"
                dangerouslySetInnerHTML={{
                  __html: renderMessageWithLinks(selectedEmail.message, selectedEmail.urls || []),
                }}
              />

              {selectedEmail.attachments && selectedEmail.attachments.length > 0 && renderAttachments(selectedEmail.attachments)}
            </div>

            <div className="modal-actions">
              <button className="action-btn reply" onClick={handleReply}>
                <FaReply /> Reply
              </button>
              <button className="action-btn forward" onClick={() => handleForward(selectedEmail)}>
                <FaShare /> Forward
              </button>
              {activeSection === 'Trash' ? (
                <>
                  <button className="action-btn restore" onClick={handleRestoreFromTrash}>
                    <FaUndo /> Restore
                  </button>
                  <button className="action-btn delete-perm" onClick={handleDeletePermanently}>
                    <FaBan /> Delete Forever
                  </button>
                </>
              ) : (
                <button className="action-btn trash" onClick={handleMoveToTrash}>
                  <FaTrash /> Move to Trash
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Member Details Modal */}
      {showMembersModal && selectedMember && (
        <div className="member-overlay">
          <div className="member-modal-content">
            <div className="member-modal-header">
              <h2>Member Details</h2>
              <button className="close-btn" onClick={handleCloseMemberModal}>
                <FaTimes />
            </button>
            </div>
            <div className="member-modal-body">
              {selectedMember.profile_picture ? (
                <img
                  src={selectedMember.profile_picture}
                  alt={selectedMember.username}
                  className="member-modal-profile-pic"
                />
              ) : (
                <FaUserCircle size={150} className="member-modal-profile-pic" />
              )}

              <p>
                <strong>Full Name:</strong> {selectedMember.firstname} {selectedMember.lastname}
              </p>
              <p>
                <strong>Username:</strong> {selectedMember.username}
              </p>
              <p>
                <strong>Email:</strong> {selectedMember.username}@cerist.dz
              </p>
              <p>
                <strong>Job Title:</strong> {selectedMember.job_title}
              </p>
              <p>
                <strong>Bio:</strong> {selectedMember.bio}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
