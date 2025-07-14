import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"; 
import SignIn from "./pages/signin"; 
import SignUp from "./pages/signup"; 
import ForgotPassword from "./pages/forgotPassword"; 
import Home from "./pages/home";
import Profile from "./pages/profile"; 
import MembersList from "./pages/consultmembers"; 
import PhoneSign from "./pages/phonelogging"; 
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/sign-in" />} /> {/* Redirect to /sign-in */}
        <Route path="/sign-in" element={<SignIn />} />
        <Route path="/sign-up" element={<SignUp />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/home" element={<Home />} /> 
        <Route path="/profile" element={<Profile />} /> {/* ✅ Fixed Profile import */}
        <Route path="/consultmembers" element={<MembersList />} />
        <Route path="/phonelogging" element={<PhoneSign />} />
      </Routes>
    </Router>
  );
}

export default App;
