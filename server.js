const express = require('express');
const multer = require('multer');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Ensure uploads folder exists
if (!fs.existsSync(path.join(__dirname, 'uploads'))) {
    fs.mkdirSync(path.join(__dirname, 'uploads'));
}

// SQLite setup
const db = new sqlite3.Database('database.sqlite');
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS profiles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        displayName TEXT,
        avatar TEXT,
        bio TEXT,
        location TEXT
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content TEXT,
        author TEXT,
        username TEXT,
        avatar TEXT,
        timestamp TEXT,
        isAnonymous INTEGER,
        media TEXT
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        postId INTEGER,
        author TEXT,
        username TEXT,
        avatar TEXT,
        content TEXT,
        timestamp TEXT
    )`);
});

// Multer setup for media uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage });

// API Endpoints

// Profiles
app.get('/api/profiles/:username', (req, res) => {
    db.get('SELECT * FROM profiles WHERE username = ?', [req.params.username], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(row);
    });
});
app.post('/api/profiles', (req, res) => {
    const { username, displayName, avatar, bio, location } = req.body;
    db.run('INSERT OR REPLACE INTO profiles (username, displayName, avatar, bio, location) VALUES (?, ?, ?, ?, ?)',
        [username, displayName, avatar, bio, location],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, id: this.lastID });
        });
});

// Posts
app.get('/api/posts', (req, res) => {
    db.all('SELECT * FROM posts ORDER BY id DESC', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});
app.post('/api/posts', (req, res) => {
    const { content, author, username, avatar, isAnonymous, media } = req.body;
    const timestamp = new Date().toISOString();
    db.run('INSERT INTO posts (content, author, username, avatar, timestamp, isAnonymous, media) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [content, author, username, avatar, timestamp, isAnonymous ? 1 : 0, media],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, id: this.lastID });
        });
});

// Comments
app.get('/api/comments/:postId', (req, res) => {
    db.all('SELECT * FROM comments WHERE postId = ? ORDER BY id ASC', [req.params.postId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});
app.post('/api/comments', (req, res) => {
    const { postId, author, username, avatar, content } = req.body;
    const timestamp = new Date().toISOString();
    db.run('INSERT INTO comments (postId, author, username, avatar, content, timestamp) VALUES (?, ?, ?, ?, ?, ?)',
        [postId, author, username, avatar, content, timestamp],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, id: this.lastID });
        });
});

// Media upload
app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    res.json({ url: `/uploads/${req.file.filename}` });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
}); 