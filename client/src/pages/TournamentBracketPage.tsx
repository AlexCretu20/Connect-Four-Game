import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { socket } from '../socket'; // 🔥 IMPORTĂM SOCKET-UL
import './Auth.css';

export const TournamentBracketPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [matches, setMatches] = useState<any[]>([]);
    const [user, setUser] = useState<{id: number, username: string} | null>(null);
    const [isWaiting, setIsWaiting] = useState(false); // Stare pentru a arăta că așteptăm adversarul

    // Mesaj pop-up frumos
    const [notification, setNotification] = useState<{message: string} | null>(null);

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            const parsedUser = JSON.parse(storedUser);
            setUser(parsedUser);
            // Ne asigurăm că serverul știe cine suntem
            socket.emit('user_online', parsedUser.id);
        }

        const fetchBracket = async () => {
            try {
                const res = await fetch(`http://localhost:5000/api/tournament/${id}/bracket`);
                const data = await res.json();
                setMatches(data);
            } catch (err) {
                console.error("Eroare la aducerea meciurilor:", err);
            }
        };

        fetchBracket();
        const interval = setInterval(fetchBracket, 5000);

        // 🔥 ASCULTĂM EVENIMENTELE PENTRU START MECI
        socket.on('waiting_for_tournament_opponent', (data) => {
            setIsWaiting(true);
            setNotification({ message: data.message });
        });

        socket.on('game_started', (data) => {
            setIsWaiting(false);
            setNotification(null);
            // ZBURĂM CĂTRE PAGINA DE JOC!
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
            clearInterval(interval);
            socket.off('waiting_for_tournament_opponent');
            socket.off('game_started');
        };
    }, [id, navigate]);

    const handlePlayMatch = (matchId: number) => {
        console.log(`[FRONTEND] Apăsat buton Joacă! Trimit matchId: ${matchId}, userId: ${user?.id}`);
        socket.emit('join_tournament_match', { matchId, userId: user?.id });
    };

    return (
        <div className="login-container" style={{ paddingBottom: '50px' }}>

            {/* Pop-up de notificare */}
            {notification && (
                <div style={{
                    position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)',
                    backgroundColor: '#3b82f6', color: 'white', padding: '12px 24px', borderRadius: '8px', zIndex: 1000, fontWeight: 'bold'
                }}>
                    {notification.message}
                </div>
            )}

            <div className="login-card" style={{ maxWidth: '700px', width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h2 className="login-title" style={{ margin: 0 }}> Tabloul Turneului</h2>
                    <button onClick={() => navigate('/tournaments')} style={{ background: '#6b7280', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' }}>
                        Înapoi
                    </button>
                </div>

                {matches.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '30px', color: '#6b7280', background: '#f9fafb', borderRadius: '8px' }}>
                        Turneul nu a început încă (se așteaptă jucători).
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        <h3 style={{ color: '#374151', borderBottom: '2px solid #e5e7eb', paddingBottom: '5px' }}>Runda 1</h3>

                        {matches.map((match) => {
                            // Verificăm dacă utilizatorul nostru joacă în acest meci
                            const isMyMatch = match.p1_id === user?.id || match.p2_id === user?.id;
                            const isPending = match.status === 'pending';

                            return (
                                <div key={match.match_id} style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    border: isMyMatch ? '2px solid #3b82f6' : '2px solid #e5e7eb',
                                    padding: '15px', borderRadius: '8px',
                                    background: isMyMatch ? '#eff6ff' : 'white'
                                }}>
                                    <div style={{ fontSize: '18px', display: 'flex', gap: '15px', alignItems: 'center' }}>
                                        <span style={{ fontWeight: match.winner_name === match.p1_name ? 'bold' : 'normal', color: match.winner_name === match.p1_name ? '#22c55e' : 'black' }}>
                                            {match.p1_name}
                                        </span>
                                        <span style={{ color: '#9ca3af', fontSize: '14px' }}>VS</span>
                                        <span style={{ fontWeight: match.winner_name === match.p2_name ? 'bold' : 'normal', color: match.winner_name === match.p2_name ? '#22c55e' : 'black' }}>
                                            {match.p2_name}
                                        </span>
                                    </div>

                                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                        <div style={{ fontSize: '14px', fontWeight: 'bold', color: match.status === 'finished' ? '#6b7280' : '#eab308' }}>
                                            {match.status === 'finished' ? `Câștigător: ${match.winner_name}` : 'În Așteptare'}
                                        </div>

                                        {/* 🔥 Butonul de Joacă apare DOAR dacă meciul tău nu s-a jucat încă! */}
                                        {isMyMatch && isPending && (
                                            <button
                                                onClick={() => handlePlayMatch(match.match_id)}

                                                disabled={isWaiting}
                                                style={{
                                                    background: isWaiting ? '#9ca3af' : '#22c55e',
                                                    color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px',
                                                    cursor: isWaiting ? 'not-allowed' : 'pointer', fontWeight: 'bold'
                                                }}
                                            >
                                                {isWaiting ? 'Aștepți...' : 'Joacă '}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};