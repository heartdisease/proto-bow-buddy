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

import './styles/main.scss';
import '../node_modules/materialize-css/dist/css/materialize.min.css';

export interface Player {
  readonly pid: number;
  name: string;
  email: string;
}

export interface PlayerWithScore extends Player {
  readonly score?: string;
}

export interface Course {
  readonly cid: number;
  name: string;
  place: string;
  geolocation: string;
  stations: number;
}

export interface Game {
  readonly gid: number;
  readonly cid: number;
  readonly pids: number[];
  starttime: string; // new Date().toISOString() = ISO 8601 (UTC)
  endtime: string; // new Date().toISOString() = ISO 8601 (UTC)
}

export interface Score {
  readonly sid: number;
  readonly gid: number;
  readonly pid: number;
  station: number;
  score: string; // format: 'first-turn:body-hit' OR 'miss'
}

export interface TotalScoreForGame {
  readonly players: Player[];
  readonly scores: Map<number, string[]>;
}

export class Application {
  private static readonly VERSION = '2.8.0';

  private static storage?: DbAccess;
  private static currentView?: BaseView;

  static initApplication(): void {
    Application.updateWindowTitle('');

    console.info('Application starting...');

    window.addEventListener('hashchange', e => Application.onHashChange(window.location.hash.split(';')));
    Application.onHashChange(window.location.hash.split(';'));
  }

  static getStorage(): DbAccess {
    if (!Application.storage) {
      Application.storage = new DbAccess();
    }
    return Application.storage;
  }

  static getVersion(): string {
    return Application.VERSION;
  }

  static updateWindowTitle(viewTitle: string): void {
    document.title = `BowBuddy ${Application.VERSION}${viewTitle ? ' - ' + viewTitle : ''}`;
  }

  static getUrlParams(): Readonly<Map<string, string | number>> {
    if (!window.location.hash) {
      return Object.freeze(new Map<string, string | number>());
    }
    const numRegExp = /^(0|-?[1-9][0-9]*)$/;
    const urlParams = Object.freeze(
      window.location.hash
        .substring(1) // omit the # at the beginning
        .split(';')
        .map(keyValueStr => keyValueStr.split('='))
        .reduce((urlParams, keyValuePair) => {
          const key = keyValuePair[0];
          const value = keyValuePair[1];

          urlParams.set(key, numRegExp.test(value) ? +value : value);
          return urlParams;
        }, new Map<string, string | number>())
    );
    return urlParams;
  }

  static getDuration(starttime: string, endtime: string): string {
    const startDate = new Date(starttime);
    const endDate = new Date(endtime);
    const diffInMs = endDate.getTime() - startDate.getTime();
    let duration = '';

    if (diffInMs < 0) {
      throw new Error('Start time is after end time!');
    }
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMinutes / 60);

    if (diffInHours >= 1) {
      duration += diffInHours + 'h ';
    }
    duration += diffInMinutes - diffInHours * 60 + 'm';
    return duration;
  }

  private static onHashChange(params: string[]): void {
    const viewToken = params[0];
    const view = Application.createViewForToken(viewToken);

    if (this.currentView) {
      this.currentView.destroyView();
    }
    this.currentView = view;

    Application.updateWindowTitle(view.getTitle());
    view.initView();
  }

  private static createViewForToken(viewToken: string): BaseView {
    switch (viewToken) {
      case '':
      case '#main-menu':
        return new MainMenuView();
      case '#new-game':
        return new NewGameView();
      case '#station-select-player':
        return new StationSelectPlayerView();
      case '#station-set-score':
        return new StationSetScoreView();
      case '#final-score':
        return new FinalScoreView();
      case '#hall-of-fame':
        return new HallOfFameView();
      default:
        console.warn(`Unknown place: ${viewToken}`);
        return new MainMenuView();
    }
  }
}

Application.initApplication();
