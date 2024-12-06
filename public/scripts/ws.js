let socket
const connect = () => {
  const wsUrl = `ws://${window.location.hostname}:${window.location.port}`;
  console.log(`Connecting... ${wsUrl}`);
  socket = new WebSocket(wsUrl);
  socket.binaryType = 'arraybuffer';

  socket.onopen = (event) => {
    console.log('Socket opened', event);
  }

  // When a WebSocket error occurs
  socket.onerror = (error) => {
    console.error('WebSocket error:', error);
  };

  // When the WebSocket connection is closed
  socket.onclose = () => {
    console.log('WebSocket connection closed. reconnect after 1s...');
    setTimeout(connect, 1000);
    socket = null
  };

}
connect()