const utils = require("../utils");
const fetch = require("node-fetch");
const { parse } = require("node-html-parser");
const { join } = require("path");
const { readFileSync, writeFileSync } = require("fs");

/**
 * How to use:
 * 0. Install any required dependencies.
 * 1. Next to this file should be folders input/ and output/
 * 2. input/ folder includes 6 lists:
 * 	a) listTriumphs.tsv - has data from the triumphs sheet, cells E5:N
 * 	b) listVanguard.tsv - has data from the vanguard subscribers sheet, cells H4:H,O4:O
 * 	c) listLM.tsv - has data from LM, already in correct format
 * 	d) listCaptains.tsv - has data from IMP Completion list, cells B5:C
 * 	e) listOfficers.tsv - has data from IMP Completion list, cells F5:G
 * 	f) listPromotions.tsv - has data from IMP Promotions, cells B7:L
 * All of the above lists should already be filtered to include correct date.
 * 3. Update the ymd variable to have today's date. This script should be run the month after the news.
 * 4. Run it using command node announcement.js - execution might take a minute.
 * 5. Copy the contents of announcement.html to a new message on DI through source button.
 */

/**
 * Gets data from local files.
 * @param {string} type Predetermined data type
 * @param {string} path File path
 * @return {Object} Formatted file data object
 */
function inputHandler(type, path) {
	let data = readFileSync(join(__dirname, "./input/", path), "utf-8").split("\r\n").map(line => line.split("\t"));
	switch (type) {
		case "IMP":
			return data.map(line => {
				let obj = {
					"name": undefined,
					"division": undefined
				};
				if (line.length !== 2) {
					if (line.length !== 0) {
						console.error("Unexpected amount of columns: ", line.length, line);
						throw line;
					}
					return obj;
				}
				obj.name = line[0];
				obj.division = line[1];
				return obj;
			});
		case "LM":
			return data.map(line => {
				let obj = {
					"division": undefined,
					"name": undefined
				};
				if (line.length !== 2) {
					if (line.length !== 0) {
						console.error("Unexpected amount of columns: ", line.length, line);
						throw line;
					}
					return obj;
				}
				obj.division = line[0];
				obj.name = line[1];
				return obj;
			});
		case "Triumphs":
			return data.map(line => {
				let obj = new Map([
					["revoked"],
					["date"],
					["house"],
					["division"],
					["splitDiv"],
					["triumph"],
					["housePoints"],
					["divisionLeader"],
					["viceAwarded"],
					["vice"]
				]);
				if (line.length === 10) {
					let i = 0;
					for (let [k, v] of obj) {
						if (i === 0 || i === 8)
							obj.set(k, (line[i++].toLowerCase() === "true"));
						else if (i === 1)
							obj.set(k, new Date(line[i++]));
						else
							obj.set(k, line[i++]);
					}
				} else {
					if (line.length !== 0) {
						console.error("Unexpected amount of columns: ", line.length, line);
						throw line;
					}
				}
				return Object.fromEntries(obj);
			});
		case "Promotions":
			return data.map(line => {
				let obj = new Map([
					["day"],
					["date"],
					["name"],
					["link"],
					["cohort"],
					["house"],
					["unit"],
					["position"],
					["rank"]
				]);
				if (line.length === 11) {
					let i = 0;
					for (let [k, v] of obj) {
						if (i === 4 || i === 8)
							i++;
						if (i === 0)
							obj.set(k, +line[i++]);
						else if (i === 1)
							obj.set(k, new Date(line[i++]));
						else
							obj.set(k, line[i++]);
					}
				} else {
					if (line.length !== 0) {
						console.error("Unexpected amount of columns: ", line.length, line);
						throw line;
					}
				}
				return Object.fromEntries(obj);
			});
		case "Vanguard":
			return data.map(line => {
				let obj = {
					"name": undefined,
					"startDate": undefined
				};
				if (line.length !== 2) {
					if (line.length !== 0) {
						console.error("Unexpected amount of columns: ", line.length, line);
						throw line;
					}
					return obj;
				}
				obj.name = line[0];
				obj.startDate = new Date(line[1]);
				return obj;
			});
	}
}

/**
 * Puts data to a file in folder output/.
 * @param {string} path Name / path to the file
 * @param {string} data Contents to fill the file
 */
function outputHandler(path, data) {
	writeFileSync(join(__dirname, "./output/", path), data);
}

/**
 * Gets month string by index.
 * @param {number} month Index
 * @return {string} Month
 */
function monthFormat(month) {
	return ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][month];
}

/**
 * Transposes an mxn matrix to nxm.
 * @param {[][]} m 2D array
 * @return {[][]} 2D array
 */
function transpose(m) {
	return m[0].map((x, i) => m.map(x => x[i]));
}

/**
 * Gets rank's position.
 * @param {string} rank Rank
 * @return {number} Ordinal number
 */
function rankVal(rank) {
	let ranks = ["L3", "L4", "L5", "L6", "L7", "L8", "Leader"];
	if (ranks.includes(rank))
		return ranks.indexOf(rank);
	throw new Error(`Unexpected rank: ${rank}`);
}

/**
 * Gets order's position.
 * @param {string} order Order
 * @return {number} Ordinal number
 */
function orderVal(order) {
	let orders = ["AFU", "IMP", "LM", "VP", "OPS", "DEV"];
	if (orders.includes(order))
		return orders.indexOf(order);
	throw new Error(`Unexpected order: ${order}`);
}

/**
 * Changes a cardinal number to roman numeral with DI- prefix.
 * @param {number} num Number
 * @return {string|boolean} Roman numeral or false if failed.
 */
function romanize(num) {
	if (!+num)
		return false;
	let digits = String(+num).split(""),
		key = ["", "C", "CC", "CCC", "CD", "D", "DC", "DCC", "DCCC", "CM",
			"", "X", "XX", "XXX", "XL", "L", "LX", "LXX", "LXXX", "XC",
			"", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX"],
		roman = "",
		i = 3;
	while (i--)
		roman = (key[+digits.pop() + (i * 10)] || "") + roman;
	return "DI-" + Array(+digits.join("") + 1).join("M") + roman;
}

/**
 * Changes a roman numeral with DI- prefix to cardinal number.
 * @param {string} str Roman numeral
 * @return {number|boolean} Number or false if failed.
 */
function deromanize(str) {
	str = str.substring(3).toUpperCase();
	let validator = /^M*(?:D?C{0,3}|C[MD])(?:L?X{0,3}|X[CL])(?:V?I{0,3}|I[XV])$/,
		token = /[MDLV]|C[MD]?|X[CL]?|I[XV]?/g,
		key = { M: 1000, CM: 900, D: 500, CD: 400, C: 100, XC: 90, L: 50, XL: 40, X: 10, IX: 9, V: 5, IV: 4, I: 1 },
		num = 0, m;
	if (!(str && validator.test(str)))
		return false;
	while (m = token.exec(str))
		num += key[m[0]];
	return num;
}

/**
 * Compares 2 divisions and returns the relative order of divisions based on the higher number or the higher letter in cases of seed divs or the higher order value in cases of orders.
 * @param {string} a Division A
 * @param {string} b Division B
 * @return {number} Division's respective order
 */
function divSort(a, b) {
	let divA, divB;
	[divA, divB] = [deromanize(a), deromanize(b)];
	if (divA === false && divB === false) {
		if (a.length !== b.length)
			return b.length - a.length;
		return a.length > 3 ? a.localeCompare(b) : orderVal(a) - orderVal(b);
	}
	if (divA === false)
		return 1;
	if (divB === false)
		return -1;
	// divs descending
	return divA - divB;
}

/**
 * Translates a number to its ordinal English equivalent.
 * @param {number} n Number
 * @return {string} Ordinal string
 */
function ordinal(n) {
	let s = ["th", "st", "nd", "rd"],
		v = n % 100;
	return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/**
 * Gets an array item with the highest given property value
 * @param {[]} arr Array of items
 * @param {string} prop Property name
 * @return {*} Filtered array item
 */
function objMax(arr, prop) {
	return arr.reduce((prev, current) => (prev[prop] > current[prop]) ? prev : current);
}

/**
 * Changes given link to an HTML img node with given size.
 * @param {string} link Link to source
 * @param {number} size Image size
 * @return {string} HTML string
 */
function linkToImg(link, size) {
	return `<img src="${link}" alt="${link.substr(link.lastIndexOf("/") + 1)}" height="${size}" width="${size}">`;
}

/**
 * Changes given link to an HTML anchor node with given text.
 * @param {string} link Link to source
 * @param {string} text Text to be displayed instead of the link
 */
function linkToA(link, text) {
	return `<a href="${link}">${text}</a>`;
}

/**
 * Generates predetermined HTML blocks used in announcements.
 * @param {string} type Block type
 * @param {string} content Text to be displayed in the block
 * @return {string} HTML string
 */
function createBlock(type, content) {
	if (type === "header") {
		return `<p><span style="color: #b64240; font-size: 36px">${content}</span></p>`;
	} else if (type === "title") {
		return `<p><span style="color: #9b59b6; font-size: 22px">${content}</span></p>`;
	} else if (type === "text") {
		return `<p><span style="color: #555555; font-size: 16px">${content}</span></p>`;
	} else if (type === "top") {
		return `<p><span style="color: #777777; font-size: 16px">${content}</span></p>`;
	} else if (type === "award") {
		return `<p>${linkToImg(content, 32)}<span style="color: #b64240; font-size: 16px">Member</span> <span style="color: #444444; font-size: 12px">(by Leader)</span></p><p style="font-size: 12px; font-style: italic">Awarded for...</p>`;
	} else if (type === "triumph") {
		return `<p style="margin-left: 40px">${content}</p>`;
	}
}

/**
 * Generates HTML block for a selected member with their division logo displayed. Put in spans, not paragraphs.
 * @param {Object} member CSV row of selected member
 * @param {string} description Text inserted after member name
 * @param {Object} logos Division logos object
 * @return {string} HTML string
 */
function topMember(member, description, logos) {
	let block = createBlock("top", `${linkToImg(logos[member["division"]].small, 16)} ${member["name"]} - ${description}`);
	return block.substring(3, block.length - 4);
}

/**
 * Formats date object to 'MM YYYY' standard.
 * @param {Date} date Date
 * @return {string} Formatted string
 */
function mmYY(date) {
	return `${monthFormat(date.getMonth())} ${date.getFullYear()}`;
}

/**
 * Fetches a webpage.
 * @param {string} url Page to visit
 * @return {Promise<*>} Connection promise
 */
async function getUrl(url) {
	return await (await fetch(url, {
		headers: {
			"X-Requested-With": "XMLHttpRequest"
		}
	})).text();
}

(async () => {
	"use strict";
	utils.init();
	let ymd = "2021-07-02";
	let now = new Date(ymd);
	let rows = await utils.reportHandler(now);
	let announcementHTML = "";
	let newsDate = new Date(now.getFullYear(), now.getMonth() - 1, 5);
	let { rankColours, rankLogos, divLogos, awards } = JSON.parse(readFileSync(join(__dirname, "links.json"), "utf-8"));

	// 1. intro
	let introHtml = `<p style="text-align: center">${linkToImg(divLogos["misc"]["DI"], 300)}</p>`;
	introHtml += `<p style="text-align: center; color: #666666; font-size: 12px; font-style: italic">Quote</p>`;
	introHtml += createBlock("header", "Announcements You Should Know");
	introHtml += createBlock("title", "Title");
	introHtml += createBlock("text", "Content");

	// 2. triumphs
	let triumphHtml = createBlock("header", "Triumphs This Month");
	triumphHtml += createBlock("text", `Congratulations to the following ${linkToA(awards["Triumphs"]["Category"], "Triumphs")}:`);

	let triumphs = inputHandler("Triumphs", "listTriumphs.tsv");
	let activeTriumphs = triumphs.filter(triumph => !triumph["revoked"] && triumph["date"].getMonth() === newsDate.getMonth());
	activeTriumphs.forEach(triumph => {
		let logo = linkToImg(awards["Triumphs"][triumph["triumph"]]["logo"], 32);
		let name = `<span style="color: #b64240; font-size: 16px"> ${triumph["triumph"]}</span><br>`;
		let text = `<span style="color: #555555; font-size: 16px">${awards["Triumphs"][triumph["triumph"]]["text"]}</span>`
			.replace("DL", `${rankLogos["L6"]}<span style="color: ${rankColours["L6"]}">${triumph["divisionLeader"]}</span>`);

		if (triumph["viceAwarded"]) {
			text = text.replace("DV", `${rankLogos["L5"]}<span style="color: ${rankColours["L5"]}">${triumph["vice"]}</span>`);
		} else {
			text = text.replace("and DV", "");
		}

		text = text.replace("division1", triumph["division"])
			.replace("division2", triumph["splitDiv"])
			.replace("house", triumph["house"])
			.replace("month", monthFormat(triumph["date"].getMonth()))
			.replace("year", String(triumph["date"].getFullYear()));
		text += `<br><span style="color: #b64240; font-style: italic">${awards["Triumphs"][triumph["triumph"]]["desc"]}</span><br>`;
		triumphHtml += createBlock("triumph", linkToImg(divLogos[triumph["splitDiv"] === "-" ? triumph["division"] : triumph["splitDiv"]].big, 150));
		triumphHtml += createBlock("triumph", logo + name + text);
	});

	outputHandler("triumphs.html", triumphHtml);

	// 3. vanguard
	let vanguardHtml = createBlock("header", "New Vanguard Members");
	vanguardHtml += createBlock("text", "Thanks to these awesome people we are one step closer to achieving our 2021 Goals - so shout out to all the members below for taking the leap of faith and backing DI!");

	let vanguards = inputHandler("Vanguard", "listVanguard.tsv");
	let activeVanguard = vanguards.filter(vg => vg["startDate"] >= newsDate && rows.find(row => row["name"])).map(vg => vg["name"]);
	let vgLogo = linkToImg(divLogos["misc"]["Vanguard"], 32);
	let cols = 4;
	let vanguardTable = `<table style="border: 0; width: 100%"><tr><td colspan="${cols}">${vgLogo} <span style="color: #802b2b; font-size: 16px">Vanguard (${activeVanguard.length})</span></td></tr><tr>`;

	for (let i = 0; i < activeVanguard.length; i++) {
		let format = `<td style="font-size: 14px; color: #938383"><span style="color:#802b2b">♣</span>${activeVanguard[i]}</td>`;
		vanguardTable += i % cols === 0 && i !== 0 ? `</tr><tr>${format}` : format;
	}
	vanguardTable += "</tr></table>";
	vanguardHtml += vanguardTable;
	outputHandler("vanguard.html", vanguardTable);

	// 4. initiation

	let graduatesHtml = createBlock("header", "Associate Graduation Ceremony");
	graduatesHtml += createBlock("text", `Congratulations to the <span style="color:#dddddd">Cohort of ${mmYY(newsDate)}</span> for joining our ranks as full members. You have no doubt gone through a somewhat difficult process in the adjusting to life in DI but we hope that it has been worth it and you have now found a new home here with us. Due to the demand, some of you have been offered officer positions to take up more responsibility within the community. Ensure you use this to the glory of DI and always for the best of the community as a whole.`);
	graduatesHtml += createBlock("text", "The Top 3 for this Cohort are:");
	graduatesHtml += createBlock("text", linkToImg(awards["Honors"]["LM1"], 40) + "Member");
	graduatesHtml += createBlock("text", linkToImg(awards["Honors"]["LM2"], 40) + "Member");
	graduatesHtml += createBlock("text", linkToImg(awards["Honors"]["LM3"], 40) + "Member");

	let graduates = inputHandler("LM", "listLM.tsv");
	graduates.sort((a, b) => {
		[a, b] = [a["division"], b["division"]];
		let romanTest = /[^IXVDLCM-]+/;
		if (romanTest.test(a) && romanTest.test(b))
			return a.length - b.length || a.localeCompare(b);
		return romanTest.test(a) ? 1 : romanTest.test(b) ? -1 : deromanize(a) - deromanize(b);
	});
	let rowCount = ~~(graduates.length / 7) + 1;

	let lmFormat = [];

	for (let graduate of graduates) {
		let logo = divLogos[graduate["division"]].small;
		lmFormat.push(linkToImg(logo, 16) + `<span style="color: ${rankColours["Associate"]}">${graduate["name"]}</span>`);
	}

	let graduateArr = [];
	while (lmFormat.length) {
		let chunk = lmFormat.splice(0, rowCount);
		chunk.length = rowCount;
		graduateArr.push(chunk);
	}

	graduateArr = transpose(graduateArr);
	let graduatesTable = "<table style='border: 0; width: 100%'>";

	for (let i = 0; i < rowCount; ++i) {
		graduatesTable += "<tr>";
		for (let j = 0; j < 7; ++j) {
			graduatesTable += `<td>${graduateArr[i][j] ?? ""}</td>`;
		}
		graduatesTable += "</tr>";
	}
	graduatesTable += "</table>";

	graduatesHtml += createBlock("text", `Congratulations to the <span style="color:#dddddd">${graduates.length} Members</span> part of the <span style="color:#dddddd">Cohort of ${mmYY(newsDate)}</span> for becoming full members of Damage Inc.`);
	graduatesHtml += graduatesTable;
	outputHandler("graduates.html", graduatesTable);


	// 5. imp
	let impHtml = createBlock("header", "Imperium Ceremony");
	impHtml += createBlock("text", `Congratulations to the <span style="color: #dddddd">${mmYY(newsDate)}</span> Imperium Graduates. It has always been seen as an honor to lead members, and therefore disrespectful if the absolute best effort was not given when presented with the opportunity. You have gone through a hard month in the Imperium Order, where many of your peers fell and weren't able to reach the standards set for Officers within DI, but you’ve prevailed and shown you’ve got what it takes.`);
	impHtml += createBlock("text", "The Top 3 for this Cohort are:");
	impHtml += createBlock("text", linkToImg(awards["Honors"]["IMP1"], 40) + "Member");
	impHtml += createBlock("text", linkToImg(awards["Honors"]["IMP2"], 40) + "Member");
	impHtml += createBlock("text", linkToImg(awards["Honors"]["IMP3"], 40) + "Member");

	let captains = inputHandler("IMP", "listCaptains.tsv").sort((a, b) => divSort(a["division"], b["division"]));
	let officers = inputHandler("IMP", "listOfficers.tsv").sort((a, b) => divSort(a["division"], b["division"]));
	let cptLen = captains.length;
	let offLen = officers.length;
	let impRows = new Map();
	for (let i = 2; i < 8; ++i) {
		for (let j = 2; j + i < 8; ++j) {
			impRows.set([i, j], [~~(offLen / i), ~~(cptLen / j)]);
		}
	}
	let optimal = [...impRows.entries()].reduce((a, b) => Math.abs(b[1][0] - b[1][1]) < Math.abs(a[1][0] - a[1][1]) ? b : a);
	let rowsNum = Math.max(optimal[1][0], optimal[1][1]) + 1;
	let colNum = optimal[0];
	let impTable = `<table style="width: 100%; border: 0"><tr><td style="color: #9b59b6; font-size: 16px" colspan="${colNum[0]}">Officers</td><td style="color: #9b59b6; font-size: 16px" colspan="${colNum[1]}">Captains</td></tr>`;
	let impArr = [];

	[officers, captains].forEach(group => {
		while (group.length) {
			let chunk = group.splice(0, rowsNum);
			chunk = chunk.map(el => linkToImg(divLogos[el["division"]].small, 16) + el["name"]);
			chunk.length = rowsNum;
			impArr.push(chunk);
		}
	});

	impArr = transpose(impArr);

	for (let i = 0; i < rowsNum; ++i) {
		impTable += "<tr>";
		for (let j = 0; j < colNum[0] + colNum[1]; ++j) {
			impTable += `<td style="padding: 2px 3px; font-size: 16px">${impArr[i][j] ?? ""}</td>`;
		}
		impTable += "</tr>";
	}
	impTable += "</table>";
	impHtml += createBlock("text", `Congratulations to the <span style="color: #dddddd">${offLen} Officers</span> and <span style="color: #dddddd">${cptLen} Captains</span> part of the <span style="color: #dddddd">${mmYY(newsDate)}</span> Cohort for graduating from Imperium.`);
	impHtml += impTable;
	outputHandler("imp.html", impTable);

	// 6. top members
	let topHtml = createBlock("header", "Top Members");
	topHtml += createBlock("title", "Member of the Month");
	topHtml += createBlock("text", `Congratulations to the following member for winning ${linkToA(awards["Performance"]["Category"], "MOTM")}:`);

	let members = rows.filter(row => ["Away", "L3", "Elite", "Member", "Probation", "Specialist", "Vanguard"].includes(row["rank"]) && row["position"] === "TM");
	let motm = objMax(members, "rep_lm");
	let topRep = objMax(rows, "rep_lm");
	let topRecruit = objMax(rows, "recruits_lm");
	let topEvent = objMax(rows, "events_lm");
	let topEventHost = objMax(rows, "host_event_secs_tm");

	topHtml += createBlock("top", linkToImg(awards["Performance"]["Motm"], 32) + motm["name"]);
	topHtml += createBlock("title", "Other Notable Members");
	topHtml += createBlock("text", "Congratulations to the following members for distinguishing themselves this month:");
	topHtml += [
		topMember(topRep, `Most ${linkToA(awards["Record"]["Category"], "Active")} Member`, divLogos),
		topMember(topRecruit, `Most ${linkToA(awards["Record"]["Category"], "Recruits")}`, divLogos),
		topMember(topEvent, `Most ${linkToA(awards["Record"]["Category"], "Events")} Attended`, divLogos),
		topMember(topEventHost, `Most ${linkToA(awards["Record"]["Category"], "Events")} Hosted`, divLogos)
	].join("<br>");


	// 7. promotions
	let promotionsHtml = createBlock("header", "Promotions");
	promotionsHtml += createBlock("text", "Congratulations to:");

	let promoted = inputHandler("Promotions", "listPromotions.tsv");
	let unique = [...new Map(promoted.map(line => [line["name"], line])).values()];
	unique.sort((a, b) => {
		let divA, divB, rankA, rankB;
		[divA, divB] = [deromanize(a["unit"]), deromanize(b["unit"])];
		[rankA, rankB] = [rankVal(a["rank"]), rankVal(b["rank"])];

		if (rankA !== rankB)
			return rankB - rankA;
		// ops on top
		if (a["unit"] === "OPS")
			return -1;
		if (b["unit"] === "OPS")
			return 1;
		// house on top
		if (a["position"].includes("House"))
			return -1;
		if (b["position"].includes("House"))
			return 1;
		// faction on top
		if (a["position"].includes("Faction"))
			return -1;
		if (b["position"].includes("Faction"))
			return 1;
		// seeds and orders
		if (!divA && !divB) {
			if (a["unit"].length !== b["unit"].length)
				return b["unit"].length - a["unit"].length;
			return a["unit"].length > 3 ? a["unit"].localeCompare(b["unit"]) : orderVal(a["unit"]) - orderVal(b["unit"]);
		}
		if (!divA)
			return 1;
		if (!divB)
			return -1;
		// divs descending
		return divA - divB;
	});

	let promoFormat = [];

	for (let promo of unique) {
		let member = rows.find(row => String(row["name"]).toLowerCase() === promo["name"].toLowerCase());
		if (member === void 0 || (member["cohort"].getMonth() === now.getMonth() && member["cohort"].getFullYear() === now.getFullYear())) {
			continue;
		}
		if (member["position"] === "TM" && !promo["position"].includes("Manager") && !promo["position"].includes("Order") && !promo["position"].includes("Admin")) {
			continue;
		}

		let logo = rankLogos[promo["rank"]];
		let colour = rankColours[promo["rank"]];
		let position = promo["position"];
		let unit = promo["unit"];
		let arabic = deromanize(unit);
		let unitText;

		// seeds and orders
		if (arabic === false) {
			unitText = unit.startsWith("DI-") ? `${unit.substr(3)} Division` : unit;
		} else {
			unitText = `${ordinal(arabic)} Division`;
		}
		if (position === "Division Vice") {
			position = position.substring(9);
		}
		if (position.includes("House")) {
			unitText = `${unit} ${promo["house"]}`;
		}
		if (unitText !== "") {
			position += ` - ${unitText}`;
		}

		promoFormat.push(`<span style="font-size:16px">${logo}<span style="color:${colour}">${promo["name"]} </span><span style="color:#555555">on promotion to </span><span style="color:#b64240;font-style: italic">${position}</span></span>`);
	}
	let promotions = promoFormat.join("<br>");
	promotionsHtml += promotions;

	outputHandler("promotions.html", `<head><meta charset="utf-8"></head><body>${promotions}</body>`);

	// 8. officer / member achievements
	let achievementsHtml = createBlock("header", "Achievements & Awards");
	achievementsHtml += createBlock("text", `Congratulations to the following ${linkToA(awards["Officer"]["Category"], "officer achievements")}:`);

	let selector = "li.ipsGrid_span4.ipsPhotoPanel.ipsPhotoPanel_mini.ipsClearfix.ipsPad_half";
	let link = "https://forum.dmginc.gg/index.php?app=awards&module=awards&controller=awards&do=awarded&id=[ID]&page=";
	let awardedOfficers = [];
	for (let awardName in awards["Officer"]) {
		let award = awards["Officer"][awardName];
		let id = award["id"];
		if (id) {
			let localLink = link.replace("[ID]", id);
			let i = 1;
			while (i) {
				let data = await getUrl(localLink + i);
				try {
					JSON.parse(data);
					break;
				} catch (e) {
					let root = parse(data);
					let profiles = root.querySelectorAll(selector);
					if (profiles.length === 0) {
						i = -1;
					}
					for (let profile of profiles) {
						let name = profile.childNodes[3].childNodes[1].innerText.trim();
						let date = profile.childNodes[3].childNodes[3].childNodes[0].getAttribute("datetime");
						if (new Date(date) < newsDate) {
							i = -1;
							break;
						} else {
							let match = rows.find(row => row["name"] === name);
							if (match !== undefined) {
								let rank = match["rank"];
								awardedOfficers.push(`<span style="font-size: 16px">${linkToImg(award["logo"], 40)}${rankLogos[rank] ?? ""}<span style="color: ${rankColours[rank]}">${name}</span><span style="color: #555555"> - ${awardName}</span></span>`);
							}
						}
					}
				}
				i++;
			}
		}
	}
	achievementsHtml += awardedOfficers.join("<br>");

	achievementsHtml += createBlock("text", `Congratulations to the following ${linkToA(awards["Member"]["Category"], "member achievements")}:`);

	let memberAwards = { ...awards["Member"], ...awards["Special"] };
	delete memberAwards["category"];

	let awardedMembers = new Map();
	for (let awardName in memberAwards) {
		let award = memberAwards[awardName];
		let id = award["id"];
		if (id) {
			let localLink = link.replace("[ID]", id);
			let awarded = [];
			let i = 1;
			while (i) {
				let data = await getUrl(localLink + i);
				try {
					JSON.parse(data);
					break;
				} catch (e) {
					let root = parse(data);
					let profiles = root.querySelectorAll(selector);
					if (profiles.length === 0) {
						i = -1;
					}
					for (let profile of profiles) {
						let name = profile.childNodes[3].childNodes[1].innerText.trim();
						let date = profile.childNodes[3].childNodes[3].childNodes[0].getAttribute("datetime");
						if (new Date(date) < newsDate) {
							i = -1;
							break;
						} else {
							awarded.push(name);
						}
					}
				}
				awardedMembers.set(awardName, Array.from(awarded));
				i++;
			}
		}
	}
	awardedMembers = [...awardedMembers.entries()].filter(([k, v]) => v.length).map(([k, v]) => {
		v.unshift(k);
		return v;
	});
	rowCount = awardedMembers.reduce((prev, next) => prev.length > next.length ? prev : next).length + 1;
	let memberAwardsTable = "<table style='border: 0; width: 100%'>";
	let awardedMembers2d = [];
	awardedMembers.forEach(col => {
		let chunk = col.splice(0, rowCount);
		if (chunk[0] in memberAwards) {
			chunk[0] = linkToImg(memberAwards[chunk[0]]["logo"], 64);
		}
		for (let i = chunk.length; i < rowCount; ++i) {
			chunk[i] = "";
		}
		awardedMembers2d.push(chunk);
	});
	awardedMembers2d = transpose(awardedMembers2d);

	for (let i = 0; i < rowCount; ++i) {
		memberAwardsTable += "<tr>";
		for (let j = 0; j < awardedMembers2d[0].length; ++j) {
			memberAwardsTable += `<td style="padding: 2px 3px;">${awardedMembers2d[i][j] ?? ""}</td>`;
		}
		memberAwardsTable += "</tr>";
	}
	memberAwardsTable += "</table>";
	achievementsHtml += memberAwardsTable;

	achievementsHtml += createBlock("text", `Congratulations to the following ${linkToA(awards["Performance"]["Category"], "awards")}:`);
	achievementsHtml += createBlock("award", awards["Performance"]["Valor1"]);
	achievementsHtml += createBlock("award", awards["Performance"]["Valor2"]);
	achievementsHtml += createBlock("award", awards["Performance"]["Valor3"]);

	announcementHTML += introHtml;
	announcementHTML += triumphHtml;
	announcementHTML += vanguardHtml;
	announcementHTML += graduatesHtml;
	announcementHTML += impHtml;
	announcementHTML += topHtml;
	announcementHTML += promotionsHtml;
	announcementHTML += achievementsHtml;
	outputHandler("announcement.html", announcementHTML);
})();