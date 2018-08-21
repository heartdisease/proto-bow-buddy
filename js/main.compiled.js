System.register("main", [], function (exports_1, context_1) {
    "use strict";
    var DbWrapper, DbAccess, BowBuddy;
    var __moduleName = context_1 && context_1.id;
    return {
        setters: [],
        execute: function () {
            DbWrapper = class DbWrapper {
                constructor() {
                    this.dbConnected = false;
                    this.dbPromise = null;
                }
                transaction(objectStores, writeAccess = false) {
                    return this.requestDb().then(db => {
                        const transaction = db.transaction(objectStores, writeAccess ? "readwrite" : "readonly");
                        return Array.isArray(objectStores)
                            ? objectStores.reduce((map, objectStore) => {
                                map[objectStore] = transaction.objectStore(objectStore);
                                return map;
                            }, {})
                            : transaction.objectStore(objectStores);
                    });
                }
                objectStoreNames() {
                    return this.requestDb().then(db => Array.prototype.slice.call(db.objectStoreNames));
                }
                erase() {
                    return this.close().then(() => {
                        return new Promise((resolve, reject) => {
                            (function tryDeleteDb() {
                                console.info("We now try to erase the db...");
                                const deletionRequest = window.indexedDB.deleteDatabase("BowBuddyDb");
                                deletionRequest.onsuccess = e => {
                                    console.info("deletionRequest.onsuccess");
                                    resolve(e);
                                };
                                deletionRequest.onblocked = () => {
                                    console.info("deletionRequest.onblocked");
                                    window.setTimeout(tryDeleteDb, 50);
                                };
                                deletionRequest.onerror = e => {
                                    console.info("deletionRequest.onerror");
                                    reject(e);
                                };
                            })();
                        });
                    });
                }
                close() {
                    return this.requestDb().then(db => {
                        this.dbPromise = null;
                        this.dbConnected = false;
                        db.close();
                    });
                }
                requestDb() {
                    if (this.dbPromise !== null) {
                        return this.dbPromise;
                    }
                    return (this.dbPromise = new Promise((resolve, reject) => {
                        const dbRequest = window.indexedDB.open("BowBuddyDb", 1);
                        dbRequest.onupgradeneeded = event => {
                            console.log("dbRequest.onupgradeneeded");
                            const request = event.target;
                            const db = request.result;
                            const playerStore = db.createObjectStore("players", {
                                keyPath: "pid",
                                autoIncrement: true
                            });
                            playerStore.createIndex("pid", "pid", { unique: true });
                            playerStore.createIndex("name", "name", { unique: true });
                            playerStore.createIndex("email", "email", { unique: false });
                            const courseStore = db.createObjectStore("courses", {
                                keyPath: "cid",
                                autoIncrement: true
                            });
                            courseStore.createIndex("cid", "cid", { unique: true });
                            courseStore.createIndex("name", "name", { unique: false });
                            courseStore.createIndex("place", "place", { unique: false });
                            courseStore.createIndex("geolocation", "geolocation", {
                                unique: false
                            });
                            courseStore.createIndex("stations", "stations", { unique: false });
                            const gameStore = db.createObjectStore("games", {
                                keyPath: "gid",
                                autoIncrement: true
                            });
                            gameStore.createIndex("gid", "gid", { unique: true });
                            gameStore.createIndex("cid", "cid", { unique: false });
                            gameStore.createIndex("pids", "pids", {
                                unique: false,
                                multiEntry: true
                            });
                            gameStore.createIndex("starttime", "date", { unique: true });
                            gameStore.createIndex("endtime", "date", { unique: true });
                            const scoreStore = db.createObjectStore("scores", {
                                keyPath: ["gid", "pid", "station"]
                            });
                            scoreStore.createIndex("sid", ["gid", "pid", "station"], {
                                unique: true
                            });
                            scoreStore.createIndex("gid", "gid", { unique: false });
                            scoreStore.createIndex("pid", "pid", { unique: false });
                            scoreStore.createIndex("station", "station", { unique: false });
                            scoreStore.createIndex("score", "score", { unique: false });
                        };
                        dbRequest.onsuccess = event => {
                            console.log("dbRequest.onsuccess");
                            if (!this.dbConnected) {
                                const request = event.target;
                                this.dbConnected = true;
                                resolve(request.result);
                            }
                        };
                        dbRequest.onerror = event => {
                            console.log("dbRequest.onerror");
                            if (!this.dbConnected) {
                                window.alert("This app does not work without IndexedDB enabled!");
                                reject(event);
                            }
                            this.dbPromise = null;
                            this.dbConnected = false;
                        };
                    }));
                }
            };
            DbAccess = class DbAccess {
                constructor() {
                    this.dbWrapper = null;
                }
                fetchAll(objectStore, keyRange = undefined, filter = undefined) {
                    if (filter !== undefined && keyRange !== undefined) {
                        return new Promise((resolve, reject) => {
                            let filteredDataObjects = [];
                            objectStore.openCursor(keyRange).onsuccess = event => {
                                const cursor = event.target.result;
                                if (cursor) {
                                    const dataObject = cursor.value;
                                    if (filter(dataObject)) {
                                        filteredDataObjects.push(dataObject);
                                    }
                                    cursor.continue();
                                }
                                else {
                                    resolve(filteredDataObjects);
                                }
                            };
                        });
                    }
                    return new Promise((resolve, reject) => {
                        let dataObjects = [];
                        objectStore.openCursor().onsuccess = event => {
                            const cursor = event.target.result;
                            if (cursor) {
                                dataObjects.push(cursor.value);
                                cursor.continue();
                            }
                            else {
                                resolve(dataObjects);
                            }
                        };
                    });
                }
                fetchById(objectStore, indexName, keyPath) {
                    return new Promise((resolve, reject) => {
                        const index = objectStore.index(indexName);
                        const request = index.get(keyPath);
                        request.onsuccess = event => {
                            resolve(event.target.result);
                        };
                    });
                }
                updateRecord(objectStore, indexName, keyPath, update) {
                    return new Promise((resolve, reject) => {
                        const index = objectStore.index(indexName);
                        const cursorRequest = index.openCursor(keyPath);
                        cursorRequest.onsuccess = event => {
                            const cursor = event.target.result;
                            if (cursor) {
                                const dataRecord = cursor.value;
                                if (update(dataRecord)) {
                                    const updateRequest = cursor.update(dataRecord);
                                    updateRequest.onsuccess = () => resolve(dataRecord);
                                    updateRequest.onerror = e => reject(e);
                                }
                                else {
                                    resolve(dataRecord);
                                }
                            }
                            else {
                                reject(new Error("Cannot find record"));
                            }
                        };
                        cursorRequest.onerror = e => reject(e);
                    });
                }
                db() {
                    if (this.dbWrapper === null) {
                        this.dbWrapper = new DbWrapper();
                    }
                    return this.dbWrapper;
                }
                getPlayers() {
                    return this.db()
                        .transaction("players")
                        .then(playerObjectStore => this.fetchAll(playerObjectStore));
                }
                getPlayer(pid) {
                    return this.db()
                        .transaction("players")
                        .then(playerObjectStore => this.fetchById(playerObjectStore, "pid", pid));
                }
                getPlayersWithScore(gid, station) {
                    return this.db()
                        .transaction(["players", "games"])
                        .then(objectStores => {
                        return this.fetchById(objectStores.games, "gid", gid).then(game => this.fetchAll(objectStores.players, IDBKeyRange.bound(Math.min.apply(null, game.pids), Math.max.apply(null, game.pids)), player => game.pids.indexOf(player.pid) !== -1));
                    })
                        .then(players => {
                        if (players.length === 0) {
                            return [];
                        }
                        else {
                            return this.db()
                                .transaction("scores")
                                .then(scoreObjectStore => {
                                let playersWithScore = [];
                                return new Promise((resolve, reject) => {
                                    players.forEach(player => {
                                        this.fetchById(scoreObjectStore, "sid", [gid, player.pid, station]).then(score => {
                                            playersWithScore.push(score && score.score ? Object.assign(player, { score: score.score }) : player);
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
                addPlayer(name, email) {
                    return this.db()
                        .transaction("players", true)
                        .then(playerObjectStore => {
                        const request = playerObjectStore.add({ name: name, email: email });
                        return new Promise((resolve, reject) => {
                            request.onsuccess = event => resolve({ pid: event.target.result, name: name, email: email });
                            request.onerror = event => reject(event);
                        });
                    });
                }
                getCourses() {
                    return this.db()
                        .transaction("courses")
                        .then(courseObjectStore => this.fetchAll(courseObjectStore));
                }
                getCourseForGame(gid) {
                    return this.db()
                        .transaction(["courses", "games"])
                        .then(objectStores => this.fetchById(objectStores.games, "gid", gid).then(game => this.fetchById(objectStores.courses, "cid", game.cid)));
                }
                addCourse(name, place, geolocation, stations) {
                    stations = +stations;
                    return this.db()
                        .transaction("courses", true)
                        .then(courseObjectStore => {
                        const request = courseObjectStore.add({
                            name: name,
                            place: place,
                            geolocation: geolocation,
                            stations: stations
                        });
                        return new Promise((resolve, reject) => {
                            request.onsuccess = event => resolve({
                                cid: event.target.result,
                                name: name,
                                place: place,
                                geolocation: geolocation,
                                stations: stations
                            });
                            request.onerror = event => reject(event);
                        });
                    });
                }
                getGames() {
                    return this.db()
                        .transaction("games")
                        .then(gameObjectStore => this.fetchAll(gameObjectStore));
                }
                getGame(gid) {
                    return this.db()
                        .transaction("games")
                        .then(gameObjectStore => this.fetchById(gameObjectStore, "gid", gid));
                }
                addGame(cid, pids, starttime = undefined, endtime = undefined) {
                    return this.db()
                        .transaction("games", true)
                        .then(gameObjectStore => {
                        const request = gameObjectStore.add({
                            cid: cid,
                            pids: pids,
                            starttime: starttime || new Date().toISOString(),
                            endtime: endtime || null
                        });
                        return new Promise((resolve, reject) => {
                            request.onsuccess = event => resolve({
                                gid: event.target.result,
                                cid: cid,
                                pids: pids,
                                starttime: starttime,
                                endtime: endtime
                            });
                            request.onerror = event => reject(event);
                        });
                    });
                }
                finishGame(gid) {
                    return this.db()
                        .transaction("games", true)
                        .then(gameObjectStore => {
                        return this.updateRecord(gameObjectStore, "gid", gid, game => {
                            if (!game.endtime) {
                                game.endtime = new Date().toISOString();
                                return true;
                            }
                            return false;
                        });
                    });
                }
                setScore(gid, pid, station, score) {
                    return this.db()
                        .transaction("scores", true)
                        .then(scoreObjectStore => {
                        const request = scoreObjectStore.put({
                            gid: gid,
                            pid: pid,
                            station: station,
                            score: score
                        });
                        return new Promise((resolve, reject) => {
                            request.onsuccess = event => resolve({
                                gid: gid,
                                pid: pid,
                                station: station,
                                score: score
                            });
                            request.onerror = event => reject(event);
                        });
                    });
                }
                dump() {
                    const dbRef = this.db();
                    let dbObject = {};
                    return dbRef.objectStoreNames().then(objectStoreNames => {
                        return dbRef.transaction(objectStoreNames).then(objectStores => {
                            let storagesDumped = 0;
                            return new Promise((resolve, reject) => {
                                objectStoreNames.forEach(objectStoreName => {
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
                importDb(dbObject) {
                    console.log(">> Step 1: Delete old database");
                    return this.db()
                        .erase()
                        .then(e => {
                        const objectStoreNames = Object.getOwnPropertyNames(dbObject);
                        console.log(">> Step 2: Requested transactions for " + objectStoreNames);
                        return this.db()
                            .transaction(objectStoreNames, true)
                            .then(objectStores => {
                            console.log(">> Step 2.1: We now have all the requested object stores");
                            let objectStoresCompleted = 0;
                            let steps = 2;
                            return new Promise((resolve, reject) => {
                                objectStoreNames.forEach(objectStoreName => {
                                    console.log(">> Step " + ++steps + ": Add all data records into object storage '" + objectStoreName + "'");
                                    const dataRecords = dbObject[objectStoreName];
                                    let recordsAdded = 0;
                                    dataRecords.forEach(dataRecord => {
                                        let addRequest = objectStores[objectStoreName].add(dataRecord);
                                        addRequest.onsuccess = e => {
                                            console.log("recordsAdded: " + recordsAdded);
                                            console.log("objectStoresCompleted: " + objectStoresCompleted);
                                            if (++recordsAdded === dataRecords.length && ++objectStoresCompleted === objectStoreNames.length) {
                                                resolve();
                                            }
                                        };
                                        addRequest.onerror = e => reject(e);
                                    });
                                });
                            });
                        })
                            .catch(error => {
                            console.error("Cannot open transaction: " + error);
                            throw error;
                        });
                    });
                }
                erase() {
                    return this.db().erase();
                }
            };
            BowBuddy = class BowBuddy {
                static getStorage() {
                    if (BowBuddy.storage === null) {
                        BowBuddy.storage = new DbAccess();
                    }
                    return BowBuddy.storage;
                }
                static getVersion() {
                    return "1.7";
                }
                static updateWindowTitle(version) {
                    document.title = document.title.replace(/\{\$version\}/g, version);
                }
                static getUrlParams() {
                    if (!window.location.hash) {
                        console.log("getUrlParams(): {}");
                        return Object.freeze(new Map());
                    }
                    const numRegExp = /^(0|-?[1-9][0-9]*)$/;
                    const urlParams = Object.freeze(window.location.hash
                        .substring(1)
                        .split(";")
                        .map(keyValueStr => keyValueStr.split("="))
                        .reduce((urlParams, keyValuePair) => {
                        const key = keyValuePair[0];
                        const value = keyValuePair[1];
                        urlParams.set(key, numRegExp.test(value) ? +value : value);
                        return urlParams;
                    }, new Map()));
                    console.log("getUrlParams(): " + JSON.stringify(urlParams));
                    return urlParams;
                }
                static switchToFullscreenFunc() {
                    let clickCounter = 0;
                    return clickEvent => {
                        clickEvent.preventDefault();
                        if (++clickCounter % 3 === 0 && !document.fullscreenElement) {
                            console.log("Init fullscreen...");
                            if (document.documentElement.requestFullscreen) {
                                document.documentElement.requestFullscreen();
                            }
                            else if (document.documentElement.webkitRequestFullscreen) {
                                document.documentElement.webkitRequestFullscreen();
                            }
                        }
                    };
                }
                static scoreToPoints(score) {
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
                        case "body-hit":
                            return 16 - penalty * 6;
                        case "kill-hit":
                            return 18 - penalty * 6;
                        case "center-kill-hit":
                            return 20 - penalty * 6;
                        default:
                            throw new Error("Invalid score format '" + score + "'");
                    }
                }
                static scoreToDisplayName(score) {
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
                }
                static getDuration(starttime, endtime) {
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
                    duration += diffInMinutes - diffInHours * 60 + "m";
                    return duration;
                }
            };
            BowBuddy.storage = null;
            exports_1("BowBuddy", BowBuddy);
        }
    };
});
System.register("final-score", ["jquery", "main"], function (exports_2, context_2) {
    "use strict";
    var $, main_1, FinalScoreView;
    var __moduleName = context_2 && context_2.id;
    return {
        setters: [
            function ($_1) {
                $ = $_1;
            },
            function (main_1_1) {
                main_1 = main_1_1;
            }
        ],
        execute: function () {
            FinalScoreView = class FinalScoreView {
                init() {
                    main_1.BowBuddy.updateWindowTitle(main_1.BowBuddy.getVersion());
                    const urlParams = main_1.BowBuddy.getUrlParams();
                    main_1.BowBuddy.getStorage().finishGame(urlParams.get("gid")).then(game => {
                        $("#course-duration").text(main_1.BowBuddy.getDuration(game.starttime, game.endtime));
                    });
                    main_1.BowBuddy.getStorage().getCourseForGame(urlParams.get("gid")).then(course => {
                        const stations = course.stations;
                        let playerNames;
                        let scores = new Array(stations);
                        let scoreCount = 0;
                        $("#course-label").text((course.place ? course.place + " " : "") + course.name);
                        $("#back-btn").on("click", e => {
                            window.location.href = "station-select-player.html#gid=" + urlParams.get("gid") + ";station=" + stations;
                        });
                        for (let i = 1; i <= stations; i++) {
                            const station = i;
                            main_1.BowBuddy.getStorage().getPlayersWithScore(urlParams.get("gid"), station).then(players => {
                                if (station === 1) {
                                    playerNames = players.map(p => p.name);
                                }
                                scores[station - 1] = players.map(p => p.score);
                                if (++scoreCount === stations) {
                                    this.generateScoreTable(playerNames, scores);
                                }
                            });
                        }
                    });
                }
                generateScoreTable(playerNames, scores) {
                    const $playerHeaderRow = $("#player-header-row");
                    const $playerScoreEntries = $("#player-score-entries");
                    playerNames.forEach(playerName => $playerHeaderRow.append($("<th/>").text(playerName)));
                    scores.forEach((scoresForStation, index) => {
                        let $tr = $("<tr/>");
                        $tr.append($("<td/>")
                            .css("font-style", "italic")
                            .text(index + 1 + "."));
                        scoresForStation.forEach(score => $tr.append($("<td/>").text(main_1.BowBuddy.scoreToPoints(score))));
                        $playerScoreEntries.append($tr);
                    });
                    let $sumRow = $("<tr/>")
                        .addClass("info")
                        .css("font-weight", "bold");
                    $sumRow.append($("<td/>").html("&nbsp;"));
                    scores[0].forEach((score, column) => {
                        $sumRow.append($("<td/>").text(scores.reduce((sum, row) => sum + main_1.BowBuddy.scoreToPoints(row[column]), 0)));
                    });
                    $playerScoreEntries.append($sumRow);
                }
            };
            exports_2("FinalScoreView", FinalScoreView);
        }
    };
});
System.register("main-menu", ["jquery", "main"], function (exports_3, context_3) {
    "use strict";
    var $, main_2, MainMenuView;
    var __moduleName = context_3 && context_3.id;
    return {
        setters: [
            function ($_2) {
                $ = $_2;
            },
            function (main_2_1) {
                main_2 = main_2_1;
            }
        ],
        execute: function () {
            MainMenuView = class MainMenuView {
                init() {
                    main_2.BowBuddy.updateWindowTitle(main_2.BowBuddy.getVersion());
                    $(".app-logo > h1").text(document.title);
                    $(document).ready(() => $(".modal").modal());
                    let logoCounter = 0;
                    let quitCounter = 0;
                    $(".app-logo")
                        .on("click", main_2.BowBuddy.switchToFullscreenFunc())
                        .on("click", e => {
                        if (++logoCounter % 2 === 0) {
                            main_2.BowBuddy.getStorage()
                                .dump()
                                .then(dbObject => {
                                const dbDump = JSON.stringify(dbObject);
                                const $textarea = $("#db-dump-modal textarea").val(dbDump);
                                $("#copy-json-btn").on("click", e => {
                                    $textarea.select();
                                    try {
                                        if (!document.execCommand("copy")) {
                                            throw new Error("execCommand copy could not be executed");
                                        }
                                    }
                                    catch (e) {
                                        console.error(e.message);
                                    }
                                });
                                $("#update-db-btn").on("click", e => {
                                    if (window.confirm("Do you want to rewrite the entire database with input JSON?")) {
                                        main_2.BowBuddy.getStorage()
                                            .importDb(JSON.parse($textarea.val()))
                                            .then(() => window.alert("Database successfully imported!"))
                                            .catch(error => console.error(error));
                                    }
                                });
                                console.log("BowBuddyDb dump:");
                                console.log(dbObject);
                                $("#db-dump-modal").modal("open");
                                window.setTimeout(() => $textarea.select(), 500);
                            });
                        }
                    });
                    $("#quit-btn").on("click", e => {
                        if (++quitCounter % 4 === 0 && window.confirm("Are you sure you want to erase the entire database?")) {
                            main_2.BowBuddy.getStorage()
                                .erase()
                                .then(e => {
                                $("#delete-db-modal .modal-msg").text("Database was successfully deleted!");
                            })
                                .catch(e => {
                                $("#delete-db-modal .modal-msg").text("Failed to delete database!");
                            })
                                .then(() => {
                                $("#delete-db-modal").modal("open");
                            });
                        }
                    });
                }
            };
            exports_3("MainMenuView", MainMenuView);
        }
    };
});
System.register("new-game", ["jquery", "main"], function (exports_4, context_4) {
    "use strict";
    var $, main_3, NewGameView;
    var __moduleName = context_4 && context_4.id;
    return {
        setters: [
            function ($_3) {
                $ = $_3;
            },
            function (main_3_1) {
                main_3 = main_3_1;
            }
        ],
        execute: function () {
            NewGameView = class NewGameView {
                constructor() {
                    this.playerConfigured = false;
                    this.courseConfigured = false;
                    this.existingPlayers = [];
                    this.existingCourses = [];
                    this.configuredPlayers = [];
                }
                init() {
                    main_3.BowBuddy.updateWindowTitle(main_3.BowBuddy.getVersion());
                    let lockPlayerDropdown = false;
                    let lockCourseDropdown = false;
                    const urlParams = main_3.BowBuddy.getUrlParams();
                    this.updatePlayerSelectionMenu();
                    this.updateCourseSelectionMenu();
                    $("#new-player-name")
                        .on("focus", e => (lockPlayerDropdown = true))
                        .on("blur", e => (lockPlayerDropdown = false))
                        .on("keyup", e => this.verifyPlayerInput());
                    $("#new-course-name")
                        .on("focus", e => (lockCourseDropdown = true))
                        .on("blur", e => (lockCourseDropdown = false))
                        .on("keyup", e => this.verifyCourseInput());
                    $("#new-course-no-of-stations")
                        .on("focus", e => (lockCourseDropdown = true))
                        .on("blur", e => (lockCourseDropdown = false))
                        .on("keyup", e => this.verifyCourseInput());
                    $("#add-player-btn").on("click", e => {
                        const playerName = $("#new-player-name").val();
                        $(".player-dropdown").addClass("disabled");
                        main_3.BowBuddy.getStorage()
                            .addPlayer(playerName, "")
                            .then(player => this.addPlayerToTable(player));
                    });
                    $("#set-course-btn").on("click", e => {
                        const courseName = $("#new-course-name").val();
                        const noOfStations = $("#new-course-no-of-stations").val();
                        $(".course-dropdown").addClass("disabled");
                        main_3.BowBuddy.getStorage()
                            .addCourse(courseName, "", "", noOfStations)
                            .then(course => this.addCourseToTable(course));
                    });
                    $(".player-dropdown").on("hide.bs.dropdown", e => {
                        console.info("hide player dropdown");
                        if (lockPlayerDropdown) {
                            e.preventDefault();
                        }
                        else {
                            $("#new-player-name").val("");
                            $("#add-player-btn").attr("disabled", "disabled");
                        }
                    });
                    $(".course-dropdown").on("hide.bs.dropdown", e => {
                        console.info("hide course dropdown");
                        if (lockCourseDropdown) {
                            e.preventDefault();
                        }
                        else {
                            $("#new-course-name").val("");
                            $("#new-course-no-of-stations").val("");
                            $("#set-course-btn").attr("disabled", "disabled");
                        }
                    });
                    $("#start-game-btn").on("click", e => {
                        let cid;
                        let pids = [];
                        $("#start-game-btn").attr("disabled", "disabled");
                        cid = +$("#course-entries > tr[data-cid]").attr("data-cid");
                        $("#player-entries > tr[data-pid]").each(function () {
                            pids.push(+$(this).attr("data-pid"));
                        });
                        main_3.BowBuddy.getStorage()
                            .addGame(cid, pids)
                            .then(game => {
                            window.location.href = "station-select-player.html#gid=" + game.gid + ";station=1";
                        });
                    });
                }
                addPlayerToTable(player) {
                    $("#dummy-player-entry").remove();
                    $("#player-entries").append($("<tr/>")
                        .attr("data-pid", player.pid)
                        .append($("<td/>").text(player.name), $("<td/>").text(player.email || "-"), $("<td/>").text("-")));
                    this.configuredPlayers.push(player);
                    this.updatePlayerSelectionMenu(this.configuredPlayers);
                    this.playerConfigured = true;
                    if (this.playerConfigured && this.courseConfigured) {
                        $("#start-game-btn").removeAttr("disabled");
                    }
                }
                addCourseToTable(course) {
                    $("#course-entries")
                        .empty()
                        .append($("<tr/>")
                        .attr("data-cid", course.cid)
                        .append($("<td/>").text(course.name), $("<td/>").text(course.place || "-"), $("<td/>").text(course.stations)));
                    this.updateCourseSelectionMenu(course);
                    this.courseConfigured = true;
                    if (this.playerConfigured && this.courseConfigured) {
                        $("#start-game-btn").removeAttr("disabled");
                    }
                }
                updatePlayerSelectionMenu(excludedPlayers = undefined) {
                    main_3.BowBuddy.getStorage()
                        .getPlayers()
                        .then(players => {
                        const $playerMenu = $(".player-dropdown > .dropdown-menu");
                        this.existingPlayers = players;
                        $playerMenu.find("li[data-pid]").remove();
                        players.reverse().forEach(player => {
                            if (excludedPlayers !== undefined &&
                                excludedPlayers.some(excludedPlayer => excludedPlayer.pid === player.pid)) {
                                return;
                            }
                            const $playerEntry = $("<li/>")
                                .attr("data-pid", player.pid)
                                .append($("<a/>")
                                .on("click", e => {
                                $playerEntry.remove();
                                this.addPlayerToTable(player);
                            })
                                .text(player.name));
                            $playerMenu.prepend($playerEntry);
                        });
                    });
                }
                updateCourseSelectionMenu(excludedCourse = undefined) {
                    main_3.BowBuddy.getStorage()
                        .getCourses()
                        .then(courses => {
                        const $courseMenu = $(".course-dropdown > .dropdown-menu");
                        this.existingCourses = courses;
                        $courseMenu.find("li[data-cid]").remove();
                        courses.reverse().forEach(course => {
                            if (excludedCourse !== undefined && excludedCourse.cid === course.cid) {
                                return;
                            }
                            const $courseEntry = $("<li/>")
                                .attr("data-cid", course.cid)
                                .append($("<a/>")
                                .on("click", e => {
                                $courseEntry.remove();
                                this.addCourseToTable(course);
                            })
                                .text(course.name + " (" + course.stations + ")"));
                            $courseMenu.prepend($courseEntry);
                        });
                    });
                }
                verifyPlayerInput() {
                    const playerName = $("#new-player-name").val();
                    if (!playerName ||
                        /^\s+/.test(playerName) ||
                        /\s+$/.test(playerName) ||
                        this.existingPlayers.some(player => player.name === playerName)) {
                        $("#add-player-btn").attr("disabled", "disabled");
                    }
                    else {
                        $("#add-player-btn").removeAttr("disabled");
                    }
                }
                verifyCourseInput() {
                    const courseName = $("#new-course-name").val();
                    const noOfStations = $("#new-course-no-of-stations").val();
                    if (!courseName ||
                        /^\s+/.test(courseName) ||
                        /\s+$/.test(courseName) ||
                        !noOfStations ||
                        !/^[1-9][0-9]*$/.test(noOfStations) ||
                        this.existingCourses.some(course => course.name === courseName)) {
                        $("#set-course-btn").attr("disabled", "disabled");
                    }
                    else {
                        $("#set-course-btn").removeAttr("disabled");
                    }
                }
            };
            exports_4("NewGameView", NewGameView);
        }
    };
});
System.register("station-select-player", ["jquery", "main"], function (exports_5, context_5) {
    "use strict";
    var $, main_4, StationSelectPlayerView;
    var __moduleName = context_5 && context_5.id;
    return {
        setters: [
            function ($_4) {
                $ = $_4;
            },
            function (main_4_1) {
                main_4 = main_4_1;
            }
        ],
        execute: function () {
            StationSelectPlayerView = class StationSelectPlayerView {
                reset() {
                    $("nav.navbar").off("click");
                    $("#back-btn").off("click");
                    $("#next-station-btn")
                        .off("click")
                        .attr("disabled", "disabled")
                        .html('<span class="glyphicon glyphicon-chevron-right" aria-hidden="true"></span> Next station');
                    $("#quick-assign-btn")
                        .off("click")
                        .attr("disabled", "disabled");
                    $("#player-selection-list").empty();
                }
                init() {
                    const urlParams = main_4.BowBuddy.getUrlParams();
                    main_4.BowBuddy.updateWindowTitle(main_4.BowBuddy.getVersion());
                    window.addEventListener("popstate", popstateEvent => this.loadView());
                    $("#back-btn").on("click", e => {
                        e.preventDefault();
                        if (+urlParams.get("station") > 1) {
                            this.pushState("#gid=" + urlParams.get("gid") + ";station=" + (+urlParams.get("station") - 1));
                        }
                        else {
                            const result = window.confirm("Do you really want to go back to the game menu? All progess will be lost!");
                            if (result) {
                                window.location.href = "new-game.html";
                            }
                        }
                    });
                    $("#station-no").text(urlParams.get("station"));
                    main_4.BowBuddy.getStorage()
                        .getCourseForGame(urlParams.get("gid"))
                        .then(course => {
                        if (urlParams.get("station") >= course.stations) {
                            $("#next-station-btn")
                                .html('<span class="glyphicon glyphicon-ok" aria-hidden="true"></span> Finish course')
                                .on("click", e => {
                                e.preventDefault();
                                window.location.href = "final-score.html#gid=" + urlParams.get("gid");
                            });
                        }
                        else {
                            $("#next-station-btn").on("click", e => {
                                e.preventDefault();
                                this.pushState("#gid=" + urlParams.get("gid") + ";station=" + (+urlParams.get("station") + 1));
                            });
                        }
                        main_4.BowBuddy.getStorage()
                            .getPlayersWithScore(urlParams.get("gid"), urlParams.get("station"))
                            .then(players => {
                            const $playerSelectionList = $("#player-selection-list");
                            let playersWithScore = 0;
                            if (players.length === 0) {
                                throw new Error("Cannot load players!");
                            }
                            $("#quick-assign-btn").on("click", e => {
                                const qaParam = players.length > 1
                                    ? ";qa=" +
                                        players
                                            .slice(1)
                                            .map(p => p.pid)
                                            .join("+")
                                    : "";
                                e.preventDefault();
                                window.location.href =
                                    "station-set-score.html#gid=" +
                                        urlParams.get("gid") +
                                        ";pid=" +
                                        players[0].pid +
                                        qaParam +
                                        ";station=" +
                                        urlParams.get("station");
                            });
                            players.forEach(player => {
                                const $playerEntry = $("<a/>")
                                    .addClass("btn btn-default")
                                    .attr("href", "station-set-score.html#gid=" +
                                    urlParams.get("gid") +
                                    ";pid=" +
                                    player.pid +
                                    ";station=" +
                                    urlParams.get("station"))
                                    .attr("role", "button")
                                    .text(player.name + " ");
                                if (player.score) {
                                    const $scoreBadge = $("<span/>").addClass("badge");
                                    playersWithScore++;
                                    if (player.score === "miss") {
                                        $scoreBadge.html("Miss&nbsp;&nbsp;&nbsp;(+0)");
                                    }
                                    else {
                                        $scoreBadge.html(main_4.BowBuddy.scoreToDisplayName(player.score) +
                                            "&nbsp;&nbsp;&nbsp;(+" +
                                            main_4.BowBuddy.scoreToPoints(player.score) +
                                            ")");
                                    }
                                    $playerEntry.append($scoreBadge);
                                }
                                $playerSelectionList.append($playerEntry);
                            });
                            if (playersWithScore === players.length) {
                                $("#next-station-btn").removeAttr("disabled");
                            }
                            else if (playersWithScore === 0) {
                                $("#quick-assign-btn").removeAttr("disabled");
                            }
                        });
                    });
                }
                loadView() {
                    this.reset();
                    this.init();
                }
                pushState(url) {
                    console.log("pushState: " + url);
                    window.history.pushState(null, null, url);
                    this.loadView();
                }
            };
            exports_5("StationSelectPlayerView", StationSelectPlayerView);
        }
    };
});
System.register("station-set-score", ["jquery", "main"], function (exports_6, context_6) {
    "use strict";
    var $, main_5, StationSetScoreView;
    var __moduleName = context_6 && context_6.id;
    return {
        setters: [
            function ($_5) {
                $ = $_5;
            },
            function (main_5_1) {
                main_5 = main_5_1;
            }
        ],
        execute: function () {
            StationSetScoreView = class StationSetScoreView {
                navigateBack(gid, station) {
                    window.location.href = "station-select-player.html#gid=" + gid + ";station=" + station;
                }
                navigateToNextPlayer(gid, station, nextPid, remainingPids) {
                    const qaParam = remainingPids.length > 0 ? ";qa=" + remainingPids.join("+") : "";
                    this.pushState("#gid=" + gid + ";pid=" + nextPid + "" + qaParam + ";station=" + station);
                    this.loadView();
                }
                navigateNext(urlParams) {
                    console.log("URL params in navigatenext: " + JSON.stringify(urlParams));
                    if (urlParams.get("qa")) {
                        const qaPlayers = ("" + urlParams.get("qa")).split("+");
                        if (qaPlayers.length > 0) {
                            this.navigateToNextPlayer(urlParams.get("gid"), urlParams.get("station"), qaPlayers[0], qaPlayers.slice(1));
                        }
                        else {
                            throw new Error("Invalid qa parameter '" + urlParams.get("qa") + "'");
                        }
                    }
                    else {
                        this.navigateBack(urlParams.get("gid"), urlParams.get("station"));
                    }
                }
                getHitButton(hit) {
                    switch (hit) {
                        case "body-hit":
                            return '<a class="btn btn-info btn-lg hit" href="#" role="button">Body</a>';
                        case "kill-hit":
                            return '<a class="btn btn-warning btn-lg hit" href="#" role="button">Kill</a>';
                        case "center-kill-hit":
                            return '<a class="btn btn-danger btn-lg hit" href="#" role="button">Center Kill</a>';
                    }
                }
                getTurnButton(turn) {
                    switch (turn) {
                        case "first-turn":
                            return '<a class="btn btn-success btn-lg turn" href="#" role="button">1<sup>st</sup></a>';
                        case "second-turn":
                            return '<a class="btn btn-primary btn-lg turn" href="#" role="button">2<sup>nd</sup></a>';
                        case "third-turn":
                            return '<a class="btn btn-default btn-lg turn" href="#" role="button">3<sup>rd</sup></a>';
                    }
                }
                logScore(urlParams, navigationDelay, hit = undefined, turn = undefined) {
                    const before = Date.now();
                    const miss = hit === undefined || turn === undefined;
                    const score = miss ? "miss" : turn + ":" + hit;
                    $("#scoreDisplay").html(miss
                        ? '<a class="btn btn-default btn-lg miss-btn" href="#" role="button">Miss</a>'
                        : this.getTurnButton(turn) + this.getHitButton(hit));
                    $("#scoreModal").modal({ keyboard: false });
                    main_5.BowBuddy.getStorage()
                        .setScore(urlParams.get("gid"), urlParams.get("pid"), urlParams.get("station"), score)
                        .then(score => {
                        console.log("URL params in setScore: " + JSON.stringify(urlParams));
                        const timeDiff = Date.now() - before;
                        if (timeDiff >= navigationDelay) {
                            this.navigateNext(urlParams);
                        }
                        else {
                            window.setTimeout(() => this.navigateNext(urlParams), navigationDelay - timeDiff);
                        }
                    });
                }
                reset() {
                    $("#scoreModal").modal("hide");
                    $("#hit-draggable-container").empty();
                    $("#turn-draggable-container").empty();
                    $("nav.navbar").off("click");
                    $("#back-btn").off("click");
                    $(".hit").off("droppable:drop");
                    $(".turn").off("droppable:drop");
                    $(".miss-btn").off("click");
                    $("#scoreDisplay").empty();
                }
                init() {
                    const urlParams = main_5.BowBuddy.getUrlParams();
                    const navigationDelay = 650;
                    main_5.BowBuddy.updateWindowTitle(main_5.BowBuddy.getVersion());
                    window.addEventListener("popstate", popstateEvent => this.loadView());
                    $("#hit-draggable-container").html('<a class="btn btn-info btn-lg hit" href="#" role="button" draggable="true" data-dnd="body-hit">Body</a>\
<a class="btn btn-warning btn-lg hit" href="#" role="button" draggable="true" data-dnd="kill-hit">Kill</a>\
<a class="btn btn-danger btn-lg hit" href="#" role="button" draggable="true" data-dnd="center-kill-hit">Center Kill</a>');
                    $("#turn-draggable-container").html('<a class="btn btn-success btn-lg turn" href="#" role="button" draggable="true" data-dnd="first-turn">1<sup>st</sup></a>\
<a class="btn btn-primary btn-lg turn" href="#" role="button" draggable="true" data-dnd="second-turn">2<sup>nd</sup></a>\
<a class="btn btn-default btn-lg turn" href="#" role="button" draggable="true" data-dnd="third-turn">3<sup>rd</sup></a>');
                    $("#back-btn").on("click", e => {
                        e.preventDefault();
                        this.navigateBack(urlParams.get("gid"), urlParams.get("station"));
                    });
                    $("#station-no").text(urlParams.get("station"));
                    main_5.BowBuddy.getStorage()
                        .getPlayer(urlParams.get("pid"))
                        .then(player => $("span.player-name").text(player.name));
                    $(".hit")
                        .draggable({ connectWith: ".turn" })
                        .droppable({ accept: ".turn", activeClass: "active", hoverClass: "dropZone" })
                        .on("droppable:drop", (e, ui) => {
                        console.log("URL params in hit: " + JSON.stringify(urlParams));
                        this.logScore(urlParams, navigationDelay, e.target.getAttribute("data-dnd"), ui.item[0].getAttribute("data-dnd"));
                    });
                    $(".turn")
                        .draggable({ connectWith: ".turn" })
                        .droppable({ accept: ".hit", activeClass: "active", hoverClass: "dropZone" })
                        .on("droppable:drop", (e, ui) => {
                        console.log("URL params in turn: " + JSON.stringify(urlParams));
                        this.logScore(urlParams, navigationDelay, ui.item[0].getAttribute("data-dnd"), e.target.getAttribute("data-dnd"));
                    });
                    $(".miss-btn").on("click", e => {
                        e.preventDefault();
                        this.logScore(urlParams, navigationDelay);
                    });
                }
                loadView() {
                    this.reset();
                    this.init();
                }
                pushState(url) {
                    console.log("pushState: " + url);
                    window.history.pushState(null, null, url);
                    this.loadView();
                }
            };
            exports_6("StationSetScoreView", StationSetScoreView);
        }
    };
});
//# sourceMappingURL=main.compiled.js.map