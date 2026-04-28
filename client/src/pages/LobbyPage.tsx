import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { socket } from '../socket';
import './Auth.css';

export const LobbyPage = () => {
    const navigate = useNavigate();
    const [isSearching, setIsSearching] = useState(false);
    const [user, setUser] = useState<{username: string} | null>(null);
    const [error, setError] = useState(''); // Stare pentru timeout/erori

    // Folosim un ref pentru a păstra ID-ul timerului între randări
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
            // DACĂ GĂSIM MECI: Oprim timerul imediat!
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }

            setIsSearching(false);
            navigate('/game', {
                state: {
                    roomId: data.roomId,
                    startingPlayer: data.startingPlayer,
                    yourPlayerId: data.yourPlayerId
                }
            });
        });

        return () => {
            socket.off('waiting_for_opponent');
            socket.off('game_started');
            // Curățăm timerul dacă utilizatorul pleacă de pe pagină
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [navigate]);

    const handleFindMatch = () => {
        const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
        const userId = storedUser.id;

        setError('');
        setIsSearching(true);
        socket.emit('find_match', { userId });

        // Pornim un timer de 30 de secunde (30000 ms)
        timeoutRef.current = setTimeout(() => {
            setIsSearching(false);
            setError('Căutarea a expirat. Nu a fost găsit niciun adversar online.');

            // Opțional: Putem anunța și serverul că acest jucător nu mai caută
            // socket.emit('cancel_search');
        }, 30000);
    };

    return (
        <div className="login-container">
            <div className="login-card" style={{ textAlign: 'center' }}>
                <h2 className="login-title">Sala de Așteptare</h2>

                {user && !isSearching && (
                    <p style={{ marginBottom: '24px', fontSize: '16px', color: '#4a4a4a' }}>
                        Salut, <strong>{user.username}</strong>!
                    </p>
                )}

                {/* Mesaj de eroare/timeout */}
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
                    style={{ marginTop: '12px', backgroundColor: '#6b7280' }} // Un gri pentru contrast
                >
                    Vezi Clasamentul
                </button>

            </div>
        </div>
    );
};