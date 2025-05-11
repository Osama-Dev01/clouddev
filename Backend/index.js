const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 3000;

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads')); // Serve uploaded files

// Root route
app.get('/', (req, res) => {
  res.send('Backend server is running. Use /data, /signup, or /login endpoints.');
});

// In-memory "database" with sample user that now includes image
let users = [
  {
    id: 5,
    name: "osama",
    message: 'Hello from the backend!',
    info: 'This is some data returned from the server.',
    image: null // Now includes image field
  },
];

let authUsers = [];

// Signup Route (unchanged)
app.post('/signup', (req, res) => {
  const { username, password } = req.body;
  const exists = authUsers.find(user => user.username === username);
  if (exists) return res.status(400).json({ message: 'User already exists' });

  authUsers.push({ username, password });
  res.status(201).json({ message: 'User registered successfully' });
});

// Login Route (unchanged)
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = authUsers.find(user => user.username === username && user.password === password);
  if (!user) return res.status(401).json({ message: 'Invalid credentials' });

  res.status(200).json({ message: 'Login successful', user: { username } });
});

// GET route to fetch data (now includes image URLs)
app.get('/data', (req, res) => {
  const usersWithImageUrls = users.map(user => ({
    ...user,
    imageUrl: user.image ? `${req.protocol}://${req.get('host')}/uploads/${user.image}` : null
  }));
  res.json(usersWithImageUrls);
});

// POST route to add a new user (now handles file upload)
app.post('/data', upload.single('photo'), (req, res) => {
  const { name, message, info } = req.body;
  
  const newUser = {
    id: users.length + 1,
    name,
    message,
    info,
    image: req.file ? req.file.filename : null
  };

  users.push(newUser);
  
  res.status(201).json({
    ...newUser,
    imageUrl: req.file ? `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}` : null
  });
});

// DELETE route (now also removes associated image)
app.delete('/data/:id', (req, res) => {
  const userId = parseInt(req.params.id);
  const userToDelete = users.find(user => user.id === userId);
  
  if (userToDelete && userToDelete.image) {
    const imagePath = path.join(__dirname, 'uploads', userToDelete.image);
    fs.unlink(imagePath, (err) => {
      if (err) console.error('Error deleting image:', err);
    });
  }
  
  users = users.filter(user => user.id !== userId);
  res.json({ message: 'User deleted successfully' });
});

// Editing Route (now handles image updates)
app.put('/data/:id', upload.single('photo'), (req, res) => {
  const id = parseInt(req.params.id);
  const { name, message, info } = req.body;
  
  const userIndex = users.findIndex(user => user.id === id);
  if (userIndex === -1) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Delete old image if new one is uploaded
  if (req.file && users[userIndex].image) {
    const oldImagePath = path.join(__dirname, 'uploads', users[userIndex].image);
    fs.unlink(oldImagePath, (err) => {
      if (err) console.error('Error deleting old image:', err);
    });
  }

  users[userIndex] = { 
    ...users[userIndex], 
    name, 
    message, 
    info,
    image: req.file ? req.file.filename : users[userIndex].image
  };

  res.json({
    ...users[userIndex],
    imageUrl: users[userIndex].image ? 
      `${req.protocol}://${req.get('host')}/uploads/${users[userIndex].image}` : null
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Backend server is running on http://localhost:${port}`);
});