import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { pool } from './db/db';
import { authRouter } from './auth/auth.router';

dotenv.config();

const app = express();
const server = http.createServer(app);

// Basic middlewares
app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());
app.use('/api/auth', authRouter);

// Initialize Socket.io for the upcoming game
export const io = new Server(server, {
    cors: {
        origin: 'http://localhost:5173',
        methods: ['GET', 'POST']
    }
});

// A simple route to check if the server is running
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Connect Four server is running perfectly!' });
});

// Players will connect here later
io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
    });
});

const PORT = process.env.PORT || 5000;

// Start the server
server.listen(PORT, async () => {
    console.log(`Server started on port ${PORT}`);

    // Check if the database is responding
    try {
        await pool.query('SELECT NOW()');
        console.log('Successfully connected to the PostgreSQL database!');
    } catch (error) {
        console.error('Error: Could not connect to the database. Check the password in the .env file.');
    }
});