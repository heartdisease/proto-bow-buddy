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

import * as c3 from 'c3';

import {
  PlayerScore,
  calculateTotalScore,
  scoreToPoints,
  averageScore,
  TotalScore,
  defaultPromiseErrorHandler,
} from '../utils';
import { BaseView } from './base-view';
import { Player } from '../data-types';
import { UrlParameters } from '../router';

import '../styles/final-score.scss'; // tslint:disable-line:no-import-side-effect

export class FinalScoreView extends BaseView {
  private chartTabs: M.Tabs;

  protected onReveal(parameters: Readonly<UrlParameters>): void {
    this.chartTabs = M.Tabs.init(this.queryElement('.score-chart-tabs'), {
      duration: 150,
      swipeable: true,
    });

    this.init(parameters.gid as number).catch(defaultPromiseErrorHandler);
  }

  protected onHide(): void {
    this.removeEventListeners();
    this.chartTabs.destroy();
  }

  protected updateTitle(title?: string): void {
    super.updateTitle('Final Score');
  }

  protected getTemplateLocator(): string {
    return '#final-score-template';
  }

  protected getViewClassName(): string {
    return 'final-score-view';
  }

  private async init(gid: number): Promise<void> {
    // sets timestamp for field 'endtime'
    const [game, course] = await Promise.all([
      this.getStorage().finishGame(gid),
      this.getStorage().getCourseForGame(gid),
    ]);
    const courseLabel =
      course.place.length > 0
        ? `${course.place} ${course.name} (${course.stations} stations)`
        : `${course.name} (${course.stations} stations)`;
    const duration = getDuration(game.starttime, game.endtime);
    const from = new Date(game.starttime).toLocaleDateString('de-AT', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const to = new Date(game.endtime).toLocaleTimeString('de-AT', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    this.queryElement(
      '.course-duration',
    ).innerHTML = `${duration}<br/>(${from} - ${to})`;
    this.queryElement('.course-label').innerText = courseLabel;

    this.queryElement('.main-menu-btn').addEventListener('click', e => {
      e.preventDefault();
      this.getRouter().navigateTo('#main-menu');
    });

    const totalScore = calculateTotalScore(
      await this.getStorage().getTotalScoreForGame(gid),
      course.stations,
    );

    this.generateScoreChart(totalScore);
    this.generateScoreTable(totalScore, course.stations);
  }

  private generateScoreChart(totalScore: TotalScore): void {
    const { players, scores } = totalScore.totalScoreForGame;
    const axis: c3.AxesOptions = {
      x: {
        type: 'indexed',
        label: {
          text: 'Stations',
          position: 'outer-center',
        },
      },
      y: {
        min: 0,
        max: 20,
        default: [0, 20],
        label: {
          text: 'Score',
          position: 'outer-middle',
        },
      },
    };

    c3.generate({
      bindto: `.${this.getViewClassName()} .progress-chart`,
      axis,
      line: {
        step: {
          type: 'step-after',
        },
      },
      data: { x: 'x', columns: createProgressChartData(players, scores) },
    });
    c3.generate({
      bindto: `.${this.getViewClassName()} .avg-progress-chart`,
      axis,
      line: {
        step: {
          type: 'step-after',
        },
      },
      data: {
        x: 'x',
        columns: createAverageProgressChartData(players, scores),
      },
    });
  }

  private generateScoreTable(totalScore: TotalScore, stations: number): void {
    const players = totalScore.totalScoreForGame.players;
    const scores = totalScore.totalScoreForGame.scores;
    const playerScores = totalScore.playerScores;
    const playerScoreEntries = this.queryElement('.player-score-entries');
    const playerHeaderRow = this.queryElement('.player-header-row');

    for (const player of players) {
      playerHeaderRow.appendChild(this.createElement('th', player.name));
    }

    for (let station = 1; station <= stations; station++) {
      const playerScoreEntry = document.createElement('tr');
      const stationColumn = this.createElement('td', `${station}.`);

      stationColumn.style.fontStyle = 'italic';
      playerScoreEntry.appendChild(stationColumn);
      players
        .map((player: Player) => scores.get(player.pid)!) // tslint:disable-line:no-non-null-assertion
        .forEach(scoresForPlayer => {
          const scoreColumn = this.createElement(
            'td',
            `${scoreToPoints(scoresForPlayer[station - 1])}`,
          );

          playerScoreEntry.appendChild(scoreColumn);
        });
      playerScoreEntries.appendChild(playerScoreEntry);
    }

    this.sumUpScore(playerScoreEntries, playerScores);
    this.generateLeaderBoard(playerScores);
  }

  private sumUpScore(
    playerScoreEntries: HTMLElement,
    playerScores: PlayerScore[],
  ): void {
    const playerTotalScore = document.createElement('tr');
    const playerAverageScore = document.createElement('tr');

    const playerMissCount = document.createElement('tr');
    const playerBodyHitCount = document.createElement('tr');
    const playerKillHitCount = document.createElement('tr');
    const playerCenterKillHitCount = document.createElement('tr');

    const playerFirstTurnCount = document.createElement('tr');
    const playerSecondTurnCount = document.createElement('tr');
    const playerThirdTurnCount = document.createElement('tr');

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
    playerCenterKillHitCount.appendChild(
      this.createElement('td', 'Center Kill:'),
    );

    playerFirstTurnCount.style.fontStyle = 'italic';
    playerFirstTurnCount.appendChild(this.createElement('td', 'First shot:'));

    playerSecondTurnCount.style.fontStyle = 'italic';
    playerSecondTurnCount.appendChild(this.createElement('td', 'Second shot:'));

    playerThirdTurnCount.style.fontStyle = 'italic';
    playerThirdTurnCount.appendChild(this.createElement('td', 'Third shot:'));

    playerScores.forEach(playerScore => {
      playerTotalScore.appendChild(
        this.createElement('td', `${playerScore.totalScore}`),
      );
      playerAverageScore.appendChild(
        this.createElement('td', `${playerScore.averageScore}`),
      );

      playerMissCount.appendChild(
        this.createElement('td', `${playerScore.missCount}&times;`, true),
      );
      playerBodyHitCount.appendChild(
        this.createElement('td', `${playerScore.bodyHitCount}&times;`, true),
      );
      playerKillHitCount.appendChild(
        this.createElement('td', `${playerScore.killHitCount}&times;`, true),
      );
      playerCenterKillHitCount.appendChild(
        this.createElement(
          'td',
          `${playerScore.centerKillHitCount}&times;`,
          true,
        ),
      );

      playerFirstTurnCount.appendChild(
        this.createElement('td', `${playerScore.firstTurnCount}&times;`, true),
      );
      playerSecondTurnCount.appendChild(
        this.createElement('td', `${playerScore.secondTurnCount}&times;`, true),
      );
      playerThirdTurnCount.appendChild(
        this.createElement('td', `${playerScore.thirdTurnCount}&times;`, true),
      );
    });

    playerScoreEntries.appendChild(playerTotalScore);
    playerScoreEntries.appendChild(playerAverageScore);

    playerScoreEntries.appendChild(playerMissCount);
    playerScoreEntries.appendChild(playerBodyHitCount);
    playerScoreEntries.appendChild(playerKillHitCount);
    playerScoreEntries.appendChild(playerCenterKillHitCount);

    playerScoreEntries.appendChild(playerFirstTurnCount);
    playerScoreEntries.appendChild(playerSecondTurnCount);
    playerScoreEntries.appendChild(playerThirdTurnCount);
  }

  private generateLeaderBoard(playerScores: PlayerScore[]): void {
    const leaderboard = this.queryElement('.leaderboard');

    playerScores
      .sort((a, b) => b.totalScore - a.totalScore)
      .forEach((playerScore, index) =>
        leaderboard.appendChild(
          this.createLeaderBoardEntry(playerScore, index + 1),
        ),
      );
  }

  private createLeaderBoardEntry(
    playerScore: PlayerScore,
    place: number,
  ): HTMLElement {
    const entry = this.createElement(
      'li',
      null,
      false,
      'collection-item avatar',
    );
    const playerName = this.createElement(
      'span',
      playerScore.playerName,
      false,
      'title',
    );
    const totalScore = this.createElement(
      'p',
      `<b>Total score</b>: ${playerScore.totalScore} (Average: ${playerScore.averageScore})`,
      true,
    );
    const missCount = this.createElement(
      'p',
      `<b>Miss</b>: ${playerScore.missCount}&times;`,
      true,
    );

    entry.appendChild(this.createLeaderBoardBadge(place));
    entry.appendChild(playerName);
    entry.appendChild(totalScore);
    entry.appendChild(missCount);

    return entry;
  }

  private createLeaderBoardBadge(place: number): HTMLElement {
    if (place < 1) {
      throw new Error(`Invalid place: ${place}`);
    }

    switch (place) {
      case 1:
        return this.createElement(
          'div',
          '<span>1<sup>st</sup></span>',
          true,
          'leaderboard-badge first-place amber accent-3',
        );
      case 2:
        return this.createElement(
          'div',
          '<span>2<sup>nd</sup></span>',
          true,
          'leaderboard-badge second-place blue-grey lighten-3',
        );
      case 3:
        return this.createElement(
          'div',
          '<span>3<sup>rd</sup></span>',
          true,
          'leaderboard-badge third-place deep-orange darken-3',
        );
      default:
        return this.createElement(
          'div',
          `<span>${place}<sup>th</sup></span>`,
          true,
          'leaderboard-badge grey darken-4',
        );
    }
  }
}

function getDuration(starttime: string, endtime: string): string {
  const startDate = new Date(starttime);
  const endDate = new Date(endtime);
  const diffInMs = endDate.getTime() - startDate.getTime();
  let duration = '';

  if (diffInMs < 0) {
    throw new Error('Start time is after end time!');
  }
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMinutes / 60);

  if (diffInHours >= 1) {
    duration += `${diffInHours}h `;
  }
  duration += `${diffInMinutes - diffInHours * 60}m`;

  return duration;
}

function createXAxisLabels(stations: number): string[] {
  const xAxisLabels = new Array<string>(stations + 1);

  xAxisLabels[0] = 'x';

  for (let i = 1; i <= stations; i++) {
    xAxisLabels[i] = `${i}`;
  }
  return xAxisLabels;
}

function createProgressChartData(
  players: Player[],
  scores: Map<number, string[]>,
): [string, ...c3.PrimitiveArray][] {
  const columns = [];

  for (const player of players) {
    const playerScore = scores.get(player.pid)!.map(scoreToPoints); // tslint:disable-line:no-non-null-assertion

    if (columns.length === 0) {
      columns.push(createXAxisLabels(playerScore.length));
    }
    columns.push([player.name, ...playerScore]);
  }
  return columns as [string, ...c3.PrimitiveArray][];
}

function createAverageProgressChartData(
  players: Player[],
  scores: Map<number, string[]>,
): [string, ...c3.PrimitiveArray][] {
  const columns = [];

  for (const player of players) {
    const playerScore = scores.get(player.pid)!.map(scoreToPoints); // tslint:disable-line:no-non-null-assertion
    const avgPlayerScore = new Array<number>(playerScore.length);

    if (columns.length === 0) {
      columns.push(createXAxisLabels(playerScore.length));
    }

    let tmpTotalScore = 0;

    for (let i = 0; i < playerScore.length; i++) {
      tmpTotalScore += playerScore[i];
      avgPlayerScore[i] = averageScore(tmpTotalScore, i + 1);
    }
    columns.push([player.name, ...avgPlayerScore]);
  }
  return columns as [string, ...c3.PrimitiveArray][];
}
