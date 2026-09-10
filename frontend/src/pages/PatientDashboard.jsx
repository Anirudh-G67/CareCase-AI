import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCloudUploadAlt, faFileMedical, faMicrophone, faSpinner, faEye, faPaperPlane, faStop, faTimes, faPrescriptionBottleMedical, faCheckCircle, faSignOutAlt } from '@fortawesome/free-solid-svg-icons';

export default function PatientDashboard() {
  const [patient, setPatient] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [reports, setReports] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  
  // Comprehensive Medical Data Form state
  const [editForm, setEditForm] = useState({
    blood_group: '',
    emergency_contact: '',
    allergies: '',
    conditions: '',
    surgeries: '',
    current_medicines: ''
  });
  const [isSavingMedical, setIsSavingMedical] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  // Case Taking Modal States
  const [showCaseTaking, setShowCaseTaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [currentInput, setCurrentInput] = useState('');
  const [currentStep, setCurrentStep] = useState(0);
  const [qaResponses, setQaResponses] = useState([]);
  const [summaryResult, setSummaryResult] = useState(null);
  const [isSubmittingCase, setIsSubmittingCase] = useState(false);

  const fileInputRef = useRef(null);
  const recognitionRef = useRef(null);
  const navigate = useNavigate();

  const questions = [
    "What is your main complaint or symptom today?",
    "When did this problem begin?",
    "On a scale of 1 to 10, how severe is your discomfort?",
    "What other symptoms are you experiencing (e.g., fever, dizziness)?"
  ];

  useEffect(() => {
    const storedUser = sessionStorage.getItem('user');
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setPatient(parsedUser);
      setEditForm({
        blood_group: parsedUser.blood_group || 'O+',
        emergency_contact: parsedUser.emergency_contact || '',
        allergies: parsedUser.allergies || '',
        conditions: parsedUser.conditions || '',
        surgeries: parsedUser.surgeries || '',
        current_medicines: parsedUser.current_medicines || ''
      });
      fetchReports(parsedUser.patient_id);
      fetchPrescriptions(parsedUser.patient_id);
    }
  }, []);

  const handleLogout = () => {
    sessionStorage.removeItem('user');
    navigate('/login');
  };

  const fetchReports = async (patientId) => {
    try {
      const response = await axios.get(`http://127.0.0.1:8000/api/patient/reports/${patientId}`);
      setReports(response.data.reports);
    } catch (error) {
      console.error("Error fetching reports:", error);
    }
  };

  const fetchPrescriptions = async (patientId) => {
    try {
      const response = await axios.get(`http://127.0.0.1:8000/api/patient/prescriptions/${patientId}`);
      setPrescriptions(response.data.prescriptions);
    } catch (error) {
      console.error("Error fetching prescriptions:", error);
    }
  };

  const handleSaveMedicalInfo = async (e) => {
    e.preventDefault();
    setIsSavingMedical(true);
    setSaveMessage('');
    try {
      await axios.put(`http://127.0.0.1:8000/api/patient/medical-info/${patient.patient_id}`, editForm);
      const updatedPatient = { ...patient, ...editForm };
      sessionStorage.setItem('user', JSON.stringify(updatedPatient));
      setPatient(updatedPatient);
      setSaveMessage("Medical information saved successfully.");
      setTimeout(() => setSaveMessage(''), 4000);
    } catch (error) {
      console.error("Failed to update medical info", error);
      alert("Failed to save. Make sure the backend is running.");
    } finally {
      setIsSavingMedical(false);
    }
  };

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setIsUploading(true);
    setUploadStatus(`Uploading ${files.length} file(s)...`);

    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });

    try {
      await axios.post(`http://127.0.0.1:8000/api/patient/upload-report?patient_id=${patient.patient_id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setUploadStatus(`Success! File(s) processed and saved securely.`);
      fetchReports(patient.patient_id);
    } catch (error) {
      console.error("Upload failed", error);
      setUploadStatus('Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadStatus(''), 3000);
    }
  };

  const startVoiceRecording = () => {
    if (!('webkitSpeechRecognition' in window)) {
      alert("Voice input is not supported in this browser. Please use Chrome or Edge.");
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang = 'en-IN';

    recognitionRef.current.onresult = (event) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          transcript += event.results[i][0].transcript;
        }
      }
      if (transcript) {
        setCurrentInput(prev => prev + transcript + ' ');
      }
    };

    recognitionRef.current.start();
    setIsListening(true);
  };

  const stopVoiceRecording = () => {
    if (recognitionRef.current) recognitionRef.current.stop();
    setIsListening(false);
  };

  const handleAnswerSubmit = async () => {
    if (!currentInput.trim()) return;

    const updatedQA = [...qaResponses, { q: questions[currentStep], a: currentInput }];
    setQaResponses(updatedQA);
    setCurrentInput('');

    if (currentStep + 1 < questions.length) {
      setCurrentStep(currentStep + 1);
    } else {
      setIsSubmittingCase(true);
      try {
        const res = await axios.post(`http://127.0.0.1:8000/api/doctor/generate-summary/${patient.patient_id}`, {
          responses: updatedQA
        });
        setSummaryResult(res.data);
      } catch (err) {
        console.error("Failed to generate summary", err);
      } finally {
        setIsSubmittingCase(false);
      }
    }
  };

  if (!patient) return <div className="p-10 text-center text-slate-500 font-bold">Loading secure dashboard...</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-6 relative mt-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-gray-200 pb-4">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900">Welcome, {patient.full_name}</h2>
          <p className="text-sm text-slate-500 font-medium">Patient ID: {patient.patient_id} | Identity: Tokenized Secure</p>
        </div>
        
        <div className="flex gap-3 w-full md:w-auto">
          <button 
            onClick={() => { setShowCaseTaking(true); setSummaryResult(null); setCurrentStep(0); setQaResponses([]); }}
            className="bg-blue-600 text-white px-5 py-2.5 rounded-xl shadow-lg flex items-center gap-2 hover:bg-blue-700 font-bold transition flex-1 md:flex-none justify-center"
          >
            <FontAwesomeIcon icon={faMicrophone} /> AI Case Taking
          </button>
          
          <button 
            onClick={handleLogout}
            className="bg-white border-2 border-gray-200 text-slate-600 px-5 py-2.5 rounded-xl flex items-center gap-2 hover:bg-gray-50 hover:text-slate-900 font-bold transition flex-1 md:flex-none justify-center shadow-sm"
          >
            <FontAwesomeIcon icon={faSignOutAlt} /> Switch Role
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Full Medical Form */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 lg:col-span-1 h-fit">
          <h3 className="font-bold text-xl text-slate-800 flex items-center gap-2 mb-6">
             <FontAwesomeIcon icon={faFileMedical} className="text-blue-600" /> Medical & Emergency Information
          </h3>

          <form onSubmit={handleSaveMedicalInfo} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1">Blood Group *</label>
              <select 
                className="w-full p-3 border border-gray-300 rounded-xl bg-gray-50 text-slate-800 focus:ring-2 focus:ring-blue-600 focus:outline-none transition"
                value={editForm.blood_group}
                onChange={(e) => setEditForm({...editForm, blood_group: e.target.value})}
              >
                <option>O+</option><option>O-</option><option>A+</option><option>A-</option>
                <option>B+</option><option>B-</option><option>AB+</option><option>AB-</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1">Emergency Contact</label>
              <input 
                type="text" 
                className="w-full p-3 border border-gray-300 rounded-xl text-slate-800 focus:ring-2 focus:ring-blue-600 focus:outline-none transition"
                value={editForm.emergency_contact}
                onChange={(e) => setEditForm({...editForm, emergency_contact: e.target.value})}
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1">Known Allergies</label>
              <textarea 
                rows="3"
                className="w-full p-3 border border-gray-300 rounded-xl text-slate-800 focus:ring-2 focus:ring-blue-600 focus:outline-none transition"
                value={editForm.allergies}
                onChange={(e) => setEditForm({...editForm, allergies: e.target.value})}
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1">Existing Conditions / Diseases</label>
              <textarea 
                rows="3"
                className="w-full p-3 border border-gray-300 rounded-xl text-slate-800 focus:ring-2 focus:ring-blue-600 focus:outline-none transition"
                value={editForm.conditions}
                onChange={(e) => setEditForm({...editForm, conditions: e.target.value})}
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1">Previous Surgeries</label>
              <textarea 
                rows="3"
                className="w-full p-3 border border-gray-300 rounded-xl text-slate-800 focus:ring-2 focus:ring-blue-600 focus:outline-none transition"
                value={editForm.surgeries}
                onChange={(e) => setEditForm({...editForm, surgeries: e.target.value})}
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1">Current Medicines</label>
              <textarea 
                rows="3"
                className="w-full p-3 border border-gray-300 rounded-xl text-slate-800 focus:ring-2 focus:ring-blue-600 focus:outline-none transition"
                value={editForm.current_medicines}
                onChange={(e) => setEditForm({...editForm, current_medicines: e.target.value})}
              />
            </div>

            {saveMessage && (
              <div className="bg-green-50 text-green-700 p-3 rounded-lg text-sm font-bold flex items-center gap-2">
                <FontAwesomeIcon icon={faCheckCircle} /> {saveMessage}
              </div>
            )}

            <button 
              type="submit" 
              disabled={isSavingMedical}
              className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl hover:bg-blue-700 transition shadow-lg mt-6 flex justify-center items-center gap-2"
            >
              {isSavingMedical ? <FontAwesomeIcon icon={faSpinner} className="animate-spin" /> : null}
              Save Medical Information
            </button>
          </form>
        </div>

        {/* Right Column: Reports and Prescriptions */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Reports Upload Area */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="font-bold text-xl text-slate-800 mb-2">Medical Reports</h3>
            <p className="text-sm text-slate-500 mb-4 font-medium">Add previous prescriptions, laboratory reports, scans or discharge summaries.</p>
            
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept=".pdf,.jpg,.jpeg,.png"
              multiple
              onChange={handleFileSelect}
            />

            <div 
              onClick={() => fileInputRef.current.click()}
              className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:bg-gray-50 transition cursor-pointer mb-6"
            >
              {isUploading ? (
                <FontAwesomeIcon icon={faSpinner} className="text-3xl text-blue-600 mb-2 animate-spin" />
              ) : (
                <FontAwesomeIcon icon={faCloudUploadAlt} className="text-3xl text-slate-400 mb-2" />
              )}
              <p className="font-medium text-slate-700 text-sm">
                {isUploading ? uploadStatus : "Choose file"}
              </p>
            </div>
            
            {uploadStatus && !isUploading && (
               <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800 font-bold">
                 {uploadStatus}
               </div>
            )}
            
            {reports.length > 0 && (
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                {reports.map((report, idx) => (
                  <div key={idx} className="p-3 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <FontAwesomeIcon icon={faFileMedical} className="text-slate-400 flex-shrink-0" />
                      <span className="text-sm font-bold text-slate-800 truncate">{report.original_name}</span>
                    </div>
                    <a 
                      href={`http://127.0.0.1:8000/api/patient/reports/view/${report.safe_filename}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs bg-white border border-gray-300 text-slate-700 px-3 py-1.5 rounded-lg hover:bg-gray-50 flex items-center gap-1 font-bold shadow-sm whitespace-nowrap"
                    >
                      <FontAwesomeIcon icon={faEye} /> View
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Active Prescriptions */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="font-bold text-xl text-slate-800 mb-4 flex items-center gap-2">
              <FontAwesomeIcon icon={faPrescriptionBottleMedical} className="text-blue-600" /> Active Prescriptions
            </h3>
            {prescriptions.length === 0 ? (
              <p className="text-sm text-slate-400 italic">No prescriptions issued yet.</p>
            ) : (
              <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1">
                {prescriptions.map((rx) => (
                  <div key={rx.id} className="p-4 bg-blue-50 border border-blue-100 rounded-xl text-sm space-y-1">
                    <p className="font-bold text-blue-900 text-base">{rx.medicines}</p>
                    <p className="text-slate-700"><strong>Instructions:</strong> {rx.instructions || 'None'}</p>
                    <p className="text-slate-500 text-xs mt-2"><strong>Follow-up:</strong> {rx.follow_up} | Issued: {rx.timestamp}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* AI Case Taking & Summary Modal */}
      {showCaseTaking && (
        <div className="fixed inset-0 bg-slate-900 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-gray-100 flex flex-col max-h-[90vh]">
            <div className="bg-blue-600 text-white p-4 flex justify-between items-center">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <FontAwesomeIcon icon={faMicrophone} /> AI Clinical Case-Taking
              </h3>
              <button onClick={() => setShowCaseTaking(false)} className="text-white hover:text-blue-100">
                <FontAwesomeIcon icon={faTimes} size="lg" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-grow space-y-6">
              {isSubmittingCase ? (
                <div className="py-20 text-center space-y-4">
                  <FontAwesomeIcon icon={faSpinner} className="text-4xl text-blue-600 animate-spin" />
                  <p className="font-bold text-slate-700">Synthesizing clinical summary & running RAG search...</p>
                </div>
              ) : summaryResult ? (
                <div className="space-y-4">
                  <div className="bg-orange-50 border-l-4 border-orange-500 p-3 rounded-lg text-xs text-orange-800 font-bold">
                    ⚠️ AI-Assisted Summary — Submitted to Doctor Review Queue. Not a diagnosis.
                  </div>
                  <h4 className="font-bold text-lg text-slate-900 border-b pb-2">Generated Clinical Summary</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm bg-gray-50 p-4 rounded-xl border border-gray-200">
                    <div><strong className="text-slate-500 block mb-1">Main Complaint:</strong> <p className="font-bold text-slate-800">{summaryResult.main_complaint}</p></div>
                    <div><strong className="text-slate-500 block mb-1">Onset:</strong> <p className="font-bold text-slate-800">{summaryResult.onset}</p></div>
                    <div><strong className="text-slate-500 block mb-1">Severity:</strong> <p className="font-bold text-slate-800">{summaryResult.severity}</p></div>
                    <div><strong className="text-slate-500 block mb-1">Other Symptoms:</strong> <p className="font-bold text-slate-800">{summaryResult.other_symptoms}</p></div>
                    <div className="col-span-2"><strong className="text-slate-500 block mb-1">Relevant History (RAG):</strong> <p className="text-blue-900 bg-blue-100 p-3 rounded-lg mt-1 font-medium">{summaryResult.relevant_history}</p></div>
                  </div>
                  <button onClick={() => setShowCaseTaking(false)} className="w-full bg-slate-800 text-white py-3 rounded-xl font-bold hover:bg-slate-900 transition">
                    Close Summary
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <span>Question {currentStep + 1} of {questions.length}</span>
                    <span>Voice or Text Input</span>
                  </div>
                  
                  <div className="bg-blue-50 border border-blue-100 p-5 rounded-xl">
                    <p className="text-lg font-bold text-blue-900">{questions[currentStep]}</p>
                  </div>

                  <div className="space-y-3">
                    <textarea 
                      rows="3"
                      value={currentInput}
                      onChange={(e) => setCurrentInput(e.target.value)}
                      placeholder={isListening ? "Listening to your voice..." : "Type your answer or use the microphone..."}
                      className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none text-sm text-slate-800 transition"
                    />

                    <div className="flex justify-between items-center">
                      <button 
                        type="button"
                        onClick={isListening ? stopVoiceRecording : startVoiceRecording}
                        className={`px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition ${isListening ? 'bg-red-600 text-white animate-pulse shadow-md' : 'bg-gray-100 text-slate-700 hover:bg-gray-200'}`}
                      >
                        <FontAwesomeIcon icon={isListening ? faStop : faMicrophone} />
                        {isListening ? "Stop Recording" : "Speak Answer"}
                      </button>

                      <button 
                        onClick={handleAnswerSubmit}
                        disabled={!currentInput.trim()}
                        className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50 transition shadow-md"
                      >
                        <span>{currentStep + 1 === questions.length ? "Finish & Generate Summary" : "Next Question"}</span>
                        <FontAwesomeIcon icon={faPaperPlane} />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}