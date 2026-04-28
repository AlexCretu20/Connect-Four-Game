import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { socket } from '../socket';
import './Auth.css';

export const LobbyPage = () => {
    const navigate = useNavigate();
    const [isSearching, setIsSearching] = useState(false);
    const [user, setUser] = useState<{username: string} | null>(null);
    const [error, setError] = useState('');
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [liveMatches, setLiveMatches] = useState<any[]>([]);

    // fct pt spectator mode
    const fetchLiveMatches = () => {
        fetch('http://localhost:5000/api/matchesLive')
            .then(res => {
                if (!res.ok) throw new Error("Nu am putut aduce meciurile");
                return res.json();
            })
            .then(data => setLiveMatches(data))
            .catch(err => console.error("Eroare meciuri live:", err));
    };

    // Actualizare la 5 s ca spectatorul sa nu piarda nimic
    useEffect(() => {
        fetchLiveMatches();
        const interval = setInterval(fetchLiveMatches, 5000);
        return () => clearInterval(interval);
    }, []);


    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
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

        return () => {
            socket.off('waiting_for_opponent');
            socket.off('game_started');
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

    return (
        <div className="login-container" style={{ paddingBottom: '50px' }}>
            <div className="login-card" style={{ textAlign: 'center', maxWidth: '500px', width: '100%' }}>
                <h2 className="login-title">Sala de Așteptare</h2>

                {user && !isSearching && (
                    <p style={{ marginBottom: '24px', fontSize: '16px', color: '#4a4a4a' }}>
                        Salut, <strong>{user.username}</strong>!
                    </p>
                )}

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
                {/* SECȚIUNEA NOUĂ PENTRU MECIURI LIVE (SPECTATOR MODE)  */}
                {/* ==================================================== */}
                <div style={{ marginTop: '40px', borderTop: '2px solid #e5e7eb', paddingTop: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                        <h3 style={{ color: '#ef4444', margin: 0 }}> Meciuri Live</h3>
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