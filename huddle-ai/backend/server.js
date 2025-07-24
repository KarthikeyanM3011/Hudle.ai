require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

const { testConnection } = require('./config/database');
const { connectRedis } = require('./config/redis');

const authRoutes = require('./routes/auth');
const coachRoutes = require('./routes/coaches');
const meetingRoutes = require('./routes/meetings');
const templateRoutes = require('./routes/templates');
const avatarRoutes = require('./routes/avatars');

const app = express();
const PORT = process.env.BACKEND_PORT || 5000;

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    message: 'Too many requests from this IP'
});

app.use(limiter);
app.use(helmet());
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

if (!fs.existsSync('./uploads')) {
    fs.mkdirSync('./uploads', { recursive: true });
}
if (!fs.existsSync('./uploads/avatars')) {
    fs.mkdirSync('./uploads/avatars', { recursive: true });
}
if (!fs.existsSync('./uploads/recordings')) {
    fs.mkdirSync('./uploads/recordings', { recursive: true });
}

app.use('/uploads', express.static('uploads'));

app.use('/api/auth', authRoutes);
app.use('/api/coaches', coachRoutes);
app.use('/api/meetings', meetingRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/avatars', avatarRoutes);

app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        error: 'Something went wrong!',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Internal Server Error'
    });
});

app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

async function startServer() {
    try {
        await testConnection();
        await connectRedis();
        
        app.listen(PORT, () => {
            console.log(`Backend server running on port ${PORT}`);
            console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();