require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const multer = require('multer');
const path = require('path');
const AWS = require('aws-sdk')

const app = express();
const port = process.env.PORT || 3000;

// Configure AWS S3 client
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed (JPEG, PNG, GIF)'));
    }
  }
}).single('photo');

// Database connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Middleware
app.use(cors());
app.use(express.json());

// Initialize database
async function initializeDatabase() {
  try {
    const connection = await pool.getConnection();
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await connection.query(`
      CREATE TABLE IF NOT EXISTS content (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        message TEXT,
        info TEXT,
        image_key VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    connection.release();
    console.log('Database initialized');
  } catch (err) {
    console.error('Database initialization failed:', err);
    process.exit(1);
  }
}

// S3 Helper Functions
async function uploadToS3(file) {
  const key = `images/${Date.now()}_${path.basename(file.originalname)}`;
  const params = {
    Bucket: process.env.S3_BUCKET_NAME,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype
  };

  await s3.send(new PutObjectCommand(params));
  return key;
}

async function deleteFromS3(key) {
  const params = {
    Bucket: process.env.S3_BUCKET_NAME,
    Key: key
  };
  await s3.send(new DeleteObjectCommand(params));
}

function getImageUrl(mkey) {
    if(mkey == '')
    {
      return;
    }
    const myBucket = 'cloudprojectbucket90909'
    const myKey = mkey
    const signedUrlExpireSeconds = 60 * 1
    const s3 = new AWS.S3({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      signatureVersion: 'v4',
      region: 'eu-north-1',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    });
  
    const url = s3.getSignedUrl('getObject', {
        Bucket: myBucket,
        Key: myKey,
        Expires: signedUrlExpireSeconds
    })
  
    console.log(url)
  return url;
}

// API Routes

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    database: pool.pool.config.connectionConfig.database
  });
});

// Get all users
app.get('/data', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT id, name, message, info, image_key, created_at
      FROM content
      ORDER BY created_at DESC
    `);
    
    const usersWithUrls = rows.map(user => ({
      ...user,
      imageUrl: getImageUrl(user.image_key)
    }));
    
    res.json(usersWithUrls);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Add new user
app.post('/data', (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ 
        error: err instanceof multer.MulterError ? 
          'File upload error' : err.message 
      });
    }

    const { name, message, info } = req.body;
    
    try {
      let imageKey = null;
      if (req.file) {
        try {
          imageKey = await uploadToS3(req.file);
        } catch (s3Err) {
          console.error('S3 upload failed:', s3Err);
          return res.status(500).json({ error: 'Failed to upload image' });
        }
      }

      const [result] = await pool.execute(
        'INSERT INTO content (name, message, info, image_key) VALUES (?, ?, ?, ?)',
        [name, message, info, imageKey]
      );

      const [newUser] = await pool.execute(
        'SELECT * FROM content WHERE id = ?',
        [result.insertId]
      );

      res.status(201).json({
        ...newUser[0],
        imageUrl: getImageUrl(imageKey)
      });
    } catch (dbErr) {
      console.error('Database error:', dbErr);
      res.status(500).json({ error: 'Failed to create user' });
    }
  });
});

// Update user
app.put('/data/:id', (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ 
        error: err instanceof multer.MulterError ? 
          'File upload error' : err.message 
      });
    }

    const id = parseInt(req.params.id);
    const { name, message, info } = req.body;
    
    try {
      // Get current user data
      const [rows] = await pool.execute(
        'SELECT image_key FROM content WHERE id = ?',
        [id]
      );
      
      if (rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      const currentImageKey = rows[0].image_key;
      let newImageKey = currentImageKey;

      // Handle image update
      if (req.file) {
        try {
          newImageKey = await uploadToS3(req.file);
          // Delete old image if it exists
          if (currentImageKey) {
            await deleteFromS3(currentImageKey);
          }
        } catch (s3Err) {
          console.error('S3 upload failed:', s3Err);
          return res.status(500).json({ error: 'Failed to update image' });
        }
      }

      // Update database
      await pool.execute(
        'UPDATE content SET name = ?, message = ?, info = ?, image_key = ? WHERE id = ?',
        [name, message, info, newImageKey, id]
      );

      // Return updated user
      const [updatedUser] = await pool.execute(
        'SELECT * FROM content WHERE id = ?',
        [id]
      );
      
      res.json({
        ...updatedUser[0],
        imageUrl: getImageUrl(newImageKey)
      });
    } catch (dbErr) {
      console.error('Database error:', dbErr);
      res.status(500).json({ error: 'Failed to update user' });
    }
  });
});

// Delete user
app.delete('/data/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  
  try {
    // Get user data first to check for image
    const [rows] = await pool.execute(
      'SELECT image_key FROM content WHERE id = ?',
      [id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const imageKey = rows[0].image_key;

    // Delete from database
    await pool.execute(
      'DELETE FROM content WHERE id = ?',
      [id]
    );

    // Delete image from S3 if exists
    if (imageKey) {
      try {
        await deleteFromS3(imageKey);
      } catch (s3Err) {
        console.error('S3 delete failed:', s3Err);
        // Continue even if image delete fails
      }
    }

    res.json({ 
      message: 'User deleted successfully',
      deletedId: id 
    });
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: err.message 
  });
});

// Start server
async function startServer() {
  try {
    app.listen(port, () => {
      console.log(`Server running on http://localhost:${port}`);
      console.log(`Database: ${process.env.DB_NAME}`);
      console.log(`S3 Bucket: ${process.env.S3_BUCKET_NAME}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();