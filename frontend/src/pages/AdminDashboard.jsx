import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faShieldAlt, faSignOutAlt, faTrash, faHistory, faUserMinus, faSpinner, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [admin, setAdmin] = useState(null);
  
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(true);
  
  const [deletePatientId, setDeletePatientId] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState('');

  // Check authentication on load
  useEffect(() => {
    const storedAdmin = sessionStorage.getItem('admin');
    if (storedAdmin) {
      setAdmin(JSON.parse(storedAdmin));
      fetchAuditLogs();
    } else {
      navigate('/login');
    }
  }, [navigate]);

  const handleLogout = () => {
    sessionStorage.removeItem('admin');
    navigate('/login');
  };

  const fetchAuditLogs = async () => {
    setLogsLoading(true);
    try {
      const response = await axios.get('http://127.0.0.1:8000/api/admin/audit-logs');
      setLogs(response.data.logs);
    } catch (err) {
      console.error("Failed to fetch logs", err);
    } finally {
      setLogsLoading(false);
    }
  };

  const handleClearLogs = async () => {
    if (!window.confirm("Are you sure you want to clear ALL security audit logs? This action cannot be undone.")) return;
    
    try {
      await axios.delete('http://127.0.0.1:8000/api/admin/audit-logs');
      setActionMessage("All audit logs have been successfully cleared.");
      fetchAuditLogs();
      setTimeout(() => setActionMessage(''), 5000);
    } catch (err) {
      console.error(err);
      alert("Failed to clear logs.");
    }
  };

  const handleDeletePatient = async (e) => {
    e.preventDefault();
    if (!deletePatientId.trim()) return;
    
    if (!window.confirm(`WARNING: You are about to permanently delete patient ${deletePatientId.trim()} and all associated files. Proceed?`)) return;

    setDeleteLoading(true);
    setActionMessage('');

    try {
      await axios.delete(`http://127.0.0.1:8000/api/admin/patient/${deletePatientId.trim()}`);
      setActionMessage(`Patient ${deletePatientId.trim()} was completely removed from the system.`);
      setDeletePatientId('');
      fetchAuditLogs(); // Refresh logs to show the deletion action
      setTimeout(() => setActionMessage(''), 5000);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || "Failed to delete patient. Please check the ID.");
    } finally {
      setDeleteLoading(false);
    }
  };

  if (!admin) return <div className="p-10 text-center font-bold text-gray-600">Loading secure admin portal...</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-6 mt-6">
      {/* Header */}
      <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow border border-gray-100">
        <div className="flex items-center gap-3">
          <div className="bg-gray-800 text-white p-3 rounded-lg">
            <FontAwesomeIcon icon={faShieldAlt} size="lg" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-secondary">System Administration</h2>
            <p className="text-sm text-gray-500">Security & Compliance Dashboard</p>
          </div>
        </div>
        <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-error transition font-bold flex items-center gap-2">
          <FontAwesomeIcon icon={faSignOutAlt} /> Secure Logout
        </button>
      </div>

      {actionMessage && (
        <div className="bg-green-50 text-green-700 p-4 rounded-xl border border-green-200 text-sm font-bold flex items-center gap-2">
          <FontAwesomeIcon icon={faShieldAlt} /> {actionMessage}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Data Management */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-xl shadow border border-red-100">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-error">
              <FontAwesomeIcon icon={faExclamationTriangle} /> Danger Zone
            </h3>
            
            <form onSubmit={handleDeletePatient} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Permanently Delete Patient</label>
                <input 
                  type="text" 
                  placeholder="Patient ID (e.g., CC-2026-154374)" 
                  className="w-full p-3 border border-red-200 rounded-lg focus:outline-error text-sm font-mono"
                  value={deletePatientId}
                  onChange={(e) => setDeletePatientId(e.target.value)}
                  required
                />
              </div>
              <button 
                type="submit" 
                disabled={deleteLoading}
                className="w-full bg-error text-white font-bold py-2.5 rounded-lg hover:bg-red-700 transition flex items-center justify-center gap-2"
              >
                {deleteLoading ? <FontAwesomeIcon icon={faSpinner} className="animate-spin" /> : <FontAwesomeIcon icon={faUserMinus} />}
                {deleteLoading ? 'Deleting...' : 'Delete Record & Files'}
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: System Audit Logs */}
        <div className="md:col-span-2">
          <div className="bg-white p-6 rounded-xl shadow border border-gray-100 h-full flex flex-col">
            <div className="flex justify-between items-center border-b pb-4 mb-4">
              <h3 className="font-bold text-xl text-secondary flex items-center gap-2">
                <FontAwesomeIcon icon={faHistory} className="text-primary" /> Security Audit Logs
              </h3>
              <div className="flex gap-2">
                <button 
                  onClick={fetchAuditLogs}
                  className="text-sm bg-gray-100 text-gray-700 px-3 py-1.5 rounded hover:bg-gray-200 font-bold transition"
                >
                  Refresh
                </button>
                <button 
                  onClick={handleClearLogs}
                  className="text-sm bg-red-50 text-error border border-red-200 px-3 py-1.5 rounded hover:bg-red-100 font-bold flex items-center gap-2 transition"
                >
                  <FontAwesomeIcon icon={faTrash} /> Clear All
                </button>
              </div>
            </div>

            <div className="flex-grow overflow-hidden">
              {logsLoading ? (
                <div className="flex justify-center items-center h-40">
                  <FontAwesomeIcon icon={faSpinner} className="animate-spin text-3xl text-gray-300" />
                </div>
              ) : logs.length === 0 ? (
                <div className="text-center text-gray-400 py-10 italic text-sm">
                  No audit logs recorded yet.
                </div>
              ) : (
                <div className="max-h-[500px] overflow-y-auto pr-2 space-y-3">
                  {logs.map((log) => (
                    <div key={log.id} className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-bold text-gray-800 font-mono">{log.action_type}</span>
                        <span className="text-xs text-gray-500">{log.timestamp}</span>
                      </div>
                      <p className="text-gray-600 mb-1">{log.details}</p>
                      <p className="text-xs font-bold text-primary">Actor ID: {log.actor_id}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}