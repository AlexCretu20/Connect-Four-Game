import { Router } from 'express';
import { AuthService } from './auth.service';
import {pool} from "../db/db";

export const authRouter = Router();
const authService = new AuthService();

authRouter.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        const newUser = await authService.register(username, email, password);
        res.status(201).json(newUser);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

authRouter.post('/login', async (req, res) => {
    try {
        const { identifier, password } = req.body;
        const data = await authService.login(identifier, password);
        res.status(200).json(data);
    } catch (error: any) {
        res.status(401).json({ error: error.message });
    }
});

// Backend: GET /api/auth/leaderboard
authRouter.get('/leaderboard', async (req, res) => {
    try {
        const query = `
            SELECT 
                u.username,
                COUNT(m.id) AS total_games,
                COUNT(CASE WHEN m.winner_id = u.id THEN 1 END) AS games_won,
                COUNT(CASE WHEN (m.player1_id = u.id OR m.player2_id = u.id) AND m.winner_id != u.id AND m.winner_id IS NOT NULL THEN 1 END) AS games_lost,
                COUNT(CASE WHEN m.status = 'draw' THEN 1 END) AS games_drawn,
                ROUND(AVG(CASE WHEN m.winner_id = u.id THEN m.total_moves END), 2) AS avg_moves_to_win
            FROM users u
            LEFT JOIN matches m ON u.id = m.player1_id OR u.id = m.player2_id
            GROUP BY u.id, u.username
            ORDER BY games_won DESC, avg_moves_to_win ASC;
        `;

        const result = await pool.query(query);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
});