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
  export class FinalScoreView extends BaseView {
    getTemplateLocator(): string {
      return '#final-score-template';
    }

    onReveal(urlParams: Readonly<Map<string, string | number>>): void {
      const gid = <number>urlParams.get('gid');

      // sets timestamp for field 'endtime'
      this.getStorage()
        .finishGame(gid)
        .then(game => {
          $('#course-duration').text(Application.getDuration(game.starttime, game.endtime));
        });

      this.getStorage()
        .getCourseForGame(gid)
        .then(course => {
          let playerNames: Array<string>;
          const stations = course.stations;
          const scores: Array<Array<string>> = new Array(stations);
          let scoreCount = 0;

          $('#course-label').text((course.place ? course.place + ' ' : '') + course.name);
          $('#back-btn').on(
            'click',
            (e: any) => (window.location.href = `#station-select-player;gid=${gid};station=${stations}`)
          );

          for (let i = 1; i <= stations; i++) {
            const station = i;

            this.getStorage()
              .getPlayersWithScore(gid, station)
              .then((players: Array<PlayerWithScore>) => {
                if (station === 1) {
                  playerNames = players.map(p => p.name);
                }
                scores[station - 1] = players.map(p => p.score);

                if (++scoreCount === stations) {
                  this.generateScoreTable(playerNames, scores);
                }
              });
          }
        });
    }

    onHide(): void {
      // nothing to do
    }

    // TODO really ugly algo to sum up values... -_-'
    private generateScoreTable(playerNames: Array<string>, scores: Array<Array<string>>): void {
      const $playerHeaderRow = $('#player-header-row');
      const $playerScoreEntries = $('#player-score-entries');

      playerNames.forEach(playerName => $playerHeaderRow.append($('<th/>').text(playerName)));
      scores.forEach((scoresForStation: Array<string>, index: number) => {
        let $tr = $('<tr/>');

        $tr.append(
          $('<td/>')
            .css('font-style', 'italic')
            .text(index + 1 + '.')
        );
        scoresForStation.forEach((score: string) => $tr.append($('<td/>').text(Application.scoreToPoints(score))));
        $playerScoreEntries.append($tr);
      });

      // TODO improve this by already summing up all the points when iterating over scores for the first time!
      let $sumRow = $('<tr/>')
        .addClass('info')
        .css('font-weight', 'bold');
      $sumRow.append($('<td/>').html('&nbsp;')); // insert filler cell
      scores[0].forEach((score: string, column: number) => {
        $sumRow.append($('<td/>').text(scores.reduce((sum, row) => sum + Application.scoreToPoints(row[column]), 0)));
      });
      $playerScoreEntries.append($sumRow);
    }
  }
}
