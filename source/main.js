const fs = require("fs");
const math = require("mathjs");
const utils = require("./utils");
const parse = require("csv-parse/lib/sync");
const plotly = require("plotly")("S0rax", "nwVqFuOtcHTo137vayJO");

const multiplier = 864e5;
const rankCol = 9;
const repCol = 12;
const vanCol = 18;
const threshold = 500;

function paramHandler(params) {
	params = params.splice(2);
	let ret = [new Date(), 7];
	params.forEach((param) => {
		if (param === void 0)
			return;
		if (isNaN(+param)) {
			ret[0] = new Date(param);
		} else {
			ret[1] = +param;
		}
	});
	return ret;
}

function mnm(arr) {
	return [math.round(math.mean(arr), 3), math.median(arr)];
}

function sortArrays(arrays, comparator = (a, b) => (a < b) ? -1 : (a > b) ? 1 : 0) {
	let arrayKeys = Object.keys(arrays);
	let sortableArray = Object.values(arrays)[0];
	let indexes = Object.keys(sortableArray);
	let sortedIndexes = indexes.sort((a, b) => comparator(sortableArray[a], sortableArray[b]));

	let sortByIndexes = (array, sortedIndexes) => sortedIndexes.map(sortedIndex => array[sortedIndex]);

	if (Array.isArray(arrays)) {
		return arrayKeys.map(arrayIndex => sortByIndexes(arrays[arrayIndex], sortedIndexes));
	} else {
		let sortedArrays = {};
		arrayKeys.forEach((arrayKey) => {
			sortedArrays[arrayKey] = sortByIndexes(arrays[arrayKey], sortedIndexes);
		});
		return sortedArrays;
	}
}

(async () => {
	"use strict";
	utils.init();
	let start, span;
	[start, span] = paramHandler(process.argv);
	let begin = new Date(), i = 0;
	let officerRanks = ["L4", "L5", "L6", "L7", "L8", "Leader"],
		memberRanks = ["Member", "Captain", "Specialist", "Elite"],
		differences = [],
		outliers = [],
		members = [],
		officers = [],
		vanguards = [];
	let outcome = {
		data: "",
		add: function (...items) {
			items.forEach(item => {
				this.data += `${item},`;
			});
			this.data = this.data.slice(0, -1) + "\n";
		},
		get: function () {
			return this.data.trim();
		}
	};
	let log = {
		data: "",
		add: function (...items) {
			items.forEach(item => {
				this.data += `${item}\t`;
			});
			this.data = `${this.data.slice(0, -1)}\n`;
			return this;
		},
		space: function (char) {
			this.data += `${char.repeat(32)}\n`;
			return this;
		},
		get: function () {
			return this.data.trim();
		}
	};
	let timespan = start - multiplier * (span);

	let rowsPrev = await utils.reportHandler(new Date(timespan));
	let rowsNow = await utils.reportHandler(start);

	let rankStats = {};
	let rankNames = rowsNow.map(val => val[rankCol]).filter((val, i, arr) => arr.indexOf(val) === i && i !== 0).sort();
	for (let rank of rankNames) {
		rankStats[rank] = {
			numbers: [],
			getAvg: function () {
				return this.numbers.length > 0 ? math.round(math.mean(this.numbers), 3) : null;
			},
			getMedian: function () {
				return this.numbers.length > 0 ? math.median(this.numbers) : null;
			}
		};
	}
	outcome.add("id", "name", "rank", "diff");

	for (let row of rowsPrev) {
		if (i++ < 1) {
			continue;
		}

		let compare = rowsNow.find(e => e[0] === row[0]);
		if (compare !== void 0) {
			let diff = compare[repCol] - row[repCol];
			let rank = compare[rankCol];
			row[repCol] = diff;
			differences.push(diff);
			outcome.add(row[0], row[1], rank, row[repCol]);

			if (compare[vanCol] !== "") {
				vanguards.push(diff);
			}
			if (memberRanks.includes(rank)) {
				members.push(diff);
			}
			if (officerRanks.includes(rank)) {
				officers.push(diff);
			}

			if (diff > threshold && compare[vanCol] === "" || diff > threshold * 5 && compare[vanCol] !== "") {
				outliers.push(`${compare[1]} - ${rank} - ${diff} - ${compare[vanCol] || "0x"}`);
			}

			let index = rankNames.indexOf(rank);
			if (index !== -1) {
				rankStats[rank]["numbers"].push(diff);
			}
		}
	}

	let csv = parse(outcome.get()).slice(1);
	let allRanks = Array.from(Array(14), () => Array());
	csv.sort((a, b) => a[3] - b[3]);
	csv.forEach((row, i) => {
		let rank = row[2];
		row[0] = i;
		switch (rank) {
			case "Associate":
			case "Initiate":
				row.push("#52625f");
				allRanks[0].push(row);
				break;
			case "Away":
				row.push("#464e55");
				allRanks[1].push(row);
				break;
			case "Captain":
			case "Warden":
				row.push("#6b7c79");
				allRanks[2].push(row);
				break;
			case "Elite":
				row.push("#6b7c79");
				allRanks[3].push(row);
				break;
			case "L4":
				row.push("#777c6b");
				allRanks[4].push(row);
				break;
			case "L5":
				row.push("#948b7a");
				allRanks[5].push(row);
				break;
			case "L6":
				row.push("#ba7781");
				allRanks[6].push(row);
				break;
			case "L7":
				row.push("#6972a6");
				allRanks[7].push(row);
				break;
			case "L8":
				row.push("#ab63c9");
				allRanks[8].push(row);
				break;
			case "Leader":
				row.push("#e34535");
				allRanks[9].push(row);
				break;
			case "Member":
				row.push("#6b7c79");
				allRanks[10].push(row);
				break;
			case "Probation":
				row.push("#554d46");
				allRanks[11].push(row);
				break;
			case "Specialist":
			case "Companion":
				row.push("#6b7c79");
				allRanks[12].push(row);
				break;
			case "Vanguard":
				row.push("#6b7c79");
				allRanks[13].push(row);
				break;
		}
	});

	let months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
	for (let rank in allRanks) {
		let current = allRanks[rank];
		if (current.length === 0) continue;
		allRanks[rank] = {
			x: current.map(row => row[0]),
			y: current.map(row => row[3]),
			type: "bar",
			name: current[0][2],
			hovertext: current.map(row => row[1]),
			marker: {
				color: current[0].pop()
			}
		};
	}
	let options = {
		fileopt: "overwrite",
		filename: "example",
		layout: {
			title: `${months[start.getMonth()]} ${start.getFullYear()}`,
			plot_bgcolor: "#232323",
			titlefont: {
				family: "Roboto, sans-serif",
				size: 30
			},
			yaxis: {
				title: "Reputation",
				titlefont: {
					family: "Roboto, sans-serif",
					size: 24
				}
			}
		}
	};
	plotly.plot(allRanks, options);

	log.add("Net income", math.sum(differences));
	log.add("Mean and median", math.round(math.mean(differences), 3), math.median(differences)).space("=");

	rankStats = Object.keys(rankStats).sort().reduce((obj, prop) => {
		obj[prop] = rankStats[prop];
		return obj;
	}, {});
	for (let rank in rankStats) {
		let stat = rankStats[rank];
		log.add(rank, stat.getAvg(), stat.getMedian());
	}
	log.space("=").add("Members", ...mnm(members));
	log.add("Officers", ...mnm(officers)).add("Vanguards", ...mnm(vanguards));
	log.add("Outliers", `${outliers.length} (${math.round(outliers.length / differences.length * 100, 3)}%)`);
	log.space("=").add("Run at", begin.toJSON()).add("Execution time", `${new Date() - begin}ms`);

	let now = `${utils.dateFormat(start).replaceAll("/", ".")}.`;
	fs.writeFileSync(`${utils.reportDir + now + span}.csv`, outcome.get());
	fs.writeFileSync(`${utils.logDir + now + span}.log`, log.get());

	console.log(log.get());
	console.log(outliers);
})();
