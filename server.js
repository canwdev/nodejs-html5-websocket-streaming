const path = require("path");
const express = require("express");
const serveIndex = require("serve-index");
const WebSocket = require('ws')
const app = express();
const PORT = 8088;
const ROOT = path.join(__dirname, "public");

// app.use((_, res, next) => {
//   res.append("Cross-Origin-Opener-Policy", "same-origin");
//   res.append("Cross-Origin-Embedder-Policy", "require-corp");
//   next();
// });

app.use(express.static(ROOT));
app.use("/", serveIndex(ROOT));

const server = app.listen(PORT, () => {
  console.log(`Listening on http://localhost:${PORT}`);
});

// Create a WebSocket server
const wss = new WebSocket.Server({
  // port: SOCKET_PORT
  server
});
console.log(`Socket on ws://localhost:${PORT}`);

const clients = new Set();

// 初始化片段，WebM 容器格式需要正确的头部信息(initialization segment)才能开始解码。
let initSegment = null;

wss.on('connection', (ws) => {
  // 如果有初始化片段，立即发送给新连接的客户端
  if (initSegment) {
    ws.send(initSegment);
  }

  console.log('connection');
  clients.add(ws);

  // When data is received from the broadcasting client
  ws.on('message', (data) => {
    if (!data) {
      return
    }
    // 检测是否是初始化片段（这里需要一个标志位）
    if (!initSegment) {
      initSegment = data;
    }
    console.log(`on message, data length: ${data.length}`);
    // Broadcast the received data to all connected viewers
    for (const client of clients) {
      // Skip the broadcasting client itself
      if (client !== ws) {
        client.send(data);
      }
    }
  });

  // When the WebSocket connection is closed
  ws.on('close', () => {
    console.log('close');
    // Remove the client from the set of connected clients
    clients.delete(ws);
  });
});