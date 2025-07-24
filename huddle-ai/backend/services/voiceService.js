const axios = require('axios');

class VoiceService {
    constructor() {
        this.apiKey = process.env.ELEVENLABS_API_KEY;
        this.baseUrl = 'https://api.elevenlabs.io/v1';
        this.headers = {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': this.apiKey
        };
    }

    async getAvailableVoices() {
        try {
            if (!this.apiKey) {
                return this.getDefaultVoices();
            }

            const response = await axios.get(`${this.baseUrl}/voices`, {
                headers: {
                    'xi-api-key': this.apiKey
                }
            });

            return response.data.voices.map(voice => ({
                voiceId: voice.voice_id,
                name: voice.name,
                category: voice.category || 'general',
                description: voice.description || '',
                gender: this.detectGender(voice.name),
                accent: voice.labels?.accent || 'american',
                age: voice.labels?.age || 'adult',
                useCase: voice.labels?.use_case || 'general',
                previewUrl: voice.preview_url
            }));
        } catch (error) {
            console.error('Error fetching voices:', error);
            return this.getDefaultVoices();
        }
    }

    async generateSpeech(text, voiceId, options = {}) {
        try {
            if (!this.apiKey) {
                throw new Error('ElevenLabs API key not configured');
            }

            const requestData = {
                text: text,
                model_id: options.model || 'eleven_monolingual_v1',
                voice_settings: {
                    stability: options.stability || 0.5,
                    similarity_boost: options.clarity || 0.8,
                    style: options.style || 0.0,
                    use_speaker_boost: options.speakerBoost || true
                }
            };

            const response = await axios.post(
                `${this.baseUrl}/text-to-speech/${voiceId}`,
                requestData,
                {
                    headers: this.headers,
                    responseType: 'arraybuffer'
                }
            );

            return response.data;
        } catch (error) {
            console.error('Error generating speech:', error);
            throw new Error('Failed to generate speech');
        }
    }

    async previewVoice(voiceId, text = "Hello, I'm your AI coach. I'm here to help you achieve your goals through personalized guidance and support.") {
        try {
            const audioBuffer = await this.generateSpeech(text, voiceId, {
                stability: 0.7,
                clarity: 0.8
            });

            return {
                audioBuffer,
                contentType: 'audio/mpeg',
                filename: `voice_preview_${voiceId}.mp3`
            };
        } catch (error) {
            console.error('Error generating voice preview:', error);
            throw new Error('Failed to generate voice preview');
        }
    }

    async getVoicesForCoaching() {
        const allVoices = await this.getAvailableVoices();
        
        return allVoices.filter(voice => 
            voice.useCase === 'general' || 
            voice.useCase === 'narration' ||
            voice.useCase === 'conversation'
        ).map(voice => ({
            ...voice,
            recommended: this.isRecommendedForCoaching(voice)
        }));
    }

    isRecommendedForCoaching(voice) {
        const coachingKeywords = ['professional', 'clear', 'warm', 'confident', 'mature'];
        const voiceName = voice.name.toLowerCase();
        const description = (voice.description || '').toLowerCase();
        
        return coachingKeywords.some(keyword => 
            voiceName.includes(keyword) || description.includes(keyword)
        );
    }

    detectGender(voiceName) {
        const femaleIndicators = ['female', 'woman', 'girl', 'she'];
        const maleIndicators = ['male', 'man', 'boy', 'he'];
        
        const lowerName = voiceName.toLowerCase();
        
        if (femaleIndicators.some(indicator => lowerName.includes(indicator))) {
            return 'female';
        }
        if (maleIndicators.some(indicator => lowerName.includes(indicator))) {
            return 'male';
        }
        
        return 'neutral';
    }

    getDefaultVoices() {
        return [
            {
                voiceId: 'default-professional-male',
                name: 'Professional Male',
                category: 'professional',
                description: 'Clear, confident male voice suitable for professional coaching',
                gender: 'male',
                accent: 'american',
                age: 'adult',
                useCase: 'general',
                recommended: true,
                isDefault: true
            },
            {
                voiceId: 'default-professional-female',
                name: 'Professional Female',
                category: 'professional',
                description: 'Warm, clear female voice ideal for supportive coaching',
                gender: 'female',
                accent: 'american',
                age: 'adult',
                useCase: 'general',
                recommended: true,
                isDefault: true
            },
            {
                voiceId: 'default-friendly-male',
                name: 'Friendly Male',
                category: 'casual',
                description: 'Approachable male voice for relaxed coaching sessions',
                gender: 'male',
                accent: 'american',
                age: 'adult',
                useCase: 'conversation',
                recommended: true,
                isDefault: true
            },
            {
                voiceId: 'default-supportive-female',
                name: 'Supportive Female',
                category: 'supportive',
                description: 'Gentle, encouraging female voice for sensitive coaching topics',
                gender: 'female',
                accent: 'american',
                age: 'adult',
                useCase: 'general',
                recommended: true,
                isDefault: true
            },
            {
                voiceId: 'default-energetic-male',
                name: 'Energetic Male',
                category: 'motivational',
                description: 'Dynamic, enthusiastic male voice for high-energy coaching',
                gender: 'male',
                accent: 'american',
                age: 'adult',
                useCase: 'general',
                recommended: false,
                isDefault: true
            }
        ];
    }

    getVoicesByCategory(category) {
        return this.getAvailableVoices().then(voices => 
            voices.filter(voice => voice.category === category)
        );
    }

    getVoicesByGender(gender) {
        return this.getAvailableVoices().then(voices => 
            voices.filter(voice => voice.gender === gender)
        );
    }

    getRecommendedVoices(coachType) {
        const recommendations = {
            interview: ['professional-male', 'professional-female'],
            sales: ['energetic-male', 'confident-female'],
            language: ['supportive-female', 'patient-male'],
            career: ['professional-female', 'wise-male'],
            presentation: ['clear-male', 'articulate-female']
        };

        return this.getAvailableVoices().then(voices => {
            const recommendedIds = recommendations[coachType] || recommendations.interview;
            return voices.filter(voice => 
                recommendedIds.some(id => voice.voiceId.includes(id) || voice.name.toLowerCase().includes(id))
            );
        });
    }

    async validateVoiceConfig(voiceConfig) {
        const { voiceId, stability, clarity, speed } = voiceConfig;

        if (!voiceId) {
            return { valid: false, error: 'Voice ID is required' };
        }

        if (stability !== undefined && (stability < 0 || stability > 1)) {
            return { valid: false, error: 'Stability must be between 0 and 1' };
        }

        if (clarity !== undefined && (clarity < 0 || clarity > 1)) {
            return { valid: false, error: 'Clarity must be between 0 and 1' };
        }

        if (speed !== undefined && (speed < 0.5 || speed > 2.0)) {
            return { valid: false, error: 'Speed must be between 0.5 and 2.0' };
        }

        try {
            const voices = await this.getAvailableVoices();
            const voiceExists = voices.some(voice => voice.voiceId === voiceId);
            
            if (!voiceExists) {
                return { valid: false, error: 'Voice ID not found' };
            }

            return { valid: true };
        } catch (error) {
            return { valid: false, error: 'Unable to validate voice configuration' };
        }
    }
}

module.exports = new VoiceService();