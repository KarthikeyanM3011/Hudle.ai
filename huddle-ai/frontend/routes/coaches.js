const express = require('express');
const axios = require('axios');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const API_URL = process.env.API_URL || 'http://localhost:5000';

router.get('/', requireAuth, async (req, res) => {
    try {
        const response = await axios.get(`${API_URL}/api/coaches`, {
            headers: { Authorization: `Bearer ${req.session.token}` }
        });

        res.render('coaches/index', {
            title: 'My Coaches',
            coaches: response.data.coaches
        });
    } catch (error) {
        console.error('Coaches fetch error:', error);
        req.flash('error', 'Failed to load coaches');
        res.render('coaches/index', {
            title: 'My Coaches',
            coaches: []
        });
    }
});

router.get('/create', requireAuth, async (req, res) => {
    try {
        const [templatesRes, avatarsRes] = await Promise.all([
            axios.get(`${API_URL}/api/templates`),
            axios.get(`${API_URL}/api/avatars/default`)
        ]);

        res.render('coach-create', {
            title: 'Create AI Coach',
            templates: templatesRes.data.templates,
            avatars: avatarsRes.data.avatars,
            mode: 'create'
        });
    } catch (error) {
        console.error('Coach create page error:', error);
        req.flash('error', 'Failed to load coach creation page');
        res.redirect('/coaches');
    }
});

router.get('/template/:id', requireAuth, async (req, res) => {
    try {
        const [templateRes, avatarsRes] = await Promise.all([
            axios.get(`${API_URL}/api/templates/${req.params.id}`),
            axios.get(`${API_URL}/api/avatars/default`)
        ]);

        res.render('coach-template', {
            title: `Create from Template: ${templateRes.data.template.name}`,
            template: templateRes.data.template,
            avatars: avatarsRes.data.avatars
        });
    } catch (error) {
        console.error('Template coach creation error:', error);
        req.flash('error', 'Failed to load template');
        res.redirect('/coaches/create');
    }
});

router.post('/create', requireAuth, async (req, res) => {
    try {
        const response = await axios.post(`${API_URL}/api/coaches`, req.body, {
            headers: { Authorization: `Bearer ${req.session.token}` }
        });

        req.flash('success', 'Coach created successfully!');
        res.redirect(`/coaches/${response.data.coach.id}`);
    } catch (error) {
        console.error('Coach creation error:', error);
        const errorMessage = error.response?.data?.error || 'Failed to create coach';
        req.flash('error', errorMessage);
        res.redirect('/coaches/create');
    }
});

router.get('/:id', requireAuth, async (req, res) => {
    try {
        const response = await axios.get(`${API_URL}/api/coaches/${req.params.id}`, {
            headers: { Authorization: `Bearer ${req.session.token}` }
        });

        res.render('coaches/detail', {
            title: response.data.coach.name,
            coach: response.data.coach
        });
    } catch (error) {
        console.error('Coach detail error:', error);
        req.flash('error', 'Coach not found');
        res.redirect('/coaches');
    }
});

router.get('/:id/edit', requireAuth, async (req, res) => {
    try {
        const [coachRes, avatarsRes] = await Promise.all([
            axios.get(`${API_URL}/api/coaches/${req.params.id}`, {
                headers: { Authorization: `Bearer ${req.session.token}` }
            }),
            axios.get(`${API_URL}/api/avatars/default`)
        ]);

        res.render('coach-create', {
            title: `Edit Coach: ${coachRes.data.coach.name}`,
            coach: coachRes.data.coach,
            avatars: avatarsRes.data.avatars,
            mode: 'edit'
        });
    } catch (error) {
        console.error('Coach edit page error:', error);
        req.flash('error', 'Failed to load coach for editing');
        res.redirect('/coaches');
    }
});

router.put('/:id', requireAuth, async (req, res) => {
    try {
        await axios.put(`${API_URL}/api/coaches/${req.params.id}`, req.body, {
            headers: { Authorization: `Bearer ${req.session.token}` }
        });

        req.flash('success', 'Coach updated successfully!');
        res.redirect(`/coaches/${req.params.id}`);
    } catch (error) {
        console.error('Coach update error:', error);
        const errorMessage = error.response?.data?.error || 'Failed to update coach';
        req.flash('error', errorMessage);
        res.redirect(`/coaches/${req.params.id}/edit`);
    }
});

router.delete('/:id', requireAuth, async (req, res) => {
    try {
        await axios.delete(`${API_URL}/api/coaches/${req.params.id}`, {
            headers: { Authorization: `Bearer ${req.session.token}` }
        });

        req.flash('success', 'Coach deleted successfully!');
        res.redirect('/coaches');
    } catch (error) {
        console.error('Coach deletion error:', error);
        const errorMessage = error.response?.data?.error || 'Failed to delete coach';
        req.flash('error', errorMessage);
        res.redirect('/coaches');
    }
});

router.get('/:id/test', requireAuth, async (req, res) => {
    try {
        const response = await axios.get(`${API_URL}/api/coaches/${req.params.id}`, {
            headers: { Authorization: `Bearer ${req.session.token}` }
        });

        res.render('coach-test', {
            title: `Test Coach: ${response.data.coach.name}`,
            coach: response.data.coach
        });
    } catch (error) {
        console.error('Coach test page error:', error);
        req.flash('error', 'Failed to load coach test page');
        res.redirect('/coaches');
    }
});

router.post('/:id/test', requireAuth, async (req, res) => {
    try {
        const response = await axios.post(
            `${API_URL}/api/coaches/${req.params.id}/test`,
            { message: req.body.message },
            { headers: { Authorization: `Bearer ${req.session.token}` } }
        );

        res.json({ response: response.data.response });
    } catch (error) {
        console.error('Coach test error:', error);
        res.status(500).json({ error: 'Failed to test coach' });
    }
});

module.exports = router;