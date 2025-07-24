const express = require('express');
const Avatar = require('../models/Avatar');
const authMiddleware = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const { category, style, gender } = req.query;
        const avatars = await Avatar.findAll(category, style, gender);
        res.json({ avatars });
    } catch (error) {
        console.error('Avatars fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch avatars' });
    }
});

router.get('/categories', async (req, res) => {
    try {
        const categories = await Avatar.getCategories();
        res.json({ categories });
    } catch (error) {
        console.error('Avatar categories fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
});

router.get('/styles', async (req, res) => {
    try {
        const styles = await Avatar.getStyles();
        res.json({ styles });
    } catch (error) {
        console.error('Avatar styles fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch styles' });
    }
});

router.get('/default', async (req, res) => {
    try {
        const avatars = await Avatar.getDefaultAvatars();
        res.json({ avatars });
    } catch (error) {
        console.error('Default avatars fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch default avatars' });
    }
});

router.get('/popular', async (req, res) => {
    try {
        const { limit = 20 } = req.query;
        const avatars = await Avatar.getPopularAvatars(parseInt(limit));
        res.json({ avatars });
    } catch (error) {
        console.error('Popular avatars fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch popular avatars' });
    }
});

router.get('/search', async (req, res) => {
    try {
        const { q: query } = req.query;
        
        if (!query) {
            return res.status(400).json({ error: 'Search query is required' });
        }

        const avatars = await Avatar.search(query);
        res.json({ avatars });
    } catch (error) {
        console.error('Avatar search error:', error);
        res.status(500).json({ error: 'Search failed' });
    }
});

router.get('/category/:category', async (req, res) => {
    try {
        const avatars = await Avatar.getByCategory(req.params.category);
        res.json({ avatars });
    } catch (error) {
        console.error('Category avatars fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch category avatars' });
    }
});

router.get('/my-uploads', authMiddleware, async (req, res) => {
    try {
        const avatars = await Avatar.getUserUploads(req.userId);
        res.json({ avatars });
    } catch (error) {
        console.error('User avatars fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch user avatars' });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const avatar = await Avatar.findById(req.params.id);
        
        if (!avatar) {
            return res.status(404).json({ error: 'Avatar not found' });
        }

        res.json({ avatar });
    } catch (error) {
        console.error('Avatar fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch avatar' });
    }
});

router.post('/upload', authMiddleware, upload.single('avatar'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const { category = 'custom', style = 'realistic', gender = 'neutral', mood = 'friendly' } = req.body;

        const avatarData = {
            filename: req.file.filename,
            originalName: req.file.originalname,
            url: `/uploads/avatars/${req.file.filename}`,
            category,
            style,
            gender,
            mood,
            width: req.file.width,
            height: req.file.height,
            format: req.file.mimetype.split('/')[1],
            size: req.file.size,
            uploadedBy: req.userId
        };

        const avatarId = await Avatar.create(avatarData);
        const avatar = await Avatar.findById(avatarId);

        res.status(201).json({ 
            message: 'Avatar uploaded successfully', 
            avatar 
        });
    } catch (error) {
        console.error('Avatar upload error:', error);
        res.status(500).json({ error: 'Failed to upload avatar' });
    }
});

router.post('/:id/select', async (req, res) => {
    try {
        const avatar = await Avatar.findById(req.params.id);
        
        if (!avatar) {
            return res.status(404).json({ error: 'Avatar not found' });
        }

        await Avatar.incrementSelection(req.params.id);
        res.json({ message: 'Avatar selection recorded' });
    } catch (error) {
        console.error('Avatar selection error:', error);
        res.status(500).json({ error: 'Failed to record selection' });
    }
});

router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const avatar = await Avatar.findById(req.params.id);
        
        if (!avatar) {
            return res.status(404).json({ error: 'Avatar not found' });
        }

        if (avatar.uploadedBy !== req.userId && !req.isAdmin) {
            return res.status(403).json({ error: 'Access denied' });
        }

        if (avatar.isDefault) {
            return res.status(400).json({ error: 'Cannot delete default avatar' });
        }

        const deleted = await Avatar.delete(req.params.id, req.userId);
        
        if (!deleted) {
            return res.status(400).json({ error: 'Avatar deletion failed' });
        }

        res.json({ message: 'Avatar deleted successfully' });
    } catch (error) {
        console.error('Avatar deletion error:', error);
        res.status(500).json({ error: 'Failed to delete avatar' });
    }
});

module.exports = router;