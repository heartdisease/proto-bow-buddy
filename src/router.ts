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

export interface UrlParameters {
  [key: string]: string | number | boolean;
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
      this.onHashChange();
    });

    this.handlersRegistered = true;

    this.onHashChange();
  }

  navigateTo(path: string, params?: UrlParameters, replaceState = false): void {
    let url = path;

    if (params !== undefined) {
      for (const key in params) {
        if (params.hasOwnProperty(key)) {
          url += `;${key}=${params[key]}`;
        }
      }
    }

    if (replaceState) {
      window.history.replaceState(params || {}, '', url); // tslint:disable-line:strict-boolean-expressions
    } else {
      window.history.pushState(params || {}, '', url); // tslint:disable-line:strict-boolean-expressions
    }
    this.onHashChange(params);
  }

  private onHashChange(params?: UrlParameters): void {
    const urlParams = window.location.hash.split(';');
    const viewToken = urlParams[0];
    const view = createViewForToken(viewToken);

    if (this.currentView !== undefined) {
      this.currentView.destroyView();
    }
    this.currentView = view;

    Application.updateWindowTitle(view.getTitle());
    view.initView(
      Object.freeze(params !== undefined ? params : getUrlParams()),
    );
  }
}

function createViewForToken(viewToken: string): BaseView {
  const route = ROUTES.find(appRoute => appRoute.path === viewToken);

  if (route !== undefined) {
    return new route.view();
  }
  console.warn(`Unknown route: ${viewToken}`);

  return new MainMenuView();
}

function getUrlParams(): Readonly<UrlParameters> {
  const parsedUrlParams: UrlParameters = {};

  return window.location.hash.length > 0
    ? window.location.hash
        .substring(1) // omit the # at the beginning
        .split(';')
        .map(keyValueStr => keyValueStr.split('='))
        .reduce((urlParams: UrlParameters, keyValuePair: [string, string]) => {
          const key = keyValuePair[0];
          const value = keyValuePair[1];

          if (BOOLEAN_PATTERN.test(value)) {
            urlParams[key] = value.toLowerCase() === 'true';
          } else if (NUMBER_PATTERN.test(value)) {
            urlParams[key] = +value;
          } else {
            urlParams[key] = value;
          }

          return urlParams;
        }, parsedUrlParams)
    : parsedUrlParams;
}
