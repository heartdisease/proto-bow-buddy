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
/// <reference path ="../node_modules/@types/jquery/index.d.ts"/>
/// <reference path="./main.ts" />

namespace BowBuddy {
  export class StationSelectPlayerView {
    public reset() {
      $("nav.navbar").off("click");
      $("#back-btn").off("click");

      $("#next-station-btn")
        .off("click")
        .attr("disabled", "disabled")
        .html('<span class="glyphicon glyphicon-chevron-right" aria-hidden="true"></span> Next station');
      $("#quick-assign-btn")
        .off("click")
        .attr("disabled", "disabled");

      $("#player-selection-list").empty();
    }

    public init() {
      const urlParams = Application.getUrlParams();

      Application.updateWindowTitle(Application.getVersion());
      window.addEventListener("popstate", popstateEvent => this.loadView());

      $("#back-btn").on("click", e => {
        e.preventDefault();

        if (+urlParams.get("station") > 1) {
          this.pushState("#gid=" + urlParams.get("gid") + ";station=" + (+urlParams.get("station") - 1));
        } else {
          const result = window.confirm("Do you really want to go back to the game menu? All progess will be lost!");

          if (result) {
            // TODO actually delete all scores for current game!
            window.location.href = "new-game.html";
          }
        }
      });
      $("#station-no").text(urlParams.get("station"));

      Application.getStorage()
        .getCourseForGame(urlParams.get("gid"))
        .then(course => {
          if (urlParams.get("station") >= course.stations) {
            $("#next-station-btn")
              .html('<span class="glyphicon glyphicon-ok" aria-hidden="true"></span> Finish course')
              .on("click", e => {
                e.preventDefault();
                window.location.href = "final-score.html#gid=" + urlParams.get("gid");
              });
          } else {
            $("#next-station-btn").on("click", e => {
              e.preventDefault();
              this.pushState("#gid=" + urlParams.get("gid") + ";station=" + (+urlParams.get("station") + 1));
            });
          }

          Application.getStorage()
            .getPlayersWithScore(urlParams.get("gid"), urlParams.get("station"))
            .then(players => {
              const $playerSelectionList = $("#player-selection-list");
              let playersWithScore = 0;

              if (players.length === 0) {
                throw new Error("Cannot load players!");
              }

              $("#quick-assign-btn").on("click", e => {
                const qaParam =
                  players.length > 1
                    ? ";qa=" +
                      players
                        .slice(1)
                        .map(p => p.pid)
                        .join("+")
                    : "";

                e.preventDefault();
                window.location.href =
                  "station-set-score.html#gid=" +
                  urlParams.get("gid") +
                  ";pid=" +
                  players[0].pid +
                  qaParam +
                  ";station=" +
                  urlParams.get("station");
              });

              players.forEach(player => {
                const $playerEntry = $("<a/>")
                  .addClass("btn btn-default")
                  .attr(
                    "href",
                    "station-set-score.html#gid=" +
                      urlParams.get("gid") +
                      ";pid=" +
                      player.pid +
                      ";station=" +
                      urlParams.get("station")
                  )
                  .attr("role", "button")
                  .text(player.name + " "); // add space separator here for score badge

                if (player.score) {
                  const $scoreBadge = $("<span/>").addClass("badge");

                  playersWithScore++;

                  if (player.score === "miss") {
                    $scoreBadge.html("Miss&nbsp;&nbsp;&nbsp;(+0)");
                  } else {
                    $scoreBadge.html(
                      Application.scoreToDisplayName(player.score) +
                        "&nbsp;&nbsp;&nbsp;(+" +
                        Application.scoreToPoints(player.score) +
                        ")"
                    );
                  }
                  $playerEntry.append($scoreBadge);
                }

                $playerSelectionList.append($playerEntry);
              });

              if (playersWithScore === players.length) {
                $("#next-station-btn").removeAttr("disabled");
              } else if (playersWithScore === 0) {
                $("#quick-assign-btn").removeAttr("disabled"); // enable quick-assign only when no player has a score yet
              }
            });
        });
    }

    public loadView() {
      this.reset();
      this.init();
    }

    public pushState(url) {
      console.log("pushState: " + url);
      window.history.pushState(null, null, url);
      this.loadView();
    }
  }
}
