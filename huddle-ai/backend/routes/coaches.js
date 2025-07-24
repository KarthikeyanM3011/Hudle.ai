const express = require('express');
const Coach = require('../models/Coach');
const authMiddleware = require('../middleware/auth');
const promptService = require('../services/promptService');

const router = express.Router();

router.post('/', authMiddleware, async (req, res) => {
    try {
        const coachData = {
            userId: req.userId,
            ...req.body
        };

        if (coachData.systemPrompts && coachData.systemPrompts.fullPrompt) {
            coachData.systemPrompts = promptService.assemblePrompt(coachData);
        }

        const coachId = await Coach.create(coachData);
        const coach = await Coach.findById(coachId);

        res.status(201).json({ 
            message: 'Coach created successfully', 
            coach 
        });
    } catch (error) {
        console.error('Coach creation error:', error);
        res.status(500).json({ error: 'Failed to create coach' });
    }
});

router.get('/', authMiddleware, async (req, res) => {
    try {
        const { limit = 50, offset = 0 } = req.query;
        const coaches = await Coach.findByUserId(req.userId, parseInt(limit), parseInt(offset));
        res.json({ coaches });
    } catch (error) {
        console.error('Coaches fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch coaches' });
    }
});

router.get('/public', async (req, res) => {
    try {
        const { limit = 20, offset = 0, category } = req.query;
        const coaches = await Coach.getPublicCoaches(
            parseInt(limit), 
            parseInt(offset), 
            category
        );
        res.json({ coaches });
    } catch (error) {
        console.error('Public coaches fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch public coaches' });
    }
});

router.get('/search', authMiddleware, async (req, res) => {
    try {
        const { q: query, public: isPublic } = req.query;
        
        if (!query) {
            return res.status(400).json({ error: 'Search query is required' });
        }

        const coaches = await Coach.search(query, isPublic ? null : req.userId);
        res.json({ coaches });
    } catch (error) {
        console.error('Coach search error:', error);
        res.status(500).json({ error: 'Search failed' });
    }
});

router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const coach = await Coach.findById(req.params.id);
        
        if (!coach) {
            return res.status(404).json({ error: 'Coach not found' });
        }

        if (coach.userId !== req.userId && !coach.sharing.isPublic) {
            return res.status(403).json({ error: 'Access denied' });
        }

        res.json({ coach });
    } catch (error) {
        console.error('Coach fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch coach' });
    }
});

router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const coach = await Coach.findById(req.params.id);
        
        if (!coach) {
            return res.status(404).json({ error: 'Coach not found' });
        }

        if (coach.userId !== req.userId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const coachData = req.body;
        if (coachData.systemPrompts && !coachData.systemPrompts.fullPrompt) {
            coachData.systemPrompts = promptService.assemblePrompt({
                ...coach,
                ...coachData
            });
        }

        const updated = await Coach.update(req.params.id, coachData);
        
        if (!updated) {
            return res.status(400).json({ error: 'Coach update failed' });
        }

        const updatedCoach = await Coach.findById(req.params.id);
        res.json({ 
            message: 'Coach updated successfully', 
            coach: updatedCoach 
        });
    } catch (error) {
        console.error('Coach update error:', error);
        res.status(500).json({ error: 'Failed to update coach' });
    }
});

router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const coach = await Coach.findById(req.params.id);
        
        if (!coach) {
            return res.status(404).json({ error: 'Coach not found' });
        }

        if (coach.userId !== req.userId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const deleted = await Coach.delete(req.params.id, req.userId);
        
        if (!deleted) {
            return res.status(400).json({ error: 'Coach deletion failed' });
        }

        res.json({ message: 'Coach deleted successfully' });
    } catch (error) {
        console.error('Coach deletion error:', error);
        res.status(500).json({ error: 'Failed to delete coach' });
    }
});

router.post('/:id/test', authMiddleware, async (req, res) => {
    try {
        const { message } = req.body;
        const coach = await Coach.findById(req.params.id);
        
        if (!coach) {
            return res.status(404).json({ error: 'Coach not found' });
        }

        if (coach.userId !== req.userId && !coach.sharing.isPublic) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const aiService = require('../services/aiService');
        const response = await aiService.generateResponse(coach, message);

        res.json({ response });
    } catch (error) {
        console.error('Coach test error:', error);
        res.status(500).json({ error: 'Failed to test coach' });
    }
});

router.post('/:id/clone', authMiddleware, async (req, res) => {
    try {
        const originalCoach = await Coach.findById(req.params.id);
        
        if (!originalCoach) {
            return res.status(404).json({ error: 'Coach not found' });
        }

        if (!originalCoach.sharing.isPublic && originalCoach.userId !== req.userId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const { name } = req.body;
        const clonedCoachData = {
            ...originalCoach,
            userId: req.userId,
            name: name || `${originalCoach.name} (Copy)`,
            creationType: 'custom',
            baseTemplateId: null,
            sharing: {
                isPublic: false,
                isTemplate: false,
                tags: [],
                category: originalCoach.sharing.category,
                downloads: 0,
                ratings: []
            },
            stats: {
                totalSessions: 0,
                avgRating: 0,
                totalMinutes: 0,
                userFeedback: [],
                improvementSuggestions: []
            }
        };

        delete clonedCoachData.id;
        delete clonedCoachData.createdAt;
        delete clonedCoachData.updatedAt;
        delete clonedCoachData.lastUsed;

        const coachId = await Coach.create(clonedCoachData);
        const clonedCoach = await Coach.findById(coachId);

        res.status(201).json({ 
            message: 'Coach cloned successfully', 
            coach: clonedCoach 
        });
    } catch (error) {
        console.error('Coach clone error:', error);
        res.status(500).json({ error: 'Failed to clone coach' });
    }
});

router.post('/:id/generate-prompt', authMiddleware, async (req, res) => {
    try {
        const coach = await Coach.findById(req.params.id);
        
        if (!coach) {
            return res.status(404).json({ error: 'Coach not found' });
        }

        if (coach.userId !== req.userId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const prompts = promptService.assemblePrompt(coach);
        res.json({ prompts });
    } catch (error) {
        console.error('Prompt generation error:', error);
        res.status(500).json({ error: 'Failed to generate prompt' });
    }
});

module.exports = router;