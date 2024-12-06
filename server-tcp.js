const net = require('net');
const path = require('path');
const express = require('express');
const WebSocket = require('ws');
const serveIndex = require('serve-index')

const firstPacket = [];

const options = {
  httpPort: 8089,
  tcpPort: 9090
};

const app = express();

const ROOT = path.join(__dirname, "public");
app.use(express.static(ROOT));
app.use("/", serveIndex(ROOT));



// All ws clients
const wsClients = new Set();

// Create HTTP server and WebSocket server
const server = app.listen(options.httpPort, () => {
  console.log(`Listening on http://localhost:${options.httpPort}`);
});

// Initialize WebSocket server
const wss = new WebSocket.Server({ server });

// TCP server
const tcpServer = net.createServer((socket) => {
  socket.on('data', (data) => {
    // Save first packets of stream
    if (firstPacket.length < 3) {
      console.log('Init first packet', firstPacket.length);
      firstPacket.push(data);
    }

    // Send stream to all clients
    for (const client of wsClients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    }
  });
});

tcpServer.listen(options.tcpPort, 'localhost', () => {
  console.log(`TCP server listening on port ${options.tcpPort}`);
});

// WebSocket connection handling
wss.on('connection', (ws, req) => {
  console.log(`${new Date()} Connection accepted from ${req.socket.remoteAddress}`);

  // Send initial packets to new client
  if (firstPacket.length) {
    firstPacket.forEach(packet => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(packet);
      }
    });
  }

  // Add client to collection
  wsClients.add(ws);

  // Handle client disconnection
  ws.on('close', () => {
    console.log(`${new Date()} Client ${req.socket.remoteAddress} disconnected`);
    wsClients.delete(ws);
  });

  // Handle errors
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    wsClients.delete(ws);
  });
});

// Handle server errors
server.on('error', (error) => {
  console.error('Server error:', error);
});

tcpServer.on('error', (error) => {
  console.error('TCP server error:', error);
});
