const requireAuth = (req, res, next) => {
    if (!req.session.token || !req.session.user) {
        req.flash('error', 'Please log in to access this page');
        return res.redirect('/auth/login');
    }
    next();
};

const redirectIfAuth = (req, res, next) => {
    if (req.session.token && req.session.user) {
        return res.redirect('/dashboard');
    }
    next();
};

const setAuthHeaders = (req, res, next) => {
    if (req.session.token) {
        req.headers.authorization = `Bearer ${req.session.token}`;
    }
    next();
};

module.exports = {
    requireAuth,
    redirectIfAuth,
    setAuthHeaders
};