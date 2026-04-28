import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Auth.css'; // Putem refolosi stilurile de bază

export const LeaderboardPage = () => {
    const [stats, setStats] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        fetch('http://localhost:5000/api/auth/leaderboard')
            .then(res => res.json())
            .then(data => setStats(data))
            .catch(err => console.error(err));
    }, []);


    return (
        <div className="leaderboard-container">
            <div className="leaderboard-card">
                <div className="leaderboard-header">
                    <h2 style={{ fontSize: '24px', fontWeight: 'bold' }}>Clasament Jucători </h2>
                    <button onClick={() => navigate('/lobby')} className="back-link">
                        <span>←</span> Înapoi în Lobby
                    </button>
                </div>

                <table className="leaderboard-table">
                    <thead>
                    <tr>
                        <th>Loc & Jucător</th>
                        <th>Meciuri</th>
                        <th>Victorii</th>
                        <th>Înfrângeri</th>
                        <th>Remize</th>
                        <th>Media Mutări</th>
                    </tr>
                    </thead>
                    <tbody>
                    {stats.map((user: any, index) => (
                        <tr key={index}>
                            <td>
                                <span className={`rank-badge ${index < 3 ? `rank-${index + 1}` : ''}`}>
                                    {index + 1}
                                </span>
                                {user.username}
                            </td>
                            <td>{user.total_games}</td>
                            <td className="stat-win">{user.games_won}</td>
                            <td className="stat-loss">{user.games_lost}</td>
                            <td className="stat-neutral">{user.games_drawn}</td>
                            <td>
                                <span style={{ fontWeight: '500' }}>
                                    {user.avg_moves_to_win ? parseFloat(user.avg_moves_to_win).toFixed(1) : '—'}
                                </span>
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};