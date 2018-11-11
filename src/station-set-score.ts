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
import * as $ from 'jquery';
import 'materialize-css';
import { BaseView } from './base-view';
import { Application } from './main';

import './styles/station-set-score.scss';

export class StationSetScoreView extends BaseView {
  private static readonly NAVIGATION_DELAY = 600;

  private scoreModalElement?: Element;

  getTemplateLocator(): string {
    return '#station-set-score-template';
  }

  onReveal(urlParams: Readonly<Map<string, string | number>>): void {
    const gid = <number>urlParams.get('gid');
    const pid = <number>urlParams.get('pid');
    const remainingPids: Array<number> = urlParams.has('qa')
      ? String(urlParams.get('qa'))
          .split('+')
          .map((s: string) => +s)
      : [];
    const station = <number>urlParams.get('station');

    this.scoreModalElement = this.getViewContainer().querySelector('#score-modal')!;

    M.Modal.init(this.scoreModalElement, {});

    $('#station-no').text(station);

    Application.getStorage()
      .getPlayer(pid)
      .then(player => $('span.player-name').text(player.name));

    import('interactjs').then((interact: any) => {
      this.initButtons(interact, gid, pid, remainingPids, station);
    });
  }

  onHide(): void {
    M.Modal.getInstance(this.scoreModalElement!).close();
    M.Modal.getInstance(this.scoreModalElement!).destroy();
  }

  private initButtons(interact: any, gid: number, pid: number, remainingPids: Array<number>, station: number): void {
    console.log('Start button setup ....');

    interact('a.hit')
      .dropzone({
        accept: 'a.turn',
        overlap: 0.75,
        ondropactivate: (event: any) => {
          console.log('start drag');
          event.target.classList.add('active');
        },
        ondragenter: (event: any) => {
          event.target.classList.add('dropZone');
        },
        ondragleave: (event: any) => {
          event.target.classList.remove('active');
          event.target.classList.remove('dropZone');
        },
        ondrop: (event: any) => {
          console.log('drop the turn bomb');

          const dropzoneElement = event.target;
          const draggableElement = event.relatedTarget;
          const hit = dropzoneElement.getAttribute('data-dnd');
          const turn = draggableElement.getAttribute('data-dnd');

          this.logScore(gid, pid, station, remainingPids, hit, turn);
        }
      })
      .draggable({ inertia: true, onmove: this.dragMoveListener });

    interact('a.turn')
      .dropzone({
        accept: 'a.hit',
        overlap: 0.75,
        ondropactivate: (event: any) => {
          event.target.classList.add('active');
        },
        ondragenter: (event: any) => {
          event.target.classList.add('dropZone');
        },
        ondragleave: (event: any) => {
          event.target.classList.remove('active');
          event.target.classList.remove('dropZone');
        },
        ondrop: (event: any) => {
          console.log('drop the hit bomb');

          const dropzoneElement = event.relatedTarget;
          const draggableElement = event.target;
          const hit = dropzoneElement.getAttribute('data-dnd');
          const turn = draggableElement.getAttribute('data-dnd');

          this.logScore(gid, pid, station, remainingPids, hit, turn);
        }
      })
      .draggable({ inertia: true, onmove: this.dragMoveListener });

    $('.miss-btn').on('click', e => {
      e.preventDefault();
      this.logScore(gid, pid, station, remainingPids);
    });
  }

  private dragMoveListener(event: any): void {
    const draggedElement = event.target;
    // keep the dragged position in the data-x/data-y attributes
    const x = (parseFloat(draggedElement.getAttribute('data-x')) || 0) + event.dx;
    const y = (parseFloat(draggedElement.getAttribute('data-y')) || 0) + event.dy;

    draggedElement.style.transform = `translate(${x}px, ${y}px)`;

    draggedElement.setAttribute('data-x', x);
    draggedElement.setAttribute('data-y', y);
  }

  private navigateNext(gid: number, station: number, remainingPids: Array<number>): void {
    if (remainingPids.length > 0) {
      this.navigateToNextPlayer(gid, station, remainingPids[0], remainingPids.slice(1));
    } else {
      this.navigateToPlayerSelection(gid, station);
    }
  }

  private navigateToPlayerSelection(gid: number, station: number): void {
    window.location.href = `#station-select-player;gid=${gid};station=${station}`;
  }

  private navigateToNextPlayer(gid: number, station: number, nextPid: number, remainingPids: Array<number>): void {
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
      $('#modal-hit-score').html('<a class="btn btn-default btn-lg miss-btn" href="#" role="button">Miss</a>');
    } else {
      $('#modal-hit-score').html(this.getHitButton(hit!));
      $('#modal-turn-score').html(this.getTurnButton(turn!));
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
