import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faShieldAlt, faCheckCircle, faFileMedical, faUserMd, faEye, faExclamationTriangle, faTrash, faHistory, faFileAlt, faPrescriptionBottleMedical, faDownload, faSignOutAlt, faSpinner } from '@fortawesome/free-solid-svg-icons';

export default function DoctorDashboard() {
  const navigate = useNavigate();
  const [doctor, setDoctor] = useState(null);
  
  const [activeTab, setActiveTab] = useState('review');
  const [searchId, setSearchId] = useState('');
  const [patientData, setPatientData] = useState(null);
  const [summaryData, setSummaryData] = useState(null);
  const [reports, setReports] = useState([]);
  const [previousSummaries, setPreviousSummaries] = useState([
    { id: 1, date: "2026-09-08 14:30", complaint: "Persistent headache", status: "Verified" } // Mocked history for demo
  ]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [verified, setVerified] = useState(false);

  const [prescription, setPrescription] = useState({
    medicines: '',
    instructions: '',
    follow_up: '7 days'
  });
  const [isSubmittingRx, setIsSubmittingRx] = useState(false);

  // Authentication Check
  useEffect(() => {
    const storedDoctor = sessionStorage.getItem('doctor');
    if (storedDoctor) {
      setDoctor(JSON.parse(storedDoctor));
    } else {
      navigate('/login');
    }
  }, [navigate]);

  const handleLogout = () => {
    sessionStorage.removeItem('doctor');
    navigate('/login');
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchId.trim()) return;

    setLoading(true);
    setError('');
    setPatientData(null);
    setSummaryData(null);
    setVerified(false);

    try {
      // 1. Fetch Patient Demographics (Requires the new backend endpoint below)
      const patientRes = await axios.get(`http://127.0.0.1:8000/api/doctor/patient/${searchId.trim()}`);
      setPatientData(patientRes.data);

      // 2. Fetch AI Summary
      const summaryRes = await axios.post(`http://127.0.0.1:8000/api/doctor/generate-summary/${searchId.trim()}`);
      setSummaryData(summaryRes.data);

      // 3. Fetch Uploaded Reports
      const reportsRes = await axios.get(`http://127.0.0.1:8000/api/patient/reports/${searchId.trim()}`);
      setReports(reportsRes.data.reports);

    } catch (err) {
      console.error(err);
      setError("Patient ID not found or unauthorized access.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = () => {
    setVerified(true);
    alert("Clinical information successfully verified by doctor.");
  };

  const handleExport = async () => {
    try {
      const response = await axios.get(`http://127.0.0.1:8000/api/doctor/export-summary/${patientData.patient_id}`, {
        responseType: 'blob'
      });
      const blob = new Blob([response.data], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Clinical_Summary_${patientData.patient_id}.txt`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error(err);
      alert("Failed to export summary report.");
    }
  };

  const handlePrescriptionSubmit = async (e) => {
    e.preventDefault();
    if (!prescription.medicines.trim()) return;

    setIsSubmittingRx(true);
    try {
      await axios.post('http://127.0.0.1:8000/api/doctor/prescription', {
        patient_id: patientData.patient_id,
        ...prescription
      });
      alert("Prescription issued successfully and logged in audit trails!");
      setPrescription({ medicines: '', instructions: '', follow_up: '7 days' });
    } catch (err) {
      console.error(err);
      alert("Failed to issue prescription.");
    } finally {
      setIsSubmittingRx(false);
    }
  };

  const handleDeleteSummary = (id) => {
    if (window.confirm("Are you sure you want to delete this summary?")) {
      setPreviousSummaries(prev => prev.filter(item => item.id !== id));
      alert("Summary deleted successfully.");
    }
  };

  if (!doctor) return <div className="p-10 text-center font-bold text-gray-600">Loading secure portal...</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-6 mt-6">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-xl shadow border border-gray-100 gap-4">
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-3">
            <div className="bg-secondary text-white p-3 rounded-lg">
              <FontAwesomeIcon icon={faUserMd} size="lg" />
            </div>
            <div>
              <h2 className="font-bold text-lg text-secondary">Doctor Portal</h2>
              <p className="text-xs text-gray-500">ID: {doctor.doctor_id} | Clinical Review</p>
            </div>
          </div>
          <button onClick={handleLogout} className="md:hidden text-sm text-gray-500 hover:text-error transition font-bold">
            <FontAwesomeIcon icon={faSignOutAlt} />
          </button>
        </div>

        <form onSubmit={handleSearch} className="flex gap-2 w-full md:w-1/2">
          <input 
            type="text" 
            placeholder="Enter Patient ID (e.g. CC-2026-154374)" 
            className="w-full p-2 border rounded bg-gray-50 focus:outline-primary text-sm font-mono"
            value={searchId}
            onChange={(e) => setSearchId(e.target.value)}
          />
          <button type="submit" disabled={loading} className="bg-secondary text-white px-4 py-2 rounded hover:bg-gray-800 flex items-center gap-2 text-sm font-bold flex-shrink-0">
            {loading ? <FontAwesomeIcon icon={faSpinner} className="animate-spin" /> : <FontAwesomeIcon icon={faSearch} />}
            {loading ? "Searching..." : "Search"}
          </button>
        </form>

        <div className="flex gap-3">
          <Link to="/emergency" className="text-error border border-error px-4 py-2 rounded hover:bg-red-50 flex items-center gap-2 text-sm font-medium transition">
            <FontAwesomeIcon icon={faExclamationTriangle} /> Emergency
          </Link>
          <button onClick={handleLogout} className="hidden md:flex text-sm text-gray-500 border px-4 py-2 rounded hover:bg-gray-50 transition font-bold items-center gap-2">
            <FontAwesomeIcon icon={faSignOutAlt} /> Logout
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-error p-4 rounded-xl border border-error text-center font-medium">
          {error}
        </div>
      )}

      {patientData && (
        <div className="flex border-b border-gray-200 bg-white px-4 pt-2 rounded-t-xl shadow-sm overflow-x-auto">
          <button 
            onClick={() => setActiveTab('review')}
            className={`py-3 px-6 font-bold text-sm border-b-2 transition whitespace-nowrap ${activeTab === 'review' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-secondary'}`}
          >
            <FontAwesomeIcon icon={faFileAlt} className="mr-2" /> Current Review & Prescription
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`py-3 px-6 font-bold text-sm border-b-2 transition whitespace-nowrap ${activeTab === 'history' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-secondary'}`}
          >
            <FontAwesomeIcon icon={faHistory} className="mr-2" /> Previous Summaries ({previousSummaries.length})
          </button>
        </div>
      )}

      {patientData && summaryData && activeTab === 'review' && (
        <div className="space-y-6">
          {/* Patient Overview Strip */}
          <div className="bg-white p-4 rounded-xl shadow border border-gray-100 flex flex-wrap gap-4 justify-between items-center text-sm">
            <div>
              <span className="text-gray-400 text-xs uppercase block font-bold">Patient Name</span>
              <span className="font-bold text-secondary text-base">{patientData.full_name}</span>
            </div>
            <div>
              <span className="text-gray-400 text-xs uppercase block font-bold">Patient ID</span>
              <span className="font-bold text-secondary text-base font-mono">{patientData.patient_id}</span>
            </div>
            <div>
              <span className="text-gray-400 text-xs uppercase block font-bold">Blood Group</span>
              <span className="font-bold text-error text-base">{patientData.blood_group}</span>
            </div>
            <div>
              <span className="text-gray-400 text-xs uppercase block font-bold">Age / Sex</span>
              <span className="font-bold text-secondary text-base">{patientData.age} / {patientData.sex}</span>
            </div>
            <div>
              <button 
                onClick={handleExport}
                className="bg-primary text-white px-3 py-1.5 rounded text-xs font-bold hover:bg-primary-hover flex items-center gap-1 shadow transition"
              >
                <FontAwesomeIcon icon={faDownload} /> Export Summary
              </button>
            </div>
          </div>

          {/* AI Summary Block */}
          <div className="bg-white rounded-xl shadow border-l-4 border-warning overflow-hidden">
            <div className="bg-orange-50 p-4 border-b border-orange-100 flex justify-between items-center">
              <span className="text-warning font-bold text-xs uppercase flex items-center gap-2">
                ⚠️ AI-Assisted Clinical Summary — Requires Doctor Review
              </span>
              {verified ? (
                <span className="bg-success text-white px-3 py-1 rounded text-xs font-bold flex items-center gap-1">
                  <FontAwesomeIcon icon={faCheckCircle} /> Doctor Verified
                </span>
              ) : (
                <button 
                  onClick={handleVerify}
                  className="bg-primary text-white px-4 py-1.5 rounded text-xs font-bold hover:bg-primary-hover transition flex items-center gap-1 shadow"
                >
                  <FontAwesomeIcon icon={faCheckCircle} /> Verify Information
                </button>
              )}
            </div>
            
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <div className="space-y-4">
                <div>
                  <h4 className="text-gray-400 uppercase text-xs font-bold mb-1">1. Main Complaint</h4>
                  <p className="font-semibold text-base text-secondary">{summaryData.main_complaint}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-gray-400 uppercase text-xs font-bold mb-1">2. Onset</h4>
                    <p className="font-medium text-gray-800">{summaryData.onset}</p>
                  </div>
                  <div>
                    <h4 className="text-gray-400 uppercase text-xs font-bold mb-1">3. Severity</h4>
                    <p className="font-medium text-gray-800">{summaryData.severity}</p>
                  </div>
                </div>
                <div>
                  <h4 className="text-gray-400 uppercase text-xs font-bold mb-1">4. Other Symptoms</h4>
                  <p className="font-medium text-gray-800">{summaryData.other_symptoms}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="text-gray-400 uppercase text-xs font-bold mb-1">5. Medicines</h4>
                  <p className="font-medium text-gray-800">{summaryData.medicines}</p>
                </div>
                <div>
                  <h4 className="text-gray-400 uppercase text-xs font-bold mb-1">6. Allergies</h4>
                  <p className="font-medium text-error">{summaryData.allergies}</p>
                </div>
                <div>
                  <h4 className="text-gray-400 uppercase text-xs font-bold mb-1">8. Relevant Previous History (RAG)</h4>
                  <p className="font-medium bg-blue-50 p-3 rounded border border-blue-100 text-blue-900 text-xs leading-relaxed">
                    {summaryData.relevant_history}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Prescription Form */}
            <div className="bg-white p-6 rounded-xl shadow border border-gray-100 space-y-4">
              <h3 className="font-bold text-base text-secondary border-b pb-2 flex items-center gap-2">
                <FontAwesomeIcon icon={faPrescriptionBottleMedical} className="text-primary" /> Issue Treatment Plan
              </h3>
              
              <form onSubmit={handlePrescriptionSubmit} className="space-y-4 text-sm">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Prescribed Medicines & Dosage</label>
                  <textarea 
                    required
                    rows="2"
                    placeholder="e.g., Paracetamol 650mg - Twice daily after meals"
                    className="w-full p-3 border rounded-lg focus:outline-primary"
                    value={prescription.medicines}
                    onChange={(e) => setPrescription({...prescription, medicines: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Clinical Instructions</label>
                    <input 
                      type="text"
                      placeholder="e.g., Avoid cold water, rest for 3 days"
                      className="w-full p-3 border rounded-lg focus:outline-primary"
                      value={prescription.instructions}
                      onChange={(e) => setPrescription({...prescription, instructions: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Follow-up Schedule</label>
                    <input 
                      type="text"
                      placeholder="e.g., 7 days"
                      className="w-full p-3 border rounded-lg focus:outline-primary"
                      value={prescription.follow_up}
                      onChange={(e) => setPrescription({...prescription, follow_up: e.target.value})}
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={isSubmittingRx || !verified}
                  className={`w-full text-white px-6 py-2.5 rounded-lg font-bold transition shadow ${!verified ? 'bg-gray-400 cursor-not-allowed' : 'bg-primary hover:bg-primary-hover'}`}
                >
                  {!verified ? "Verify AI Summary First" : isSubmittingRx ? "Saving Prescription..." : "Save & Finalize Prescription"}
                </button>
              </form>
            </div>

            {/* Uploaded Reports List */}
            <div className="bg-white p-6 rounded-xl shadow border border-gray-100 h-full">
              <h3 className="font-bold text-base text-secondary mb-4 border-b pb-2">Patient Uploaded Reports ({reports.length})</h3>
              {reports.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                  <FontAwesomeIcon icon={faFileMedical} className="text-3xl mb-2 opacity-50" />
                  <p className="text-sm italic">No reports uploaded.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                  {reports.map((report, idx) => (
                    <div key={idx} className="p-3 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-between">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <FontAwesomeIcon icon={faFileMedical} className="text-primary flex-shrink-0" />
                        <span className="text-sm font-medium text-gray-800 truncate">{report.original_name}</span>
                      </div>
                      <a 
                        href={`http://127.0.0.1:8000/api/patient/reports/view/${report.safe_filename}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs bg-white border border-gray-300 text-gray-700 px-3 py-1.5 rounded hover:bg-gray-50 flex items-center gap-1 font-bold shadow-sm whitespace-nowrap"
                      >
                        <FontAwesomeIcon icon={faEye} /> View
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {patientData && activeTab === 'history' && (
        <div className="bg-white p-6 rounded-xl shadow border border-gray-100 space-y-4">
          <h3 className="font-bold text-base text-secondary border-b pb-2">Archived Clinical Summaries</h3>
          {previousSummaries.length === 0 ? (
            <p className="text-sm text-gray-400 italic">No archived summaries found.</p>
          ) : (
            <div className="space-y-3">
              {previousSummaries.map((item) => (
                <div key={item.id} className="p-4 bg-gray-50 border border-gray-200 rounded-lg flex justify-between items-center">
                  <div>
                    <p className="font-bold text-secondary text-sm">{item.complaint}</p>
                    <p className="text-xs text-gray-500 mt-1">Generated on: {item.date} | Status: <span className="font-semibold text-primary">{item.status}</span></p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => alert("Viewing archived summary...")} className="bg-white border text-gray-700 px-3 py-1 rounded text-xs font-bold hover:bg-gray-100 shadow-sm">
                      View
                    </button>
                    <button onClick={() => handleDeleteSummary(item.id)} className="bg-red-50 text-error border border-red-200 px-3 py-1 rounded text-xs font-bold hover:bg-red-100 shadow-sm flex items-center gap-1">
                      <FontAwesomeIcon icon={faTrash} /> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}