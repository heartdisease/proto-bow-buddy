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
import { Game, Application, Player } from '../main';
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

        $('#course-duration').html(`${duration}<br/>(${from} - ${to})`);
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
    ScoreUtils.generateScoreTable(gid, stations).then((totalScore: TotalScore) => {
      const players = totalScore.totalScoreForGame.players;
      const scores = totalScore.totalScoreForGame.scores;
      const playerScores = totalScore.playerScores;

      players.forEach((player: Player) => {
        $('#player-header-row').append($('<th/>').text(player.name));
      });

      for (let station = 1; station <= stations; station++) {
        const $playerScoreEntry = $('<tr/>');

        $playerScoreEntry.append(
          $('<td/>')
            .css('font-style', 'italic')
            .text(`${station}.`)
        );
        players
          .map(player => scores.get(player.pid)!)
          .forEach(scores => {
            $playerScoreEntry.append($('<td/>').text(ScoreUtils.scoreToPoints(scores[station - 1])));
          });
        $('#player-score-entries').append($playerScoreEntry);
      }

      this.sumUpScore($('#player-score-entries'), playerScores);
      this.generateLeaderBoard(playerScores);
    });
  }

  private sumUpScore($playerScoreEntires: JQuery<JQuery.Node>, playerScores: PlayerScore[]): void {
    const $playerTotalScore = $('<tr/>')
      .css('font-weight', 'bold')
      .append($('<td/>').text('Total:'));
    const $playerAverageScore = $('<tr/>')
      .css('font-style', 'italic')
      .append($('<td/>').text('Average:'));
    const $playerMissCount = $('<tr/>')
      .css('font-style', 'italic')
      .append($('<td/>').text('Miss:'));
    const $playerBodyHitCount = $('<tr/>')
      .css('font-style', 'italic')
      .append($('<td/>').text('Body:'));
    const $playerKillHitCount = $('<tr/>')
      .css('font-style', 'italic')
      .append($('<td/>').text('Kill:'));
    const $playerCenterKillHitCount = $('<tr/>')
      .css('font-style', 'italic')
      .append($('<td/>').text('Center Kill:'));

    playerScores.forEach((playerScore: PlayerScore) => {
      $playerTotalScore.append($('<td/>').text(playerScore.totalScore));
      $playerAverageScore.append($('<td/>').text(playerScore.averageScore));
      $playerMissCount.append($('<td/>').html(`${playerScore.missCount}&times;`));
      $playerBodyHitCount.append($('<td/>').html(`${playerScore.bodyHitCount}&times;`));
      $playerKillHitCount.append($('<td/>').html(`${playerScore.killHitCount}&times;`));
      $playerCenterKillHitCount.append($('<td/>').html(`${playerScore.centerKillHitCount}&times;`));
    });

    $playerScoreEntires.append($playerTotalScore);
    $playerScoreEntires.append($playerAverageScore);
    $playerScoreEntires.append($playerMissCount);
    $playerScoreEntires.append($playerBodyHitCount);
    $playerScoreEntires.append($playerKillHitCount);
    $playerScoreEntires.append($playerCenterKillHitCount);
  }

  private generateLeaderBoard(playerScores: PlayerScore[]): void {
    playerScores
      .sort((a, b) => b.totalScore - a.totalScore)
      .forEach((playerScore, index) => {
        // TODO replace all ID selectors with classes
        $('#leaderboard').append(
          $('<li/>')
            .addClass('collection-item avatar')
            .append(
              this.createLeaderBoardBadge(index + 1),
              $('<span/>')
                .addClass('title')
                .text(playerScore.playerName),
              $('<p/>').html(`<b>Total score</b>: ${playerScore.totalScore} (Average: ${playerScore.averageScore})`),
              $('<p/>').html(`<b>Miss</b>: ${playerScore.missCount}&times;`)
            )
        );
      });
  }

  private createLeaderBoardBadge(place: number): JQuery<JQuery.Node> {
    if (place < 1) {
      throw new Error('Invalid place: ' + place);
    }

    switch (place) {
      case 1:
        return $('<div/>')
          .addClass('leaderboard-badge first-place amber accent-3')
          .html('<span>1<sup>st</sup></span>');
      case 2:
        return $('<div/>')
          .addClass('leaderboard-badge second-place blue-grey lighten-3')
          .html('<span>2<sup>nd</sup></span>');
      case 3:
        return $('<div/>')
          .addClass('leaderboard-badge third-place deep-orange darken-3')
          .html('<span>3<sup>rd</sup></span>');
      default:
        return $('<div/>')
          .addClass('leaderboard-badge grey darken-4')
          .html(`<span>${place}<sup>th</sup></span>`);
    }
  }
}
