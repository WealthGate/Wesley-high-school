const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const path = require('path');
const { MongoClient } = require('mongodb');
const multer = require('multer');

require('dotenv').config();

const app = express();
const port = 5000;

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../client')));

const mongoURI = process.env.MONGO_URI;
const jwtSecret = process.env.JWT_SECRET;

const client = new MongoClient(mongoURI);

let db;
async function connectToDb() {
    await client.connect();
    db = client.db('wesley-high-school');
    console.log("Connected to MongoDB");
}
connectToDb().catch(console.error);

// Set up Multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '../client/uploads', req.body.uploadType);
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.sendStatus(401);

    jwt.verify(token, jwtSecret, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// Admin login endpoint
app.post('/api/admin/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const adminCollection = db.collection('adminusers');
        const admin = await adminCollection.findOne({ username });

        if (!admin) {
            return res.status(400).send('Invalid username or password');
        }

        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) {
            return res.status(400).send('Invalid username or password');
        }

        const token = jwt.sign({ username: admin.username }, jwtSecret, { expiresIn: '1h' });
        res.json({ token });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).send('Server error');
    }
});

// Endpoint to upload a carousel image (requires admin token)
app.post('/api/upload-carousel-image', authenticateToken, upload.single('carouselImage'), async (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }

    try {
        const carouselCollection = db.collection('carouselimages');
        const imagePath = `/uploads/carousel_images/${req.file.filename}`;
        await carouselCollection.insertOne({ path: imagePath, uploadedAt: new Date() });
        res.status(200).send({ message: 'Image uploaded successfully!', imagePath });
    } catch (err) {
        console.error('Image upload error:', err);
        res.status(500).send('Server error');
    }
});

// Endpoint to get all carousel images
app.get('/api/carousel-images', async (req, res) => {
    try {
        const carouselCollection = db.collection('carouselimages');
        const images = await carouselCollection.find({}).toArray();
        res.status(200).json(images);
    } catch (err) {
        console.error('Fetch images error:', err);
        res.status(500).send('Server error');
    }
});

// Endpoint to create or update news/events with media
app.post('/api/admin/news-events', authenticateToken, upload.single('mediaFile'), async (req, res) => {
    const { title, content, mediaType, mediaLink, eventDate, isNews, _id } = req.body;
    const collection = db.collection('news-events');
    const mediaPath = req.file ? `/uploads/news_media/${req.file.filename}` : mediaLink;

    const data = {
        title,
        content,
        mediaType,
        mediaPath,
        isNews: isNews === 'true',
        eventDate: isNews === 'false' ? eventDate : null,
        createdAt: new Date()
    };

    try {
        if (_id) {
            await collection.updateOne({ _id: new ObjectId(_id) }, { $set: data });
            res.status(200).send('Item updated successfully.');
        } else {
            await collection.insertOne(data);
            res.status(201).send('Item added successfully.');
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error.');
    }
});

// Endpoint to fetch all news and events
app.get('/api/news-events', async (req, res) => {
    try {
        const newsEvents = await db.collection('news-events').find({}).toArray();
        res.json(newsEvents);
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error.');
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
