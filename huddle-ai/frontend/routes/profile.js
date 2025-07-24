const express = require('express');
const axios = require('axios');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const API_URL = process.env.API_URL || 'http://localhost:5000';

router.get('/', requireAuth, async (req, res) => {
    try {
        const response = await axios.get(`${API_URL}/api/auth/profile`, {
            headers: { Authorization: `Bearer ${req.session.token}` }
        });

        res.render('profile', {
            title: 'My Profile',
            profile: response.data.user,
            stats: response.data.stats
        });
    } catch (error) {
        console.error('Profile fetch error:', error);
        req.flash('error', 'Failed to load profile');
        res.render('profile', {
            title: 'My Profile',
            profile: req.session.user,
            stats: {
                totalCoaches: 0,
                totalMeetings: 0,
                totalMinutes: 0
            }
        });
    }
});

router.post('/update', requireAuth, async (req, res) => {
    try {
        const response = await axios.put(`${API_URL}/api/auth/profile`, req.body, {
            headers: { Authorization: `Bearer ${req.session.token}` }
        });

        req.session.user = response.data.user;
        req.flash('success', 'Profile updated successfully');
        res.redirect('/profile');
    } catch (error) {
        console.error('Profile update error:', error);
        const errorMessage = error.response?.data?.error || 'Failed to update profile';
        req.flash('error', errorMessage);
        res.redirect('/profile');
    }
});

router.post('/change-password', requireAuth, async (req, res) => {
    try {
        await axios.post(`${API_URL}/api/auth/change-password`, req.body, {
            headers: { Authorization: `Bearer ${req.session.token}` }
        });

        req.flash('success', 'Password changed successfully');
        res.redirect('/profile');
    } catch (error) {
        console.error('Password change error:', error);
        const errorMessage = error.response?.data?.error || 'Failed to change password';
        req.flash('error', errorMessage);
        res.redirect('/profile');
    }
});

module.exports = router;