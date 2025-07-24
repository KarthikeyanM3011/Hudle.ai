const express = require('express');
const Template = require('../models/Template');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const { category, difficulty } = req.query;
        const templates = await Template.findAll(category, difficulty);
        res.json({ templates });
    } catch (error) {
        console.error('Templates fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch templates' });
    }
});

router.get('/categories', async (req, res) => {
    try {
        const categories = await Template.getCategories();
        res.json({ categories });
    } catch (error) {
        console.error('Categories fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
});

router.get('/popular', async (req, res) => {
    try {
        const { limit = 10 } = req.query;
        const templates = await Template.getPopular(parseInt(limit));
        res.json({ templates });
    } catch (error) {
        console.error('Popular templates fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch popular templates' });
    }
});

router.get('/search', async (req, res) => {
    try {
        const { q: query } = req.query;
        
        if (!query) {
            return res.status(400).json({ error: 'Search query is required' });
        }

        const templates = await Template.search(query);
        res.json({ templates });
    } catch (error) {
        console.error('Template search error:', error);
        res.status(500).json({ error: 'Search failed' });
    }
});

router.get('/category/:category', async (req, res) => {
    try {
        const templates = await Template.findByCategory(req.params.category);
        res.json({ templates });
    } catch (error) {
        console.error('Category templates fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch category templates' });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const template = await Template.findById(req.params.id);
        
        if (!template) {
            return res.status(404).json({ error: 'Template not found' });
        }

        res.json({ template });
    } catch (error) {
        console.error('Template fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch template' });
    }
});

router.post('/:id/use', authMiddleware, async (req, res) => {
    try {
        const template = await Template.findById(req.params.id);
        
        if (!template) {
            return res.status(404).json({ error: 'Template not found' });
        }

        await Template.incrementUsage(req.params.id);

        const customizations = req.body;
        const coachData = {
            name: customizations.name || template.name,
            description: customizations.description || template.description,
            creationType: 'template',
            baseTemplateId: template.id,
            personality: {
                ...template.defaultPersonality,
                ...customizations.personality
            },
            expertise: {
                ...template.defaultExpertise,
                ...customizations.expertise
            },
            appearance: customizations.appearance || {},
            voice: customizations.voice || {},
            systemPrompts: {
                basePrompt: template.promptTemplate,
                fullPrompt: ''
            },
            stats: {
                totalSessions: 0,
                avgRating: 0,
                totalMinutes: 0,
                userFeedback: [],
                improvementSuggestions: []
            },
            sharing: customizations.sharing || {
                isPublic: false,
                isTemplate: false,
                tags: [],
                category: template.category,
                downloads: 0,
                ratings: []
            }
        };

        const promptService = require('../services/promptService');
        coachData.systemPrompts = promptService.assemblePrompt(coachData);

        res.json({ 
            message: 'Template ready for customization',
            coachData,
            template
        });
    } catch (error) {
        console.error('Template use error:', error);
        res.status(500).json({ error: 'Failed to use template' });
    }
});

router.post('/:id/rate', authMiddleware, async (req, res) => {
    try {
        const { rating } = req.body;
        
        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ error: 'Rating must be between 1 and 5' });
        }

        const template = await Template.findById(req.params.id);
        
        if (!template) {
            return res.status(404).json({ error: 'Template not found' });
        }

        const updated = await Template.updateRating(req.params.id, rating);
        
        if (!updated) {
            return res.status(400).json({ error: 'Rating update failed' });
        }

        res.json({ message: 'Rating submitted successfully' });
    } catch (error) {
        console.error('Template rating error:', error);
        res.status(500).json({ error: 'Failed to rate template' });
    }
});

router.get('/:id/preview', async (req, res) => {
    try {
        const template = await Template.findById(req.params.id);
        
        if (!template) {
            return res.status(404).json({ error: 'Template not found' });
        }

        const { customizations = {} } = req.query;
        let parsedCustomizations = {};
        
        if (customizations) {
            try {
                parsedCustomizations = JSON.parse(customizations);
            } catch (e) {
                parsedCustomizations = {};
            }
        }

        const previewData = {
            name: parsedCustomizations.name || template.name,
            description: parsedCustomizations.description || template.description,
            personality: {
                ...template.defaultPersonality,
                ...parsedCustomizations.personality
            },
            expertise: {
                ...template.defaultExpertise,
                ...parsedCustomizations.expertise
            }
        };

        const promptService = require('../services/promptService');
        const generatedPrompt = promptService.generatePreviewPrompt(template, previewData);

        res.json({ 
            preview: previewData,
            generatedPrompt,
            template: {
                id: template.id,
                name: template.name,
                category: template.category,
                difficulty: template.difficulty
            }
        });
    } catch (error) {
        console.error('Template preview error:', error);
        res.status(500).json({ error: 'Failed to generate preview' });
    }
});

module.exports = router;