import { useState, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMicrophone, faStop, faPaperPlane } from '@fortawesome/free-solid-svg-icons';

export default function CaseTaking() {
  const [isListening, setIsListening] = useState(false);
  const [currentInput, setCurrentInput] = useState('');
  const [conversation, setConversation] = useState([
    { role: 'ai', text: "Hello. To help the doctor understand your case, what is your main complaint today?" }
  ]);
  
  const recognitionRef = useRef(null);

  const startVoiceRecording = () => {
    if (!('webkitSpeechRecognition' in window)) {
      alert("Voice input is not supported in this browser.");
      return;
    }
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang = 'en-IN'; // Supports Indian English accent well, switch to hi-IN for Hindi

    recognitionRef.current.onresult = (event) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }
      if (finalTranscript) {
        setCurrentInput((prev) => prev + finalTranscript + ' ');
      }
    };

    recognitionRef.current.start();
    setIsListening(true);
  };

  const stopVoiceRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };

  const handleSubmit = () => {
    if (!currentInput.trim()) return;
    
    // Add patient answer
    const newChat = [...conversation, { role: 'patient', text: currentInput }];
    setConversation(newChat);
    setCurrentInput('');

    // Mock AI Follow-up (Phase 10 logic would live in the backend)
    setTimeout(() => {
      setConversation(prev => [...prev, { role: 'ai', text: "On a scale of 1 to 10, how severe is this issue?" }]);
    }, 1000);
  };

  return (
    <div className="bg-white rounded-xl shadow border border-gray-100 flex flex-col h-[500px]">
      <div className="bg-primary text-white p-4 rounded-t-xl font-bold flex justify-between">
        <span>AI Clinical Case Taking</span>
        <span className="text-xs bg-primary-hover px-2 py-1 rounded">Language: English</span>
      </div>
      
      <div className="flex-grow p-4 overflow-y-auto space-y-4 bg-gray-50">
        {conversation.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'ai' ? 'justify-start' : 'justify-end'}`}>
            <div className={`p-3 rounded-lg max-w-[80%] ${msg.role === 'ai' ? 'bg-white border text-secondary' : 'bg-primary text-white'}`}>
              <p className="text-sm font-medium mb-1">{msg.role === 'ai' ? 'CareCase AI' : 'You'}</p>
              <p>{msg.text}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 bg-white border-t flex gap-2 items-center">
        <button 
          onClick={isListening ? stopVoiceRecording : startVoiceRecording}
          className={`p-3 rounded-full flex-shrink-0 transition ${isListening ? 'bg-error text-white animate-pulse' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          <FontAwesomeIcon icon={isListening ? faStop : faMicrophone} />
        </button>
        <input 
          type="text" 
          value={currentInput}
          onChange={(e) => setCurrentInput(e.target.value)}
          placeholder={isListening ? "Listening..." : "Type your answer here..."}
          className="flex-grow p-2 border rounded focus:outline-primary"
        />
        <button onClick={handleSubmit} className="bg-primary text-white p-3 rounded hover:bg-primary-hover">
          <FontAwesomeIcon icon={faPaperPlane} />
        </button>
      </div>
    </div>
  );
}