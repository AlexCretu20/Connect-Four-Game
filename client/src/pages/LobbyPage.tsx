import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { socket } from '../socket';
import './Auth.css';

export const LobbyPage = () => {
    const navigate = useNavigate();
    const [isSearching, setIsSearching] = useState(false);

    // REPARAȚIA 1: Am adăugat "id: number" în definiția tipului de date
    const [user, setUser] = useState<{id: number, username: string} | null>(null);

    const [error, setError] = useState('');
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [liveMatches, setLiveMatches] = useState<any[]>([]);

    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [incomingChallenge, setIncomingChallenge] = useState<{fromId: number, fromName: string} | null>(null);
    const [allUsers, setAllUsers] = useState<any[]>([]);

    const [notification, setNotification] = useState<{message: string, type: 'success' | 'error' | 'info'} | null>(null);

    const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
        setNotification({ message, type });
        setTimeout(() => {
            setNotification(null);
        }, 3000);
    };

    const fetchLiveMatches = () => {
        fetch('http://localhost:5000/api/matchesLive')
            .then(res => {
                if (!res.ok) throw new Error("Nu am putut aduce meciurile");
                return res.json();
            })
            .then(data => setLiveMatches(data))
            .catch(err => console.error("Eroare meciuri live:", err));
    };

    useEffect(() => {
        fetchLiveMatches();
        const interval = setInterval(fetchLiveMatches, 5000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        // 1. Luăm userul din memorie
        const storedUser = localStorage.getItem('user');

        // 2. Dacă există, îl despachetăm și îl folosim
        if (storedUser) {
            const parsedUser = JSON.parse(storedUser); // AICI este definit parsedUser!
            setUser(parsedUser);

            // Trimitem ID-ul către server ca să știe că suntem online
            socket.emit('user_online', parsedUser.id);

            fetch(`http://localhost:5000/api/users?currentUserId=${parsedUser.id}`)
                .then(res => res.json())
                .then(data => setAllUsers(data))
                .catch(err => console.error(err));
        }

        socket.on('waiting_for_opponent', (data) => {
            console.log(data.message);
            setIsSearching(true);
        });

        socket.on('game_started', (data) => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            setIsSearching(false);
            navigate('/game', {
                state: {
                    roomId: data.roomId,
                    startingPlayer: data.startingPlayer,
                    yourPlayerId: data.yourPlayerId,
                    initialBoard: data.initialBoard
                }
            });
        });

        socket.on('challenge_failed', (data) => {
            setError(data.message);
        });

        socket.on('incoming_challenge', (data) => {
            setIncomingChallenge(data);
        });

        socket.on('challenge_declined', (data) => {
            showNotification(`Jucătorul ${data.responderName} a refuzat provocarea ta.`, 'error');
        });

        return () => {
            socket.off('waiting_for_opponent');
            socket.off('game_started');
            socket.off('challenge_failed');
            socket.off('incoming_challenge');
            socket.off('challenge_declined');
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [navigate]);

    const handleFindMatch = () => {
        const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
        const userId = storedUser.id;

        setError('');
        setIsSearching(true);
        socket.emit('find_match', { userId });

        timeoutRef.current = setTimeout(() => {
            setIsSearching(false);
            setError('Căutarea a expirat. Nu a fost găsit niciun adversar online.');
        }, 30000);
    };

    const handleSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setSearchQuery(val);
        if (val.length > 2) {
            const res = await fetch(`http://localhost:5000/api/users/search?q=${val}&currentUserId=${user?.id}`);
            const data = await res.json();

            const filtered = data.filter((u: any) => u.id !== user?.id);
            setSearchResults(filtered);
        } else {
            setSearchResults([]);
        }
    };

    const sendChallenge = (targetId: number) => {
        socket.emit('send_challenge', {
            fromId: user?.id,
            fromName: user?.username,
            toId: targetId
        });


        showNotification('Provocare trimisă! Așteptăm răspunsul...', 'success');

        setSearchQuery(''); // Curățăm bara după ce trimitem provocarea
        setSearchResults([]);
    };

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-app)' }}>

            {notification && (
                <div style={{
                    position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)',
                    backgroundColor: 'white', border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    padding: '15px 30px', borderRadius: '4px', zIndex: 1000,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontWeight: 'bold'
                }}>
                    {notification.message}
                </div>
            )}
            <div style={{ padding: '40px 20px', textAlign: 'left', maxWidth: '1250px', margin: '0 auto' }}>
                <div style={{ textTransform: 'uppercase', letterSpacing: '3px', color: '#6b7280', fontSize: '12px', marginBottom: '10px' }}>
                    Patru / In / Linie
                </div>
                <h1 style={{ fontSize: '42px', fontWeight: '900', margin: 0 }}>Sala de Asteptare</h1>
            </div>

            <div className="lobby-grid">

                {/* COLOANA 1: Optiuni Profil */}
                <div className="minimal-card">
                    <div className="section-title">Contul meu</div>
                    <div style={{ marginBottom: '20px' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Utilizator: </span>
                        <strong style={{ fontSize: '18px' }}>{user?.username}</strong>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <button onClick={handleFindMatch} className="btn-minimal btn-primary">
                            {isSearching ? 'Cautare adversar...' : 'Meci Rapid 1v1'}
                        </button>
                        <button onClick={() => navigate('/tournaments')} className="btn-minimal btn-outline">Turnee Active</button>
                        <button onClick={() => navigate('/leaderboard')} className="btn-minimal btn-outline">Clasament Global</button>
                        <button onClick={() => navigate('/history')} className="btn-minimal btn-outline">Istoric Meciuri</button>
                    </div>
                </div>

                {/* COLOANA 2: Jucatori Online si Provocari */}
                <div className="minimal-card">
                    <div className="section-title">Provocare Directa</div>

                    {incomingChallenge && (
                        <div style={{ background: '#fef2f2', padding: '15px', borderRadius: '4px', marginBottom: '20px', border: '1px solid #fecaca' }}>
                            <div style={{ marginBottom: '10px', fontSize: '14px' }}>
                                Jucatorul <strong>{incomingChallenge.fromName}</strong> te-a provocat.
                            </div>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button onClick={() => socket.emit('accept_challenge', { challengerId: incomingChallenge.fromId, myId: user?.id })} className="btn-minimal btn-primary" style={{ padding: '8px' }}>Accepta</button>
                                <button
                                    onClick={() => {
                                        // 🔥 PASUL LIPSA: Trimitem evenimentul de refuz către server
                                        socket.emit('decline_challenge', {
                                            challengerId: incomingChallenge.fromId,
                                            responderName: user?.username
                                        });

                                        // Ștergem provocarea de pe ecranul nostru
                                        setIncomingChallenge(null);
                                    }}
                                    className="btn-minimal btn-danger"
                                    style={{ padding: '8px' }}
                                >
                                    Refuza
                                </button>
                            </div>
                        </div>
                    )}

                    <input
                        type="text"
                        placeholder="Cauta jucator..."
                        value={searchQuery}
                        onChange={handleSearch}
                        className="search-input"
                    />

                    <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                        {(searchQuery.length > 2 ? searchResults : allUsers).map((u) => (
                            <div key={u.id} className="list-row">
                                <span style={{ fontWeight: '500' }}>{u.username}</span>
                                <button onClick={() => sendChallenge(u.id)} className="btn-minimal btn-outline" style={{ width: 'auto', padding: '6px 12px', fontSize: '12px' }}>
                                    Provoaca
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* COLOANA 3: Meciuri in desfasurare */}
                <div className="minimal-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <div className="section-title" style={{ marginBottom: 0, border: 'none' }}>Meciuri Live</div>
                        <button
                            onClick={fetchLiveMatches}
                            className="btn-minimal btn-outline"
                            style={{
                                width: 'auto',
                                padding: '5px 12px',
                                fontSize: '11px',
                                backgroundColor: '#f3f4f6',
                                border: '1px solid #d1d5db'
                            }}
                        >
                            Refresh
                        </button>
                    </div>

                    <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                        {liveMatches.length === 0 ? (
                            <p style={{ color: '#9ca3af', fontSize: '13px', textAlign: 'center', marginTop: '20px' }}>Nu sunt meciuri active.</p>
                        ) : (
                            liveMatches.map((m) => (
                                <div key={m.roomId} className="list-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '10px' }}>
                                    <div style={{ fontSize: '14px' }}>
                                        <strong>{m.p1Name}</strong> vs <strong>{m.p2Name}</strong>
                                    </div>
                                    <button onClick={() => navigate(`/spectate/${m.roomId}`)} className="btn-minimal btn-danger" style={{ padding: '6px', fontSize: '11px' }}>
                                        Urmareste Meciul
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};