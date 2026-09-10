import { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHeartbeat, faUser, faPhone, faIdCard, faSpinner } from '@fortawesome/free-solid-svg-icons';

export default function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    full_name: '',
    age: '',
    sex: 'Male',
    blood_group: 'O+',
    aadhaar_token: '', 
    phone_number: ''   
  });
  const [loading, setLoading] = useState(false);

  // Helper to ensure only numbers are typed in strict fields
  const handleNumberInput = (e, fieldName) => {
    const numericValue = e.target.value.replace(/\D/g, ''); // Strips out all non-number characters
    setFormData({ ...formData, [fieldName]: numericValue });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Final safety check before sending to backend
    if (formData.phone_number.length !== 10) {
      return alert("Phone Number must be exactly 10 digits.");
    }
    if (formData.aadhaar_token.length !== 12) {
      return alert("Aadhar Number must be exactly 12 digits.");
    }

    setLoading(true);
    try {
      const response = await axios.post('http://127.0.0.1:8000/api/auth/register/patient', {
        ...formData,
        age: parseInt(formData.age)
      });
      
      // Save directly to session storage so the dashboard loads instantly
      sessionStorage.setItem('user', JSON.stringify({
        patient_id: response.data.patient_id,
        full_name: formData.full_name,
        blood_group: formData.blood_group,
        age: formData.age,
        sex: formData.sex,
        allergies: 'None' 
      }));

      alert(`Success! Your Unique Patient ID is: ${response.data.patient_id}`);
      navigate('/patient'); 
      
    } catch (error) {
      console.error("Registration failed:", error);
      alert("Failed to register. Make sure your backend is running!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[90vh] flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-lg border border-gray-100">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-block bg-blue-100 text-blue-600 p-3 rounded-full mb-3 shadow-sm">
            <FontAwesomeIcon icon={faHeartbeat} size="xl" />
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Patient Registration</h2>
          <p className="text-slate-500 text-sm mt-1 font-medium">Create your secure medical file</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Full Name */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Full Legal Name</label>
            <div className="relative border border-gray-300 rounded-xl bg-gray-50 overflow-hidden focus-within:ring-2 focus-within:ring-blue-600 focus-within:border-transparent transition shadow-inner">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FontAwesomeIcon icon={faUser} className="text-gray-400" />
              </div>
              <input 
                type="text" 
                required 
                className="w-full pl-10 p-3 bg-transparent focus:outline-none text-slate-800"
                placeholder="e.g. Anirudh Goel"
                value={formData.full_name}
                onChange={(e) => setFormData({...formData, full_name: e.target.value})}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Age */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Age</label>
              <input 
                type="number" 
                required min="0" max="120"
                className="w-full p-3 border border-gray-300 rounded-xl bg-gray-50 focus:ring-2 focus:ring-blue-600 focus:outline-none transition shadow-inner text-slate-800"
                placeholder="Years"
                value={formData.age}
                onChange={(e) => setFormData({...formData, age: e.target.value})}
              />
            </div>

            {/* Sex */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Sex</label>
              <select 
                className="w-full p-3 border border-gray-300 rounded-xl bg-gray-50 focus:ring-2 focus:ring-blue-600 focus:outline-none transition shadow-inner text-slate-800"
                value={formData.sex}
                onChange={(e) => setFormData({...formData, sex: e.target.value})}
              >
                <option>Male</option>
                <option>Female</option>
                <option>Other</option>
              </select>
            </div>
          </div>

          {/* Blood Group */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Blood Group</label>
            <select 
              className="w-full p-3 border border-gray-300 rounded-xl bg-gray-50 focus:ring-2 focus:ring-blue-600 focus:outline-none transition shadow-inner text-slate-800"
              value={formData.blood_group}
              onChange={(e) => setFormData({...formData, blood_group: e.target.value})}
            >
              <option>O+</option><option>O-</option>
              <option>A+</option><option>A-</option>
              <option>B+</option><option>B-</option>
              <option>AB+</option><option>AB-</option>
            </select>
          </div>

          {/* Phone Number (Strict 10 Digits) */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Phone Number <span className="text-xs text-gray-400 font-normal">(10 digits only)</span></label>
            <div className="relative border border-gray-300 rounded-xl bg-gray-50 overflow-hidden focus-within:ring-2 focus-within:ring-blue-600 focus-within:border-transparent transition shadow-inner">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FontAwesomeIcon icon={faPhone} className="text-gray-400" />
              </div>
              <input 
                type="text" 
                required 
                maxLength="10"
                className="w-full pl-10 p-3 bg-transparent focus:outline-none text-slate-800 font-mono"
                placeholder="Enter 10-digit number"
                value={formData.phone_number}
                onChange={(e) => handleNumberInput(e, 'phone_number')}
              />
            </div>
          </div>

          {/* Aadhar Number (Strict 12 Digits) */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Aadhar Number <span className="text-xs text-gray-400 font-normal">(12 digits only)</span></label>
            <div className="relative border border-gray-300 rounded-xl bg-gray-50 overflow-hidden focus-within:ring-2 focus-within:ring-blue-600 focus-within:border-transparent transition shadow-inner">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FontAwesomeIcon icon={faIdCard} className="text-gray-400" />
              </div>
              <input 
                type="text" 
                required 
                maxLength="12"
                className="w-full pl-10 p-3 bg-transparent focus:outline-none text-slate-800 font-mono"
                placeholder="Enter 12-digit Aadhar number"
                value={formData.aadhaar_token}
                onChange={(e) => handleNumberInput(e, 'aadhaar_token')}
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl hover:bg-blue-700 transition shadow-lg mt-6 flex justify-center items-center gap-2"
          >
            {loading ? <FontAwesomeIcon icon={faSpinner} className="animate-spin" /> : null}
            {loading ? 'Creating Secure Profile...' : 'Complete Registration'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-slate-500 font-medium">
            Already registered? <Link to="/login" className="text-blue-600 font-bold hover:underline">Log in to portal</Link>
          </p>
        </div>
      </div>
    </div>
  );
}