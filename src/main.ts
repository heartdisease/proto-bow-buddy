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
import { DbAccess } from './db';

import '../node_modules/materialize-css/dist/css/materialize.min.css';
import './styles/main.scss'; // tslint:disable-line:no-import-side-effect
import { Router } from './router';

export class Application {
  private static readonly VERSION = '2.18.0';

  private static router: Router;
  private static storage: DbAccess;

  static initApplication(): void {
    Application.updateWindowTitle('');
    Application.router = new Router();
    Application.storage = new DbAccess();

    console.info('Application starting...');

    Application.router.registerHandlers();
  }

  static getRouter(): Router {
    return Application.router;
  }

  static getStorage(): DbAccess {
    return Application.storage;
  }

  static updateWindowTitle(viewTitle: string): void {
    const version = Application.VERSION;
    const formattedViewTitle = viewTitle.length > 0 ? ` - ${viewTitle}` : '';

    document.title = `BowBuddy ${version}${formattedViewTitle}`;
  }
}

Application.initApplication();
