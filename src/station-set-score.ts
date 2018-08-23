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
  export class StationSetScoreView {
    private loadTemplate(): void {
      const viewContainer = document.querySelector("#main");
      const template = <HTMLTemplateElement>document.querySelector("#station-set-score-template");
      const clone = document.importNode(template.content, true);
      let child;

      while ((child = viewContainer.firstChild)) {
        viewContainer.removeChild(child);
      }
      viewContainer.appendChild(clone);
    }

    public onLoad(): void {
      const urlParams = Application.getUrlParams();
      const navigationDelay = 650;

      Application.updateWindowTitle(Application.getVersion());
      this.loadTemplate();

      window.addEventListener("popstate", popstateEvent => this.loadView());

      $("#hit-draggable-container").html(
        '<a class="btn btn-info btn-lg hit" href="#" role="button" draggable="true" data-dnd="body-hit">Body</a>\
<a class="btn btn-warning btn-lg hit" href="#" role="button" draggable="true" data-dnd="kill-hit">Kill</a>\
<a class="btn btn-danger btn-lg hit" href="#" role="button" draggable="true" data-dnd="center-kill-hit">Center Kill</a>'
      );
      $("#turn-draggable-container").html(
        '<a class="btn btn-success btn-lg turn" href="#" role="button" draggable="true" data-dnd="first-turn">1<sup>st</sup></a>\
<a class="btn btn-primary btn-lg turn" href="#" role="button" draggable="true" data-dnd="second-turn">2<sup>nd</sup></a>\
<a class="btn btn-default btn-lg turn" href="#" role="button" draggable="true" data-dnd="third-turn">3<sup>rd</sup></a>'
      );

      $("#back-btn").on("click", e => {
        e.preventDefault();
        this.navigateBack(urlParams.get("gid"), urlParams.get("station"));
      });

      $("#station-no").text(urlParams.get("station"));
      Application.getStorage()
        .getPlayer(urlParams.get("pid"))
        .then(player => $("span.player-name").text(player.name));

      // TODO check if draggable and droppable are correctly reset in reset()
      (<any>$(".hit")) // explicit cast to empty to compensate the lack of a wrapper for the draggable plug-in
        .draggable({ connectWith: ".turn" })
        .droppable({ accept: ".turn", activeClass: "active", hoverClass: "dropZone" })
        .on("droppable:drop", (e, ui) => {
          console.log("URL params in hit: " + JSON.stringify(urlParams));

          this.logScore(
            urlParams,
            navigationDelay,
            e.target.getAttribute("data-dnd"),
            ui.item[0].getAttribute("data-dnd")
          );
        });

      (<any>$(".turn")) // explicit cast to empty to compensate the lack of a wrapper for the draggable plug-in
        .draggable({ connectWith: ".turn" })
        .droppable({ accept: ".hit", activeClass: "active", hoverClass: "dropZone" })
        .on("droppable:drop", (e, ui) => {
          console.log("URL params in turn: " + JSON.stringify(urlParams));

          this.logScore(
            urlParams,
            navigationDelay,
            ui.item[0].getAttribute("data-dnd"),
            e.target.getAttribute("data-dnd")
          );
        });

      $(".miss-btn").on("click", e => {
        e.preventDefault();
        this.logScore(urlParams, navigationDelay);
      });
    }

    public navigateBack(gid, station) {
      window.location.href = "#station-select-player;gid=" + gid + ";station=" + station;
    }

    public navigateToNextPlayer(gid, station, nextPid, remainingPids) {
      const qaParam = remainingPids.length > 0 ? ";qa=" + remainingPids.join("+") : "";

      this.pushState("#gid=" + gid + ";pid=" + nextPid + "" + qaParam + ";station=" + station);
      this.loadView();
    }

    public navigateNext(urlParams) {
      console.log("URL params in navigatenext: " + JSON.stringify(urlParams));

      if (urlParams.get("qa")) {
        const qaPlayers = ("" + urlParams.get("qa")).split("+"); // if qa has only one entry left it becomes an integer

        if (qaPlayers.length > 0) {
          this.navigateToNextPlayer(urlParams.get("gid"), urlParams.get("station"), qaPlayers[0], qaPlayers.slice(1));
        } else {
          throw new Error("Invalid qa parameter '" + urlParams.get("qa") + "'");
        }
      } else {
        this.navigateBack(urlParams.get("gid"), urlParams.get("station"));
      }
    }

    public getHitButton(hit) {
      switch (hit) {
        case "body-hit":
          return '<a class="btn btn-info btn-lg hit" href="#" role="button">Body</a>';
        case "kill-hit":
          return '<a class="btn btn-warning btn-lg hit" href="#" role="button">Kill</a>';
        case "center-kill-hit":
          return '<a class="btn btn-danger btn-lg hit" href="#" role="button">Center Kill</a>';
      }
    }

    public getTurnButton(turn) {
      switch (turn) {
        case "first-turn":
          return '<a class="btn btn-success btn-lg turn" href="#" role="button">1<sup>st</sup></a>';
        case "second-turn":
          return '<a class="btn btn-primary btn-lg turn" href="#" role="button">2<sup>nd</sup></a>';
        case "third-turn":
          return '<a class="btn btn-default btn-lg turn" href="#" role="button">3<sup>rd</sup></a>';
      }
    }

    public logScore(urlParams, navigationDelay, hit: string = undefined, turn: string = undefined) {
      const before = Date.now();
      const miss = hit === undefined || turn === undefined;
      const score = miss ? "miss" : turn + ":" + hit;

      $("#scoreDisplay").html(
        miss
          ? '<a class="btn btn-default btn-lg miss-btn" href="#" role="button">Miss</a>'
          : this.getTurnButton(turn) + this.getHitButton(hit)
      );
      $("#scoreModal").modal({ keyboard: false });

      Application.getStorage()
        .setScore(urlParams.get("gid"), urlParams.get("pid"), urlParams.get("station"), score)
        .then(score => {
          console.log("URL params in setScore: " + JSON.stringify(urlParams));

          const timeDiff = Date.now() - before;

          if (timeDiff >= navigationDelay) {
            this.navigateNext(urlParams);
          } else {
            window.setTimeout(() => this.navigateNext(urlParams), navigationDelay - timeDiff);
          }
        });
    }

    public reset() {
      $("#scoreModal").modal("hide");

      $("#hit-draggable-container").empty();
      $("#turn-draggable-container").empty();

      $("nav.navbar").off("click");
      $("#back-btn").off("click");

      $(".hit").off("droppable:drop");
      $(".turn").off("droppable:drop");

      $(".miss-btn").off("click");

      $("#scoreDisplay").empty();
    }

    public loadView() {
      this.reset();
      this.onLoad();
    }

    public pushState(url) {
      console.log("pushState: " + url);
      window.history.pushState(null, null, url);
      this.loadView();
    }
  }
}
