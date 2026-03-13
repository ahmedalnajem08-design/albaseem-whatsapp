const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const socketIO = require('socket.io');
const cors = require('cors');
const http = require('http');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 8080;

// Enable CORS for all routes
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Store connected clients info
let whatsappClient = null;
let isClientReady = false;
let clientQR = null;

// Initialize WhatsApp Client
function initWhatsAppClient() {
  whatsappClient = new Client({
    authStrategy: new LocalAuth({
      clientId: 'albaseem-whatsapp',
      dataPath: './session'
    }),
    puppeteer: {
      headless: true,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium-browser',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-software-rasterizer'
      ]
    }
  });

  // QR Code event
  whatsappClient.on('qr', async (qr) => {
    console.log('QR Code received');
    clientQR = qr;
    isClientReady = false;
    
    // Generate QR code as data URL
    try {
      const qrImage = await qrcode.toDataURL(qr);
      io.emit('qr', qrImage);
      io.emit('status', 'qr');
    } catch (err) {
      console.error('Error generating QR image:', err);
    }
  });

  // Ready event
  whatsappClient.on('ready', () => {
    console.log('WhatsApp Client is ready!');
    isClientReady = true;
    clientQR = null;
    io.emit('status', 'ready');
    
    // Get user info
    whatsappClient.getState().then(state => {
      console.log('Client state:', state);
    });
  });

  // Authenticated event
  whatsappClient.on('authenticated', () => {
    console.log('Client is authenticated');
    io.emit('status', 'authenticated');
  });

  // Auth failure event
  whatsappClient.on('auth_failure', (msg) => {
    console.error('Authentication failed:', msg);
    io.emit('status', 'auth_failure');
    isClientReady = false;
  });

  // Disconnected event
  whatsappClient.on('disconnected', (reason) => {
    console.log('Client was disconnected:', reason);
    isClientReady = false;
    io.emit('status', 'disconnected');
    
    // Try to reconnect
    setTimeout(() => {
      if (!isClientReady) {
        console.log('Attempting to reinitialize client...');
        initWhatsAppClient();
      }
    }, 5000);
  });

  // Message event
  whatsappClient.on('message', async (msg) => {
    console.log('Message received:', msg.body);
    io.emit('message', {
      from: msg.from,
      body: msg.body,
      timestamp: msg.timestamp
    });
  });

  // Initialize the client
  whatsappClient.initialize().catch(err => {
    console.error('Failed to initialize WhatsApp client:', err);
  });
}

// Initialize client on startup
initWhatsAppClient();

// Socket.IO connection
io.on('connection', (socket) => {
  console.log('Client connected via Socket.IO');
  
  // Send current status
  if (isClientReady) {
    socket.emit('status', 'ready');
  } else if (clientQR) {
    qrcode.toDataURL(clientQR).then(qrImage => {
      socket.emit('qr', qrImage);
      socket.emit('status', 'qr');
    });
  } else {
    socket.emit('status', 'initializing');
  }
  
  socket.on('disconnect', () => {
    console.log('Client disconnected from Socket.IO');
  });
  
  // Request to restart client
  socket.on('restart', async () => {
    console.log('Restart requested');
    if (whatsappClient) {
      try {
        await whatsappClient.destroy();
      } catch (err) {
        console.error('Error destroying client:', err);
      }
    }
    isClientReady = false;
    clientQR = null;
    initWhatsAppClient();
  });
  
  // Request to logout
  socket.on('logout', async () => {
    console.log('Logout requested');
    if (whatsappClient) {
      try {
        await whatsappClient.logout();
        await whatsappClient.destroy();
      } catch (err) {
        console.error('Error logging out:', err);
      }
    }
    isClientReady = false;
    clientQR = null;
    io.emit('status', 'logged_out');
    initWhatsAppClient();
  });
});

// ============ API Routes ============

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    whatsappReady: isClientReady,
    timestamp: new Date().toISOString()
  });
});

// Get connection status
app.get('/api/status', (req, res) => {
  res.json({
    ready: isClientReady,
    status: isClientReady ? 'connected' : (clientQR ? 'qr' : 'initializing')
  });
});

// Get QR Code
app.get('/api/qr', async (req, res) => {
  if (!clientQR) {
    return res.json({
      success: false,
      message: isClientReady ? 'Already connected' : 'QR not available yet'
    });
  }
  
  try {
    const qrImage = await qrcode.toDataURL(clientQR);
    res.json({
      success: true,
      qr: qrImage
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Error generating QR code'
    });
  }
});

// Send text message
app.post('/api/send-message', async (req, res) => {
  const { phone, message } = req.body;
  
  if (!isClientReady) {
    return res.status(503).json({
      success: false,
      message: 'WhatsApp client is not ready. Please scan QR code first.'
    });
  }
  
  if (!phone || !message) {
    return res.status(400).json({
      success: false,
      message: 'Phone number and message are required'
    });
  }
  
  // Format phone number (ensure it has @c.us suffix)
  let formattedPhone = phone.replace(/\D/g, '');
  if (!formattedPhone.endsWith('@c.us')) {
    formattedPhone = `${formattedPhone}@c.us`;
  }
  
  try {
    const result = await whatsappClient.sendMessage(formattedPhone, message);
    console.log('Message sent successfully to:', formattedPhone);
    res.json({
      success: true,
      messageId: result.id._serialized,
      to: formattedPhone,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Error sending message:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to send message',
      error: err.message
    });
  }
});

// Send message with delay (for bulk messaging)
app.post('/api/send-bulk', async (req, res) => {
  const { messages, delaySeconds = 5 } = req.body;
  
  if (!isClientReady) {
    return res.status(503).json({
      success: false,
      message: 'WhatsApp client is not ready'
    });
  }
  
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Messages array is required'
    });
  }
  
  const results = [];
  
  for (let i = 0; i < messages.length; i++) {
    const { phone, message } = messages[i];
    
    let formattedPhone = phone.replace(/\D/g, '');
    if (!formattedPhone.endsWith('@c.us')) {
      formattedPhone = `${formattedPhone}@c.us`;
    }
    
    try {
      const result = await whatsappClient.sendMessage(formattedPhone, message);
      results.push({
        phone: formattedPhone,
        success: true,
        messageId: result.id._serialized
      });
      console.log(`Bulk message ${i + 1}/${messages.length} sent to:`, formattedPhone);
    } catch (err) {
      results.push({
        phone: formattedPhone,
        success: false,
        error: err.message
      });
    }
    
    // Wait before sending next message (to avoid rate limiting)
    if (i < messages.length - 1) {
      await new Promise(resolve => setTimeout(resolve, delaySeconds * 1000));
    }
  }
  
  res.json({
    success: true,
    total: messages.length,
    results
  });
});

// Check if phone number is on WhatsApp
app.get('/api/check-number/:phone', async (req, res) => {
  const { phone } = req.params;
  
  if (!isClientReady) {
    return res.status(503).json({
      success: false,
      message: 'WhatsApp client is not ready'
    });
  }
  
  let formattedPhone = phone.replace(/\D/g, '');
  if (!formattedPhone.endsWith('@c.us')) {
    formattedPhone = `${formattedPhone}@c.us`;
  }
  
  try {
    const user = await whatsappClient.getNumberId(formattedPhone);
    res.json({
      success: true,
      exists: !!user,
      phone: formattedPhone
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Error checking number',
      error: err.message
    });
  }
});

// Get contacts/chats
app.get('/api/chats', async (req, res) => {
  if (!isClientReady) {
    return res.status(503).json({
      success: false,
      message: 'WhatsApp client is not ready'
    });
  }
  
  try {
    const chats = await whatsappClient.getChats();
    const chatList = chats.slice(0, 50).map(chat => ({
      id: chat.id._serialized,
      name: chat.name || chat.id.user,
      unreadCount: chat.unreadCount,
      timestamp: chat.timestamp
    }));
    
    res.json({
      success: true,
      chats: chatList
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Error getting chats',
      error: err.message
    });
  }
});

// Logout endpoint
app.post('/api/logout', async (req, res) => {
  try {
    if (whatsappClient) {
      await whatsappClient.logout();
      await whatsappClient.destroy();
    }
    isClientReady = false;
    clientQR = null;
    initWhatsAppClient();
    
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Error logging out',
      error: err.message
    });
  }
});

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
server.listen(PORT, () => {
  console.log(`
  ╔════════════════════════════════════════════════════════════╗
  ║                                                            ║
  ║     AL-BASEEM WhatsApp Server                              ║
  ║     Running on port ${PORT}                                  ║
  ║                                                            ║
  ║     Open http://localhost:${PORT} to scan QR Code             ║
  ║                                                            ║
  ╚════════════════════════════════════════════════════════════╝
  `);
});

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down...');
  if (whatsappClient) {
    try {
      await whatsappClient.destroy();
    } catch (err) {
      console.error('Error destroying client on shutdown:', err);
    }
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down...');
  if (whatsappClient) {
    try {
      await whatsappClient.destroy();
    } catch (err) {
      console.error('Error destroying client on shutdown:', err);
    }
  }
  process.exit(0);
});
