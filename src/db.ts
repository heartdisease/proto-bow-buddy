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
import { Player, PlayerWithScore, Course, Game, Score, TotalScoreForGame } from './main';

/**
 * Do not call any of these functions after calling erase() or close()!
 */
export class DbWrapper {
  private dbConnected: boolean = false;
  private dbPromise: Promise<any> | null = null;

  transaction(objectStores: string | Array<string>, writeAccess: boolean = false): Promise<any> {
    return this.requestDb().then(db => {
      const transaction = db.transaction(objectStores, writeAccess ? 'readwrite' : 'readonly');

      return Array.isArray(objectStores)
        ? objectStores.reduce((map: any, objectStore: string) => {
            map[objectStore] = transaction.objectStore(objectStore);
            return map;
          }, {})
        : transaction.objectStore(objectStores);
    });
  }

  objectStoreNames(): Promise<any> {
    return this.requestDb().then(db => Array.prototype.slice.call(db.objectStoreNames));
  }

  erase(): Promise<any> {
    return this.close().then(() => {
      return new Promise<any>((resolve, reject) => {
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
    });
  }

  close(): Promise<any> {
    // TODO check if db is even open before calling requestDb()
    return this.requestDb().then(db => {
      // reset db handle promise
      this.dbPromise = null;
      this.dbConnected = false;
      db.close();
    });
  }

  private requestDb(): Promise<IDBDatabase> {
    if (this.dbPromise !== null) {
      return this.dbPromise;
    }
    return (this.dbPromise = new Promise<any>((resolve, reject) => {
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
      // dbRequest.onclose = (event: any) => {
      //   console.log('dbRequest.onclose');

      //   this.dbPromise = null;
      //   this.dbConnected = false;
      //   window.alert('The database got closed unexpectedly!');
      // };
    }));
  }
}

export class DbAccess {
  private dbWrapper: DbWrapper | null = null;

  getPlayers(): Promise<Array<Player>> {
    return this.db()
      .transaction('players')
      .then(playerObjectStore => this.fetchAll(playerObjectStore));
  }

  getPlayer(pid: number): Promise<Player> {
    return this.db()
      .transaction('players')
      .then(playerObjectStore => this.fetchById(playerObjectStore, 'pid', pid));
  }

  getPlayersWithScore(gid: number, station: number): Promise<Array<PlayerWithScore>> {
    return this.getPlayersForGame(gid).then(players => {
      if (players.length === 0) {
        return [];
      } else {
        return this.db()
          .transaction('scores')
          .then(scoreObjectStore => {
            const playersWithScore: Array<PlayerWithScore> = [];

            return new Promise<any>((resolve, reject) => {
              players.forEach(player => {
                this.fetchById(scoreObjectStore, 'sid', [gid, player.pid, station]).then(score => {
                  playersWithScore.push(
                    score && score.score ? (<any>Object).assign(player, { score: score.score }) : player
                  );

                  if (players.length === playersWithScore.length) {
                    resolve(playersWithScore);
                  }
                });
              });
            });
          });
      }
    });
  }

  addPlayer(name: string, email: string = ''): Promise<Player> {
    return this.db()
      .transaction('players', true)
      .then(playerObjectStore => {
        const playerRecord = { name, email };
        const request = playerObjectStore.add(playerRecord);

        return new Promise<any>((resolve, reject) => {
          request.onsuccess = (event: any) => resolve({ pid: event.target.result, ...playerRecord });
          request.onerror = (event: any) => reject(event);
        });
      });
  }

  getCourses(): Promise<Array<Course>> {
    return this.db()
      .transaction('courses')
      .then(courseObjectStore => this.fetchAll(courseObjectStore));
  }

  getCourseForGame(gid: number): Promise<any> {
    return this.db()
      .transaction(['courses', 'games'])
      .then(objectStores =>
        this.fetchById(objectStores.games, 'gid', gid).then(game =>
          this.fetchById(objectStores.courses, 'cid', game.cid)
        )
      );
  }

  addCourse(name: string, place: string, geolocation: string, stations: number): Promise<any> {
    return this.db()
      .transaction('courses', true)
      .then(courseObjectStore => {
        const courseRecord = { name, place, geolocation, stations };
        const request = courseObjectStore.add(courseRecord);

        return new Promise<any>((resolve, reject) => {
          request.onsuccess = (event: any) => resolve({ cid: event.target.result, ...courseRecord });
          request.onerror = (event: any) => reject(event);
        });
      });
  }

  getGames(): Promise<Array<Game>> {
    return this.db()
      .transaction('games')
      .then(gameObjectStore => this.fetchAll(gameObjectStore));
  }

  getGame(gid: number): Promise<Game> {
    return this.db()
      .transaction('games')
      .then(gameObjectStore => this.fetchById(gameObjectStore, 'gid', gid));
  }

  addGame(cid: number, pids: Array<number>, starttime: string = undefined, endtime: string = undefined): Promise<Game> {
    return this.db()
      .transaction('games', true)
      .then(gameObjectStore => {
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
      });
  }

  // returns promise with updated game record
  finishGame(gid: number): Promise<any> {
    return this.db()
      .transaction('games', true)
      .then(gameObjectStore => {
        return this.updateRecord(gameObjectStore, 'gid', gid, game => {
          // change timestamp only if it has not already been set!
          if (!game.endtime) {
            game.endtime = new Date().toISOString();
            return true;
          }
          return false;
        });
      });
  }

  setScore(gid: number, pid: number, station: number, score: string): Promise<Score> {
    return this.db()
      .transaction('scores', true)
      .then(scoreObjectStore => {
        const scoreRecord = { gid, pid, station, score };
        const request = scoreObjectStore.put(scoreRecord);

        return new Promise<any>((resolve, reject) => {
          request.onsuccess = (event: any) => resolve(scoreRecord);
          request.onerror = (event: any) => reject(event);
        });
      });
  }

  getTotalScoreForGame(gid: number): Promise<TotalScoreForGame> {
    return this.getPlayersForGame(gid).then((players: Array<Player>) => {
      return this.db()
        .transaction('scores')
        .then(scoreObjectStore => {
          return this.fetchAll(scoreObjectStore).then((scores: Array<Score>) => {
            const totalScore: TotalScoreForGame = { players: players, scores: new Map() };

            players.forEach(player => totalScore.scores.set(player.pid, []));
            scores
              .filter(score => score.gid === gid)
              .sort((scoreA, scoreB) => scoreA.station - scoreB.station)
              .forEach(score => {
                totalScore.scores.get(score.pid).push(score.score || 'undefined-score');
              });
            return totalScore;
          });
        });
    });
  }

  private getPlayersForGame(gid: number): Promise<Array<Player>> {
    return this.db()
      .transaction(['games', 'players'])
      .then(objectStores => {
        return this.fetchById(objectStores.games, 'gid', gid).then(game =>
          this.fetchAll(
            objectStores.players,
            IDBKeyRange.bound(Math.min.apply(null, game.pids), Math.max.apply(null, game.pids)),
            player => game.pids.indexOf(player.pid) !== -1
          )
        );
      });
  }

  dump(): Promise<any> {
    const dbRef = this.db();
    let dbObject: any = {};

    return dbRef.objectStoreNames().then(objectStoreNames => {
      return dbRef.transaction(objectStoreNames).then(objectStores => {
        let storagesDumped = 0;

        return new Promise<any>((resolve, reject) => {
          objectStoreNames.forEach((objectStoreName: string) => {
            return this.fetchAll(objectStores[objectStoreName]).then(records => {
              dbObject[objectStoreName] = records;
              if (++storagesDumped === objectStoreNames.length) {
                resolve(dbObject);
              }
            });
          });
        });
      });
    });
  }

  importDb(dbObject: any): Promise<any> {
    console.log('>> Step 1: Delete old database');

    return this.db()
      .erase()
      .then(e => {
        const objectStoreNames = Object.getOwnPropertyNames(dbObject);

        console.log('>> Step 2: Requested transactions for ' + objectStoreNames);

        return this.db()
          .transaction(objectStoreNames, true)
          .then((objectStores: any) => {
            // TODO check why we never get here!!
            console.log('>> Step 2.1: We now have all the requested object stores');

            let objectStoresCompleted = 0;
            let steps = 2;

            return new Promise<any>((resolve, reject) => {
              objectStoreNames.forEach(objectStoreName => {
                console.log(`>> Step ${++steps}: Add all data records into object storage '${objectStoreName}'`);

                const dataRecords = dbObject[objectStoreName];
                let recordsAdded = 0;

                dataRecords.forEach((dataRecord: any) => {
                  let addRequest = objectStores[objectStoreName].add(dataRecord);

                  addRequest.onsuccess = (e: any) => {
                    console.log('recordsAdded: ' + recordsAdded);
                    console.log('objectStoresCompleted: ' + objectStoresCompleted);

                    if (++recordsAdded === dataRecords.length && ++objectStoresCompleted === objectStoreNames.length) {
                      resolve();
                    }
                  };
                  addRequest.onerror = (e: any) => reject(e);
                });
              });
            });
          })
          .catch(error => {
            console.error('Cannot open transaction: ' + error);
            throw error;
          });
      });
  }

  erase(): Promise<any> {
    return this.db().erase();
  }

  private fetchAll(
    objectStore: IDBObjectStore,
    keyRange: IDBKeyRange = undefined,
    filter: (o: any) => boolean = undefined
  ): Promise<Array<any>> {
    if (filter !== undefined && keyRange !== undefined) {
      return new Promise<any>((resolve, reject) => {
        const cursorRequest = objectStore.openCursor(keyRange);
        const filteredDataObjects: Array<any> = [];

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
      });
    }

    return new Promise<any>((resolve, reject) => {
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
    });
  }

  private fetchById(objectStore: IDBObjectStore, indexName: string, keyPath: number | Array<number>): Promise<any> {
    return new Promise<any>((resolve, reject) => {
      const index: IDBIndex = objectStore.index(indexName);
      const request: IDBRequest = index.get(keyPath);

      request.onsuccess = (event: any) => {
        resolve(request.result);
      };
    });
  }

  private updateRecord(
    objectStore: IDBObjectStore,
    indexName: string,
    keyPath: number,
    update: (record: any) => boolean
  ): Promise<any> {
    return new Promise<any>((resolve, reject) => {
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
