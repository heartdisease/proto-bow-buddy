import { BaseView } from './views/base-view';
import { MainMenuView } from './views/main-menu';
import { NewGameView } from './views/new-game';
import { StationSelectPlayerView } from './views/station-select-player';
import { StationSetScoreView } from './views/station-set-score';
import { FinalScoreView } from './views/final-score';
import { AppSettingsView } from './views/app-settings';
import { HallOfFameView } from './views/hall-of-fame';
import { Application } from './main';

export interface Route {
  path: string;
  view: new () => BaseView;
}

export const ROUTES: Route[] = [
  { path: '', view: MainMenuView },
  { path: '#main-menu', view: MainMenuView },
  { path: '#new-game', view: NewGameView },
  { path: '#station-select-player', view: StationSelectPlayerView },
  { path: '#station-set-score', view: StationSetScoreView },
  { path: '#final-score', view: FinalScoreView },
  { path: '#app-settings', view: AppSettingsView },
  { path: '#hall-of-fame', view: HallOfFameView },
];

const NUMBER_PATTERN = /^(?:0|-?[1-9][0-9]*)$/;
const BOOLEAN_PATTERN = /^(?:true|false)$/i;

export class Router {
  private currentView?: BaseView;
  private handlersRegistered = false;

  registerHandlers(): void {
    if (this.handlersRegistered) {
      throw new Error('Handlers have already been registered!');
    }

    window.addEventListener('hashchange', (e: HashChangeEvent) => {
      console.info(e);
      this.onHashChange();
    });
    // window.addEventListener('popstate', (e: PopStateEvent) => {
    //   console.info(e);
    //   this.onHashChange(e.state);
    // });

    this.handlersRegistered = true;

    this.onHashChange();
  }

  navigateTo(
    path: string,
    params?: { [key: string]: string | number | boolean },
  ): void {
    let url = path;

    if (params !== undefined) {
      for (const key in params) {
        if (params.hasOwnProperty(key)) {
          url += `;${key}=${params[key]}`;
        }
      }
    }

    console.log(`navigateTo: ${path}`, params);
    window.history.pushState(params || {}, '', url); // tslint:disable-line:strict-boolean-expressions
    this.onHashChange(params);
  }

  private onHashChange(params?: {
    [key: string]: string | number | boolean;
  }): void {
    const urlParams = window.location.hash.split(';');
    const viewToken = urlParams[0];
    const view = createViewForToken(viewToken);

    if (this.currentView !== undefined) {
      this.currentView.destroyView();
    }
    this.currentView = view;

    Application.updateWindowTitle(view.getTitle());
    view.initView(
      params !== undefined ? asReadonlyMap(params) : getUrlParams(),
    );
  }
}

function asReadonlyMap(params: {
  [key: string]: string | number | boolean;
}): ReadonlyMap<string, string | number | boolean> {
  const urlParams = new Map<string, string | number | boolean>();

  for (const key in params) {
    if (params.hasOwnProperty(key)) {
      urlParams.set(key, params[key]);
    }
  }
  return urlParams;
}

function createViewForToken(viewToken: string): BaseView {
  const route = ROUTES.find(appRoute => appRoute.path === viewToken);

  if (route !== undefined) {
    return new route.view();
  }
  console.warn(`Unknown route: ${viewToken}`);

  return new MainMenuView();
}

function getUrlParams(): ReadonlyMap<string, string | number | boolean> {
  const parsedUrlParams = new Map<string, string | number | boolean>();

  return window.location.hash.length > 0
    ? window.location.hash
        .substring(1) // omit the # at the beginning
        .split(';')
        .map(keyValueStr => keyValueStr.split('='))
        .reduce((urlParams, keyValuePair) => {
          const key = keyValuePair[0];
          const value = keyValuePair[1];

          if (BOOLEAN_PATTERN.test(value)) {
            urlParams.set(key, value.toLowerCase() === 'true');
          } else if (NUMBER_PATTERN.test(value)) {
            urlParams.set(key, +value);
          } else {
            urlParams.set(key, value);
          }

          return urlParams;
        }, parsedUrlParams)
    : parsedUrlParams;
}
