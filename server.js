const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const fs = require("fs");
const path = require("path");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const messagesFile = path.join(__dirname, "messages.json");

// Load or initialize message history
let messages = [];
if (fs.existsSync(messagesFile)) {
  messages = JSON.parse(fs.readFileSync(messagesFile));
}

app.use(express.static("public"));

// Send previous messages to newly connected clients
wss.on("connection", (ws) => {
  ws.send(JSON.stringify({ type: "init", messages }));

  ws.on("message", (message) => {
    const msg = JSON.parse(message);
    messages.push(msg);

    // Save to file
    fs.writeFileSync(messagesFile, JSON.stringify(messages));

    // Broadcast to all connected clients
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ type: "new", message: msg }));
      }
    });
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () =>
    console.log(`Server running on http://0.0.0.0:${PORT}`)
  );
  
