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
import 'materialize-css';
import { BaseView } from './base-view';
import { Application } from '../main';

import '../../node_modules/dragula/dist/dragula.min.css';
import '../styles/station-set-score.scss';

export class StationSetScoreView extends BaseView {
  private static readonly NAVIGATION_DELAY = 600;

  private scoreModalElement?: Element;

  getTitle(): string {
    return 'Assign Score';
  }

  protected getTemplateLocator(): string {
    return '#station-set-score-template';
  }

  protected getViewClassName(): string {
    return 'station-set-score-view';
  }

  onReveal(urlParams: Readonly<Map<string, string | number>>): void {
    const gid = <number>urlParams.get('gid');
    const pid = <number>urlParams.get('pid');
    const remainingPids: number[] = urlParams.has('qa')
      ? String(urlParams.get('qa'))
          .split('+')
          .map(s => +s)
      : [];
    const station = <number>urlParams.get('station');

    this.scoreModalElement = this.queryElement('.score-modal')!;

    M.Modal.init(this.scoreModalElement, {});

    this.queryElement('.station-no').innerText = '' + station;

    Application.getStorage()
      .getPlayer(pid)
      .then(player => (this.queryElement('span.player-name').innerText = player.name));

    this.initButtons(gid, pid, remainingPids, station);
  }

  onHide(): void {
    M.Modal.getInstance(this.scoreModalElement!).close();
    M.Modal.getInstance(this.scoreModalElement!).destroy();
  }

  private initButtons(gid: number, pid: number, remainingPids: number[], station: number): void {
    const drake = dragula(
      [...this.queryElements('.hit-draggable-container'), ...this.queryElements('.turn-draggable-container')],
      {
        copy: true,
        moves: () => true,
        revertOnSpill: true,
        accepts: (origin: HTMLElement, target: HTMLElement) => {
          return (
            (origin.classList.contains('hit') && target.classList.contains('turn-draggable-container')) ||
            (origin.classList.contains('turn') && target.classList.contains('hit-draggable-container'))
          );
        }
      }
    );

    drake
      .on('drag', (el: HTMLElement) => {
        el.classList.remove('ex-moved');
      })
      .on('drop', (origin: HTMLElement, target: HTMLElement, source: HTMLElement, sibling: HTMLElement) => {
        const hit = origin.classList.contains('hit')
          ? origin.dataset.dnd
          : this.getDndSibling(origin, target).dataset.dnd;
        const turn = origin.classList.contains('turn')
          ? origin.dataset.dnd
          : this.getDndSibling(origin, target).dataset.dnd;

        console.log('hit = ' + hit);
        console.log('turn = ' + turn);

        origin.classList.add('ex-moved');
        this.logScore(gid, pid, station, remainingPids, hit, turn);
      })
      .on('over', (el: HTMLElement, container: HTMLElement) => {
        container.classList.add('ex-over');
      })
      .on('out', (el: HTMLElement, container: HTMLElement) => {
        container.classList.remove('ex-over');
      });

    this.queryElement('.miss-btn').addEventListener('click', e => {
      e.preventDefault();
      this.logScore(gid, pid, station, remainingPids);
    });
  }

  private getDndSibling(origin: HTMLElement, target: HTMLElement): HTMLElement {
    for (const el of target.childNodes) {
      if (el.nodeType === Node.ELEMENT_NODE && el !== origin) {
        return <HTMLElement>el;
      }
    }
    throw new Error('No sibling found in target element');
  }

  private navigateNext(gid: number, station: number, remainingPids: number[]): void {
    if (remainingPids.length > 0) {
      this.navigateToNextPlayer(gid, station, remainingPids[0], remainingPids.slice(1));
    } else {
      this.navigateToPlayerSelection(gid, station);
    }
  }

  private navigateToPlayerSelection(gid: number, station: number): void {
    window.location.href = `#station-select-player;gid=${gid};station=${station}`;
  }

  private navigateToNextPlayer(gid: number, station: number, nextPid: number, remainingPids: number[]): void {
    const qaParam = remainingPids.length > 0 ? `;qa=${remainingPids.join('+')}` : ''; // qa = 'quick assign'
    window.location.href = `#station-set-score;gid=${gid};pid=${nextPid}${qaParam};station=${station}`;
  }

  private logScore(
    gid: number,
    pid: number,
    station: number,
    remainingPids: number[],
    hit?: string,
    turn?: string
  ): void {
    const before = Date.now();
    const miss = hit === undefined || turn === undefined;
    const score = miss ? 'miss' : turn + ':' + hit;

    if (miss) {
      this.queryElement('.modal-hit-score').innerHTML =
        '<a class="btn btn-default btn-lg miss-btn" href="#" role="button">Miss</a>';
    } else {
      this.queryElement('.modal-hit-score').innerHTML = this.getHitButton(hit!);
      this.queryElement('.modal-turn-score').innerHTML = this.getTurnButton(turn!);
    }

    M.Modal.getInstance(this.scoreModalElement!).open();

    Application.getStorage()
      .setScore(gid, pid, station, score)
      .then(score => {
        const timeDiff = Date.now() - before;

        if (timeDiff >= StationSetScoreView.NAVIGATION_DELAY) {
          this.navigateNext(gid, station, remainingPids);
        } else {
          window.setTimeout(
            () => this.navigateNext(gid, station, remainingPids),
            StationSetScoreView.NAVIGATION_DELAY - timeDiff
          );
        }
      });
  }

  private getHitButton(hit: string): string {
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

  private getTurnButton(turn: string): string {
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
}
