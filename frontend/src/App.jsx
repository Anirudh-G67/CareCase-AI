import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Import all your components from the 'pages' directory
import LandingPage from "./pages/LandingPage.jsx";
import Login from "./pages/Login.jsx"; 
import Register from "./pages/Register.jsx";
import PatientDashboard from "./pages/PatientDashboard.jsx"; 
import DoctorDashboard from "./pages/DoctorDashboard.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import EmergencyAccess from "./pages/EmergencyAccess.jsx"; 

export default function App() {
  return (
    <Router>
      {/* 
        This wrapper ensures the entire app has a cohesive, 
        modern light-gray background and professional font styling 
      */}
      <div className="min-h-screen bg-gray-50 text-gray-900 font-sans p-4 md:p-8">
        <Routes>
          {/* Default Route: Now displays the Landing Page first */}
          <Route path="/" element={<LandingPage />} />
          
          {/* Authentication & Onboarding */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          {/* Secure Role-Based Portals */}
          <Route path="/patient" element={<PatientDashboard />} />
          <Route path="/doctor" element={<DoctorDashboard />} />
          <Route path="/admin" element={<AdminDashboard />} />
          
          {/* Emergency Break-Glass Route */}
          <Route path="/emergency" element={<EmergencyAccess />} />
        </Routes>
      </div>
    </Router>
  );
}