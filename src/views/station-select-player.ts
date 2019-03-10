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
import { Player, PlayerWithScore, TotalScoreForGame } from '../main';
import { ScoreUtils } from '../score-utils';

import '../styles/station-select-player.scss';

export class StationSelectPlayerView extends BaseView {
  getTitle(): string {
    return 'Choose Player';
  }

  protected getTemplateLocator(): string {
    return '#station-select-player-template';
  }

  protected getViewClassName(): string {
    return 'station-select-player-view';
  }

  onReveal(urlParams: Readonly<Map<string, string | number>>): void {
    const gid = <number>urlParams.get('gid');
    const station = <number>urlParams.get('station');

    this.queryElement('.station-no').innerText = '' + station;

    this.getStorage()
      .getCourseForGame(gid)
      .then(course => {
        const nextStationBtn = this.queryElement('.next-station-btn');

        if (station >= course.stations) {
          nextStationBtn.innerHTML = '<i class="material-icons left">check</i> Show total score';
          nextStationBtn.addEventListener('click', e => {
            e.preventDefault();
            window.location.href = `#final-score;gid=${gid}`;
          });
        } else {
          nextStationBtn.addEventListener('click', e => {
            e.preventDefault();
            window.location.href = `#station-select-player;gid=${gid};station=${station + 1}`;
          });
        }

        this.initPlayerButtons(gid, station);
      })
      .catch(e => console.error(e));
  }

  onHide(): void {
    // nothing to do
  }

  private initPlayerButtons(gid: number, station: number): void {
    Promise.all([
      this.getStorage().getPlayersWithScore(gid, station),
      this.getStorage().getTotalScoreForGame(gid)
    ]).then((dataObjects: Array<PlayerWithScore[] | TotalScoreForGame>) => {
      const players = <PlayerWithScore[]>dataObjects[0];
      const totalScoreForGame = <TotalScoreForGame>dataObjects[1];

      if (players.length === 0) {
        throw new Error('Cannot load players!');
      }

      const playerSelectionList = this.queryElement('.player-selection-list');
      const playersWithScore = players.filter(player => player.score !== undefined).length;

      this.queryElement('.quick-assign-btn').addEventListener('click', e => {
        const qaParam =
          players.length > 1
            ? `;qa=${players
                .slice(1)
                .map((p: Player) => p.pid)
                .join('+')}`
            : '';

        e.preventDefault();
        window.location.href = `#station-set-score;gid=${gid};pid=${players[0].pid}${qaParam};station=${station}`;
      });

      players.forEach((player: PlayerWithScore) => {
        const scores = totalScoreForGame.scores.get(player.pid);
        const scorePoints = scores ? scores.map(score => ScoreUtils.scoreToPoints(score)) : [];
        const totalScore = scorePoints.reduce(
          (a, b) => a + b,
          scorePoints.length < station ? 0 : -scorePoints[scorePoints.length - 1] // exclude score of current station
        );

        playerSelectionList.appendChild(this.createPlayerButton(gid, station, totalScore, player));
      });

      if (playersWithScore === players.length) {
        this.queryElement('.next-station-btn').removeAttribute('disabled');
      } else if (playersWithScore === 0) {
        this.queryElement('.quick-assign-btn').removeAttribute('disabled'); // enable quick-assign only when no player has a score yet
      }
    });
  }

  private createPlayerButton(gid: number, station: number, totalScore: number, player: PlayerWithScore): HTMLElement {
    const playerEntry = this.createElement(
      'a',
      totalScore > 0 ? `${player.name} (${totalScore}) ` : player.name,
      false,
      'collection-item'
    );
    playerEntry.setAttribute('href', `#station-set-score;gid=${gid};pid=${player.pid};station=${station}`);

    if (player.score) {
      const scoreDisplayName = ScoreUtils.scoreToDisplayName(player.score);
      const scorePoints = ScoreUtils.scoreToPoints(player.score);
      const scoreBadge = this.createElement(
        'span',
        `${scoreDisplayName}&nbsp;&nbsp;&nbsp;(+${scorePoints})`,
        true,
        'badge new blue'
      );

      scoreBadge.style.fontWeight = 'bold';
      playerEntry.appendChild(scoreBadge);
    }
    return playerEntry;
  }
}
