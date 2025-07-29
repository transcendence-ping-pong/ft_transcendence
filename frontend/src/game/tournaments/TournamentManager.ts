// import { TournamentPlayer } from "./TournamentPlayer";
// import { Match } from "./Match";

// export class TournamentManager {
//     private players: TournamentPlayer[] = [];
//     private matches: Match[] = [];
//     private currentMatchIndex = 0;
//     private round = 1;

//     registerPlayer(alias: string) {
//         this.players.push(new TournamentPlayer(alias));
//     }
    
//     resetTournament() {
//         this.players = [];
//         this.matches = [];
//         this.currentMatchIndex = 0;
//         this.round = 1;
//     }

//     generateMatches() {
//         this.matches = [];
//         const shuffled = [...this.players].sort(() => Math.random() - 0.5);

//         for (let i = 0; i < shuffled.length; i += 2) {
//             const p1 = shuffled[i];
//             const p2 = shuffled[i + 1] || new TournamentPlayer("BYE");
//             this.matches.push(new Match(p1, p2, this.round));
//         }
//     }

//     getCurrentMatch(): Match | null {
//         return this.matches[this.currentMatchIndex] || null;
//     }

//     advanceToNextMatch() {
//         this.currentMatchIndex++;
//     }

//     hasMoreMatches(): boolean {
//         return this.currentMatchIndex < this.matches.length;
//     }

//     getAllMatches(): Match[] {
//         return this.matches;
//     }
// }
