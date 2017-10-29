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
 * Copyright 2017 Christoph Matscheko
 */

window.BowBuddy = window.BowBuddy || {

	getUrlParams: function() {
		if (!window.location.search) {
			return {}
		}
		const numRegExp = /^(0|-?[1-9][0-9]*)$/;
		
		return window.location.search
			.substring(1)
			.split("&")
			.map((keyValueStr) => keyValueStr.split("="))
			.reduce((urlParams, keyValuePair) => {
				const key = keyValuePair[0];
				const value = keyValuePair[1];
				
				urlParams[key] = numRegExp.test(value) ? +value : value;
				return urlParams;
			}, {});
	},

	switchToFullscreenFunc: function() {
		let clickCounter = 0;
		
		return () => {
			if ((++clickCounter%2 === 0) & !document.fullscreenElement) {
				console.log("Init fullscreen...");
		
				if (document.documentElement.requestFullscreen) {
					document.documentElement.requestFullscreen();
				} else if (document.documentElement.webkitRequestFullscreen) {
					document.documentElement.webkitRequestFullscreen();
				}
			}
		};
	},
	
	scoreToPoints: function(score) {
		if (score === "miss") {
			return 0;
		}
		
		const scoreParts = score.split(":");
		let penalty;
		
		switch (scoreParts[0]) {
			case "first-turn":
				penalty = 0;
				break;
			case "second-turn":
				penalty = 1;
				break;
			case "third-turn":
				penalty = 2;
				break;
			default:
				throw new Error("Invalid score format '" + score + "'");
		}
		switch (scoreParts[1]) {
			case "body-hit": return 16 - penalty * 6;
			case "kill-hit": return 18 - penalty * 6;
			case "center-kill-hit": return 20 - penalty * 6;
			default:
				throw new Error("Invalid score format '" + score + "'");
		}
	},
	
	scoreToDisplayName: function(score) {
		if (score === "miss") {
			return "Miss";
		}
	
		const scoreParts = score.split(":");
		let scoreLabel;
		
		switch (scoreParts[0]) {
			case "first-turn":
				scoreLabel = "1<sup>st</sup>";
				break;
			case "second-turn":
				scoreLabel = "2<sup>nd</sup>";
				break;
			case "third-turn":
				scoreLabel = "3<sup>rd</sup>";
				break;
			default:
				throw new Error("Invalid score format '" + score + "'");
		}
		scoreLabel += " - ";
		switch (scoreParts[1]) {
			case "body-hit":
				scoreLabel += "Body";
				break;
			case "kill-hit":
				scoreLabel += "Kill";
				break;
			case "center-kill-hit":
				scoreLabel += "Center Kill";
				break;
			default:
				throw new Error("Invalid score format '" + score + "'");
		}
		
		return scoreLabel;
	},
	
	storage: (function(){
		let dbPromise = null;
	
		function requestDb() {
			if (dbPromise !== null) {
				return dbPromise;
			}
			return dbPromise = new Promise((resolve, reject) => {
				dbRequest = window.indexedDB.open("BowBuddyDb", 1);
				dbRequest.onupgradeneeded = (event) => {
					console.log("dbRequest.onupgradeneeded");
					
					const db = event.target.result;
					
					const playerStore = db.createObjectStore("players", { keyPath: "pid", autoIncrement: true });
					playerStore.createIndex("pid", "pid", { unique: true });
					playerStore.createIndex("name", "name", { unique: true });
					playerStore.createIndex("email", "email", { unique: false });
						
					const courseStore = db.createObjectStore("courses", { keyPath: "cid", autoIncrement: true });
					courseStore.createIndex("cid", "cid", { unique: true });
					courseStore.createIndex("name", "name", { unique: false });
					courseStore.createIndex("place", "place", { unique: false });
					courseStore.createIndex("geolocation", "geolocation", { unique: false });
					courseStore.createIndex("stations", "stations", { unique: false });
					
					const gameStore = db.createObjectStore("games", { keyPath: "gid", autoIncrement: true });
					gameStore.createIndex("gid", "gid", { unique: true });
					gameStore.createIndex("cid", "cid", { unique: false });
					gameStore.createIndex("pids", "pids", { unique: false, multiEntry: true });
					gameStore.createIndex("starttime", "date", { unique: true }); // new Date().toISOString() = ISO 8601 (UTC)
					gameStore.createIndex("endtime", "date", { unique: true }); // new Date().toISOString() = ISO 8601 (UTC)
					
					const scoreStore = db.createObjectStore("scores", { keyPath: ["gid", "pid", "station"] });
					scoreStore.createIndex("sid", ["gid", "pid", "station"], { unique: true }); // compound key path
					scoreStore.createIndex("gid", "gid", { unique: false });
					scoreStore.createIndex("pid", "pid", { unique: false });
					scoreStore.createIndex("station", "station", { unique: false });
					scoreStore.createIndex("score", "score", { unique: false }); // string format: "first-turn:body-hit" OR "miss"
				};
				dbRequest.onerror = (event) => {
					window.alert("This app does not work without IndexedDB enabled!");
					reject(event);
				};
				dbRequest.onsuccess = (event) => {
					console.log("dbRequest.onsuccess");
					resolve(event.target.result);
				};
			});
		}
	
		// TODO choose less inefficient design (functions have to be created each time again)
		function db() {
			const dbPromise = requestDb();
			
			return {
			
				// objectStores {Array|String}
				// writeAccess {boolean}
				transaction: function(objectStores, writeAccess) {
					return dbPromise.then((db) => {
						const transaction = db.transaction(objectStores, writeAccess ? "readwrite" : "readonly");
						
						return Array.isArray(objectStores)
							? objectStores.reduce(
								(map, objectStore) => {
									map[objectStore] = transaction.objectStore(objectStore);
									return map;
								}, {})
							: transaction.objectStore(objectStores);
					});
				}
			};
		}
		
		function fetchAll(objectStore, keyRange, filter) {
			if (filter) {
				return new Promise((resolve, reject) => {
					let filteredDataObjects = [];

					objectStore.openCursor(keyRange).onsuccess = (event) => {
						const cursor = event.target.result;
				
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
			
			return new Promise((resolve, reject) => {
				let dataObjects = [];

				objectStore.openCursor().onsuccess = (event) => {
					const cursor = event.target.result;
				
					if (cursor) {
						dataObjects.push(cursor.value);
						cursor.continue();
					} else {
						resolve(dataObjects);
					}
				};
			});
		}
		
		function fetchById(objectStore, indexName, keyPath) {
			return new Promise((resolve, reject) => {
				const index = objectStore.index(indexName);
				const request = index.get(keyPath);
				
				request.onsuccess = (event) => {
					resolve(event.target.result);
				}
			});
		}
		
		return {
			
			getPlayers: function() {
				return db().transaction("players").then((playerObjectStore) => fetchAll(playerObjectStore));
			},
			
			getPlayer: function(pid) {
				return db().transaction("players").then((playerObjectStore) => fetchById(playerObjectStore, "pid", pid));
			},
			
			getPlayersWithScore: function(gid, station) {
				return db().transaction(["players", "games"])
					.then((objectStores) => fetchById(objectStores.games, "gid", gid)
						.then((game) =>
							fetchAll(
								objectStores.players,
								IDBKeyRange.bound(Math.min.apply(null, game.pids), Math.max.apply(null, game.pids)),
								(player) => game.pids.indexOf(player.pid) !== -1)
						)
					)
					.then((players) => {
						if (players.length === 0) {
							return [];
						} else {
							return db().transaction("scores")
								.then((scoreObjectStore) => {
									let playersWithScore = [];
								
									return new Promise((resolve, reject) => {
										players.forEach((player) => {
											fetchById(scoreObjectStore, "sid", [gid, player.pid, station])
												.then((score) => {
													playersWithScore.push((score && score.score) ? Object.assign(player, { score: score.score }) : player);
												
													if (players.length === playersWithScore.length) {
														resolve(playersWithScore);
													}
												});
										});
									});
								});
						}
					});
			},
			
			addPlayer: function(name, email) {
				return db().transaction("players", true).then((playerObjectStore) => {
					const request = playerObjectStore.add({ name: name, email: email });
					
					return new Promise((resolve, reject) => {
						request.onsuccess = (event) => resolve({ pid: event.target.result, name: name, email: email });
						request.onerror = (event) => reject(event);
					});
				});
			},
			
			getCourses: function() {
				return db().transaction("courses").then((courseObjectStore) => fetchAll(courseObjectStore));
			},
			
			getCourseForGame: function(gid) {
				return db().transaction(["courses", "games"])
					.then((objectStores) =>
						fetchById(objectStores.games, "gid", gid)
							.then((game) => fetchById(objectStores.courses, "cid", game.cid)));
			},
			
			addCourse: function(name, place, geolocation, stations) {
				stations = +stations; // coerce stations into being a number
				return db().transaction("courses", true)
					.then((courseObjectStore) => {
						const request = courseObjectStore.add({
							name: name,
							place: place,
							geolocation: geolocation,
							stations: stations
						});
					
						return new Promise((resolve, reject) => {
							request.onsuccess = (event) => resolve({
								cid: event.target.result,
								name: name,
								place: place,
								geolocation: geolocation,
								stations: stations
							});
							request.onerror = (event) => reject(event);
						});
					});
			},
			
			getGames: function() {
				return db().transaction("games").then((gameObjectStore) => fetchAll(gameObjectStore));
			},
			
			getGame: function(gid) {
				return db().transaction("games").then((gameObjectStore) => fetchById(gameObjectStore, "gid", gid));
			},
			
			addGame: function(cid, pids, starttime, endtime) {
				return db().transaction("games", true)
					.then((gameObjectStore) => {
						const request = gameObjectStore.add({
							cid: cid,
							pids: pids,
							starttime: starttime || new Date().toISOString(),
							endtime: endtime || null
						});
					
						return new Promise((resolve, reject) => {
							request.onsuccess = (event) => resolve({
								gid: event.target.result,
								cid: cid,
								pids: pids,
								starttime: starttime,
								endtime: endtime
							});
							request.onerror = (event) => reject(event);
						});
					});
			},
			
			setScore: function(gid, pid, station, score) {
				return db().transaction("scores", true)
					.then((scoreObjectStore) => {
						const request = scoreObjectStore.put({
							gid: gid,
							pid: pid,
							station: station,
							score: score
						});
					
						return new Promise((resolve, reject) => {
							request.onsuccess = (event) => resolve({
								gid: gid,
								pid: pid,
								station: station,
								score: score
							});
							request.onerror = (event) => reject(event);
						});
					});
			},
			
			dump: function() {
				return null; // TODO return promise that returns the entire database as a JSON object
			},
			
			erase: function() {
				const deletedRequest = window.indexedDB.deleteDatabase("BowBuddyDb");
				
				return new Promise((resolve, reject) => {
					deletedRequest.onsuccess = (e) => resolve(e);
					deletedRequest.onerror = (e) => reject(e);
				});
			}
		};
	}())
};

