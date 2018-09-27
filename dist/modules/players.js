"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const cheerio = require("cheerio");
const base_1 = require("../utils/base");
class DotaPlayers extends base_1.Base {
    constructor(config) {
        super(config);
    }
    getPlayerInfo(playerName) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                const requestInfo = {
                    headers: {
                        'Accept-Encoding': 'gzip',
                        'User-Agent': this.userAgentValue,
                    },
                    method: 'GET',
                };
                const playerNameEncoded = playerName.replace(/ /g, '_');
                const playerUrl = (playerNameEncoded.indexOf('.') !== -1)
                    ? `${this.cacheFetch.urlStub}?action=parse&origin=*&format=json&page=${playerNameEncoded}&*`
                    : `${this.cacheFetch.urlStub}?action=parse&origin=*&format=json&page=${playerNameEncoded}`;
                this.cacheFetch.cacheFetch(playerUrl, requestInfo)
                    .then((json) => __awaiter(this, void 0, void 0, function* () {
                    try {
                        const playerJson = yield this.cacheFetch.checkRedirect(json, requestInfo);
                        resolve(this._parsePlayer(playerJson.parse.text['*'], playerJson.parse.displaytitle));
                    }
                    catch (e) {
                        reject(e);
                    }
                }))
                    .catch((err) => {
                    reject(`Error fetching team list: ${err}`);
                });
            });
        });
    }
    _parsePlayer(teamHtml, displayTitle) {
        const $ = cheerio.load(teamHtml);
        const handle = displayTitle;
        const playerLogo = `https://liquipedia.net${$('.infobox-image').eq(0).find('img').attr('src')}`;
        const potentialTeamBoxes = $('.fo-nttax-infobox-wrapper.infobox-dota2');
        let $playerBox;
        for (let i = 0, len = potentialTeamBoxes.length; i < len; i++) {
            const teamBoxString = potentialTeamBoxes.eq(i).html();
            if (teamBoxString.indexOf('Player Information') !== -1) {
                $playerBox = cheerio.load(teamBoxString);
                break;
            }
        }
        const playerInfoBlock = $playerBox('.infobox-cell-2.infobox-description');
        const playerInfoObj = {};
        for (let i = 0, len = playerInfoBlock.length; i < len; i++) {
            const block = playerInfoBlock.eq(i);
            const blockLabel = block.text();
            switch (blockLabel) {
                case 'Name:':
                    playerInfoObj.name = block.siblings().eq(0).text();
                    break;
                case 'Country:':
                    playerInfoObj.region = this._parseRegions(block.siblings().eq(0).html());
                    break;
                case 'Birth:':
                    playerInfoObj.birthday = this._parseBirthday(block.siblings().eq(0).text());
                    break;
                case 'Team:':
                    playerInfoObj.team = block.siblings().eq(0).text();
                    break;
                case 'Role(s):':
                    playerInfoObj.position = this._parseRoles(block.siblings().eq(0).html());
                    break;
                case 'Approx. Total Earnings:':
                    playerInfoObj.earnings = block.siblings().eq(0).text();
                    break;
            }
        }
        return Object.assign({ handle, photo: playerLogo }, playerInfoObj);
    }
    _parseBirthday(birthdayText) {
        const match = birthdayText.match(/\d{4}(-\d{2}){2}/);
        if (match) {
            return match[0];
        }
        return '';
    }
    _parseRegions(regionHtml) {
        const regions = [];
        const matches = regionHtml.match(/<\/a> <a href="\/dota2\/Category:(\w+)/gm);
        for (const match of matches) {
            if (match) {
                const countryMatch = match.match(/<\/a> <a href="\/dota2\/Category:(\w+)/)[1];
                if (countryMatch) {
                    regions.push(countryMatch);
                }
            }
        }
        return regions;
    }
    _parseRoles(rolesHtml) {
        const roles = [];
        const matches = rolesHtml.match(/>(\w+|\w+ \w+)</gm);
        for (const match of matches) {
            if (match) {
                const roleMatch = match.match(/>(\w+|\w+ \w+)</)[1];
                if (roleMatch && roleMatch !== 'Captain') {
                    roles.push(roleMatch);
                }
            }
        }
        return roles;
    }
    _trimDate(dateStr) {
        return dateStr.substr(0, 10);
    }
    _trimName(name) {
        return /\((.+)\)/.exec(name)[1];
    }
}
exports.DotaPlayers = DotaPlayers;
