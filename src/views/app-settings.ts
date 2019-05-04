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

import '../styles/app-settings.scss';

export class AppSettingsView extends BaseView {
  private deleteDbModalElement?: Element;
  private dbDumpModalListeners: { [key: string]: (e: Event) => any } = {};

  getTitle(): string {
    return 'App Settings';
  }

  protected getTemplateLocator(): string {
    return '#app-settings-template';
  }

  protected getViewClassName(): string {
    return 'app-settings-view';
  }

  onReveal(parameters: ReadonlyMap<string, string | number | boolean>): void {
    this.deleteDbModalElement = this.queryElement('.delete-db-modal')!;
    this.initControls();
  }

  onHide(): void {
    M.Modal.getInstance(this.deleteDbModalElement!).close();
    M.Modal.getInstance(this.deleteDbModalElement!).destroy();
  }

  private addDbDumpModalListener(btnIdentifier: string, listener: (e: Event) => any): void {
    const element = this.queryElement('.' + btnIdentifier);

    if (this.dbDumpModalListeners[btnIdentifier]) {
      element.removeEventListener('click', this.dbDumpModalListeners[btnIdentifier]);
    }
    this.dbDumpModalListeners[btnIdentifier] = listener;
    element.addEventListener('click', listener);
  }

  private async initControls(): Promise<void> {
    M.Modal.init(this.deleteDbModalElement!, {});

    const dbObject = await this.getStorage().dump();
    const dbDump = JSON.stringify(dbObject);
    const textarea = this.queryElement('.app-settings textarea') as HTMLTextAreaElement;

    textarea.value = dbDump;

    this.addDbDumpModalListener('copy-json-btn', (e: Event) => {
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

    this.addDbDumpModalListener('update-db-btn', async e => {
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

    this.addDbDumpModalListener('upload-json-btn', async e => {
      e.preventDefault();

      if (window.confirm('Do you want to upload the entire database to the server?')) {
        const user = window.prompt('Username:') || 'anonymous';
        const password = window.prompt('Password:') || '';

        try {
          const response = await fetch(`sync.php?user=${user}`, {
            method: 'POST',
            cache: 'no-cache',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: `pw=${encodeURIComponent(password)}&db=${encodeURIComponent(dbDump)}`
          });

          if (response.ok) {
            window.alert('Database successfully uploaded!');
          } else {
            console.log(response.status + ' ' + response.statusText);
            window.alert('Failed to upload database!');
          }
        } catch (error) {
          console.error(`Failed to export database to server: ${error.message}`);
        }
      }
    });

    this.addDbDumpModalListener('import-server-db-btn', async e => {
      e.preventDefault();

      if (window.confirm('Do you want to import the entire database from the server?')) {
        const user = window.prompt('Username:') || 'anonymous';

        try {
          const response = await fetch(`./sync/${user}/latest.json`, { cache: 'no-cache' });

          if (response.ok) {
            await this.getStorage().importDb(await response.json());
            window.alert('Database successfully uploaded!');
          } else {
            console.log(response.status + ' ' + response.statusText);

            if (response.status === 404) {
              window.alert(`Failed to import database: no database exists on server for user ${user}!`);
            } else {
              window.alert('Failed to import database!');
            }
          }
        } catch (error) {
          console.error(`Failed to import database from server: ${error.message}`);
        }
      }
    });

    this.queryElement('.quit-btn').addEventListener('click', async e => {
      if (window.confirm('Are you sure you want to erase the entire database?')) {
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

    window.setTimeout(() => textarea.select(), 500);
  }
}
