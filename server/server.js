const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { preloadModel, runInference } = require('./ai_engine');
const { evaluatePerformance } = require('./metrics');
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Paths
const DATA_DIR = path.join(__dirname, 'data');
const IMAGES_DIR = path.join(DATA_DIR, 'images');
const LABELS_DIR = path.join(DATA_DIR, 'labels');

// Ensure directories exist
if (!fs.existsSync(IMAGES_DIR)) fs.mkdirSync(IMAGES_DIR, { recursive: true });
if (!fs.existsSync(LABELS_DIR)) fs.mkdirSync(LABELS_DIR, { recursive: true });

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, IMAGES_DIR);
  },
  filename: (req, file, cb) => {
    // 한글 등 이름 깨짐 방지용으로 Buffer 파싱 또는 그대로 유지 (MVP에서는 그대로)
    cb(null, Buffer.from(file.originalname, 'latin1').toString('utf8'));
  }
});
const upload = multer({ storage });

// Serve static images so frontend can load them via http://localhost:3001/images/filename.jpg
app.use('/images', express.static(IMAGES_DIR));

// Default User init
let defaultUser;
async function initializeDb() {
  defaultUser = await prisma.user.findUnique({ where: { email: 'test@example.com' } });
  if (!defaultUser) {
    defaultUser = await prisma.user.create({
      data: {
        email: 'test@example.com',
        password: 'dummy_password'
      }
    });
  }
}

// API 1: Get list of images with label status
app.get('/api/images', async (req, res) => {
  try {
    // 1. Sync filesystem with DB
    const files = fs.readdirSync(IMAGES_DIR).filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'].includes(ext);
    });
    
    for (const file of files) {
      let existing = await prisma.image.findFirst({ where: { filePath: file, userId: defaultUser.id } });
      if (!existing) {
        existing = await prisma.image.create({ data: { filePath: file, userId: defaultUser.id } });
        
        // sync label
        const labelFile = file.replace(/\.[^/.]+$/, "") + ".txt";
        const labelPath = path.join(LABELS_DIR, labelFile);
        if (fs.existsSync(labelPath)) {
          const content = fs.readFileSync(labelPath, 'utf8');
          await prisma.label.create({ data: { data: content, imageId: existing.id } });
        }
      }
    }
    
    // 2. Fetch from DB
    const images = await prisma.image.findMany({
      where: { userId: defaultUser.id },
      include: { labels: true }
    });
    
    const result = images.map(img => ({
      name: img.filePath,
      isLabeled: img.labels.length > 0
    }));
    
    res.json(result);
  } catch (error) {
    console.error('Error fetching images:', error);
    res.status(500).json({ error: 'Failed to read images directory' });
  }
});

// API 1.5: Delete an image and its label
app.delete('/api/images/:filename', async (req, res) => {
  const filename = req.params.filename;
  try {
    // Delete from DB
    const image = await prisma.image.findFirst({ where: { filePath: filename, userId: defaultUser.id } });
    if (image) {
      await prisma.image.delete({ where: { id: image.id } });
    }

    // Delete from FS
    const imagePath = path.join(IMAGES_DIR, filename);
    const labelPath = path.join(LABELS_DIR, filename.replace(/\.[^/.]+$/, "") + ".txt");
    if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
    if (fs.existsSync(labelPath)) fs.unlinkSync(labelPath);
    
    res.json({ success: true, message: 'Deleted successfully' });
  } catch (error) {
    console.error('Error deleting image:', error);
    res.status(500).json({ error: 'Failed to delete image' });
  }
});

// API 2: Save YOLO label
app.post('/api/labels', async (req, res) => {
  const { filename, content } = req.body;
  if (!filename || content === undefined) {
    return res.status(400).json({ error: 'Filename and content are required' });
  }

  const baseName = filename.replace(/\.txt$/, '');

  try {
    // Find image in DB
    const images = await prisma.image.findMany({ where: { userId: defaultUser.id } });
    const image = images.find(img => img.filePath.replace(/\.[^/.]+$/, "") === baseName);
    
    if (image) {
      const existingLabel = await prisma.label.findFirst({ where: { imageId: image.id } });
      if (existingLabel) {
        await prisma.label.update({ where: { id: existingLabel.id }, data: { data: content } });
      } else {
        await prisma.label.create({ data: { data: content, imageId: image.id } });
      }
    }

    // Also save to filesystem for AI metrics compatibility
    const filePath = path.join(LABELS_DIR, filename);
    fs.writeFileSync(filePath, content, 'utf8');

    res.json({ success: true, message: 'Label saved successfully' });
  } catch (error) {
    console.error('Error writing label file:', error);
    res.status(500).json({ error: 'Failed to save label' });
  }
});

// API 3: Get YOLO label to load existing boxes
app.get('/api/labels/:filename', async (req, res) => {
  const baseName = req.params.filename.replace(/\.txt$/, '');
  
  try {
    const images = await prisma.image.findMany({ where: { userId: defaultUser.id } });
    const image = images.find(img => img.filePath.replace(/\.[^/.]+$/, "") === baseName);
    
    let labelContent = null;
    if (image) {
      const label = await prisma.label.findFirst({ where: { imageId: image.id } });
      if (label) labelContent = label.data;
    }

    if (labelContent !== null) {
      return res.send(labelContent);
    }
    
    // Fallback to fs
    const filePath = path.join(LABELS_DIR, req.params.filename);
    if (fs.existsSync(filePath)) {
      return res.send(fs.readFileSync(filePath, 'utf8'));
    }
    
    res.status(404).json({ error: 'Label not found' });
  } catch (error) {
    console.error('Error reading label:', error);
    res.status(500).json({ error: 'Failed to read label' });
  }
});

// API 4: Upload images
app.post('/api/upload', upload.array('images', 1000), async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No files uploaded' });
  }
  
  try {
    for (const file of req.files) {
      const filename = Buffer.from(file.originalname, 'latin1').toString('utf8');
      const existing = await prisma.image.findFirst({ where: { filePath: filename, userId: defaultUser.id } });
      if (!existing) {
        await prisma.image.create({ data: { filePath: filename, userId: defaultUser.id } });
      }
    }
    res.json({ success: true, count: req.files.length });
  } catch (error) {
    console.error('Upload DB error:', error);
    res.status(500).json({ error: 'Failed to save to database' });
  }
});

// API 5: Run AI Inference
app.post('/api/infer', async (req, res) => {
  const { filename, prompt, threshold } = req.body;
  if (!filename) {
    return res.status(400).json({ error: 'Filename is required' });
  }

  const imagePath = path.join(IMAGES_DIR, filename);
  if (!fs.existsSync(imagePath)) {
    return res.status(404).json({ error: 'Image not found' });
  }

  try {
    const boxes = await runInference(imagePath, prompt, threshold || 0.05);
    res.json({ success: true, boxes });
  } catch (error) {
    console.error('Inference error:', error);
    res.status(500).json({ error: error.message });
  }
});

// API 6: Get Performance Metrics
app.get('/api/performance-metrics', async (req, res) => {
  try {
    const classesStr = req.query.classes || 'Person,Car,Dog,Cat';
    const classesArray = classesStr.split(',').map(s => s.trim());
    
    const metrics = await evaluatePerformance(IMAGES_DIR, LABELS_DIR, classesArray);
    res.json({ success: true, data: metrics });
  } catch (error) {
    console.error('Metrics calculation error:', error);
    if (error.message === '데이터 부족') {
      res.status(400).json({ error: '데이터 부족' });
    } else {
      res.status(500).json({ error: '계산 중 오류 발생' });
    }
  }
});

app.listen(PORT, async () => {
  console.log(`🚀 YoloTrace Backend is running on http://localhost:${PORT}`);
  console.log(`📂 Images Directory: ${IMAGES_DIR}`);
  console.log(`📂 Labels Directory: ${LABELS_DIR}`);
  
  // Initialize Database
  await initializeDb();
  
  // Preload AI Model
  await preloadModel();
});
