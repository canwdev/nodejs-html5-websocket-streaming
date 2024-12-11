# Node.js + Websocket + HTML5 Video Streaming Demo

## 准备

- 安装 `node` 和 `yarn`
- `yarn install` 安装依赖

## Demo 1: server.js

> 原理：`Webcam -> recorder.html -> Node.js -- websocket -> receiver.html`

- 使用 OBS Studio ，启动虚拟摄像机，或使用笔记本自带的 Webcam
- 启动 `node server.js` 服务后，打开网页
- 打开 `recorder.html`，把模拟摄像头作为视频流通过 websocket 发送给 Node.js 
- 打开一个新页面 `receiver.html`，浏览器连接 ws 后，用 `mediaSource` 解码视频流，并播放 

## Demo 2: server-tcp.js

> 需要安装 ffmpeg \
> 原理：`mp4 file -> FFmpeg -- TCP -> Node.js -- WebSocket -> Receiver`
- 
- 启动 `node server-tcp.js` 服务
- 打开前端网页：`tcp-ws-receiver.html`
- 运行：`.\ffmpeg.exe -re -stream_loop -1 -i sd.mp4 -vcodec libvpx -b:v 3500k -r 25 -crf 10 -quality realtime -speed 16 -threads 8 -an -g 25 -f webm tcp://localhost:9090` 开始推流

### Demo 1, 2: Bug

- 客户端在第一次读取的推流的第一部分才能正常播放，否则，刷新或在推流的中途打开客户端，则无法正常播放，会报错：`SourceBuffer error`
  - 待解决，猜测是以下原因：
  - WebM 容器格式需要正确的头部信息(initialization segment)才能开始解码
  - 判断是否是I帧，只有关键帧才能播放

## Demo 3: wasm h264/h265 raw stream player

> 基于 libffmpeg_264_265 的视频裸流（raw stream）播放器

子文件夹 [wasm-h264-h265-raw-stream-player](./wasm-h264-h265-raw-stream-player/README.md)

## Reference

- [Yousuf-Basir/websocket-video-streaming](https://github.com/Yousuf-Basir/websocket-video-streaming)
- [kmoskwiak/node-tcp-streaming-server](https://github.com/kmoskwiak/node-tcp-streaming-server)