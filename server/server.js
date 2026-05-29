const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

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

// API 1: Get list of images
app.get('/api/images', (req, res) => {
  fs.readdir(IMAGES_DIR, (err, files) => {
    if (err) {
      console.error('Error reading images directory:', err);
      return res.status(500).json({ error: 'Failed to read images directory' });
    }
    
    // Filter only image files
    const validExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
    const imageFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return validExtensions.includes(ext);
    });

    res.json(imageFiles);
  });
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
app.post('/api/upload', upload.array('images', 50), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No files uploaded' });
  }
  res.json({ success: true, count: req.files.length });
});

app.listen(PORT, () => {
  console.log(`🚀 YoloTrace Backend is running on http://localhost:${PORT}`);
  console.log(`📂 Images Directory: ${IMAGES_DIR}`);
  console.log(`📂 Labels Directory: ${LABELS_DIR}`);
});
