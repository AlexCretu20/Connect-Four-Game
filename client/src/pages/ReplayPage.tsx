import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './replay.css';

export const ReplayPage = () => {
    const { matchId } = useParams();
    const navigate = useNavigate();

    const [matchInfo, setMatchInfo] = useState<any>(null);
    const [allMoves, setAllMoves] = useState<any[]>([]);
    const [currentStep, setCurrentStep] = useState(0); // La ce mutare suntem?
    const [board, setBoard] = useState<number[][]>(Array(6).fill(0).map(() => Array(7).fill(0)));

    // 1. Încărcăm datele de la server
    useEffect(() => {
        fetch(`http://localhost:5000/api/matchesReplay/${matchId}`)
            .then(res => res.json())
            .then(data => {
                setMatchInfo(data.matchInfo);
                setAllMoves(data.moves);
            });
    }, [matchId]);

    // 2. Funcția care reconstruiește tabla până la pasul X
    useEffect(() => {
        const newBoard = Array(6).fill(0).map(() => Array(7).fill(0));

        // Aplicăm mutările din JSON până la indexul curent
        for (let i = 0; i < currentStep; i++) {
            const move = allMoves[i];
            const col = move.col_index;
            const playerNum = move.player_id === matchInfo.player1_id ? 1 : 2; // Identificăm culoarea

            // Găsim primul rând liber în coloana respectivă (logică de jos în sus)
            for (let row = 5; row >= 0; row--) {
                if (newBoard[row][col] === 0) {
                    newBoard[row][col] = playerNum;
                    break;
                }
            }
        }
        setBoard(newBoard);
    }, [currentStep, allMoves]);

    const nextMove = () => {
        if (currentStep < allMoves.length) setCurrentStep(currentStep + 1);
    };

    const prevMove = () => {
        if (currentStep > 0) setCurrentStep(currentStep - 1);
    };

    if (!matchInfo) return <div>Se încarcă istoricul...</div>;

    return (
        <div className="game-container">
            <h1>Replay: {matchInfo.player1_name} vs {matchInfo.player2_name}</h1>
            <p>Mutarea: {currentStep} / {allMoves.length}</p>

            {/* Aici refolosești componenta ta de Board sau desenezi una simplă */}
            <div className="board">
                {board.map((row, rIdx) => (
                    row.map((cell, cIdx) => (
                        <div key={`${rIdx}-${cIdx}`} className={`cell player-${cell}`} />
                    ))
                ))}
            </div>

            <div className="controls" style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                <button className="back-link" onClick={prevMove} disabled={currentStep === 0}>
                    ◀ Înapoi
                </button>
                <button className="back-link" onClick={() => setCurrentStep(0)}>
                    Reset 🔄
                </button>
                <button className="back-link" style={{ backgroundColor: '#2563eb', color: 'white' }}
                        onClick={nextMove} disabled={currentStep === allMoves.length}>
                    Înainte ▶
                </button>
            </div>

            <button onClick={() => navigate('/history')} style={{ marginTop: '30px' }}>
                Înapoi la Istoric
            </button>
        </div>
    );
};