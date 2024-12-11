var worker = new Worker('worker/video-worker.js');

// https://juejin.cn/post/7398933999319990291
const canvasOffscreen = document.createElement('canvas').transferControlToOffscreen()

const canvas = document.getElementById('playCanvas')
// const ctx = canvas.getContext('2d');

const statusDisplay = document.getElementById('statusDisplay')
const statusDisplayFreq = document.getElementById('statusDisplayFreq')

// worker.postMessage('Hello World');

worker.onmessage = (event) => {
  // console.log('Received message ', event.data);
  const {
    type,
    payload,
    timestamp
  } = event.data;
  // if (type === 'frameRendered') {
  //   // if (timestamp) {
  //   //   console.log('om_timestamp', Date.now() - timestamp + 'ms');
  //   // }
  //   // console.log('frameRendered', payload)
  //
  //   addVideoQueue(payload);
  // }
  if (type === 'renderFrame') {
    // if (timestamp) {
    //   console.log('om_timestamp', Date.now() - timestamp + 'ms');
    // }
    // console.log('frameRendered', payload)

    addVideoQueue(payload);
  }
}

var DECODER_H264 = 0;
var DECODER_H265 = 1;

var decoder_type = DECODER_H265;

const CHUNK_SIZE = 4096 * 5; //4096;

function handleVideoFiles(files) {
  decodeFile(files[0]);
}

function setDecoder(type) {
  decoder_type = type;
  worker.postMessage({
    type: 'initDecoder',
    payload: {
      canvas: canvasOffscreen,
      decoder_type,
      CHUNK_SIZE
    }
  }, [canvasOffscreen]);
}

var i_stream_size = 0;
var filePos = 0;

async function decodeFile(file) {
  if (!file) {
    return
  }

  console.log('CHUNK_SIZE', CHUNK_SIZE)
  i_stream_size = 0;
  filePos = 0;


  do {
    // loopCount++

    // if (loopCount > 10000) {
    //   console.warn('sleep 10s')
    //   await sleep(10000)
    // }

    // performanceTimeStart('readFileSlice');
    const res = await readFileSlice(file, filePos, CHUNK_SIZE);
    i_stream_size = res.i_stream_size

    worker.postMessage({
      type: 'decodeData',
      payload: res.buffer,
      timestamp: Date.now()
    }, [res.buffer]);

    // performanceTimeEnd('readFileSlice');
    filePos += i_stream_size;

    updateFreqDisplay()
    // await sleep(10)
  } while (i_stream_size > 0);
  console.log('read file done');

}

//从地址 start_addr 开始读取 size 大小的数据
function readFileSlice(file, start_addr, size) {
  return new Promise(resolve => {
    var file_size = file.size;
    var file_slice;
    var reader = new FileReader();

    let i_stream_size
    if (start_addr > file_size - 1) {
      i_stream_size = 0;
    } else if (start_addr + size > file_size - 1) {
      file_slice = blob_slice(file, start_addr, file_size);
      reader.readAsArrayBuffer(file_slice);
      i_stream_size = file_size - start_addr;
    } else {
      file_slice = blob_slice(file, start_addr, start_addr + size);
      reader.readAsArrayBuffer(file_slice);
      i_stream_size = size;
    }

    reader.onload = function () {
      resolve({i_stream_size, buffer: this.result})
    }
  })
}

function blob_slice(blob, start_addr, end_addr) {
  if (blob.slice) {
    return blob.slice(start_addr, end_addr);
  }
  return null;
}

// render


// 设置目标帧率为 30 FPS
const TARGET_FPS = 30
// 计算每帧之间的时间间隔（毫秒）
const FRAME_TIME = 1000 / TARGET_FPS

// 创建帧缓冲队列
const frameQueue = []
let isPlaying = false

let lastFrameTime = 0
let webglPlayer

const fpsMonitor = new PerformanceMonitor();
let totalFrameCount = 0

function renderLoop(currentTime) {
  // console.log('renderLoop', currentTime)
  // 计算距离上一帧的时间差
  const deltaTime = currentTime - lastFrameTime


  // 如果时间差大于等于预期的帧时间，则执行渲染
  if (deltaTime >= FRAME_TIME) {
    // console.log('renderLoop: frameRendered');
    // 更新上一帧时间
    lastFrameTime = currentTime

    // 播放动画逻辑
    const currentFrame = frameQueue.shift()
    updateFreqDisplay()
    if (!currentFrame) {
      console.error('end')
      return
    }

    const data = new Uint8Array(currentFrame.data)
    const width = currentFrame.width
    const height = currentFrame.height
    const yLength = width * height
    const uvLength = (width / 2) * (height / 2)
    if (!webglPlayer) {
      canvas.width = width
      canvas.height = height
      webglPlayer = new WebGLPlayer(canvas)
    }

    webglPlayer.renderFrame(data, width, height, yLength, uvLength)

    // ctx.drawImage(currentFrame, 0, 0);

    totalFrameCount++

    // FPS 计算
    fpsMonitor.update();
  }

  if (frameQueue.length > 0) {
    // console.log('renderLoop: 继续请求下一帧', currentTime)
    // 继续请求下一帧
    requestAnimationFrame(renderLoop)
  } else {
    console.warn('renderLoop: queue empty!')
    isPlaying = false
    // 开始动画循环
    lastFrameTime = 0
    lastFPSUpdate = 0
    frameCount = 0
  }
}


const updateFreqDisplay = throttle(function () {
  statusDisplayFreq.innerText = `    FPS: ${fpsMonitor.stats.current}
    Min: ${fpsMonitor.stats.min}
    Max: ${fpsMonitor.stats.max}
    Avg: ${fpsMonitor.stats.average}
totalFrameCount: ${totalFrameCount}
filePos: ${filePos}
frameQueue.length: ${frameQueue.length}`
}, 100)

function addVideoQueue(payload) {
  // console.log('[addVideoQueue]', payload)
  // 将当前帧加入队列
  frameQueue.push(payload)

  // frameQueue.push(payload.bitmap)
  updateFreqDisplay()


  // 如果还没开始播放，启动渲染循环 && frameQueue.length >= TARGET_FPS
  if (!isPlaying && frameQueue.length >= TARGET_FPS * (2 / 3)) {
    // console.log('[addVideoQueue] play trigger',)

    canvas.width = payload.width;
    canvas.height = payload.height;

    statusDisplay.innerText = `Size: ${payload.width}x${payload.height}
Target FPS: ${TARGET_FPS}
CHUNK_SIZE: ${CHUNK_SIZE}`

    isPlaying = true
    requestAnimationFrame(renderLoop)
  }
}

// function addVideoQueue(payload) {
//   // console.log('[addVideoQueue]', payload)
//   // 将当前帧加入队列
//   frameQueue.push(payload.bitmap)
//   updateFreqDisplay()
//
//
//   // 如果还没开始播放，启动渲染循环 && frameQueue.length >= TARGET_FPS
//   if (!isPlaying && frameQueue.length >= TARGET_FPS * (2 / 3)) {
//     // console.log('[addVideoQueue] play trigger',)
//
//     canvas.width = payload.width;
//     canvas.height = payload.height;
//
//     statusDisplay.innerText = `Size: ${payload.width}x${payload.height}
// Target FPS: ${TARGET_FPS}
// CHUNK_SIZE: ${CHUNK_SIZE}`
//
//     isPlaying = true
//     requestAnimationFrame(renderLoop)
//   }
// }