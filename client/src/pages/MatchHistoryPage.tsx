import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

// Definim un tip pentru meci ca să fim corecți cu TypeScript
interface Match {
    id: number;
    p1_name: string;
    p2_name: string;
    total_moves: number;
    created_at: string;
    status: string;
}

export const MatchHistoryPage = () => {
    const [matches, setMatches] = useState<Match[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        // Chemăm ruta de backend pe care am testat-o mai devreme
        fetch('http://localhost:5000/api/matches/history')
            .then(res => {
                if (!res.ok) throw new Error("Eroare la server");
                return res.json();
            })
            .then(data => {
                setMatches(data);
                setLoading(false);
            })
            .catch(err => {
                console.error("Nu am putut încărca istoricul:", err);
                setLoading(false);
            });
    }, []);

    if (loading) return <div className="loader">Se încarcă istoricul...</div>;

    return (
        <div className="leaderboard-container">
            <div className="leaderboard-card">
                <div className="leaderboard-header">
                    <h2>Istoric Meciuri </h2>
                    <button onClick={() => navigate('/lobby')} className="back-link">
                        ← Înapoi în Lobby
                    </button>
                </div>

                <table className="leaderboard-table">
                    <thead>
                    <tr>
                        <th>Dată</th>
                        <th>Jucători</th>
                        <th>Mutări</th>
                        <th>Rezultat</th>
                        <th>Acțiune</th>
                    </tr>
                    </thead>
                    <tbody>
                    {matches.length === 0 ? (
                        <tr>
                            <td colSpan={5} style={{ textAlign: 'center', padding: '20px' }}>
                                Nu există meciuri salvate încă.
                            </td>
                        </tr>
                    ) : (
                        matches.map((m) => (
                            <tr key={m.id}>
                                <td>{new Date(m.created_at).toLocaleDateString('ro-RO')}</td>
                                <td style={{ fontWeight: '600' }}>
                                    {m.p1_name} <span style={{ color: '#9ca3af', fontWeight: 'normal' }}>vs</span> {m.p2_name}
                                </td>
                                <td>{m.total_moves}</td>
                                <td>
                                        <span className={`status-badge ${m.status}`}>
                                            {m.status === 'finished' ? 'Finalizat' : 'Remiză'}
                                        </span>
                                </td>
                                <td>
                                    <button
                                        className="replay-button"
                                        onClick={() => navigate(`/replay/${m.id}`)}
                                    >
                                        Vezi Replay 🎥
                                    </button>
                                </td>
                            </tr>
                        ))
                    )}
                    </tbody>
                </table>
            </div>

            <style>{`
                .replay-button {
                    background-color: #2563eb;
                    color: white;
                    border: none;
                    padding: 8px 12px;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 14px;
                    transition: background 0.2s;
                }
                .replay-button:hover {
                    background-color: #1d4ed8;
                }
                .status-badge {
                    padding: 4px 8px;
                    border-radius: 4px;
                    font-size: 12px;
                    text-transform: uppercase;
                }
                .status-badge.finished { background-color: #dcfce7; color: #166534; }
                .status-badge.draw { background-color: #f3f4f6; color: #374151; }
            `}</style>
        </div>
    );
};