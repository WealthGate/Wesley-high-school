const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const requiredEnv = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'JWT_SECRET'];
const missingEnv = requiredEnv.filter(v => !process.env[v]);
if (missingEnv.length > 0) {
    console.error(`FATAL ERROR: Missing required environment variables: ${missingEnv.join(', ')}`);
    process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

app.use('/api/', (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
});

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, 'public/uploads');
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});
const upload = multer({ storage: storage });

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.sendStatus(401);

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

let pool;
async function connectToDatabase() {
    try {
        pool = mysql.createPool({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        });
        await pool.query('SELECT 1');
        console.log('Successfully connected to MySQL database.');
    } catch (error) {
        console.error('Failed to connect to MySQL database:', error.message);
        process.exit(1);
    }
}
connectToDatabase();

// --- API Endpoints ---

app.post('/api/admin/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const [rows] = await pool.execute('SELECT * FROM users WHERE email = ?', [email]);
        const user = rows[0];
        if (!user) return res.status(401).json({ message: 'Invalid credentials' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

        const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '8h' });
        res.json({ token });
    } catch (error) {
        console.error('Error during admin login:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

app.post('/api/upload', authenticateToken, upload.single('media'), (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded.' });
    res.status(200).json({ filePath: `/uploads/${req.file.filename}` });
});

// --- DYNAMIC CONTENT APIs (REFACTORED) ---

function createCrudEndpoints(app, type) {
    const tableName = type;
    
    // GET all items
    app.get(`/api/${tableName}`, async (req, res) => {
        try {
            const [rows] = await pool.execute(`SELECT * FROM ${tableName} ORDER BY date DESC`);
            res.json(rows);
        } catch (error) { res.status(500).json({ message: `Server error fetching ${tableName}` }); }
    });

    // GET single item by ID 
    app.get(`/api/${tableName}/:id(\\d+)`, async (req, res) => {
        try {
            const [rows] = await pool.execute(`SELECT * FROM ${tableName} WHERE id = ?`, [req.params.id]);
            if (rows.length === 0) return res.status(404).json({ message: 'Item not found' });
            res.json(rows[0]);
        } catch (error) { res.status(500).json({ message: `Server error fetching item from ${tableName}`}); }
    });
    
    // GET single item by SLUG (for blog)
    if (type === 'blog') {
        app.get(`/api/blog/:slug`, async (req, res) => {
             try {
                const [rows] = await pool.execute(`SELECT * FROM blog WHERE slug = ?`, [req.params.slug]);
                if (rows.length === 0) return res.status(404).json({ message: 'Item not found' });
                res.json(rows[0]);
            } catch (error) { res.status(500).json({ message: `Server error fetching item from blog`}); }
        });
    }


    // POST a new item
    app.post(`/api/${tableName}`, authenticateToken, async (req, res) => {
        try {
            const columns = Object.keys(req.body);
            const values = Object.values(req.body);
            const placeholders = columns.map(() => '?').join(', ');
            const query = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`;
            const [result] = await pool.execute(query, values);
            res.status(201).json({ id: result.insertId, ...req.body });
        } catch (error) { console.error(error); res.status(500).json({ message: `Server error creating item in ${tableName}` }); }
    });

    // PUT (update) an item
    app.put(`/api/${tableName}/:id`, authenticateToken, async (req, res) => {
        try {
            const columns = Object.keys(req.body);
            const values = Object.values(req.body);
            const setClause = columns.map(col => `${col} = ?`).join(', ');
            const query = `UPDATE ${tableName} SET ${setClause} WHERE id = ?`;
            await pool.execute(query, [...values, req.params.id]);
            res.json({ message: 'Item updated successfully' });
        } catch (error) { console.error(error); res.status(500).json({ message: `Server error updating item in ${tableName}` }); }
    });

    // DELETE an item
    app.delete(`/api/${tableName}/:id`, authenticateToken, async (req, res) => {
        try {
            await pool.execute(`DELETE FROM ${tableName} WHERE id = ?`, [req.params.id]);
            res.json({ message: 'Item deleted successfully' });
        } catch (error) { res.status(500).json({ message: `Server error deleting item in ${tableName}` }); }
    });
}

createCrudEndpoints(app, 'news');
createCrudEndpoints(app, 'events');
createCrudEndpoints(app, 'blog');

// --- PAGES API (Special Handling) ---
app.get('/api/pages', async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT slug, title FROM pages');
        res.json(rows);
    } catch (error) { res.status(500).json({ message: 'Server error retrieving pages list' }); }
});

app.get('/api/pages/:slug', async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT * FROM pages WHERE slug = ?', [req.params.slug]);
        if (rows.length === 0) return res.status(404).json({ message: 'Page not found' });
        res.json(rows[0]);
    } catch (error) { res.status(500).json({ message: 'Server error' }); }
});

app.put('/api/pages/:slug', authenticateToken, async (req, res) => {
    const { title, content, heroVideoUrl, heroVideoIsLocal } = req.body;
    try {
        await pool.execute(
            'UPDATE pages SET title = ?, content = ?, hero_video_url = ?, hero_video_is_local = ? WHERE slug = ?',
            [title, content, heroVideoUrl, heroVideoIsLocal, req.params.slug]
        );
        res.json({ message: 'Page updated successfully' });
    } catch (error) { res.status(500).json({ message: 'Server error updating page' }); }
});

// --- CONTACT INQUIRIES API ---
app.get('/api/contact', authenticateToken, async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT * FROM contact_inquiries ORDER BY created_at DESC');
        res.json(rows);
    } catch (error) { res.status(500).json({ message: 'Server error fetching inquiries' }); }
});

app.post('/api/contact', async (req, res) => {
    const { name, email, subject, message } = req.body;
    try {
        await pool.execute('INSERT INTO contact_inquiries (name, email, subject, message) VALUES (?, ?, ?, ?)', [name, email, subject, message]);
        res.status(201).json({ message: 'Inquiry submitted successfully!' });
    } catch (error) { res.status(500).json({ message: 'Server error submitting inquiry' }); }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

