import { Router } from 'express';
import { AuthService } from './auth.service';

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