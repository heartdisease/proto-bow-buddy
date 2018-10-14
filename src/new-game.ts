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
/// <reference path="./base-view.ts" />
/// <reference path="./main.ts" />

namespace BowBuddy {
  export class NewGameView extends BaseView {
    private playerConfigured = false;
    private courseConfigured = false;
    private existingPlayers = [];
    private existingCourses = [];
    private configuredPlayers = [];

    getTemplateLocator(): string {
      return "#new-game-template";
    }

    onReveal(urlParams: Readonly<Map<string, string | number>>): void {
      $("#main .collapsible").collapsible();
      $("#main select").formSelect();

      this.registerEventHandlers();

      this.updatePlayerSelectionMenu();
      this.updateCourseSelectionMenu();
    }

    private registerEventHandlers(): void {
      $("#player-dropdown").on("change", e => {
        const pid = (<HTMLSelectElement>e.target).value;
        const $playerDropdown = $("#player-dropdown");
        const $playerOption = $playerDropdown.find("option[value=" + pid + "]");

        if (pid === "new") {
          $("#select-player-container").hide();
          $("#add-player-container").show();
        } else {
          const player = $playerOption.data("player");

          this.addPlayerToTable(player);

          $playerDropdown.find("option[value=" + pid + "]").remove();
          $playerDropdown.find('option[value=""]').select();
          $playerDropdown.formSelect(); // re-init widget
        }
      });
      $("#new-player-name").on("keyup", e => this.verifyPlayerInput());
      $("#add-player-btn").on("click", e => {
        const playerName = $("#new-player-name").val();

        $("#new-player-name").val("");
        $("#add-player-btn").attr("disabled", "disabled");

        Application.getStorage()
          .addPlayer(playerName, "")
          .then(player => {
            this.addPlayerToTable(player);
            $("#add-player-container").hide();
            $("#select-player-container").show();
            $("#player-dropdown").find('option[value=""]').select();
          });

        e.preventDefault();
      });

      $("#course-dropdown").on("change", e => {
        const cid = (<HTMLSelectElement>e.target).value;
        const $courseDropdown = $("#course-dropdown");
        const $courseOption = $courseDropdown.find("option[value=" + cid + "]");

        if (cid === "new") {
          $("#select-course-container").hide();
          $("#add-course-container").show();
        } else {
          const course = $courseOption.data("course");

          this.addCourseToTable(course);

          $courseDropdown.find("option[value=" + cid + "]").remove();
          $courseDropdown.find('option[value=""]').select();
          $courseDropdown.formSelect(); // re-init widget
        }
      });
      $("#new-course-name").on("keyup", e => this.verifyCourseInput());
      $("#new-course-no-of-stations").on("keyup", e => this.verifyCourseInput());
      $("#set-course-btn").on("click", e => {
        const courseName = $("#new-course-name").val();
        const noOfStations = $("#new-course-no-of-stations").val();

        $("#new-course-name").val("");
        $("#new-course-no-of-stations").val("");
        $("#set-course-btn").attr("disabled", "disabled");

        Application.getStorage()
          .addCourse(courseName, "", "", noOfStations)
          .then(course => {
            this.addCourseToTable(course);
            $("#add-course-container").hide();
            $("#select-course-container").show();
            $("#course-dropdown").find('option[value=""]').select();
          });

        e.preventDefault();
      });

      $("#start-game-btn").on("click", e => {
        let cid;
        let pids = [];

        $("#start-game-btn").attr("disabled", "disabled"); // disable button while async db action is running

        cid = +$("#course-entries > tr[data-cid]").attr("data-cid");
        $("#player-entries > tr[data-pid]").each(function() {
          pids.push(+$(this).attr("data-pid"));
        });

        Application.getStorage()
          .addGame(cid, pids)
          .then(game => {
            window.location.href = "#station-select-player;gid=" + game.gid + ";station=1";
          });
      });
    }

    private addPlayerToTable(player: Player): void {
      $("#dummy-player-entry").remove();
      $("#player-entries").append(
        $("<tr/>")
          .attr("data-pid", player.pid)
          .append($("<td/>").text(player.name), $("<td/>").text(player.email || "-"), $("<td/>").text("-"))
      );

      this.configuredPlayers.push(player);
      this.updatePlayerSelectionMenu(this.configuredPlayers);
      this.playerConfigured = true;
      if (this.playerConfigured && this.courseConfigured) {
        $("#start-game-btn").removeAttr("disabled");
      }
    }

    private addCourseToTable(course: Course): void {
      $("#course-entries")
        .empty()
        .append(
          $("<tr/>")
            .attr("data-cid", course.cid)
            .append(
              $("<td/>").text(course.name),
              $("<td/>").text(course.place || "-"),
              $("<td/>").text(course.stations)
            )
        );

      this.updateCourseSelectionMenu(course);
      this.courseConfigured = true;
      if (this.playerConfigured && this.courseConfigured) {
        $("#start-game-btn").removeAttr("disabled");
      }
    }

    private updatePlayerSelectionMenu(excludedPlayers: Array<Player> = undefined): void {
      Application.getStorage()
        .getPlayers()
        .then(players => {
          const $playerMenu = $("#player-dropdown");

          this.existingPlayers = players;

          //$playerMenu.find('option:not([value=""]), option:not([value="new"])').remove();
          players.reverse().forEach(player => {
            if (
              excludedPlayers === undefined ||
              !excludedPlayers.some(excludedPlayer => excludedPlayer.pid === player.pid)
            ) {
              const $playerEntry = $("<option/>")
                .attr("value", player.pid)
                .data("player", player)
                .text(player.name);

              $playerMenu.append($playerEntry);
            }
          });

          $playerMenu.formSelect(); // re-init widget
        });
    }

    private updateCourseSelectionMenu(excludedCourse: Course = undefined): void {
      Application.getStorage()
        .getCourses()
        .then(courses => {
          const $courseMenu = $(".course-dropdown > .dropdown-menu");

          this.existingCourses = courses;
          $courseMenu.find("li[data-cid]").remove();
          courses.reverse().forEach(course => {
            if (excludedCourse !== undefined && excludedCourse.cid === course.cid) {
              return;
            }

            const $courseEntry = $("<li/>")
              .attr("data-cid", course.cid)
              .append(
                $("<a/>")
                  .on("click", e => {
                    $courseEntry.remove();
                    this.addCourseToTable(course);
                  })
                  .text(course.name + " (" + course.stations + ")")
              );

            $courseMenu.prepend($courseEntry);
          });
        });
    }

    private verifyPlayerInput(): void {
      const playerName = <string>$("#new-player-name").val();

      if (
        !playerName ||
        /^\s+/.test(playerName) ||
        /\s+$/.test(playerName) ||
        this.existingPlayers.some(player => player.name === playerName)
      ) {
        $("#add-player-btn").attr("disabled", "disabled");
      } else {
        $("#add-player-btn").removeAttr("disabled");
      }
    }

    private verifyCourseInput(): void {
      const courseName = <string>$("#new-course-name").val();
      const noOfStations = <string>$("#new-course-no-of-stations").val();

      if (
        !courseName ||
        /^\s+/.test(courseName) ||
        /\s+$/.test(courseName) ||
        !noOfStations ||
        !/^[1-9][0-9]*$/.test(noOfStations) ||
        this.existingCourses.some(course => course.name === courseName)
      ) {
        $("#set-course-btn").attr("disabled", "disabled");
      } else {
        $("#set-course-btn").removeAttr("disabled");
      }
    }
  }
}
