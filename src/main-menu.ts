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
import { Application } from './main';

export class MainMenuView extends BaseView {
  private logoCounter = 0;
  private quitCounter = 0;
  private dbDumpModalElement?: Element;
  private deleteDbModalElement?: Element;

  getTemplateLocator(): string {
    return '#main-menu-template';
  }

  onReveal(urlParams: Readonly<Map<string, string | number>>): void {
    this.dbDumpModalElement = this.getViewContainer().querySelector('#db-dump-modal')!;
    this.deleteDbModalElement = this.getViewContainer().querySelector('#delete-db-modal')!;

    $('.app-logo > h1').text(document.title);
    this.initControls();

    console.info('MainMenuView.onReveal()');
  }

  onHide(): void {
    M.Modal.getInstance(this.dbDumpModalElement!).close();
    M.Modal.getInstance(this.dbDumpModalElement!).destroy();

    M.Modal.getInstance(this.deleteDbModalElement!).close();
    M.Modal.getInstance(this.deleteDbModalElement!).destroy();

    console.info('MainMenuView.onHide()');
  }

  private initControls(): void {
    M.Modal.init(this.dbDumpModalElement!, {});
    M.Modal.init(this.deleteDbModalElement!, {});

    $('.app-logo')
      // TODO save fullscreen-flag in sessionStorage so other views act accordingly!
      .on('click', Application.switchToFullscreenFunc())
      .on('click', e => {
        if (++this.logoCounter % 2 === 0) {
          this.getStorage()
            .dump()
            .then(dbObject => {
              const dbDump = JSON.stringify(dbObject);
              const $textarea = $('#db-dump-modal textarea').val(dbDump);

              $('#copy-json-btn').on('click', e => {
                $textarea.select();

                try {
                  if (!document.execCommand('copy')) {
                    throw new Error('execCommand copy could not be executed');
                  }
                } catch (e) {
                  console.error(e.message);
                }
              });

              $('#update-db-btn').on('click', e => {
                if (window.confirm('Do you want to rewrite the entire database with input JSON?')) {
                  this.getStorage()
                    .importDb(JSON.parse(<string>$textarea.val()))
                    .then(() => window.alert('Database successfully imported!'))
                    .catch(error => console.error(error));
                }
              });

              console.log('BowBuddyDb dump:');
              console.log(dbObject); // show db object in console for close inspection

              M.Modal.getInstance(this.dbDumpModalElement!).open();
              window.setTimeout(() => $textarea.select(), 500);
            });
        }
      });
    $('#quit-btn').on('click', e => {
      if (++this.quitCounter % 4 === 0 && window.confirm('Are you sure you want to erase the entire database?')) {
        this.getStorage()
          .erase()
          .then(e => {
            $('#delete-db-modal .modal-msg').text('Database was successfully deleted!');
          })
          .catch(e => {
            $('#delete-db-modal .modal-msg').text('Failed to delete database!');
          })
          .then(() => {
            M.Modal.getInstance(this.deleteDbModalElement!).open();
          });
      }
    });
  }
}
