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
import { BaseView } from './base-view';
import { Game, Application } from '../main';
import { ScoreUtils, TotalScore, PlayerScore } from '../score-utils';

import '../styles/final-score.scss';

export class FinalScoreView extends BaseView {
  getTitle(): string {
    return 'Final Score';
  }

  protected getTemplateLocator(): string {
    return '#final-score-template';
  }

  protected getViewClassName(): string {
    return 'final-score-view';
  }

  onReveal(urlParams: Readonly<Map<string, string | number>>): void {
    const gid = <number>urlParams.get('gid');

    // sets timestamp for field 'endtime'
    this.getStorage()
      .finishGame(gid)
      .then((game: Game) => {
        const duration = Application.getDuration(game.starttime, game.endtime);
        const from = new Date(game.starttime).toLocaleDateString('de-AT', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        });
        const to = new Date(game.endtime).toLocaleTimeString('de-AT', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        });

        this.queryElement('.course-duration').innerHTML = `${duration}<br/>(${from} - ${to})`;
      });

    this.getStorage()
      .getCourseForGame(gid)
      .then(course => {
        const courseLabel = `${course.place ? course.place + ' ' : ''}${course.name} (${course.stations} stations)`;

        this.queryElement('.course-label').innerText = courseLabel;
        this.generateScoreTable(gid, course.stations);
      });
  }

  onHide(): void {
    // nothing to do
  }

  private generateScoreTable(gid: number, stations: number): void {
    ScoreUtils.generateScoreTable(gid, stations).then((totalScore: TotalScore) => {
      const players = totalScore.totalScoreForGame.players;
      const scores = totalScore.totalScoreForGame.scores;
      const playerScores = totalScore.playerScores;
      const playerScoreEntries = this.queryElement('.player-score-entries');
      const playerHeaderRow = this.queryElement('.player-header-row');

      players.forEach(player => playerHeaderRow.appendChild(this.createElement('th', player.name)));

      for (let station = 1; station <= stations; station++) {
        const playerScoreEntry = document.createElement('tr');
        const stationColumn = this.createElement('td', `${station}.`);

        stationColumn.style.fontStyle = 'italic';
        playerScoreEntry.appendChild(stationColumn);
        players
          .map(player => scores.get(player.pid)!)
          .forEach(scores => {
            const scoreColumn = this.createElement('td', '' + ScoreUtils.scoreToPoints(scores[station - 1]));

            playerScoreEntry.appendChild(scoreColumn);
          });
        playerScoreEntries.appendChild(playerScoreEntry);
      }

      this.sumUpScore(playerScoreEntries, playerScores);
      this.generateLeaderBoard(playerScores);
    });
  }

  private sumUpScore(playerScoreEntries: HTMLElement, playerScores: PlayerScore[]): void {
    const playerTotalScore = document.createElement('tr');
    const playerAverageScore = document.createElement('tr');
    const playerMissCount = document.createElement('tr');
    const playerBodyHitCount = document.createElement('tr');
    const playerKillHitCount = document.createElement('tr');
    const playerCenterKillHitCount = document.createElement('tr');

    playerTotalScore.style.fontWeight = 'bold';
    playerTotalScore.appendChild(this.createElement('td', 'Total:'));

    playerAverageScore.style.fontStyle = 'italic';
    playerAverageScore.appendChild(this.createElement('td', 'Average:'));

    playerMissCount.style.fontStyle = 'italic';
    playerMissCount.appendChild(this.createElement('td', 'Miss:'));

    playerBodyHitCount.style.fontStyle = 'italic';
    playerBodyHitCount.appendChild(this.createElement('td', 'Body:'));

    playerKillHitCount.style.fontStyle = 'italic';
    playerKillHitCount.appendChild(this.createElement('td', 'Kill:'));

    playerCenterKillHitCount.style.fontStyle = 'italic';
    playerCenterKillHitCount.appendChild(this.createElement('td', 'Center Kill:'));

    playerScores.forEach(playerScore => {
      playerTotalScore.appendChild(this.createElement('td', '' + playerScore.totalScore));
      playerAverageScore.appendChild(this.createElement('td', '' + playerScore.averageScore));
      playerMissCount.appendChild(this.createElement('td', `${playerScore.missCount}&times;`, true));
      playerBodyHitCount.appendChild(this.createElement('td', `${playerScore.bodyHitCount}&times;`, true));
      playerKillHitCount.appendChild(this.createElement('td', `${playerScore.killHitCount}&times;`, true));
      playerCenterKillHitCount.appendChild(this.createElement('td', `${playerScore.centerKillHitCount}&times;`, true));
    });

    playerScoreEntries.appendChild(playerTotalScore);
    playerScoreEntries.appendChild(playerAverageScore);
    playerScoreEntries.appendChild(playerMissCount);
    playerScoreEntries.appendChild(playerBodyHitCount);
    playerScoreEntries.appendChild(playerKillHitCount);
    playerScoreEntries.appendChild(playerCenterKillHitCount);
  }

  private generateLeaderBoard(playerScores: PlayerScore[]): void {
    const leaderboard = this.queryElement('.leaderboard');

    playerScores
      .sort((a, b) => b.totalScore - a.totalScore)
      .forEach((playerScore, index) => leaderboard.appendChild(this.createLeaderBoardEntry(playerScore, index + 1)));
  }

  private createLeaderBoardEntry(playerScore: PlayerScore, place: number): HTMLElement {
    const entry = this.createElement('li', null, false, 'collection-item avatar');
    const playerName = this.createElement('span', playerScore.playerName, false, 'title');
    const totalScore = this.createElement(
      'p',
      `<b>Total score</b>: ${playerScore.totalScore} (Average: ${playerScore.averageScore})`,
      true
    );
    const missCount = this.createElement('p', `<b>Miss</b>: ${playerScore.missCount}&times;`, true);

    entry.appendChild(this.createLeaderBoardBadge(place));
    entry.appendChild(playerName);
    entry.appendChild(totalScore);
    entry.appendChild(missCount);

    return entry;
  }

  private createLeaderBoardBadge(place: number): HTMLElement {
    if (place < 1) {
      throw new Error('Invalid place: ' + place);
    }

    switch (place) {
      case 1:
        return this.createElement(
          'div',
          '<span>1<sup>st</sup></span>',
          true,
          'leaderboard-badge first-place amber accent-3'
        );
      case 2:
        return this.createElement(
          'div',
          '<span>2<sup>nd</sup></span>',
          true,
          'leaderboard-badge second-place blue-grey lighten-3'
        );
      case 3:
        return this.createElement(
          'div',
          '<span>3<sup>rd</sup></span>',
          true,
          'leaderboard-badge third-place deep-orange darken-3'
        );
      default:
        return this.createElement('div', `<span>${place}<sup>th</sup></span>`, true, 'leaderboard-badge grey darken-4');
    }
  }
}
