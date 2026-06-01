const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { preloadModel, runInference } = require('./ai_engine');
const { evaluatePerformance } = require('./metrics');

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

// API 1: Get list of images with label status
app.get('/api/images', (req, res) => {
  fs.readdir(IMAGES_DIR, (err, files) => {
    if (err) {
      console.error('Error reading images directory:', err);
      return res.status(500).json({ error: 'Failed to read images directory' });
    }
    
    // Filter only image files
    const imageFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'].includes(ext);
    });

    // Check if label exists for each image
    const imagesWithStatus = imageFiles.map(file => {
      const labelFile = file.replace(/\.[^/.]+$/, "") + ".txt";
      const isLabeled = fs.existsSync(path.join(LABELS_DIR, labelFile));
      return {
        name: file,
        isLabeled
      };
    });

    res.json(imagesWithStatus);
  });
});

// API 1.5: Delete an image and its label
app.delete('/api/images/:filename', (req, res) => {
  const filename = req.params.filename;
  const imagePath = path.join(IMAGES_DIR, filename);
  const labelPath = path.join(LABELS_DIR, filename.replace(/\.[^/.]+$/, "") + ".txt");

  try {
    if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
    if (fs.existsSync(labelPath)) fs.unlinkSync(labelPath);
    res.json({ success: true, message: 'Deleted successfully' });
  } catch (error) {
    console.error('Error deleting image:', error);
    res.status(500).json({ error: 'Failed to delete image' });
  }
});

// API 2: Save YOLO label
app.post('/api/labels', (req, res) => {
  const { filename, content } = req.body;

  if (!filename || content === undefined) {
    return res.status(400).json({ error: 'Filename and content are required' });
  }

  const filePath = path.join(LABELS_DIR, filename);

  // Path traversal prevention
  if (path.dirname(path.normalize(filePath)) !== LABELS_DIR) {
    return res.status(400).json({ error: 'Invalid filename' });
  }

  fs.writeFile(filePath, content, 'utf8', (err) => {
    if (err) {
      console.error('Error writing label file:', err);
      return res.status(500).json({ error: 'Failed to save label' });
    }
    res.json({ success: true, message: 'Label saved successfully' });
  });
});

// API 3: Get YOLO label to load existing boxes
app.get('/api/labels/:filename', (req, res) => {
  const filePath = path.join(LABELS_DIR, req.params.filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Label not found' });
  }
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) return res.status(500).json({ error: 'Failed to read label' });
    res.send(data);
  });
});

// API 4: Upload images
app.post('/api/upload', upload.array('images', 1000), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No files uploaded' });
  }
  res.json({ success: true, count: req.files.length });
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
