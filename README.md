#  Connect Four Online - Multiplayer Real-time

O aplicație web de tip board game (Patru în Linie) care permite utilizatorilor să joace în timp real, să participe la turnee și să urmărească meciuri live.

## Tehnologii Utilizate

- **Frontend:** React, React Router, Socket.io-client, CSS (Minimalist Design).
- **Backend:** Node.js, Express, Socket.io, PostgreSQL.
- **Bază de date:** PostgreSQL.

## Schema Bazei de Date

Proiectul utilizează PostgreSQL pentru stocarea datelor. Mai jos sunt tabelele necesare:

```sql
-- 1. Tabelul Utilizatorilor
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabelul Turneelor
CREATE TABLE tournaments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    owner_id INTEGER REFERENCES users(id),
    max_players INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'active', 'finished'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Participanții la Turneu
CREATE TABLE tournament_participants (
    id SERIAL PRIMARY KEY,
    tournament_id INTEGER REFERENCES tournaments(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(tournament_id, user_id)
);

-- 4. Tabelul Meciurilor
CREATE TABLE matches (
    id SERIAL PRIMARY KEY,
    player1_id INTEGER REFERENCES users(id),
    player2_id INTEGER REFERENCES users(id),
    winner_id INTEGER REFERENCES users(id),
    total_moves INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'finished', 'draw'
    tournament_id INTEGER REFERENCES tournaments(id) ON DELETE CASCADE,
    tournament_round INTEGER DEFAULT 0,
    first_move_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Tabelul Mutărilor (pentru sistemul de Replay)
CREATE TABLE moves (
    id SERIAL PRIMARY KEY,
    match_id INTEGER REFERENCES matches(id) ON DELETE CASCADE,
    move_order INTEGER NOT NULL,
    col_index INTEGER NOT NULL,
    player_id INTEGER REFERENCES users(id),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
