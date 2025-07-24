const axios = require('axios');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

class GeminiService {
    static async generateResponse(messages) {
        try {
            if (!GEMINI_API_KEY) {
                throw new Error('Gemini API key not configured');
            }

            const conversationText = messages
                .map(msg => `${msg.role === 'system' ? 'Instructions' : msg.role}: ${msg.content}`)
                .join('\n\n');

            const response = await axios.post(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
                contents: [{
                    parts: [{
                        text: conversationText + '\n\nAssistant:'
                    }]
                }],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 800,
                    topP: 0.8,
                    topK: 10
                },
                safetySettings: [
                    {
                        category: 'HARM_CATEGORY_HARASSMENT',
                        threshold: 'BLOCK_MEDIUM_AND_ABOVE'
                    },
                    {
                        category: 'HARM_CATEGORY_HATE_SPEECH',
                        threshold: 'BLOCK_MEDIUM_AND_ABOVE'
                    }
                ]
            });

            if (response.data.candidates && response.data.candidates[0]) {
                return response.data.candidates[0].content.parts[0].text;
            } else {
                throw new Error('No response generated');
            }
        } catch (error) {
            console.error('Gemini API error:', error);
            throw new Error('Failed to generate response from Gemini');
        }
    }

    static async generateSummary(conversation) {
        try {
            const conversationText = conversation
                .map(msg => `${msg.role}: ${msg.content}`)
                .join('\n');

            const prompt = `Please summarize this coaching conversation, highlighting key topics, progress, and outcomes:\n\n${conversationText}`;

            const response = await axios.post(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
                contents: [{
                    parts: [{ text: prompt }]
                }],
                generationConfig: {
                    temperature: 0.3,
                    maxOutputTokens: 300
                }
            });

            return response.data.candidates[0].content.parts[0].text;
        } catch (error) {
            console.error('Gemini summary error:', error);
            throw new Error('Failed to generate summary');
        }
    }

    static async extractKeyPoints(conversation) {
        try {
            const conversationText = conversation
                .filter(msg => msg.role === 'user')
                .map(msg => msg.content)
                .join('\n');

            const prompt = `Extract the main themes and key points from this user input. Return as a simple bulleted list:\n\n${conversationText}`;

            const response = await axios.post(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
                contents: [{
                    parts: [{ text: prompt }]
                }],
                generationConfig: {
                    temperature: 0.3,
                    maxOutputTokens: 200
                }
            });

            const result = response.data.candidates[0].content.parts[0].text;
            return result
                .split('\n')
                .filter(line => line.trim())
                .map(line => line.replace(/^[-*•]\s*/, ''));
        } catch (error) {
            console.error('Gemini key points extraction error:', error);
            return [];
        }
    }

    static async generateFollowUpQuestions(lastUserMessage, context) {
        try {
            const prompt = `Generate 2-3 thoughtful follow-up questions based on the user's last message and conversation context. Make them coaching-oriented and designed to deepen understanding.\n\nLast message: "${lastUserMessage}"\nContext: ${context}`;

            const response = await axios.post(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
                contents: [{
                    parts: [{ text: prompt }]
                }],
                generationConfig: {
                    temperature: 0.6,
                    maxOutputTokens: 150
                }
            });

            const result = response.data.candidates[0].content.parts[0].text;
            return result
                .split('\n')
                .filter(line => line.trim() && line.includes('?'))
                .slice(0, 3);
        } catch (error) {
            console.error('Gemini follow-up questions error:', error);
            return [];
        }
    }

    static async analyzeProgress(conversationHistory, coachingGoals) {
        try {
            const prompt = `Analyze the progress made in this coaching conversation against the stated goals. Provide specific insights about improvements and areas for continued focus.\n\nGoals: ${coachingGoals}\nConversation: ${JSON.stringify(conversationHistory.slice(-10))}`;

            const response = await axios.post(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
                contents: [{
                    parts: [{ text: prompt }]
                }],
                generationConfig: {
                    temperature: 0.4,
                    maxOutputTokens: 250
                }
            });

            return response.data.candidates[0].content.parts[0].text;
        } catch (error) {
            console.error('Gemini progress analysis error:', error);
            return 'Unable to analyze progress at this time.';
        }
    }

    static async detectIntent(userMessage) {
        try {
            const prompt = `Classify the user's intent from this message. Return only one of these options: question, practice_request, feedback_request, goal_setting, problem_solving, encouragement_needed, session_end\n\nMessage: "${userMessage}"`;

            const response = await axios.post(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
                contents: [{
                    parts: [{ text: prompt }]
                }],
                generationConfig: {
                    temperature: 0.2,
                    maxOutputTokens: 50
                }
            });

            return response.data.candidates[0].content.parts[0].text.trim().toLowerCase();
        } catch (error) {
            console.error('Gemini intent detection error:', error);
            return 'general';
        }
    }

    static async generateActionItems(conversation) {
        try {
            const prompt = `Based on this coaching conversation, generate 3-5 specific action items the user should focus on. Make them concrete and achievable. Format as numbered list.\n\nConversation: ${JSON.stringify(conversation.slice(-10))}`;

            const response = await axios.post(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
                contents: [{
                    parts: [{ text: prompt }]
                }],
                generationConfig: {
                    temperature: 0.4,
                    maxOutputTokens: 200
                }
            });

            const result = response.data.candidates[0].content.parts[0].text;
            return result
                .split('\n')
                .filter(line => line.trim())
                .map(line => line.replace(/^\d+\.\s*/, ''))
                .slice(0, 5);
        } catch (error) {
            console.error('Gemini action items error:', error);
            return [];
        }
    }
}

module.exports = GeminiService;