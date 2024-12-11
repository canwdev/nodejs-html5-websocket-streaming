# wasm h264 h265 raw stream player

> 基于 `libffmpeg_264_265` 的视频裸流（raw stream）播放器，视频测试文件下载 .h264, .265 文件：https://gitee.com/wupeng-engineer/decoder_wasm/tree/master/test

## 运行 Demo

```shell
npm install
npm run start
```

## 描述

- 使用 Web Worker + `libffmpeg_264_265` 实现 h264/h265 解码
- 使用 WebGL 实现 YUV -> RGB 转换，注意 webgl 不建议在 worker 线程运行，因为 [canvas离屏渲染](https://juejin.cn/post/7398933999319990291) 要复制 bitmap，主线程直接渲染性能更好
## 运行流程

1. 选择本地 h264/h265 raw stream 文件，并初始化 `libffmpeg_264_265` 解码器 
2. 主线程读取 `File`，以 `CHUNK_SIZE` 为大小切片并发送给 Web Worker 
3. Web Worker 收到 `buffer` 数据后调用 `decodeData` 函数解码
4. 解码 `buffer` 成功后 `libffmpeg_264_265` 调用 `videoCallback()` 生成1帧 YUV 数据
5. `renderFrame()` 使用 `webglPlayer` 将 YUV 转换成 RGB 数据的 `bitmap`
6. worker postMessage 将 `bitmap` 和宽高等信息发送到主线程
7. 主线程接收到 1 帧 `bitmap` 数据，push 到 `frameQueue` 缓冲队列
8. `renderLoop()` 以一定的FPS播放 `frameQueue` 中的 bitmap 数据，从头抽取(shift) 1 帧，渲染到 `canvas` 完成一帧的播放，递归调用 `requestAnimationFrame` 直到 `frameQueue` 为空

## 性能

- 1080p 以下视频流畅播放
- 解码瓶颈是 `libffmpeg_264_265`帧生成速度，也就是 `videoCallback()` 的回调速度
- 1080p h265 限制15帧流畅播放
- 4k h264 限制5帧流畅播放
- 但这种限制帧数是拖慢播放速度为代价的，做不到实时
- 播放长时间的文件可能会内存溢出，需要优化解码和转换RGB的速率

## 参考

- [借助于WebAssembly技术，基于ffmpeg的H.265解码器](https://gitee.com/wupeng-engineer/decoder_wasm)
- [WasmVideoPlayer](https://gitee.com/link?target=https%3A%2F%2Fgithub.com%2Fsonysuqin%2FWasmVideoPlayer)
- [YUV-Webgl-Video-Player](https://github.com/p4prasoon/YUV-Webgl-Video-Player)