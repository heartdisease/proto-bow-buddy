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

  onReveal(parameters: ReadonlyMap<string, string | number | boolean>): void {
    this.init();
  }

  onHide(): void {
    // nothing to do
  }

  private async init(): Promise<void> {
    const tbody = this.queryElement('tbody.game-entries');
    const games = await this.getStorage().getGames();

    // TODO filter out unfinished games (should we automatically clean up unfinished games?)
    for (const game of games.sort(
      (a, b) =>
        new Date(b.starttime).getTime() - new Date(a.starttime).getTime()
    )) {
      const course = await this.getStorage().getCourseForGame(game.gid);
      const from = new Date(game.starttime).toLocaleDateString('de-AT', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
      const to = new Date(game.endtime).toLocaleTimeString('de-AT', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
      const linkLabel = `${course.name} (${
        course.stations
      })<br/>[${from} - ${to}]`;
      const row = this.createElement('tr', null);
      const cell = this.createElement(
        'td',
        `<a href="#final-score;gid=${game.gid}">${linkLabel}</a>`,
        true
      );

      row.appendChild(cell);
      tbody.appendChild(row);
    }
  }
}
