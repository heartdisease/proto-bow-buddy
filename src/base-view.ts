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

namespace BowBuddy {
  export abstract class BaseView {
    private loadTemplate(): void {
      const viewContainer = document.querySelector("#main");
      const template = <HTMLTemplateElement>document.querySelector(this.getTemplateLocator());
      const clone = document.importNode(template.content, true);
      let child;

      while ((child = viewContainer.firstChild)) {
        viewContainer.removeChild(child);
      }
      viewContainer.appendChild(clone);

      console.log("load template " + this.getTemplateLocator());
    }

    initView(): void {
      Application.updateWindowTitle(Application.getVersion());
      this.loadTemplate();
      this.onReveal(Application.getUrlParams());
    }

    abstract onReveal(urlParams: Readonly<Map<string, string | number>>): void;

    abstract getTemplateLocator(): string;
  }
}
