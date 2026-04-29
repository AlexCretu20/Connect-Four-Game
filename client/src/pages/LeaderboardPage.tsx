import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Auth.css';

export const LeaderboardPage = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState<any[]>([]);

    useEffect(() => {
        fetch('http://localhost:5000/api/leaderboard')
            .then(res => res.json())
            .then(data => setStats(data))
            .catch(err => console.error(err));
    }, []);

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-app)', padding: '40px 20px' }}>
            <div style={{ maxWidth: '900px', margin: '0 auto' }}>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                    <div>
                        <div className="section-title" style={{ marginBottom: '5px', border: 'none', padding: 0 }}>Statistici</div>
                        <h1 style={{ fontSize: '32px', fontWeight: '900', margin: 0 }}>Clasament Global</h1>
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
                                <th style={{ padding: '15px 20px', fontWeight: '600' }}>Loc</th>
                                <th style={{ padding: '15px 20px', fontWeight: '600' }}>Jucator</th>
                                <th style={{ padding: '15px 20px', fontWeight: '600' }}>Meciuri</th>
                                <th style={{ padding: '15px 20px', fontWeight: '600' }}>Victorii</th>
                                <th style={{ padding: '15px 20px', fontWeight: '600' }}>Infrangeri</th>
                                <th style={{ padding: '15px 20px', fontWeight: '600' }}>Remize</th>
                                <th style={{ padding: '15px 20px', fontWeight: '600' }}>Mutari (Medie)</th>
                            </tr>
                            </thead>
                            <tbody>
                            {stats.map((user, index) => (
                                <tr key={index} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                    <td style={{ padding: '15px 20px', fontWeight: index < 3 ? 'bold' : 'normal', color: index < 3 ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                                        {index + 1}
                                    </td>
                                    <td style={{ padding: '15px 20px', fontWeight: '600', color: 'var(--text-primary)' }}>{user.username}</td>
                                    <td style={{ padding: '15px 20px' }}>{user.total_games}</td>
                                    <td style={{ padding: '15px 20px', color: '#16a34a', fontWeight: '500' }}>{user.wins}</td>
                                    <td style={{ padding: '15px 20px', color: '#ef4444' }}>{user.losses}</td>
                                    <td style={{ padding: '15px 20px', color: '#6b7280' }}>{user.draws}</td>
                                    <td style={{ padding: '15px 20px' }}>{user.avg_moves_win ? parseFloat(user.avg_moves_win).toFixed(1) : '—'}</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};