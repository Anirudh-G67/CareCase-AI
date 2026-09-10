import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHeartbeat, faUser, faUserMd, faShieldAlt } from '@fortawesome/free-solid-svg-icons';

export default function LandingPage() {
  return (
    <div className="min-h-[90vh] flex flex-col items-center justify-center bg-gray-50 text-slate-800">
      
      {/* Hero Section */}
      <div className="text-center space-y-6 max-w-3xl px-4">
        <div className="flex justify-center mb-4">
          <div className="bg-blue-600 text-white p-4 rounded-2xl shadow-lg">
            <FontAwesomeIcon icon={faHeartbeat} className="text-5xl" />
          </div>
        </div>
        
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-slate-900">
          CareCase <span className="text-blue-600">AI</span>
        </h1>
        
        <p className="text-xl md:text-2xl text-slate-500 font-medium pb-8">
          Simplifying Care Through Intelligence.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link 
            to="/login" 
            className="bg-blue-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-blue-700 transition shadow-lg flex items-center justify-center gap-3"
          >
            <FontAwesomeIcon icon={faUser} /> Portal Login
          </Link>
          
          <Link 
            to="/register" 
            className="bg-white text-blue-600 border-2 border-blue-600 px-8 py-4 rounded-xl font-bold text-lg hover:bg-blue-50 transition shadow-sm flex items-center justify-center gap-3"
          >
            New Patient Registration
          </Link>
        </div>
      </div>

      {/* Trust Indicators (Optional minimal footer) */}
      <div className="mt-20 flex gap-8 text-slate-400 text-sm font-medium">
        <span className="flex items-center gap-2"><FontAwesomeIcon icon={faShieldAlt} /> HIPAA Compliant</span>
        <span className="flex items-center gap-2"><FontAwesomeIcon icon={faUserMd} /> AI-Assisted Clinical Triage</span>
      </div>
    </div>
  );
}