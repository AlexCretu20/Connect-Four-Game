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
        const interval = setInterval(fetchBracket, 3000);

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

    const groupedMatches = matches.reduce((acc: any, match) => {
        const round = match.tournament_round;
        if (!acc[round]) acc[round] = [];
        acc[round].push(match);
        return acc;
    }, {});

    const roundsArray = Object.keys(groupedMatches).map(Number).sort((a, b) => b - a);
    const maxRound = roundsArray[0] || 1;
    const isTournamentOver = groupedMatches[maxRound]?.[0]?.status === 'finished' && groupedMatches[maxRound]?.length === 1;
    const finalChampion = isTournamentOver ? groupedMatches[maxRound][0].winner_name : null;

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

            <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                    <div>
                        <div className="section-title" style={{ marginBottom: '5px', border: 'none', padding: 0 }}>Desfasurare</div>
                        <h1 style={{ fontSize: '32px', fontWeight: '900', margin: 0 }}>Tablou Campionat</h1>
                    </div>
                    <button onClick={() => navigate('/tournaments')} className="btn-minimal btn-outline" style={{ width: 'auto', padding: '10px 20px' }}>
                        Inapoi la Turnee
                    </button>
                </div>

                {isTournamentOver && (
                    <div className="minimal-card" style={{ textAlign: 'center', marginBottom: '30px', background: '#f9fafb', borderColor: '#d1d5db' }}>
                        <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--text-secondary)', marginBottom: '10px' }}>Turneu Finalizat</div>
                        <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>Campion: {finalChampion}</h2>
                    </div>
                )}

                {matches.length === 0 ? (
                    <div className="minimal-card" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)' }}>
                        Turneul nu a inceput inca.
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                        {roundsArray.map((roundNumber) => (
                            <div key={roundNumber} className="minimal-card" style={{ padding: '25px', background: 'white' }}>
                                <div className="section-title" style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: 'bold', borderBottom: '1px solid var(--border-color)' }}>
                                    {groupedMatches[roundNumber].length === 1 && roundNumber > 1 ? 'Finala' : `Runda ${roundNumber}`}
                                </div>

                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
                                    {groupedMatches[roundNumber].map((match: any) => {
                                        const isMyMatch = match.p1_id === user?.id || match.p2_id === user?.id;
                                        const isPending = match.status === 'pending';

                                        // Stil minimalist pentru meciurile tale versus celelalte
                                        const cardBg = isMyMatch ? '#f8fafc' : 'white';
                                        const cardBorder = isMyMatch ? '1px solid var(--text-primary)' : '1px solid var(--border-color)';

                                        return (
                                            <div key={match.match_id} style={{
                                                flex: '1 1 300px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                border: cardBorder, padding: '20px', borderRadius: '4px', background: cardBg
                                            }}>
                                                <div>
                                                    <div style={{ fontSize: '16px', fontWeight: match.winner_name === match.p1_name ? 'bold' : 'normal', color: match.winner_name === match.p1_name ? '#16a34a' : 'var(--text-primary)' }}>
                                                        {match.p1_name} {match.winner_name === match.p1_name && '(Câștigător)'}
                                                    </div>
                                                    <div style={{ color: 'var(--text-secondary)', fontSize: '11px', margin: '6px 0', textTransform: 'uppercase', letterSpacing: '1px' }}>vs</div>
                                                    <div style={{ fontSize: '16px', fontWeight: match.winner_name === match.p2_name ? 'bold' : 'normal', color: match.winner_name === match.p2_name ? '#16a34a' : 'var(--text-primary)' }}>
                                                        {match.p2_name} {match.winner_name === match.p2_name && '(Câștigător)'}
                                                    </div>
                                                </div>

                                                <div style={{ textAlign: 'right' }}>
                                                    {isMyMatch && isPending ? (
                                                        <button
                                                            onClick={() => handlePlayMatch(match.match_id)}
                                                            disabled={isWaiting}
                                                            className={isWaiting ? "btn-minimal btn-outline" : "btn-minimal btn-primary"}
                                                            style={{ padding: '10px 20px', width: 'auto' }}
                                                        >
                                                            {isWaiting ? 'Asteapta...' : 'Joaca'}
                                                        </button>
                                                    ) : (
                                                        <div style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', color: match.status === 'finished' ? 'var(--text-secondary)' : '#eab308' }}>
                                                            {match.status === 'finished' ? 'Finalizat' : 'In Asteptare'}
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