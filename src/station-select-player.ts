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
 * Copyright 2017-2018 Christoph Matscheko
 */
import * as $ from 'jquery';
import { BaseView } from './base-view';
import { Player, PlayerWithScore, TotalScoreForGame, Application } from './main';

import './styles/station-select-player.scss';

export class StationSelectPlayerView extends BaseView {
  getTemplateLocator(): string {
    return '#station-select-player-template';
  }

  onReveal(urlParams: Readonly<Map<string, string | number>>): void {
    const gid = <number>urlParams.get('gid');
    const station = <number>urlParams.get('station');

    $('#station-no').text(station);

    this.getStorage()
      .getCourseForGame(gid)
      .then(course => {
        console.log('course: ' + course);

        if (station >= course.stations) {
          $('#next-station-btn')
            .html('<i class="material-icons left">check</i> Show total score')
            .on('click', e => {
              e.preventDefault();
              window.location.href = `#final-score;gid=${gid}`;
            });
        } else {
          $('#next-station-btn').on('click', e => {
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
    console.log('initPlayerButtons: gid ' + gid + ', station ' + station);

    Promise.all([
      this.getStorage().getPlayersWithScore(gid, station),
      this.getStorage().getTotalScoreForGame(gid)
    ]).then((dataObjects: Array<Array<PlayerWithScore> | TotalScoreForGame>) => {
      const players = <Array<PlayerWithScore>>dataObjects[0];
      const totalScoreForGame = <TotalScoreForGame>dataObjects[1];

      if (players.length === 0) {
        throw new Error('Cannot load players!');
      }

      const $playerSelectionList = $('#player-selection-list');
      const playersWithScore = players.filter(player => player.score !== undefined).length;

      $('#quick-assign-btn').on('click', (e: any) => {
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
        const scorePoints = scores ? scores.map(score => Application.scoreToPoints(score)) : [];
        const totalScore = scorePoints.reduce(
          (a, b) => a + b,
          scorePoints.length < station ? 0 : -scorePoints[scorePoints.length - 1] // exclude score of current station
        );

        $playerSelectionList.append(this.createPlayerButton(gid, station, totalScore, player));
      });

      if (playersWithScore === players.length) {
        $('#next-station-btn').removeAttr('disabled');
      } else if (playersWithScore === 0) {
        $('#quick-assign-btn').removeAttr('disabled'); // enable quick-assign only when no player has a score yet
      }
    });
  }

  private createPlayerButton(
    gid: number,
    station: number,
    totalScore: number,
    player: PlayerWithScore
  ): JQuery<JQuery.Node> {
    const $playerEntry = $('<a/>')
      .addClass('collection-item')
      .attr('href', `#station-set-score;gid=${gid};pid=${player.pid};station=${station}`)
      .text(totalScore > 0 ? `${player.name} (${totalScore}) ` : player.name);

    if (player.score) {
      const scoreDisplayName = Application.scoreToDisplayName(player.score);
      const scorePoints = Application.scoreToPoints(player.score);
      const $scoreBadge = $('<span/>')
        .addClass('badge new blue')
        .css('font-weight', 'bold')
        .html(`${scoreDisplayName}&nbsp;&nbsp;&nbsp;(+${scorePoints})`);

      $playerEntry.append($scoreBadge);
    }
    return $playerEntry;
  }
}
