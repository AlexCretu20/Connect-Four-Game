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

// ruta istoric meci
app.get('/api/matches/history', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT m.id, m.total_moves, m.created_at, m.status,
                    u1.username as p1_name, u2.username as p2_name
             FROM matches m
             LEFT JOIN users u1 ON m.player1_id = u1.id
             LEFT JOIN users u2 ON m.player2_id = u2.id
             ORDER BY m.created_at DESC`
        );
        res.json(result.rows);
    } catch (err) {
        console.error("Eroare la baza de date (history):", err);
        res.status(500).json({ error: "Nu am putut încărca istoricul." });
    }
});

// Ruta replay
app.get('/api/matchesReplay/:id', async (req, res) => {
    const matchId = parseInt(req.params.id);

    if (isNaN(matchId)) {
        return res.status(400).json({ error: "ID-ul meciului este invalid." });
    }

    try {
        // detalii generale meci
        const matchResult = await pool.query(
            `SELECT m.id, m.status, m.total_moves,
                    m.player1_id, m.player2_id,
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

// ruta spectator
app.get('/api/matchesLive', async (req, res) => {
    try {
        const liveMatches = [];

        // Parcurgem toate camerele active (ex: room_1_2)
        for (const [roomId, game] of activeGames.entries()) {
            const ids = roomId.replace('room_', '').split('_');
            const p1Id = parseInt(ids[0]);
            const p2Id = parseInt(ids[1]);

            // Luăm numele jucătorilor din baza de date pentru a le afișa frumos
            const result = await pool.query(
                `SELECT id, username FROM users WHERE id IN ($1, $2)`,
                [p1Id, p2Id]
            );

            const users = result.rows;
            const p1 = users.find(u => u.id === p1Id)?.username || 'Jucător 1';
            const p2 = users.find(u => u.id === p2Id)?.username || 'Jucător 2';

            liveMatches.push({
                roomId: roomId,
                p1Name: p1,
                p2Name: p2,
                moveCount: game.moveCount
            });
        }

        res.json(liveMatches);
    } catch (err) {
        console.error("Eroare la preluarea meciurilor live:", err);
        res.status(500).json({ error: "Nu am putut încărca meciurile live." });
    }
});

io.on('connection', (socket) => {
    console.log(`A player connected: ${socket.id}`);

    socket.on('find_match', (data: { userId: number }) => {
        (socket as any).databaseId = data.userId;

        // Verificăm dacă avem un adversar valid (ID diferit)
        if (waitingPlayer && (waitingPlayer as any).databaseId !== data.userId) {
            const p1Id = (waitingPlayer as any).databaseId;
            const p2Id = data.userId;
            const roomId = `room_${p1Id}_${p2Id}`;

            socket.join(roomId);
            waitingPlayer.join(roomId);

            const game = new ConnectFourGame();
            activeGames.set(roomId, game);

            // TRIMITEM DATELE COMPLETE, INCLUSIV TABLA INIȚIALĂ
            const startData = {
                roomId: roomId,
                startingPlayer: game.currentPlayer,
                initialBoard: game.getBoard() // Forțăm trimiterea matricei 6x7
            };

            waitingPlayer.emit('game_started', { ...startData, yourPlayerId: 1 });
            socket.emit('game_started', { ...startData, yourPlayerId: 2 });

            waitingPlayer = null;
        } else {
            waitingPlayer = socket;
            socket.emit('waiting_for_opponent', { message: 'Waiting for an opponent...' });
        }
    });

    socket.on('join_as_spectator', (roomId: string) => {
        socket.join(roomId); // Intră în camera live (ex: room_1_2)
        console.log(`Utilizatorul ${socket.id} este spectator la meciul live: ${roomId}`);

        // Când intră un spectator la jumătatea meciului, îi trimitem tabla cum arată acum
        const game = activeGames.get(roomId);
        if (game) {
            socket.emit('initial_spectator_state', {
                board: game.getBoard(),
                nextPlayer: game.currentPlayer
            });
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
            const boardData = {
                board: game.getBoard(),
                nextPlayer: game.currentPlayer,
                lastRow: result.row,
                lastCol: column
            };
            console.log('Data trimisa catre clienti:', boardData);
            io.to(roomId).emit('board_updated', {
                board: game.getBoard(),
                nextPlayer: game.currentPlayer,
                lastRow: result.row,
                lastCol: column
            });

            io.to(roomId).emit('move_received', {
                col: column,
                playerIndex: game.currentPlayer === 1 ? 2 : 1,
                moveNumber: game.moveHistory.length
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
                io.to(roomId).emit('match_ended', {
                    status: result.win ? 'finished' : 'draw',
                    winner: game.winner
                });
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