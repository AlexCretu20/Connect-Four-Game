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

            const activeTournamentForMe = data.find((t: any) =>
                t.status === 'active' &&
                // Verificăm dacă user-ul este owner sau dacă am putea verifica înscrierea (opțional)
                // Pentru simplitate, dacă turneul e activ, lăsăm utilizatorul să dea click,
                // dar putem forța intrarea dacă el a fost implicat:
                localStorage.getItem(`joined_tournament_${t.id}`) === 'true'
            );

            if (activeTournamentForMe) {
                // Dacă vrei redirecționare automată instantă:
                // navigate(`/tournaments/${activeTournamentForMe.id}/bracket`);
                // SAU pur și simplu turneul va apărea acum în listă cu butonul "Vezi Tabloul"
            }
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

        fetchTournaments(); // Aducem datele imediat

        const interval = setInterval(fetchTournaments, 5000);
        return () => clearInterval(interval);
    }, [navigate]);

    const handleCreateTournament = async () => {
        if (!newTournamentName.trim()) {
            showNotification('Te rog să introduci un nume pentru turneu.', 'error');
            return;
        }

        try {
            const res = await fetch('http://localhost:5000/api/create_tournament', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newTournamentName,
                    ownerId: user?.id,
                    maxPlayers: maxPlayers
                })
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
        <div className="login-container" style={{ paddingBottom: '50px' }}>
            {notification && (
                <div style={{
                    position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)',
                    backgroundColor: notification.type === 'success' ? '#22c55e' : '#ef4444',
                    color: 'white', padding: '12px 24px', borderRadius: '8px', zIndex: 1000, fontWeight: 'bold'
                }}>
                    {notification.message}
                </div>
            )}

            <div className="login-card" style={{ maxWidth: '600px', width: '100%' }}>

                {/* 🔥 NOU: Am adăugat butonul de Refresh manual lângă titlu */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 className="login-title" style={{ margin: 0 }}>🏆 Turnee</h2>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button onClick={fetchTournaments} style={{ background: '#f3f4f6', color: 'black', border: '1px solid #d1d5db', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' }}>
                            🔄 Refresh
                        </button>
                        <button onClick={() => navigate('/lobby')} style={{ background: '#6b7280', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' }}>
                            Înapoi
                        </button>
                    </div>
                </div>

                <div style={{ marginTop: '30px', padding: '20px', background: '#f3f4f6', borderRadius: '8px', border: '1px solid #d1d5db' }}>
                    <h3 style={{ marginTop: 0, color: '#374151' }}>Creează un turneu nou</h3>
                    <input
                        type="text"
                        placeholder="Numele turneului (ex: Cupa Regelui)"
                        value={newTournamentName}
                        onChange={(e) => setNewTournamentName(e.target.value)}
                        style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', marginBottom: '10px', boxSizing: 'border-box' }}
                    />
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                        <label style={{ alignSelf: 'center', fontWeight: '500' }}>Limită jucători:</label>
                        <select
                            value={maxPlayers}
                            onChange={(e) => setMaxPlayers(parseInt(e.target.value))}
                            style={{ padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                        >
                            <option value={4}>4 Jucători</option>
                            <option value={8}>8 Jucători</option>
                        </select>
                    </div>
                    <button onClick={handleCreateTournament} className="submit-button" style={{ width: '100%', background: '#2563eb' }}>
                        Creează Turneul
                    </button>
                </div>

                <div style={{ marginTop: '30px' }}>
                    <h3 style={{ color: '#374151' }}>Turnee disponibile (în așteptare)</h3>
                    {tournaments.length === 0 ? (
                        <p style={{ color: '#6b7280', textAlign: 'center' }}>Nu există turnee în acest moment. Fii primul care creează unul!</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            {tournaments.map(t => (
                                <div key={t.id} style={{ border: '1px solid #e5e7eb', padding: '15px', borderRadius: '8px', background: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <h4 style={{ margin: '0 0 5px 0', color: '#111827' }}>{t.name}</h4>
                                        <div style={{ fontSize: '13px', color: '#6b7280' }}>
                                            Creat de: <strong>{t.owner_name}</strong>
                                        </div>
                                        <div style={{ fontSize: '14px', marginTop: '8px', fontWeight: 'bold', color: parseInt(t.current_players) >= t.max_players ? '#ef4444' : '#22c55e' }}>
                                            Locuri: {t.current_players || 0} / {t.max_players}
                                        </div>
                                    </div>

                                    {/* 🔥 Logica pentru a afișa butonul de Bracket sau cel de Înscriere */}
                                    {t.status === 'active' ? (
                                        <button
                                            onClick={() => navigate(`/tournaments/${t.id}/bracket`)}
                                            style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                                        >
                                            Vezi Tabloul 👁️
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => handleJoinTournament(t.id)}
                                            disabled={parseInt(t.current_players) >= t.max_players}
                                            style={{ background: parseInt(t.current_players) >= t.max_players ? '#9ca3af' : '#eab308', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: parseInt(t.current_players) >= t.max_players ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}
                                        >
                                            {parseInt(t.current_players) >= t.max_players ? 'Se Generează...' : 'Înscrie-te'}
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