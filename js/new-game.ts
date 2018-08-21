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

export class NewGameView {
  private playerConfigured = false;
  private courseConfigured = false;
  private existingPlayers = [];
  private existingCourses = [];
  private configuredPlayers = [];

  public init() {
    BowBuddy.updateWindowTitle(BowBuddy.getVersion());

    let lockPlayerDropdown = false;
    let lockCourseDropdown = false;

    const urlParams = BowBuddy.getUrlParams();

    this.updatePlayerSelectionMenu();
    this.updateCourseSelectionMenu();

    $("#new-player-name")
      .on("focus", e => (lockPlayerDropdown = true))
      .on("blur", e => (lockPlayerDropdown = false))
      .on("keyup", e => this.verifyPlayerInput());
    $("#new-course-name")
      .on("focus", e => (lockCourseDropdown = true))
      .on("blur", e => (lockCourseDropdown = false))
      .on("keyup", e => this.verifyCourseInput());
    $("#new-course-no-of-stations")
      .on("focus", e => (lockCourseDropdown = true))
      .on("blur", e => (lockCourseDropdown = false))
      .on("keyup", e => this.verifyCourseInput());

    $("#add-player-btn").on("click", e => {
      const playerName = $("#new-player-name").val();

      $(".player-dropdown").addClass("disabled"); // TODO what is this doing?
      BowBuddy.getStorage()
        .addPlayer(playerName, "")
        .then(player => this.addPlayerToTable(player));
    });
    $("#set-course-btn").on("click", e => {
      const courseName = $("#new-course-name").val();
      const noOfStations = $("#new-course-no-of-stations").val();

      $(".course-dropdown").addClass("disabled"); // TODO what is this doing?
      BowBuddy.getStorage()
        .addCourse(courseName, "", "", noOfStations)
        .then(course => this.addCourseToTable(course));
    });

    $(".player-dropdown").on("hide.bs.dropdown", e => {
      console.info("hide player dropdown");
      if (lockPlayerDropdown) {
        e.preventDefault();
      } else {
        $("#new-player-name").val("");
        $("#add-player-btn").attr("disabled", "disabled");
      }
    });
    $(".course-dropdown").on("hide.bs.dropdown", e => {
      console.info("hide course dropdown");
      if (lockCourseDropdown) {
        e.preventDefault();
      } else {
        $("#new-course-name").val("");
        $("#new-course-no-of-stations").val("");
        $("#set-course-btn").attr("disabled", "disabled");
      }
    });

    $("#start-game-btn").on("click", e => {
      let cid;
      let pids = [];

      $("#start-game-btn").attr("disabled", "disabled"); // disable button while async db action is running

      cid = +$("#course-entries > tr[data-cid]").attr("data-cid");
      $("#player-entries > tr[data-pid]").each(function() {
        pids.push(+$(this).attr("data-pid"));
      });

      BowBuddy.getStorage()
        .addGame(cid, pids)
        .then(game => {
          window.location.href = "station-select-player.html#gid=" + game.gid + ";station=1";
        });
    });
  }

  public addPlayerToTable(player) {
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

  public addCourseToTable(course) {
    $("#course-entries")
      .empty()
      .append(
        $("<tr/>")
          .attr("data-cid", course.cid)
          .append($("<td/>").text(course.name), $("<td/>").text(course.place || "-"), $("<td/>").text(course.stations))
      );

    this.updateCourseSelectionMenu(course);
    this.courseConfigured = true;
    if (this.playerConfigured && this.courseConfigured) {
      $("#start-game-btn").removeAttr("disabled");
    }
  }

  public updatePlayerSelectionMenu(excludedPlayers = undefined) {
    BowBuddy.getStorage()
      .getPlayers()
      .then(players => {
        const $playerMenu = $(".player-dropdown > .dropdown-menu");

        this.existingPlayers = players;
        $playerMenu.find("li[data-pid]").remove();
        players.reverse().forEach(player => {
          if (
            excludedPlayers !== undefined &&
            excludedPlayers.some(excludedPlayer => excludedPlayer.pid === player.pid)
          ) {
            return;
          }

          const $playerEntry = $("<li/>")
            .attr("data-pid", player.pid)
            .append(
              $("<a/>")
                .on("click", e => {
                  $playerEntry.remove();
                  this.addPlayerToTable(player);
                })
                .text(player.name)
            );

          $playerMenu.prepend($playerEntry);
        });
      });
  }

  public updateCourseSelectionMenu(excludedCourse = undefined) {
    BowBuddy.getStorage()
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

  public verifyPlayerInput() {
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

  public verifyCourseInput() {
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
