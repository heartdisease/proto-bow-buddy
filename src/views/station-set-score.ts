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
import * as dragula from 'dragula';

import { BaseView } from './base-view';
import { defaultPromiseErrorHandler } from '../utils';
import { UrlParameters } from '../router';

import '../../node_modules/dragula/dist/dragula.min.css';
import '../styles/station-set-score.scss'; // tslint:disable-line:no-import-side-effect

const NAVIGATION_DELAY = 300;

export class StationSetScoreView extends BaseView {
  private scoreModalElement: Element;

  protected onReveal(parameters: Readonly<UrlParameters>): void {
    const assignAll = parameters.aa === true;
    const gid = parameters.gid as number;
    const pid = assignAll ? -1 : (parameters.pid as number);
    const remainingPids: number[] = parameters.hasOwnProperty('qa')
      ? (parameters.qa as string).split('+').map(s => +s)
      : [];
    const station = parameters.station as number;

    if (station > 0) {
      this.init(gid, pid, remainingPids, station, assignAll).catch(
        defaultPromiseErrorHandler,
      );
    } else if (station === -1) {
      this.init(gid, pid, remainingPids, 1, assignAll).catch(
        defaultPromiseErrorHandler,
      );
    } else {
      console.error(`Invalid station index: ${station}`);
    }
  }

  protected onHide(): void {
    M.Modal.getInstance(this.scoreModalElement).close();
    M.Modal.getInstance(this.scoreModalElement).destroy();
  }

  protected updateTitle(title?: string): void {
    super.updateTitle('Assign Score');
  }

  protected getTemplateLocator(): string {
    return '#station-set-score-template';
  }

  protected getViewClassName(): string {
    return 'station-set-score-view';
  }

  private initButtons(
    gid: number,
    pid: number,
    remainingPids: number[],
    station: number,
    assignAll: boolean,
  ): void {
    const drake = dragula(
      [
        ...this.queryElements('.hit-draggable-container'),
        ...this.queryElements('.turn-draggable-container'),
      ],
      {
        copy: true,
        moves: () => true,
        revertOnSpill: true,
        accepts: (origin: HTMLElement, target: HTMLElement) =>
          (origin.classList.contains('hit') &&
            target.classList.contains('turn-draggable-container')) ||
          (origin.classList.contains('turn') &&
            target.classList.contains('hit-draggable-container')),
      },
    );

    drake
      .on('drag', (el: HTMLElement) => {
        el.classList.remove('ex-moved');
      })
      .on('drop', (origin: HTMLElement, target: HTMLElement) => {
        const hit = origin.classList.contains('hit')
          ? origin.dataset.dnd
          : getDndSibling(origin, target).dataset.dnd;
        const turn = origin.classList.contains('turn')
          ? origin.dataset.dnd
          : getDndSibling(origin, target).dataset.dnd;

        origin.classList.add('ex-moved');
        this.logScore(
          gid,
          pid,
          station,
          remainingPids,
          assignAll,
          hit,
          turn,
        ).catch(defaultPromiseErrorHandler);
      })
      .on('over', (el: HTMLElement, container: HTMLElement) => {
        container.classList.add('ex-over');
      })
      .on('out', (el: HTMLElement, container: HTMLElement) => {
        container.classList.remove('ex-over');
      });

    this.queryElement('.miss-btn').addEventListener('click', e => {
      e.preventDefault();
      this.logScore(gid, pid, station, remainingPids, assignAll).catch(
        defaultPromiseErrorHandler,
      );
    });
  }

  private async init(
    gid: number,
    pid: number,
    remainingPids: number[],
    station: number,
    assignAll: boolean,
  ): Promise<void> {
    this.scoreModalElement = this.queryElement('.score-modal');

    M.Modal.init(this.scoreModalElement, {});

    this.queryElement('.station-no').innerText = `${station}`;

    if (assignAll) {
      this.queryElement(
        'span.player-name',
      ).innerText = `All players (${remainingPids.length})`;
    } else {
      const player = await this.getStorage().getPlayer(pid);
      this.queryElement('span.player-name').innerText = player.name;
    }

    this.initButtons(gid, pid, remainingPids, station, assignAll);
  }

  private async logScore(
    gid: number,
    pid: number,
    station: number,
    remainingPids: number[],
    assignAll: boolean,
    hit?: string,
    turn?: string,
  ): Promise<void> {
    const before = Date.now();
    const miss = hit === undefined || turn === undefined;
    const score = miss ? 'miss' : `${turn}:${hit}`;

    if (miss) {
      this.queryElement('.modal-hit-score').innerHTML =
        '<a class="btn btn-default btn-lg miss-btn" href="#" role="button">Miss</a>';
    } else {
      this.queryElement('.modal-hit-score').innerHTML = getHitButton(hit!); // tslint:disable-line:no-non-null-assertion
      this.queryElement('.modal-turn-score').innerHTML = getTurnButton(turn!); // tslint:disable-line:no-non-null-assertion
    }

    M.Modal.getInstance(this.scoreModalElement).open();

    try {
      if (assignAll) {
        const persistScores = [];

        for (const rpid of remainingPids) {
          persistScores.push(
            this.getStorage().setScore(gid, rpid, station, score),
          );
        }
        await Promise.all(persistScores);

        const timeDiff = Date.now() - before;

        if (timeDiff >= NAVIGATION_DELAY) {
          this.navigateToPlayerSelection(gid, station);
        } else {
          window.setTimeout(
            () => this.navigateToPlayerSelection(gid, station),
            NAVIGATION_DELAY - timeDiff,
          );
        }
      } else {
        await this.getStorage().setScore(gid, pid, station, score);

        const timeDiff = Date.now() - before;

        if (timeDiff >= NAVIGATION_DELAY) {
          this.navigateNext(gid, station, remainingPids);
        } else {
          window.setTimeout(
            () => this.navigateNext(gid, station, remainingPids),
            NAVIGATION_DELAY - timeDiff,
          );
        }
      }
    } catch (e) {
      console.error(`Failed to persist score: ${e.message}`);
      this.navigateToPlayerSelection(gid, station);
    }
  }

  private navigateToPlayerSelection(gid: number, station: number): void {
    this.getRouter().navigateTo(
      `#station-select-player`,
      { gid, station },
      true,
    );
  }

  private navigateToNextPlayer(
    gid: number,
    station: number,
    nextPid: number,
    remainingPids: number[],
  ): void {
    const params: UrlParameters = {
      gid,
      pid: nextPid,
      station,
    };

    if (remainingPids.length > 0) {
      // tslint:disable-next-line:no-string-literal
      params['qa'] = remainingPids.join('+'); // qa = 'quick assign'
    }
    this.getRouter().navigateTo(`#station-set-score`, params, true);
  }

  private navigateNext(
    gid: number,
    station: number,
    remainingPids: number[],
  ): void {
    if (remainingPids.length > 0) {
      this.navigateToNextPlayer(
        gid,
        station,
        remainingPids[0],
        remainingPids.slice(1),
      );
    } else {
      this.navigateToPlayerSelection(gid, station);
    }
  }
}

function getHitButton(hit: string): string {
  switch (hit) {
    case 'body-hit':
      return '<a class="btn-floating btn-large light-blue accent-4 hit"><span class="draggable-text-block">Body</span></a>';
    case 'kill-hit':
      return '<a class="btn-floating btn-large amber darken-4 hit"><span class="draggable-text-block">Kill</span></a>';
    case 'center-kill-hit':
      return '<a class="btn-floating btn-large red darken-4 hit"><span class="draggable-text-block">Center Kill</span></a>';
    default:
      throw new Error(`Invalid hit: ${hit}`);
  }
}

function getTurnButton(turn: string): string {
  switch (turn) {
    case 'first-turn':
      return '<a class="btn-floating btn-large grey darken-4 turn"><span class="draggable-text-block">1<sup>st</sup></span></a>';
    case 'second-turn':
      return '<a class="btn-floating btn-large grey darken-1 turn"><span class="draggable-text-block">2<sup>nd</sup></span></a>';
    case 'third-turn':
      return '<a class="btn-floating btn-large grey turn"><span class="draggable-text-block">3<sup>rd</sup></span></a>';
    default:
      throw new Error(`Invalid turn: ${turn}`);
  }
}

function getDndSibling(origin: HTMLElement, target: HTMLElement): HTMLElement {
  for (const el of target.childNodes) {
    if (el.nodeType === Node.ELEMENT_NODE && el !== origin) {
      return el as HTMLElement;
    }
  }
  throw new Error('No sibling found in target element');
}
