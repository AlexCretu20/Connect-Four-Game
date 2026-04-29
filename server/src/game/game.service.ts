import { pool } from '../db/db';

export async function determineFirstMover(
    player1Id: number,
    player2Id: number
): Promise<1 | 2> {
    // Cauta ultimul meci dintre cei doi, indiferent de ordine
    const result = await pool.query(
        `SELECT first_move_id FROM matches
         WHERE (player1_id = $1 AND player2_id = $2)
            OR (player1_id = $2 AND player2_id = $1)
         ORDER BY created_at DESC
         LIMIT 1`,
        [player1Id, player2Id]
    );

    // Nu s-au mai intalnit — random
    if (result.rows.length === 0) {
        console.log('Primul meci dintre ei — alegere random');
        return Math.random() < 0.5 ? 1 : 2;
    }

    // S-au mai intalnit — cel care NU a mers primul data trecuta merge acum
    const lastFirstMoverId = result.rows[0].first_mover_id;
    const nextFirstMover = lastFirstMoverId === player1Id ? 2 : 1;
    console.log(`Ultimul first mover: ${lastFirstMoverId}, acum merge primul: player${nextFirstMover}`);
    return nextFirstMover;
}