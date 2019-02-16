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
import * as $ from 'jquery';
import { DbAccess } from '../db';
import { Application } from '../main';

export abstract class BaseView {
  private viewContainer?: Element;

  private loadTemplate(): void {
    const template = <HTMLTemplateElement>document.querySelector(this.getTemplateLocator());
    const clone = document.importNode(template.content, true);

    this.viewContainer = this.viewContainer || document.querySelector('#main')!;
    $(this.viewContainer).addClass(this.getViewClassName());
    this.viewContainer.appendChild(clone);

    console.log('Loaded template ' + this.getTemplateLocator() + '.');
  }

  private unloadTemplate(): void {
    $('#main')
      .removeClass(this.getViewClassName())
      .empty();
    console.log('Un-loaded template ' + this.getTemplateLocator() + '.');
  }

  /**
   * Never override this method!
   */
  public /*final*/ initView(): void {
    this.loadTemplate();
    this.onReveal(Application.getUrlParams());
  }

  /**
   * Never override this method!
   */
  public /*final*/ destroyView(): void {
    this.onHide();
    this.unloadTemplate();
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
  protected /*final*/ getViewContainer(): Element {
    return this.viewContainer!;
  }

  abstract getTitle(): string;

  protected abstract onReveal(urlParams: Readonly<Map<string, string | number>>): void;

  protected abstract onHide(): void;

  protected abstract getTemplateLocator(): string;

  protected abstract getViewClassName(): string;
}
