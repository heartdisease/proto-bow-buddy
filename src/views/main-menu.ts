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
import { BaseView } from './base-view';
import { UrlParameters } from '../router';

import '../styles/main-menu.scss'; // tslint:disable-line:no-import-side-effect

export class MainMenuView extends BaseView {
  protected onReveal(parameters: Readonly<UrlParameters>): void {
    this.queryElement('.app-logo > h1').innerText = document.title;
  }

  protected onHide(): void {
    // nothing to do
  }

  protected updateTitle(title?: string): void {
    super.updateTitle('');
  }

  protected getTemplateLocator(): string {
    return '#main-menu-template';
  }

  protected getViewClassName(): string {
    return 'main-menu-view';
  }
}
