import { BaseView } from './views/base-view';
import { DbAccess } from './db';

export type ViewConstructor = new (
  router: Router,
  storage: DbAccess,
  updateTitle: (title: string) => void,
) => BaseView;

export type InstanceCreator = (view: ViewConstructor) => BaseView;

export interface Route {
  readonly path: string;
  readonly view: ViewConstructor;
}

export interface UrlParameters {
  [key: string]: string | number | boolean;
}

const NUMBER_PATTERN = /^(?:0|-?[1-9][0-9]*)$/;
const BOOLEAN_PATTERN = /^(?:true|false)$/i;

export class Router {
  private currentView?: BaseView;
  private handlersRegistered = false;

  constructor(
    private readonly routes: Route[],
    private readonly defaultRoute: Route,
    private readonly instanceCreator: InstanceCreator,
  ) {}

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
    let url;

    if (params !== undefined && path.length > 1 && path[0] === '#') {
      url = path;

      for (const key in params) {
        if (params.hasOwnProperty(key)) {
          url += `;${key}=${params[key]}`;
        }
      }
    } else {
      url = path.length === 0 ? '/' : path;
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
    const view = this.createViewForToken(viewToken);

    if (view === undefined) {
      this.navigateTo(this.defaultRoute.path, {}, true);
      return;
    }

    if (this.currentView !== undefined) {
      this.currentView.destroyView();
    }
    this.currentView = view;

    view.initView(
      Object.freeze(params !== undefined ? { ...params } : getUrlParams()),
    );
  }

  private createViewForToken(viewToken: string): BaseView | undefined {
    const route = this.routes.find(appRoute => appRoute.path === viewToken);

    if (route !== undefined) {
      return this.instanceCreator(route.view);
    }

    console.warn(`Unknown route: ${viewToken}`);
    return undefined;
  }
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
