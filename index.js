const express = require('express');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = 3000;

const pool = new Pool({
    user: process.env.USER_NAME,
    host: process.env.HOST_NAME,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.PORT_NUMBER,
});

// Middleware
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('static'));
app.use(session({
    secret: 'your-secret-key', // Change this to a secure key
    resave: false,
    saveUninitialized: true,
}));

// Load main page
app.get('/', async (req, res) => {
    let users = [];
    const currentUser = req.session.user; // Get the current user from the session

    if (currentUser) { // Check if the user is logged in
        try {
            const result = await pool.query('SELECT * FROM users'); // Fetch users from the database
            users = result.rows; // Assign users from the result
        } catch (error) {
            console.error('Error fetching users:', error);
        }
    }

    res.render('index', { users, user: currentUser }); // Pass users and the current user to the EJS template
});

// Delete user
app.post('/deleteUser', async (req, res) => {
    const { id } = req.body;
    await pool.query('DELETE FROM users WHERE id = $1', [id]);
    res.redirect('/');
});

// Signup
app.get('/signup', (req, res) => {
    res.render('signup');
});

app.post('/signup', async (req, res) => {
    const { email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    try {
        await pool.query('INSERT INTO users (email, password) VALUES ($1, $2)', [email, hashedPassword]);
        res.redirect('/login');
    } catch (error) {
        console.log('Error signing up:', error);
        res.status(500).send('Error signing up');
    }
});

// Login
app.get('/login', (req, res) => {
    res.render('login');
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (user.rows.length > 0 && await bcrypt.compare(password, user.rows[0].password)) {
            req.session.user = user.rows[0];
            res.redirect('/');
        } else {
            res.status(401).send('Invalid email or password');
        }
    } catch (error) {
        console.log('Error logging in:', error);
        res.status(500).send('Error logging in');
    }
});

// Logout
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// Start server
app.listen(PORT, () => {
    console.log(`SERVER STARTED AT PORT ${PORT}`);
});
