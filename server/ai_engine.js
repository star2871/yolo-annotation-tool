const { pipeline, env } = require('@xenova/transformers');
const sizeOf = require('image-size');
const path = require('path');
const fs = require('fs');

// Configure environment
env.allowLocalModels = true;

// [FUTURE GPU SUPPORT] 
// 나중에 GPU가 있는 서버로 코드를 옮길 때, 성능을 극대화하려면 
// 1. 'onnxruntime-node' 패키지 대신 'onnxruntime-node-gpu' 설치를 고려하거나
// 2. 아래 설정을 활성화하여 백엔드 디바이스를 명시적으로 지정할 수 있습니다.
// env.backends.onnx.wasm.numThreads = 4; // CPU 스레드 최적화
// env.backends.onnx.executionProviders = ['cuda', 'cpu']; // CUDA GPU 활성화

let detector = null;
let isLoaded = false;

/**
 * Initialize and preload the AI model (Zero-Shot Object Detection)
 * Call this when the server starts.
 */
async function preloadModel() {
  if (isLoaded) return;
  console.log('⏳ Loading Zero-Shot AI Model (Xenova/owlvit-base-patch32)... This may take a while on first run.');
  try {
    // zero-shot-object-detection allows us to pass custom labels as prompt
    detector = await pipeline('zero-shot-object-detection', 'Xenova/owlvit-base-patch32');
    isLoaded = true;
    console.log('✅ AI Model loaded successfully!');
  } catch (error) {
    console.error('❌ Failed to load AI Model:', error);
  }
}

/**
 * Run Zero-Shot Object Detection inference on a given image.
 * @param {string} imagePath Absolute path to the image
 * @param {string} prompt Text prompt (e.g., "head", "car wheel")
 * @returns {Promise<Array>} Array of YOLO boxes
 */
async function runInference(imagePath, prompt = "", threshold = 0.05) {
  if (!detector) {
    throw new Error('Model is not loaded yet');
  }

  // 1. Get image via image-size
  const dimensions = sizeOf(imagePath);
  const imgW = dimensions.width;
  const imgH = dimensions.height;

  // Parse prompt into an array of labels. If empty, fallback to a default object like 'person'
  const candidate_labels = prompt ? prompt.split(',').map(s => s.trim()) : ['object'];

  // 2. Run inference
  let results;
  try {
    results = await detector(imagePath, candidate_labels, { threshold }); 
  } catch (err) {
    console.error('❌ Inference failed:', err);
    if (err.message && err.message.includes('memory')) {
      throw new Error('AI Model Error: Out of Memory. Try closing other apps or using a smaller image.');
    }
    throw err;
  }

  // 3. Convert results to normalized YOLO boxes
  // detector returns: [{ score, label, box: { xmin, ymin, xmax, ymax } }]
  const boxes = results.map(r => {
    const { xmin, ymin, xmax, ymax } = r.box;
    // Normalize coordinates to 0..1
    const n_xmin = xmin / imgW;
    const n_ymin = ymin / imgH;
    const n_xmax = xmax / imgW;
    const n_ymax = ymax / imgH;

    const width = n_xmax - n_xmin;
    const height = n_ymax - n_ymin;
    const xCenter = n_xmin + width / 2;
    const yCenter = n_ymin + height / 2;

    return {
      label: r.label,
      xCenter,
      yCenter,
      width,
      height,
      score: r.score
    };
  });

  return boxes;
}

module.exports = {
  preloadModel,
  runInference
};
