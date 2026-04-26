// @ts-ignore
import { Pool } from 'pg';
// @ts-ignore
import dotenv from 'dotenv';

// Asta citește datele din .env
dotenv.config();

// Creăm o "piscină" de conexiuni la baza de date
// @ts-ignore
export const pool = new Pool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME,
});

// Opțional: un mesaj în consolă doar ca să știm că a mers conectarea când testăm
pool.on('connect', () => {
    console.log('Coonected to db PostgreSQL!');
});

pool.on('error', (err) => {
    console.error('Eroare at db', err);
});