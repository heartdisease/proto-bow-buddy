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
/// <reference path ='../node_modules/@types/jquery/index.d.ts'/>
/// <reference path='./base-view.ts' />
/// <reference path='./main.ts' />

namespace BowBuddy {
  export class StationSetScoreView extends BaseView {
    private static /*final*/ NAVIGATION_DELAY = 600;

    private scoreModalElement: HTMLElement;

    getTemplateLocator(): string {
      return '#station-set-score-template';
    }

    onReveal(urlParams: Readonly<Map<string, string | number>>): void {
      const viewElement = document.querySelector('#main');
      const gid = <number>urlParams.get('gid');
      const pid = <number>urlParams.get('pid');
      const station = <number>urlParams.get('station');

      this.scoreModalElement = viewElement.querySelector('#score-modal');

      M.Modal.init(this.scoreModalElement, {});

      $('#station-no').text(station);

      Application.getStorage()
        .getPlayer(pid)
        .then(player => $('span.player-name').text(player.name));

      // TODO think about replacing touch-dnd with interact.js (https://github.com/taye/interact.js)
      // TODO check if draggable and droppable are correctly reset in reset()
      (<any>$('.hit')) // explicit cast to empty to compensate the lack of a wrapper for the draggable plug-in
        .draggable({ connectWith: '.turn' })
        .droppable({ accept: '.turn', activeClass: 'active', hoverClass: 'dropZone' })
        .on('droppable:drop', (e: any, ui: any) => {
          console.log('URL params in hit: ' + JSON.stringify(urlParams));
          this.logScore(gid, pid, station, e.target.getAttribute('data-dnd'), ui.item[0].getAttribute('data-dnd'));
        });

      (<any>$('.turn')) // explicit cast to empty to compensate the lack of a wrapper for the draggable plug-in
        .draggable({ connectWith: '.turn' })
        .droppable({ accept: '.hit', activeClass: 'active', hoverClass: 'dropZone' })
        .on('droppable:drop', (e: any, ui: any) => {
          console.log('URL params in turn: ' + JSON.stringify(urlParams));
          this.logScore(gid, pid, station, ui.item[0].getAttribute('data-dnd'), e.target.getAttribute('data-dnd'));
        });

      $('.miss-btn').on('click', e => {
        e.preventDefault();
        this.logScore(gid, pid, station);
      });
    }

    onHide(): void {
      M.Modal.getInstance(this.scoreModalElement).close();
      M.Modal.getInstance(this.scoreModalElement).destroy();
    }

    private navigateBack(gid: number, station: number): void {
      window.location.href = `#station-select-player;gid=${gid};station=${station}`;
    }

    private navigateToNextPlayer(gid: number, station: number, nextPid: number, remainingPids: Array<string>) {
      const qaParam = remainingPids.length > 0 ? ';qa=' + remainingPids.join('+') : '';
      window.location.href = `#gid=${gid};pid=${nextPid}${qaParam};station=${station}`;
    }

    private navigateNext(gid: number, pid: number, station: number, qa: string | number = undefined): void {
      if (qa !== undefined) {
        const qaPlayers = ('' + qa).split('+'); // if qa has only one entry left it becomes an integer

        if (qaPlayers.length > 0) {
          this.navigateToNextPlayer(gid, station, +qaPlayers[0], qaPlayers.slice(1));
        } else {
          throw new Error(`Invalid qa parameter '${qa}'`);
        }
      } else {
        this.navigateBack(gid, station);
      }
    }

    private logScore(
      gid: number,
      pid: number,
      station: number,
      hit: string = undefined,
      turn: string = undefined
    ): void {
      const before = Date.now();
      const miss = hit === undefined || turn === undefined;
      const score = miss ? 'miss' : turn + ':' + hit;

      if (miss) {
        $('#modal-hit-score').html('<a class="btn btn-default btn-lg miss-btn" href="#" role="button">Miss</a>');
      } else {
        $('#modal-hit-score').html(this.getHitButton(hit));
        $('#modal-turn-score').html(this.getTurnButton(turn));
      }

      M.Modal.getInstance(this.scoreModalElement).open();

      Application.getStorage()
        .setScore(gid, pid, station, score)
        .then(score => {
          const timeDiff = Date.now() - before;

          if (timeDiff >= StationSetScoreView.NAVIGATION_DELAY) {
            this.navigateNext(gid, pid, station);
          } else {
            window.setTimeout(
              () => this.navigateNext(gid, pid, station),
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
      }
    }
  }
}
