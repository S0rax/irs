const fetch = require("node-fetch");
const parser = require("node-html-parser");
const fs = require("fs");
const utils = require("./utils")
const cliProgress = require("cli-progress");;

const awardsLink = "https://forum.dmginc.gg/index.php?app=awards&module=awards&controller=awards&do=awarded&id=%d&page=%s";
const historicalLink = "https://forum.dmginc.gg/awards/category/9-historic-moment-achievements/";
const elderLink = "https://forum.dmginc.gg/awards/category/8-special-achievements/";

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
	const bar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);

	let historicalData = await getUrl(historicalLink);
	let root = parser.parse(historicalData);
	let countHolders = root.querySelectorAll("div.ipsResponsive_showDesktop dt.ipsDataItem_stats_number a");
	let awardCount = countHolders.map(holder => +holder.innerText.trim());

	let names = new Set();
	let awardIds = [148, 97, 98];
	for (let [i, id] of awardIds.entries()) {
		let pages = Math.ceil(awardCount[i] / 15);
		bar.start(pages);

		let j = 1;
		while (j++) {
			let url = awardsLink.replace("%d", id).replace("%s", j);
			let data = await getUrl(url);
			bar.increment();

			try {
				JSON.parse(data);
				break;
			} catch (e) {
				let root = parser.parse(data);
				let profiles = root.querySelectorAll("li.ipsGrid_span4.ipsPhotoPanel.ipsPhotoPanel_mini.ipsClearfix.ipsPad_half");

				profiles.forEach(profile => {
					names.add(profile.childNodes[3].childNodes[1].innerText.trim());
				});
			}
		}
		bar.stop();
	}
	// let arr = Array.from(names);
	let rows = await utils.reportHandler(new Date("2021-02-24"));
	names.forEach(name => {
		let row = rows.find(row => row["name"] === name);
		if (!row) {
			names.delete(name);
		}
	});
	console.log(names);
	// fs.writeFileSync("./awards.txt", arr.join("\r\n"))
})();