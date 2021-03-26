const utils = require("../utils");
const fs = require("fs");

(async () => {
	"use strict";
	utils.init();
	let start = "2019-04-01";
	let end = "2021-03-02";
	// let start = "2019-04-01";
	// let end = "2019-04-01";
	let startDate = new Date(start);
	let endDate = new Date(end);

	let divisionCount = [];
	let houseMemberCount = [];
	let divHouse = new Map([
		["DI-VII", "Trident"],
		["DI-XIV", "Trident"],
		["DI-XV", "Trident"],
		["DI-XXI", "Trident"],
		["DI-XXVII", "Trident"],
		["DI-XXIV", "Trident"],
		["DI-XXX", "Trident"],
		["DI-XXXV", "Trident"],
		["DI-XXXVIII", "Trident"],
		["DI-XLV", "Trident"],
		["DI-L", "Trident"],
		["DI-LV", "Trident"],
		["DI-LVIII", "Trident"],
		["DI-LX", "Trident"],
		["DI-T1", "Trident"],
		["DI-T2", "Trident"],
		["DI-T3", "Trident"],
		["DI-T4", "Trident"],
		["DI-T5", "Trident"],
		["DI-CV", "Trident"],
		["DI-I", "Sabre"],
		["DI-II", "Sabre"],
		["DI-IV", "Sabre"],
		["DI-V", "Sabre"],
		["DI-XXIII", "Sabre"],
		["DI-XXV", "Sabre"],
		["DI-XXXIV", "Sabre"],
		["DI-XXXIX", "Sabre"],
		["DI-XLIV", "Sabre"],
		["DI-XLIX", "Sabre"],
		["DI-LIV", "Sabre"],
		["DI-LVI", "Sabre"],
		["DI-S1", "Sabre"],
		["DI-S2", "Sabre"],
		["DI-S3", "Sabre"],
		["DI-S4", "Sabre"],
		["DI-S5", "Sabre"],
		["DI-CIII", "Sabre"],
		["DI-III", "Longbow"],
		["DI-VI", "Longbow"],
		["DI-XII", "Longbow"],
		["DI-XIX", "Longbow"],
		["DI-XXVI", "Longbow"],
		["DI-XXVIII", "Longbow"],
		["DI-XXXVII", "Longbow"],
		["DI-XL", "Longbow"],
		["DI-XLII", "Longbow"],
		["DI-XLVIII", "Longbow"],
		["DI-LII", "Longbow"],
		["DI-L1", "Longbow"],
		["DI-L2", "Longbow"],
		["DI-L3", "Longbow"],
		["DI-L4", "Longbow"],
		["DI-L5", "Longbow"],
		["DI-CIV", "Longbow"],
		["DI-VIII", "Dagger"],
		["DI-XI", "Dagger"],
		["DI-XIII", "Dagger"],
		["DI-XVI", "Dagger"],
		["DI-XVIII", "Dagger"],
		["DI-XXIX", "Dagger"],
		["DI-XXXIII", "Dagger"],
		["DI-XXXVI", "Dagger"],
		["DI-XLI", "Dagger"],
		["DI-XLVII", "Dagger"],
		["DI-LIII", "Dagger"],
		["DI-LVII", "Dagger"],
		["DI-D1", "Dagger"],
		["DI-D2", "Dagger"],
		["DI-D3", "Dagger"],
		["DI-D4", "Dagger"],
		["DI-D5", "Dagger"],
		["DI-CII", "Dagger"],
		["DI-IX", "Javelin"],
		["DI-X", "Javelin"],
		["DI-XVII", "Javelin"],
		["DI-XX", "Javelin"],
		["DI-XXII", "Javelin"],
		["DI-XXXI", "Javelin"],
		["DI-XXXII", "Javelin"],
		["DI-XLIII", "Javelin"],
		["DI-XLVI", "Javelin"],
		["DI-LI", "Javelin"],
		["DI-LIX", "Javelin"],
		["DI-J1", "Javelin"],
		["DI-J2", "Javelin"],
		["DI-J3", "Javelin"],
		["DI-J4", "Javelin"],
		["DI-J5", "Javelin"],
		["DI-C", "Javelin"],
		["DI-CI", "Javelin"],
	]);

	while (startDate <= endDate) {
		let rows = await utils.reportHandler(startDate);
		let activeHouseDiv = new Map([
			["Trident", new Set()],
			["Sabre", new Set()],
			["Longbow", new Set()],
			["Dagger", new Set()],
			["Javelin", new Set()]
		]);
		let exceptions = [null, 0, "Unassigned", "", "Leadership", "DI-Community"];
		rows = rows.filter(row => row["member_rank"] !== "Inactive" && row["member_rank"] !== "Applicant" && row["rank"] !== "Applicant");
		rows.forEach(row => {
			let house = row["house"], div = row["division"];
			if (exceptions.includes(house) || exceptions.includes(div))
				return;
			if (house === undefined)
				house = divHouse.get(div);
			// console.log(house, div, startDate);
			activeHouseDiv.get(house).add(div);
		});
		divisionCount.push(([...activeHouseDiv.entries()].map(([house, div]) => div.size)).join("\t"));
		// console.log(startDate, activeHouseDiv)

		startDate.setMonth(startDate.getMonth() + 1);
	}
	fs.writeFileSync("./divisions.tsv", divisionCount.join("\n"));
})();