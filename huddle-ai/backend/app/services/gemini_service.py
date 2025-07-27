import google.generativeai as genai
from ..core.config import settings
from typing import List, Optional

class GeminiService:
    def __init__(self):
        genai.configure(api_key=settings.GEMINI_API_KEY)
        self.model = genai.GenerativeModel('gemini-pro')
    
    def generate_response(
        self,
        user_message: str,
        coach_role: str,
        coach_description: str,
        domain_expertise: str,
        pdf_content: Optional[str] = None,
        chat_history: Optional[List[dict]] = None
    ) -> str:
        try:
            prompt = self._build_prompt(
                user_message, coach_role, coach_description, 
                domain_expertise, pdf_content, chat_history
            )
            
            response = self.model.generate_content(prompt)
            return response.text
        except Exception as e:
            return f"I apologize, but I'm having trouble processing your request right now. Error: {str(e)}"
    
    def generate_summary(self, transcript: str) -> dict:
        try:
            prompt = f"""
            Based on the following meeting transcript, please provide:
            1. A concise summary (2-3 sentences)
            2. Key discussion points (bullet points)
            3. Action items or recommendations (bullet points)
            
            Transcript:
            {transcript}
            
            Please format your response as:
            SUMMARY:
            [summary text]
            
            KEY POINTS:
            - [point 1]
            - [point 2]
            
            ACTION ITEMS:
            - [item 1]
            - [item 2]
            """
            
            response = self.model.generate_content(prompt)
            return self._parse_summary_response(response.text)
        except Exception as e:
            return {
                "summary": "Error generating summary",
                "key_points": "Error extracting key points",
                "action_items": "Error generating action items"
            }
    
    def _build_prompt(
        self,
        user_message: str,
        coach_role: str,
        coach_description: str,
        domain_expertise: str,
        pdf_content: Optional[str] = None,
        chat_history: Optional[List[dict]] = None
    ) -> str:
        prompt = f"""
        You are {coach_role} specializing in {domain_expertise}.
        
        Your behavior and personality: {coach_description}
        
        """
        
        if pdf_content:
            prompt += f"""
        Additional knowledge base:
        {pdf_content[:2000]}
        
        """
        
        if chat_history:
            prompt += "Previous conversation context:\n"
            for msg in chat_history[-5:]:
                role = "User" if msg["is_user"] else "AI Coach"
                prompt += f"{role}: {msg['message']}\n"
            prompt += "\n"
        
        prompt += f"""
        Current user message: {user_message}
        
        Please respond as the AI coach, staying in character and providing helpful, relevant advice.
        Keep responses conversational and under 200 words.
        """
        
        return prompt
    
    def _parse_summary_response(self, response_text: str) -> dict:
        try:
            sections = response_text.split("SUMMARY:")
            if len(sections) < 2:
                return {"summary": response_text, "key_points": "", "action_items": ""}
            
            content = sections[1]
            
            if "KEY POINTS:" in content:
                summary_part, rest = content.split("KEY POINTS:", 1)
                summary = summary_part.strip()
                
                if "ACTION ITEMS:" in rest:
                    key_points_part, action_items_part = rest.split("ACTION ITEMS:", 1)
                    key_points = key_points_part.strip()
                    action_items = action_items_part.strip()
                else:
                    key_points = rest.strip()
                    action_items = ""
            else:
                summary = content.strip()
                key_points = ""
                action_items = ""
            
            return {
                "summary": summary,
                "key_points": key_points,
                "action_items": action_items
            }
        except Exception:
            return {
                "summary": response_text,
                "key_points": "",
                "action_items": ""
            }

gemini_service = GeminiService()