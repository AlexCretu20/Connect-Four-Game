import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { socket } from '../socket';
import './Game.css';

export const SpectatorPage = () => {
    const { roomId } = useParams();
    const navigate = useNavigate();

    // Tabla de start (goală)
    const [board, setBoard] = useState<number[][]>(
        Array.from({ length: 6 }, () => Array(7).fill(0))
    );

    const [status, setStatus] = useState('Se conectează la meci... ⏳');
    const [isGameOver, setIsGameOver] = useState(false);

    useEffect(() => {
        if (!roomId) {
            navigate('/lobby');
            return;
        }

        console.log(`🔌 Încercăm conectarea ca spectator la camera: ${roomId}`);
        socket.emit('join_as_spectator', roomId);

        // 1. Starea inițială (dacă meciul era deja început)
        socket.on('initial_spectator_state', (data) => {
            console.log("📺 Am primit tabla inițială:", data);
            if (data.board) {
                // Truc pentru a forța React să vadă schimbarea: deep copy
                setBoard(JSON.parse(JSON.stringify(data.board)));
                setStatus('LIVE 🔴');
            }
        });

        // 2. La fiecare mutare făcută de jucători
        socket.on('board_updated', (data) => {
            console.log("🔄 Update de mutare primit:", data);
            if (data.board) {
                setBoard(JSON.parse(JSON.stringify(data.board)));
            }
        });

        socket.on('match_ended', (data) => {
            console.log("🏁 Meciul s-a terminat:", data);
            setIsGameOver(true);
            setStatus(data.status === 'draw' ? 'Meci terminat la egalitate! 🤝' : `Meci terminat! Jucătorul ${data.winner} a câștigat! 🏆`);
        });

        socket.on('opponent_disconnected', () => {
            setIsGameOver(true);
            setStatus('Meci abandonat (un jucător a ieșit). 🚪');
        });

        return () => {
            socket.off('initial_spectator_state');
            socket.off('board_updated');
            socket.off('match_ended');
            socket.off('opponent_disconnected');
        };
    }, [roomId, navigate]);

    return (
        <div className="game-container">
            <div className="game-header">
                <h2>Mod Spectator 🍿</h2>
                <div className="status-box" style={{ color: isGameOver ? '#ef4444' : '#22c55e' }}>
                    {status}
                </div>
            </div>

            <div className="board spectator-board">
                {board.flat().map((cellValue, index) => {
                    let cellClass = "cell";
                    if (cellValue === 1) cellClass += " player1";
                    if (cellValue === 2) cellClass += " player2";

                    return (
                        <div
                            key={`cell-${index}`}
                            className={cellClass}
                        />
                    );
                })}
            </div>

            <button
                onClick={() => navigate('/lobby')}
                className="submit-button"
                style={{ marginTop: '30px' }}
            >
                Înapoi în Lobby
            </button>
        </div>
    );
};