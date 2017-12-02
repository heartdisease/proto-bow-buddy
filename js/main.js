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
"use strict";

window.BowBuddy = window.BowBuddy || {
	
	getVersion: function() {
		return "1.6";
	},
	
	updateWindowTitle: function(version) {
		document.title = document.title.replace(/\{\$version\}/g, version);
	},

	getUrlParams: function() {
		if (!window.location.hash) {
			console.log("getUrlParams(): {}");
			return {};
		}
		const numRegExp = /^(0|-?[1-9][0-9]*)$/;
		const urlParams = window.location.hash
			.substring(1) // omit the # at the beginning
			.split(";")
			.map((keyValueStr) => keyValueStr.split("="))
			.reduce((urlParams, keyValuePair) => {
				const key = keyValuePair[0];
				const value = keyValuePair[1];
				
				urlParams[key] = numRegExp.test(value) ? +value : value;
				return urlParams;
			}, {});
			
		console.log("getUrlParams(): " + JSON.stringify(urlParams));
		return urlParams;
	},

	switchToFullscreenFunc: function() {
		let clickCounter = 0;
		
		return () => {
			if ((++clickCounter % 3 === 0) & !document.fullscreenElement) {
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
	
	getDuration: function(starttime, endtime) {
		const startDate = new Date(starttime);
		const endDate = new Date(endtime);
		const diffInMs = endDate.getTime() - startDate.getTime();
		let duration = "";
		
		if (diffInMs < 0) {
			throw new Error("Start time is after end time!");
		}
		const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
		const diffInHours = Math.floor(diffInMinutes / 60);
		
		if (diffInHours >= 1) {
			duration += diffInHours + "h ";
		}
		duration += (diffInMinutes - diffInHours * 60) + "m";
		return duration;
	},
	
	storage: (function(){
		let dbConnected = false;
		let dbPromise = null;
	
		function requestDb() {
			if (dbPromise !== null) {
				return dbPromise;
			}
			return dbPromise = new Promise((resolve, reject) => {
				const dbRequest = window.indexedDB.open("BowBuddyDb", 1);
				
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
				dbRequest.onsuccess = (event) => {
					console.log("dbRequest.onsuccess");
					
					if (!dbConnected) {
						dbConnected = true;
						resolve(event.target.result);
					}
				};
				dbRequest.onerror = (event) => {
					console.log("dbRequest.onerror");
					
					if (!dbConnected) {
						window.alert("This app does not work without IndexedDB enabled!");
						reject(event);
					}
					dbPromise = null;
					dbConnected = false;
				};
				dbRequest.onclose = (event) => {
					console.log("dbRequest.onclose");
					
					dbPromise = null;
					dbConnected = false;
					window.alert("The database got closed unexpectedly!");
				};
			});
		}
	
		// TODO choose less inefficient design (functions have to be created each time again)
		function db() {
			// objectStores {Array|String}
			// writeAccess {boolean}
			function transaction(objectStores, writeAccess) {
				return requestDb().then((db) => {
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
			
			function objectStoreNames() {
				return requestDb().then((db) => Array.prototype.slice.call(db.objectStoreNames));
			}
			
			function erase() {
				return close().then(() => {
					return new Promise((resolve, reject) => {
						(function tryDeleteDb(){
							console.info("We now try to erase the db...");
							const deletionRequest = window.indexedDB.deleteDatabase("BowBuddyDb");
							
							deletionRequest.onsuccess = (e) => {
								console.info("deletionRequest.onsuccess");
								resolve(e);
							};
							deletionRequest.onblocked = () => {
								console.info("deletionRequest.onblocked");
								window.setTimeout(tryDeleteDb, 50); // try again indefinitely
							};
							deletionRequest.onerror = (e) => {
								console.info("deletionRequest.onerror");
								reject(e);
							};
						}());
					});
				});
			}
			
			function close() {
				// TODO check if db is even open before calling requestDb()
				return requestDb().then((db) => {
					// reset db handle promise
					dbPromise = null;
					dbConnected = false;
					db.close();
				});
			}
			
			// do not call any of these functions after calling erase() or close()!
			return {
				"transaction": transaction,
				"objectStoreNames": objectStoreNames,
				"erase": erase,
				"close": close
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
		
		function updateRecord(objectStore, indexName, keyPath, update) {
			return new Promise((resolve, reject) => {
				const index = objectStore.index(indexName);
				const cursorRequest = index.openCursor(keyPath);
				
				cursorRequest.onsuccess = (event) => {
					const cursor = event.target.result;
					
					if (cursor) {
						const dataRecord = cursor.value;
						
						if (update(dataRecord)) {
							const updateRequest = cursor.update(dataRecord);
							
							updateRequest.onsuccess = () => resolve(dataRecord);
							updateRequest.onerror = (e) => reject(e);
						} else {
							resolve(dataRecord);
						}
					} else {
						reject(new Error("Cannot find record"));
					}
				};
				cursorRequest.onerror = (e) => reject(e);
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
					.then((objectStores) => {
						return fetchById(objectStores.games, "gid", gid)
							.then((game) => fetchAll(
									objectStores.players,
									IDBKeyRange.bound(Math.min.apply(null, game.pids), Math.max.apply(null, game.pids)),
									(player) => game.pids.indexOf(player.pid) !== -1));
					})
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
			
			// returns promise with updated game record
			finishGame: function(gid) {
				return db().transaction("games", true)
					.then((gameObjectStore) => {
						return updateRecord(gameObjectStore, "gid", gid, (game) => {
							// change timestamp only if it has not already been set!
							if (!game.endtime) {
								game.endtime = new Date().toISOString();
								return true;
							}
							return false;
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
				const dbRef = db();
				let dbObject = {};
				
				return dbRef.objectStoreNames()
					.then((objectStoreNames) => {
						return dbRef.transaction(objectStoreNames)
							.then((objectStores) => {
								let storagesDumped = 0;
								
								return new Promise((resolve, reject) => {
									objectStoreNames.forEach((objectStoreName) => {
										return fetchAll(objectStores[objectStoreName])
											.then((records) => {
												dbObject[objectStoreName] = records;
												if (++storagesDumped === objectStoreNames.length) {
													resolve(dbObject);
												}
											});
									});
								});
							});
					});
			},
			
			importDb: function(dbObject) {
				console.log(">> Step 1: Delete old database");
				
				return db().erase().then((e) => {
					const objectStoreNames = Object.getOwnPropertyNames(dbObject);
					
					console.log(">> Step 2: Requested transactions for " + objectStoreNames);
					
					return db().transaction(objectStoreNames, true)
						.then((objectStores) => {
							// TODO check why we never get here!!
							console.log(">> Step 2.1: We now have all the requested object stores");
						
							let objectStoresCompleted = 0;
							let steps = 2;
							
							return new Promise((resolve, reject) => {
								objectStoreNames.forEach((objectStoreName) => {
									console.log(">> Step " + (++steps) + ": Add all data records into object storage '" + objectStoreName + "'");
					
									const dataRecords = dbObject[objectStoreName];
									let recordsAdded = 0;
								
									dataRecords.forEach((dataRecord) => {
										let addRequest = objectStores[objectStoreName].add(dataRecord);
									
										addRequest.onsuccess = (e) => {
											console.log("recordsAdded: " + recordsAdded);
											console.log("objectStoresCompleted: " + objectStoresCompleted);
										
											if (++recordsAdded === dataRecords.length &&
												++objectStoresCompleted === objectStoreNames.length)
											{
												resolve();
											}
										};
										addRequest.onerror = (e) => reject(e);
									});
								});
							});
						})
						.catch((error) => {
							console.error("Cannot open transaction: " + error);
							throw error;
						});
				});
			},
			
			erase: function() {
				return db().erase();
			}
		};
	}())
};

