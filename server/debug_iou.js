// Debug: print actual IoU values between GT boxes and AI boxes
const fs = require('fs');
const path = require('path');

function calculateIoU(box1, box2) {
  const b1_xmin = box1.xCenter - box1.width / 2;
  const b1_xmax = box1.xCenter + box1.width / 2;
  const b1_ymin = box1.yCenter - box1.height / 2;
  const b1_ymax = box1.yCenter + box1.height / 2;

  const b2_xmin = box2.xCenter - box2.width / 2;
  const b2_xmax = box2.xCenter + box2.width / 2;
  const b2_ymin = box2.yCenter - box2.height / 2;
  const b2_ymax = box2.yCenter + box2.height / 2;

  const x_left = Math.max(b1_xmin, b2_xmin);
  const y_top = Math.max(b1_ymin, b2_ymin);
  const x_right = Math.min(b1_xmax, b2_xmax);
  const y_bottom = Math.min(b1_ymax, b2_ymax);

  if (x_right < x_left || y_bottom < y_top) return 0.0;

  const intersection_area = (x_right - x_left) * (y_bottom - y_top);
  const b1_area = (b1_xmax - b1_xmin) * (b1_ymax - b1_ymin);
  const b2_area = (b2_xmax - b2_xmin) * (b2_ymax - b2_ymin);
  const union_area = b1_area + b2_area - intersection_area;
  return intersection_area / union_area;
}

// Load one GT file and one cache file
const labelsDir = path.join(__dirname, 'data', 'labels');
const predictionsDir = path.join(__dirname, 'data', 'predictions');

const labelFile = 'hard_hat_workers2473_png.rf.fdf713541405f86a6b6613bd9500fd0c.txt';
const cacheFile = path.join(predictionsDir, 'hard_hat_workers2473_png.rf.fdf713541405f86a6b6613bd9500fd0c_Person__Car__Dog__Cat.json');

const gtContent = fs.readFileSync(path.join(labelsDir, labelFile), 'utf8');
const gtBoxes = gtContent.split('\n').filter(l => l.trim()).map(line => {
  const parts = line.trim().split(/\s+/);
  return { classId: Number(parts[0]), xCenter: Number(parts[1]), yCenter: Number(parts[2]), width: Number(parts[3]), height: Number(parts[4]) };
});

const aiBoxes = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));

console.log(`GT boxes: ${gtBoxes.length}, AI boxes: ${aiBoxes.length}`);
console.log('\nGT boxes (first 3):');
gtBoxes.slice(0, 3).forEach((b, i) => console.log(`  [${i}] class=${b.classId} xC=${b.xCenter.toFixed(3)} yC=${b.yCenter.toFixed(3)} w=${b.width.toFixed(3)} h=${b.height.toFixed(3)}`));
console.log('\nAI boxes:');
aiBoxes.forEach((b, i) => console.log(`  [${i}] label=${b.label} xC=${b.xCenter.toFixed(3)} yC=${b.yCenter.toFixed(3)} w=${b.width.toFixed(3)} h=${b.height.toFixed(3)} score=${b.score.toFixed(3)}`));

console.log('\nBest IoU for each GT box:');
gtBoxes.forEach((gt, gi) => {
  let bestIoU = 0;
  aiBoxes.forEach(ai => {
    const iou = calculateIoU(gt, ai);
    if (iou > bestIoU) bestIoU = iou;
  });
  console.log(`  GT[${gi}] best IoU = ${bestIoU.toFixed(4)}`);
});
