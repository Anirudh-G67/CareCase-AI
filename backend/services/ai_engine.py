import pytesseract
from pdf2image import convert_from_bytes
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.vectorstores import Chroma
from langchain.embeddings import HuggingFaceEmbeddings
import uuid

class CareCaseAIEngine:
    def __init__(self):
        # Local embeddings to prevent vendor lock-in (Phase 3 Requirement)
        self.embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
        self.vector_store = Chroma(persist_directory="./chroma_db", embedding_function=self.embeddings)

    def extract_text_from_pdf(self, pdf_bytes: bytes) -> str:
        """Phase 6: OCR Pipeline. Converts PDF to images, then to text."""
        try:
            images = convert_from_bytes(pdf_bytes)
            extracted_text = ""
            for img in images:
                # pytesseract requires the Windows executable to be installed
                extracted_text += pytesseract.image_to_string(img) + "\n"
            return extracted_text
        except Exception as e:
            return f"OCR Extraction Failed: {str(e)}"

    def store_patient_document_in_rag(self, patient_id: str, doc_id: str, raw_text: str):
        """Phase 8: Patient-Specific RAG. Stores text strictly isolated by Patient ID."""
        splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=100)
        chunks = splitter.split_text(raw_text)
        
        # We attach the patient_id as metadata to EVERY chunk.
        metadatas = [{"patient_id": patient_id, "doc_id": doc_id} for _ in chunks]
        
        self.vector_store.add_texts(texts=chunks, metadatas=metadatas)
        self.vector_store.persist()

    def query_patient_history(self, patient_id: str, current_complaint: str) -> str:
        """Retrieves ONLY documents belonging to the specific patient relevant to the complaint."""
        # Strict Isolation: Filter by patient_id
        results = self.vector_store.similarity_search(
            query=current_complaint, 
            k=3, 
            filter={"patient_id": patient_id}
        )
        
        if not results:
            return "No relevant previous medical reports found."
            
        history = "\n".join([doc.page_content for doc in results])
        # In a full implementation, you would pass this 'history' string to an LLM to summarize it.
        return f"Found relevant history from past reports: {history[:500]}..."