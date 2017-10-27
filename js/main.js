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
					gameStore.createIndex("starttime", "date", { unique: false }); // UTC standard format
					gameStore.createIndex("endtime", "date", { unique: false }); // UTC standard format
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
			
				players: function(readonly) {
					return dbPromise.then((db) => {
						return new Promise((resolve, reject) => {
							resolve(db.transaction("players", readonly ? "readonly" : "readwrite").objectStore("players"));
						});
					});
				},
				
				playersForGame: function(readonly) {
					return dbPromise.then((db) => {
						return new Promise((resolve, reject) => {
							const transaction = db.transaction(["players", "games"], readonly ? "readonly" : "readwrite");
							
							resolve({ players: transaction.objectStore("players"), games: transaction.objectStore("games") });
						});
					});
				},
				
				courses: function(readonly) {
					return dbPromise.then((db) => {
						return new Promise((resolve, reject) => {
							resolve(db.transaction("courses", readonly ? "readonly" : "readwrite").objectStore("courses"));
						});
					});
				},
				
				games: function(readonly) {
					return dbPromise.then((db) => {
						return new Promise((resolve, reject) => {
							resolve(db.transaction("games", readonly ? "readonly" : "readwrite").objectStore("games"));
						});
					});
				}
			};
		}
		
		function fetchAll(objectStore, keyRange, filter) {
			if (keyRange && filter) {
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
		
		function fetchById(objectStore, indexName, id) {
			return new Promise((resolve, reject) => {
				console.log("Fetch index " + indexName + " with id " + id);
				const index = objectStore.index(indexName);
				
				index.get(id).onsuccess = (event) => resolve(event.target.result);
			});
		}
		
		return {
			
			getPlayers: function() {
				return db().players(true).then((playerObjectStore) => fetchAll(playerObjectStore));
			},
			
			getPlayersForGame: function(gid) {
				return db().playersForGame(true)
					.then((objectStores) => {
						console.log(objectStores.games);
						return fetchById(objectStores.games, "gid", gid)
							.then((game) => {
								return fetchAll(
									objectStores.players,
									IDBKeyRange.bound(Math.min.apply(null, game.pids), Math.max.apply(null, game.pids)),
									(player) => game.pids.indexOf(player.pid) !== -1);
							});
					});
			},
			
			addPlayer: function(name, email) {
				return db().players().then((playerObjectStore) => {
					console.log("playerObjectStore.add");
					const request = playerObjectStore.add({ name: name, email: email });
					
					return new Promise((resolve, reject) => {
						request.onsuccess = (event) => resolve({ pid: event.target.result, name: name, email: email });
						request.onerror = (event) => reject(event);
					});
				});
			},
			
			getCourses: function() {
				return db().courses(true).then((courseObjectStore) => fetchAll(courseObjectStore));
			},
			
			addCourse: function(name, place, geolocation, stations) {
				return db().courses().then((courseObjectStore) => {
					const request = courseObjectStore.add({ name: name, place: place, geolocation: geolocation, stations: stations });
					
					return new Promise((resolve, reject) => {
						request.onsuccess = (event) => resolve({ cid: event.target.result, name: name, place: place, geolocation: geolocation, stations: stations });
						request.onerror = (event) => reject(event);
					});
				});
			},
			
			getGames: function() {
				return db().games(true).then((gameObjectStore) => fetchAll(gameObjectStore));
			},
			
			addGame: function(cid, pids, starttime, endtime) {
				return db().games().then((gameObjectStore) => {
					const request = gameObjectStore.add({ cid: cid, pids: pids, starttime: starttime, endtime: endtime });
					
					return new Promise((resolve, reject) => {
						request.onsuccess = (event) => resolve({ gid: event.target.result, cid: cid, pids: pids, starttime: starttime, endtime: endtime });
						request.onerror = (event) => reject(event);
					});
				});
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

