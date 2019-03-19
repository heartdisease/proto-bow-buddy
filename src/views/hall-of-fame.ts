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

import '../styles/hall-of-fame.scss';

export class HallOfFameView extends BaseView {
  getTitle(): string {
    return 'Hall of Fame';
  }

  protected getTemplateLocator(): string {
    return '#hall-of-fame-template';
  }

  protected getViewClassName(): string {
    return 'hall-of-fame-view';
  }

  onReveal(urlParams: Readonly<Map<string, string | number>>): void {
    const gid = <number>urlParams.get('gid'); // TODO list all available rounds instead
    // TODO implement
  }

  onHide(): void {
    // nothing to do
  }

  private generateScoreTable(gid: number, stations: number): void {
    // TODO implement
  }
}
