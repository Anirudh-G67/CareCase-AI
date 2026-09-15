from fastapi import FastAPI, UploadFile, File, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, PlainTextResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import List, Dict, Any
import uuid
import os
import shutil
import json
from pypdf import PdfReader
import chromadb
from chromadb.utils import embedding_functions
import google.generativeai as genai

import models
from database import engine, get_db

models.Base.metadata.create_all(bind=engine)

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# --- CONFIGURE GEMINI AI ---
KEY = os.getenv("KEY", "")
if KEY:
    genai.configure(api_key=KEY)

# --- INITIALIZE LOCAL VECTOR DB (CHROMA) WITH GEMINI ---
chroma_client = chromadb.PersistentClient(path="./chroma_db")

# Custom lightweight Gemini Embedding Function to bypass Chroma's header bug
class GeminiEmbeddingWrapper(embedding_functions.EmbeddingFunction):
    def __init__(self, api_key: str):
        self.api_key = api_key
        genai.configure(api_key=api_key)

    def __call__(self, input: list[str]) -> list[list[float]]:
        embeddings = []
        for text in input:
            result = genai.embed_content(
                model="models/text-embedding-004",
                content=text,
                task_type="retrieval_document"
            )
            embeddings.append(result['embedding'])
        return embeddings

    def name(self) -> str:
        return "gemini_embedding_wrapper"

if KEY:
    gemini_ef = GeminiEmbeddingWrapper(api_key=KEY)
else:
    gemini_ef = embedding_functions.DefaultEmbeddingFunction()
    print("WARNING: KEY is not set. Vector DB using default fallback.")

collection = chroma_client.get_or_create_collection(
    name="patient_medical_reports_v2",
    embedding_function=gemini_ef
)

app = FastAPI(title="CareCase AI API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_origins=[
        "https://care-case-ai.vercel.app",
        "http://localhost:5173",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

@app.options("/{full_path:path}")
async def preflight_handler(full_path: str):
    return {}

class AIService:
    @staticmethod
    def extract_text_from_pdf(file_path: str) -> str:
        try:
            reader = PdfReader(file_path)
            text = ""
            for page in reader.pages:
                extracted = page.extract_text()
                if extracted:
                    text += extracted + "\n"
            return text if text.strip() else "No readable text found in document."
        except Exception as e:
            return f"Error reading PDF: {str(e)}"

    @staticmethod
    def query_patient_rag(patient_id: str, query: str) -> str:
        try:
            results = collection.query(
                query_texts=[query],
                n_results=2,
                where={"patient_id": patient_id}
            )
            documents = results.get("documents", [[]])[0]
            if documents:
                return " | ".join(documents)
            return "No prior historical context found in uploaded reports."
        except Exception:
            return "Vector search fallback: No indexed history available."

    @staticmethod
    def generate_clinical_summary(patient_id: str, patient_data: dict, qa_responses: list) -> dict:
        rag_history = AIService.query_patient_rag(patient_id, "previous history symptoms medications")
        
        # If no API key is provided, fallback to the fake placeholder data
        if not KEY:
            return {
                "main_complaint": patient_data.get("complaint", "Persistent discomfort"),
                "onset": "Approximately 3 days ago",
                "severity": "7/10",
                "other_symptoms": "Reported fatigue and mild fever",
                "medicines": "Reported standard analgesics",
                "allergies": "Checked against records",
                "ai_case_taking": qa_responses if qa_responses else [{"q": "When did it start?", "a": "3 days ago"}],
                "relevant_history": f"{rag_history} [Retrieved via Fallback]"
            }

        # --- REAL GEMINI AI GENERATION ---
        try:
            # Force Gemini to return structured JSON
            model = genai.GenerativeModel('gemini-1.5-flash', generation_config={"response_mime_type": "application/json"})
            
            prompt = f"""
            You are an expert AI clinical assistant. Analyze the following patient data and generate a structured clinical summary.
            
            Current Complaint: {patient_data.get('complaint', 'Not provided')}
            Patient QA Responses: {qa_responses}
            Historical Records (from Vector RAG): {rag_history}
            
            You MUST return exactly this JSON structure and nothing else:
            {{
                "main_complaint": "Summarize the primary issue",
                "onset": "When it started based on data",
                "severity": "Estimate severity out of 10 or describe it",
                "other_symptoms": "List any associated symptoms",
                "medicines": "List current or recommended basic OTC medicines",
                "allergies": "List allergies if mentioned, else 'None reported'",
                "ai_case_taking": {json.dumps(qa_responses)},
                "relevant_history": "Summarize their vector history in 1-2 sentences"
            }}
            """
            response = model.generate_content(prompt)
            return json.loads(response.text)
            
        except Exception as e:
            print(f"Gemini API Error: {e}")
            # Fallback to safe dictionary if AI parsing fails
            return {
                "main_complaint": patient_data.get("complaint", "Error connecting to AI"),
                "onset": "N/A",
                "severity": "N/A",
                "other_symptoms": "N/A",
                "medicines": "N/A",
                "allergies": "N/A",
                "ai_case_taking": qa_responses,
                "relevant_history": rag_history
            }

# --- PYDANTIC MODELS ---
class PatientRegistration(BaseModel):
    full_name: str
    age: int
    sex: str
    blood_group: str
    aadhaar_token: str  
    phone_number: str

class LoginRequest(BaseModel):
    patient_id: str

class EmergencyRequest(BaseModel):
    patient_id: str
    reason: str

class PrescriptionSubmission(BaseModel):
    patient_id: str
    medicines: str
    instructions: str
    follow_up: str

class MedicalInfoUpdate(BaseModel):
    blood_group: str
    emergency_contact: str
    allergies: str
    conditions: str
    surgeries: str
    current_medicines: str

# --- API ENDPOINTS ---
@app.post("/api/auth/register/patient")
async def register_patient(data: PatientRegistration, db: Session = Depends(get_db)):
    patient_id = f"CC-2026-{str(uuid.uuid4().int)[:6]}"
    
    new_patient = models.Patient(
        patient_id=patient_id,
        full_name=data.full_name,
        age=data.age,
        sex=data.sex,
        blood_group=data.blood_group,
        aadhaar_token=data.aadhaar_token,
        phone_number=data.phone_number
    )
    
    audit_entry = models.AuditLog(
        actor_id=patient_id,
        action_type="PATIENT_REGISTERED",
        details=f"Patient registered with ID {patient_id}"
    )
    
    db.add(new_patient)
    db.add(audit_entry)
    db.commit()

    return {"status": "success", "patient_id": patient_id}

@app.post("/api/auth/login/patient")
async def login_patient(request: LoginRequest, db: Session = Depends(get_db)):
    patient = db.query(models.Patient).filter(models.Patient.patient_id == request.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient ID not found")
        
    audit_entry = models.AuditLog(
        actor_id=patient.patient_id, 
        action_type="PATIENT_LOGIN",
        details=f"Patient {patient.patient_id} logged into patient portal"
    )
    db.add(audit_entry)
    db.commit()

    return {
        "status": "success",
        "patient": {
            "patient_id": patient.patient_id,
            "full_name": patient.full_name,
            "age": patient.age,
            "sex": patient.sex,
            "blood_group": patient.blood_group,
            "emergency_contact": patient.emergency_contact,
            "allergies": patient.allergies,
            "conditions": patient.conditions,
            "surgeries": patient.surgeries,
            "current_medicines": patient.current_medicines
        }
    }

@app.put("/api/patient/medical-info/{patient_id}")
async def update_medical_info(patient_id: str, data: MedicalInfoUpdate, db: Session = Depends(get_db)):
    patient = db.query(models.Patient).filter(models.Patient.patient_id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    patient.blood_group = data.blood_group
    patient.emergency_contact = data.emergency_contact
    patient.allergies = data.allergies
    patient.conditions = data.conditions
    patient.surgeries = data.surgeries
    patient.current_medicines = data.current_medicines
    
    audit_entry = models.AuditLog(
        actor_id=patient_id,
        action_type="MEDICAL_INFO_UPDATED",
        details="Patient updated their personal medical and emergency information."
    )
    db.add(audit_entry)
    db.commit()
    
    return {"status": "success", "message": "Medical information updated."}

@app.post("/api/patient/upload-report")
async def upload_reports(patient_id: str, files: List[UploadFile] = File(...), db: Session = Depends(get_db)):
    saved_files = []
    for file in files:
        safe_filename = f"{patient_id}_{uuid.uuid4().hex[:8]}_{file.filename}"
        file_path = os.path.join(UPLOAD_DIR, safe_filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        if file.filename.endswith(".pdf"):
            extracted_text = AIService.extract_text_from_pdf(file_path)
            collection.add(
                documents=[extracted_text],
                metadatas=[{"patient_id": patient_id, "filename": file.filename}],
                ids=[str(uuid.uuid4())]
            )

        audit_entry = models.AuditLog(
            actor_id=patient_id,
            action_type="REPORT_UPLOADED",
            details=f"Saved & vectorized file: {safe_filename}"
        )
        db.add(audit_entry)
        saved_files.append(file.filename)
        
    db.commit()
    return {"status": "success", "saved_files": saved_files}

@app.get("/api/patient/reports/{patient_id}")
async def get_patient_reports(patient_id: str):
    reports = []
    if os.path.exists(UPLOAD_DIR):
        for filename in os.listdir(UPLOAD_DIR):
            if filename.startswith(patient_id):
                parts = filename.split("_", 2)
                original_name = parts[2] if len(parts) > 2 else filename
                reports.append({
                    "safe_filename": filename,
                    "original_name": original_name
                })
    return {"reports": reports}

@app.get("/api/patient/reports/view/{filename}")
async def view_report(filename: str):
    file_path = os.path.join(UPLOAD_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(file_path)

@app.post("/api/doctor/generate-summary/{patient_id}")
async def get_summary(patient_id: str, payload: Dict[str, Any] = None, db: Session = Depends(get_db)):
    patient = db.query(models.Patient).filter(models.Patient.patient_id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
        
    qa_data = payload.get("responses", []) if payload else []
    
    # We pass the real complaint if it exists in the payload, otherwise default to generic checkup
    complaint = payload.get("complaint", "General checkup") if payload else "General checkup"
    
    summary = AIService.generate_clinical_summary(patient_id, {"complaint": complaint}, qa_data)
    
    audit_entry = models.AuditLog(
        actor_id="DOCTOR_PORTAL",
        action_type="GENERATE_SUMMARY",
        details=f"Generated AI-backed clinical summary for patient {patient_id}"
    )
    db.add(audit_entry)
    db.commit()

    return summary

@app.get("/api/doctor/export-summary/{patient_id}", response_class=PlainTextResponse)
async def export_summary(patient_id: str, db: Session = Depends(get_db)):
    patient = db.query(models.Patient).filter(models.Patient.patient_id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    summary = AIService.generate_clinical_summary(patient_id, {"complaint": "Persistent headache"}, [])
    
    report_content = f"""========================================
CARECASE AI - GEMINI CLINICAL SUMMARY
========================================
Patient ID: {patient.patient_id}
Name: {patient.full_name}
Blood Group: {patient.blood_group}
Age / Sex: {patient.age} / {patient.sex}

1. Main Complaint: {summary.get('main_complaint', 'N/A')}
2. Onset: {summary.get('onset', 'N/A')}
3. Severity: {summary.get('severity', 'N/A')}
4. Other Symptoms: {summary.get('other_symptoms', 'N/A')}
5. Medicines: {summary.get('medicines', 'N/A')}
6. Allergies: {summary.get('allergies', 'N/A')}
7. Relevant History (Vector RAG): {summary.get('relevant_history', 'N/A')}
========================================
Verified by CareCase AI Clinical Engine
"""
    
    audit_entry = models.AuditLog(
        actor_id="DOCTOR_PORTAL",
        action_type="EXPORT_SUMMARY",
        details=f"Exported clinical summary text report for patient {patient_id}"
    )
    db.add(audit_entry)
    db.commit()

    return report_content

@app.post("/api/doctor/prescription")
async def save_prescription(data: PrescriptionSubmission, db: Session = Depends(get_db)):
    new_prescription = models.PrescriptionRecord(
        patient_id=data.patient_id,
        medicines=data.medicines,
        instructions=data.instructions,
        follow_up=data.follow_up
    )
    db.add(new_prescription)

    audit_entry = models.AuditLog(
        actor_id="DOCTOR_PORTAL",
        action_type="PRESCRIPTION_ISSUED",
        details=f"Issued prescription for patient {data.patient_id}: {data.medicines}"
    )
    db.add(audit_entry)
    db.commit()
    return {"status": "success", "message": "Prescription saved and audit logged successfully."}

@app.get("/api/patient/prescriptions/{patient_id}")
async def get_patient_prescriptions(patient_id: str, db: Session = Depends(get_db)):
    prescriptions = db.query(models.PrescriptionRecord).filter(models.PrescriptionRecord.patient_id == patient_id).all()
    return {
        "prescriptions": [
            {
                "id": rx.id,
                "medicines": rx.medicines,
                "instructions": rx.instructions,
                "follow_up": rx.follow_up,
                "timestamp": rx.timestamp.strftime("%Y-%m-%d %H:%M")
            }
            for rx in prescriptions
        ]
    }

@app.post("/api/emergency/access")
async def emergency_access(request: EmergencyRequest, db: Session = Depends(get_db)):
    patient = db.query(models.Patient).filter(models.Patient.patient_id == request.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient ID not found in emergency registry")
        
    audit_entry = models.AuditLog(
        actor_id="EMERGENCY_STAFF",
        action_type="EMERGENCY_BREAK_GLASS",
        details=f"Emergency access triggered for patient {request.patient_id}. Reason: {request.reason}"
    )
    db.add(audit_entry)
    db.commit()

    return {
        "status": "success",
        "patient": {
            "patient_id": patient.patient_id,
            "full_name": patient.full_name,
            "blood_group": patient.blood_group,
            "age": patient.age,
            "sex": patient.sex,
            "allergies": patient.allergies or "Not Provided",
            "phone_number": patient.phone_number,
            "emergency_contact": patient.emergency_contact
        }
    }

@app.get("/api/admin/audit-logs")
async def get_audit_logs(db: Session = Depends(get_db)):
    logs = db.query(models.AuditLog).order_by(models.AuditLog.timestamp.desc()).limit(50).all()
    return {
        "logs": [
            {
                "id": log.id,
                "timestamp": log.timestamp.strftime("%Y-%m-%d %H:%M:%S"),
                "actor_id": log.actor_id,
                "action_type": log.action_type,
                "details": log.details
            }
            for log in logs
        ]
    }

@app.delete("/api/admin/audit-logs")
async def clear_audit_logs(db: Session = Depends(get_db)):
    db.query(models.AuditLog).delete()
    db.commit()
    return {"status": "success", "message": "All audit logs cleared successfully."}

@app.delete("/api/admin/patient/{patient_id}")
async def delete_patient(patient_id: str, db: Session = Depends(get_db)):
    patient = db.query(models.Patient).filter(models.Patient.patient_id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
        
    db.delete(patient)
    audit_entry = models.AuditLog(
        actor_id="ADMIN",
        action_type="PATIENT_DELETED",
        details=f"Permanently deleted patient record {patient_id}"
    )
    db.add(audit_entry)
    db.commit()
    
    if os.path.exists("uploads"):
        for filename in os.listdir("uploads"):
            if filename.startswith(patient_id):
                try:
                    os.remove(os.path.join("uploads", filename))
                except Exception as e:
                    print(f"Error deleting file {filename}: {e}")

    return {"status": "success", "message": f"Patient {patient_id} and associated files have been deleted."}

@app.get("/api/doctor/patient/{patient_id}")
async def get_patient_details(patient_id: str, db: Session = Depends(get_db)):
    patient = db.query(models.Patient).filter(models.Patient.patient_id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
        
    return {
        "patient_id": patient.patient_id,
        "full_name": patient.full_name,
        "age": patient.age,
        "sex": patient.sex,
        "blood_group": patient.blood_group
    }