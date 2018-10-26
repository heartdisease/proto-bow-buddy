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
/// <reference path ='../node_modules/@types/jquery/index.d.ts'/>
/// <reference path='./base-view.ts' />
/// <reference path='./main.ts' />

namespace BowBuddy {
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
              .html('<span class="glyphicon glyphicon-ok" aria-hidden="true"></span> Finish course')
              .on('click', e => {
                e.preventDefault();
                window.location.href = `#final-score;gid=${gid}`;
              });
          } else {
            $('#next-station-btn').on('click', e => {
              e.preventDefault();
              window.location.href = `#final-score;gid=${gid};station=${station + 1}`;
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

      this.getStorage()
        .getPlayersWithScore(gid, station)
        .then(players => {
          const $playerSelectionList = $('#player-selection-list');
          let playersWithScore = 0;

          if (players.length === 0) {
            throw new Error('Cannot load players!');
          }

          $('#quick-assign-btn').on('click', e => {
            const qaParam =
              players.length > 1
                ? `;qa=${players
                    .slice(1)
                    .map(p => p.pid)
                    .join('+')}`
                : '';

            e.preventDefault();
            window.location.href = `#station-set-score;gid=${gid};pid=${players[0].pid}${qaParam};station=${station}`;
          });

          players.forEach(player => {
            console.log('Init button for player ' + player.name);

            const $playerEntry = $('<a/>')
              .addClass('collection-item')
              .attr('href', `#station-set-score;gid=${gid};pid=${player.pid};station=${station}`)
              .text(player.name + ' '); // add space separator here for score badge

            if (player.score) {
              const $scoreBadge = $('<span/>').addClass('badge new blue');

              playersWithScore++;

              if (player.score === 'miss') {
                $scoreBadge.html('Miss&nbsp;&nbsp;&nbsp;(+0)');
              } else {
                $scoreBadge.html(
                  Application.scoreToDisplayName(player.score) +
                    '&nbsp;&nbsp;&nbsp;(+' +
                    Application.scoreToPoints(player.score) +
                    ')'
                );
              }
              $playerEntry.append($scoreBadge);
            }

            $playerSelectionList.append($playerEntry);
          });

          if (playersWithScore === players.length) {
            $('#next-station-btn').removeAttr('disabled');
          } else if (playersWithScore === 0) {
            $('#quick-assign-btn').removeAttr('disabled'); // enable quick-assign only when no player has a score yet
          }
        });
    }
  }
}
