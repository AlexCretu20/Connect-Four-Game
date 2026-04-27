import React, { useState } from 'react';
import { useNavigate} from 'react-router-dom';
import './Auth.css';

export const RegisterPage = () => {
    const navigate = useNavigate();

    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const [error, setError] = useState('');
    const [success, setSuccess] = useState(''); // <-- Am adăugat starea pentru succes
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess(''); // Curățăm succesul anterior dacă există
        setIsLoading(true);

        try {
            const response = await fetch('http://localhost:5000/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Eroare la crearea contului');
            }

            // Setăm mesajul vizual în loc de alert()
            setSuccess('Înregistrare cu succes! Te redirecționăm...');

            // Așteptăm 2 secunde ca utilizatorul să vadă mesajul, apoi îl mutăm
            setTimeout(() => {
                navigate('/login');
            }, 2000);

        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <h2 className="login-title">Creare Cont</h2>

                {/* Afișăm eroarea cu roșu dacă există */}
                {error && <div className="error-message">{error}</div>}

                {/* Afișăm succesul cu verde dacă există */}
                {success && <div className="success-message">{success}</div>}

                <form onSubmit={handleSubmit} className="login-form">
                    <div className="form-group">
                        <label>Username</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                            placeholder="Alege un nume de utilizator"
                            disabled={success !== ''} // Dezactivăm inputurile după succes
                        />
                    </div>

                    <div className="form-group">
                        <label>Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            placeholder="adresa@email.com"
                            disabled={success !== ''}
                        />
                    </div>

                    <div className="form-group">
                        <label>Parolă</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            placeholder="Introdu o parolă sigură"
                            disabled={success !== ''}
                        />
                    </div>

                    <button type="submit" disabled={isLoading || success !== ''} className="submit-button">
                        {isLoading ? 'Se creează contul...' : 'Înregistrează-te'}
                    </button>
                </form>

                <p className="toggle-text" onClick={() => navigate('/login')}>
                    Ai deja cont? Loghează-te aici.
                </p>
            </div>
        </div>
    );
};