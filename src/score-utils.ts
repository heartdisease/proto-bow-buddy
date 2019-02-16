/**
 * This file is part of BowBuddy.
 *
 * BowBuddy is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * BowBuddy is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with BowBuddy.  If not, see <http://www.gnu.org/licenses/>.
 *
 *
 * Copyright 2017-2019 Christoph Matscheko
 */
import { Application, Player, TotalScoreForGame } from './main';

export interface PlayerScore {
  playerName: string;
  totalScore: number;
  averageScore: number;
  missCount: number;
  bodyHitCount: number;
  killHitCount: number;
  centerKillHitCount: number;
}

export interface TotalScore {
  totalScoreForGame: TotalScoreForGame;
  playerScores: PlayerScore[];
}

export /*final*/ class ScoreUtils {
  static async generateScoreTable(gid: number, stations: number): Promise<TotalScore> {
    const totalScoreForGame: TotalScoreForGame = await Application.getStorage().getTotalScoreForGame(gid);
    const playerScores: PlayerScore[] = [];

    totalScoreForGame.players.forEach((player: Player) => {
      const scores = totalScoreForGame.scores.get(player.pid)!;
      const totalScore = scores.map((score_1: string) => ScoreUtils.scoreToPoints(score_1)).reduce((a, b) => a + b, 0);
      const averageScore = Math.floor(((totalScore / stations) * 10) / 10);
      const missCount = scores.filter((score_2: string) => score_2 === 'miss').length;
      const bodyHitCount = scores.filter((score_3: string) => score_3.endsWith(':body-hit')).length;
      const killHitCount = scores.filter((score_4: string) => score_4.endsWith(':kill-hit')).length;
      const centerKillHitCount = scores.filter((score_5: string) => score_5.endsWith(':center-kill-hit')).length;

      playerScores.push({
        playerName: player.name,
        totalScore,
        averageScore,
        missCount,
        bodyHitCount,
        killHitCount,
        centerKillHitCount
      });
    });
    return { totalScoreForGame, playerScores };
  }

  static scoreToPoints(score: string): number {
    if (score === 'miss' || score === 'undefined-score') {
      return 0;
    }

    const scoreParts = score.split(':');
    let penalty;

    switch (scoreParts[0]) {
      case 'first-turn':
        penalty = 0;
        break;
      case 'second-turn':
        penalty = 1;
        break;
      case 'third-turn':
        penalty = 2;
        break;
      default:
        throw new Error(`Invalid score format '${score}'`);
    }
    switch (scoreParts[1]) {
      case 'body-hit':
        return 16 - penalty * 6;
      case 'kill-hit':
        return 18 - penalty * 6;
      case 'center-kill-hit':
        return 20 - penalty * 6;
      default:
        throw new Error(`Invalid score format '${score}'`);
    }
  }

  static scoreToDisplayName(score: string): string {
    if (score === 'miss') {
      return 'Miss';
    }

    const scoreParts = score.split(':');
    let scoreLabel;

    switch (scoreParts[0]) {
      case 'first-turn':
        scoreLabel = '1<sup>st</sup>';
        break;
      case 'second-turn':
        scoreLabel = '2<sup>nd</sup>';
        break;
      case 'third-turn':
        scoreLabel = '3<sup>rd</sup>';
        break;
      default:
        throw new Error(`Invalid score format '${score}'`);
    }
    scoreLabel += ' - ';
    switch (scoreParts[1]) {
      case 'body-hit':
        scoreLabel += 'Body';
        break;
      case 'kill-hit':
        scoreLabel += 'Kill';
        break;
      case 'center-kill-hit':
        scoreLabel += 'Center Kill';
        break;
      default:
        throw new Error(`Invalid score format '${score}'`);
    }

    return scoreLabel;
  }
}