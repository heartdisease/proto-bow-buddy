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
import { PlayerWithScore } from '../data-types';
import {
  scoreToPoints,
  scoreToDisplayName,
  averageScore,
  defaultPromiseErrorHandler,
} from '../utils';
import { BaseView } from './base-view';
import { UrlParameters } from '../router';

import '../styles/station-select-player.scss'; // tslint:disable-line:no-import-side-effect

export class StationSelectPlayerView extends BaseView {
  protected onReveal(parameters: Readonly<UrlParameters>): void {
    this.init(parameters.gid as number, parameters.station as number).catch(
      defaultPromiseErrorHandler,
    );
  }

  protected onHide(): void {
    // nothing to do
  }

  protected updateTitle(title?: string): void {
    super.updateTitle('Choose Player');
  }

  protected getTemplateLocator(): string {
    return '#station-select-player-template';
  }

  protected getViewClassName(): string {
    return 'station-select-player-view';
  }

  private async init(gid: number, station: number): Promise<void> {
    if (station === -1) {
      this.getRouter().navigateTo(
        '#station-select-player',
        { gid, station: await this.getStorage().getLatestStationForGame(gid) },
        true,
      );
      return Promise.resolve();
    }

    this.queryElement('.station-no').innerText = `${station}`;

    try {
      const course = await this.getStorage().getCourseForGame(gid);
      const nextStationBtn = this.queryElement('.next-station-btn');
      const showScoreSwitch = this.queryElement(
        '.hide-score-switch input[type=checkbox]',
      ) as HTMLInputElement;

      if (station >= course.stations) {
        nextStationBtn.innerHTML =
          '<i class="material-icons left">check</i> Show total score';
        nextStationBtn.addEventListener('click', e => {
          e.preventDefault();
          this.getRouter().navigateTo(`#final-score`, { gid });
        });
      } else {
        nextStationBtn.addEventListener('click', e => {
          e.preventDefault();

          this.getRouter().navigateTo(`#station-select-player`, {
            gid,
            station: station + 1,
          });
        });
      }

      showScoreSwitch.checked = !hideIntermediateScore();
      showScoreSwitch.addEventListener('change', e => {
        hideIntermediateScore(!showScoreSwitch.checked);
        window.location.reload();
      });

      return this.initPlayerButtons(gid, station);
    } catch (error) {
      throw new Error(
        `Failed to init view (gid: ${gid}, station: ${station}): ${error.message}`,
      );
    }
  }

  private async initPlayerButtons(gid: number, station: number): Promise<void> {
    const [players, totalScoreForGame] = await Promise.all([
      this.getStorage().getPlayersWithScore(gid, station),
      this.getStorage().getTotalScoreForGame(gid),
    ]);

    if (players.length === 0) {
      throw new Error('Cannot load players!');
    }

    const playerSelectionList = this.queryElement('.player-selection-list');
    const playersWithScore = players.filter(
      player => player.score !== undefined,
    ).length;

    this.queryElement('.quick-assign-btn').addEventListener('click', e => {
      const firstPid = players[0].pid;

      e.preventDefault();

      if (players.length > 1) {
        const quickAssign = players
          .slice(1)
          .map(p => p.pid)
          .join('+');

        this.getRouter().navigateTo(`#station-set-score`, {
          gid,
          pid: firstPid,
          qa: quickAssign,
          station,
        });
      } else {
        this.getRouter().navigateTo(`#station-set-score`, {
          gid,
          pid: firstPid,
          station,
        });
      }
    });
    this.queryElement('.assign-all-btn').addEventListener('click', e => {
      const quickAssign = players.map(p => p.pid).join('+');

      e.preventDefault();
      this.getRouter().navigateTo(`#station-set-score`, {
        gid,
        qa: quickAssign,
        aa: true,
        station,
      });
    });

    for (const player of players) {
      const scores = totalScoreForGame.scores.get(player.pid);
      const scorePoints = scores !== undefined ? scores.map(scoreToPoints) : [];
      const totalScore = scorePoints.reduce(
        (a: number, b: number) => a + b,
        scorePoints.length < station ? 0 : -scorePoints[scorePoints.length - 1], // exclude score of current station
      );

      playerSelectionList.appendChild(
        this.createPlayerButton(gid, station, totalScore, player),
      );
    }

    if (playersWithScore === players.length) {
      this.queryElement('.next-station-btn').removeAttribute('disabled');
    } else if (playersWithScore === 0) {
      // enable quick-assign and assign-all only when no player has a score yet
      this.queryElement('.quick-assign-btn').removeAttribute('disabled');
      this.queryElement('.assign-all-btn').removeAttribute('disabled');
    }
  }

  private createPlayerButton(
    gid: number,
    station: number,
    totalScore: number,
    player: PlayerWithScore,
  ): HTMLElement {
    const avgScore = averageScore(totalScore, Math.max(1, station - 1));
    const playerEntry = this.createElement(
      'a',
      totalScore > 0 && !hideIntermediateScore()
        ? `${player.name} (${totalScore}) [${avgScore} avg] `
        : player.name,
      false,
      'collection-item',
    );
    playerEntry.setAttribute(
      'href',
      `#station-set-score;gid=${gid};pid=${player.pid};station=${station}`,
    );

    if (player.score) {
      const scoreDisplayName = scoreToDisplayName(player.score);
      const scorePoints = scoreToPoints(player.score);
      const scoreBadge = this.createElement(
        'span',
        `${scoreDisplayName}&nbsp;&nbsp;&nbsp;(+${scorePoints})`,
        true,
        'badge new blue',
      );

      scoreBadge.style.fontWeight = 'bold';
      playerEntry.appendChild(scoreBadge);
    }

    return playerEntry;
  }
}

// TODO move into its own utility
function hideIntermediateScore(hide?: boolean): boolean {
  if (hide === undefined) {
    const value = window.localStorage.getItem(
      'bow-buddy-settings:hide-intermediate-score',
    );

    return value === 'true';
  }
  window.localStorage.setItem(
    'bow-buddy-settings:hide-intermediate-score',
    `${hide}`,
  );

  return hide;
}
