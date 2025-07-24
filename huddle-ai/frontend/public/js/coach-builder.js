// Coach Builder JavaScript

class CoachBuilder {
    constructor() {
        this.currentStep = 1;
        this.totalSteps = 5;
        this.coachData = {
            personality: {
                traits: {
                    extraversion: 5,
                    empathy: 7,
                    directness: 6,
                    patience: 7,
                    enthusiasm: 6,
                    professionalism: 8
                },
                communicationStyle: 'supportive',
                approachMethod: 'balanced',
                responseLength: 'moderate',
                questioningStyle: 'open-ended'
            },
            expertise: {
                primaryDomain: '',
                specializations: [],
                experienceLevel: 'expert',
                knowledgeAreas: []
            },
            appearance: {
                avatarId: '',
                avatarUrl: ''
            },
            voice: {
                voiceId: 'default-professional-female',
                stability: 0.6,
                clarity: 0.8,
                speed: 1.0
            },
            sharing: {
                isPublic: false,
                isTemplate: false,
                tags: [],
                category: ''
            }
        };
        this.init();
    }

    init() {
        this.bindEvents();
        this.initializeSliders();
        this.loadTemplates();
        this.loadAvatars();
        this.loadVoices();
        this.setupValidation();
    }

    bindEvents() {
        // Step navigation
        document.addEventListener('click', (e) => {
            if (e.target.matches('.step-next')) {
                this.nextStep();
            } else if (e.target.matches('.step-prev')) {
                this.prevStep();
            } else if (e.target.matches('.step-indicator')) {
                const step = parseInt(e.target.dataset.step);
                this.goToStep(step);
            }
        });

        // Template selection
        document.addEventListener('change', (e) => {
            if (e.target.matches('input[name="template"]')) {
                this.selectTemplate(e.target.value);
            }
        });

        // Personality trait changes
        document.addEventListener('input', (e) => {
            if (e.target.matches('.trait-slider')) {
                this.updateTrait(e.target.name, e.target.value);
            }
        });

        // Avatar selection
        document.addEventListener('change', (e) => {
            if (e.target.matches('input[name="avatar"]')) {
                this.selectAvatar(e.target.value);
            }
        });

        // Voice selection and preview
        document.addEventListener('change', (e) => {
            if (e.target.matches('select[name="voice"]')) {
                this.selectVoice(e.target.value);
            }
        });

        document.addEventListener('click', (e) => {
            if (e.target.matches('.preview-voice')) {
                this.previewVoice();
            } else if (e.target.matches('.test-coach')) {
                this.testCoach();
            } else if (e.target.matches('.save-coach')) {
                this.saveCoach();
            }
        });

        // Form field changes
        document.addEventListener('input', (e) => {
            if (e.target.closest('.coach-form')) {
                this.updateCoachData();
                this.generatePreview();
            }
        });
    }

    initializeSliders() {
        const sliders = document.querySelectorAll('.trait-slider');
        sliders.forEach(slider => {
            const valueDisplay = document.getElementById(slider.id + 'Value');
            if (valueDisplay) {
                valueDisplay.textContent = slider.value;
            }

            slider.addEventListener('input', (e) => {
                if (valueDisplay) {
                    valueDisplay.textContent = e.target.value;
                }
                this.updatePersonalityPreview();
            });
        });
    }

    async loadTemplates() {
        try {
            const response = await fetch('/api/templates');
            const data = await response.json();
            this.renderTemplates(data.templates);
        } catch (error) {
            console.error('Failed to load templates:', error);
            this.showError('Failed to load coach templates');
        }
    }

    renderTemplates(templates) {
        const container = document.getElementById('templateContainer');
        if (!container) return;

        const html = templates.map(template => `
            <div class="template-card" data-template-id="${template.id}">
                <input type="radio" class="btn-check" name="template" id="template${template.id}" value="${template.id}">
                <label class="btn btn-outline-primary template-label" for="template${template.id}">
                    <div class="template-icon">
                        <i class="fas fa-${this.getTemplateIcon(template.category)}"></i>
                    </div>
                    <h6 class="template-name">${template.name}</h6>
                    <p class="template-description">${template.description}</p>
                    <div class="template-meta">
                        <span class="badge bg-secondary">${template.category}</span>
                        <span class="badge bg-info">${template.difficulty}</span>
                    </div>
                </label>
            </div>
        `).join('');

        container.innerHTML = html;
    }

    getTemplateIcon(category) {
        const icons = {
            interview: 'briefcase',
            sales: 'handshake',
            language: 'language',
            career: 'chart-line',
            presentation: 'presentation'
        };
        return icons[category] || 'robot';
    }

    async selectTemplate(templateId) {
        if (!templateId) return;

        try {
            const response = await fetch(`/api/templates/${templateId}`);
            const data = await response.json();
            this.applyTemplate(data.template);
        } catch (error) {
            console.error('Failed to load template:', error);
            this.showError('Failed to load template details');
        }
    }

    applyTemplate(template) {
        // Apply template defaults to coach data
        this.coachData.personality = { ...this.coachData.personality, ...template.defaultPersonality };
        this.coachData.expertise = { ...this.coachData.expertise, ...template.defaultExpertise };
        
        // Update form fields
        this.updateFormFromData();
        this.generatePreview();
        
        this.showSuccess('Template applied successfully');
    }

    updateFormFromData() {
        // Update personality sliders
        Object.keys(this.coachData.personality.traits).forEach(trait => {
            const slider = document.getElementById(trait);
            if (slider) {
                slider.value = this.coachData.personality.traits[trait];
                const valueDisplay = document.getElementById(trait + 'Value');
                if (valueDisplay) {
                    valueDisplay.textContent = slider.value;
                }
            }
        });

        // Update select fields
        const communicationStyle = document.getElementById('communicationStyle');
        if (communicationStyle) {
            communicationStyle.value = this.coachData.personality.communicationStyle;
        }

        const approachMethod = document.getElementById('approachMethod');
        if (approachMethod) {
            approachMethod.value = this.coachData.personality.approachMethod;
        }

        // Update expertise fields
        const primaryDomain = document.getElementById('primaryDomain');
        if (primaryDomain) {
            primaryDomain.value = this.coachData.expertise.primaryDomain;
        }
    }

    updateTrait(traitName, value) {
        const trait = traitName.replace('personality[traits][', '').replace(']', '');
        this.coachData.personality.traits[trait] = parseInt(value);
        this.updatePersonalityPreview();
    }

    updatePersonalityPreview() {
        const preview = document.getElementById('personalityPreview');
        if (!preview) return;

        const traits = this.coachData.personality.traits;
        const descriptions = this.generatePersonalityDescription(traits);
        
        preview.innerHTML = `
            <div class="personality-summary">
                <h6>Personality Summary</h6>
                <p>${descriptions.summary}</p>
                <div class="trait-bars">
                    ${Object.keys(traits).map(trait => `
                        <div class="trait-bar">
                            <label>${this.formatTraitName(trait)}</label>
                            <div class="progress">
                                <div class="progress-bar" style="width: ${traits[trait] * 10}%"></div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    generatePersonalityDescription(traits) {
        const { extraversion, empathy, directness, patience } = traits;
        
        let summary = "This coach is ";
        
        if (extraversion > 7) {
            summary += "highly energetic and outgoing, ";
        } else if (extraversion < 4) {
            summary += "thoughtful and introspective, ";
        } else {
            summary += "balanced in energy, ";
        }

        if (empathy > 7) {
            summary += "deeply empathetic and understanding, ";
        } else if (empathy < 4) {
            summary += "analytical and objective, ";
        } else {
            summary += "supportive yet practical, ";
        }

        if (directness > 7) {
            summary += "direct and straightforward in communication, ";
        } else if (directness < 4) {
            summary += "gentle and tactful in approach, ";
        } else {
            summary += "balanced in communication style, ";
        }

        if (patience > 7) {
            summary += "and highly patient with learning processes.";
        } else if (patience < 4) {
            summary += "and focused on efficient progress.";
        } else {
            summary += "and appropriately patient with development.";
        }

        return { summary };
    }

    formatTraitName(trait) {
        return trait.charAt(0).toUpperCase() + trait.slice(1);
    }

    async loadAvatars() {
        try {
            const response = await fetch('/api/avatars');
            const data = await response.json();
            this.renderAvatars(data.avatars);
        } catch (error) {
            console.error('Failed to load avatars:', error);
            this.showError('Failed to load avatar options');
        }
    }

    renderAvatars(avatars) {
        const container = document.getElementById('avatarContainer');
        if (!container) return;

        const html = avatars.map(avatar => `
            <div class="avatar-option">
                <input type="radio" class="btn-check" name="avatar" id="avatar${avatar.id}" value="${avatar.id}">
                <label class="btn btn-outline-primary avatar-label" for="avatar${avatar.id}">
                    <img src="${avatar.url}" alt="${avatar.originalName}" class="avatar-img">
                    <small class="avatar-category">${avatar.category}</small>
                </label>
            </div>
        `).join('');

        container.innerHTML = html;
    }

    selectAvatar(avatarId) {
        this.coachData.appearance.avatarId = avatarId;
        const avatarElement = document.querySelector(`input[value="${avatarId}"]`).nextElementSibling.querySelector('img');
        this.coachData.appearance.avatarUrl = avatarElement.src;
        this.updateAvatarPreview();
    }

    updateAvatarPreview() {
        const preview = document.getElementById('avatarPreview');
        if (preview && this.coachData.appearance.avatarUrl) {
            preview.innerHTML = `
                <img src="${this.coachData.appearance.avatarUrl}" alt="Selected Avatar" class="preview-avatar">
                <p class="text-muted">Selected Avatar</p>
            `;
        }
    }

    async loadVoices() {
        try {
            const response = await fetch('/api/voices');
            const data = await response.json();
            this.renderVoices(data.voices);
        } catch (error) {
            console.error('Failed to load voices:', error);
            this.renderDefaultVoices();
        }
    }

    renderVoices(voices) {
        const select = document.getElementById('voiceSelect');
        if (!select) return;

        const html = voices.map(voice => `
            <option value="${voice.voiceId}" data-gender="${voice.gender}" data-accent="${voice.accent}">
                ${voice.name} (${voice.gender}, ${voice.accent})
            </option>
        `).join('');

        select.innerHTML = html;
    }

    renderDefaultVoices() {
        const select = document.getElementById('voiceSelect');
        if (!select) return;

        const defaultVoices = [
            { id: 'default-professional-male', name: 'Professional Male', gender: 'male' },
            { id: 'default-professional-female', name: 'Professional Female', gender: 'female' },
            { id: 'default-friendly-male', name: 'Friendly Male', gender: 'male' },
            { id: 'default-supportive-female', name: 'Supportive Female', gender: 'female' }
        ];

        const html = defaultVoices.map(voice => `
            <option value="${voice.id}">${voice.name}</option>
        `).join('');

        select.innerHTML = html;
    }

    selectVoice(voiceId) {
        this.coachData.voice.voiceId = voiceId;
    }

    async previewVoice() {
        const voiceId = this.coachData.voice.voiceId;
        if (!voiceId) return;

        const previewText = "Hello! I'm your AI coach. I'm here to help you achieve your goals through personalized guidance and support.";
        
        try {
            this.showInfo('Generating voice preview...');
            
            const response = await fetch('/api/voices/preview', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    voiceId: voiceId,
                    text: previewText,
                    settings: this.coachData.voice
                })
            });

            if (response.ok) {
                const audioBlob = await response.blob();
                const audioUrl = URL.createObjectURL(audioBlob);
                const audio = new Audio(audioUrl);
                audio.play();
                
                this.showSuccess('Voice preview playing');
            } else {
                this.showError('Voice preview unavailable');
            }
        } catch (error) {
            console.error('Voice preview error:', error);
            this.showError('Failed to generate voice preview');
        }
    }

    updateCoachData() {
        // Collect data from form fields
        const form = document.querySelector('.coach-form');
        if (!form) return;

        const formData = new FormData(form);
        
        // Update basic info
        this.coachData.name = formData.get('name') || '';
        this.coachData.description = formData.get('description') || '';
        
        // Update personality
        this.coachData.personality.communicationStyle = formData.get('communicationStyle') || 'supportive';
        this.coachData.personality.approachMethod = formData.get('approachMethod') || 'balanced';
        
        // Update expertise
        this.coachData.expertise.primaryDomain = formData.get('primaryDomain') || '';
        this.coachData.expertise.experienceLevel = formData.get('experienceLevel') || 'expert';
        
        const specializations = formData.get('specializations');
        if (specializations) {
            this.coachData.expertise.specializations = specializations.split(',').map(s => s.trim());
        }
    }

    generatePreview() {
        const preview = document.getElementById('coachPreview');
        if (!preview) return;

        this.updateCoachData();

        const html = `
            <div class="coach-preview-card">
                <div class="preview-header">
                    <div class="preview-avatar">
                        ${this.coachData.appearance.avatarUrl ? 
                            `<img src="${this.coachData.appearance.avatarUrl}" alt="Coach Avatar">` :
                            `<div class="avatar-placeholder"><i class="fas fa-robot"></i></div>`
                        }
                    </div>
                    <div class="preview-info">
                        <h5>${this.coachData.name || 'Your AI Coach'}</h5>
                        <p class="text-muted">${this.coachData.expertise.primaryDomain || 'General Coaching'}</p>
                    </div>
                </div>
                <div class="preview-body">
                    <p>${this.coachData.description || 'A personalized AI coach ready to help you achieve your goals.'}</p>
                    <div class="preview-traits">
                        <span class="badge bg-primary">${this.coachData.personality.communicationStyle}</span>
                        <span class="badge bg-success">${this.coachData.personality.approachMethod}</span>
                        <span class="badge bg-info">${this.coachData.expertise.experienceLevel}</span>
                    </div>
                </div>
            </div>
        `;

        preview.innerHTML = html;
    }

    async testCoach() {
        this.updateCoachData();
        
        const testModal = document.getElementById('testModal');
        if (testModal) {
            const modal = new bootstrap.Modal(testModal);
            modal.show();
            this.initializeTestChat();
        }
    }

    initializeTestChat() {
        const chatContainer = document.getElementById('testChat');
        if (!chatContainer) return;

        chatContainer.innerHTML = `
            <div class="test-chat-messages" id="testChatMessages">
                <div class="test-message coach-message">
                    <div class="message-avatar">
                        ${this.coachData.appearance.avatarUrl ? 
                            `<img src="${this.coachData.appearance.avatarUrl}" alt="Coach">` :
                            `<div class="avatar-placeholder"><i class="fas fa-robot"></i></div>`
                        }
                    </div>
                    <div class="message-content">
                        <div class="message-bubble">
                            Hello! I'm ${this.coachData.name || 'your AI coach'}. I'm here to help you with ${this.coachData.expertise.primaryDomain || 'your goals'}. What would you like to work on today?
                        </div>
                    </div>
                </div>
            </div>
            <div class="test-chat-input">
                <div class="input-group">
                    <input type="text" class="form-control" id="testMessageInput" placeholder="Type a message to test your coach...">
                    <button class="btn btn-primary" onclick="coachBuilder.sendTestMessage()">
                        <i class="fas fa-paper-plane"></i>
                    </button>
                </div>
            </div>
        `;

        // Focus on input
        document.getElementById('testMessageInput').focus();
    }

    async sendTestMessage() {
        const input = document.getElementById('testMessageInput');
        const message = input.value.trim();
        if (!message) return;

        // Add user message to chat
        this.addTestMessage(message, true);
        input.value = '';

        // Generate coach response
        try {
            const response = await this.generateCoachResponse(message);
            this.addTestMessage(response, false);
        } catch (error) {
            this.addTestMessage("I'm sorry, I'm having trouble responding right now. Please try again.", false);
        }
    }

    addTestMessage(message, isUser) {
        const messagesContainer = document.getElementById('testChatMessages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `test-message ${isUser ? 'user-message' : 'coach-message'}`;
        
        messageDiv.innerHTML = `
            <div class="message-avatar">
                ${isUser ? 
                    `<div class="avatar-placeholder user"><i class="fas fa-user"></i></div>` :
                    (this.coachData.appearance.avatarUrl ? 
                        `<img src="${this.coachData.appearance.avatarUrl}" alt="Coach">` :
                        `<div class="avatar-placeholder"><i class="fas fa-robot"></i></div>`
                    )
                }
            </div>
            <div class="message-content">
                <div class="message-bubble">
                    ${message}
                </div>
            </div>
        `;

        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    async generateCoachResponse(userMessage) {
        const response = await fetch('/api/coaches/test-response', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: userMessage,
                coachData: this.coachData
            })
        });

        const data = await response.json();
        return data.response;
    }

    async saveCoach() {
        this.updateCoachData();
        
        if (!this.validateCoachData()) {
            return;
        }

        try {
            this.showInfo('Saving your coach...');
            
            const response = await fetch('/api/coaches', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(this.coachData)
            });

            const data = await response.json();
            
            if (response.ok) {
                this.showSuccess('Coach created successfully!');
                setTimeout(() => {
                    window.location.href = `/coaches/${data.coach.id}`;
                }, 1500);
            } else {
                this.showError(data.error || 'Failed to create coach');
            }
        } catch (error) {
            console.error('Save error:', error);
            this.showError('Failed to save coach');
        }
    }

    validateCoachData() {
        const errors = [];

        if (!this.coachData.name || this.coachData.name.trim().length < 2) {
            errors.push('Coach name must be at least 2 characters long');
        }

        if (!this.coachData.expertise.primaryDomain) {
            errors.push('Please select a primary domain for your coach');
        }

        if (!this.coachData.appearance.avatarId) {
            errors.push('Please select an avatar for your coach');
        }

        if (errors.length > 0) {
            this.showError(errors.join('<br>'));
            return false;
        }

        return true;
    }

    setupValidation() {
        const form = document.querySelector('.coach-form');
        if (!form) return;

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveCoach();
        });
    }

    // Step navigation methods
    nextStep() {
        if (this.currentStep < this.totalSteps) {
            if (this.validateCurrentStep()) {
                this.currentStep++;
                this.updateStepDisplay();
            }
        }
    }

    prevStep() {
        if (this.currentStep > 1) {
            this.currentStep--;
            this.updateStepDisplay();
        }
    }

    goToStep(step) {
        if (step >= 1 && step <= this.totalSteps) {
            this.currentStep = step;
            this.updateStepDisplay();
        }
    }

    updateStepDisplay() {
        // Update step indicators
        document.querySelectorAll('.step-indicator').forEach(indicator => {
            const step = parseInt(indicator.dataset.step);
            indicator.classList.toggle('active', step === this.currentStep);
            indicator.classList.toggle('completed', step < this.currentStep);
        });

        // Show/hide step content
        document.querySelectorAll('.step-content').forEach(content => {
            const step = parseInt(content.dataset.step);
            content.style.display = step === this.currentStep ? 'block' : 'none';
        });

        // Update navigation buttons
        const prevBtn = document.querySelector('.step-prev');
        const nextBtn = document.querySelector('.step-next');
        
        if (prevBtn) prevBtn.style.display = this.currentStep === 1 ? 'none' : 'inline-block';
        if (nextBtn) nextBtn.textContent = this.currentStep === this.totalSteps ? 'Create Coach' : 'Next';
    }

    validateCurrentStep() {
        // Add step-specific validation here
        return true;
    }

    // Utility methods
    showSuccess(message) {
        if (window.HuddleApp) {
            window.HuddleApp.showSuccess(message);
        } else {
            alert(message);
        }
    }

    showError(message) {
        if (window.HuddleApp) {
            window.HuddleApp.showError(message);
        } else {
            alert(message);
        }
    }

    showInfo(message) {
        if (window.HuddleApp) {
            window.HuddleApp.showInfo(message);
        } else {
            console.info(message);
        }
    }
}

// Initialize coach builder if on coach creation page
document.addEventListener('DOMContentLoaded', () => {
    if (document.querySelector('.coach-form') || document.querySelector('#coachBuilder')) {
        window.coachBuilder = new CoachBuilder();
    }
});