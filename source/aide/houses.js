const utils = require("../utils");
const { writeFileSync } = require("fs");

function addition(arr, col, avg = true) {
	let num = arr.reduce((acc, row) => acc + +row[col], 0);
	return avg ? Math.round(num / arr.length * 100) / 100 : num;
}

(async () => {
	"use strict";
	utils.init();

	let date = new Date("2021-04-01");
	let rows = await utils.reportHandler(date);
	let houses = new Map([
		["Trident", {}],
		["Sabre", {}],
		["Longbow", {}],
		["Dagger", {}],
		["Javelin", {}]
	]);
	// let rep = [];
	for (let [house, stats] of houses) {
		let members = rows.filter(row => row["house"] === house);
		let hosts = members.filter(row => row["position"] !== "TM" && row["position"] !== "");

		let rep = addition(members, "rep_lm");
		let recruits = addition(members, "recruits_lm", false);
		let eventsHosted = addition(members, "events_lm");
		let eventsAttended = addition(hosts, "events_hosted_lm");
		let discord = addition(members, "discord_hours_lm");

		stats["member_count"] = members.length;
		stats["hosts"] = hosts.length;
		stats["rep"] = rep;
		stats["recruits"] = recruits;
		stats["events_hosted"] = eventsHosted;
		stats["events_attended"] = eventsAttended;
		stats["discord"] = discord;
	}

	let string = "";
	for (let stat in houses.get("Trident")) {
		let str = "";
		for (let [house, stats] of houses) {
			str += stats[stat] + ",";
		}
		string += str.slice(0, -1) + "\n";
		// console.log(str);
	}
	writeFileSync("test.tsv", string);
	// console.log(date.toLocaleDateString("en-GB"), houses);
})();