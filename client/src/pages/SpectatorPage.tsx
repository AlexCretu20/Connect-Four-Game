import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { socket } from '../socket';
import './Game.css';
import './Auth.css';

export const SpectatorPage = () => {
    const { roomId } = useParams();
    const navigate = useNavigate();

    const [board, setBoard] = useState<number[][]>(
        Array.from({ length: 6 }, () => Array(7).fill(0))
    );

    const [status, setStatus] = useState('Se conecteaza la arena...');
    const [isGameOver, setIsGameOver] = useState(false);

    useEffect(() => {
        if (!roomId) {
            navigate('/lobby');
            return;
        }

        socket.emit('join_as_spectator', roomId);

        // Cand spectatorul intra la jumatatea meciului
        socket.on('initial_spectator_state', (data) => {
            if (data.board) {
                setBoard(data.board);
                setStatus('Meci in desfasurare (LIVE)');
            }
        });

        // Cand un jucator face o mutare in timp real
        socket.on('board_updated', (data) => {
            if (data.board) {
                setBoard(data.board);
            }
        });

        // Cand meciul se incheie normal
        socket.on('match_ended', (data) => {
            setIsGameOver(true);
            if (data.status === 'draw') {
                setStatus('Meci incheiat: Egalitate.');
            } else {
                setStatus(`Meci incheiat: Jucatorul ${data.winner} a castigat.`);
            }
        });

        // Cand cineva inchide fereastra sau da Abandon
        socket.on('opponent_disconnected', () => {
            setIsGameOver(true);
            setStatus('Meci terminat: Unul dintre jucatori a abandonat partida.');
        });

        return () => {
            socket.off('initial_spectator_state');
            socket.off('board_updated');
            socket.off('match_ended');
            socket.off('opponent_disconnected');
        };
    }, [roomId, navigate]);

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-app)', padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div className="minimal-card" style={{ maxWidth: '700px', width: '100%', textAlign: 'center' }}>

                <div className="section-title" style={{ border: 'none', marginBottom: '10px' }}>Monitorizare Live</div>
                <h2 style={{ fontSize: '28px', fontWeight: '900', margin: '0 0 10px 0' }}>Mod Spectator</h2>

                {/* Caseta de status dinamică: Verde pentru LIVE, Roșu pentru Abandon/Final */}
                <div style={{
                    display: 'inline-block', padding: '10px 20px', borderRadius: '4px', marginBottom: '30px', fontSize: '13px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px',
                    backgroundColor: isGameOver ? '#fef2f2' : '#f0fdf4',
                    color: isGameOver ? '#ef4444' : '#16a34a',
                    border: isGameOver ? '1px solid #fecaca' : '1px solid #bbf7d0',
                    transition: 'all 0.3s ease'
                }}>
                    {status}
                </div>

                {/* TABLA PREMIUM NEAGRĂ (Garantat fără erori vizuale) */}
                <div className="premium-board">
                    {board.flat().map((cellValue, index) => {
                        let cellClass = "premium-cell";
                        if (cellValue === 1) cellClass += " p1";
                        if (cellValue === 2) cellClass += " p2";

                        return (
                            <div key={`cell-${index}`} className={cellClass} />
                        );
                    })}
                </div>

                <div style={{ marginTop: '40px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
                    <button onClick={() => navigate('/lobby')} className="btn-minimal btn-outline" style={{ width: 'auto', padding: '10px 20px' }}>
                        Inapoi in Lobby
                    </button>
                </div>

            </div>
        </div>
    );
};