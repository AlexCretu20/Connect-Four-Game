import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { socket } from '../socket';
import './Game.css';

export const GamePage = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [opponentLeft, setOpponentLeft] = useState(false);

    // Preluăm datele (inclusiv ID-ul nostru) din Lobby
    const { roomId, startingPlayer, yourPlayerId } = location.state || {};

    const ROWS = 6;
    const COLS = 7;
    // Tabla e o matrice plină cu 0 la început
    const [board, setBoard] = useState<number[][]>(
        Array.from({ length: ROWS }, () => Array(COLS).fill(0))
    );

    const [currentPlayer, setCurrentPlayer] = useState<number>(startingPlayer || 1);
    const [winner, setWinner] = useState<number | 'draw' | null>(null);

    // Siguranță: dacă dăm refresh la pagină și pierdem roomId, ne întoarcem la Lobby
    useEffect(() => {
        if (!roomId) {
            navigate('/lobby');
        }
    }, [roomId, navigate]);

    useEffect(() => {
        socket.on('board_updated', (data) => {
            setBoard(data.board);
            setCurrentPlayer(data.nextPlayer);
        });

        socket.on('game_over', (data) => {
            setWinner(data.winner);
        });

        socket.on('opponent_disconnected', () => {
            setOpponentLeft(true);
        });

        return () => {
            socket.off('board_updated');
            socket.off('game_over');
            socket.off('opponent_disconnected');
        };
    }, []);

    const handleColumnClick = (colIndex: number) => {
        // Validare 1: Jocul e gata?
        if (winner !== null) return;

        // Validare 2: ESTE RÂNDUL TĂU? (US-402)
        if (currentPlayer !== yourPlayerId) {
            console.log("Nu e rândul tău!");
            return;
        }

        // Trimitem mutarea către server
        socket.emit('make_move', { roomId, column: colIndex });
    };

    const isMyTurn = currentPlayer === yourPlayerId && winner === null;

    return (
        <div className="game-container">
            {/* 1. ANTETUL: Titlul și Mesajele de stare (Câștig/Rândul tău/Abandon) */}
            <div className="game-header">
                <h2>Connect Four</h2>
                <div className="status-box">
                    {opponentLeft ? (
                        <span style={{ color: '#ef4444' }}>
                        Adversarul s-a deconectat! Ai câștigat prin abandon.
                    </span>
                    ) : winner === 'draw' ? (
                        <span style={{ color: '#6b7280' }}> Remiză! Meciul s-a terminat.</span>
                    ) : winner ? (
                        <span style={{ color: winner === 1 ? '#ef4444' : '#eab308' }}>
                        {winner === yourPlayerId ? ' Felicitări, ai câștigat!' : '💀 Ai pierdut meciul!'}
                    </span>
                    ) : (
                        <span>
                        {isMyTurn ? (
                            <strong style={{ color: '#16a34a' }}>E rândul tău!</strong>
                        ) : (
                            <span style={{ color: '#6b7280' }}>Se așteaptă mutarea adversarului...</span>
                        )}
                    </span>
                    )}
                </div>
            </div>

            {/* 2. TABLA DE JOC: Grila de 6x7 celule */}
            <div className="board">
                {board.map((row, rowIndex) => (
                    <div key={rowIndex} className="row">
                        {row.map((cellValue, colIndex) => {
                            let cellClass = "cell";
                            if (cellValue === 1) cellClass += " player1";
                            if (cellValue === 2) cellClass += " player2";
                            if (cellValue === 0 && isMyTurn && !winner && !opponentLeft) cellClass += " can-click";

                            return (
                                <div
                                    key={`${rowIndex}-${colIndex}`}
                                    className={cellClass}
                                    onClick={() => handleColumnClick(colIndex)}
                                />
                            );
                        })}
                    </div>
                ))}
            </div>

            {/* 3. BUTONUL DE IEȘIRE: Apare DOAR la final (Victorie normală SAU Abandon) */}
            {(winner || opponentLeft) && (
                <button
                    onClick={() => navigate('/lobby')}
                    className="submit-button"
                    style={{ marginTop: '30px', padding: '12px 24px' }}
                >
                    Întoarce-te în Lobby
                </button>
            )}
        </div>
    );
};