const express = require('express');
const axios = require('axios');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const API_URL = process.env.API_URL || 'http://localhost:5000';

router.get('/', requireAuth, async (req, res) => {
    try {
        const response = await axios.get(`${API_URL}/api/meetings`, {
            headers: { Authorization: `Bearer ${req.session.token}` }
        });

        res.render('meetings/index', {
            title: 'My Meetings',
            meetings: response.data.meetings
        });
    } catch (error) {
        console.error('Meetings fetch error:', error);
        req.flash('error', 'Failed to load meetings');
        res.render('meetings/index', {
            title: 'My Meetings',
            meetings: []
        });
    }
});

router.get('/schedule/:coachId', requireAuth, async (req, res) => {
    try {
        const response = await axios.get(`${API_URL}/api/coaches/${req.params.coachId}`, {
            headers: { Authorization: `Bearer ${req.session.token}` }
        });

        res.render('meeting-schedule', {
            title: `Schedule Meeting with ${response.data.coach.name}`,
            coach: response.data.coach
        });
    } catch (error) {
        console.error('Meeting schedule page error:', error);
        req.flash('error', 'Failed to load meeting schedule page');
        res.redirect('/coaches');
    }
});

router.post('/schedule', requireAuth, async (req, res) => {
    try {
        const response = await axios.post(`${API_URL}/api/meetings`, req.body, {
            headers: { Authorization: `Bearer ${req.session.token}` }
        });

        req.flash('success', 'Meeting scheduled successfully!');
        res.redirect(`/meetings/${response.data.meeting.id}`);
    } catch (error) {
        console.error('Meeting scheduling error:', error);
        const errorMessage = error.response?.data?.error || 'Failed to schedule meeting';
        req.flash('error', errorMessage);
        res.redirect('/coaches');
    }
});

router.get('/:id', requireAuth, async (req, res) => {
    try {
        const response = await axios.get(`${API_URL}/api/meetings/${req.params.id}`, {
            headers: { Authorization: `Bearer ${req.session.token}` }
        });

        res.render('meetings/detail', {
            title: response.data.meeting.title,
            meeting: response.data.meeting
        });
    } catch (error) {
        console.error('Meeting detail error:', error);
        req.flash('error', 'Meeting not found');
        res.redirect('/meetings');
    }
});

router.get('/:id/join', requireAuth, async (req, res) => {
    try {
        const [meetingRes, joinRes] = await Promise.all([
            axios.get(`${API_URL}/api/meetings/${req.params.id}`, {
                headers: { Authorization: `Bearer ${req.session.token}` }
            }),
            axios.post(`${API_URL}/api/meetings/${req.params.id}/join`, {}, {
                headers: { Authorization: `Bearer ${req.session.token}` }
            })
        ]);

        res.render('meeting-room', {
            title: `Meeting: ${meetingRes.data.meeting.title}`,
            meeting: meetingRes.data.meeting,
            joinData: joinRes.data
        });
    } catch (error) {
        console.error('Meeting join error:', error);
        const errorMessage = error.response?.data?.error || 'Failed to join meeting';
        req.flash('error', errorMessage);
        res.redirect('/meetings');
    }
});

router.post('/:id/end', requireAuth, async (req, res) => {
    try {
        await axios.post(`${API_URL}/api/meetings/${req.params.id}/end`, req.body, {
            headers: { Authorization: `Bearer ${req.session.token}` }
        });

        req.flash('success', 'Meeting ended successfully');
        res.redirect(`/meetings/${req.params.id}`);
    } catch (error) {
        console.error('Meeting end error:', error);
        const errorMessage = error.response?.data?.error || 'Failed to end meeting';
        req.flash('error', errorMessage);
        res.redirect('/meetings');
    }
});

router.delete('/:id', requireAuth, async (req, res) => {
    try {
        await axios.delete(`${API_URL}/api/meetings/${req.params.id}`, {
            headers: { Authorization: `Bearer ${req.session.token}` }
        });

        req.flash('success', 'Meeting deleted successfully');
        res.redirect('/meetings');
    } catch (error) {
        console.error('Meeting deletion error:', error);
        const errorMessage = error.response?.data?.error || 'Failed to delete meeting';
        req.flash('error', errorMessage);
        res.redirect('/meetings');
    }
});

router.post('/:id/feedback', requireAuth, async (req, res) => {
    try {
        await axios.post(`${API_URL}/api/meetings/${req.params.id}/feedback`, req.body, {
            headers: { Authorization: `Bearer ${req.session.token}` }
        });

        req.flash('success', 'Feedback submitted successfully');
        res.redirect(`/meetings/${req.params.id}`);
    } catch (error) {
        console.error('Feedback submission error:', error);
        const errorMessage = error.response?.data?.error || 'Failed to submit feedback';
        req.flash('error', errorMessage);
        res.redirect(`/meetings/${req.params.id}`);
    }
});

module.exports = router;