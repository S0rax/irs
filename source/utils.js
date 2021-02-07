const fs = require("fs");
const path = require("path");
const fetch = require("node-fetch");
const parse = require("csv-parse/lib/sync");

module.exports = {
	logDir: path.join(__dirname, "../logs/"),
	reportDir: path.join(__dirname, "../reports/"),
	csvDir: path.join(__dirname, "../csv/"),
	/**
	 * Formats date to YYYY/MM/DD
	 * @param date {Date}
	 * @return {string}
	 */
	dateFormat: function (date) {
		let digit = (num) => num > 9 ? num : `0${num}`;
		if (date instanceof Date) {
			let str = [];
			str.push(digit(date.getFullYear()), digit(date.getMonth() + 1), digit(date.getDate()));
			return str.join("/");
		} else {
			return "";
		}
	},
	/**
	 * Fetches local (if exists) or online csv and saves it.
	 * @param day {String}
	 * @return {String}
	 */
	getCsv: async function (day) {
		const url = "https://api.dmg-inc.com/reports/download/";
		let dots = day.replaceAll("/", ".");
		let path = this.csvDir + dots + ".csv";
		if (fs.existsSync(path)) {
			return fs.readFileSync(path, "utf-8");
		} else {
			let data = await (await fetch(url + day)).text();
			try {
				data = JSON.parse(data);
			} catch (e) {
				fs.writeFileSync(path, data);
				return data;
			}
			throw new Error(`Failed to fetch the report on ${day}`);
		}
	},
	/**
	 * Function to handle getting and parsing csv reports.
	 * @param time {Date}
	 * @return {Array}
	 */
	reportHandler: async function (time) {
		let name = this.dateFormat(time);
		let report = await this.getCsv(name);
		let rows = parse(report.trim());
		return rows.filter(row => row[9] !== "Inactive");
	},
	/**
	 * Filter array to only contain unique values.
	 * @param arr {Array}
	 * @param nullable {Boolean}
	 * @return {Array}
	 */
	unique: function (arr, nullable = false) {
		let u = Array.from(new Set(arr));
		return nullable ? u : u.filter(el => el !== "");
	}
};