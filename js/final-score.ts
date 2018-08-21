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
import * as $ from "jquery";
import { BowBuddy } from "main";

export class FinalScoreView {
  public init() {
    BowBuddy.updateWindowTitle(BowBuddy.getVersion());

    const urlParams = BowBuddy.getUrlParams();

    // sets timestamp for field 'endtime'
    BowBuddy.getStorage().finishGame(urlParams.get("gid")).then(game => {
      $("#course-duration").text(BowBuddy.getDuration(game.starttime, game.endtime));
    });

    BowBuddy.getStorage().getCourseForGame(urlParams.get("gid")).then(course => {
      const stations = course.stations;
      let playerNames;
      let scores = new Array(stations);
      let scoreCount = 0;

      $("#course-label").text((course.place ? course.place + " " : "") + course.name);
      $("#back-btn").on("click", e => {
        window.location.href = "station-select-player.html#gid=" + urlParams.get("gid") + ";station=" + stations;
      });

      for (let i = 1; i <= stations; i++) {
        const station = i;

        BowBuddy.getStorage().getPlayersWithScore(urlParams.get("gid"), station).then(players => {
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

  // TODO really ugly algo to sum up values... -_-'
  public generateScoreTable(playerNames, scores) {
    const $playerHeaderRow = $("#player-header-row");
    const $playerScoreEntries = $("#player-score-entries");

    playerNames.forEach(playerName => $playerHeaderRow.append($("<th/>").text(playerName)));
    scores.forEach((scoresForStation, index) => {
      let $tr = $("<tr/>");

      $tr.append(
        $("<td/>")
          .css("font-style", "italic")
          .text(index + 1 + ".")
      );
      scoresForStation.forEach(score => $tr.append($("<td/>").text(BowBuddy.scoreToPoints(score))));
      $playerScoreEntries.append($tr);
    });

    // TODO improve this by already summing up all the points when iterating over scores for the first time!
    let $sumRow = $("<tr/>")
      .addClass("info")
      .css("font-weight", "bold");
    $sumRow.append($("<td/>").html("&nbsp;")); // insert filler cell
    scores[0].forEach((score, column) => {
      $sumRow.append($("<td/>").text(scores.reduce((sum, row) => sum + BowBuddy.scoreToPoints(row[column]), 0)));
    });
    $playerScoreEntries.append($sumRow);
  }
}
