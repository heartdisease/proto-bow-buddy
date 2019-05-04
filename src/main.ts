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
import { BaseView } from './views/base-view';
import { MainMenuView } from './views/main-menu';
import { NewGameView } from './views/new-game';
import { StationSelectPlayerView } from './views/station-select-player';
import { StationSetScoreView } from './views/station-set-score';
import { FinalScoreView } from './views/final-score';
import { HallOfFameView } from './views/hall-of-fame';
import { AppSettingsView } from './views/app-settings';

import './styles/main.scss';
import '../node_modules/materialize-css/dist/css/materialize.min.css';

interface Route {
  path: string;
  view: new () => BaseView;
}

export class Application {
  private static readonly VERSION = '2.12.3';
  private static readonly NUMBER_PATTERN = /^(?:0|-?[1-9][0-9]*)$/;
  private static readonly BOOLEAN_PATTERN = /^(?:true|false)$/i;
  private static readonly ROUTES: Route[] = [
    { path: '', view: MainMenuView },
    { path: '#main-menu', view: MainMenuView },
    { path: '#new-game', view: NewGameView },
    { path: '#station-select-player', view: StationSelectPlayerView },
    { path: '#station-set-score', view: StationSetScoreView },
    { path: '#final-score', view: FinalScoreView },
    { path: '#app-settings', view: AppSettingsView },
    { path: '#hall-of-fame', view: HallOfFameView }
  ];

  private static storage?: DbAccess;
  private static currentView?: BaseView;

  static initApplication(): void {
    Application.updateWindowTitle('');

    console.info('Application starting...');

    window.addEventListener('hashchange', e => Application.onHashChange());
    Application.onHashChange();
  }

  static getStorage(): DbAccess {
    return Application.storage || (Application.storage = new DbAccess());
  }

  private static updateWindowTitle(viewTitle: string): void {
    document.title = `BowBuddy ${Application.VERSION}${viewTitle ? ' - ' + viewTitle : ''}`;
  }

  private static onHashChange(): void {
    const params = window.location.hash.split(';');
    const viewToken = params[0];
    const view = Application.createViewForToken(viewToken);

    if (this.currentView) {
      this.currentView.destroyView();
    }
    this.currentView = view;

    Application.updateWindowTitle(view.getTitle());
    view.initView(Application.getUrlParams());
  }

  private static createViewForToken(viewToken: string): BaseView {
    const route = Application.ROUTES.find(route => route.path === viewToken);

    if (route !== undefined) {
      return new route.view();
    }
    console.warn(`Unknown route: ${viewToken}`);
    return new MainMenuView();
  }

  private static getUrlParams(): ReadonlyMap<string, string | number | boolean> {
    const urlParams = new Map<string, string | number | boolean>();

    return window.location.hash
      ? window.location.hash
          .substring(1) // omit the # at the beginning
          .split(';')
          .map(keyValueStr => keyValueStr.split('='))
          .reduce((urlParams, keyValuePair) => {
            const key = keyValuePair[0];
            const value = keyValuePair[1];

            if (Application.BOOLEAN_PATTERN.test(value)) {
              urlParams.set(key, value.toLowerCase() === 'true');
            } else if (Application.NUMBER_PATTERN.test(value)) {
              urlParams.set(key, +value);
            } else {
              urlParams.set(key, value);
            }
            return urlParams;
          }, urlParams)
      : urlParams;
  }
}

Application.initApplication();
