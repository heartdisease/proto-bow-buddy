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

          this.generateScoreTable(gid, stations);
        });
    }

    onHide(): void {
      // nothing to do
    }

    private generateScoreTable(gid: number, stations: number): void {
      this.getStorage()
        .getTotalScoreForGame(gid)
        .then(totalScore => {
          totalScore.players.forEach(player => {
            let output = player.name + ': ' + totalScore.scores.get(player.pid).join(', ');
            console.log(output);

            $('#player-header-row').append($('<th/>').text(player.name));
          });

          for (let station = 1; station <= stations; station++) {
            const $playerScoreEntry = $('<tr/>');

            $playerScoreEntry.append(
              $('<td/>')
                .css('font-style', 'italic')
                .text(`${station}.`)
            );
            totalScore.players.map(player => totalScore.scores.get(player.pid)).forEach(scores => {
              $playerScoreEntry.append($('<td/>').text(Application.scoreToPoints(scores[station - 1])));
            });
            $('#player-score-entries').append($playerScoreEntry);
          }

          const $playerTotalScore = $('<tr/>')
            .css('font-weight', 'bold')
            .append($('<td/>').html('&nbsp;')); // insert filler cell

          totalScore.players.map(player => totalScore.scores.get(player.pid)).forEach(scores => {
            const totalScore = scores.map(score => Application.scoreToPoints(score)).reduce((a, b) => a + b);
            $playerTotalScore.append($('<td/>').text(totalScore));
          });
          $('#player-score-entries').append($playerTotalScore);
        });
    }
  }
}
