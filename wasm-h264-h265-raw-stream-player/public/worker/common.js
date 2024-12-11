
// 使用 performance.now() 的简单封装
function performanceTimeStart(label) {
  performance.mark(`${label}-start`);
}

function performanceTimeEnd(label, threshold = 0) {
  performance.mark(`${label}-end`);
  const measure = performance.measure(label, `${label}-start`, `${label}-end`);

  if (measure.duration >= threshold) {
    console.log(`${label}: ${measure.duration.toFixed(2)}ms`);
  }

  // 清理标记
  performance.clearMarks(`${label}-start`);
  performance.clearMarks(`${label}-end`);
  performance.clearMeasures(label);
}

const sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// FPS 计算，带有性能监控的完整版本
class PerformanceMonitor {
  constructor() {
    this.fps = 0;
    this.frames = 0;
    this.startTime = performance.now();
    this.prevTime = this.startTime;
    this.fpsHistory = [];
    this.maxHistoryLength = 60; // 保存最近60帧的数据

    // 性能统计
    this.stats = {
      min: Infinity,
      max: 0,
      average: 0,
      current: 0
    };
  }

  update() {
    const currentTime = performance.now();
    const deltaTime = currentTime - this.prevTime;
    this.prevTime = currentTime;

    // 计算当前 FPS
    const currentFps = 1000 / deltaTime;

    // 更新历史记录
    this.fpsHistory.push(currentFps);
    if (this.fpsHistory.length > this.maxHistoryLength) {
      this.fpsHistory.shift();
    }

    // 计算统计数据
    this.calculateStats();

    this.stats.current = Math.round(currentFps);
    return this.stats
  }

  calculateStats() {
    if (this.fpsHistory.length === 0) return;

    this.stats.min = Math.min(...this.fpsHistory);
    this.stats.max = Math.max(...this.fpsHistory);
    this.stats.average = this.fpsHistory.reduce((sum, fps) => sum + fps, 0) / this.fpsHistory.length;

    // 四舍五入
    Object.keys(this.stats).forEach(key => {
      this.stats[key] = Math.round(this.stats[key]);
    });
  }
}
// 通用节流函数
function throttle(fn, delay, options = {}) {
  let lastTime = 0;
  let timer = null;
  const {
    leading = true,    // 是否立即执行第一次
    trailing = true    // 是否执行最后一次
  } = options;

  return function throttled(...args) {
    const now = Date.now();

    // 第一次是否执行
    if (lastTime === 0 && !leading) {
      lastTime = now;
    }

    const remaining = delay - (now - lastTime);

    // 清除之前的定时器
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }

    if (remaining <= 0) {
      // 已经超过延迟时间，立即执行
      fn.apply(this, args);
      lastTime = now;
    } else if (trailing) {
      // 设置定时器确保最后一次调用执行
      timer = setTimeout(() => {
        fn.apply(this, args);
        lastTime = leading ? Date.now() : 0; // 重置 lastTime
        timer = null;
      }, remaining);
    }
  };
}
