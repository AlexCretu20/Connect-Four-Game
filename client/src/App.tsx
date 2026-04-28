import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { LobbyPage } from './pages/LobbyPage';
import {GamePage} from './pages/GamePage';
import {LeaderboardPage} from "./pages/LeaderboardPage.tsx";
import { MatchHistoryPage } from './pages/MatchHistoryPage';
import { ReplayPage } from './pages/ReplayPage';
import { SpectatorPage } from './pages/SpectatorPage';


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

                <Route path="/history" element={<MatchHistoryPage />} />
                <Route path="/replay/:matchId" element={<ReplayPage />} />

                <Route path="/spectate/:roomId" element={<SpectatorPage />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;