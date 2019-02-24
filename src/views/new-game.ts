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
import { Player, Course } from '../main';

import '../styles/new-game.scss';

export class NewGameView extends BaseView {
  private existingPlayers: Player[] = [];
  private existingCourses: Course[] = [];
  private configuredPlayers: Player[] = [];
  private configuredCourse: Course;
  private collapsibleElement?: HTMLElement;
  private playerSelectElement?: HTMLElement;
  private courseSelectElement?: HTMLElement;

  private readonly addPlayerClickListener = async (event: Event) => this.onAddPlayerClick(event);
  private readonly playerSelectionChangeListener = async (event: Event) => this.onPlayerSelectionChange(event);
  private readonly courseSelectionChangeListener = async (event: Event) => this.onCourseSelectionChange(event);
  private readonly setCourseClickListener = async (event: Event) => this.onSetCourseClick(event);
  private readonly startGameClickListener = async (event: Event) => this.onStartGameClick(event);
  private readonly playerInputListener = () => this.verifyPlayerInput();
  private readonly courseInputListener = () => this.verifyCourseInput();

  getTitle(): string {
    return 'New Game';
  }

  protected getTemplateLocator(): string {
    return '#new-game-template';
  }

  protected getViewClassName(): string {
    return 'new-game-view';
  }

  onReveal(urlParams: Readonly<Map<string, string | number>>): void {
    const newPlayerName = this.queryElement('.new-player-name');
    const addPlayerBtn = this.queryElement('.add-player-btn');
    const newCourseName = this.queryElement('.new-course-name');
    const newCourseNoOfStations = this.queryElement('.new-course-no-of-stations');
    const setCourseBtn = this.queryElement('.set-course-btn');

    this.collapsibleElement = this.queryElement('.collapsible');
    this.playerSelectElement = this.queryElement('select.player-select');
    this.courseSelectElement = this.queryElement('select.course-select');

    newPlayerName.addEventListener('keyup', this.playerInputListener);
    addPlayerBtn.addEventListener('click', this.addPlayerClickListener);
    newCourseName.addEventListener('keyup', this.courseInputListener);
    newCourseNoOfStations.addEventListener('keyup', this.courseInputListener);
    setCourseBtn.addEventListener('click', this.setCourseClickListener);

    this.initControls();

    console.info('NewGameView.onReveal()');
  }

  onHide(): void {
    const newPlayerName = this.queryElement('.new-player-name');
    const addPlayerBtn = this.queryElement('.add-player-btn');
    const newCourseName = this.queryElement('.new-course-name');
    const newCourseNoOfStations = this.queryElement('.new-course-no-of-stations');
    const setCourseBtn = this.queryElement('.set-course-btn');

    newPlayerName.removeEventListener('keyup', this.playerInputListener);
    addPlayerBtn.removeEventListener('click', this.addPlayerClickListener);
    newCourseName.removeEventListener('keyup', this.courseInputListener);
    newCourseNoOfStations.removeEventListener('keyup', this.courseInputListener);
    setCourseBtn.removeEventListener('click', this.setCourseClickListener);

    M.Collapsible.getInstance(this.collapsibleElement!).destroy();
    M.FormSelect.getInstance(this.playerSelectElement!).destroy();
    M.FormSelect.getInstance(this.courseSelectElement!).destroy();

    console.info('NewGameView.onHide()');
  }

  private initControls(): void {
    M.Collapsible.init(this.collapsibleElement!, {});

    this.updatePlayerSelectionMenu(true);
    this.updateCourseSelectionMenu(true);
    this.registerStartButtonEventHandler();
  }

  private async updatePlayerSelectionMenu(init: boolean = false) {
    const playerSelect = this.playerSelectElement!;

    if (!init) {
      playerSelect.removeEventListener('change', this.playerSelectionChangeListener); // deregister handler first, because invalid option is default selection
      M.FormSelect.getInstance(playerSelect).destroy();
    }

    try {
      const players = await this.getStorage().getPlayers();
      const playerSelectFragment = document.createDocumentFragment();
      const defaultOption = this.createOptionElement('Choose player');
      const newPlayerOption = this.createOptionElement('New player...', 'new');

      this.existingPlayers = players;

      defaultOption.setAttribute('selected', 'selected');
      defaultOption.setAttribute('disabled', 'disabled');

      playerSelectFragment.appendChild(defaultOption);
      playerSelectFragment.appendChild(newPlayerOption);

      players
        .filter(player => this.configuredPlayers.every(configuredPlayer => configuredPlayer.pid !== player.pid))
        .forEach(player => playerSelectFragment.appendChild(this.createOptionElement(player.name, player.pid)));

      // re-init widget
      this.removeChildren(playerSelect);
      playerSelect.appendChild(playerSelectFragment);

      M.FormSelect.init(playerSelect, {});
      this.registerPlayerSelectEventHandlers();

      console.log('Rebuilt player selection menu.');
    } catch (e) {
      return console.error(e);
    }
  }

  private async updateCourseSelectionMenu(init: boolean = false) {
    const courseSelect = this.courseSelectElement!;

    if (!init) {
      courseSelect.removeEventListener('change', this.courseSelectionChangeListener); // deregister handler first, because invalid option is default selection
      M.FormSelect.getInstance(courseSelect).destroy();
    }

    try {
      const courses = await this.getStorage().getCourses();
      const courseSelectFragment = document.createDocumentFragment();
      const defaultOption = this.createOptionElement('Choose course');
      const newCourseOption = this.createOptionElement('New course...', 'new');

      this.existingCourses = courses;

      defaultOption.setAttribute('selected', 'selected');
      defaultOption.setAttribute('disabled', 'disabled');

      courseSelectFragment.appendChild(defaultOption);
      courseSelectFragment.appendChild(newCourseOption);

      courses
        .filter(course => this.configuredCourse === undefined || this.configuredCourse.cid !== course.cid)
        .forEach(course => {
          courseSelectFragment.appendChild(this.createOptionElement(`${course.name} (${course.stations})`, course.cid));
        });

      // re-init widget
      this.removeChildren(courseSelect);
      courseSelect.appendChild(courseSelectFragment);

      M.FormSelect.init(courseSelect, {});
      this.registerCourseSelectEventHandlers();

      console.log('Rebuilt course selection menu.');
    } catch (error) {
      return console.error(error);
    }
  }

  private registerPlayerSelectEventHandlers(): void {
    const playerSelect = this.playerSelectElement!;

    playerSelect.removeEventListener('change', this.playerSelectionChangeListener);
    playerSelect.addEventListener('change', this.playerSelectionChangeListener);
  }

  private registerCourseSelectEventHandlers(): void {
    const courseSelect = this.courseSelectElement!;

    courseSelect.removeEventListener('change', this.courseSelectionChangeListener);
    courseSelect.addEventListener('change', this.courseSelectionChangeListener);
  }

  private registerStartButtonEventHandler(): void {
    this.queryElement('.start-game-btn').addEventListener('click', this.startGameClickListener);
  }

  private isPlayerConfigured(): boolean {
    return this.configuredPlayers.length > 0;
  }

  private isCourseConfigured(): boolean {
    return this.configuredCourse !== undefined;
  }

  private addPlayerToTable(player: Player): void {
    const playerEntries = this.queryElement('.player-entries');
    const playerEntry = document.createElement('tr');

    playerEntry.setAttribute('data-pid', '' + player.pid);
    playerEntry.appendChild(this.createElement('td', player.name));
    playerEntry.appendChild(this.createElement('td', player.email || '-'));
    playerEntry.appendChild(this.createElement('td', '-'));

    playerEntries.appendChild(playerEntry);

    this.configuredPlayers.push(player);

    if (this.isPlayerConfigured() && this.isCourseConfigured()) {
      this.queryElement('.start-game-btn').classList.remove('disabled');
    }
  }

  private addCourseToTable(course: Course): void {
    const courseEntries = this.queryElement('.course-entries');
    const courseEntry = document.createElement('tr');

    this.removeChildren(courseEntries);

    courseEntry.setAttribute('data-cid', '' + course.cid);
    courseEntry.appendChild(this.createElement('td', course.name));
    courseEntry.appendChild(this.createElement('td', course.place || '-'));
    courseEntry.appendChild(this.createElement('td', '' + course.stations));

    courseEntries.appendChild(courseEntry);

    this.configuredCourse = course;

    if (this.isPlayerConfigured() && this.isCourseConfigured()) {
      this.queryElement('.start-game-btn').classList.remove('disabled');
    }
  }

  private verifyPlayerInput(): void {
    const playerName = this.queryInputElement('.new-player-name').value;

    if (
      !playerName ||
      /^\s+/.test(playerName) ||
      /\s+$/.test(playerName) ||
      this.existingPlayers.some(player => player.name === playerName)
    ) {
      this.queryElement('.add-player-btn').classList.add('disabled');
    } else {
      this.queryElement('.add-player-btn').classList.remove('disabled');
    }
  }

  private verifyCourseInput(): void {
    const courseName = this.queryInputElement('.new-course-name').value;
    const noOfStations = this.queryInputElement('.new-course-no-of-stations').value;

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
      this.queryElement('.set-course-btn').classList.add('disabled');
    } else {
      this.queryElement('.set-course-btn').classList.remove('disabled');
    }
  }

  private queryInputElement(selector: string): HTMLInputElement {
    return <HTMLInputElement>this.queryElement(selector);
  }

  private createOptionElement(content: string, value?: string | number): HTMLOptionElement {
    const option = <HTMLOptionElement>this.createElement('option', content);

    if (value !== undefined) {
      option.value = '' + value;
    }
    return option;
  }

  /*** EVENT HANDLERS ***/

  private async onAddPlayerClick(event: Event) {
    event.preventDefault();
    this.queryInputElement('.add-player-btn').classList.add('disabled');

    const newPlayerName = this.queryInputElement('.new-player-name');
    const playerName = newPlayerName.value;

    newPlayerName.value = '';

    try {
      const player = await this.getStorage().addPlayer(playerName, '');

      this.addPlayerToTable(player);
      await this.updatePlayerSelectionMenu();

      this.hideElement('.add-player-container');
      this.showElement('.select-player-container');
    } catch (error) {
      console.error(`Failed to add player ${playerName}`);
    }
  }

  private async onPlayerSelectionChange(event: Event) {
    const pid = (<HTMLSelectElement>event.target).value;

    console.log('pid change: ' + pid);

    if (pid === 'new') {
      this.hideElement('.select-player-container');
      this.showElement('.add-player-container');
      this.queryElement('.new-player-name').focus();
    } else {
      try {
        const player = await this.getStorage().getPlayer(+pid);

        this.addPlayerToTable(player);
        this.updatePlayerSelectionMenu();
      } catch (error) {
        console.error(`Failed to load player with pid ${pid}.`);
      }
    }
  }

  private async onCourseSelectionChange(event: Event) {
    const cid = (<HTMLSelectElement>event.target).value;

    console.log('cid change: ' + cid);

    if (cid === 'new') {
      this.hideElement('.select-course-container');
      this.showElement('.add-course-container');
      this.queryInputElement('.new-course-name').focus();
    } else {
      try {
        const course = await this.getStorage().getCourse(+cid);

        this.addCourseToTable(course);
        this.updateCourseSelectionMenu();
      } catch (error) {
        console.error(`Failed to load course with cid ${cid}.`);
      }
    }
  }

  private async onSetCourseClick(event: Event) {
    event.preventDefault();
    this.queryInputElement('.set-course-btn').classList.add('disabled');

    const courseName = this.queryInputElement('.new-course-name').value;
    const noOfStations = +this.queryInputElement('.new-course-no-of-stations').value;

    this.queryInputElement('.new-course-name').value = '';
    this.queryInputElement('.new-course-no-of-stations').value = '';

    try {
      const course = await this.getStorage().addCourse(courseName, '', '', noOfStations);

      this.addCourseToTable(course);
      await this.updateCourseSelectionMenu();

      this.hideElement('.add-course-container');
      this.showElement('.select-course-container');
    } catch (error) {
      console.log(`Failed to add course '${courseName}'`);
    }
  }

  private async onStartGameClick(event: Event) {
    event.preventDefault();
    this.queryElement('.start-game-btn').classList.add('disabled'); // disable button while async db action is running

    const cid = +this.queryElement('.course-entries > tr[data-cid]').getAttribute('data-cid')!;
    const pids: number[] = [];

    for (const playerEntry of <any>this.queryElements('.player-entries > tr[data-pid]')) {
      pids.push(+playerEntry.getAttribute('data-pid')!);
    }

    try {
      const game = await this.getStorage().addGame(cid, pids);

      window.location.href = `#station-select-player;gid=${game.gid};station=1`;
    } catch (error) {
      console.error('Failed to add new game.');
    }
  }
}
