const fs = require('fs');
const path = require('path');
const { runInference } = require('./ai_engine');

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

async function evaluatePerformance(imagesDir, labelsDir, classesArray) {
  if (!fs.existsSync(labelsDir)) {
    throw new Error('데이터 부족');
  }

  const labelFiles = fs.readdirSync(labelsDir).filter(f => f.endsWith('.txt'));
  
  if (labelFiles.length === 0) {
    throw new Error('데이터 부족');
  }

  console.log('계산 중...');

  // Build prompt from classesArray for AI inference
  const promptString = classesArray.join(', ');

  // Per-classId metrics (GT classId 0, 1, 2, ...)
  const metrics = {};
  classesArray.forEach((cls, idx) => {
    metrics[idx] = { label: cls, TP: 0, FP: 0, FN: 0, sumIoU: 0, countIoU: 0 };
  });
  // Also track "any class" aggregate for class-agnostic comparison
  const aggMetrics = { TP: 0, FP: 0, FN: 0, sumIoU: 0, countIoU: 0 };

  const globalIoUs = [];

  for (const labelFile of labelFiles) {
    const baseName = labelFile.replace('.txt', '');
    
    // Find the corresponding image file
    const imageFiles = fs.readdirSync(imagesDir).filter(f => f.startsWith(baseName + '.'));
    if (imageFiles.length === 0) continue;
    
    const imageFile = imageFiles[0];
    const imagePath = path.join(imagesDir, imageFile);

    // Parse Ground Truth
    const gtContent = fs.readFileSync(path.join(labelsDir, labelFile), 'utf8');
    const gtBoxes = gtContent.split('\n')
      .filter(l => l.trim().length > 0)
      .map(line => {
        const parts = line.trim().split(/\s+/);
        return {
          classId: Number(parts[0]),
          xCenter: Number(parts[1]),
          yCenter: Number(parts[2]),
          width: Number(parts[3]),
          height: Number(parts[4])
        };
      });

    // Run AI Inference (With Caching)
    let aiBoxes = [];
    const cacheDir = path.join(__dirname, 'data', 'predictions');
    const safePromptStr = promptString.replace(/[^a-zA-Z0-9]/g, '_');
    const cacheFile = path.join(cacheDir, `${baseName}_${safePromptStr}.json`);

    try {
      if (fs.existsSync(cacheFile)) {
        const cacheData = fs.readFileSync(cacheFile, 'utf8');
        aiBoxes = JSON.parse(cacheData);
      } else {
        aiBoxes = await runInference(imagePath, promptString, 0.05);
        fs.writeFileSync(cacheFile, JSON.stringify(aiBoxes));
      }
    } catch (err) {
      console.error(`Inference failed for ${imageFile}`, err);
      continue;
    }

    // === CLASS-AGNOSTIC IoU MATCHING ===
    // Compare ALL GT boxes vs ALL AI boxes purely by position overlap
    // This avoids class-name string matching issues entirely
    const matchedAiBoxes = new Set();

    gtBoxes.forEach(gtBox => {
      let bestIoU = 0;
      let bestAiIdx = -1;

      aiBoxes.forEach((aiBox, idx) => {
        if (matchedAiBoxes.has(idx)) return;
        const iou = calculateIoU(gtBox, aiBox);
        if (iou > bestIoU) {
          bestIoU = iou;
          bestAiIdx = idx;
        }
      });

      const gtClassId = gtBox.classId;
      const targetCls = metrics[gtClassId];

      if (bestIoU >= 0.5 && bestAiIdx !== -1) {
        // True Positive
        matchedAiBoxes.add(bestAiIdx);
        aggMetrics.TP++;
        aggMetrics.sumIoU += bestIoU;
        aggMetrics.countIoU++;
        globalIoUs.push(Number(bestIoU.toFixed(4)));

        if (targetCls) {
          targetCls.TP++;
          targetCls.sumIoU += bestIoU;
          targetCls.countIoU++;
        }
      } else {
        // False Negative (GT box not detected)
        aggMetrics.FN++;
        if (targetCls) targetCls.FN++;
      }
    });

    // Remaining unmatched AI boxes = False Positives
    const fp = aiBoxes.length - matchedAiBoxes.size;
    aggMetrics.FP += fp;
    // Distribute FP across first class (or by label if available)
    if (metrics[0]) metrics[0].FP += fp;
  }

  // Calculate final metrics per class
  const finalMetrics = {};
  classesArray.forEach((cls, idx) => {
    const m = metrics[idx] || { TP: 0, FP: 0, FN: 0, sumIoU: 0, countIoU: 0 };
    const precision = m.TP + m.FP > 0 ? m.TP / (m.TP + m.FP) : 0;
    const recall = m.TP + m.FN > 0 ? m.TP / (m.TP + m.FN) : 0;
    const averageIoU = m.countIoU > 0 ? m.sumIoU / m.countIoU : 0;

    finalMetrics[cls] = {
      precision: Number(precision.toFixed(4)),
      recall: Number(recall.toFixed(4)),
      averageIoU: Number(averageIoU.toFixed(4)),
      truePositives: m.TP,
      falsePositives: m.FP,
      falseNegatives: m.FN
    };
  });

  // Also add aggregate stats
  const aggPrecision = aggMetrics.TP + aggMetrics.FP > 0 ? aggMetrics.TP / (aggMetrics.TP + aggMetrics.FP) : 0;
  const aggRecall = aggMetrics.TP + aggMetrics.FN > 0 ? aggMetrics.TP / (aggMetrics.TP + aggMetrics.FN) : 0;
  const aggIoU = aggMetrics.countIoU > 0 ? aggMetrics.sumIoU / aggMetrics.countIoU : 0;

  console.log(`\n📊 전체 집계: TP=${aggMetrics.TP}, FP=${aggMetrics.FP}, FN=${aggMetrics.FN}`);
  console.log(`   Precision=${aggPrecision.toFixed(3)}, Recall=${aggRecall.toFixed(3)}, AvgIoU=${aggIoU.toFixed(3)}`);

  return { metrics: finalMetrics, globalIoUs, aggregate: { precision: Number(aggPrecision.toFixed(4)), recall: Number(aggRecall.toFixed(4)), averageIoU: Number(aggIoU.toFixed(4)), TP: aggMetrics.TP, FP: aggMetrics.FP, FN: aggMetrics.FN } };
}

module.exports = {
  evaluatePerformance
};
