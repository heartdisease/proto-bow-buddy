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
    private existingPlayers: Array<Player> = [];
    private existingCourses: Array<Course> = [];
    private configuredPlayers: Array<Player> = [];
    private configuredCourse: Course;
    private collapsibleElement: HTMLElement;
    private playerSelectElement: HTMLElement;
    private courseSelectElement: HTMLElement;

    getTemplateLocator(): string {
      return "#new-game-template";
    }

    onReveal(urlParams: Readonly<Map<string, string | number>>): void {
      const viewElement = document.querySelector("#main");

      this.collapsibleElement = viewElement.querySelector(".collapsible");
      this.playerSelectElement = viewElement.querySelector("select#player-select");
      this.courseSelectElement = viewElement.querySelector("select#course-select");

      Promise.all([this.updatePlayerSelectionMenu(), this.updateCourseSelectionMenu()]).then(nil => {
        this.initControls();
        this.registerEventHandlers();
      });

      console.info("NewGameView.onReveal()");
    }

    onHide(): void {
      M.Collapsible.getInstance(this.collapsibleElement).destroy();
      M.FormSelect.getInstance(this.playerSelectElement).destroy();
      M.FormSelect.getInstance(this.courseSelectElement).destroy();

      console.info("NewGameView.onHide()");
    }

    private initControls(): void {
      M.Collapsible.init(this.collapsibleElement, {});
      M.FormSelect.init(this.playerSelectElement, {});
      M.FormSelect.init(this.courseSelectElement, {});
    }

    private registerEventHandlers(): void {
      this.registerPlayerSelectEventHandlers();
      this.registerCourseSelectEventHandlers();

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
          .then(game => (window.location.href = "#station-select-player;gid=" + game.gid + ";station=1"));

        e.preventDefault();
      });
    }

    private registerPlayerSelectEventHandlers(): void {
      const $playerSelect = $(this.playerSelectElement);

      $playerSelect.off("change").on("change", e => {
        const pid = (<HTMLSelectElement>e.target).value;
        const $playerOption = $playerSelect.find('option[value="' + pid + '"]');

        console.log("pid change: " + pid);

        if (pid === "new") {
          $("#select-player-container").hide();
          $("#add-player-container").show();
        } else {
          this.addPlayerToTable($playerOption.data("player"));
        }
      });
      $("#new-player-name")
        .off("keyup")
        .on("keyup", e => this.verifyPlayerInput());
      $("#add-player-btn")
        .off("click")
        .on("click", e => {
          const playerName = $("#new-player-name").val();

          $("#new-player-name").val("");
          $("#add-player-btn").attr("disabled", "disabled");

          Application.getStorage()
            .addPlayer(playerName, "")
            .then(player => {
              this.addPlayerToTable(player);

              $playerSelect.off("change"); // deregister handler first, because invalid option is default selection
              M.FormSelect.getInstance(this.playerSelectElement).destroy();

              window.setTimeout(() => {
                this.updatePlayerSelectionMenu().then(nil => {
                  // re-init widget
                  M.FormSelect.init(this.playerSelectElement, {});

                  this.registerPlayerSelectEventHandlers();

                  $("#add-player-container").hide();
                  $("#select-player-container").show();
                });
              }, 500); // TODO is this random delay even necessary?
            });

          e.preventDefault();
        });
    }

    private registerCourseSelectEventHandlers(): void {
      const $courseSelect = $(this.courseSelectElement);

      $courseSelect.off("change").on("change", e => {
        const cid = (<HTMLSelectElement>e.target).value;
        const $courseOption = $courseSelect.find('option[value="' + cid + '"]');

        if (cid === "new") {
          $("#select-course-container").hide();
          $("#add-course-container").show();
        } else {
          const course = $courseOption.data("course");

          this.addCourseToTable(course);

          M.FormSelect.getInstance(this.courseSelectElement).destroy();
          $courseSelect.find('option[value="' + cid + '"]').remove();
          $courseSelect.find('option[value=""]').attr("selected", "selected");
          M.FormSelect.init(this.courseSelectElement, {}); // re-init widget
        }
      });
      $("#new-course-name")
        .off("keyup")
        .on("keyup", e => this.verifyCourseInput());
      $("#new-course-no-of-stations")
        .off("keyup")
        .on("keyup", e => this.verifyCourseInput());
      $("#set-course-btn")
        .off("click")
        .on("click", e => {
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
              $("#course-select")
                .find('option[value=""]')
                .select();
            });

          e.preventDefault();
        });
    }

    private addPlayerToTable(player: Player): void {
      $("#player-entries").append(
        $("<tr/>")
          .attr("data-pid", player.pid)
          .append($("<td/>").text(player.name), $("<td/>").text(player.email || "-"), $("<td/>").text("-"))
      );

      this.configuredPlayers.push(player);

      if (this.isPlayerConfigured() && this.isCourseConfigured()) {
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

      this.configuredCourse = course;

      if (this.isPlayerConfigured() && this.isCourseConfigured()) {
        $("#start-game-btn").removeAttr("disabled");
      }
    }

    private updatePlayerSelectionMenu(): Promise<void> {
      const $playerSelect = $(this.playerSelectElement);

      $playerSelect.empty();

      return Application.getStorage()
        .getPlayers()
        .then(players => {
          const $defaultOption = $("<option/>").text("Choose player");

          this.existingPlayers = players;

          $playerSelect.append($defaultOption).append(
            $("<option/>")
              .val("new")
              .text("New player...")
          );

          players
            .filter(player => !this.configuredPlayers.some(excludedPlayer => excludedPlayer.pid === player.pid))
            .reverse()
            .forEach(player => {
              $playerSelect.append(
                $("<option/>")
                  .attr("value", player.pid)
                  .data("player", player)
                  .text(player.name)
              );
            });

          $defaultOption.attr("selected", "selected").attr("disabled", "disabled");

          console.log("Rebuilt player selection menu.");
        })
        .catch(e => console.error(e));
    }

    private updateCourseSelectionMenu(): Promise<void> {
      const $courseSelect = $(this.courseSelectElement);

      $courseSelect.empty();

      return Application.getStorage()
        .getCourses()
        .then(courses => {
          this.existingCourses = courses;

          $courseSelect.append(
            $("<option/>")
              .attr("disabled", "disabled")
              .attr("selected", "selected")
              .text("Choose course")
          );
          $courseSelect.append(
            $("<option/>")
              .val("new")
              .text("New course...")
          );

          courses
            .filter(course => this.configuredCourse && this.configuredCourse.cid === course.cid)
            .reverse()
            .forEach(course => {
              $courseSelect.append(
                $("<option/>")
                  .attr("value", course.cid)
                  .data("course", course)
                  .text(course.name + " (" + course.stations + ")")
              );
            });
        })
        .catch(e => console.error(e));
    }

    private isPlayerConfigured(): boolean {
      return this.configuredPlayers.length > 0;
    }

    private isCourseConfigured(): boolean {
      return this.configuredCourse !== undefined;
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
