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
export interface Player {
  readonly pid: number;
  name: string;
  email: string;
}

export interface PlayerWithScore extends Player {
  readonly score?: string;
}

export interface Course {
  readonly cid: number;
  name: string;
  place: string;
  geolocation: string;
  stations: number;
}

export interface Game {
  readonly gid: number;
  readonly cid: number;
  readonly pids: number[];
  starttime: string; // new Date().toISOString() = ISO 8601 (UTC)
  endtime: string; // new Date().toISOString() = ISO 8601 (UTC)
}

export interface Score {
  readonly sid: number;
  readonly gid: number;
  readonly pid: number;
  station: number;
  score: string; // format: 'first-turn:body-hit' OR 'miss'
}

export interface TotalScoreForGame {
  readonly players: Player[];
  readonly scores: Map<number, string[]>;
}
