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
            showNotification(`Jucătorul ${data.responderName} a refuzat provocarea ta. 😢`, 'error');
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

        // 🔥 Aici am scos alert() și am pus notificarea frumoasă verde ('success')
        showNotification('Provocare trimisă! Așteptăm răspunsul...', 'success');

        setSearchQuery(''); // Curățăm bara după ce trimitem provocarea
        setSearchResults([]);
    };

    return (
        <div className="login-container" style={{ paddingBottom: '50px' }}>
            <div className="login-card" style={{ textAlign: 'center', maxWidth: '500px', width: '100%' }}>
                <h2 className="login-title">Sala de Așteptare</h2>

                {notification && (
                    <div style={{
                        position: 'fixed',
                        top: '20px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        backgroundColor: notification.type === 'success' ? '#22c55e' : notification.type === 'error' ? '#ef4444' : '#3b82f6',
                        color: 'white',
                        padding: '12px 24px',
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        fontWeight: 'bold',
                        zIndex: 1000,
                        animation: 'fadeInDown 0.3s ease-out'
                    }}>
                        {notification.message}
                    </div>
                )}

                {incomingChallenge && (
                    <div style={{ background: '#fef08a', padding: '15px', borderRadius: '8px', marginBottom: '20px', border: '2px solid #eab308' }}>
                        <h3> Provocare!</h3>
                        <p><strong>{incomingChallenge.fromName}</strong> te-a provocat la un meci!</p>
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                            <button onClick={() => {
                                socket.emit('accept_challenge', { challengerId: incomingChallenge.fromId, myId: user?.id });
                                setIncomingChallenge(null);
                            }} style={{ background: '#22c55e', color: 'white', padding: '8px 16px', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Acceptă</button>

                            <button onClick={() => {
                                // 🔥 NOU: Îi spunem serverului că am refuzat
                                socket.emit('decline_challenge', {
                                    challengerId: incomingChallenge.fromId,
                                    responderName: user?.username
                                });
                                setIncomingChallenge(null);
                            }} style={{ background: '#ef4444', color: 'white', padding: '8px 16px', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
                                Refuză
                            </button>
                        </div>
                    </div>
                )}

                {user && !isSearching && (
                    <p style={{ marginBottom: '24px', fontSize: '16px', color: '#4a4a4a' }}>
                        Salut, <strong>{user.username}</strong>!
                    </p>
                )}

                <button onClick={() => navigate('/tournaments')} className="submit-button" style={{ marginTop: '12px', backgroundColor: '#eab308', width: '100%', color: 'black' }}>
                    Mergi la Turnee
                </button>

                {error && <div className="error-message" style={{ marginBottom: '20px' }}>{error}</div>}

                {isSearching ? (
                    <div className="searching-box">
                        <p>Se caută un adversar...</p>
                        <small>Așteaptă maxim 30 de secunde.</small>
                    </div>
                ) : (
                    <button onClick={handleFindMatch} className="submit-button" style={{ width: '100%' }}>
                        {error ? 'Reîncearcă căutarea' : 'Caută un meci (1v1)'}
                    </button>
                )}

                <button
                    onClick={() => navigate('/leaderboard')}
                    className="submit-button"
                    style={{ marginTop: '12px', backgroundColor: '#6b7280', width: '100%' }}
                >
                    Vezi Clasamentul
                </button>

                <button
                    onClick={() => navigate('/history')}
                    className="submit-button"
                    style={{ marginTop: '12px', backgroundColor: '#4b5563', width: '100%' }}
                >
                    Istoric Meciuri
                </button>

                {/* ==================================================== */}
                {/* SECȚIUNEA PENTRU CĂUTARE ȘI PROVOCARE                */}
                {/* ==================================================== */}
                <div style={{ marginTop: '30px', borderTop: '2px solid #e5e7eb', paddingTop: '20px' }}>
                    <h3 style={{ color: '#2563eb', margin: 0, marginBottom: '15px' }}>🔍 Provoacă un Jucător</h3>
                    <input
                        type="text"
                        placeholder="Caută după nume..."
                        value={searchQuery}
                        onChange={handleSearch}
                        style={{
                            width: '100%', padding: '10px', borderRadius: '8px',
                            border: '1px solid #d1d5db', marginBottom: '15px', boxSizing: 'border-box'
                        }}
                    />

                    {/* Dacă scrii ceva, arată searchResults. Dacă nu, arată allUsers */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '250px', overflowY: 'auto' }}>
                        {(searchQuery.length > 2 ? searchResults : allUsers).map((u) => (
                            <div key={u.id} style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                background: '#f9fafb', padding: '10px', borderRadius: '6px', border: '1px solid #e5e7eb'
                            }}>
                                <span style={{ fontWeight: '500' }}>{u.username}</span>
                                <button
                                    onClick={() => sendChallenge(u.id)}
                                    style={{ background: '#2563eb', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}
                                >
                                    Provoacă ⚔️
                                </button>
                            </div>
                        ))}

                        {searchQuery.length > 2 && searchResults.length === 0 && (
                            <p style={{ color: '#6b7280', fontSize: '14px' }}>Nu a fost găsit niciun jucător cu acest nume.</p>
                        )}
                    </div>
                </div>

                {/* ==================================================== */}
                {/* SECȚIUNEA PENTRU MECIURI LIVE (SPECTATOR MODE)       */}
                {/* ==================================================== */}
                <div style={{ marginTop: '30px', borderTop: '2px solid #e5e7eb', paddingTop: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                        <h3 style={{ color: '#ef4444', margin: 0 }}>🔴 Meciuri Live</h3>
                        <button
                            onClick={fetchLiveMatches}
                            style={{
                                padding: '6px 12px',
                                fontSize: '12px',
                                cursor: 'pointer',
                                backgroundColor: '#f3f4f6',
                                border: '1px solid #d1d5db',
                                borderRadius: '4px'
                            }}
                        >
                            🔄 Refresh
                        </button>
                    </div>

                    {liveMatches.length === 0 ? (
                        <div style={{ padding: '20px', background: '#f9fafb', border: '1px dashed #d1d5db', borderRadius: '8px', textAlign: 'center', color: '#6b7280' }}>
                            Nu se joacă niciun meci momentan.<br/>Fii tu primul!
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {liveMatches.map((match) => (
                                <div key={match.roomId} style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    background: '#ffffff', padding: '12px', borderRadius: '8px',
                                    border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                                    textAlign: 'left'
                                }}>
                                    <div>
                                        <div style={{ fontSize: '15px' }}>
                                            <strong>{match.p1Name}</strong> <span style={{color: '#9ca3af', fontSize: '13px'}}>vs</span> <strong>{match.p2Name}</strong>
                                        </div>
                                        <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                                            Mutări jucate: {match.moveCount}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => navigate(`/spectate/${match.roomId}`)}
                                        style={{
                                            background: '#ef4444',
                                            color: 'white',
                                            border: 'none',
                                            padding: '8px 16px',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            fontWeight: 'bold',
                                            fontSize: '13px'
                                        }}
                                    >
                                        Watch
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};