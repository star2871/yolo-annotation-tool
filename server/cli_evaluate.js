const path = require('path');
const { evaluatePerformance } = require('./metrics');
const { preloadModel } = require('./ai_engine');

const IMAGES_DIR = path.join(__dirname, 'data', 'images');
const LABELS_DIR = path.join(__dirname, 'data', 'labels');

// 측정 대상 클래스 (명령어 인수로 override 가능)
// 현재 데이터셋: hard hat workers (helmet=0, head=1, person=2)
const classesArg = process.argv[2];
const classesArray = classesArg ? classesArg.split(',').map(s => s.trim()) : ['helmet', 'head', 'person'];

console.log(`\n🚀 YOLO Trace - 로컬 AI 성능 평가 스크립트 시작!`);
console.log(`▶ 측정 대상 클래스: ${classesArray.join(', ')}\n`);

async function run() {
  try {
    console.log('🤖 AI 모델을 로드 중입니다 (잠시만 기다려주세요)...');
    await preloadModel();

    const { metrics, globalIoUs } = await evaluatePerformance(IMAGES_DIR, LABELS_DIR, classesArray);
    
    console.log('\n✅ 평가 완료! [클래스별 성능 지표 요약]');
    console.log('----------------------------------------------------');
    
    // 터미널에 예쁘게 표 형태로 출력하기 위해 데이터 가공
    const tableData = classesArray.map(cls => ({
      '클래스 (Class)': cls,
      '정밀도 (Precision)': metrics[cls].precision,
      '재현율 (Recall)': metrics[cls].recall,
      '평균 IoU': metrics[cls].averageIoU,
      '맞춤 (TP)': metrics[cls].truePositives,
      '오탐 (FP)': metrics[cls].falsePositives,
      '놓침 (FN)': metrics[cls].falseNegatives
    }));
    
    // console.table을 사용하면 터미널에 깔끔한 표가 그려집니다.
    console.table(tableData);
    
    console.log(`\n📊 추가 통계 정보:`);
    console.log(`총 ${globalIoUs.length}개의 정답 객체(True Positives)에 대한 매칭 결과가 수집되었습니다.`);
    console.log('웹 대시보드(프론트엔드)에 접속하시면 이 데이터를 바탕으로 세밀한 IoU 히스토그램 차트를 보실 수 있습니다.\n');

  } catch (err) {
    console.error('\n❌ 에러 발생:', err.message);
    if (err.message === '데이터 부족') {
      console.log('💡 해결 방법: 웹 화면에서 이미지를 라벨링하고 저장하여 서버(server/data/labels)에 데이터를 먼저 만들어주세요.');
    }
  }
}

run();
