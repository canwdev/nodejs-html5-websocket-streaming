/**
 * TODO
 * https://github.com/GoogleChromeLabs/comlink
 * https://juejin.cn/post/6998876488451751973
 */

self.Module = {
  onRuntimeInitialized: function () {
    console.log('onRuntimeInitialized', Module)
  }
};
importScripts("libffmpeg_264_265.js");
importScripts("common.js");
// importScripts('webgl.js')

var decoder_type
var videoSize = 0;
var LOG_LEVEL_JS = 0;
var LOG_LEVEL_WASM = 1;
var LOG_LEVEL_FFMPEG = 2;

var CHUNK_SIZE

var readerIndex = 0
var totalSize = 0
var pts = 0

const initDecoder = (payload) => {
  if (!payload.canvas) {
    throw new Error('canvas is required! see: https://juejin.cn/post/7398933999319990291',)
  }
  canvas = payload.canvas
  videoSize = 0
  decoder_type = payload.decoder_type
  CHUNK_SIZE = payload.CHUNK_SIZE

  readerIndex = 0
  totalSize = 0
  pts = 0

  let lastCbTimestamp = performance.now()
  var videoCallback = Module.addFunction((addr_y, addr_u, addr_v, stride_y, stride_u, stride_v, width, height, pts) => {

    // performanceTimeStart('performance:videoCallback');

    // 预计算尺寸
    const ySize = width * height;
    const uvSize = (width * height) >> 2; // 除以4
    const totalSize = ySize + (uvSize << 1); // uvSize * 2

    // 一次性分配内存
    const data = new Uint8Array(totalSize);

    // Y 平面: 使用 TypedArray.set 一次性复制
    if (stride_y === width) {
      // 如果步长等于宽度,可以一次性复制
      data.set(HEAPU8.subarray(addr_y, addr_y + ySize), 0);
    } else {
      // 否则需要逐行复制
      for (let i = 0; i < height; i++) {
        data.set(
          HEAPU8.subarray(addr_y + i * stride_y, addr_y + i * stride_y + width),
          i * width
        );
      }
    }

    // U 平面
    const halfWidth = width >> 1;
    const halfHeight = height >> 1;
    if (stride_u === halfWidth) {
      data.set(HEAPU8.subarray(addr_u, addr_u + uvSize), ySize);
    } else {
      for (let i = 0; i < halfHeight; i++) {
        data.set(
          HEAPU8.subarray(addr_u + i * stride_u, addr_u + i * stride_u + halfWidth),
          ySize + i * halfWidth
        );
      }
    }

    // V 平面
    if (stride_v === halfWidth) {
      data.set(HEAPU8.subarray(addr_v, addr_v + uvSize), ySize + uvSize);
    } else {
      for (let i = 0; i < halfHeight; i++) {
        data.set(
          HEAPU8.subarray(addr_v + i * stride_v, addr_v + i * stride_v + halfWidth),
          ySize + uvSize + i * halfWidth
        );
      }
    }

    const obj = {data, width, height};


    // self.postMessage({
    //   type: 'addVideoFrame',
    //   payload: obj,
    //   timestamp: Date.now()
    // },);
    renderFrame(obj)
    // performanceTimeEnd('performance:videoCallback');

    // const diffTs = performance.now() - lastCbTimestamp
    // console.log('performance:距离上一帧的间隔', diffTs + 'ms')
    // lastCbTimestamp = performance.now()
  }, 'viiiiiiiii');

  var ret = Module._openDecoder(decoder_type, videoCallback, LOG_LEVEL_WASM)
  if (ret === 0) {
    console.log("openDecoder success");
  } else {
    console.error("openDecoder failed with error", ret);
    return;
  }
}


const decodeData = (payload) => {
  // performanceTimeStart('performance:decodeData_task_sent');
  var typedArray = new Uint8Array(payload);
  var size = typedArray.length
  var cacheBuffer = Module._malloc(size);
  HEAPU8.set(typedArray, cacheBuffer);
  totalSize += size
  // console.log("[" + (++readerIndex) + "] Read len = ", size + ", Total size = " + totalSize)

  Module._decodeData(cacheBuffer, size, pts++)
  if (cacheBuffer != null) {
    Module._free(cacheBuffer);
    cacheBuffer = null;
  }
  if (size < CHUNK_SIZE) {
    console.log(`Flush frame data, CHUNK_SIZE: ${CHUNK_SIZE}`)
    Module._flushDecoder();
    Module._closeDecoder();
  }
  // performanceTimeEnd('performance:decodeData_task_sent');
}

const decodeDataQueue = []
let isRunningDecodeQueue = false
const startDecodeQueue = async () => {
  if (!decodeDataQueue.length) {
    isRunningDecodeQueue = false
    return
  }

  decodeData(decodeDataQueue.shift())

  await sleep(1)
  startDecodeQueue()
}


let webglPlayer

function renderFrame(currentFrame) {
  self.postMessage({
    type: 'renderFrame',
    payload: {
      data: currentFrame.data.buffer,
      width: currentFrame.width,
      height: currentFrame.height,
    }
  }, [currentFrame.data.buffer]);

  // const data = new Uint8Array(currentFrame.data)
  // const width = currentFrame.width
  // const height = currentFrame.height
  // const yLength = width * height
  // const uvLength = (width / 2) * (height / 2)
  // if (!webglPlayer) {
  //   canvas.width = width
  //   canvas.height = height
  //   webglPlayer = new WebGLPlayer(canvas)
  // }
  //
  // const gl = webglPlayer.renderFrame(data, width, height, yLength, uvLength)

  // // 发送到主线程
  // const bitmap = gl.canvas.transferToImageBitmap();
  // self.postMessage({
  //   type: 'frameRendered',
  //   payload: {
  //     bitmap,
  //     width,
  //     height,
  //   }
  // }, [bitmap]);
}


self.onmessage = async (e) => {
  const {type, payload, timestamp} = e.data

  // console.log('data', e.data)

  if (type === 'initDecoder') {
    initDecoder(payload)
  } else if (type === 'decodeData') {
    // if (timestamp) {
    //   const now = Date.now()
    //   console.log(`decodeData_timestamp: ${now - timestamp}ms, ${now}-${timestamp}`);
    // }
    decodeDataQueue.push(payload);
    if (!isRunningDecodeQueue) {
      isRunningDecodeQueue = true
      startDecodeQueue()
    }
  }
}
