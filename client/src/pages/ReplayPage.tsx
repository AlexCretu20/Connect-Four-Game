import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './Game.css'; // Aici avem clasele premium-board
import './Auth.css';

export const ReplayPage = () => {
    const { matchId } = useParams();
    const navigate = useNavigate();

    const [matchInfo, setMatchInfo] = useState<any>(null);
    const [allMoves, setAllMoves] = useState<any[]>([]);
    const [currentStep, setCurrentStep] = useState(0);
    const [board, setBoard] = useState<number[][]>(Array(6).fill(0).map(() => Array(7).fill(0)));

    useEffect(() => {
        fetch(`http://localhost:5000/api/matchesReplay/${matchId}`)
            .then(res => res.json())
            .then(data => {
                setMatchInfo(data.matchInfo);
                setAllMoves(data.moves);
            });
    }, [matchId]);

    useEffect(() => {
        const newBoard = Array(6).fill(0).map(() => Array(7).fill(0));

        for (let i = 0; i < currentStep; i++) {
            const move = allMoves[i];
            const col = move.col_index;
            const playerNum = move.player_id === matchInfo.player1_id ? 1 : 2;

            for (let row = 5; row >= 0; row--) {
                if (newBoard[row][col] === 0) {
                    newBoard[row][col] = playerNum;
                    break;
                }
            }
        }
        setBoard(newBoard);
    }, [currentStep, allMoves, matchInfo]);

    const nextMove = () => {
        if (currentStep < allMoves.length) setCurrentStep(currentStep + 1);
    };

    const prevMove = () => {
        if (currentStep > 0) setCurrentStep(currentStep - 1);
    };

    if (!matchInfo) return <div style={{ textAlign: 'center', padding: '50px', color: 'var(--text-secondary)' }}>Se incarca reluarea...</div>;

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-app)', padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div className="minimal-card" style={{ maxWidth: '700px', width: '100%', textAlign: 'center' }}>

                <div className="section-title" style={{ border: 'none', marginBottom: '10px' }}>Replay Meci</div>
                <h2 style={{ fontSize: '24px', fontWeight: '900', margin: '0 0 10px 0' }}>{matchInfo.player1_name} vs {matchInfo.player2_name}</h2>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '30px', fontSize: '14px', letterSpacing: '1px', textTransform: 'uppercase' }}>
                    Mutarea: <strong style={{ color: 'var(--text-primary)' }}>{currentStep}</strong> / {allMoves.length}
                </p>

                {/* TABLA PREMIUM NEAGRĂ (Fără erori de overflow) */}
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

                {/* Controalele Meciului */}
                <div style={{ marginTop: '40px', display: 'flex', justifyContent: 'center', gap: '15px' }}>
                    <button
                        className="btn-minimal btn-outline"
                        onClick={prevMove}
                        disabled={currentStep === 0}
                        style={{ width: 'auto', padding: '10px 20px' }}
                    >
                        Inapoi
                    </button>
                    <button
                        className="btn-minimal btn-outline"
                        onClick={() => setCurrentStep(0)}
                        style={{ width: 'auto', padding: '10px 20px' }}
                    >
                        Reset
                    </button>
                    <button
                        className="btn-minimal btn-primary"
                        onClick={nextMove}
                        disabled={currentStep === allMoves.length}
                        style={{ width: 'auto', padding: '10px 20px' }}
                    >
                        Inainte
                    </button>
                </div>

                {/* Intoarcere in istoric */}
                <div style={{ marginTop: '30px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
                    <button onClick={() => navigate('/history')} className="btn-minimal btn-outline" style={{ width: 'auto', padding: '10px 20px' }}>
                        Inapoi la Istoric
                    </button>
                </div>

            </div>
        </div>
    );
};