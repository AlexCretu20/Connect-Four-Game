import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './Auth.css';

export const RegisterPage = () => {
    const navigate = useNavigate();

    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
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

            setSuccess('Inregistrare cu succes! Te redirectionam...');

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
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-app)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <div className="minimal-card" style={{ maxWidth: '400px', width: '100%', padding: '40px' }}>

                <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                    <div className="section-title" style={{ border: 'none', marginBottom: '10px' }}>Patru In Linie</div>
                    <h1 style={{ fontSize: '28px', fontWeight: '900', margin: 0 }}>Creare Cont</h1>
                </div>

                {error && <div style={{ color: '#ef4444', fontSize: '13px', marginBottom: '15px', textAlign: 'center', fontWeight: 'bold' }}>{error}</div>}
                {success && <div style={{ color: '#10b981', fontSize: '13px', marginBottom: '15px', textAlign: 'center', fontWeight: 'bold' }}>{success}</div>}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>Username</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                            placeholder="Alege un nume"
                            disabled={success !== ''}
                            className="search-input"
                            style={{ marginBottom: 0 }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            placeholder="adresa@email.com"
                            disabled={success !== ''}
                            className="search-input"
                            style={{ marginBottom: 0 }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>Parola</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            placeholder="Introdu o parola sigura"
                            disabled={success !== ''}
                            className="search-input"
                            style={{ marginBottom: 0 }}
                        />
                    </div>

                    <button type="submit" disabled={isLoading || success !== ''} className="btn-minimal btn-primary" style={{ marginTop: '10px' }}>
                        {isLoading ? 'Se creeaza contul...' : 'Inregistreaza-te'}
                    </button>
                </form>

                <div style={{ textAlign: 'center', marginTop: '25px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                    Ai deja cont? <Link to="/login" style={{ color: 'var(--text-primary)', fontWeight: 'bold', textDecoration: 'none', borderBottom: '1px solid var(--text-primary)' }}>Logheaza-te aici.</Link>
                </div>
            </div>
        </div>
    );
};