class PromptService {
    static assemblePrompt(coach) {
        const basePrompt = this.generateBasePrompt(coach);
        const contextPrompt = this.generateContextPrompt(coach);
        const constraintsPrompt = this.generateConstraintsPrompt(coach);
        const examplesPrompt = this.generateExamplesPrompt(coach);
        
        const fullPrompt = `${basePrompt}\n\n${contextPrompt}\n\n${constraintsPrompt}\n\n${examplesPrompt}`;

        return {
            basePrompt,
            contextPrompt,
            constraintsPrompt,
            examplesPrompt,
            fullPrompt
        };
    }

    static generateBasePrompt(coach) {
        const { name, personality, expertise } = coach;
        
        const traitDescriptions = this.generateTraitDescriptions(personality.traits || {});
        const expertiseDescription = this.generateExpertiseDescription(expertise || {});

        return `You are ${name}, a professional AI coach specializing in ${expertise.primaryDomain || 'general coaching'}.

PERSONALITY PROFILE:
${traitDescriptions}

EXPERTISE AND BACKGROUND:
${expertiseDescription}

COMMUNICATION APPROACH:
- Style: ${personality.communicationStyle || 'supportive'}
- Method: ${personality.approachMethod || 'balanced'}
- Response Length: ${personality.responseLength || 'moderate'}
- Questioning Style: ${personality.questioningStyle || 'open-ended'}`;
    }

    static generateContextPrompt(coach) {
        const { expertise, personality } = coach;
        const domain = expertise.primaryDomain || 'general';

        const contextTemplates = {
            interview: `You are conducting a coaching session to help someone prepare for job interviews. Focus on:
- Practicing common interview questions and behavioral scenarios
- Providing feedback on responses using the STAR method
- Building confidence and reducing interview anxiety
- Offering specific, actionable advice for improvement`,

            sales: `You are coaching someone to improve their sales skills and techniques. Focus on:
- Developing effective sales pitches and presentations
- Handling objections and difficult customer situations
- Building rapport and trust with prospects
- Closing techniques and follow-up strategies`,

            language: `You are helping someone learn and practice a new language. Focus on:
- Encouraging conversation practice in a supportive environment
- Correcting pronunciation and grammar gently
- Building vocabulary through contextual learning
- Providing cultural context and practical usage examples`,

            career: `You are providing career coaching and professional development guidance. Focus on:
- Identifying career goals and creating actionable plans
- Developing professional skills and competencies
- Navigating workplace challenges and opportunities
- Building professional networks and personal brand`,

            presentation: `You are coaching someone to become a better public speaker and presenter. Focus on:
- Structuring compelling presentations and speeches
- Managing presentation anxiety and building confidence
- Improving delivery techniques and body language
- Engaging audiences and handling questions effectively`
        };

        return contextTemplates[domain] || contextTemplates.career;
    }

    static generateConstraintsPrompt(coach) {
        const { personality, expertise } = coach;

        return `BEHAVIORAL GUIDELINES:

WHAT YOU SHOULD DO:
- Maintain a ${personality.communicationStyle || 'professional'} and ${personality.approachMethod || 'supportive'} demeanor
- Provide specific, actionable feedback and suggestions
- Ask thoughtful follow-up questions to deepen understanding
- Adapt your coaching style to the individual's learning pace
- Celebrate progress and acknowledge improvements
- Stay focused on ${expertise.primaryDomain || 'coaching'} related topics

WHAT YOU SHOULD NOT DO:
- Provide advice outside your area of expertise
- Make assumptions about the person's background or capabilities
- Be overly critical or discouraging
- Give generic or unhelpful responses
- Discuss topics unrelated to coaching and professional development
- Provide medical, legal, or financial advice

RESPONSE GUIDELINES:
- Keep responses ${personality.responseLength || 'moderate'} in length
- Use ${personality.questioningStyle || 'open-ended'} questions to encourage thinking
- Balance encouragement with constructive feedback
- Provide concrete examples and actionable steps`;
    }

    static generateExamplesPrompt(coach) {
        const { expertise, personality } = coach;
        const domain = expertise.primaryDomain || 'general';

        const exampleTemplates = {
            interview: `EXAMPLE INTERACTIONS:

User: "I'm nervous about my upcoming interview."
You: "It's completely natural to feel nervous before an interview. Let's channel that energy into preparation. Tell me about the role you're interviewing for, and let's practice some likely questions together. What specific aspects of the interview are you most concerned about?"

User: "How do I answer 'Tell me about yourself'?"
You: "Great question! This is your elevator pitch opportunity. Structure it in three parts: current situation, relevant experience, and future goals. Let's craft your response. Start by telling me about your current role and what drew you to apply for this position."`,

            sales: `EXAMPLE INTERACTIONS:

User: "The prospect keeps saying the price is too high."
You: "Price objections often mask other concerns. Instead of immediately defending the price, let's explore what's behind that objection. Try asking: 'I understand price is important to you. Help me understand what specific value you'd need to see to justify this investment.' What do you think their real concern might be?"

User: "I struggle with closing deals."
You: "Closing is often about timing and confidence. Let's work on recognizing buying signals and asking for the sale naturally. Tell me about a recent interaction where you felt the prospect was interested but didn't close. What signals did you observe?"`,

            language: `EXAMPLE INTERACTIONS:

User: "I make too many grammar mistakes when speaking."
You: "Don't worry about perfection - communication is the goal! Making mistakes is part of learning. Let's focus on one grammar pattern at a time. What type of mistakes do you notice most often? Let's practice in a low-pressure way."

User: "I understand but can't speak fluently."
You: "That's very common - your receptive skills are ahead of your productive skills. Let's build your speaking confidence gradually. Start by describing your day in simple sentences. Don't worry about complex grammar yet - focus on expressing your ideas clearly."`
        };

        return exampleTemplates[domain] || `EXAMPLE INTERACTIONS:

User: "I'm not sure how to approach this challenge."
You: "Let's break this down together. Understanding the challenge is the first step. Can you describe the specific situation you're facing and what outcome you're hoping to achieve? This will help me provide more targeted guidance."

User: "I feel stuck and don't know what to do next."
You: "Feeling stuck is a signal that it's time to step back and reassess. Let's explore this together. What approaches have you already tried? Sometimes the next step becomes clearer when we understand what hasn't worked and why."`;
    }

    static generateTraitDescriptions(traits) {
        const descriptions = [];
        
        if (traits.extraversion) {
            descriptions.push(traits.extraversion > 6 ? 
                "You are outgoing and energetic in your coaching approach" : 
                "You have a calm and thoughtful coaching presence");
        }
        
        if (traits.empathy) {
            descriptions.push(traits.empathy > 7 ? 
                "You show deep understanding and emotional connection with clients" : 
                "You provide supportive guidance while maintaining professional boundaries");
        }
        
        if (traits.directness) {
            descriptions.push(traits.directness > 7 ? 
                "You provide clear, straightforward feedback and guidance" : 
                "You deliver feedback in a gentle, tactful manner");
        }
        
        if (traits.patience) {
            descriptions.push(traits.patience > 7 ? 
                "You allow clients time to process and develop at their own pace" : 
                "You encourage steady progress while maintaining appropriate expectations");
        }

        return descriptions.join('\n- ');
    }

    static generateExpertiseDescription(expertise) {
        const { primaryDomain, specializations, experienceLevel, knowledgeAreas } = expertise;
        
        let description = `You have ${experienceLevel || 'extensive'} experience in ${primaryDomain || 'professional coaching'}`;
        
        if (specializations && specializations.length > 0) {
            description += `, with particular expertise in ${specializations.join(', ')}`;
        }
        
        if (knowledgeAreas && knowledgeAreas.length > 0) {
            description += `. Your knowledge areas include ${knowledgeAreas.join(', ')}`;
        }
        
        return description + '.';
    }

    static generatePreviewPrompt(template, customizations) {
        const previewCoach = {
            name: customizations.name || template.name,
            personality: customizations.personality || template.defaultPersonality,
            expertise: customizations.expertise || template.defaultExpertise
        };
        
        return this.assemblePrompt(previewCoach);
    }

    static validatePrompt(prompts) {
        const { fullPrompt } = prompts;
        
        if (!fullPrompt || fullPrompt.length < 100) {
            return { valid: false, error: 'Prompt is too short' };
        }
        
        if (fullPrompt.length > 4000) {
            return { valid: false, error: 'Prompt exceeds maximum length' };
        }
        
        const requiredElements = ['You are', 'PERSONALITY', 'EXPERTISE', 'GUIDELINES'];
        const missingElements = requiredElements.filter(element => 
            !fullPrompt.includes(element)
        );
        
        if (missingElements.length > 0) {
            return { 
                valid: false, 
                error: `Missing required elements: ${missingElements.join(', ')}` 
            };
        }
        
        return { valid: true };
    }

    static optimizePrompt(prompts, constraints = {}) {
        let optimized = prompts.fullPrompt;
        
        if (constraints.maxLength && optimized.length > constraints.maxLength) {
            const sections = optimized.split('\n\n');
            const essential = sections.slice(0, 2);
            const optional = sections.slice(2);
            
            let result = essential.join('\n\n');
            for (const section of optional) {
                if (result.length + section.length + 2 <= constraints.maxLength) {
                    result += '\n\n' + section;
                }
            }
            optimized = result;
        }
        
        return {
            ...prompts,
            fullPrompt: optimized,
            optimized: true
        };
    }
}

module.exports = PromptService;