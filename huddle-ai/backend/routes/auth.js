const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.post('/register', async (req, res) => {
    try {
        const { email, password, firstName, lastName } = req.body;

        if (!email || !password || !firstName || !lastName) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        const existingUser = await User.findByEmail(email);
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }

        const userId = await User.create({ email, password, firstName, lastName });
        
        const token = jwt.sign(
            { userId, email },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        const user = await User.findById(userId);
        res.status(201).json({ 
            message: 'User created successfully', 
            token,
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                avatar: user.avatar
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const user = await User.findByEmail(email);
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const isValidPassword = await User.verifyPassword(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { userId: user.id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({ 
            message: 'Login successful', 
            token,
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                avatar: user.avatar
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

router.get('/profile', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const stats = await User.getStats(req.userId);

        res.json({
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                avatar: user.avatar,
                createdAt: user.createdAt
            },
            stats
        });
    } catch (error) {
        console.error('Profile error:', error);
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});

router.put('/profile', authMiddleware, async (req, res) => {
    try {
        const { firstName, lastName, avatar } = req.body;

        const updated = await User.updateProfile(req.userId, { firstName, lastName, avatar });
        if (!updated) {
            return res.status(400).json({ error: 'Profile update failed' });
        }

        const user = await User.findById(req.userId);
        res.json({ 
            message: 'Profile updated successfully',
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                avatar: user.avatar
            }
        });
    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({ error: 'Profile update failed' });
    }
});

router.post('/change-password', authMiddleware, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Current and new passwords are required' });
        }

        const user = await User.findByEmail(req.userEmail);
        const isValidPassword = await User.verifyPassword(currentPassword, user.password);
        
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }

        const updated = await User.updatePassword(req.userId, newPassword);
        if (!updated) {
            return res.status(400).json({ error: 'Password update failed' });
        }

        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        console.error('Password change error:', error);
        res.status(500).json({ error: 'Password change failed' });
    }
});

router.post('/verify-token', authMiddleware, (req, res) => {
    res.json({ valid: true, userId: req.userId });
});

router.post('/logout', (req, res) => {
    res.json({ message: 'Logout successful' });
});

module.exports = router;