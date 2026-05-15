const express = require('express'); // Restart trigger 4
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

dotenv.config();

// Server entry point
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(bodyParser.json());

// Pass io to routes
app.use((req, res, next) => {
    req.io = io;
    next();
});

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch((err) => console.error('Could not connect to MongoDB', err));

// Routes
const providerRoutes = require('./routes/provider');
const userRoutes = require('./routes/user');
const busRoutes = require('./routes/bus');
const transportRoutes = require('./routes/transport');
const adminRoutes = require('./routes/admin');

app.use('/api/provider', providerRoutes);
app.use('/api/user', userRoutes);
app.use('/api/bus', busRoutes);
app.use('/api/transport', transportRoutes);
app.use('/api/admin', adminRoutes);

app.get('/', (req, res) => {
    res.send('Service Provider Backend is running with Socket.io');
});

// Socket.io connection logic
io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    socket.on('join', (room) => {
        socket.join(room);
        console.log(`Socket ${socket.id} joined room: ${room}`);
    });

    socket.on('updateLocation', (data) => {
        // Broadcast location update to relevant rooms (e.g., users tracking this ride)
        io.to(data.rideId).emit('locationUpdate', data);
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

const os = require('os');
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    
    // Log local IP for mobile connection
    const networkInterfaces = os.networkInterfaces();
    for (const interfaceName in networkInterfaces) {
        for (const net of networkInterfaces[interfaceName]) {
            if (net.family === 'IPv4' && !net.internal) {
                console.log(`📡 Mobile connection URL: http://${net.address}:${PORT}/api`);
            }
        }
    }
});
