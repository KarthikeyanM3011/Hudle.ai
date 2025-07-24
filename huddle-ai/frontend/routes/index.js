const express = require('express');
const axios = require('axios');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const API_URL = process.env.API_URL || 'http://localhost:5000';

router.get('/', (req, res) => {
    if (req.session.user) {
        return res.redirect('/dashboard');
    }
    res.render('index', { title: 'Huddle.ai - AI Coach Platform' });
});

router.get('/dashboard', requireAuth, async (req, res) => {
    try {
        const [coachesRes, meetingsRes, templatesRes] = await Promise.all([
            axios.get(`${API_URL}/api/coaches`, {
                headers: { Authorization: `Bearer ${req.session.token}` }
            }),
            axios.get(`${API_URL}/api/meetings/recent`, {
                headers: { Authorization: `Bearer ${req.session.token}` }
            }),
            axios.get(`${API_URL}/api/templates/popular?limit=6`)
        ]);

        res.render('dashboard', {
            title: 'Dashboard',
            coaches: coachesRes.data.coaches.slice(0, 6),
            recentMeetings: meetingsRes.data.meetings,
            popularTemplates: templatesRes.data.templates
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        req.flash('error', 'Failed to load dashboard data');
        res.render('dashboard', {
            title: 'Dashboard',
            coaches: [],
            recentMeetings: [],
            popularTemplates: []
        });
    }
});

module.exports = router;