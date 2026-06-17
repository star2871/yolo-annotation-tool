const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { preloadModel, runInference } = require('./ai_engine');
const { evaluatePerformance } = require('./metrics');
require('dotenv').config();

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
    // multer 2.x natively handles utf8
    cb(null, file.originalname);
  }
});
const upload = multer({ storage });

// Serve static images so frontend can load them via http://localhost:3001/images/filename.jpg
app.use('/images', express.static(IMAGES_DIR));

// API 1: Get list of images with label status
app.get('/api/images', async (req, res) => {
  try {
    const files = fs.readdirSync(IMAGES_DIR).filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'].includes(ext);
    });
    
    const result = files.map(file => {
      const labelFile = file.replace(/\.[^/.]+$/, "") + ".txt";
      const labelPath = path.join(LABELS_DIR, labelFile);
      const isLabeled = fs.existsSync(labelPath) && fs.readFileSync(labelPath, 'utf8').trim().length > 0;
      
      return {
        name: file,
        isLabeled: isLabeled
      };
    });
    
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

  try {
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
  try {
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
    res.json({ success: true, count: req.files.length });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to save uploaded files' });
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
  
  // Preload AI Model
  await preloadModel();
});
