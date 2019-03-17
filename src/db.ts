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
import { Player, PlayerWithScore, Course, Game, Score, TotalScoreForGame } from './main';

/**
 * Do not call any of these functions after calling erase() or close()!
 */
export class DbWrapper {
  private dbConnected: boolean = false;
  private dbPromise: Promise<any> | null = null;

  async transaction(objectStores: string | string[], writeAccess: boolean = false): Promise<any> {
    const db = await this.requestDb();
    const transaction = db.transaction(objectStores, writeAccess ? 'readwrite' : 'readonly');

    return Array.isArray(objectStores)
      ? objectStores.reduce((map: any, objectStore: string) => {
          map[objectStore] = transaction.objectStore(objectStore);
          return map;
        }, {})
      : transaction.objectStore(objectStores);
  }

  async objectStoreNames(): Promise<string[]> {
    try {
      const db = await this.requestDb();

      return Array.prototype.slice.call(db.objectStoreNames);
    } catch (error) {
      throw new Error(`Failed to close database: ${error.message}`);
    }
  }

  async erase() {
    try {
      await this.close();

      return new Promise((resolve, reject) => {
        (function tryDeleteDb() {
          console.info('We now try to erase the db...');
          const deletionRequest = window.indexedDB.deleteDatabase('BowBuddyDb');

          deletionRequest.onsuccess = (e: any) => {
            console.info('deletionRequest.onsuccess');
            resolve(e);
          };
          deletionRequest.onblocked = () => {
            console.info('deletionRequest.onblocked');
            window.setTimeout(tryDeleteDb, 50); // try again indefinitely
          };
          deletionRequest.onerror = (e: any) => {
            console.info('deletionRequest.onerror');
            reject(e);
          };
        })();
      });
    } catch (error) {
      throw new Error(`Failed to erase database: ${error.message}`);
    }
  }

  async close(): Promise<void> {
    try {
      // TODO check if db is even open before calling requestDb()
      const db = await this.requestDb();

      // reset db handle promise
      this.dbPromise = null;
      this.dbConnected = false;
      db.close();
    } catch (error) {
      console.log(`Failed to close database: ${error.message}`);
    }
  }

  private async requestDb(): Promise<IDBDatabase> {
    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve, reject) => {
        const dbRequest = window.indexedDB.open('BowBuddyDb', 1);

        dbRequest.onupgradeneeded = (event: any) => {
          console.log('dbRequest.onupgradeneeded');

          const request = <IDBRequest>event.target;
          const db = request.result;

          const playerStore = db.createObjectStore('players', {
            keyPath: 'pid',
            autoIncrement: true
          });
          playerStore.createIndex('pid', 'pid', { unique: true });
          playerStore.createIndex('name', 'name', { unique: true });
          playerStore.createIndex('email', 'email', { unique: false });

          const courseStore = db.createObjectStore('courses', {
            keyPath: 'cid',
            autoIncrement: true
          });
          courseStore.createIndex('cid', 'cid', { unique: true });
          courseStore.createIndex('name', 'name', { unique: false });
          courseStore.createIndex('place', 'place', { unique: false });
          courseStore.createIndex('geolocation', 'geolocation', {
            unique: false
          });
          courseStore.createIndex('stations', 'stations', { unique: false });

          const gameStore = db.createObjectStore('games', {
            keyPath: 'gid',
            autoIncrement: true
          });
          gameStore.createIndex('gid', 'gid', { unique: true });
          gameStore.createIndex('cid', 'cid', { unique: false });
          gameStore.createIndex('pids', 'pids', {
            unique: false,
            multiEntry: true
          });
          gameStore.createIndex('starttime', 'date', { unique: true }); // new Date().toISOString() = ISO 8601 (UTC)
          gameStore.createIndex('endtime', 'date', { unique: true }); // new Date().toISOString() = ISO 8601 (UTC)

          const scoreStore = db.createObjectStore('scores', {
            keyPath: ['gid', 'pid', 'station']
          });
          scoreStore.createIndex('sid', ['gid', 'pid', 'station'], {
            unique: true
          }); // compound key path
          scoreStore.createIndex('gid', 'gid', { unique: false });
          scoreStore.createIndex('pid', 'pid', { unique: false });
          scoreStore.createIndex('station', 'station', { unique: false });
          scoreStore.createIndex('score', 'score', { unique: false }); // string format: 'first-turn:body-hit' OR 'miss'
        };
        dbRequest.onsuccess = (event: any) => {
          console.log('dbRequest.onsuccess');

          if (!this.dbConnected) {
            const request = <IDBRequest>event.target;
            this.dbConnected = true;
            resolve(request.result);
          }
        };
        dbRequest.onerror = (event: any) => {
          console.log('dbRequest.onerror');

          if (!this.dbConnected) {
            window.alert('This app does not work without IndexedDB enabled!');
            reject(event);
          }
          this.dbPromise = null;
          this.dbConnected = false;
        };
      });
    }
    return this.dbPromise;
  }
}

export class DbAccess {
  private dbWrapper: DbWrapper | null = null;

  async getPlayers(): Promise<Player[]> {
    const playerObjectStore = await this.db().transaction('players');
    return this.fetchAll(playerObjectStore);
  }

  async getPlayer(pid: number): Promise<Player> {
    const playerObjectStore = await this.db().transaction('players');
    return this.fetchById(playerObjectStore, 'pid', pid);
  }

  async getPlayersWithScore(gid: number, station: number): Promise<PlayerWithScore[]> {
    try {
      const players = await this.getPlayersForGame(gid);

      if (players.length === 0) {
        return [];
      } else {
        const scoreObjectStore = await this.db().transaction('scores');
        const playersWithScore: PlayerWithScore[] = [];

        for (const player of players) {
          const score = await this.fetchById(scoreObjectStore, 'sid', [gid, player.pid, station]);

          playersWithScore.push(score && score.score ? Object.assign(player, { score: score.score }) : player);
        }
        return playersWithScore;
      }
    } catch (error) {
      throw new Error(`Failed to load players with score: ${error.message}`);
    }
  }

  async addPlayer(name: string, email: string = ''): Promise<Player> {
    try {
      const playerObjectStore = await this.db().transaction('players', true);
      const playerRecord = { name, email };
      const request = playerObjectStore.add(playerRecord);

      return new Promise((resolve, reject) => {
        request.onsuccess = (event: any) => resolve({ pid: event.target.result, ...playerRecord });
        request.onerror = (event: any) => reject(event);
      });
    } catch (error) {
      throw new Error(`Failed to add player: ${error.message}`);
    }
  }

  async getCourse(cid: number): Promise<Course> {
    try {
      const courseObjectStore = await this.db().transaction('courses');

      return this.fetchById(courseObjectStore, 'cid', cid);
    } catch (error) {
      throw new Error(`Failed to fetch course with cid ${cid}: ${error.message}`);
    }
  }

  async getCourses(): Promise<Course[]> {
    try {
      const courseObjectStore = await this.db().transaction('courses');

      return this.fetchAll(courseObjectStore);
    } catch (error) {
      throw new Error(`Failed to fetch all courses: ${error.message}`);
    }
  }

  async getCourseForGame(gid: number): Promise<Course> {
    try {
      const objectStores = await this.db().transaction(['courses', 'games']);
      const game = await this.fetchById(objectStores.games, 'gid', gid);

      return this.fetchById(objectStores.courses, 'cid', game.cid);
    } catch (error) {
      throw new Error(`Failed to fetch course for game with gid ${gid}: ${error.message}`);
    }
  }

  async addCourse(name: string, place: string, geolocation: string, stations: number): Promise<Course> {
    try {
      const courseObjectStore = await this.db().transaction('courses', true);
      const courseRecord = { name, place, geolocation, stations };
      const request = courseObjectStore.add(courseRecord);

      return new Promise((resolve, reject) => {
        request.onsuccess = (event: any) => resolve({ cid: event.target.result, ...courseRecord });
        request.onerror = (event: any) => reject(event);
      });
    } catch (error) {
      throw new Error(`Failed to add course ${name} (${stations}): ${error.message}`);
    }
  }

  async getGames(): Promise<Game[]> {
    try {
      const gameObjectStore = await this.db().transaction('games');

      return this.fetchAll(gameObjectStore);
    } catch (error) {
      throw new Error(`Failed to fetch all games: ${error.message}`);
    }
  }

  async getGame(gid: number): Promise<Game> {
    try {
      const gameObjectStore = await this.db().transaction('games');

      return this.fetchById(gameObjectStore, 'gid', gid);
    } catch (error) {
      throw new Error(`Failed to fetch game with gid ${gid}: ${error.message}`);
    }
  }

  async addGame(cid: number, pids: Array<number>, starttime?: string, endtime?: string): Promise<Game> {
    try {
      const gameObjectStore = await this.db().transaction('games', true);
      const request = gameObjectStore.add({
        cid: cid,
        pids: pids,
        starttime: starttime || new Date().toISOString(),
        endtime: endtime || null
      });

      return new Promise<any>((resolve, reject) => {
        request.onsuccess = (event: any) =>
          resolve({
            gid: event.target.result,
            cid: cid,
            pids: pids,
            starttime: starttime,
            endtime: endtime
          });
        request.onerror = (event: any) => reject(event);
      });
    } catch (error) {
      throw new Error(`Failed to fetch course with cid ${cid}: ${error.message}`);
    }
  }

  // returns promise with updated game record
  async finishGame(gid: number) {
    try {
      const gameObjectStore = await this.db().transaction('games', true);

      return this.updateRecord(gameObjectStore, 'gid', gid, game => {
        // change timestamp only if it has not already been set!
        if (!game.endtime) {
          game.endtime = new Date().toISOString();
          return true;
        }
        return false;
      });
    } catch (error) {
      throw new Error(`Failed to finish game with gid ${gid}: ${error.message}`);
    }
  }

  async setScore(gid: number, pid: number, station: number, score: string): Promise<Score> {
    try {
      const scoreObjectStore = await this.db().transaction('scores', true);
      const scoreRecord = { gid, pid, station, score };
      const request = scoreObjectStore.put(scoreRecord);

      return new Promise<any>((resolve, reject) => {
        request.onsuccess = (event: any) => resolve(scoreRecord);
        request.onerror = (event: any) => reject(event);
      });
    } catch (error) {
      throw new Error(`Failed to set score for gid: ${gid}, pid: ${pid}, station: ${station}: ${error.message}`);
    }
  }

  async getTotalScoreForGame(gid: number): Promise<TotalScoreForGame> {
    try {
      const players = await this.getPlayersForGame(gid);
      const scoreObjectStore = await this.db().transaction('scores');

      return this.fetchAll(scoreObjectStore).then((scores: Score[]) => {
        const totalScore: TotalScoreForGame = { players: players, scores: new Map() };

        players.forEach(player => totalScore.scores.set(player.pid, []));
        scores
          .filter(score => score.gid === gid)
          .sort((scoreA, scoreB) => scoreA.station - scoreB.station)
          .forEach(score => {
            totalScore.scores.get(score.pid)!.push(score.score || 'undefined-score');
          });
        return totalScore;
      });
    } catch (error) {
      throw new Error(`Failed to fetch course with gid ${gid}: ${error.message}`);
    }
  }

  private async getPlayersForGame(gid: number): Promise<Player[]> {
    try {
      const objectStores = await this.db().transaction(['games', 'players']);

      return this.fetchById(objectStores.games, 'gid', gid).then(game =>
        this.fetchAll(
          objectStores.players,
          IDBKeyRange.bound(Math.min.apply(null, game.pids), Math.max.apply(null, game.pids)),
          player => game.pids.indexOf(player.pid) !== -1
        )
      );
    } catch (error) {
      throw new Error(`Failed to fetch all players for game with gid ${gid}: ${error.message}`);
    }
  }

  async dump(): Promise<any> {
    const dbRef = this.db();
    let dbObject: any = {};

    try {
      const objectStoreNames = await dbRef.objectStoreNames();
      const objectStores = await dbRef.transaction(objectStoreNames);

      for (const objectStoreName of objectStoreNames) {
        const records = await this.fetchAll(objectStores[objectStoreName]);

        dbObject[objectStoreName] = records;
      }
      return dbObject;
    } catch (error) {
      throw new Error(`Failed to create database dump: ${error.message}`);
    }
  }

  async importDb(dbObject: any): Promise<any> {
    console.log('>> Step 1: Delete old database');

    try {
      await this.db().erase();

      const objectStoreNames = Object.getOwnPropertyNames(dbObject);

      console.log('>> Step 2: Requested transactions for ' + objectStoreNames);

      const objectStores = await this.db().transaction(objectStoreNames, true);

      // TODO check why we never get here!!
      console.log('>> Step 2.1: We now have all the requested object stores');

      let objectStoresCompleted = 0;
      let steps = 2;

      return new Promise((resolve, reject) => {
        for (const objectStoreName of objectStoreNames) {
          console.log(`>> Step ${++steps}: Add all data records into object storage '${objectStoreName}'`);

          const dataRecords = dbObject[objectStoreName];
          let recordsAdded = 0;

          for (const dataRecord of dataRecords) {
            const addRequest = objectStores[objectStoreName].add(dataRecord);

            addRequest.onsuccess = (e: any) => {
              console.log('recordsAdded: ' + recordsAdded);
              console.log('objectStoresCompleted: ' + objectStoresCompleted);

              if (++recordsAdded === dataRecords.length && ++objectStoresCompleted === objectStoreNames.length) {
                resolve();
              }
            };
            addRequest.onerror = (e: any) => reject(e);
          }
        }
      });
    } catch (error) {
      throw new Error(`Failed to import database from object: ${error.message}`);
    }
  }

  erase(): Promise<any> {
    return this.db().erase();
  }

  private fetchAll(objectStore: IDBObjectStore, keyRange?: IDBKeyRange, filter?: (o: any) => boolean): Promise<any[]> {
    return new Promise<any[]>((resolve, reject) => {
      const cursorRequest = objectStore.openCursor(keyRange);

      if (filter !== undefined && keyRange !== undefined) {
        const filteredDataObjects: any[] = [];

        cursorRequest.onsuccess = (event: any) => {
          const cursor = cursorRequest.result;

          if (cursor) {
            const dataObject = cursor.value;

            if (filter(dataObject)) {
              filteredDataObjects.push(dataObject);
            }
            cursor.continue();
          } else {
            resolve(filteredDataObjects);
          }
        };
      } else {
        const cursorRequest = objectStore.openCursor();
        const dataObjects: Array<any> = [];

        cursorRequest.onsuccess = (event: any) => {
          const cursor = cursorRequest.result;

          if (cursor) {
            dataObjects.push(cursor.value);
            cursor.continue();
          } else {
            resolve(dataObjects);
          }
        };
      }

      cursorRequest.onerror = (e: any) => reject(e);
    });
  }

  private fetchById(objectStore: IDBObjectStore, indexName: string, keyPath: number | number[]): Promise<any> {
    return new Promise((resolve, reject) => {
      const index: IDBIndex = objectStore.index(indexName);
      const request: IDBRequest = index.get(keyPath);

      request.onsuccess = (event: any) => resolve(request.result);
      request.onerror = (e: any) => reject(e);
    });
  }

  private updateRecord(
    objectStore: IDBObjectStore,
    indexName: string,
    keyPath: number,
    update: (record: any) => boolean
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const index = objectStore.index(indexName);
      const cursorRequest = index.openCursor(keyPath);

      cursorRequest.onsuccess = (event: any) => {
        const cursor = cursorRequest.result;

        if (cursor) {
          const dataRecord = cursor.value;

          if (update(dataRecord)) {
            const updateRequest = cursor.update(dataRecord);

            updateRequest.onsuccess = () => resolve(dataRecord);
            updateRequest.onerror = (e: any) => reject(e);
          } else {
            resolve(dataRecord);
          }
        } else {
          reject(new Error('Cannot find record'));
        }
      };
      cursorRequest.onerror = (e: any) => reject(e);
    });
  }

  private db(): DbWrapper {
    if (this.dbWrapper === null) {
      this.dbWrapper = new DbWrapper();
    }
    return this.dbWrapper;
  }
}
