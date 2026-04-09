// backend/app.js
const express = require('express');
// const mongoose = require('mongoose'); // --- Not used, told to comment out until needed
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// ROUTES
const userRoutes = require('./routes/userRoutes');
const templateRoutes = require('./routes/templateRoutes');
const pageRoutes = require('./routes/pageRoutes');
const actionRoutes = require('./routes/actionRoutes');
const loginRoutes = require('./routes/loginRoutes');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes'); // ✅ ADDED
const { requirePageRole } = require('./middleware/pageAccessMiddleware');

// Load environment variables
if (process.env.NODE_ENV === 'test') {
  dotenv.config({ path: path.join(__dirname, '.env.test'), override: true });
} else {
  dotenv.config({ path: path.join(__dirname, '.env'), override: true });
}

// Initialize Express
const app = express();
app.use(cors());
app.use(express.json());

// FRONTEND ROOTS
const frontendRoot = path.join(__dirname, '..', 'frontend', 'views');
const frontendUtilsRoot = path.join(__dirname, '..', 'frontend', 'utils');

// Serve CSS
app.use('/stylesheet', express.static(path.join(frontendRoot, 'loginpage')));
app.use('/stylesheet', express.static(path.join(frontendRoot, 'homepage')));
app.use('/stylesheet', express.static(path.join(frontendRoot, 'admin')));

// Serve JS files (view scripts)
app.use('/models', express.static(path.join(frontendRoot, 'loginpage')));
app.use('/models', express.static(path.join(frontendRoot, 'homepage')));
app.use('/models', express.static(path.join(frontendRoot, 'admin')));

// Serve shared frontend utilities (for ES module imports like /utils/api.js)
app.use('/utils', express.static(frontendUtilsRoot));

// ------------------------------
// PAGE ROUTES
// ------------------------------

// LOGIN PAGE — GET /
app.get('/', (req, res) => {
  res.sendFile(
    path.join(
      __dirname,
      '..',
      'frontend',
      'views',
      'loginpage',
      'viewLoginShell.html'
    )
  );
});

// HOME PAGE — GET /home
app.get('/home', requirePageRole('Registered'), (req, res) => {
  res.sendFile(
    path.join(
      __dirname,
      '..',
      'frontend',
      'views',
      'homepage',
      'viewHomeShell.html'
    )
  );
});

// ADMIN PAGE — GET /adminView
app.get('/adminView', requirePageRole('Admin'), (req, res) => {
  res.sendFile(
    path.join(__dirname, '..', 'frontend', 'views', 'admin', 'adminView.html')
  );
});

// RESET PASSWORD PAGE — GET /reset-password/:token
app.get('/reset-password/:token', (req, res) => {
  res.sendFile(
    path.join(
      __dirname,
      '..',
      'frontend',
      'views',
      'loginpage',
      'resetPassword.html'
    )
  );
});

// GUEST PAGE — GET /guest
app.get('/guest', (req, res) => {
  res.sendFile(
    path.join(
      __dirname,
      '..',
      'frontend',
      'views',
      'homepage',
      'guest',
      'guestView.html'
    )
  );
});

// ------------------------------
// API ROUTES
// ------------------------------
app.use('/api', authRoutes); // login, register, verify email, forgot/reset password
app.use('/api/users', userRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/pages', pageRoutes);
app.use('/api/actions', actionRoutes);
app.use('/api/login', loginRoutes);
app.use('/api/admin', adminRoutes); // ✅ ADDED (mount admin routes here)

module.exports = app;
