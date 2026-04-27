import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';

// Păstrăm placeholderele pentru restul paginilor deocamdată
const LobbyPage = () => <div style={{ padding: 20 }}><h1>Sala de Așteptare (Lobby)</h1></div>;
const GamePage = () => <div style={{ padding: 20 }}><h1>Tabla de Joc</h1></div>;

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Navigate to="/login" replace />} />

                {/* Rutele noastre de autentificare */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />

                <Route path="/lobby" element={<LobbyPage />} />
                <Route path="/game" element={<GamePage />} />

                <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;