const utils = require("./utils");
const fetch = require("node-fetch");
const cliProgress = require("cli-progress");

function format(str, date1, date2) {
	let ymd1 = date1.toJSON().substring(0, 10);
	let ymd2 = date2.toJSON().substring(0, 10);
	str.replace("[DATEEND]", ymd1).replace("[DATESTART]", ymd2);
	return str;
}

async function getTokens(data) {
	const url = "https://forum.dmginc.gg/di_custom/token-processing/search/SubmitHandle.php";
	return await (await fetch(url, {
		method: "post",
		body: `data=${data}`,
		headers: {
			"Content-Type": "application/x-www-form-urlencoded"
		}
	})).json();
}

(async () => {
	"use strict";
	utils.init();
	let now = utils.paramDate();

	let rows = (await utils.reportHandler(now)).slice(1);
	let teamLeaders = rows.filter(row => row[10] === "TL").map(row => +row[0]);
	const tokens = `[
		{
			"qcid": "qc_1",
			"key": "member_id",
			"operator": "0",
			"concat": "1",
			"val": "[ID]",
			"position": "0"
		},
		{
			"qcid": "qc_2",
			"key": "event_date",
			"operator": "2",
			"concat": "1",
			"val": "[DATESTART]",
			"position": "1"
		},
		{
			"qcid": "qc_3",
			"key": "event_date",
			"operator": "3",
			"concat": "1",
			"val": "[DATEEND]",
			"position": "2"
		}
	]`;
	const compTokens = `[
    {
        "qcid": "qc_1",
        "key": "division",
        "operator": "0",
        "concat": "1",
        "val": "[DIV]",
        "position": "0"
    },
    {
        "qcid": "qc_2",
        "key": "title",
        "operator": "0",
        "concat": "1",
        "val": "Comp Token",
        "position": "1"
    },
    {
        "qcid": "qc_3",
        "key": "event_date",
        "operator": "3",
        "concat": "1",
        "val": "[DATEEND]",
        "position": "1"
    },
    {
        "qcid": "qc_4",
        "key": "event_date",
        "operator": "2",
        "concat": "2",
        "val": "[DATESTART]",
        "position": "2"
    }
]`;
	const bar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);

	let data = new Map();
	let divTokens = new Map();
	let prev = new Date(now - 6048e5); // week
	let formattedTokens = format(tokens, now, prev);
	let formattedCompTokens = format(compTokens, now, prev);

	console.log("Processing TLs");
	bar.start(teamLeaders.length, 0);
	for (let teamLeader of teamLeaders) {
		let id = formattedTokens.replace("[ID]", teamLeader);
		let str = JSON.stringify(JSON.parse(id));
		let response = await getTokens(str);

		let host = response.filter(log => log["title"] === "Event Host Token");
		let recruit = response.filter(log => log["title"].includes("Recruit Token"));
		data.set(teamLeader, host.length + recruit.length);
		bar.increment();
	}
	bar.stop();
	console.log("Processing token logs");

	let failed = new Map([...data].filter(([k, v]) => v < 5));

	bar.start(failed.size, 0);
	for (let [teamLeader, points] of failed) {
		let row = rows.find(row => +row[0] === teamLeader);
		let div = row[6];
		let team = row[7];

		let target = formattedCompTokens.replace("[DIV]", div);
		let comp;
		if (divTokens.has(div)) {
			comp = divTokens.get(div);
		} else {
			let str = JSON.stringify(JSON.parse(target));
			comp = await getTokens(str);
			divTokens.set(div, comp);
		}

		let sum = 0;
		for (let token of comp) {
			let lookup = rows.find(row => +row[0] === token["member_id"]);
			if (lookup !== void 0 && lookup[6] === div && lookup[7] === team) {
				sum += 0.1;
			}
		}
		bar.increment();
		if (points + sum >= 5) {
			failed.delete(teamLeader);
		} else {
			failed.set(teamLeader, Math.round((points + sum) * 10) / 10);
		}
	}
	bar.stop();
	console.log("Total:", data);
	console.log("Failed:", failed);
})();