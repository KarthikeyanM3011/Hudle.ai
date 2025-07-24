const OpenAI = require('openai');
const axios = require('axios');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

class AIService {
    static async generateResponse(coach, message, provider = 'openai') {
        try {
            const systemPrompt = coach.systemPrompts?.fullPrompt || this.buildSystemPrompt(coach);
            
            if (provider === 'gemini' && GEMINI_API_KEY) {
                return await this.generateGeminiResponse(systemPrompt, message);
            } else {
                return await this.generateOpenAIResponse(systemPrompt, message);
            }
        } catch (error) {
            console.error('AI response generation error:', error);
            throw new Error('Failed to generate AI response');
        }
    }

    static async generateOpenAIResponse(systemPrompt, message) {
        const response = await openai.chat.completions.create({
            model: 'gpt-4-turbo-preview',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: message }
            ],
            max_tokens: 1000,
            temperature: 0.7
        });

        return response.choices[0].message.content;
    }

    static async generateGeminiResponse(systemPrompt, message) {
        const response = await axios.post(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
            contents: [{
                parts: [{
                    text: `${systemPrompt}\n\nUser: ${message}\nAssistant:`
                }]
            }],
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 1000,
                topP: 0.8,
                topK: 10
            }
        });

        return response.data.candidates[0].content.parts[0].text;
    }

    static buildSystemPrompt(coach) {
        const { personality, expertise, name } = coach;
        
        return `You are ${name}, a professional AI coach with the following characteristics:

PERSONALITY TRAITS:
- Extraversion: ${personality.traits?.extraversion || 5}/10
- Empathy: ${personality.traits?.empathy || 7}/10
- Directness: ${personality.traits?.directness || 6}/10
- Patience: ${personality.traits?.patience || 7}/10
- Enthusiasm: ${personality.traits?.enthusiasm || 6}/10
- Professionalism: ${personality.traits?.professionalism || 8}/10

COMMUNICATION STYLE: ${personality.communicationStyle || 'supportive'}
APPROACH METHOD: ${personality.approachMethod || 'balanced'}
RESPONSE LENGTH: ${personality.responseLength || 'moderate'}

EXPERTISE:
- Primary Domain: ${expertise.primaryDomain || 'general coaching'}
- Specializations: ${expertise.specializations?.join(', ') || 'general development'}
- Experience Level: ${expertise.experienceLevel || 'expert'}
- Knowledge Areas: ${expertise.knowledgeAreas?.join(', ') || 'personal development'}

GUIDELINES:
1. Always maintain your coaching persona and stay in character
2. Provide constructive, actionable feedback
3. Ask thoughtful follow-up questions to deepen understanding
4. Adapt your response style to match your personality traits
5. Focus on helping the user achieve their goals
6. Be encouraging while maintaining appropriate challenge level
7. Keep responses focused and relevant to your expertise areas

Remember to embody your personality traits in every response while providing valuable coaching guidance.`;
    }

    static async generateCoachPersonality(traits, domain) {
        try {
            const prompt = `Generate a detailed coaching personality profile for an AI coach with these traits:
            - Domain: ${domain}
            - Traits: ${JSON.stringify(traits)}
            
            Provide:
            1. A brief personality description (2-3 sentences)
            2. Communication style recommendations
            3. Approach method suggestions
            4. Example coaching phrases this personality would use
            
            Format as JSON with keys: description, communicationStyle, approachMethod, examplePhrases`;

            const response = await openai.chat.completions.create({
                model: 'gpt-4-turbo-preview',
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 800,
                temperature: 0.6
            });

            return JSON.parse(response.choices[0].message.content);
        } catch (error) {
            console.error('Personality generation error:', error);
            return this.getDefaultPersonality(domain);
        }
    }

    static getDefaultPersonality(domain) {
        const defaults = {
            interview: {
                description: "Professional and direct coach focused on practical interview preparation with constructive feedback.",
                communicationStyle: "formal",
                approachMethod: "challenging",
                examplePhrases: ["Let's practice that response again", "What specific example can you provide?", "How would you handle a difficult question?"]
            },
            sales: {
                description: "Energetic and motivational coach who builds confidence through practice and positive reinforcement.",
                communicationStyle: "encouraging",
                approachMethod: "goal-oriented",
                examplePhrases: ["That's a great start!", "Let's refine your pitch", "What's your closing strategy?"]
            },
            language: {
                description: "Patient and supportive coach who creates a safe environment for language practice and learning.",
                communicationStyle: "supportive",
                approachMethod: "patient",
                examplePhrases: ["Take your time", "Let's practice pronunciation", "You're making great progress!"]
            }
        };

        return defaults[domain] || defaults.interview;
    }
}

module.exports = AIService;