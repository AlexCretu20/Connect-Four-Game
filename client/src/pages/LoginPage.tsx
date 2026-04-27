import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { socket } from '../socket';
import './Auth.css';

export const LoginPage = () => {
    const navigate = useNavigate();

    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');

    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const response = await fetch('http://localhost:5000/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ identifier, password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Date de autentificare incorecte');
            }

            // Salvăm sesiunea și pornim socket-ul
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));

            socket.auth = { token: data.token };
            socket.connect();

            navigate('/lobby');

        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <h2 className="login-title">Autentificare</h2>

                {error && <div className="error-message">{error}</div>}

                <form onSubmit={handleSubmit} className="login-form">
                    <div className="form-group">
                        <label>Email sau Username</label>
                        <input
                            type="text"
                            value={identifier}
                            onChange={(e) => setIdentifier(e.target.value)}
                            required
                            placeholder="ex: jucator1"
                        />
                    </div>

                    <div className="form-group">
                        <label>Parolă</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            placeholder="Introdu parola"
                        />
                    </div>

                    <button type="submit" disabled={isLoading} className="submit-button">
                        {isLoading ? 'Se verifică...' : 'Loghează-te'}
                    </button>
                </form>

                <p className="toggle-text">
                    Nu ai cont? <Link to="/register">Înregistrează-te aici.</Link>
                </p>
            </div>
        </div>
    );
};