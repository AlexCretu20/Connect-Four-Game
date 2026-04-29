import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Auth.css';

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
                console.error("Nu am putut incarca istoricul:", err);
                setLoading(false);
            });
    }, []);

    if (loading) return <div style={{ textAlign: 'center', padding: '50px', color: 'var(--text-secondary)' }}>Se incarca istoricul...</div>;

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-app)', padding: '40px 20px' }}>
            <div style={{ maxWidth: '900px', margin: '0 auto' }}>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                    <div>
                        <div className="section-title" style={{ marginBottom: '5px', border: 'none', padding: 0 }}>Arhiva</div>
                        <h1 style={{ fontSize: '32px', fontWeight: '900', margin: 0 }}>Istoric Meciuri</h1>
                    </div>
                    <button onClick={() => navigate('/lobby')} className="btn-minimal btn-outline" style={{ width: 'auto', padding: '10px 20px' }}>
                        Inapoi in Lobby
                    </button>
                </div>

                <div className="minimal-card" style={{ padding: 0, overflow: 'hidden' }}>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                            <thead>
                            <tr style={{ background: '#f9fafb', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                                <th style={{ padding: '15px 20px', fontWeight: '600' }}>Data</th>
                                <th style={{ padding: '15px 20px', fontWeight: '600' }}>Jucatori</th>
                                <th style={{ padding: '15px 20px', fontWeight: '600' }}>Mutari</th>
                                <th style={{ padding: '15px 20px', fontWeight: '600' }}>Rezultat</th>
                                <th style={{ padding: '15px 20px', fontWeight: '600' }}>Actiune</th>
                            </tr>
                            </thead>
                            <tbody>
                            {matches.length === 0 ? (
                                <tr>
                                    <td colSpan={5} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)' }}>
                                        Nu exista meciuri salvate inca.
                                    </td>
                                </tr>
                            ) : (
                                matches.map((m) => (
                                    <tr key={m.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                        <td style={{ padding: '15px 20px' }}>{new Date(m.created_at).toLocaleDateString('ro-RO')}</td>
                                        <td style={{ padding: '15px 20px', fontWeight: '600', color: 'var(--text-primary)' }}>
                                            {m.p1_name} <span style={{ color: 'var(--text-secondary)', fontWeight: 'normal', margin: '0 4px' }}>vs</span> {m.p2_name}
                                        </td>
                                        <td style={{ padding: '15px 20px' }}>{m.total_moves}</td>
                                        <td style={{ padding: '15px 20px' }}>
                                                <span style={{
                                                    padding: '4px 10px', borderRadius: '4px', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '600',
                                                    backgroundColor: m.status === 'finished' ? '#dcfce7' : '#f3f4f6',
                                                    color: m.status === 'finished' ? '#166534' : '#4b5563'
                                                }}>
                                                    {m.status === 'finished' ? 'Finalizat' : 'Remiza'}
                                                </span>
                                        </td>
                                        <td style={{ padding: '15px 20px' }}>
                                            <button onClick={() => navigate(`/replay/${m.id}`)} className="btn-minimal btn-outline" style={{ padding: '6px 12px', fontSize: '12px', width: 'auto' }}>
                                                Vezi Replay
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};