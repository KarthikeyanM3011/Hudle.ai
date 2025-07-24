require('dotenv').config();
const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const flash = require('express-flash');
const methodOverride = require('method-override');
const path = require('path');
const morgan = require('morgan');
const helmet = require('helmet');
const cors = require('cors');

const indexRoutes = require('./routes/index');
const authRoutes = require('./routes/auth');
const coachRoutes = require('./routes/coaches');
const meetingRoutes = require('./routes/meetings');
const profileRoutes = require('./routes/profile');

const app = express();
const PORT = process.env.FRONTEND_PORT || 3000;

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
            scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net', 'https://unpkg.com'],
            imgSrc: ["'self'", 'data:', 'blob:'],
            connectSrc: ["'self'", 'ws:', 'wss:', process.env.API_URL || 'http://localhost:5000'],
            mediaSrc: ["'self'", 'blob:'],
            frameSrc: ["'self'"]
        }
    }
}));

app.use(cors());
app.use(morgan('combined'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());
app.use(methodOverride('_method'));

app.use(session({
    secret: process.env.SESSION_SECRET || 'huddle-ai-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000
    }
}));

app.use(flash());

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));

app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    res.locals.token = req.session.token || null;
    res.locals.apiUrl = process.env.API_URL || 'http://localhost:5000';
    res.locals.livekitUrl = process.env.LIVEKIT_URL || 'ws://localhost:7880';
    next();
});

app.use('/', indexRoutes);
app.use('/auth', authRoutes);
app.use('/coaches', coachRoutes);
app.use('/meetings', meetingRoutes);
app.use('/profile', profileRoutes);

app.use((req, res) => {
    res.status(404).render('404', { title: 'Page Not Found' });
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).render('error', { 
        title: 'Server Error',
        error: process.env.NODE_ENV === 'development' ? err : {}
    });
});

app.listen(PORT, () => {
    console.log(`Frontend server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`API URL: ${process.env.API_URL || 'http://localhost:5000'}`);
});