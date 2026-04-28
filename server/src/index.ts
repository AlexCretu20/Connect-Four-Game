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

// Ruta istoric meci
app.get('/api/matchesReplay/:id', async (req, res) => {
    const matchId = parseInt(req.params.id);

    if (isNaN(matchId)) {
        return res.status(400).json({ error: "ID-ul meciului este invalid." });
    }

    try {
        // detalii generale meci
        const matchResult = await pool.query(
            `SELECT m.id, m.status, m.total_moves, 
                    u1.username as player1_name, 
                    u2.username as player2_name,
                    w.username as winner_name
             FROM matches m
             JOIN users u1 ON m.player1_id = u1.id
             JOIN users u2 ON m.player2_id = u2.id
             LEFT JOIN users w ON m.winner_id = w.id
             WHERE m.id = $1`,
            [matchId]
        );

        if (matchResult.rows.length === 0) {
            return res.status(404).json({ error: "Meciul nu a fost găsit." });
        }

        // Mutari in ordine cronologica
        const movesResult = await pool.query(
            `SELECT move_order, col_index, player_id 
             FROM moves 
             WHERE match_id = $1 
             ORDER BY move_order ASC`,
            [matchId]
        );

        res.json({
            matchInfo: matchResult.rows[0],
            moves: movesResult.rows
        });

    } catch (error) {
        console.error("Eroare la preluarea replay-ului:", error);
        res.status(500).json({ error: "Eroare internă a serverului." });
    }
});

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
                // În interiorul socket.on('make_move'), când result.win || result.draw
                try {
                    const ids = roomId.replace('room_', '').split('_');
                    const p1Id = parseInt(ids[0]);
                    const p2Id = parseInt(ids[1]);

                    const winnerId = result.win ? (game.winner === 1 ? p1Id : p2Id) : null;

                    // 1. Salvăm meciul și cerem înapoi ID-ul generat (RETURNING id)
                    const matchResult = await pool.query(
                        `INSERT INTO matches (player1_id, player2_id, winner_id, total_moves, status) 
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
                        [p1Id, p2Id, winnerId, game.moveCount, result.win ? 'finished' : 'draw']
                    );

                    const noulMatchId = matchResult.rows[0].id; // Am prins ID-ul!

                    // 2. Parcurgem istoricul din engine și salvăm fiecare mutare
                    for (const move of game.moveHistory) {
                        // Transformăm 1 și 2 în ID-urile reale din baza de date
                        const realPlayerId = move.playerIndex === 1 ? p1Id : p2Id;

                        await pool.query(
                            `INSERT INTO moves (match_id, move_order, col_index, player_id) 
             VALUES ($1, $2, $3, $4)`,
                            [noulMatchId, move.moveNumber, move.col, realPlayerId]
                        );
                    }

                    console.log(`Meciul #${noulMatchId} și cele ${game.moveCount} mutări au fost salvate cu succes!`);

                } catch (dbError) {
                    console.error("Eroare la salvarea meciului/mutărilor:", dbError);
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