const fs = require("fs");
const utils = require("./utils");

const eligible = `${utils.reportDir}eligible.txt`;

function sortDivs(arr) {
	function romanToNum(str) {
		const roman = ["I", "IV", "V", "IX", "X", "XL", "L", "XC", "C", "CD", "D", "CM", "M"];
		const value = [1, 4, 5, 9, 10, 40, 50, 90, 100, 400, 500, 900, 1000];
		let ret = 0;
		if (/[^IXVDLCM]+/.test(str)) return -1;
		for (let i = 12; i >= 0; i--) {
			while (str.indexOf(roman[i]) === 0) {
				let reg = new RegExp(roman[i]);
				str = str.replace(reg, "");
				ret += value[i];
			}
		}
		return ret;
	}

	let romanTest = /[^IXVDLCM]+/;

	return arr.sort((a, b) => {
		a = a.substr(3);
		b = b.substr(3);
		if (romanTest.test(a) && romanTest.test(b)) {
			return a.length - b.length || a.localeCompare(b);
		}
		return romanTest.test(a) ? 1 : romanTest.test(b) ? -1 : romanToNum(a) - romanToNum(b);
	});
}

(async () => {
	"use strict";
	utils.init();
	let csv = (await utils.reportHandler(utils.paramDate())).slice(1);
	let divisions = utils.unique(csv.map(row => row["division"]));
	sortDivs(divisions);

	let divisionCount = new Map();
	divisions.forEach(div => {
		divisionCount.set(div, csv.filter(row => row["division"] === div).length);
	});

	let data = fs.readFileSync(eligible, "utf-8");
	let sup60 = new Set([...data.split("\n")].map(d => +d));
	let sub60 = new Map();
	divisionCount.forEach((v, k) => {
		let dl = csv.find(row => row["division"] === k && (row["position"] === "DC" || row["position"] === "DL"));
		if (dl !== void 0) {
			if (v < 60) {
				sub60.set(dl["id"], v);
			} else {
				sup60.add(dl["id"]);
			}
		}
	});

	fs.writeFileSync(eligible, Array.from(sup60).join("\n"));
	let names = new Map();
	sub60.forEach((v, k) => {
		if (sup60.has(k)) {
			let name = csv.find(row => row["id"] === k)["name"];
			names.set(name, v);
		}
	});
	console.log("Total:", divisionCount);
	console.log("Failed:", names);
})();