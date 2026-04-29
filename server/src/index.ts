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
const onlineUsers = new Map<number, string>();

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
// ruta spectator (REPARATĂ PENTRU TURNEE)
app.get('/api/matchesLive', async (req, res) => {
    try {
        const liveMatches = [];

        // Parcurgem toate camerele active
        for (const [roomId, game] of activeGames.entries()) {
            let p1Name = 'Jucător 1';
            let p2Name = 'Jucător 2';

            if (roomId.startsWith('room_tourney_')) {
                // ESTE MECI DE TURNEU (extragem ID-ul meciului)
                const matchId = parseInt(roomId.replace('room_tourney_', ''));

                if (!isNaN(matchId)) {
                    const result = await pool.query(`
                        SELECT u1.username as p1_name, u2.username as p2_name 
                        FROM matches m
                        JOIN users u1 ON m.player1_id = u1.id
                        JOIN users u2 ON m.player2_id = u2.id
                        WHERE m.id = $1
                    `, [matchId]);

                    if (result.rows.length > 0) {
                        p1Name = result.rows[0].p1_name;
                        p2Name = result.rows[0].p2_name;
                    }
                }
            } else {
                // ESTE MECI CLASIC 1v1 (room_1_2 sau room_private_1_2)
                const cleanRoomId = roomId.replace('room_private_', '').replace('room_', '');
                const ids = cleanRoomId.split('_');
                const p1Id = parseInt(ids[0]);
                const p2Id = parseInt(ids[1]);

                if (!isNaN(p1Id) && !isNaN(p2Id)) {
                    const result = await pool.query(
                        `SELECT id, username FROM users WHERE id IN ($1, $2)`,
                        [p1Id, p2Id]
                    );
                    const users = result.rows;
                    p1Name = users.find(u => u.id === p1Id)?.username || 'Jucător 1';
                    p2Name = users.find(u => u.id === p2Id)?.username || 'Jucător 2';
                }
            }

            liveMatches.push({
                roomId: roomId,
                p1Name: p1Name,
                p2Name: p2Name,
                moveCount: game.moveCount
            });
        }

        res.json(liveMatches);
    } catch (err) {
        console.error("Eroare la preluarea meciurilor live:", err);
        res.status(500).json({ error: "Nu am putut încărca meciurile live." });
    }
});

// ruta pt cautare jucatori
app.get('/api/users/search', async (req, res) => {
    const query = req.query.q as string;
    if (!query) return res.json([]);

    try {
        // Căutăm jucători care conțin literele introduse (case-insensitive)
        const result = await pool.query(
            `SELECT id, username FROM users WHERE username ILIKE $1 LIMIT 10`,
            [`%${query}%`]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Eroare la căutare" });
    }
});

app.get('/api/users', async (req, res) => {
    const { currentUserId } = req.query;
    try {
        // Luăm ultimii 20 de utilizatori înregistrați, excluzându-l pe cel curent
        const result = await pool.query(
            `SELECT id, username FROM users WHERE id != $1 ORDER BY id DESC LIMIT 20`,
            [currentUserId]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: "Eroare la preluarea jucătorilor" });
    }
});

// rute turneu
app.post('/api/create_tournament', async (req, res) => {
    const { name, ownerId, maxPlayers } = req.body;

    if (!name || !ownerId || !maxPlayers) {
        return res.status(400).json({ error: "Date incomplete pentru crearea turneului." });
    }

    try {
        const result = await pool.query(
            `INSERT INTO tournaments (name, owner_id, max_players, status) 
             VALUES ($1, $2, $3, 'pending') RETURNING *`,
            [name, ownerId, maxPlayers]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error("Eroare la crearea turneului:", err);
        res.status(500).json({ error: "Eroare internă de server." });
    }
});

app.get('/api/see_tournaments', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT t.id, t.name, t.max_players, t.status, t.owner_id,
                   u.username as owner_name,
                   COUNT(tp.user_id) as current_players
            FROM tournaments t
            JOIN users u ON t.owner_id = u.id
            LEFT JOIN tournament_participants tp ON t.id = tp.tournament_id
            WHERE t.status IN ('pending', 'active')
            GROUP BY t.id, u.username
            ORDER BY t.created_at DESC
        `);
        res.json(result.rows);
    } catch (err) {
        console.error("Eroare la fetch turnee:", err);
        res.status(500).json({ error: "Eroare la aducerea turneelor." });
    }
});

// 3. Înscrierea unui jucător și AUTO-START dacă se umple
app.post('/api/join_tournament/:id', async (req, res) => {
    const tournamentId = parseInt(req.params.id);
    const { userId } = req.body;

    try {
        // 1. Verificăm situația curentă a turneului
        const tResult = await pool.query(`
            SELECT t.max_players, COUNT(tp.user_id) as current_players
            FROM tournaments t
                     LEFT JOIN tournament_participants tp ON t.id = tp.tournament_id
            WHERE t.id = $1
            GROUP BY t.id
        `, [tournamentId]);

        if (tResult.rows.length === 0) return res.status(404).json({ error: "Turneul nu există." });

        const max_players = parseInt(tResult.rows[0].max_players);
        const current_players = parseInt(tResult.rows[0].current_players);

        if (current_players >= max_players) {
            return res.status(400).json({ error: "Turneul este deja plin!" });
        }

        // 2. Înscriem jucătorul
        await pool.query(
            `INSERT INTO tournament_participants (tournament_id, user_id) VALUES ($1, $2)`,
            [tournamentId, userId]
        );

        // 3. VERIFICĂM DACĂ S-A UMPLUT (SISTEMUL TĂU AUTO-START)
        if (current_players + 1 === max_players) {
            console.log(`Turneul ${tournamentId} s-a umplut! Generăm meciurile...`);

            // Schimbăm statusul turneului în 'active'
            await pool.query(`UPDATE tournaments SET status = 'active' WHERE id = $1`, [tournamentId]);

            // Luăm toți jucătorii (acum sunt fix câți trebuie)
            const pResult = await pool.query(`SELECT user_id FROM tournament_participants WHERE tournament_id = $1`, [tournamentId]);
            const players = pResult.rows.map(row => row.user_id);

            // Amestecăm jucătorii (Sistemul Random)
            const shuffled = players.sort(() => 0.5 - Math.random());

            // Generăm meciurile RUNDEI 1
            for (let i = 0; i < shuffled.length; i += 2) {
                await pool.query(
                    `INSERT INTO matches (player1_id, player2_id, status, tournament_id, tournament_round) 
                     VALUES ($1, $2, 'pending', $3, 1)`,
                    [shuffled[i], shuffled[i + 1], tournamentId]
                );
            }
            return res.json({ message: "Te-ai înscris! Ești ultimul jucător, turneul a început!" });
        }

        res.json({ message: "Te-ai înscris cu succes! Așteptăm să se umple locurile." });
    } catch (err: any) {
        if (err.code === '23505') {
            return res.status(400).json({ error: "Ești deja înscris în acest turneu!" });
        }
        console.error("Eroare la înscriere/start:", err);
        res.status(500).json({ error: "Eroare internă." });
    }
});

// 4. Aducerea meciurilor (Bracket-ului) pentru un turneu
app.get('/api/tournament/:id/bracket', async (req, res) => {
    const tournamentId = parseInt(req.params.id);
    try {
        const result = await pool.query(`
            SELECT m.id as match_id, m.status, m.tournament_round,
                   u1.username as p1_name, u1.id as p1_id,
                   u2.username as p2_name, u2.id as p2_id,
                   w.username as winner_name
            FROM matches m
            LEFT JOIN users u1 ON m.player1_id = u1.id
            LEFT JOIN users u2 ON m.player2_id = u2.id
            LEFT JOIN users w ON m.winner_id = w.id
            WHERE m.tournament_id = $1
            ORDER BY m.tournament_round ASC, m.id ASC
        `, [tournamentId]);

        res.json(result.rows);
    } catch (err) {
        console.error("Eroare la aducerea bracket-ului:", err);
        res.status(500).json({ error: "Eroare internă de server." });
    }
});

// ruta istoric meciuri
// Ruta pentru istoricul global al turneelor
app.get('/api/tournaments/history', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT t.id, t.name, t.created_at, u.username as winner_name
            FROM tournaments t
                     JOIN matches m ON t.id = m.tournament_id
                     JOIN users u ON m.winner_id = u.id
            WHERE t.status = 'finished'
              AND m.tournament_round = (
                SELECT MAX(tournament_round)
                FROM matches
                WHERE tournament_id = t.id
            )
            ORDER BY t.created_at DESC
        `);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Eroare la server" });
    }
});

io.on('connection', (socket) => {
    console.log(`A player connected: ${socket.id}`);

    socket.on('user_online', (userId: number) => {
        onlineUsers.set(userId, socket.id);
        (socket as any).databaseId = userId; // Salvăm pe socket pentru disconnect
        console.log(`User ${userId} este online pe socket-ul ${socket.id}`);
    });

    socket.on('send_challenge', (data: { fromId: number, fromName: string, toId: number }) => {
        const targetSocketId = onlineUsers.get(data.toId);

        if (targetSocketId) {
            io.to(targetSocketId).emit('incoming_challenge', {
                fromId: data.fromId,
                fromName: data.fromName
            });
        } else {
            socket.emit('challenge_failed', { message: 'Jucătorul nu este online în acest moment.' });
        }
    });

    socket.on('accept_challenge', (data: { challengerId: number, myId: number }) => {
        const challengerSocketId = onlineUsers.get(data.challengerId);

        if (challengerSocketId) {
            // Generăm numele camerei folosind cele două ID-uri
            const roomId = `room_private_${data.challengerId}_${data.myId}`;

            const game = new ConnectFourGame();
            activeGames.set(roomId, game);

            // Jucătorul care acceptă intră în cameră
            socket.join(roomId);

            // Jucătorul care a lansat provocarea intră și el
            const challengerSocket = io.sockets.sockets.get(challengerSocketId);
            if (challengerSocket) challengerSocket.join(roomId);

            const startData = {
                roomId: roomId,
                startingPlayer: game.currentPlayer,
                initialBoard: game.getBoard()
            };

            // Dăm start meciului!
            io.to(challengerSocketId).emit('game_started', { ...startData, yourPlayerId: 1 });
            socket.emit('game_started', { ...startData, yourPlayerId: 2 });
        }
    });

    // Refuzarea provocării
    socket.on('decline_challenge', (data: { challengerId: number, responderName: string }) => {
        // Căutăm socket-ul celui care a trimis provocarea
        const challengerSocketId = onlineUsers.get(data.challengerId);

        if (challengerSocketId) {
            // Îi trimitem mesajul înapoi cu 'challenge_declined'
            io.to(challengerSocketId).emit('challenge_declined', {
                responderName: data.responderName
            });
        }
    });

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

            (waitingPlayer as any).currentRoom = roomId;
            (socket as any).currentRoom = roomId;

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
        const colNumber = parseInt(column, 10);
        console.log(`\n[BACKEND] 🔵 Primit mutare pe coloana ${colNumber} în camera ${roomId}`);

        const game = activeGames.get(roomId);

        if (!game) {
            console.error(`[BACKEND] ❌ EROARE: Jocul nu a fost găsit pentru camera: ${roomId}!`);
            return;
        }

        console.log(`[BACKEND] 🧠 Încercăm să punem piesa. E rândul jucătorului: ${game.currentPlayer}`);

        // Aici dăm coloana transformată sigur în număr
        const result = game.dropPiece(colNumber);

        // 🔥 LOG CRUCIAL: Vedem exact ce a decis motorul de joc
        console.log(`[BACKEND] 📊 Rezultat motor de joc:`, result);

        if (result.success) {
            const boardData = {
                board: game.getBoard(),
                nextPlayer: game.currentPlayer,
                lastRow: result.row,
                lastCol: colNumber
            };

            console.log(`[BACKEND] ✅ Mutare VALIDĂ! Trimitem la amândoi jucătorii.`);

            io.to(roomId).emit('board_updated', {
                board: game.getBoard(),
                nextPlayer: game.currentPlayer,
                lastRow: result.row,
                lastCol: colNumber
            });

            io.to(roomId).emit('move_received', {
                col: colNumber,
                playerIndex: game.currentPlayer === 1 ? 2 : 1,
                moveNumber: game.moveHistory.length
            });

            if (result.win || result.draw) {
                try {
                    let noulMatchId;
                    let realWinnerId = null;

                    // Verificăm dacă este meci de Turneu
                    if (roomId.startsWith('room_tourney_')) {
                        // ==========================================
                        // 🏆 LOGICĂ PENTRU MECIURI DE TURNEU
                        // ==========================================
                        const matchIdStr = roomId.split('_')[2];
                        noulMatchId = parseInt(matchIdStr);

                        const tMatch = await pool.query('SELECT player1_id, player2_id, tournament_id, tournament_round FROM matches WHERE id = $1', [noulMatchId]);
                        const {player1_id, player2_id, tournament_id, tournament_round} = tMatch.rows[0];

                        // La turneu nu vrem egalitate, tragem la sorți dacă e draw
                        realWinnerId = result.win ? (game.winner === 1 ? player1_id : player2_id) : (Math.random() > 0.5 ? player1_id : player2_id);

                        // Salvăm cine a câștigat acest meci
                        await pool.query('UPDATE matches SET winner_id = $1, total_moves = $2, status = $3 WHERE id = $4',
                            [realWinnerId, game.moveCount, 'finished', noulMatchId]);

                        // VERIFICĂM DACĂ RUNDA CURENTĂ S-A TERMINAT COMPLET
                        const pendingMatches = await pool.query(
                            'SELECT count(*) FROM matches WHERE tournament_id = $1 AND tournament_round = $2 AND status != $3',
                            [tournament_id, tournament_round, 'finished']
                        );

                        if (parseInt(pendingMatches.rows[0].count) === 0) {
                            console.log(`[TURNEU] Runda ${tournament_round} s-a încheiat!`);

                            const winnersRes = await pool.query('SELECT winner_id FROM matches WHERE tournament_id = $1 AND tournament_round = $2', [tournament_id, tournament_round]);
                            const winners = winnersRes.rows.map((r: any) => r.winner_id);

                            if (winners.length === 1) {
                                // Avem campionul!
                                await pool.query('UPDATE tournaments SET status = $1 WHERE id = $2', ['finished', tournament_id]);
                                console.log(`[TURNEU] 🎉 Turneul ${tournament_id} a fost câștigat de UserID: ${winners[0]}`);
                            } else {
                                // Generăm meciurile pentru Runda Următoare
                                for (let i = 0; i < winners.length; i += 2) {
                                    if (winners[i + 1]) {
                                        await pool.query(
                                            `INSERT INTO matches (player1_id, player2_id, status, tournament_id, tournament_round)
                                             VALUES ($1, $2, 'pending', $3, $4)`,
                                            [winners[i], winners[i + 1], tournament_id, tournament_round + 1]
                                        );
                                    }
                                }
                            }
                        }

                        // Opțional: Salvăm și mutările de la turneu pentru replay-uri
                        for (const move of game.moveHistory) {
                            const realPlayerId = move.playerIndex === 1 ? player1_id : player2_id;
                            await pool.query(
                                `INSERT INTO moves (match_id, move_order, col_index, player_id)
                                 VALUES ($1, $2, $3, $4)`,
                                [noulMatchId, move.moveNumber, move.col, realPlayerId]
                            );
                        }

                    } else {
                        // ==========================================
                        // ⚔️ LOGICĂ PENTRU MECIURI CLASICE 1v1
                        // ==========================================
                        let p1Id, p2Id;

                        // Verificăm de unde provine meciul 1v1 ca să extragem ID-urile corect
                        if (roomId.startsWith('room_private_')) {
                            // Este o provocare directă
                            const ids = roomId.replace('room_private_', '').split('_');
                            p1Id = parseInt(ids[0]);
                            p2Id = parseInt(ids[1]);
                        } else {
                            // Este matchmaking normal (Caută un meci 1v1)
                            const ids = roomId.replace('room_', '').split('_');
                            p1Id = parseInt(ids[0]);
                            p2Id = parseInt(ids[1]);
                        }

                        realWinnerId = result.win ? (game.winner === 1 ? p1Id : p2Id) : null;

                        // Creăm meciul în baza de date
                        const matchResult = await pool.query(
                            `INSERT INTO matches (player1_id, player2_id, winner_id, total_moves, status)
                             VALUES ($1, $2, $3, $4, $5) RETURNING id`,
                            [p1Id, p2Id, realWinnerId, game.moveCount, result.win ? 'finished' : 'draw']
                        );
                        noulMatchId = matchResult.rows[0].id;

                        // SALVĂM ISTORICUL MUTĂRILOR (Pentru ca Replay-ul să funcționeze pe 1v1)
                        for (const move of game.moveHistory) {
                            const realPlayerId = move.playerIndex === 1 ? p1Id : p2Id;
                            await pool.query(
                                `INSERT INTO moves (match_id, move_order, col_index, player_id)
                                 VALUES ($1, $2, $3, $4)`,
                                [noulMatchId, move.moveNumber, move.col, realPlayerId]
                            );
                        }
                    }

                    console.log(`✅ Meciul #${noulMatchId} a fost salvat cu succes în baza de date!`);

                } catch (dbError) {
                    console.error("Eroare la salvarea meciului/mutărilor:", dbError);
                }

                io.to(roomId).emit('game_over', {winner: game.winner});
                io.to(roomId).emit('match_ended', {status: result.win ? 'finished' : 'draw', winner: game.winner});
                activeGames.delete(roomId);
            }
        }
    });

    socket.on('join_tournament_match', async (data: { matchId: number, userId: number }) => {
        console.log(`\n--- START LOG TURNEU ---`);
        console.log(`[BACKEND] Jucătorul (ID: ${data.userId}) vrea să intre în meciul #${data.matchId}`);

        const roomId = `room_tourney_${data.matchId}`;
        socket.join(roomId);
        (socket as any).currentRoom = roomId;

        try {
            const mResult = await pool.query('SELECT player1_id, player2_id FROM matches WHERE id = $1', [data.matchId]);
            if (mResult.rows.length === 0) {
                console.log(`[BACKEND] ❌ EROARE: Meciul ${data.matchId} nu există în baza de date!`);
                return;
            }

            const p1Id = mResult.rows[0].player1_id;

            if (!activeGames.has(roomId)) {
                console.log(`[BACKEND] 🆕 Creăm o nouă tablă de Connect4 pentru camera ${roomId}`);
                activeGames.set(roomId, new ConnectFourGame());
            }

            const socketsInRoom = await io.in(roomId).fetchSockets();
            console.log(`[BACKEND] 👥 În camera ${roomId} sunt acum ${socketsInRoom.length} jucători.`);

            if (socketsInRoom.length === 2) {
                console.log(`[BACKEND] 🎉 Amândoi sunt gata! TRIMITEM SEMNALUL DE START!`);
                const game = activeGames.get(roomId)!;
                const startData = {
                    roomId,
                    startingPlayer: game.currentPlayer,
                    initialBoard: game.getBoard()
                };

                for (const s of socketsInRoom) {
                    const sDbId = (s as any).databaseId;
                    const yourPlayerId = (sDbId === p1Id) ? 1 : 2;
                    console.log(`[BACKEND] 🎮 User-ul DB_ID: ${sDbId} primește rolul de Player ${yourPlayerId}`);
                    s.emit('game_started', { ...startData, yourPlayerId });
                }
            } else {
                console.log(`[BACKEND] ⏳ Un jucător așteaptă. Îi trimit mesajul de "Așteptare..."`);
                socket.emit('waiting_for_tournament_opponent', { message: 'Așteptăm ca adversarul tău să dea click pe Joacă...' });
            }
        } catch (err) {
            console.error("[BACKEND] ❌ Eroare gravă:", err);
        }
        console.log(`--- END LOG TURNEU ---\n`);
    });

    socket.on('disconnect', () => {
        console.log(`Player disconnected: ${socket.id}`);

        // 1. Dacă era în așteptare, eliberăm locul
        if (waitingPlayer && waitingPlayer.id === socket.id) {
            waitingPlayer = null;
            console.log("Jucătorul din coadă a plecat.");
        }

        // 2. Extragem camera în care juca (am salvat-o când a găsit meciul)
        const currentRoom = (socket as any).currentRoom;

        // 3. Dacă juca într-o cameră activă, o închidem și ștergem meciul
        if (currentRoom && activeGames.has(currentRoom)) {
            io.to(currentRoom).emit('opponent_disconnected');
            activeGames.delete(currentRoom);
            console.log(`🧹 Meciul ${currentRoom} a fost șters din Live pentru că un jucător s-a deconectat.`);
        }

        const dbId = (socket as any).databaseId;
        if (dbId) {
            onlineUsers.delete(dbId);
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