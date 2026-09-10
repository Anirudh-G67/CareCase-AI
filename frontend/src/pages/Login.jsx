import { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faUserMd, faShieldAlt, faLock, faArrowRight, faSpinner, faHeartbeat } from '@fortawesome/free-solid-svg-icons';

export default function Login() {
  const [role, setRole] = useState('patient'); // 'patient', 'doctor', 'admin'
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (role === 'patient') {
        const response = await axios.post('http://127.0.0.1:8000/api/auth/login/patient', {
          patient_id: identifier.trim()
        });
        
        // This now correctly saves ALL new medical data to the session
        sessionStorage.setItem('user', JSON.stringify(response.data.patient));
        navigate('/patient');
        
      } else if (role === 'doctor') {
        // Mock doctor authentication for SIH demo
        if (identifier.trim() === 'DOC-2026' || identifier.trim().startsWith('DOC')) {
          sessionStorage.setItem('doctor', JSON.stringify({ doctor_id: identifier, role: 'doctor' }));
          navigate('/doctor');
        } else {
          setError("Invalid Doctor ID. Use 'DOC-2026'.");
        }
        
      } else if (role === 'admin') {
        // Mock admin authentication for SIH demo
        if (identifier.trim() === 'admin' && password === 'admin123') {
          sessionStorage.setItem('admin', JSON.stringify({ role: 'admin' }));
          navigate('/admin');
        } else {
          setError("Invalid Admin credentials. Use username 'admin' and password 'admin123'.");
        }
      }
    } catch (err) {
      console.error("Login failed:", err);
      setError(err.response?.data?.detail || "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[90vh] flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-100">
        
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-block bg-blue-100 text-blue-600 p-4 rounded-full mb-4 shadow-sm">
            <FontAwesomeIcon icon={faHeartbeat} size="2xl" />
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">CareCase AI Portal</h2>
          <p className="text-slate-500 text-sm mt-2 font-medium">Select your role to access secure workflows</p>
        </div>

        {/* Role Selector Tabs */}
        <div className="grid grid-cols-3 gap-2 bg-gray-100 p-1.5 rounded-xl text-sm font-bold text-center mb-6">
          <button 
            type="button" 
            onClick={() => { setRole('patient'); setError(''); setIdentifier(''); setPassword(''); }}
            className={`py-2.5 rounded-lg transition ${role === 'patient' ? 'bg-white text-blue-600 shadow-sm border border-gray-200' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <FontAwesomeIcon icon={faUser} className="block mx-auto mb-1 text-lg" /> Patient
          </button>
          <button 
            type="button" 
            onClick={() => { setRole('doctor'); setError(''); setIdentifier(''); setPassword(''); }}
            className={`py-2.5 rounded-lg transition ${role === 'doctor' ? 'bg-white text-blue-600 shadow-sm border border-gray-200' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <FontAwesomeIcon icon={faUserMd} className="block mx-auto mb-1 text-lg" /> Doctor
          </button>
          <button 
            type="button" 
            onClick={() => { setRole('admin'); setError(''); setIdentifier(''); setPassword(''); }}
            className={`py-2.5 rounded-lg transition ${role === 'admin' ? 'bg-white text-blue-600 shadow-sm border border-gray-200' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <FontAwesomeIcon icon={faShieldAlt} className="block mx-auto mb-1 text-lg" /> Admin
          </button>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm font-bold rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">
              {role === 'patient' ? 'Patient ID' : role === 'doctor' ? 'Doctor ID' : 'Admin Username'}
            </label>
            <div className="relative border border-gray-300 rounded-xl bg-gray-50 overflow-hidden focus-within:ring-2 focus-within:ring-blue-600 focus-within:border-transparent transition shadow-inner">
              <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-gray-400">
                <FontAwesomeIcon icon={role === 'admin' ? faShieldAlt : role === 'doctor' ? faUserMd : faUser} />
              </span>
              <input 
                required
                type="text" 
                placeholder={role === 'patient' ? 'CC-2026-123456' : role === 'doctor' ? 'DOC-2026' : 'admin'} 
                className="w-full pl-11 p-3.5 bg-transparent focus:outline-none text-slate-800 font-mono font-bold"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
              />
            </div>
          </div>

          {role === 'admin' && (
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Password</label>
              <div className="relative border border-gray-300 rounded-xl bg-gray-50 overflow-hidden focus-within:ring-2 focus-within:ring-blue-600 focus-within:border-transparent transition shadow-inner">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-gray-400">
                  <FontAwesomeIcon icon={faLock} />
                </span>
                <input 
                  required
                  type="password" 
                  placeholder="••••••••" 
                  className="w-full pl-11 p-3.5 bg-transparent focus:outline-none text-slate-800"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl hover:bg-blue-700 transition shadow-lg flex items-center justify-center gap-2 mt-2"
          >
            {loading ? <FontAwesomeIcon icon={faSpinner} className="animate-spin" /> : <span>Access Portal</span>}
            {!loading && <FontAwesomeIcon icon={faArrowRight} />}
          </button>
        </form>

        <div className="mt-8 text-center space-y-4">
          {role === 'patient' && (
            <p className="text-sm text-slate-500 font-medium">
              Don't have a patient ID? <Link to="/register" className="text-blue-600 font-bold hover:underline">Register here</Link>
            </p>
          )}
          {role === 'admin' && (
            <p className="text-xs text-slate-400 font-mono">
              Default Credentials: admin / admin123
            </p>
          )}
          
          <div className="pt-4 border-t border-gray-100 flex justify-center items-center gap-2 text-xs text-slate-400 font-medium">
            <FontAwesomeIcon icon={faShieldAlt} /> 256-bit Encryption Active
          </div>
        </div>
      </div>
    </div>
  );
}