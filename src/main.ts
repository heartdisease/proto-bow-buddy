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
import { DbAccess } from './db';
import { BaseView } from './base-view';
import { MainMenuView } from './main-menu';
import { NewGameView } from './new-game';
import { StationSelectPlayerView } from './station-select-player';
import { StationSetScoreView } from './station-set-score';
import { FinalScoreView } from './final-score';

// import './styles/main.scss';
// import './styles/main-menu.scss';
// import './styles/new-game.scss';
// import './styles/station-select-player.scss';
// import './styles/station-set-score.scss';
// import './styles/final-score.scss';

export interface Player {
  readonly pid: number;
  name: string;
  email: string;
}

export interface PlayerWithScore extends Player {
  readonly score: string | undefined;
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
  readonly players: Array<Player>;
  readonly scores: Map<number, Array<string>>;
}

export class Application {
  private static readonly VERSION = '2.1.11';
  private static storage: DbAccess = null;
  private static currentView: BaseView = null;

  public static initApplication(): void {
    Application.updateWindowTitle(Application.getVersion());

    console.info('Application starting...');

    // hack for loading touch-dnd plug-in
    (<any>window).jQuery = $;
    (<any>window).require(['./touch-dnd.js'], () => {
      window.addEventListener('hashchange', e => Application.onHashChange(window.location.hash.split(';')));
      Application.onHashChange(window.location.hash.split(';'));
    });
  }

  private static onHashChange(params: string[]): void {
    const viewToken = params[0];
    let view;

    switch (viewToken) {
      case '':
      case '#main-menu':
        view = new MainMenuView();
        break;
      case '#new-game':
        view = new NewGameView();
        break;
      case '#station-select-player':
        view = new StationSelectPlayerView();
        break;
      case '#station-set-score':
        view = new StationSetScoreView();
        break;
      case '#final-score':
        view = new FinalScoreView();
        break;
      default:
        console.log('Unknown place: ' + view);
        return;
    }

    if (this.currentView !== null) {
      this.currentView.destroyView();
    }
    this.currentView = view;
    view.initView();
  }

  public static getStorage(): DbAccess {
    if (Application.storage === null) {
      Application.storage = new DbAccess();
    }
    return Application.storage;
  }

  public static getVersion(): string {
    return Application.VERSION;
  }

  public static updateWindowTitle(version: string): void {
    document.title = document.title.replace(/\{\$version\}/g, version);
  }

  public static getUrlParams(): Readonly<Map<string, string | number>> {
    if (!window.location.hash) {
      console.log('getUrlParams(): {}');
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

    console.log('getUrlParams(): ' + JSON.stringify(urlParams));
    return urlParams;
  }

  public static switchToFullscreenFunc(): (e: any) => void {
    let clickCounter = 0;

    return clickEvent => {
      clickEvent.preventDefault();

      if (++clickCounter % 3 === 0 && !(<any>document).fullscreenElement) {
        console.log('Init fullscreen...');

        if ((<any>document).documentElement.requestFullscreen) {
          (<any>document).documentElement.requestFullscreen();
        } else if ((<any>document).documentElement.webkitRequestFullscreen) {
          (<any>document).documentElement.webkitRequestFullscreen();
        }
      }
    };
  }

  public static scoreToPoints(score: string): number {
    if (score === 'miss' || score === 'undefined-score') {
      return 0;
    }

    const scoreParts = score.split(':');
    let penalty;

    switch (scoreParts[0]) {
      case 'first-turn':
        penalty = 0;
        break;
      case 'second-turn':
        penalty = 1;
        break;
      case 'third-turn':
        penalty = 2;
        break;
      default:
        throw new Error(`Invalid score format '${score}'`);
    }
    switch (scoreParts[1]) {
      case 'body-hit':
        return 16 - penalty * 6;
      case 'kill-hit':
        return 18 - penalty * 6;
      case 'center-kill-hit':
        return 20 - penalty * 6;
      default:
        throw new Error(`Invalid score format '${score}'`);
    }
  }

  public static scoreToDisplayName(score: string): string {
    if (score === 'miss') {
      return 'Miss';
    }

    const scoreParts = score.split(':');
    let scoreLabel;

    switch (scoreParts[0]) {
      case 'first-turn':
        scoreLabel = '1<sup>st</sup>';
        break;
      case 'second-turn':
        scoreLabel = '2<sup>nd</sup>';
        break;
      case 'third-turn':
        scoreLabel = '3<sup>rd</sup>';
        break;
      default:
        throw new Error(`Invalid score format '${score}'`);
    }
    scoreLabel += ' - ';
    switch (scoreParts[1]) {
      case 'body-hit':
        scoreLabel += 'Body';
        break;
      case 'kill-hit':
        scoreLabel += 'Kill';
        break;
      case 'center-kill-hit':
        scoreLabel += 'Center Kill';
        break;
      default:
        throw new Error(`Invalid score format '${score}'`);
    }

    return scoreLabel;
  }

  public static getDuration(starttime: string, endtime: string): string {
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
}

Application.initApplication();
