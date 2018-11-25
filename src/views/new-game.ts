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
import { BaseView } from './base-view';
import { Player, Course } from '../main';

import '../styles/new-game.scss';

export class NewGameView extends BaseView {
  private existingPlayers: Player[] = [];
  private existingCourses: Course[] = [];
  private configuredPlayers: Player[] = [];
  private configuredCourse: Course;
  private collapsibleElement?: Element;
  private playerSelectElement?: Element;
  private courseSelectElement?: Element;

  protected getTemplateLocator(): string {
    return '#new-game-template';
  }

  protected getViewClassName(): string {
    return 'new-game-view';
  }

  onReveal(urlParams: Readonly<Map<string, string | number>>): void {
    this.collapsibleElement = this.getViewContainer().querySelector('.collapsible')!;
    this.playerSelectElement = this.getViewContainer().querySelector('select#player-select')!;
    this.courseSelectElement = this.getViewContainer().querySelector('select#course-select')!;

    this.initControls();

    console.info('NewGameView.onReveal()');
  }

  onHide(): void {
    M.Collapsible.getInstance(this.collapsibleElement!).destroy();
    M.FormSelect.getInstance(this.playerSelectElement!).destroy();
    M.FormSelect.getInstance(this.courseSelectElement!).destroy();

    console.info('NewGameView.onHide()');
  }

  private initControls(): void {
    M.Collapsible.init(this.collapsibleElement!, {});
    M.FormSelect.init(this.playerSelectElement!, {});
    M.FormSelect.init(this.courseSelectElement!, {});

    this.updatePlayerSelectionMenu();
    this.updateCourseSelectionMenu();
    this.registerStartButtonEventHandler();
  }

  private async updatePlayerSelectionMenu() {
    const $playerSelect = $(this.playerSelectElement!);

    $playerSelect.off('change'); // deregister handler first, because invalid option is default selection
    M.FormSelect.getInstance(this.playerSelectElement!).destroy();

    try {
      const players = await this.getStorage().getPlayers();
      window.setTimeout(() => {
        const $defaultOption = $('<option/>').text('Choose player');
        $playerSelect.empty();
        this.existingPlayers = players;
        $playerSelect.append($defaultOption).append(
          $('<option/>')
            .val('new')
            .text('New player...')
        );
        players
          .filter(player => this.configuredPlayers.every(configuredPlayer => configuredPlayer.pid !== player.pid))
          .forEach(player => {
            $playerSelect.append(
              $('<option/>')
                .attr('value', player.pid)
                .data('player', player)
                .text(player.name)
            );
          });
        $defaultOption.attr('selected', 'selected').attr('disabled', 'disabled'); // TODO cannot we set this right away?
        // re-init widget
        M.FormSelect.init(this.playerSelectElement!, {});
        this.registerPlayerSelectEventHandlers();
        console.log('Rebuilt player selection menu.');
      }, 0); // TODO is this delay even necessary?
    } catch (e) {
      return console.error(e);
    }
  }

  private async updateCourseSelectionMenu() {
    const $courseSelect = $(this.courseSelectElement!);

    $courseSelect.off('change'); // deregister handler first, because invalid option is default selection
    M.FormSelect.getInstance(this.courseSelectElement!).destroy();

    try {
      const courses = await this.getStorage().getCourses();
      window.setTimeout(() => {
        const $defaultOption = $('<option/>').text('Choose course');
        $courseSelect.empty();
        this.existingCourses = courses;
        $courseSelect.append($defaultOption).append(
          $('<option/>')
            .val('new')
            .text('New course...')
        );
        courses
          .filter(course => this.configuredCourse === undefined || this.configuredCourse.cid !== course.cid)
          .forEach(course => {
            $courseSelect.append(
              $('<option/>')
                .attr('value', course.cid)
                .data('course', course)
                .text(course.name + ' (' + course.stations + ')')
            );
          });
        $defaultOption.attr('selected', 'selected').attr('disabled', 'disabled'); // TODO cannot we set this right away?
        // re-init widget
        M.FormSelect.init(this.courseSelectElement!, {});
        this.registerCourseSelectEventHandlers();
        console.log('Rebuilt course selection menu.');
      }, 0); // TODO is this delay even necessary?
    } catch (e) {
      return console.error(e);
    }
  }

  private registerPlayerSelectEventHandlers(): void {
    const $playerSelect = $(this.playerSelectElement!);

    $playerSelect.off('change').on('change', e => {
      const pid = (<HTMLSelectElement>e.target).value;
      const $playerOption = $playerSelect.find(`option[value="${pid}"]`);

      console.log('pid change: ' + pid);

      if (pid === 'new') {
        $('#select-player-container').hide();
        $('#add-player-container').show();
        $('#new-player-name').focus();
      } else {
        this.addPlayerToTable($playerOption.data('player'));
        this.updatePlayerSelectionMenu();
      }
    });
    $('#new-player-name')
      .off('keyup')
      .on('keyup', e => this.verifyPlayerInput());
    $('#add-player-btn')
      .off('click')
      .on('click', e => {
        const playerName = <string>$('#new-player-name').val();

        $('#add-player-btn').addClass('disabled');
        $('#new-player-name').val('');

        this.getStorage()
          .addPlayer(playerName, '')
          .then(player => {
            this.addPlayerToTable(player);
            this.updatePlayerSelectionMenu().then(nil => {
              $('#add-player-container').hide();
              $('#select-player-container').show();
            });
          });

        e.preventDefault();
      });
  }

  private registerCourseSelectEventHandlers(): void {
    const $courseSelect = $(this.courseSelectElement!);

    $courseSelect.off('change').on('change', e => {
      const cid = (<HTMLSelectElement>e.target).value;
      const $courseOption = $courseSelect.find(`option[value="${cid}"]`);

      console.log('cid change: ' + cid);

      if (cid === 'new') {
        $('#select-course-container').hide();
        $('#add-course-container').show();
        $('#new-course-name').focus();
      } else {
        this.addCourseToTable($courseOption.data('course'));
        this.updatePlayerSelectionMenu();
      }
    });
    $('#new-course-name')
      .off('keyup')
      .on('keyup', e => this.verifyCourseInput());
    $('#new-course-no-of-stations')
      .off('keyup')
      .on('keyup', e => this.verifyCourseInput());
    $('#set-course-btn')
      .off('click')
      .on('click', e => {
        const courseName = <string>$('#new-course-name').val();
        const noOfStations = <number>$('#new-course-no-of-stations').val();

        $('#set-course-btn').addClass('disabled');
        $('#new-course-name').val('');
        $('#new-course-no-of-stations').val('');

        this.getStorage()
          .addCourse(courseName, '', '', noOfStations)
          .then(course => {
            this.addCourseToTable(course);
            this.updateCourseSelectionMenu().then(nil => {
              $('#add-course-container').hide();
              $('#select-course-container').show();
            });
          });

        e.preventDefault();
      });
  }

  private registerStartButtonEventHandler(): void {
    $('#start-game-btn').on('click', e => {
      const cid = +$('#course-entries > tr[data-cid]').attr('data-cid')!;
      const pids: number[] = [];

      $('#start-game-btn').addClass('disabled'); // disable button while async db action is running
      $('#player-entries > tr[data-pid]').each(function() {
        pids.push(+$(this).attr('data-pid')!);
      });

      this.getStorage()
        .addGame(cid, pids)
        .then(game => (window.location.href = `#station-select-player;gid=${game.gid};station=1`));

      e.preventDefault();
    });
  }

  private isPlayerConfigured(): boolean {
    return this.configuredPlayers.length > 0;
  }

  private isCourseConfigured(): boolean {
    return this.configuredCourse !== undefined;
  }

  private addPlayerToTable(player: Player): void {
    $('#player-entries').append(
      $('<tr/>')
        .attr('data-pid', player.pid)
        .append($('<td/>').text(player.name), $('<td/>').text(player.email || '-'), $('<td/>').text('-'))
    );

    this.configuredPlayers.push(player);

    if (this.isPlayerConfigured() && this.isCourseConfigured()) {
      $('#start-game-btn').removeClass('disabled');
    }
  }

  private addCourseToTable(course: Course): void {
    $('#course-entries')
      .empty()
      .append(
        $('<tr/>')
          .attr('data-cid', course.cid)
          .append($('<td/>').text(course.name), $('<td/>').text(course.place || '-'), $('<td/>').text(course.stations))
      );

    this.configuredCourse = course;

    if (this.isPlayerConfigured() && this.isCourseConfigured()) {
      $('#start-game-btn').removeClass('disabled');
    }
  }

  private verifyPlayerInput(): void {
    const playerName = <string>$('#new-player-name').val();

    if (
      !playerName ||
      /^\s+/.test(playerName) ||
      /\s+$/.test(playerName) ||
      this.existingPlayers.some(player => player.name === playerName)
    ) {
      $('#add-player-btn').addClass('disabled');
    } else {
      $('#add-player-btn').removeClass('disabled');
    }
  }

  private verifyCourseInput(): void {
    const courseName = <string>$('#new-course-name').val();
    const noOfStations = <string>$('#new-course-no-of-stations').val();

    console.log('verifyCourseInput: ' + courseName + ', ' + noOfStations);

    if (
      !courseName ||
      /^\s+/.test(courseName) ||
      /\s+$/.test(courseName) ||
      !noOfStations ||
      !/^[1-9][0-9]*$/.test(noOfStations) ||
      this.existingCourses.some(course => course.name === courseName)
    ) {
      console.log('existingCourses: ' + this.existingCourses);
      $('#set-course-btn').addClass('disabled');
    } else {
      $('#set-course-btn').removeClass('disabled');
    }
  }
}