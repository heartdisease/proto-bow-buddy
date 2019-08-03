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
import 'materialize-css'; // tslint:disable-line:no-import-side-effect
import { Application } from '../main';
import { BaseView } from './base-view';

import '../../node_modules/dragula/dist/dragula.min.css';
import '../styles/station-set-score.scss'; // tslint:disable-line:no-import-side-effect

export class StationSetScoreView extends BaseView {
  private static readonly NAVIGATION_DELAY = 350;

  private scoreModalElement: Element;

  getTitle(): string {
    return 'Assign Score';
  }

  onReveal(parameters: ReadonlyMap<string, string | number | boolean>): void {
    const assignAll = parameters.has('aa') && (parameters.get('aa') as boolean);
    const gid = parameters.get('gid') as number;
    const pid = assignAll ? -1 : (parameters.get('pid') as number);
    const remainingPids: number[] = parameters.has('qa')
      ? `${parameters.get('qa')}`.split('+').map(s => +s)
      : [];
    const station = parameters.get('station') as number;

    this.init(gid, pid, remainingPids, station, assignAll).catch(e =>
      console.error(e),
    );
  }

  onHide(): void {
    M.Modal.getInstance(this.scoreModalElement).close();
    M.Modal.getInstance(this.scoreModalElement).destroy();
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
        this.logScore(gid, pid, station, remainingPids, assignAll, hit, turn);
      })
      .on('over', (el: HTMLElement, container: HTMLElement) => {
        container.classList.add('ex-over');
      })
      .on('out', (el: HTMLElement, container: HTMLElement) => {
        container.classList.remove('ex-over');
      });

    this.queryElement('.miss-btn').addEventListener('click', e => {
      e.preventDefault();
      this.logScore(gid, pid, station, remainingPids, assignAll);
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
      const player = await Application.getStorage().getPlayer(pid);
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
    const storage = Application.getStorage();
    const score = miss ? 'miss' : `${turn}:${hit}`;

    if (miss) {
      this.queryElement('.modal-hit-score').innerHTML =
        '<a class="btn btn-default btn-lg miss-btn" href="#" role="button">Miss</a>'; // ts-lint:disable-line:max-line-length
    } else {
      this.queryElement('.modal-hit-score').innerHTML = getHitButton(hit!); // tslint:disable-line:no-non-null-assertion
      this.queryElement('.modal-turn-score').innerHTML = getTurnButton(turn!); // tslint:disable-line:no-non-null-assertion
    }

    M.Modal.getInstance(this.scoreModalElement).open();

    try {
      if (assignAll) {
        const persistScores = [];

        for (const rpid of remainingPids) {
          persistScores.push(storage.setScore(gid, rpid, station, score));
        }
        await Promise.all(persistScores);

        const timeDiff = Date.now() - before;

        if (timeDiff >= StationSetScoreView.NAVIGATION_DELAY) {
          navigateToPlayerSelection(gid, station);
        } else {
          window.setTimeout(
            () => navigateToPlayerSelection(gid, station),
            StationSetScoreView.NAVIGATION_DELAY - timeDiff,
          );
        }
      } else {
        await storage.setScore(gid, pid, station, score);

        const timeDiff = Date.now() - before;

        if (timeDiff >= StationSetScoreView.NAVIGATION_DELAY) {
          navigateNext(gid, station, remainingPids);
        } else {
          window.setTimeout(
            () => navigateNext(gid, station, remainingPids),
            StationSetScoreView.NAVIGATION_DELAY - timeDiff,
          );
        }
      }
    } catch (e) {
      console.error(`Failed to persist score: ${e.message}`);
      navigateToPlayerSelection(gid, station);
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

function navigateToPlayerSelection(gid: number, station: number): void {
  window.location.href = `#station-select-player;gid=${gid};station=${station}`;
}

function navigateToNextPlayer(
  gid: number,
  station: number,
  nextPid: number,
  remainingPids: number[],
): void {
  const qaParam =
    remainingPids.length > 0 ? `;qa=${remainingPids.join('+')}` : ''; // qa = 'quick assign'
  window.location.href = `#station-set-score;gid=${gid};pid=${nextPid}${qaParam};station=${station}`; // ts-lint:disable-line:max-line-length
}

function navigateNext(
  gid: number,
  station: number,
  remainingPids: number[],
): void {
  if (remainingPids.length > 0) {
    navigateToNextPlayer(
      gid,
      station,
      remainingPids[0],
      remainingPids.slice(1),
    );
  } else {
    navigateToPlayerSelection(gid, station);
  }
}
