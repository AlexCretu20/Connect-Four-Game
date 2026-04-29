import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Auth.css';

export const TournamentsPage = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState<{id: number, username: string} | null>(null);
    const [tournaments, setTournaments] = useState<any[]>([]);

    const [newTournamentName, setNewTournamentName] = useState('');
    const [maxPlayers, setMaxPlayers] = useState(4);
    const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);

    const showNotification = (message: string, type: 'success' | 'error') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 3000);
    };

    const fetchTournaments = async () => {
        try {
            const res = await fetch('http://localhost:5000/api/see_tournaments');
            const data = await res.json();
            setTournaments(data);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        } else {
            navigate('/login');
        }
        fetchTournaments();
        const interval = setInterval(fetchTournaments, 5000);
        return () => clearInterval(interval);
    }, [navigate]);

    const handleCreateTournament = async () => {
        if (!newTournamentName.trim()) {
            showNotification('Introdu un nume pentru turneu.', 'error');
            return;
        }

        try {
            const res = await fetch('http://localhost:5000/api/create_tournament', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newTournamentName, ownerId: user?.id, maxPlayers: maxPlayers })
            });

            if (res.ok) {
                showNotification('Turneu creat cu succes!', 'success');
                setNewTournamentName('');
                fetchTournaments();
            } else {
                showNotification('Eroare la crearea turneului.', 'error');
            }
        } catch (err) {
            showNotification('Eroare de conexiune.', 'error');
        }
    };

    const handleJoinTournament = async (tournamentId: number) => {
        try {
            const res = await fetch(`http://localhost:5000/api/join_tournament/${tournamentId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user?.id })
            });
            const data = await res.json();
            if (res.ok) {
                showNotification(data.message, 'success');
                fetchTournaments();
            } else {
                showNotification(data.error, 'error');
            }
        } catch (err) {
            showNotification('Eroare de conexiune.', 'error');
        }
    };

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-app)', padding: '40px 20px' }}>

            {notification && (
                <div style={{
                    position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)',
                    backgroundColor: 'white', border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)', padding: '15px 30px', borderRadius: '4px', zIndex: 1000,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontWeight: 'bold'
                }}>
                    {notification.message}
                </div>
            )}

            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                    <div>
                        <div className="section-title" style={{ marginBottom: '5px', border: 'none', padding: 0 }}>Competitii</div>
                        <h1 style={{ fontSize: '32px', fontWeight: '900', margin: 0 }}>Turnee Active</h1>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button onClick={fetchTournaments} className="btn-minimal btn-outline" style={{ width: 'auto', padding: '10px 15px' }}>Refresh</button>
                        <button onClick={() => navigate('/tournaments/history')} className="btn-minimal btn-outline" style={{ width: 'auto', padding: '10px 15px' }}>Arhiva</button>
                        <button onClick={() => navigate('/lobby')} className="btn-minimal btn-outline" style={{ width: 'auto', padding: '10px 15px' }}>Lobby</button>
                    </div>
                </div>

                <div className="minimal-card" style={{ marginBottom: '30px', background: '#f9fafb' }}>
                    <div className="section-title">Creeaza un turneu nou</div>
                    <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                        <input
                            type="text"
                            placeholder="Numele turneului (ex: Cupa Toamnei)"
                            value={newTournamentName}
                            onChange={(e) => setNewTournamentName(e.target.value)}
                            className="search-input"
                            style={{ margin: 0, flex: 2 }}
                        />
                        <select
                            value={maxPlayers}
                            onChange={(e) => setMaxPlayers(parseInt(e.target.value))}
                            className="search-input"
                            style={{ margin: 0, flex: 1, cursor: 'pointer' }}
                        >
                            <option value={4}>4 Jucatori</option>
                            <option value={8}>8 Jucatori</option>
                        </select>
                        <button onClick={handleCreateTournament} className="btn-minimal btn-primary" style={{ flex: 1 }}>
                            Creeaza
                        </button>
                    </div>
                </div>

                <div className="minimal-card">
                    <div className="section-title">Turnee Disponibile</div>
                    {tournaments.length === 0 ? (
                        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px 0' }}>Nu exista turnee in acest moment.</p>
                    ) : (
                        <div>
                            {tournaments.map(t => (
                                <div key={t.id} className="list-row" style={{ alignItems: 'center' }}>
                                    <div>
                                        <div style={{ fontSize: '16px', fontWeight: '600' }}>{t.name}</div>
                                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>Creat de: {t.owner_name}</div>
                                        <div style={{ fontSize: '12px', marginTop: '4px', fontWeight: 'bold', color: parseInt(t.current_players) >= t.max_players ? '#ef4444' : '#16a34a' }}>
                                            Locuri: {t.current_players || 0} / {t.max_players}
                                        </div>
                                    </div>

                                    {t.status === 'active' ? (
                                        <button onClick={() => navigate(`/tournaments/${t.id}/bracket`)} className="btn-minimal btn-outline" style={{ width: 'auto', padding: '8px 16px' }}>
                                            Tablou Turneu
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => handleJoinTournament(t.id)}
                                            disabled={parseInt(t.current_players) >= t.max_players}
                                            className="btn-minimal btn-primary"
                                            style={{ width: 'auto', padding: '8px 16px', opacity: parseInt(t.current_players) >= t.max_players ? 0.5 : 1 }}
                                        >
                                            {parseInt(t.current_players) >= t.max_players ? 'Se Genereaza...' : 'Inscrie-te'}
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};