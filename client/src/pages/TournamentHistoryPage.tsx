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
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-app)', padding: '40px 20px' }}>
            <div style={{ maxWidth: '900px', margin: '0 auto' }}>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                    <div>
                        <div className="section-title" style={{ marginBottom: '5px', border: 'none', padding: 0 }}>Arhiva</div>
                        <h1 style={{ fontSize: '32px', fontWeight: '900', margin: 0 }}>Istoric Turnee</h1>
                    </div>
                    <button onClick={() => navigate('/tournaments')} className="btn-minimal btn-outline" style={{ width: 'auto', padding: '10px 20px' }}>
                        Inapoi la Turnee
                    </button>
                </div>

                {history.length === 0 ? (
                    <div className="minimal-card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                        Inca nu s-a finalizat niciun turneu.
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                        {history.map(t => (
                            <div key={t.id} className="minimal-card" style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                <div>
                                    <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                                        Finalizat la: {new Date(t.created_at).toLocaleDateString('ro-RO')}
                                    </div>
                                    <h3 style={{ margin: '0 0 20px 0', fontSize: '20px', fontWeight: '700' }}>{t.name}</h3>

                                    <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '15px', marginBottom: '20px' }}>
                                        <span style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Campion</span>
                                        <strong style={{ fontSize: '18px', color: 'var(--text-primary)' }}>{t.winner_name}</strong>
                                    </div>
                                </div>

                                <button
                                    onClick={() => navigate(`/tournaments/${t.id}/bracket`)}
                                    className="btn-minimal btn-outline"
                                >
                                    Tablou Final
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};