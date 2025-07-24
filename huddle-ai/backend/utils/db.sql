CREATE DATABASE IF NOT EXISTS huddle_ai;
USE huddle_ai;

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    firstName VARCHAR(100) NOT NULL,
    lastName VARCHAR(100) NOT NULL,
    avatar VARCHAR(500),
    isActive BOOLEAN DEFAULT TRUE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE avatars (
    id INT AUTO_INCREMENT PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    originalName VARCHAR(255) NOT NULL,
    url VARCHAR(500) NOT NULL,
    category VARCHAR(50) DEFAULT 'professional',
    style VARCHAR(50) DEFAULT 'realistic',
    gender VARCHAR(20) DEFAULT 'neutral',
    ethnicity VARCHAR(50),
    mood VARCHAR(50) DEFAULT 'friendly',
    width INT,
    height INT,
    format VARCHAR(10),
    size INT,
    timesSelected INT DEFAULT 0,
    popularityScore FLOAT DEFAULT 0,
    isDefault BOOLEAN DEFAULT FALSE,
    isActive BOOLEAN DEFAULT TRUE,
    uploadedBy INT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (uploadedBy) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE coach_templates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL,
    difficulty VARCHAR(20) DEFAULT 'beginner',
    defaultPersonality JSON,
    defaultExpertise JSON,
    promptTemplate TEXT,
    variableFields JSON,
    requiredFields JSON,
    recommendedAvatars JSON,
    recommendedVoices JSON,
    timesUsed INT DEFAULT 0,
    avgRating FLOAT DEFAULT 0,
    successRate FLOAT DEFAULT 0,
    isActive BOOLEAN DEFAULT TRUE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE coaches (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    creationType ENUM('template', 'guided', 'custom') NOT NULL,
    baseTemplateId INT,
    personality JSON,
    expertise JSON,
    appearance JSON,
    voice JSON,
    systemPrompts JSON,
    stats JSON,
    sharing JSON,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    lastUsed TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (baseTemplateId) REFERENCES coach_templates(id) ON DELETE SET NULL
);

CREATE TABLE meetings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId INT NOT NULL,
    coachId INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    scheduledFor TIMESTAMP,
    duration INT DEFAULT 60,
    status ENUM('scheduled', 'active', 'completed', 'cancelled') DEFAULT 'scheduled',
    mediaSettings JSON,
    sessionCustomization JSON,
    livekit JSON,
    recordingPath VARCHAR(500),
    transcript TEXT,
    summary TEXT,
    feedback JSON,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (coachId) REFERENCES coaches(id) ON DELETE CASCADE
);

CREATE TABLE coach_ratings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    coachId INT NOT NULL,
    userId INT NOT NULL,
    rating INT CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (coachId) REFERENCES coaches(id) ON DELETE CASCADE,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_coach_rating (userId, coachId)
);

INSERT INTO avatars (filename, originalName, url, category, style, gender, mood, isDefault, isActive) VALUES
('avatar1.png', 'Professional Male 1', '/avatars/avatar1.png', 'professional', 'realistic', 'male', 'confident', TRUE, TRUE),
('avatar2.png', 'Professional Female 1', '/avatars/avatar2.png', 'professional', 'realistic', 'female', 'friendly', TRUE, TRUE),
('avatar3.png', 'Casual Male 1', '/avatars/avatar3.png', 'casual', 'realistic', 'male', 'approachable', TRUE, TRUE),
('avatar4.png', 'Casual Female 1', '/avatars/avatar4.png', 'casual', 'realistic', 'female', 'friendly', TRUE, TRUE),
('avatar5.png', 'Diverse 1', '/avatars/avatar5.png', 'diverse', 'realistic', 'neutral', 'supportive', TRUE, TRUE);

INSERT INTO coach_templates (name, description, category, difficulty, defaultPersonality, defaultExpertise, promptTemplate, variableFields, requiredFields) VALUES
('Interview Coach', 'Professional interview coaching with realistic scenarios', 'interview', 'intermediate', 
 '{"traits": {"extraversion": 7, "empathy": 6, "directness": 8, "patience": 5, "enthusiasm": 6, "professionalism": 9}, "communicationStyle": "formal", "approachMethod": "challenging", "responseLength": "moderate", "questioningStyle": "leading"}',
 '{"primaryDomain": "interview", "specializations": ["behavioral", "technical", "executive"], "experienceLevel": "expert", "knowledgeAreas": ["STAR method", "salary negotiation", "body language"], "coachingMethodology": "structured"}',
 'You are {{coachName}}, an expert interview coach with {{experienceLevel}} experience in {{specializations}}. Your communication style is {{communicationStyle}} and you use {{approachMethod}} methods.',
 '["name", "specializations", "communicationStyle"]',
 '["name", "primaryDomain"]'),
('Sales Trainer', 'Dynamic sales training and objection handling', 'sales', 'beginner',
 '{"traits": {"extraversion": 9, "empathy": 7, "directness": 7, "patience": 6, "enthusiasm": 9, "professionalism": 8}, "communicationStyle": "encouraging", "approachMethod": "goal-oriented", "responseLength": "detailed", "questioningStyle": "supportive"}',
 '{"primaryDomain": "sales", "specializations": ["cold calling", "closing", "objection handling"], "experienceLevel": "expert", "knowledgeAreas": ["SPIN selling", "consultative sales", "CRM"], "coachingMethodology": "practice-based"}',
 'You are {{coachName}}, a high-energy sales trainer specializing in {{specializations}}. You use {{approachMethod}} coaching with {{communicationStyle}} feedback.',
 '["name", "specializations", "enthusiasm"]',
 '["name", "primaryDomain"]'),
('Language Tutor', 'Patient language learning with cultural context', 'language', 'beginner',
 '{"traits": {"extraversion": 6, "empathy": 9, "directness": 4, "patience": 10, "enthusiasm": 7, "professionalism": 7}, "communicationStyle": "supportive", "approachMethod": "patient", "responseLength": "detailed", "questioningStyle": "open-ended"}',
 '{"primaryDomain": "language", "specializations": ["pronunciation", "grammar", "conversation"], "experienceLevel": "expert", "knowledgeAreas": ["immersion techniques", "cultural context", "phonetics"], "coachingMethodology": "conversational"}',
 'You are {{coachName}}, a patient language tutor specializing in {{specializations}}. You provide {{responseLength}} explanations with {{communicationStyle}} encouragement.',
 '["name", "targetLanguage", "currentLevel"]',
 '["name", "targetLanguage"]');