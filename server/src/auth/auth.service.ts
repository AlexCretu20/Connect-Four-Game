import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { pool } from '../db/db';

const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_key';

export class AuthService {
    // US-101: Register with username, email, and password
    async register(username: string, email: string, password: string) {
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        const query = `
            INSERT INTO users (username, email, password_hash)
            VALUES ($1, $2, $3)
            RETURNING id, username, email, created_at;
        `;

        const result = await pool.query(query, [username, email, passwordHash]);
        return result.rows[0];
    }

    // US-102: Login with identifier (email OR username) and password
    async login(identifier: string, password: string) {
        const query = `SELECT * FROM users WHERE email = $1 OR username = $2;`;
        const result = await pool.query(query, [identifier, identifier]);


        if (result.rows.length === 0) {
            throw new Error('User not found');
        }

        const user = result.rows[0];

        const isMatch = await bcrypt.compare(password, user.password_hash);

        if (!isMatch) {
            throw new Error('Invalid password');
        }

        const token = jwt.sign(
            { userId: user.id, username: user.username },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        return {
            token,
            user: { id: user.id, username: user.username, email: user.email }
        };
    }
}