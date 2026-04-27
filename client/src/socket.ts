import { io } from 'socket.io-client';

// Ne conectăm la serverul tău de pe portul 5000
// autoConnect: false înseamnă că nu ne conectăm instant cum se deschide site-ul,
// ci abia DUPĂ ce jucătorul se loghează cu succes.
export const socket = io('http://localhost:5000', {
    autoConnect: false
});