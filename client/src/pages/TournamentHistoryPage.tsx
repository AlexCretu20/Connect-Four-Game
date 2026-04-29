import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Auth.css';

export const TournamentHistoryPage = () => {
    const navigate = useNavigate();
    const [history, setHistory] = useState<any[]>([]);

    useEffect(() => {
        fetch('http://localhost:5000/api/tournaments/history')
            .then(res => res.json())
            .then(data => setHistory(data))
            .catch(err => console.error("Eroare:", err));
    }, []);

    return (
        <div className="login-container" style={{ paddingBottom: '50px' }}>
            <div className="login-card" style={{ maxWidth: '800px', width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                    <h2 className="login-title" style={{ margin: 0 }}>🏆 Arhiva Campionatelor</h2>
                    <button onClick={() => navigate('/tournaments')} style={{ background: '#6b7280', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' }}>
                        Înapoi
                    </button>
                </div>

                {history.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280', background: '#f9fafb', borderRadius: '12px' }}>
                        Încă nu s-a finalizat niciun turneu. Fii tu primul campion!
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '20px' }}>
                        {history.map(t => (
                            <div key={t.id} style={{
                                background: 'linear-gradient(135deg, #fef9c3 0%, #fef08a 100%)',
                                border: '2px solid #eab308',
                                padding: '20px',
                                borderRadius: '12px',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                                textAlign: 'center',
                                position: 'relative'
                            }}>
                                <div style={{ fontSize: '40px', marginBottom: '10px' }}>👑</div>
                                <h3 style={{ margin: '0 0 10px 0', color: '#854d0e', fontSize: '20px' }}>{t.name}</h3>

                                <div style={{ background: 'white', padding: '10px', borderRadius: '8px', marginBottom: '10px' }}>
                                    <span style={{ fontSize: '14px', color: '#6b7280', display: 'block' }}>Câștigător:</span>
                                    <strong style={{ fontSize: '18px', color: '#111827' }}>{t.winner_name}</strong>
                                </div>

                                <div style={{ fontSize: '12px', color: '#a16207' }}>
                                    Finalizat la: {new Date(t.created_at).toLocaleDateString('ro-RO')}
                                </div>

                                {/* Buton să vadă tabloul final al acelui turneu vechi */}
                                <button
                                    onClick={() => navigate(`/tournaments/${t.id}/bracket`)}
                                    style={{ marginTop: '15px', background: 'transparent', border: '1px solid #ca8a04', color: '#ca8a04', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
                                >
                                    Vezi Tabloul Final
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};