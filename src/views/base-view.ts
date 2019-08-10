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
import { DbAccess } from '../db';
import { Application } from '../main';
import { Router, UrlParameters } from '../router';

export abstract class BaseView {
  private viewContainer: HTMLElement;

  /**
   * Never override this method!
   */
  /*final*/ initView(parameters: Readonly<UrlParameters>): void {
    this.loadTemplate();
    this.onReveal(parameters);
  }

  /**
   * Never override this method!
   */
  /*final*/ destroyView(): void {
    this.onHide();
    this.unloadTemplate();
  }

  abstract getTitle(): string;

  /**
   * Never override this method!
   */
  protected /*final*/ getRouter(): Router {
    return Application.getRouter();
  }

  /**
   * Never override this method!
   */
  protected /*final*/ getStorage(): DbAccess {
    return Application.getStorage();
  }

  /**
   * Never override this method!
   */
  protected /*final*/ getViewContainer(): HTMLElement {
    return this.viewContainer;
  }

  /**
   * Never override this method!
   */
  protected /*final*/ queryElement(selector: string): HTMLElement {
    const el = this.viewContainer.querySelector(selector); // tslint:disable-line:no-non-null-assertion

    if (el === null) {
      throw new Error(`No element found for selector '${selector}'`);
    }
    return el as HTMLElement;
  }

  /**
   * Never override this method!
   */
  protected /*final*/ queryElements(selector: string): NodeListOf<HTMLElement> {
    return this.viewContainer.querySelectorAll(selector);
  }

  /**
   * Never override this method!
   */
  protected /*final*/ hideElement(selector: string | HTMLElement): void {
    if (selector instanceof HTMLElement) {
      selector.style.display = 'none';
    } else {
      Array.prototype.forEach.call(
        this.queryElements(selector),
        (element: HTMLElement) => {
          element.style.display = 'none';
        },
      );
    }
  }

  /**
   * Never override this method!
   */
  protected /*final*/ showElement(selector: string | HTMLElement): void {
    if (selector instanceof HTMLElement) {
      selector.style.display = 'none';
    } else {
      Array.prototype.forEach.call(
        this.queryElements(selector),
        (element: HTMLElement) => {
          element.style.display = '';
        },
      );
    }
  }

  /**
   * Never override this method!
   */
  protected /*final*/ createElement(
    tagName: string,
    content: string | null,
    html = false,
    className?: string,
  ): HTMLElement {
    const el = document.createElement(tagName);

    if (content !== null) {
      if (html) {
        el.innerHTML = content;
      } else {
        el.innerText = content;
      }
    }

    if (className !== undefined) {
      el.className = className;
    }

    return el;
  }

  /**
   * Never override this method!
   */
  protected /*final*/ removeChildren(element: HTMLElement): void {
    let child;

    // tslint:disable-next-line:no-conditional-assignment
    while ((child = element.firstChild) !== null) {
      element.removeChild(child);
    }
  }

  protected abstract onReveal(parameters: Readonly<UrlParameters>): void;

  protected abstract onHide(): void;

  protected abstract getTemplateLocator(): string;

  protected abstract getViewClassName(): string;

  private loadTemplate(): void {
    const template = document.querySelector(
      this.getTemplateLocator(),
    ) as HTMLTemplateElement;

    this.viewContainer =
      this.viewContainer || (document.querySelector('#main') as HTMLElement);
    this.viewContainer.classList.add(this.getViewClassName());
    this.viewContainer.appendChild(document.importNode(template.content, true));

    console.log(`Loaded template ${this.getTemplateLocator()}.`);
  }

  private unloadTemplate(): void {
    const viewContainer = this.viewContainer;

    if (viewContainer) {
      viewContainer.classList.remove(this.getViewClassName());
      this.removeChildren(viewContainer);
    }
  }
}
