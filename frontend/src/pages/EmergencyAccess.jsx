import { useState } from 'react';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExclamationTriangle, faShieldAlt, faArrowLeft, faHeartbeat } from '@fortawesome/free-solid-svg-icons';
import { Link } from 'react-router-dom';

export default function EmergencyAccess() {
  const [patientId, setPatientId] = useState('');
  const [reason, setReason] = useState('Unconscious patient / Trauma admission');
  const [emergencyData, setEmergencyData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleEmergencySubmit = async (e) => {
    e.preventDefault();
    if (!patientId.trim()) return;

    setLoading(true);
    setError('');
    setEmergencyData(null);

    try {
      const response = await axios.post('http://127.0.0.1:8000/api/emergency/access', {
        patient_id: patientId.trim(),
        reason: reason
      });
      setEmergencyData(response.data.patient);
    } catch (err) {
      console.error(err);
      setError("Patient ID not found or emergency bypass failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between bg-red-50 p-4 rounded-xl border border-red-200">
        <div className="flex items-center gap-3">
          <div className="bg-error text-white p-3 rounded-lg animate-pulse">
            <FontAwesomeIcon icon={faExclamationTriangle} size="lg" />
          </div>
          <div>
            <h2 className="font-bold text-lg text-red-900">Emergency Break-Glass Protocol</h2>
            <p className="text-xs text-red-700">Strictly for life-threatening medical emergencies. All actions are audited.</p>
          </div>
        </div>
        <Link to="/" className="text-sm bg-white border border-red-300 text-red-700 px-3 py-1.5 rounded-lg hover:bg-red-100 font-bold transition flex items-center gap-1 shadow-sm">
          <FontAwesomeIcon icon={faArrowLeft} /> Exit
        </Link>
      </div>

      {!emergencyData ? (
        <div className="bg-white p-8 rounded-xl shadow border border-gray-100 space-y-6">
          {error && <div className="bg-red-50 text-error p-3 rounded text-sm font-medium border border-red-200">{error}</div>}
          
          <form onSubmit={handleEmergencySubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Patient ID</label>
              <input 
                required 
                type="text" 
                placeholder="Enter Patient ID (e.g., CC-2026-123456)" 
                className="w-full p-3 border rounded-lg focus:outline-error text-sm font-mono"
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Emergency Justification / Reason</label>
              <select 
                className="w-full p-3 border rounded-lg focus:outline-error text-sm bg-white"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              >
                <option>Unconscious patient / Trauma admission</option>
                <option>Acute cardiac arrest / Resuscitation</option>
                <option>Severe allergic reaction / Anaphylaxis</option>
                <option>Emergency surgical intervention</option>
              </select>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-error text-white font-bold py-3 rounded-lg hover:bg-red-700 transition shadow-lg flex items-center justify-center gap-2"
            >
              <FontAwesomeIcon icon={faHeartbeat} />
              {loading ? "Accessing Secure Records..." : "Authorize Emergency Override"}
            </button>
          </form>
        </div>
      ) : (
        <div className="bg-white p-8 rounded-xl shadow border-2 border-error space-y-6">
          <div className="flex justify-between items-center border-b pb-4">
            <h3 className="font-bold text-xl text-red-900 flex items-center gap-2">
              <FontAwesomeIcon icon={faHeartbeat} className="text-error" /> Critical Patient Overview
            </h3>
            <span className="bg-red-100 text-error px-3 py-1 rounded text-xs font-bold">Emergency Override Active</span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm bg-gray-50 p-4 rounded-xl border">
            <div><strong>Patient ID:</strong> <p className="text-gray-800 font-mono font-bold">{emergencyData.patient_id}</p></div>
            <div><strong>Full Name:</strong> <p className="text-gray-800 font-bold">{emergencyData.full_name}</p></div>
            <div><strong>Blood Group:</strong> <p className="text-error font-bold text-lg">{emergencyData.blood_group}</p></div>
            <div><strong>Age / Sex:</strong> <p className="text-gray-800">{emergencyData.age} / {emergencyData.sex}</p></div>
            
            {/* Added Phone Number Display */}
            <div className="col-span-2 pt-2 border-t border-gray-200 mt-2">
              <strong className="text-gray-800 block mb-1">Emergency Contact / Phone:</strong> 
              <p className="text-gray-800 font-bold text-base">{emergencyData.phone_number}</p>
            </div>

            <div className="col-span-2 bg-red-50 p-3 rounded-lg border border-red-200">
              <strong className="text-error uppercase text-xs block mb-1">Critical Medical Allergies & Warnings</strong> 
              <p className="text-red-900 font-bold text-base">{emergencyData.allergies}</p>
            </div>
          </div>

          <button 
            onClick={() => setEmergencyData(null)} 
            className="w-full bg-secondary text-white py-3 rounded-lg font-bold hover:bg-gray-800 transition"
          >
            Perform Another Emergency Search
          </button>
        </div>
      )}
    </div>
  );
}