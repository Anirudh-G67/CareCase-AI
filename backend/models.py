from sqlalchemy import Column, Integer, String, DateTime, Text
from database import Base
import datetime

class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    patient_id = Column(String, unique=True, index=True)
    full_name = Column(String, nullable=False)
    age = Column(Integer, nullable=False)
    sex = Column(String, nullable=False)
    blood_group = Column(String, nullable=False)
    aadhaar_token = Column(String, nullable=False)
    phone_number = Column(String, nullable=True, default="Not Provided")
    
    # NEW MEDICAL DATA FIELDS
    emergency_contact = Column(String, nullable=True)
    allergies = Column(Text, nullable=True)
    conditions = Column(Text, nullable=True)
    surgeries = Column(Text, nullable=True)
    current_medicines = Column(Text, nullable=True)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    actor_id = Column(String, nullable=False)
    action_type = Column(String, nullable=False)
    details = Column(String, nullable=False)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)


class PrescriptionRecord(Base):
    __tablename__ = "prescriptions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    patient_id = Column(String, index=True, nullable=False)
    medicines = Column(Text, nullable=False)
    instructions = Column(Text, nullable=True)
    follow_up = Column(String, nullable=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)