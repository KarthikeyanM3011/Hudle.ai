const express = require('express');
const axios = require('axios');
const { redirectIfAuth } = require('../middleware/auth');

const router = express.Router();
const API_URL = process.env.API_URL || 'http://localhost:5000';

router.get('/login', redirectIfAuth, (req, res) => {
    res.render('login', { title: 'Login' });
});

router.post('/login', redirectIfAuth, async (req, res) => {
    try {
        const { email, password } = req.body;
        
        const response = await axios.post(`${API_URL}/api/auth/login`, {
            email,
            password
        });

        req.session.token = response.data.token;
        req.session.user = response.data.user;
        
        req.flash('success', 'Login successful!');
        res.redirect('/dashboard');
    } catch (error) {
        const errorMessage = error.response?.data?.error || 'Login failed';
        req.flash('error', errorMessage);
        res.redirect('/auth/login');
    }
});

router.get('/register', redirectIfAuth, (req, res) => {
    res.render('register', { title: 'Register' });
});

router.post('/register', redirectIfAuth, async (req, res) => {
    try {
        const { email, password, firstName, lastName } = req.body;
        
        if (!email || !password || !firstName || !lastName) {
            req.flash('error', 'All fields are required');
            return res.redirect('/auth/register');
        }

        const response = await axios.post(`${API_URL}/api/auth/register`, {
            email,
            password,
            firstName,
            lastName
        });

        req.session.token = response.data.token;
        req.session.user = response.data.user;
        
        req.flash('success', 'Registration successful!');
        res.redirect('/dashboard');
    } catch (error) {
        const errorMessage = error.response?.data?.error || 'Registration failed';
        req.flash('error', errorMessage);
        res.redirect('/auth/register');
    }
});

router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Session destruction error:', err);
        }
        res.clearCookie('connect.sid');
        req.flash('success', 'Logged out successfully');
        res.redirect('/');
    });
});

module.exports = router;