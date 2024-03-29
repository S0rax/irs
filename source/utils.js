const fs = require("fs");
const path = require("path");
const fetch = require("node-fetch");
const parse = require("csv-parse/lib/sync");

module.exports = {
	logDir: path.join(__dirname, "../logs/"),
	reportDir: path.join(__dirname, "../reports/"),
	csvDir: path.join(__dirname, "../csv/"),
	/**
	 * Check if necessary directories exist.
	 * @return void
	 */
	init: function () {
		let dirs = [this.logDir, this.reportDir, this.csvDir];
		dirs.forEach(dir => {
			if (!fs.existsSync(dir)) {
				fs.mkdirSync(dir);
			}
		});
	},
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
	 * @param day {string|Date}
	 * @return {string}
	 */
	getCsv: async function (day) {
		const url = "https://api.dmg-inc.com/reports/download/";
		if (day instanceof Date) {
			day = day.toLocaleDateString();
		}
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
	 * @param filter {function|boolean}
	 * @return {string[]}
	 */
	reportHandler: async function (time, filter = false) {
		let name = this.dateFormat(time);
		let report = await this.getCsv(name);
		let rows = parse(report.trim(), {
			columns: true,
			cast: true,
			cast_date: function (str) {
				let d = new Date(str);
				d.setHours(d.getHours() - 6);
				return isNaN(d) ? str : d;
			}
		});
		if (!filter)
			return rows.filter(row => row["rank"] !== "Inactive" && row["rank"] !== "Applicant" && row["member_rank"] !== "Inactive" && row["member_rank"] !== "Applicant");
		else
			return rows.filter(row => filter(row));
	},
	/**
	 * Filter array to only contain unique values.
	 * @param arr {[]}
	 * @param nullable {boolean}
	 * @return {[]}
	 */
	unique: function (arr, nullable = false) {
		let u = Array.from(new Set(arr));
		return nullable ? u : u.filter(el => el !== "");
	},
	/**
	 * Returns date from process param or a new date object.
	 * @return {Date}
	 */
	paramDate: function () {
		let time = process.argv[2] ?? Date.now();
		return new Date(time);
	}
};