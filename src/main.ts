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
import { Router, Route } from './router';

import { MainMenuView } from './views/main-menu';
import { NewGameView } from './views/new-game';
import { StationSelectPlayerView } from './views/station-select-player';
import { StationSetScoreView } from './views/station-set-score';
import { FinalScoreView } from './views/final-score';
import { AppSettingsView } from './views/app-settings';
import { HallOfFameView } from './views/hall-of-fame';

import '../node_modules/materialize-css/dist/css/materialize.min.css';
import './styles/main.scss'; // tslint:disable-line:no-import-side-effect

const VERSION = '2.19.2';

const ROUTES: Route[] = [
  { path: '', view: MainMenuView },
  { path: '#main-menu', view: MainMenuView },
  { path: '#new-game', view: NewGameView },
  { path: '#station-select-player', view: StationSelectPlayerView },
  { path: '#station-set-score', view: StationSetScoreView },
  { path: '#final-score', view: FinalScoreView },
  { path: '#app-settings', view: AppSettingsView },
  { path: '#hall-of-fame', view: HallOfFameView },
];

class Application {
  private readonly router: Router;
  private readonly storage: DbAccess;

  constructor() {
    this.storage = new DbAccess();
    this.router = new Router(
      ROUTES,
      ROUTES[0],
      view => new view(this.router, this.storage, updateWindowTitle),
    );
  }

  init(): void {
    updateWindowTitle('');

    console.info('Application starting...');

    this.router.registerHandlers();
  }
}

function updateWindowTitle(viewTitle: string): void {
  document.title =
    viewTitle.length > 0
      ? `BowBuddy ${VERSION} - ${viewTitle}`
      : `BowBuddy ${VERSION}`;
}

// start up the application
const bowBuddy = new Application();
bowBuddy.init();
