import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Auth.css'; // Folosim stilurile tale de bază

export const LeaderboardPage = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState<any[]>([]);

    useEffect(() => {
        fetch('http://localhost:5000/api/leaderboard')
            .then(res => res.json())
            .then(data => setStats(data))
            .catch(err => console.error("Eroare leaderboard:", err));
    }, []);

    return (
        <div className="login-container">
            <div className="login-card" style={{ maxWidth: '950px', width: '95%', padding: '30px' }}>

                {/* Header Clasament */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                    <h2 className="login-title" style={{ margin: 0, fontSize: '28px' }}>📊 Clasament Global</h2>
                    <button
                        onClick={() => navigate('/lobby')}
                        style={{ background: '#6b7280', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', transition: '0.2s' }}
                        onMouseOver={(e) => (e.currentTarget.style.background = '#4b5563')}
                        onMouseOut={(e) => (e.currentTarget.style.background = '#6b7280')}
                    >
                        ← Lobby
                    </button>
                </div>

                {/* Container Tabel cu Scroll pe Mobil */}
                <div style={{ overflowX: 'auto', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', border: '1px solid #e5e7eb' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', fontSize: '15px' }}>
                        <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e5e7eb', color: '#4b5563' }}>
                            <th style={{ padding: '15px', textAlign: 'center' }}>Loc</th>
                            <th style={{ padding: '15px', textAlign: 'left' }}>Jucător</th>
                            <th style={{ padding: '15px', textAlign: 'center' }}>Meciuri</th>
                            <th style={{ padding: '15px', textAlign: 'center', color: '#16a34a' }}>Victorii (W)</th>
                            <th style={{ padding: '15px', textAlign: 'center', color: '#dc2626' }}>Înfrângeri (L)</th>
                            <th style={{ padding: '15px', textAlign: 'center', color: '#2563eb' }}>Egaluri (D)</th>
                            <th style={{ padding: '15px', textAlign: 'center' }}>Avg. Mutări (Câștig)</th>
                        </tr>
                        </thead>
                        <tbody>
                        {stats.map((user, index) => {
                            const isTop3 = index < 3;
                            const rowBg = index === 0 ? '#fffdf0' : index === 1 ? '#f8fafc' : index === 2 ? '#fffaf8' : 'white';

                            return (
                                <tr
                                    key={index}
                                    style={{
                                        background: rowBg,
                                        borderBottom: '1px solid #f1f5f9',
                                        transition: 'transform 0.2s'
                                    }}
                                >
                                    {/* Coloana Loc + Medalie */}
                                    <td style={{ padding: '15px', textAlign: 'center', fontWeight: 'bold', fontSize: isTop3 ? '20px' : '15px' }}>
                                        {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                                    </td>

                                    {/* Nume Jucător */}
                                    <td style={{ padding: '15px', fontWeight: isTop3 ? 'bold' : '500', color: '#1f2937' }}>
                                        {user.username}
                                    </td>

                                    {/* Statistici cifre */}
                                    <td style={{ padding: '15px', textAlign: 'center' }}>{user.total_games}</td>

                                    <td style={{ padding: '15px', textAlign: 'center', fontWeight: 'bold', color: '#16a34a', background: 'rgba(22, 163, 74, 0.05)' }}>
                                        {user.wins}
                                    </td>

                                    <td style={{ padding: '15px', textAlign: 'center', color: '#dc2626' }}>
                                        {user.losses}
                                    </td>

                                    <td style={{ padding: '15px', textAlign: 'center', color: '#2563eb' }}>
                                        {user.draws}
                                    </td>

                                    {/* Media de mutări */}
                                    <td style={{ padding: '15px', textAlign: 'center', fontWeight: '500', color: '#4b5563' }}>
                                        {user.avg_moves_win ? (
                                            <span style={{ background: '#f3f4f6', padding: '4px 8px', borderRadius: '6px' }}>
                                                    {parseFloat(user.avg_moves_win).toFixed(1)}
                                                </span>
                                        ) : (
                                            <span style={{ color: '#9ca3af' }}>—</span>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                        </tbody>
                    </table>
                </div>

                {/* Footer Legendă */}
                <div style={{ marginTop: '20px', fontSize: '13px', color: '#6b7280', textAlign: 'center' }}>
                    * Clasamentul este ordonat după numărul de victorii și eficiența mutărilor.
                </div>
            </div>
        </div>
    );
};