const axios = require('axios');

class ElevenLabsService {
    constructor() {
        this.apiKey = process.env.ELEVENLABS_API_KEY;
        this.baseUrl = 'https://api.elevenlabs.io/v1';
        this.defaultVoiceId = 'EXAVITQu4vr4xnSDxMaL';
    }

    async generateSpeech(text, voiceId = null, options = {}) {
        try {
            if (!this.apiKey) {
                throw new Error('ElevenLabs API key not configured');
            }

            const selectedVoiceId = voiceId || this.defaultVoiceId;
            
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
                `${this.baseUrl}/text-to-speech/${selectedVoiceId}`,
                requestData,
                {
                    headers: {
                        'Accept': 'audio/mpeg',
                        'Content-Type': 'application/json',
                        'xi-api-key': this.apiKey
                    },
                    responseType: 'arraybuffer',
                    timeout: 30000
                }
            );

            return Buffer.from(response.data);
        } catch (error) {
            console.error('ElevenLabs speech generation error:', error);
            throw new Error('Failed to generate speech');
        }
    }

    async streamSpeech(text, voiceId = null, options = {}) {
        try {
            if (!this.apiKey) {
                throw new Error('ElevenLabs API key not configured');
            }

            const selectedVoiceId = voiceId || this.defaultVoiceId;
            
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
                `${this.baseUrl}/text-to-speech/${selectedVoiceId}/stream`,
                requestData,
                {
                    headers: {
                        'Accept': 'audio/mpeg',
                        'Content-Type': 'application/json',
                        'xi-api-key': this.apiKey
                    },
                    responseType: 'stream',
                    timeout: 30000
                }
            );

            return response.data;
        } catch (error) {
            console.error('ElevenLabs speech streaming error:', error);
            throw new Error('Failed to stream speech');
        }
    }

    async getVoiceDetails(voiceId) {
        try {
            if (!this.apiKey) {
                return null;
            }

            const response = await axios.get(
                `${this.baseUrl}/voices/${voiceId}`,
                {
                    headers: {
                        'xi-api-key': this.apiKey
                    }
                }
            );

            return response.data;
        } catch (error) {
            console.error('Error fetching voice details:', error);
            return null;
        }
    }

    async optimizeTextForSpeech(text) {
        let optimized = text
            .replace(/\n+/g, '. ')
            .replace(/\s+/g, ' ')
            .replace(/([.!?])\s*([A-Z])/g, '$1 $2')
            .trim();

        if (optimized.length > 1000) {
            const sentences = optimized.split(/[.!?]+/);
            optimized = sentences.slice(0, 8).join('. ') + '.';
        }

        optimized = optimized
            .replace(/\b(um|uh|er|ah)\b/gi, '')
            .replace(/\s{2,}/g, ' ')
            .trim();

        return optimized;
    }

    async batchGenerateSpeech(textChunks, voiceId = null, options = {}) {
        const results = [];
        
        for (const text of textChunks) {
            try {
                const optimizedText = await this.optimizeTextForSpeech(text);
                const audioBuffer = await this.generateSpeech(optimizedText, voiceId, options);
                results.push({
                    text: optimizedText,
                    audio: audioBuffer,
                    success: true
                });
            } catch (error) {
                console.error(`Error generating speech for chunk: ${text.slice(0, 50)}...`, error);
                results.push({
                    text: text,
                    audio: null,
                    success: false,
                    error: error.message
                });
            }
            
            await this.delay(100);
        }

        return results;
    }

    splitTextIntoChunks(text, maxLength = 800) {
        if (text.length <= maxLength) {
            return [text];
        }

        const sentences = text.split(/[.!?]+/);
        const chunks = [];
        let currentChunk = '';

        for (const sentence of sentences) {
            if ((currentChunk + sentence).length <= maxLength) {
                currentChunk += (currentChunk ? '. ' : '') + sentence.trim();
            } else {
                if (currentChunk) {
                    chunks.push(currentChunk + '.');
                }
                currentChunk = sentence.trim();
            }
        }

        if (currentChunk) {
            chunks.push(currentChunk + '.');
        }

        return chunks;
    }

    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    validateVoiceSettings(settings) {
        const validated = { ...settings };

        if (validated.stability !== undefined) {
            validated.stability = Math.max(0, Math.min(1, validated.stability));
        }

        if (validated.clarity !== undefined) {
            validated.clarity = Math.max(0, Math.min(1, validated.clarity));
        }

        if (validated.style !== undefined) {
            validated.style = Math.max(0, Math.min(1, validated.style));
        }

        return validated;
    }

    getOptimalSettingsForCoaching() {
        return {
            stability: 0.6,
            clarity: 0.85,
            style: 0.2,
            speakerBoost: true,
            model: 'eleven_monolingual_v1'
        };
    }

    getEmotionalSettings(emotion) {
        const settings = {
            confident: { stability: 0.7, clarity: 0.9, style: 0.3 },
            supportive: { stability: 0.8, clarity: 0.85, style: 0.1 },
            encouraging: { stability: 0.6, clarity: 0.8, style: 0.4 },
            professional: { stability: 0.75, clarity: 0.9, style: 0.2 },
            friendly: { stability: 0.65, clarity: 0.8, style: 0.3 },
            calm: { stability: 0.85, clarity: 0.8, style: 0.1 }
        };

        return settings[emotion] || settings.professional;
    }
}

module.exports = new ElevenLabsService();