import asyncio
import aiohttp
from ..core.config import settings
from typing import Optional
import logging
import sys

handler = logging.StreamHandler(sys.stdout)
handler.setFormatter(logging.Formatter('%(asctime)s - %(levelname)s - %(message)s'))
handler.setStream(open(sys.stdout.fileno(), mode='w', encoding='utf-8', buffering=1))

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)
logger.addHandler(handler)

class DeepgramService:
    def __init__(self):
        self.api_key = settings.DEEPGRAM_API_KEY
        self.base_url = "https://api.deepgram.com/v1"
        
    def normalize_gender(self, gender):
        """Normalize gender value for voice selection"""
        if not gender:
            return "MALE"
        
        gender_str = str(gender).upper().strip()
        
        # Handle various formats
        if gender_str in ['FEMALE', 'F', 'WOMAN']:
            return "FEMALE"
        else:
            return "MALE"  # Default for any other value
    
    # async def transcribe_audio(self, audio_data: bytes) -> str:
    #     """Transcribe audio to text using Deepgram STT"""
    #     try:
    #         url = f"{self.base_url}/listen"
            
    #         headers = {
    #             "Authorization": f"Token {self.api_key}",
    #             "Content-Type": "audio/wav"
    #         }
            
    #         params = {
    #             "model": "nova-2",
    #             "language": "en-US",
    #             "smart_format": "true",
    #             "punctuate": "true",
    #             "diarize": "false",
    #             "utterances": "true"
    #         }
            
    #         async with aiohttp.ClientSession() as session:
    #             async with session.post(url, headers=headers, params=params, data=audio_data) as response:
    #                 if response.status == 200:
    #                     result = await response.json()
                        
    #                     # Extract transcript from response
    #                     if (result.get("results") and 
    #                         result["results"].get("channels") and 
    #                         len(result["results"]["channels"]) > 0 and
    #                         result["results"]["channels"][0].get("alternatives") and
    #                         len(result["results"]["channels"][0]["alternatives"]) > 0):
                            
    #                         transcript = result["results"]["channels"][0]["alternatives"][0].get("transcript", "")
    #                         logger.info(f"Transcription successful: '{transcript[:100]}...'")
    #                         return transcript.strip()
    #                     else:
    #                         logger.warning("No transcript found in Deepgram response")
    #                         return ""
    #                 else:
    #                     error_text = await response.text()
    #                     logger.error(f"Deepgram STT error {response.status}: {error_text}")
    #                     return ""
                        
    #     except Exception as e:
    #         logger.error(f"Transcription error: {e}")
    #         return ""
    
    # async def text_to_speech(self, text: str, gender) -> Optional[bytes]:
    #     """Convert text to speech using Deepgram TTS"""
    #     try:
    #         if not text or not text.strip():
    #             logger.warning("Empty text provided for TTS")
    #             return None
                
    #         # Normalize gender and select appropriate voice
    #         normalized_gender = self.normalize_gender(gender)
            
    #         # Updated voice models for Deepgram TTS
    #         if normalized_gender == "FEMALE":
    #             voice_model = "aura-luna-en"  # Female voice
    #         else:
    #             voice_model = "aura-orion-en"  # Male voice
            
    #         logger.info(f"Using voice model: {voice_model} for gender: {normalized_gender}")
            
    #         url = f"{self.base_url}/speak"
            
    #         headers = {
    #             "Authorization": f"Token {self.api_key}",
    #             "Content-Type": "application/json"
    #         }
            
    #         # Prepare TTS payload
    #         payload = {
    #             "text": text.strip(),
    #             "model": voice_model,
    #             "encoding": "linear16",
    #             "sample_rate": 24000,
    #             "container": "wav"
    #         }
            
    #         logger.info(f"Sending TTS request for text: '{text[:100]}...'")
            
    #         timeout = aiohttp.ClientTimeout(total=30)  # 30 second timeout
            
    #         async with aiohttp.ClientSession(timeout=timeout) as session:
    #             async with session.post(url, headers=headers, json=payload) as response:
    #                 if response.status == 200:
    #                     audio_data = await response.read()
    #                     logger.info(f"TTS successful: Generated {len(audio_data)} bytes of audio")
    #                     return audio_data
    #                 else:
    #                     error_text = await response.text()
    #                     logger.error(f"Deepgram TTS error {response.status}: {error_text}")
                        
    #                     # Try alternative voice if the first one fails
    #                     if voice_model == "aura-luna-en":
    #                         logger.info("Retrying with alternative female voice...")
    #                         payload["model"] = "aura-stella-en"
    #                     else:
    #                         logger.info("Retrying with alternative male voice...")
    #                         payload["model"] = "aura-zeus-en"
                        
    #                     # Retry with alternative voice
    #                     async with session.post(url, headers=headers, json=payload) as retry_response:
    #                         if retry_response.status == 200:
    #                             audio_data = await retry_response.read()
    #                             logger.info(f"TTS retry successful: Generated {len(audio_data)} bytes of audio")
    #                             return audio_data
    #                         else:
    #                             retry_error = await retry_response.text()
    #                             logger.error(f"TTS retry failed {retry_response.status}: {retry_error}")
    #                             return None
                        
    #     except asyncio.TimeoutError:
    #         logger.error("TTS request timed out")
    #         return None
    #     except Exception as e:
    #         logger.error(f"TTS error: {e}")
    #         return None

    async def transcribe_audio(self, audio_data: bytes) -> str:
        """Transcribe audio to text using Deepgram STT"""
        try:
            url = f"{self.base_url}/listen"

            headers = {
                "Authorization": f"Token {self.api_key}",
                "Content-Type": "audio/wav"
            }

            params = {
                "model": "nova-2",
                "language": "en-US",
                "smart_format": "true",
                "punctuate": "true",
                "diarize": "false",
                "utterances": "true"
            }

            async with aiohttp.ClientSession() as session:
                async with session.post(url, headers=headers, params=params, data=audio_data) as response:
                    if response.status == 200:
                        result = await response.json()

                        # Extract transcript from response
                        if (result.get("results") and 
                            result["results"].get("channels") and 
                            len(result["results"]["channels"]) > 0 and
                            result["results"]["channels"][0].get("alternatives") and
                            len(result["results"]["channels"][0]["alternatives"]) > 0):

                            transcript = result["results"]["channels"][0]["alternatives"][0].get("transcript", "")
                            
                            # UTF-8 safe logging
                            try:
                                logger.info(f"Transcription successful: '{transcript[:100]}...'")
                            except UnicodeEncodeError:
                                safe_transcript = transcript[:100].encode("ascii", errors="ignore").decode()
                                logger.info(f"Transcription successful (partial): '{safe_transcript}...'")

                            return transcript.strip()
                        else:
                            logger.warning("No transcript found in Deepgram response")
                            return ""
                    else:
                        error_text = await response.text()
                        logger.error(f"Deepgram STT error {response.status}: {error_text}")
                        return ""

        except Exception as e:
            logger.exception(f"Exception during transcription: {e}")
            return ""
            
    async def text_to_speech(self, text: str, gender) -> Optional[bytes]:
        """Convert text to speech using Deepgram TTS"""
        try:
            if not text or not text.strip():
                logger.warning("Empty text provided for TTS")
                return None

            # Normalize gender and select voice model
            normalized_gender = self.normalize_gender(gender)

            if normalized_gender == "FEMALE":
                voice_model = "aura-luna-en"
                alt_model = "aura-stella-en"
            else:
                voice_model = "aura-orion-en"
                alt_model = "aura-zeus-en"

            logger.info(f"Using voice model: {voice_model} for gender: {normalized_gender}")

            url = f"{self.base_url}/speak"
            headers = {
                "Authorization": f"Token {self.api_key}",
                "Content-Type": "application/json"
            }

            payload = {
                "text": text.strip()
            }

            timeout = aiohttp.ClientTimeout(total=30)

            async with aiohttp.ClientSession(timeout=timeout) as session:
                async def _post(model_name):
                    params = {"model": model_name}
                    async with session.post(url, headers=headers, json=payload, params=params) as response:
                        if response.status == 200:
                            audio_data = await response.read()
                            logger.info(f"TTS success with {model_name}: {len(audio_data)} bytes")
                            return audio_data
                        else:
                            error_text = await response.text()
                            logger.error(f"TTS failed with {model_name} - Status {response.status}: {error_text}")
                            return None

                # Try primary voice model
                audio_data = await _post(voice_model)
                if audio_data:
                    return audio_data

                logger.info("Retrying with alternative voice model...")
                return await _post(alt_model)

        except asyncio.TimeoutError:
            logger.error("TTS request timed out")
            return None
        except Exception as e:
            logger.error(f"TTS error: {e}")
            return None

        
    async def test_tts_connection(self) -> bool:
        """Test TTS connection with a simple phrase"""
        try:
            test_audio = await self.text_to_speech("Hello, this is a test.", "MALE")
            return test_audio is not None and len(test_audio) > 0
        except Exception as e:
            logger.error(f"TTS connection test failed: {e}")
            return False
    
    def get_available_voices(self):
        """Get list of available voice models"""
        return {
            "male_voices": ["aura-orion-en", "aura-zeus-en", "aura-angus-en"],
            "female_voices": ["aura-luna-en", "aura-stella-en", "aura-athena-en", "aura-hera-en"]
        }

deepgram_service = DeepgramService()