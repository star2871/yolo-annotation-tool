const { preloadModel, runInference } = require('./ai_engine');
const path = require('path');

async function test() {
  await preloadModel();
  try {
    const imagePath = path.join(__dirname, 'data', 'images', '모자안쓴이미지.png');
    console.log('Testing with image:', imagePath);
    const boxes = await runInference(imagePath, 'head');
    console.log('Result:', boxes);
  } catch (err) {
    console.error('Error during test:', err);
  }
}

test();
