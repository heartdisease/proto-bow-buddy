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
 * Copyright 2017-2019 Christoph Matscheko
 */
import { BaseView } from './base-view';

import '../styles/main-menu.scss';

export class MainMenuView extends BaseView {
  private logoCounter = 0;
  private quitCounter = 0;
  private dbDumpModalElement?: Element;
  private deleteDbModalElement?: Element;

  getTitle(): string {
    return '';
  }

  protected getTemplateLocator(): string {
    return '#main-menu-template';
  }

  protected getViewClassName(): string {
    return 'main-menu-view';
  }

  onReveal(urlParams: Readonly<Map<string, string | number | boolean>>): void {
    this.dbDumpModalElement = this.queryElement('.db-dump-modal')!;
    this.deleteDbModalElement = this.queryElement('.delete-db-modal')!;

    this.queryElement('.app-logo > h1').innerText = document.title;
    this.initControls();
  }

  onHide(): void {
    M.Modal.getInstance(this.dbDumpModalElement!).close();
    M.Modal.getInstance(this.dbDumpModalElement!).destroy();

    M.Modal.getInstance(this.deleteDbModalElement!).close();
    M.Modal.getInstance(this.deleteDbModalElement!).destroy();
  }

  private initControls(): void {
    M.Modal.init(this.dbDumpModalElement!, {});
    M.Modal.init(this.deleteDbModalElement!, {});

    this.queryElement('.app-logo').addEventListener('click', async e => {
      if (++this.logoCounter % 2 === 0) {
        const dbObject = await this.getStorage().dump();
        const dbDump = JSON.stringify(dbObject);
        const textarea = this.queryElement('.db-dump-modal textarea') as HTMLTextAreaElement;

        textarea.value = dbDump;

        this.queryElement('.copy-json-btn').addEventListener('click', e => {
          e.preventDefault();

          textarea.select();

          try {
            if (!document.execCommand('copy')) {
              throw new Error('execCommand copy could not be executed');
            }
          } catch (e) {
            console.error(e.message);
          }
        });

        this.queryElement('.update-db-btn').addEventListener('click', async e => {
          e.preventDefault();

          if (window.confirm('Do you want to rewrite the entire database with input JSON?')) {
            try {
              await this.getStorage().importDb(JSON.parse(textarea.value));
              window.alert('Database successfully imported!');
            } catch (error) {
              console.error(`Failed to import database: ${error.message}`);
            }
          }
        });

        this.queryElement('.upload-json-btn').addEventListener('click', async e => {
          e.preventDefault();

          if (window.confirm('Do you want to upload the entire database to the server?')) {
            const user = window.prompt('Username:') || '';
            //const password = window.prompt('Password:') || '';
            const password = 'BananaB0y';

            try {
              // bplaced seems to be having trouble with certain special characters
              const encodeAllCharacters = (str: string) => {
                let encodedStr = '';

                for (let i = 0; i < str.length; i++) {
                  encodedStr += '%' + str.charCodeAt(i).toString(16);
                }
                return encodedStr;
              };
              const response = await fetch(`sync.php?user=${user}`, {
                method: 'POST',
                cache: 'no-cache',
                headers: {
                  'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: `pw=${encodeURIComponent(password)}&db=${encodeURIComponent(dbDump)}`
              });

              if (response.ok) {
                console.log(response.json());
                window.alert('Database successfully uploaded!');
              } else {
                console.log(response.json());
                window.alert('Failed to upload database!');
              }
            } catch (error) {
              console.error(`Failed to export database to server: ${error.message}`);
            }
          }
        });

        this.queryElement('.import-server-db-btn').addEventListener('click', async e => {
          e.preventDefault();

          if (window.confirm('Do you want to import the entire database from the server?')) {
            try {
              // TODO implement
              window.alert('This feature is not yet implemented!');
            } catch (error) {
              console.error(`Failed to import database from server: ${error.message}`);
            }
          }
        });

        console.log('BowBuddyDb dump:');
        console.log(dbObject); // show db object in console for close inspection

        M.Modal.getInstance(this.dbDumpModalElement!).open();
        window.setTimeout(() => textarea.select(), 500);
      }
    });
    this.queryElement('.quit-btn').addEventListener('click', async e => {
      if (++this.quitCounter % 4 === 0 && window.confirm('Are you sure you want to erase the entire database?')) {
        const modal = this.queryElement('.delete-db-modal .modal-msg');

        try {
          await this.getStorage().erase();
          modal.innerText = 'Database was successfully deleted!';
        } catch (error) {
          modal.innerText = 'Failed to delete database!';
        }
        M.Modal.getInstance(this.deleteDbModalElement!).open();
      }
    });
  }
}
