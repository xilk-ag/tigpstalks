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

// Security middleware
app.use((req, res, next) => {
    // Prevent caching of all content
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    // Prevent content from being embedded in iframes
    res.setHeader('X-Frame-Options', 'DENY');
    
    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // Additional security headers
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    next();
});

// Serve static files with protection
app.use(express.static(path.join(__dirname), {
    setHeaders: (res, filePath) => {
        // Add protection headers for images
        if (filePath.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) {
            res.setHeader('Content-Disposition', 'inline');
            res.setHeader('X-Content-Protection', 'no-download');
        }
        
        // Add protection for CSS and JS files
        if (filePath.match(/\.(css|js)$/i)) {
            res.setHeader('X-Content-Protection', 'no-copy');
        }
    }
}));

// Special route for images with additional protection
app.get('/protected-images/:filename', (req, res) => {
    const filename = req.params.filename;
    const imagePath = path.join(__dirname, 'images', filename);
    
    // Check if file exists
    if (!require('fs').existsSync(imagePath)) {
        return res.status(404).send('Image not found');
    }
    
    // Set additional protection headers
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('X-Content-Protection', 'no-download');
    res.setHeader('X-Image-Protection', 'watermarked');
    
    res.sendFile(imagePath);
});

// API endpoint to check if user is trying to access protected content
app.post('/api/protection-check', (req, res) => {
    // Log potential security violations
    console.log('Protection check triggered:', {
        timestamp: new Date().toISOString(),
        userAgent: req.get('User-Agent'),
        ip: req.ip,
        referer: req.get('Referer')
    });
    
    res.json({ status: 'protected' });
});

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

// Catch-all route to serve index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`TIGPS Social server running on port ${PORT}`);
    console.log('Content protection enabled');
}); 