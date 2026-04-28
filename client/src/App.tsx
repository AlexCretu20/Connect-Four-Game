import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { LobbyPage } from './pages/LobbyPage';
import {GamePage} from './pages/GamePage';
import {LeaderboardPage} from "./pages/LeaderboardPage.tsx";



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

                <Route path="/leaderboard" element={<LeaderboardPage />} />

                <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;