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
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-app)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <div className="minimal-card" style={{ maxWidth: '400px', width: '100%', padding: '40px' }}>

                <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                    <div className="section-title" style={{ border: 'none', marginBottom: '10px' }}>Patru In Linie</div>
                    <h1 style={{ fontSize: '28px', fontWeight: '900', margin: 0 }}>Autentificare</h1>
                </div>

                {error && <div style={{ color: '#ef4444', fontSize: '13px', marginBottom: '15px', textAlign: 'center', fontWeight: 'bold' }}>{error}</div>}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                            Email sau Username
                        </label>
                        <input
                            type="text"
                            value={identifier}
                            onChange={(e) => setIdentifier(e.target.value)}
                            required
                            placeholder="ex: jucator1"
                            className="search-input"
                            style={{ marginBottom: 0 }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                            Parola
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            placeholder="Introdu parola"
                            className="search-input"
                            style={{ marginBottom: 0 }}
                        />
                    </div>

                    <button type="submit" disabled={isLoading} className="btn-minimal btn-primary" style={{ marginTop: '10px' }}>
                        {isLoading ? 'Se verifica...' : 'Logheaza-te'}
                    </button>
                </form>

                <div style={{ textAlign: 'center', marginTop: '25px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                    Nu ai cont? <Link to="/register" style={{ color: 'var(--text-primary)', fontWeight: 'bold', textDecoration: 'none', borderBottom: '1px solid var(--text-primary)' }}>Inregistreaza-te aici.</Link>
                </div>
            </div>
        </div>
    );
};