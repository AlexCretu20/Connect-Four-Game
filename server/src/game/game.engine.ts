export class ConnectFourGame {
    private board: number[][];
    public currentPlayer: 1 | 2;
    public winner: number | null = null;
    private readonly ROWS = 6;
    private readonly COLS = 7;
    public moveCount: number = 0;
    public firstMoverId: 1 | 2;

    // salvam istoric mutari
    public moveHistory: { moveNumber: number, col: number, playerIndex: number }[] = [];

    constructor(firstPlayer: 1 | 2 = 1) {
        this.board = Array.from({ length: this.ROWS }, () => Array(this.COLS).fill(0));
        this.currentPlayer = firstPlayer;
        this.firstMoverId = firstPlayer;
    }

    public dropPiece(col: number): { success: boolean, row?: number, win?: boolean, draw?: boolean } {
        if (this.winner !== null) return { success: false };
        if (col < 0 || col >= this.COLS) return { success: false };

        for (let row = this.ROWS - 1; row >= 0; row--) {
            if (this.board[row][col] === 0) {
                this.board[row][col] = this.currentPlayer;
                this.moveCount += 1;

                this.moveHistory.push({
                    moveNumber: this.moveCount,
                    col: col,
                    playerIndex: this.currentPlayer // Salvăm 1 sau 2
                });

                const isWin = this.checkWin(row, col);
                const isDraw = this.checkDraw();

                if (isWin) {
                    this.winner = this.currentPlayer;
                } else {

                    this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
                }

                return { success: true, row, win: isWin, draw: isDraw };
            }
        }

        return { success: false };
    }

    private checkWin(row: number, col: number): boolean {
        const player = this.board[row][col];
        //[row, col]
        const directions = [
            [0, 1],   // left-right
            [1, 0],   // up-down
            [1, 1],   // (\)
            [1, -1]   //(/)
        ];

        for (const [dRow, dCol] of directions) {
            let count = 1;

            let r = row + dRow;
            let c = col + dCol;
            while (r >= 0 && r < this.ROWS && c >= 0 && c < this.COLS && this.board[r][c] === player) {
                count++;
                r += dRow;
                c += dCol;
            }

            r = row - dRow;
            c = col - dCol;
            while (r >= 0 && r < this.ROWS && c >= 0 && c < this.COLS && this.board[r][c] === player) {
                count++;
                r -= dRow;
                c -= dCol;
            }

            if (count >= 4) return true;
        }

        return false;
    }

    private checkDraw(): boolean {
        return this.board[0].every(cell => cell !== 0);
    }

    public getBoard() {
        return this.board;
    }
}