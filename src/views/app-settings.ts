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
import { UrlParameters } from '../router';

import '../styles/app-settings.scss'; // tslint:disable-line:no-import-side-effect

export class AppSettingsView extends BaseView {
  private appSettingsCollapsibleElement: Element;
  private textarea: HTMLTextAreaElement;

  protected onReveal(parameters: Readonly<UrlParameters>): void {
    this.appSettingsCollapsibleElement = this.queryElement(
      '.app-settings-collapsible',
    );
    this.textarea = this.queryElement(
      '.app-settings-collapsible textarea',
    ) as HTMLTextAreaElement;
    this.initControls();
  }

  protected onHide(): void {
    M.Collapsible.getInstance(this.appSettingsCollapsibleElement).destroy();
  }

  protected updateTitle(title?: string): void {
    super.updateTitle('App Settings');
  }

  protected getTemplateLocator(): string {
    return '#app-settings-template';
  }

  protected getViewClassName(): string {
    return 'app-settings-view';
  }

  private initControls(): void {
    const collapsible = M.Collapsible.init(this.appSettingsCollapsibleElement, {
      onOpenStart: (el: HTMLLIElement) => {
        if (el.classList.contains('import-export-json-collapsible')) {
          this.textarea.value = '';
        }
      },
      onOpenEnd: async (el: HTMLLIElement) => {
        if (el.classList.contains('import-export-json-collapsible')) {
          try {
            const dbObject = await this.getStorage().dump();
            const dbDump = JSON.stringify(dbObject);

            this.textarea.value = dbDump;
            this.textarea.select();
          } catch (error) {
            console.error(`Failed to export database: ${error.message}`);
          }
        }
      },
    });

    this.initServerSyncControls();
    this.initImportExportControls();
    this.initDeleteControls();

    collapsible.open(0);
  }

  private initServerSyncControls(): void {
    this.queryElement('.upload-json-btn').addEventListener('click', async e => {
      e.preventDefault();

      if (
        window.confirm(
          'Do you want to upload the entire database to the server?',
        )
      ) {
        const user = window.prompt('Username:') || 'anonymous';
        const password = window.prompt('Password:') || '';

        try {
          const dbObject = await this.getStorage().dump();
          const response = await uploadDatabaseToServer(
            user,
            password,
            dbObject,
          );

          if (response.ok) {
            window.alert('Database successfully uploaded!');
          } else {
            window.alert('Failed to upload database!');
          }
        } catch (error) {
          console.error(
            `Failed to export database to server: ${error.message}`,
          );
        }
      }
    });

    this.queryElement('.import-server-db-btn').addEventListener(
      'click',
      async e => {
        e.preventDefault();

        if (
          window.confirm(
            'Do you want to import the entire database from the server?',
          )
        ) {
          const user = window.prompt('Username:') || 'anonymous';

          try {
            const response = await fetchDatabaseFromServer(user);

            if (response.ok) {
              await this.getStorage().importDb(await response.json());
              window.alert('Database successfully uploaded!');
            } else {
              if (response.status === 404) {
                window.alert(
                  `Failed to import database: no database exists on server for user ${user}!`,
                );
              } else {
                window.alert('Failed to import database!');
              }
            }
          } catch (error) {
            console.error(
              `Failed to import database from server: ${error.message}`,
            );
          }
        }
      },
    );
  }

  private initImportExportControls(): void {
    this.queryElement('.copy-json-btn').addEventListener(
      'click',
      (e: Event) => {
        e.preventDefault();

        this.textarea.select();

        try {
          if (!document.execCommand('copy')) {
            throw new Error('execCommand copy could not be executed');
          }
        } catch (e) {
          console.error(e.message);
        }
      },
    );

    this.queryElement('.update-db-btn').addEventListener(
      'click',
      async (e: Event) => {
        e.preventDefault();

        if (
          window.confirm(
            'Do you want to rewrite the entire database with input JSON?',
          )
        ) {
          try {
            await this.getStorage().importDb(JSON.parse(this.textarea.value));
            window.alert('Database successfully imported!');
          } catch (error) {
            window.alert(`Failed to import database: ${error.message}`);
          }
        }
      },
    );
  }

  private initDeleteControls(): void {
    this.queryElement('.quit-btn').addEventListener('click', async e => {
      if (
        window.confirm('Are you sure you want to erase the entire database?')
      ) {
        try {
          await this.getStorage().erase();
          window.alert('Database was successfully deleted!');
        } catch (error) {
          window.alert('Failed to delete database!');
        }
      }
    });
  }
}

async function fetchDatabaseFromServer(user: string): Promise<Response> {
  return fetch(`./sync/${user}/latest.json`, { cache: 'no-cache' });
}

async function uploadDatabaseToServer(
  user: string,
  password: string,
  dbObject: any,
): Promise<Response> {
  const dbDump = JSON.stringify(dbObject);

  return fetch(`sync.php?user=${user}`, {
    method: 'POST',
    cache: 'no-cache',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: `pw=${encodeURIComponent(password)}&db=${encodeURIComponent(dbDump)}`,
  });
}
