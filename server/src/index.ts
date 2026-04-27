import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { pool } from './db/db';
import { authRouter } from './auth/auth.router';
import { ConnectFourGame } from './game/game.engine';

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

let waitingPlayer: any = null;
const activeGames = new Map<string, ConnectFourGame>();

io.on('connection', (socket) => {
    console.log(`A player connected: ${socket.id}`);

    socket.on('find_match', () => {

        if (waitingPlayer && waitingPlayer.id !== socket.id) {

            const roomId = `room_${waitingPlayer.id}_${socket.id}`;

            // private room with id user1 and user2
            socket.join(roomId);
            waitingPlayer.join(roomId);

            const game = new ConnectFourGame();
            activeGames.set(roomId, game);

            io.to(roomId).emit('game_started', {
                roomId: roomId,
                message: 'Match started!',
                startingPlayer: game.currentPlayer
            });

            waitingPlayer = null;
        } else {
            waitingPlayer = socket;
            socket.emit('waiting_for_opponent', { message: 'Waiting for an opponent...' });
        }
    });


    socket.on('make_move', ({ roomId, column }) => {
        const game = activeGames.get(roomId);
        if (!game) return; // If the match doesn't exist, do nothing

        const result = game.dropPiece(column);

        if (result.success) {
            io.to(roomId).emit('board_updated', {
                board: game.getBoard(),
                nextPlayer: game.currentPlayer,
                lastRow: result.row,
                lastCol: column
            });
            if (result.win) {
                io.to(roomId).emit('game_over', { winner: game.winner });
                activeGames.delete(roomId);
            }

            else if (result.draw) {
                io.to(roomId).emit('game_over', { winner: 'draw' });
                activeGames.delete(roomId);
            }
        }
    });

    socket.on('disconnect', () => {
        console.log(` Player disconnected: ${socket.id}`);
        // If they were in the waiting room and left, free the spot
        if (waitingPlayer && waitingPlayer.id === socket.id) {
            waitingPlayer = null;
        }
        // add logic for match abandonment
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