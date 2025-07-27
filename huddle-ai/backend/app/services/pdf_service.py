import fitz
import os
from typing import Optional
from .core.config import settings

class PDFService:
    def __init__(self):
        self.upload_dir = settings.UPLOAD_DIR
        os.makedirs(self.upload_dir, exist_ok=True)
    
    def extract_text_from_pdf(self, file_path: str) -> Optional[str]:
        try:
            doc = fitz.open(file_path)
            text = ""
            
            for page_num in range(len(doc)):
                page = doc.load_page(page_num)
                text += page.get_text()
            
            doc.close()
            return text.strip()
        except Exception as e:
            print(f"PDF extraction error: {e}")
            return None
    
    async def save_and_extract_pdf(self, file_content: bytes, filename: str) -> tuple[str, Optional[str]]:
        try:
            file_path = os.path.join(self.upload_dir, filename)
            
            with open(file_path, "wb") as f:
                f.write(file_content)
            
            extracted_text = self.extract_text_from_pdf(file_path)
            
            return file_path, extracted_text
        except Exception as e:
            print(f"Save PDF error: {e}")
            return "", None
    
    def delete_pdf(self, file_path: str):
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
        except Exception as e:
            print(f"Delete PDF error: {e}")

pdf_service = PDFService()