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
          const duration = Application.getDuration(game.starttime, game.endtime);
          const from = new Date(game.starttime).toLocaleDateString('de-AT', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: 'numeric',
            minute: 'numeric',
            hour12: false
          });
          const to = new Date(game.starttime).toLocaleTimeString('de-AT', {
            hour: 'numeric',
            minute: 'numeric',
            hour12: false
          });

          $('#course-duration').text(`${duration} (${from} - ${to})`);
        });

      this.getStorage()
        .getCourseForGame(gid)
        .then(course => {
          $('#course-label').text(
            `${course.place ? course.place + ' ' : ''}${course.name} (${course.stations} stations)`
          );
          this.generateScoreTable(gid, course.stations);
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
            .append($('<td/>').text('Total:'));
          const $playerAverageScore = $('<tr/>')
            .css('font-style', 'italic')
            .append($('<td/>').text('Average: '));
          const $playerMissCount = $('<tr/>')
            .css('font-style', 'italic')
            .append($('<td/>').text('Miss: '));
          const $playerBodyHitCount = $('<tr/>')
            .css('font-style', 'italic')
            .append($('<td/>').text('Body: '));
          const $playerKillHitCount = $('<tr/>')
            .css('font-style', 'italic')
            .append($('<td/>').text('Kill: '));
          const $playerCenterKillHitCount = $('<tr/>')
            .css('font-style', 'italic')
            .append($('<td/>').text('Center Kill: '));

          totalScore.players.map(player => totalScore.scores.get(player.pid)).forEach(scores => {
            const totalScore = scores.map(score => Application.scoreToPoints(score)).reduce((a, b) => a + b);
            const missCount = scores.filter(score => score === 'miss').length;
            const bodyHitCount = scores.filter(score => score.endsWith('body-hit')).length;
            const killHitCount = scores.filter(score => score.endsWith('kill-hit')).length;
            const centerKillHitCount = scores.filter(score => score.endsWith('center-kill-hit')).length;

            $playerTotalScore.append($('<td/>').text(totalScore));
            $playerAverageScore.append($('<td/>').text(Math.floor((totalScore / stations) * 10) / 10));
            $playerMissCount.append($('<td/>').html(`${missCount}&times;`));
            $playerBodyHitCount.append($('<td/>').html(`${bodyHitCount}&times;`));
            $playerKillHitCount.append($('<td/>').html(`${killHitCount}&times;`));
            $playerCenterKillHitCount.append($('<td/>').html(`${centerKillHitCount}&times;`));
          });
          $('#player-score-entries').append($playerTotalScore);
          $('#player-score-entries').append($playerAverageScore);
          $('#player-score-entries').append($playerMissCount);
          $('#player-score-entries').append($playerBodyHitCount);
          $('#player-score-entries').append($playerKillHitCount);
          $('#player-score-entries').append($playerCenterKillHitCount);
        });
    }
  }
}
