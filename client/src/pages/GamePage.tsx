import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { socket } from '../socket';
import './Game.css';

export const GamePage = () => {
    const location = useLocation();
    const navigate = useNavigate();

    // Extragem datele cu fallback pentru a preveni erorile
    const { roomId, startingPlayer, yourPlayerId, initialBoard } = location.state || {};

    const ROWS = 6;
    const COLS = 7;

    // Inițializăm cu ce vine de la server SAU cu o tablă proaspătă 6x7
    const [board, setBoard] = useState<number[][]>(() => {
        if (initialBoard && initialBoard.length > 0) return initialBoard;
        return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
    });

    const [opponentLeft, setOpponentLeft] = useState(false);
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
        // Validare 1: Jocul e gata sau adversarul a ieșit?
        if (winner !== null || opponentLeft) return;

        // Validare 2: ESTE RÂNDUL TĂU?
        if (currentPlayer !== yourPlayerId) {
            console.log("Nu e rândul tău!");
            return;
        }

        // Trimitem mutarea către server
        socket.emit('make_move', { roomId, column: colIndex });
    };

    const isMyTurn = currentPlayer === yourPlayerId && winner === null && !opponentLeft;

    const handleLeaveGame = () => {
        // Trimitem abandon către server DOAR dacă meciul nu s-a terminat deja
        // (Dacă am câștigat/pierdut deja, doar ne întoarcem în lobby)
        if (winner === null && !opponentLeft) {
            socket.emit('leave_match', roomId);
        }
        navigate('/lobby');
    };

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>

            {/* Header Pagina */}
            <div>
                <div style={{ textTransform: 'uppercase', letterSpacing: '3px', color: '#6b7280', fontSize: '12px', marginBottom: '10px' }}>
                    Patru / În / Linie
                </div>
                <h1 className="page-title">Patru în Linie</h1>
                <p className="page-subtitle">
                    Aliniați patru piese — pe orizontală, verticală sau diagonală — înaintea adversarului.
                </p>
            </div>

            <div className="game-layout">
                {/* ======================================= */}
                {/* PARTEA STÂNGĂ: Tabla de joc             */}
                {/* ======================================= */}
                <div className="minimal-card">
                    <div className="board-header">
                        <div className="player-badge">
                            <div className="color-dot dot-p1"></div>
                            Jucător 1 {yourPlayerId === 1 && "(Tu)"}
                        </div>
                        <span style={{ color: '#9ca3af', fontSize: '12px', letterSpacing: '2px' }}>VS</span>
                        <div className="player-badge">
                            <div className="color-dot dot-p2"></div>
                            Jucător 2 {yourPlayerId === 2 && "(Tu)"}
                        </div>
                    </div>

                    {/* Generarea grilei 6x7 */}
                    <div className="connect4-board">
                        {board.flat().map((cellValue, index) => {
                            const colIndex = index % 7;

                            let cellClass = "board-cell";
                            if (cellValue === 1) cellClass += " filled-p1";
                            if (cellValue === 2) cellClass += " filled-p2";

                            // Dacă e rândul meu și coloana respectivă se poate apăsa, putem adăuga un efect de hover (opțional)
                            if (cellValue === 0 && isMyTurn) {
                                cellClass += " clickable"; // Poți adăuga cursor: pointer in CSS pt clasa asta
                            }

                            return (
                                <div
                                    key={index}
                                    className={cellClass}
                                    onClick={() => handleColumnClick(colIndex)}
                                />
                            );
                        })}
                    </div>
                </div>

                {/* ======================================= */}
                {/* PARTEA DREAPTĂ: Sidebar / Scor          */}
                {/* ======================================= */}
                <div>
                    <div className="minimal-card" style={{ marginBottom: '20px' }}>

                        {/* Secțiune: Status Meci */}
                        <div className="sidebar-section">
                            <div className="sidebar-title">Status Meci</div>

                            <div className="stat-row">
                                <span>La mutare</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
                                    <div className={`color-dot ${currentPlayer === 1 ? 'dot-p1' : 'dot-p2'}`}></div>
                                    Jucător {currentPlayer}
                                </div>
                            </div>

                            <div className="stat-row" style={{ flexDirection: 'column', alignItems: 'flex-start', marginTop: '15px', background: '#f9fafb', padding: '15px', borderRadius: '4px' }}>
                                <span style={{ fontSize: '12px', textTransform: 'uppercase', color: '#6b7280', marginBottom: '5px' }}>Mesaj:</span>
                                <strong style={{ fontSize: '16px' }}>
                                    {opponentLeft ? (
                                        <span style={{ color: '#ef4444' }}>Adversarul a fugit! Victorie!</span>
                                    ) : winner === 'draw' ? (
                                        <span style={{ color: '#6b7280' }}>Remiză!</span>
                                    ) : winner ? (
                                        <span style={{ color: winner === yourPlayerId ? '#10b981' : '#ef4444' }}>
                                            {winner === yourPlayerId ? 'Ai câștigat!' : ' Ai pierdut!'}
                                        </span>
                                    ) : isMyTurn ? (
                                        <span style={{ color: '#10b981' }}>E rândul tău!</span>
                                    ) : (
                                        <span style={{ color: '#6b7280' }}>Așteaptă adversarul...</span>
                                    )}
                                </strong>
                            </div>
                        </div>

                        {/* Secțiune: Legendă */}
                        <div className="sidebar-section">
                            <div className="sidebar-title">Jucători</div>
                            <div className="stat-row">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div className="color-dot dot-p1"></div>
                                    <span style={{ color: '#6b7280', fontSize: '12px', letterSpacing: '1px' }}>ROȘU</span>
                                </div>
                                <span>Jucător 1</span>
                            </div>
                            <div className="stat-row">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div className="color-dot dot-p2"></div>
                                    <span style={{ color: '#6b7280', fontSize: '12px', letterSpacing: '1px' }}>GALBEN</span>
                                </div>
                                <span>Jucător 2</span>
                            </div>
                        </div>

                        {/* Butonul de Ieșire */}
                        <div className="sidebar-section" style={{ marginBottom: 0 }}>
                            <div className="sidebar-title">Comenzi</div>
                            <button onClick={handleLeaveGame} className={(winner || opponentLeft) ? "btn-black" : "btn-outline"}>
                                {(winner || opponentLeft) ? 'Inapoi in Lobby' : 'Abandoneaza Meciul'}
                            </button>
                        </div>

                    </div>
                </div>

            </div>
        </div>
    );
};