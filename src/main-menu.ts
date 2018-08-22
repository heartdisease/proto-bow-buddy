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
  export class MainMenuView {
    private loadTemplate(): void {
      const viewContainer = document.querySelector("#main");
      const template = <HTMLTemplateElement>document.querySelector("#main-menu-template");
      const clone = document.importNode(template.content, true);

      viewContainer.appendChild(clone);
    }

    public init(): void {
      Application.updateWindowTitle(Application.getVersion());
      this.loadTemplate();

      $(".app-logo > h1").text(document.title);

      // jQuery Plugin Initialization
      $(document).ready(() => $(".modal").modal());

      let logoCounter = 0;
      let quitCounter = 0;

      $(".app-logo")
        // TODO save fullscreen-flag in sessionStorage so other views act accordingly!
        .on("click", Application.switchToFullscreenFunc())
        .on("click", e => {
          if (++logoCounter % 2 === 0) {
            Application.getStorage()
              .dump()
              .then(dbObject => {
                const dbDump = JSON.stringify(dbObject);
                const $textarea = $("#db-dump-modal textarea").val(dbDump);

                $("#copy-json-btn").on("click", e => {
                  $textarea.select();

                  try {
                    if (!document.execCommand("copy")) {
                      throw new Error("execCommand copy could not be executed");
                    }
                  } catch (e) {
                    console.error(e.message);
                  }
                });

                $("#update-db-btn").on("click", e => {
                  if (window.confirm("Do you want to rewrite the entire database with input JSON?")) {
                    Application.getStorage()
                      .importDb(JSON.parse(<string>$textarea.val()))
                      .then(() => window.alert("Database successfully imported!"))
                      .catch(error => console.error(error));
                  }
                });

                console.log("BowBuddyDb dump:");
                console.log(dbObject); // show db object in console for close inspection

                $("#db-dump-modal").modal("open");
                window.setTimeout(() => $textarea.select(), 500);
              });
          }
        });
      $("#quit-btn").on("click", e => {
        if (++quitCounter % 4 === 0 && window.confirm("Are you sure you want to erase the entire database?")) {
          Application.getStorage()
            .erase()
            .then(e => {
              $("#delete-db-modal .modal-msg").text("Database was successfully deleted!");
            })
            .catch(e => {
              $("#delete-db-modal .modal-msg").text("Failed to delete database!");
            })
            .then(() => {
              $("#delete-db-modal").modal("open");
            });
        }
      });
    }
  }
}
