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
/// <reference path ="../node_modules/@types/jquery/index.d.ts"/>

namespace BowBuddy {
  export abstract class BaseView {
    private loadTemplate(): void {
      const viewContainer = document.querySelector("#main");
      const template = <HTMLTemplateElement>document.querySelector(this.getTemplateLocator());
      const clone = document.importNode(template.content, true);

      viewContainer.appendChild(clone);
      console.log("Loaded template " + this.getTemplateLocator() + ".");
    }

    private unloadTemplate(): void {
      $("#main").empty(); // we use jQuery here so all jQuery-specific stuff is properly deregistered
      console.log("Un-loaded template " + this.getTemplateLocator() + ".");
    }

    /**
     * Never override this method!
     */
    /*final*/ initView(): void {
      this.loadTemplate();
      this.onReveal(Application.getUrlParams());
    }

    /**
     * Never override this method!
     */
    /*final*/ destroyView(): void {
      this.onHide();
      this.unloadTemplate();
    }

    /**
     * Never override this method!
     */
    /*final*/ getStorage(): DbAccess {
      return Application.getStorage();
    }

    protected abstract onReveal(urlParams: Readonly<Map<string, string | number>>): void;

    protected abstract onHide(): void;

    protected abstract getTemplateLocator(): string;
  }
}
