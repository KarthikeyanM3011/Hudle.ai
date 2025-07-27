from deepgram import Deepgram
from .core.config import settings
from .models.ai_profile import Gender
import asyncio
import aiohttp
from typing import Optional

class DeepgramService:
    def __init__(self):
        self.deepgram = Deepgram(settings.DEEPGRAM_API_KEY)
    
    async def transcribe_audio(self, audio_data: bytes) -> str:
        try:
            source = {'buffer': audio_data, 'mimetype': 'audio/wav'}
            
            options = {
                'model': 'nova-2',
                'language': 'en-US',
                'smart_format': True,
                'punctuate': True
            }
            
            response = await self.deepgram.transcription.prerecorded(source, options)
            
            if response['results']['channels'][0]['alternatives']:
                return response['results']['channels'][0]['alternatives'][0]['transcript']
            return ""
        except Exception as e:
            print(f"Transcription error: {e}")
            return ""
    
    async def text_to_speech(self, text: str, gender: Gender) -> Optional[bytes]:
        try:
            voice = "aura-luna-en" if gender == Gender.FEMALE else "aura-orion-en"
            
            url = "https://api.deepgram.com/v1/speak"
            headers = {
                "Authorization": f"Token {settings.DEEPGRAM_API_KEY}",
                "Content-Type": "application/json"
            }
            
            payload = {
                "text": text,
                "model": voice,
                "encoding": "linear16",
                "sample_rate": 24000
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(url, headers=headers, json=payload) as response:
                    if response.status == 200:
                        return await response.read()
                    return None
        except Exception as e:
            print(f"TTS error: {e}")
            return None

deepgram_service = DeepgramService()