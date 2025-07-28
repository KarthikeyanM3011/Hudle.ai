# import google.generativeai as genai
# from ..core.config import settings
# from typing import List, Optional
# import logging

# # Set up logging
# logger = logging.getLogger(__name__)

# class GeminiService:
#     def __init__(self):
#         try:
#             genai.configure(api_key=settings.GEMINI_API_KEY)
#             self.model = genai.GenerativeModel('gemini-pro')
#             logger.info("Gemini AI service initialized successfully")
#         except Exception as e:
#             logger.error(f"Failed to initialize Gemini AI service: {e}")
#             self.model = None
    
#     def generate_response(
#         self,
#         user_message: str,
#         coach_role: str,
#         coach_description: str,
#         domain_expertise: str,
#         pdf_content: Optional[str] = None,
#         chat_history: Optional[List[dict]] = None
#     ) -> str:
#         try:
#             if not self.model:
#                 return "I apologize, but the AI service is currently unavailable. Please try again later."
            
#             if not user_message or not user_message.strip():
#                 return "I didn't catch that. Could you please repeat your question?"
            
#             prompt = self._build_prompt(
#                 user_message, coach_role, coach_description, 
#                 domain_expertise, pdf_content, chat_history
#             )
            
#             logger.info(f"Generating response for user message: '{user_message[:100]}...'")
            
#             # Generate content with safety settings
#             response = self.model.generate_content(
#                 prompt,
#                 safety_settings=[
#                     {
#                         "category": "HARM_CATEGORY_HARASSMENT",
#                         "threshold": "BLOCK_MEDIUM_AND_ABOVE"
#                     },
#                     {
#                         "category": "HARM_CATEGORY_HATE_SPEECH",
#                         "threshold": "BLOCK_MEDIUM_AND_ABOVE"
#                     },
#                     {
#                         "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
#                         "threshold": "BLOCK_MEDIUM_AND_ABOVE"
#                     },
#                     {
#                         "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
#                         "threshold": "BLOCK_MEDIUM_AND_ABOVE"
#                     }
#                 ],
#                 generation_config={
#                     "temperature": 0.7,
#                     "top_p": 0.8,
#                     "top_k": 40,
#                     "max_output_tokens": 500,
#                 }
#             )
            
#             if response and response.text:
#                 generated_text = response.text.strip()
#                 logger.info(f"Successfully generated response: '{generated_text[:100]}...'")
#                 return generated_text
#             else:
#                 logger.warning("Gemini returned empty response")
#                 return "I understand your question, but I'm having trouble formulating a response right now. Could you try rephrasing it?"
                
#         except Exception as e:
#             logger.error(f"Error generating response: {e}")
#             return self._get_fallback_response(user_message, coach_role)
    
#     def generate_summary(self, transcript: str) -> dict:
#         try:
#             if not self.model:
#                 return {
#                     "summary": "AI service unavailable for summary generation",
#                     "key_points": "Unable to extract key points",
#                     "action_items": "Unable to generate action items"
#                 }
            
#             if not transcript or len(transcript.strip()) < 10:
#                 return {
#                     "summary": "Meeting was too short to generate a meaningful summary",
#                     "key_points": "No significant discussion points identified",
#                     "action_items": "No action items identified"
#                 }
            
#             prompt = f"""
#             Analyze this coaching session transcript and provide:
            
#             1. SUMMARY: A concise 2-3 sentence summary of the main discussion
#             2. KEY POINTS: The most important topics or insights discussed (as bullet points)
#             3. ACTION ITEMS: Specific next steps or recommendations for the coachee (as bullet points)
            
#             Transcript:
#             {transcript[:2000]}  # Limit to avoid token limits
            
#             Format your response exactly as:
#             SUMMARY:
#             [Your summary here]
            
#             KEY POINTS:
#             • [Point 1]
#             • [Point 2]
#             • [Point 3]
            
#             ACTION ITEMS:
#             • [Action 1]
#             • [Action 2]
#             • [Action 3]
#             """
            
#             response = self.model.generate_content(
#                 prompt,
#                 generation_config={
#                     "temperature": 0.5,
#                     "top_p": 0.8,
#                     "max_output_tokens": 800,
#                 }
#             )
            
#             if response and response.text:
#                 return self._parse_summary_response(response.text)
#             else:
#                 return self._get_default_summary()
                
#         except Exception as e:
#             logger.error(f"Error generating summary: {e}")
#             return self._get_default_summary()
    
#     def _build_prompt(
#         self,
#         user_message: str,
#         coach_role: str,
#         coach_description: str,
#         domain_expertise: str,
#         pdf_content: Optional[str] = None,
#         chat_history: Optional[List[dict]] = None
#     ) -> str:
#         prompt = f"""You are an AI coach named {coach_role} with expertise in {domain_expertise}.

# Your personality and coaching style: {coach_description}

# IMPORTANT COACHING GUIDELINES:
# - Be supportive, encouraging, and constructive
# - Ask thoughtful follow-up questions to deepen understanding
# - Provide specific, actionable advice
# - Use examples when helpful
# - Keep responses conversational and under 200 words
# - Stay in character as the specified coach type
# - Be empathetic and understanding

# """
        
#         if pdf_content and len(pdf_content.strip()) > 0:
#             prompt += f"""
# ADDITIONAL KNOWLEDGE BASE:
# {pdf_content[:1500]}  # Limit to avoid token overflow

# Use this knowledge to enhance your coaching when relevant.

# """
        
#         if chat_history and len(chat_history) > 0:
#             prompt += "RECENT CONVERSATION CONTEXT:\n"
#             for msg in chat_history[-5:]:  # Only last 5 messages for context
#                 role = "User" if msg["is_user"] else "Coach"
#                 prompt += f"{role}: {msg['message']}\n"
#             prompt += "\n"
        
#         prompt += f"""USER'S CURRENT MESSAGE: {user_message}

# Please respond as the AI coach, providing helpful guidance while staying true to your role and personality. Be engaging and supportive."""
        
#         return prompt
    
#     def _get_fallback_response(self, user_message: str, coach_role: str) -> str:
#         """Generate a fallback response when AI service fails"""
#         fallback_responses = [
#             f"As your {coach_role}, I understand you're asking about something important. While I'm experiencing some technical difficulties right now, I want to help you work through this. Could you tell me more about what specifically you'd like guidance on?",
            
#             f"I appreciate you sharing that with me. As your {coach_role}, I'm here to support you, though I'm having some technical challenges at the moment. What's the main thing you're hoping to achieve or improve?",
            
#             f"Thank you for that question. While I'm having some connectivity issues right now, I don't want that to stop our progress. Can you help me understand what outcome you're looking for?",
            
#             f"I hear you, and as your {coach_role}, I want to make sure I give you the best guidance possible. I'm experiencing some technical difficulties, but let's work through this together. What's your biggest challenge right now?"
#         ]
        
#         # Simple hash to get consistent response for same input
#         response_index = len(user_message) % len(fallback_responses)
#         return fallback_responses[response_index]
    
#     def _parse_summary_response(self, response_text: str) -> dict:
#         try:
#             # Initialize default values
#             summary = ""
#             key_points = ""
#             action_items = ""
            
#             # Split response by sections
#             sections = response_text.upper()
            
#             if "SUMMARY:" in sections:
#                 # Extract summary
#                 summary_start = response_text.upper().find("SUMMARY:") + 8
#                 key_points_start = response_text.upper().find("KEY POINTS:")
                
#                 if key_points_start > summary_start:
#                     summary = response_text[summary_start:key_points_start].strip()
#                 else:
#                     summary = response_text[summary_start:].strip()
            
#             if "KEY POINTS:" in sections:
#                 # Extract key points
#                 key_start = response_text.upper().find("KEY POINTS:") + 11
#                 action_start = response_text.upper().find("ACTION ITEMS:")
                
#                 if action_start > key_start:
#                     key_points = response_text[key_start:action_start].strip()
#                 else:
#                     key_points = response_text[key_start:].strip()
            
#             if "ACTION ITEMS:" in sections:
#                 # Extract action items
#                 action_start = response_text.upper().find("ACTION ITEMS:") + 13
#                 action_items = response_text[action_start:].strip()
            
#             return {
#                 "summary": summary if summary else "Meeting summary generated successfully",
#                 "key_points": key_points if key_points else "Key discussion points were covered",
#                 "action_items": action_items if action_items else "Follow-up actions were discussed"
#             }
            
#         except Exception as e:
#             logger.error(f"Error parsing summary response: {e}")
#             return self._get_default_summary()
    
#     def _get_default_summary(self) -> dict:
#         return {
#             "summary": "A productive coaching session was completed with valuable insights shared.",
#             "key_points": "• Important topics were discussed\n• Progress was made on key objectives\n• Next steps were identified",
#             "action_items": "• Continue working on discussed strategies\n• Apply insights from the session\n• Schedule follow-up as needed"
#         }

# gemini_service = GeminiService()

from together import Together
from ..core.config import settings
from typing import List, Optional
import logging

# Set up logging
logger = logging.getLogger(__name__)

class GeminiService:
    def __init__(self):
        try:
            # Check if API key exists
            api_key = "b17655f118de9d5c8ca6c5c476e7a2accd8fe863a6d7ee98c735d7c33112e871"
            if not api_key:
                logger.error("TOGETHER_API_KEY not found in settings")
                raise ValueError("TOGETHER_API_KEY is required")
            
            self.client = Together(api_key=api_key)
            self.model = "Qwen/Qwen3-Coder-480B-A35B-Instruct-FP8"
            
            # Test the connection with a simple call
            test_response = self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": "Hello"}],
                max_tokens=10
            )
            
            logger.info(f"Together AI service initialized successfully with model: {self.model}")
        except Exception as e:
            logger.error(f"Failed to initialize Together AI service: {e}")
            logger.error(f"API Key present: {bool(getattr(settings, 'TOGETHER_API_KEY', None))}")
            logger.error(f"Model name: {getattr(settings, 'TOGETHER_MODEL_NAME', 'default')}")
            self.client = None
            self.model = None
    
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
            if not self.client or not self.model:
                logger.error("Together AI client or model not initialized")
                return "I apologize, but the AI service is currently unavailable. Please try again later."
            
            if not user_message or not user_message.strip():
                return "I didn't catch that. Could you please repeat your question?"
            
            prompt = self._build_prompt(
                user_message, coach_role, coach_description, 
                domain_expertise, pdf_content, chat_history
            )
            
            logger.info(f"Generating response for user message: '{user_message[:100]}...'")
            logger.info(f"Using model: {self.model}")
            
            # Generate content using Together AI
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                top_p=0.8,
                max_tokens=500,
                stream=False
            )
            
            if response and response.choices and len(response.choices) > 0:
                generated_text = response.choices[0].message.content
                if generated_text:
                    generated_text = generated_text.strip()
                    logger.info(f"Successfully generated response: '{generated_text[:100]}...'")
                    return generated_text
                else:
                    logger.warning("Together AI returned empty content")
                    return "I understand your question, but I'm having trouble formulating a response right now. Could you try rephrasing it?"
            else:
                logger.warning("Together AI returned no choices")
                return "I understand your question, but I'm having trouble formulating a response right now. Could you try rephrasing it?"
                
        except Exception as e:
            logger.error(f"Error generating response: {e}")
            logger.error(f"Error type: {type(e).__name__}")
            return self._get_fallback_response(user_message, coach_role)
    
    def generate_summary(self, transcript: str) -> dict:
        try:
            if not self.client:
                return {
                    "summary": "AI service unavailable for summary generation",
                    "key_points": "Unable to extract key points",
                    "action_items": "Unable to generate action items"
                }
            
            if not transcript or len(transcript.strip()) < 10:
                return {
                    "summary": "Meeting was too short to generate a meaningful summary",
                    "key_points": "No significant discussion points identified",
                    "action_items": "No action items identified"
                }
            
            prompt = f"""
            Analyze this coaching session transcript and provide:
            
            1. SUMMARY: A concise 2-3 sentence summary of the main discussion
            2. KEY POINTS: The most important topics or insights discussed (as bullet points)
            3. ACTION ITEMS: Specific next steps or recommendations for the coachee (as bullet points)
            
            Transcript:
            {transcript[:2000]}  # Limit to avoid token limits
            
            Format your response exactly as:
            SUMMARY:
            [Your summary here]
            
            KEY POINTS:
            • [Point 1]
            • [Point 2]
            • [Point 3]
            
            ACTION ITEMS:
            • [Action 1]
            • [Action 2]
            • [Action 3]
            """
            
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "user", "content": prompt}
                ],
                temperature=0.5,
                top_p=0.8,
                max_tokens=800,
                stream=False
            )
            
            if response and response.choices and len(response.choices) > 0:
                return self._parse_summary_response(response.choices[0].message.content)
            else:
                return self._get_default_summary()
                
        except Exception as e:
            logger.error(f"Error generating summary: {e}")
            return self._get_default_summary()
    
    def _build_prompt(
        self,
        user_message: str,
        coach_role: str,
        coach_description: str,
        domain_expertise: str,
        pdf_content: Optional[str] = None,
        chat_history: Optional[List[dict]] = None
    ) -> str:
        prompt = f"""You are an AI coach named {coach_role} with expertise in {domain_expertise}.

Your personality and coaching style: {coach_description}

IMPORTANT COACHING GUIDELINES:
- Be supportive, encouraging, and constructive
- Ask thoughtful follow-up questions to deepen understanding
- Provide specific, actionable advice
- Use examples when helpful
- Keep responses conversational and under 200 words
- Stay in character as the specified coach type
- Be empathetic and understanding

"""
        
        if pdf_content and len(pdf_content.strip()) > 0:
            prompt += f"""
ADDITIONAL KNOWLEDGE BASE:
{pdf_content[:1500]}  # Limit to avoid token overflow

Use this knowledge to enhance your coaching when relevant.

"""
        
        if chat_history and len(chat_history) > 0:
            prompt += "RECENT CONVERSATION CONTEXT:\n"
            for msg in chat_history[-5:]:  # Only last 5 messages for context
                role = "User" if msg["is_user"] else "Coach"
                prompt += f"{role}: {msg['message']}\n"
            prompt += "\n"
        
        prompt += f"""USER'S CURRENT MESSAGE: {user_message}

Please respond as the AI coach, providing helpful guidance while staying true to your role and personality. Be engaging and supportive."""
        
        return prompt
    
    def _get_fallback_response(self, user_message: str, coach_role: str) -> str:
        """Generate a fallback response when AI service fails"""
        fallback_responses = [
            f"As your {coach_role}, I understand you're asking about something important. While I'm experiencing some technical difficulties right now, I want to help you work through this. Could you tell me more about what specifically you'd like guidance on?",
            
            f"I appreciate you sharing that with me. As your {coach_role}, I'm here to support you, though I'm having some technical challenges at the moment. What's the main thing you're hoping to achieve or improve?",
            
            f"Thank you for that question. While I'm having some connectivity issues right now, I don't want that to stop our progress. Can you help me understand what outcome you're looking for?",
            
            f"I hear you, and as your {coach_role}, I want to make sure I give you the best guidance possible. I'm experiencing some technical difficulties, but let's work through this together. What's your biggest challenge right now?"
        ]
        
        # Simple hash to get consistent response for same input
        response_index = len(user_message) % len(fallback_responses)
        return fallback_responses[response_index]
    
    def _parse_summary_response(self, response_text: str) -> dict:
        try:
            # Initialize default values
            summary = ""
            key_points = ""
            action_items = ""
            
            # Split response by sections
            sections = response_text.upper()
            
            if "SUMMARY:" in sections:
                # Extract summary
                summary_start = response_text.upper().find("SUMMARY:") + 8
                key_points_start = response_text.upper().find("KEY POINTS:")
                
                if key_points_start > summary_start:
                    summary = response_text[summary_start:key_points_start].strip()
                else:
                    summary = response_text[summary_start:].strip()
            
            if "KEY POINTS:" in sections:
                # Extract key points
                key_start = response_text.upper().find("KEY POINTS:") + 11
                action_start = response_text.upper().find("ACTION ITEMS:")
                
                if action_start > key_start:
                    key_points = response_text[key_start:action_start].strip()
                else:
                    key_points = response_text[key_start:].strip()
            
            if "ACTION ITEMS:" in sections:
                # Extract action items
                action_start = response_text.upper().find("ACTION ITEMS:") + 13
                action_items = response_text[action_start:].strip()
            
            return {
                "summary": summary if summary else "Meeting summary generated successfully",
                "key_points": key_points if key_points else "Key discussion points were covered",
                "action_items": action_items if action_items else "Follow-up actions were discussed"
            }
            
        except Exception as e:
            logger.error(f"Error parsing summary response: {e}")
            return self._get_default_summary()
    
    def _get_default_summary(self) -> dict:
        return {
            "summary": "A productive coaching session was completed with valuable insights shared.",
            "key_points": "• Important topics were discussed\n• Progress was made on key objectives\n• Next steps were identified",
            "action_items": "• Continue working on discussed strategies\n• Apply insights from the session\n• Schedule follow-up as needed"
        }

gemini_service = GeminiService()