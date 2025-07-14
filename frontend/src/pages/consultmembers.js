
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
    FaInbox,
    FaPaperPlane,
    FaFileAlt,
    FaTrash,
    FaSignOutAlt,
    FaUserCircle,
    FaStar,
    FaPenFancy,
} from "react-icons/fa";
import axios from "axios";
import "./styles/home.css";

const ConsultUsers = () => {
    const navigate = useNavigate();
    const [activeSection, setActiveSection] = useState("Users");
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [showModal, setShowModal] = useState(false);


    const fetchUsers = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const response = await axios.get("http://127.0.0.1:5000/get-users", {
                headers: { Authorization: `Bearer ${token}` },
            });
            setUsers(response.data.users || []);
        } catch (err) {
            console.error("Failed to fetch users", err);
            alert("Error fetching users");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleLogout = () => {
        localStorage.removeItem("token");
        navigate("/signin");
    };

    const handleUserClick = (user) => {
        setSelectedUser(user);
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setSelectedUser(null);
    };

    return (
        <div className="email-home">
            {/* Sidebar - SAME AS HOME */}
            <div className="sidebar">
                <h2>MailApp</h2>
                <div className="menu">
                    {/* You can keep or remove Compose here if irrelevant */}
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
                    <button onClick={() => setActiveSection("Users")} className="active">
                        <FaUserCircle /> Users
                    </button>
                </div>
                <button className="logout" onClick={handleLogout}>
                    <FaSignOutAlt /> Logout
                </button>
            </div>

            {/* Main content area */}
            <div className="main-content">
                <h2>{activeSection}</h2>
                {loading ? (
                    <p>Loading users...</p>
                ) : users.length === 0 ? (
                    <p>No users found.</p>
                ) : (
                    <div className="email-list">
                        {users.map((user) => (
                            <div
                                key={user.id}
                                className="email-item"
                                onClick={() => handleUserClick(user)}
                            >
                                <div className="email-subject">
                                    {user.username} ({user.firstName} {user.lastName})
                                </div>
                                <div className="email-sender">{user.email || "No email"}</div>
                            </div>
                        ))}
                    </div>
                )}

                {/* User detail modal */}
                {showModal && selectedUser && (
                    <div className="modal" onClick={handleCloseModal}>
                        <div
                            className="modal-content"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h3>{selectedUser.username}</h3>
                            <p>
                                Name: {selectedUser.firstName} {selectedUser.lastName}
                            </p>
                            <p>Email: {selectedUser.email}</p>
                            <p>Phone: {selectedUser.phone || "N/A"}</p>
                            {/* Add more user details as needed */}
                            <button onClick={handleCloseModal}>Close</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ConsultUsers;
