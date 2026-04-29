import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { socket } from '../socket';
import './Auth.css';

export const TournamentBracketPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [matches, setMatches] = useState<any[]>([]);
    const [user, setUser] = useState<{id: number, username: string} | null>(null);
    const [isWaiting, setIsWaiting] = useState(false);
    const [notification, setNotification] = useState<{message: string} | null>(null);

    useEffect(() => {
        if (!socket.connected) socket.connect();

        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            const parsedUser = JSON.parse(storedUser);
            setUser(parsedUser);
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
        const interval = setInterval(fetchBracket, 3000); // 🔄 Dăm refresh mai des să vedem dacă s-a generat runda 2!

        socket.on('waiting_for_tournament_opponent', (data) => {
            setIsWaiting(true);
            setNotification({ message: data.message });
        });

        socket.on('game_started', (data) => {
            setIsWaiting(false);
            setNotification(null);
            navigate('/game', { state: { ...data } });
        });

        return () => {
            clearInterval(interval);
            socket.off('waiting_for_tournament_opponent');
            socket.off('game_started');
        };
    }, [id, navigate]);

    const handlePlayMatch = (matchId: number) => {
        socket.emit('join_tournament_match', { matchId, userId: user?.id });
    };

    // 🔥 GRUPĂM MECIURILE PE RUNDE
    const groupedMatches = matches.reduce((acc: any, match) => {
        const round = match.tournament_round;
        if (!acc[round]) acc[round] = [];
        acc[round].push(match);
        return acc;
    }, {});

    // Căutăm dacă există un câștigător final (adică meciul din ultima rundă are 'finished')
    const roundsArray = Object.keys(groupedMatches).map(Number).sort((a, b) => b - a);
    const maxRound = roundsArray[0] || 1;
    const isTournamentOver = groupedMatches[maxRound]?.[0]?.status === 'finished' && groupedMatches[maxRound]?.length === 1;
    const finalChampion = isTournamentOver ? groupedMatches[maxRound][0].winner_name : null;

    return (
        <div className="login-container" style={{ paddingBottom: '50px' }}>
            {notification && (
                <div style={{
                    position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)',
                    backgroundColor: '#3b82f6', color: 'white', padding: '12px 24px', borderRadius: '8px', zIndex: 1000, fontWeight: 'bold'
                }}>
                    {notification.message}
                </div>
            )}

            <div className="login-card" style={{ maxWidth: '800px', width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h2 className="login-title" style={{ margin: 0 }}>🏆 Tabloul Campionatului</h2>
                    <button onClick={() => navigate('/tournaments')} style={{ background: '#6b7280', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' }}>
                        Înapoi
                    </button>
                </div>

                {isTournamentOver && (
                    <div style={{ textAlign: 'center', background: '#fef08a', padding: '20px', borderRadius: '12px', border: '2px solid #eab308', marginBottom: '30px' }}>
                        <h2 style={{ margin: 0, color: '#ca8a04', fontSize: '28px' }}>🎉 Turneu Încheiat! 🎉</h2>
                        <h3 style={{ margin: '10px 0 0 0', color: '#111827' }}>Campionul este: <strong>{finalChampion}</strong> 👑</h3>
                    </div>
                )}

                {matches.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '30px', color: '#6b7280', background: '#f9fafb', borderRadius: '8px' }}>
                        Turneul nu a început încă.
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>

                        {/* Randăm fiecare rundă în ordine inversă (de la Finală la Runda 1) */}
                        {roundsArray.map((roundNumber) => (
                            <div key={roundNumber} style={{ border: '1px solid #d1d5db', padding: '20px', borderRadius: '12px', background: '#f9fafb' }}>
                                <h3 style={{ margin: '0 0 15px 0', color: '#1d4ed8', borderBottom: '2px solid #bfdbfe', paddingBottom: '10px' }}>
                                    {groupedMatches[roundNumber].length === 1 && roundNumber > 1 ? '🏆 FINALA' : `⚔️ Runda ${roundNumber}`}
                                </h3>

                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px' }}>
                                    {groupedMatches[roundNumber].map((match: any) => {
                                        const isMyMatch = match.p1_id === user?.id || match.p2_id === user?.id;
                                        const isPending = match.status === 'pending';

                                        return (
                                            <div key={match.match_id} style={{
                                                flex: '1 1 300px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                border: isMyMatch ? '3px solid #3b82f6' : '1px solid #e5e7eb',
                                                padding: '15px', borderRadius: '8px',
                                                background: isMyMatch ? '#eff6ff' : 'white',
                                                boxShadow: isMyMatch ? '0 4px 6px rgba(59, 130, 246, 0.2)' : 'none'
                                            }}>
                                                <div>
                                                    <div style={{ fontSize: '18px', fontWeight: match.winner_name === match.p1_name ? 'bold' : 'normal', color: match.winner_name === match.p1_name ? '#22c55e' : 'black' }}>
                                                        {match.p1_name} {match.winner_name === match.p1_name && '👑'}
                                                    </div>
                                                    <div style={{ color: '#9ca3af', fontSize: '12px', margin: '4px 0' }}>VS</div>
                                                    <div style={{ fontSize: '18px', fontWeight: match.winner_name === match.p2_name ? 'bold' : 'normal', color: match.winner_name === match.p2_name ? '#22c55e' : 'black' }}>
                                                        {match.p2_name} {match.winner_name === match.p2_name && '👑'}
                                                    </div>
                                                </div>

                                                <div style={{ textAlign: 'right' }}>
                                                    {isMyMatch && isPending ? (
                                                        <button
                                                            onClick={() => handlePlayMatch(match.match_id)}
                                                            disabled={isWaiting}
                                                            style={{ background: isWaiting ? '#9ca3af' : '#22c55e', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: isWaiting ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}
                                                        >
                                                            {isWaiting ? 'Se așteaptă...' : 'JOACĂ'}
                                                        </button>
                                                    ) : (
                                                        <div style={{ fontSize: '14px', fontWeight: 'bold', color: match.status === 'finished' ? '#6b7280' : '#eab308' }}>
                                                            {match.status === 'finished' ? 'Finalizat' : 'În Așteptare'}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};