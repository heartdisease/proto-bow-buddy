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
import { Player, TotalScoreForGame } from './db';
import { Application } from './main';

export interface PlayerScore {
  playerName: string;
  totalScore: number;
  averageScore: number;
  missCount: number;
  bodyHitCount: number;
  killHitCount: number;
  centerKillHitCount: number;
  firstTurnCount: number;
  secondTurnCount: number;
  thirdTurnCount: number;
}

export interface TotalScore {
  totalScoreForGame: TotalScoreForGame;
  playerScores: PlayerScore[];
}

export /*final*/ class ScoreUtils {
  static async generateScoreTable(
    gid: number,
    stations: number,
  ): Promise<TotalScore> {
    const totalScoreForGame: TotalScoreForGame = await Application.getStorage().getTotalScoreForGame(
      gid,
    );
    const playerScores: PlayerScore[] = [];

    totalScoreForGame.players.forEach((player: Player) => {
      const scores = totalScoreForGame.scores.get(player.pid)!; // tslint:disable-line:no-non-null-assertion
      const totalScore = scores
        .map((score: string) => ScoreUtils.scoreToPoints(score))
        .reduce((a, b) => a + b, 0);
      const averageScore = ScoreUtils.averageScore(totalScore, stations);

      playerScores.push({
        playerName: player.name,
        totalScore,
        averageScore,
        missCount: scores.filter((score: string) => score === 'miss').length,
        bodyHitCount: scores.filter((score: string) =>
          score.endsWith(':body-hit'),
        ).length,
        killHitCount: scores.filter((score: string) =>
          score.endsWith(':kill-hit'),
        ).length,
        centerKillHitCount: scores.filter((score: string) =>
          score.endsWith(':center-kill-hit'),
        ).length,
        firstTurnCount: scores.filter((score: string) =>
          score.startsWith('first-turn:'),
        ).length,
        secondTurnCount: scores.filter((score: string) =>
          score.startsWith('second-turn:'),
        ).length,
        thirdTurnCount: scores.filter((score: string) =>
          score.startsWith('third-turn:'),
        ).length,
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

  static averageScore(totalScore: number, stations: number): number {
    return Math.round((totalScore / stations) * 10) / 10; // TODO make configurable whether to round to 1 or 2 decimals;
  }
}
