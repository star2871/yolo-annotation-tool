import React, { useState, useEffect, useRef } from 'react';
import { X, Loader2, AlertCircle, Download } from 'lucide-react';

// Custom Plotly wrapper to bypass Vite build crashes
function PlotlyChart({ data, layout, config, style }) {
  const chartRef = useRef(null);

  useEffect(() => {
    let checkInterval;
    const renderChart = () => {
      if (window.Plotly && chartRef.current) {
        window.Plotly.react(chartRef.current, data, layout, config);
        clearInterval(checkInterval);
      }
    };
    
    // Try to render immediately
    renderChart();
    
    // If Plotly is not yet loaded from CDN, poll every 100ms
    if (!window.Plotly) {
      checkInterval = setInterval(renderChart, 100);
    }

    // Handle window resize for responsiveness
    const handleResize = () => {
      if (window.Plotly && chartRef.current) {
        window.Plotly.Plots.resize(chartRef.current);
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      clearInterval(checkInterval);
      window.removeEventListener('resize', handleResize);
    };
  }, [data, layout, config]);

  return <div ref={chartRef} style={style} />;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function PerformanceDashboard({ onClose, currentClasses = [] }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [metricsData, setMetricsData] = useState(null);

  useEffect(() => {
    // Add escape key listener to close modal
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    // Fetch metrics with actual classes from frontend
    const classesParam = encodeURIComponent(currentClasses.join(','));
    const fetchUrl = currentClasses.length > 0 
      ? `${API_URL}/api/performance-metrics?classes=${classesParam}` 
      : `${API_URL}/api/performance-metrics`;

    fetch(fetchUrl)
      .then(res => {
        if (!res.ok) {
          return res.json().then(err => { throw new Error(err.error || 'Failed to fetch metrics') });
        }
        return res.json();
      })
      .then(data => {
        if (!data || !data.success) {
          throw new Error('서버에서 데이터를 가져오지 못했습니다.');
        }
        if (data.data && data.data.metrics) {
          setMetricsData(data.data);
        } else if (data.data && !data.data.metrics) {
           // backward compatibility if backend hasn't restarted yet
           setMetricsData({ metrics: data.data, globalIoUs: [] });
        } else {
          throw new Error('올바르지 않은 데이터 형식입니다.');
        }
      })
      .catch(err => {
        setError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-indigo-400 gap-4">
          <Loader2 size={48} className="animate-spin" />
          <p className="text-lg font-medium text-gray-300">
            데이터를 스캔하고 AI와 정답을 비교 분석 중입니다...
            <br/><span className="text-sm text-gray-500">(이미지 수에 따라 다소 시간이 걸릴 수 있습니다)</span>
          </p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-red-400 gap-4">
          <AlertCircle size={48} />
          <h2 className="text-xl font-bold">오류 발생</h2>
          <p className="text-gray-300 text-center">
            {error === '데이터 부족' 
              ? '비교할 수 있는 라벨 데이터(Ground Truth)가 없습니다.\n먼저 이미지를 라벨링하고 저장해주세요.'
              : error}
          </p>
        </div>
      );
    }

    if (!metricsData) return null;

    const metrics = metricsData.metrics;
    const globalIoUs = metricsData.globalIoUs || [];
    const classes = Object.keys(metrics);
    
    // Precision Trace
    const tracePrecision = {
      x: classes,
      y: classes.map(c => metrics[c].precision),
      name: '정밀도 (Precision)',
      type: 'bar',
      marker: { color: '#818cf8', opacity: 0.9 }, // indigo-400
      hovertemplate: 
        '<b>%{x} 클래스</b><br>' +
        '<span style="color:#818cf8">정밀도: %{y:.3f}</span><br>' +
        '평균 IoU: %{customdata[0]:.3f}<br>' +
        '맞춤(TP): %{customdata[1]} | 오탐(FP): %{customdata[2]}<extra></extra>',
      customdata: classes.map(c => [metrics[c].averageIoU, metrics[c].truePositives, metrics[c].falsePositives])
    };

    // Recall Trace
    const traceRecall = {
      x: classes,
      y: classes.map(c => metrics[c].recall),
      name: '재현율 (Recall)',
      type: 'bar',
      marker: { color: '#34d399', opacity: 0.9 }, // emerald-400
      hovertemplate: 
        '<b>%{x} 클래스</b><br>' +
        '<span style="color:#34d399">재현율: %{y:.3f}</span><br>' +
        '평균 IoU: %{customdata[0]:.3f}<br>' +
        '맞춤(TP): %{customdata[1]} | 놓침(FN): %{customdata[2]}<extra></extra>',
      customdata: classes.map(c => [metrics[c].averageIoU, metrics[c].truePositives, metrics[c].falseNegatives])
    };

    // IoU Histogram Trace
    const traceHistogram = {
      x: globalIoUs,
      name: 'IoU 분포',
      type: 'histogram',
      marker: { color: '#fcd34d', opacity: 0.8 }, // amber-300
      xbins: { start: 0.5, end: 1.0, size: 0.05 },
      hovertemplate: 'IoU 구간: %{x}<br>빈도수: %{y}개<extra></extra>',
      xaxis: 'x2',
      yaxis: 'y2'
    };

    const layout = {
      title: {
        text: 'AI 라벨링 성능 평가 리포트',
        font: { size: 24, color: '#f3f4f6', family: 'Pretendard, sans-serif' }
      },
      paper_bgcolor: 'rgba(0,0,0,0)', // Transparent
      plot_bgcolor: 'rgba(0,0,0,0)',
      font: { color: '#9ca3af', family: 'Pretendard, sans-serif' },
      xaxis: { 
        title: '클래스 (Class)',
        gridcolor: '#374151',
        zerolinecolor: '#4b5563',
        domain: [0, 1]
      },
      yaxis: { 
        title: '성능 지표 (0 ~ 1)', 
        range: [0, 1.05], 
        gridcolor: '#374151',
        zerolinecolor: '#4b5563',
        domain: [0.55, 1]
      },
      xaxis2: {
        title: 'IoU 점수 (0.5 ~ 1.0)',
        gridcolor: '#374151',
        zerolinecolor: '#4b5563',
        domain: [0, 1],
        anchor: 'y2'
      },
      yaxis2: {
        title: '박스 개수 (빈도)',
        gridcolor: '#374151',
        zerolinecolor: '#4b5563',
        domain: [0, 0.35],
        anchor: 'x2'
      },
      transition: { duration: 500, easing: 'cubic-in-out' },
      margin: { t: 80, l: 60, r: 40, b: 60 },
      legend: { 
        x: 0, 
        y: 1.1, 
        orientation: 'h',
        font: { color: '#d1d5db' },
        bgcolor: 'rgba(0,0,0,0.5)',
        bordercolor: '#4b5563',
        borderwidth: 1
      },
      hoverlabel: {
        bgcolor: '#1f2937',
        bordercolor: '#4b5563',
        font: { color: '#f3f4f6' }
      }
    };

    const config = {
      responsive: true,
      displayModeBar: false
    };

    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-4">
        <div className="w-full h-full max-w-5xl bg-gray-900/50 rounded-xl border border-gray-700 shadow-inner p-2 relative overflow-hidden">
          <PlotlyChart
            data={[tracePrecision, traceRecall, traceHistogram]}
            layout={layout}
            config={config}
            style={{ width: '100%', height: '100%' }}
          />
        </div>
        <p className="mt-4 text-sm text-gray-500">
          💡 팁: 범례(Legend)를 클릭하면 특정 지표를 켜거나 끌 수 있습니다. 상단 차트는 클래스별 성능, 하단은 IoU 분포입니다.
        </p>
      </div>
    );
  };

  const handleDownloadReport = () => {
    if (!metricsData) return;
    const dataStr = JSON.stringify(metricsData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance_report_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-950/80 backdrop-blur-md">
      <div className="relative w-[90vw] h-[90vh] bg-gray-900 rounded-2xl border border-gray-700 shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="h-14 shrink-0 flex items-center justify-between px-6 border-b border-gray-800 bg-gray-900">
          <h2 className="text-lg font-bold text-gray-100 flex items-center gap-2">
            📊 AI 모델 객관적 성능 지표
          </h2>
          <div className="flex items-center gap-3">
            {metricsData && (
              <button 
                onClick={handleDownloadReport}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
              >
                <Download size={16} />
                Download Report
              </button>
            )}
            <button 
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-white hover:bg-red-500/20 rounded-md transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}

export default PerformanceDashboard;
