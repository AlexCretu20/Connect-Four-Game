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

    socket.on('find_match', (data: { userId: number }) => {
        (socket as any).databaseId = data.userId;

        // Verificăm dacă avem un jucător care așteaptă și dacă e încă conectat
        if (waitingPlayer && waitingPlayer.connected && waitingPlayer.id !== socket.id) {
            const p1Id = (waitingPlayer as any).databaseId;
            const p2Id = (socket as any).databaseId;

            const roomId = `room_${p1Id}_${p2Id}`;

            socket.join(roomId);
            waitingPlayer.join(roomId);

            const game = new ConnectFourGame();
            activeGames.set(roomId, game);

            // TRIMITEM AICI datele de început, NU în make_move
            waitingPlayer.emit('game_started', {
                roomId: roomId,
                message: 'Match started!',
                startingPlayer: game.currentPlayer,
                yourPlayerId: 1
            });

            socket.emit('game_started', {
                roomId: roomId,
                message: 'Match started!',
                startingPlayer: game.currentPlayer,
                yourPlayerId: 2
            });

            waitingPlayer = null;
        } else {
            waitingPlayer = socket;
            socket.emit('waiting_for_opponent', { message: 'Waiting for an opponent...' });
        }
    });

    socket.on('make_move', async ({ roomId, column }) => {
        const game = activeGames.get(roomId);

        if (!game) {
            console.error("Jocul nu a fost găsit!");
            return;
        }

        const result = game.dropPiece(column);

        if (result.success) {
            io.to(roomId).emit('board_updated', {
                board: game.getBoard(),
                nextPlayer: game.currentPlayer,
                lastRow: result.row,
                lastCol: column
            });

            if (result.win || result.draw) {
                try {
                    const ids = roomId.replace('room_', '').split('_');
                    const p1Id = parseInt(ids[0]);
                    const p2Id = parseInt(ids[1]);

                    const winnerId = result.win ? (game.winner === 1 ? p1Id : p2Id) : null;

                    console.log(`SALVARE MECI: P1:${p1Id}, P2:${p2Id}, Câștigător:${winnerId}, Mutări:${game.moveCount}`);
                    await pool.query(
                        `INSERT INTO matches (player1_id, player2_id, winner_id, total_moves, status) 
                     VALUES ($1, $2, $3, $4, $5)`,
                        [p1Id, p2Id, winnerId, game.moveCount, result.win ? 'finished' : 'draw']
                    );
                    console.log("Meci salvat cu succes pentru leaderboard!");
                } catch (dbError) {
                    console.error("Eroare la salvarea meciului:", dbError);
                }

                io.to(roomId).emit('game_over', { winner: game.winner });
                activeGames.delete(roomId);
            }
        }
    });

    socket.on('disconnect', () => {
        console.log(`Player disconnected: ${socket.id}`);

        // Resetăm waitingPlayer dacă el a plecat
        if (waitingPlayer && waitingPlayer.id === socket.id) {
            waitingPlayer = null;
        }

        // Gestionăm abandonul meciului
        for (const [roomId, game] of activeGames.entries()) {
            if (roomId.includes(socket.id)) {
                io.to(roomId).emit('opponent_disconnected');
                activeGames.delete(roomId);
                break;
            }
        }
    });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, async () => {
    console.log(`🚀 Server started on port ${PORT}`);
    try {
        await pool.query('SELECT NOW()');
        console.log('✅ Successfully connected to the PostgreSQL database!');
    } catch (error) {
        console.error('❌ Error: Could not connect to the database. Check your .env file.', error);
    }
});