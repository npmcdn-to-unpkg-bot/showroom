// preload.js
const fs = require('fs'),
path = require('path'),
util = require('util'),
exec = require('child_process').exec,
visa32 = require('./visa32'),
isWin = process.platform.indexOf('win') === 0;

function execScript(scriptsArray, options) {
	var file = path.join(__dirname, './temp/tempScript.js');
	if (typeof options === 'string' && options === 'vbs'){
		file = path.join(__dirname, './temp/tempScript.vbs');
	}
	if (typeof scriptsArray === 'object'){
		tempScript = scriptsArray.join("\n\n");
	} else {
		tempScript = scriptsArray;
	}
	if (isWin) {
		return new Promise(function (resolve, reject) {
			fs.writeFile(file, tempScript, 'utf8', function(err){
				if (err !== null) {
					return reject(err);
				}
				exec('cscript.exe /nologo "' + file + '"', function(err, stdout, stderr) {
					/* fs.unlinkSync(file); */
					if (err !== null) {
						return reject(err);
					}
					resolve(stdout);
				});
			});
		});
	} else {
		return Promise.resolve("");
	}
}

function ParseS2P(inputString) {
	var freqMulti, dataFormat, temp1, temp2, temp3, temp4, freq = [], S21_db = [], S21_ang = [], S11_db = [], S11_ang = [];
	inputString.split("\n").forEach(function (thisLine) {
		thisLine = thisLine.trim();
		if ((thisLine.length === 0) || (thisLine.charAt(0) === '!')) {
			return;
		}
		temp1 = thisLine.split(/\s{1,}/i);
		if (temp1[0] === '#') {
			if (temp1.length < 4) {
				throw new Error('Syntax error: at least 4 elements required --- ' + thisLine)
			}
			dataFormat = temp1[3].toLowerCase();
			switch (temp1[1].toLowerCase()) {
			case 'thz':
				freqMulti = 1e6;
				break;
			case 'ghz':
				freqMulti = 1e3;
				break;
			case 'mhz':
				freqMulti = 1;
				break;
			case 'khz':
				freqMulti = 1e-3;
				break;
			case 'hz':
				freqMulti = 1e-6;
				break;
			default:
				freqMulti = 1;
			}
		} else {
			temp2 = temp1.map(Number);
			freq.push(temp2[0] * freqMulti);
			switch (dataFormat) {
			case 'db':
				S11_db.push(temp2[1]);
				S11_ang.push(temp2[2] * Math.PI / 180);
				S21_db.push(temp2[3]);
				S21_ang.push(temp2[4] * Math.PI / 180);
				break;
			case 'ma':
				S11_db.push(20 * Math.log(temp2[1]) / Math.LN10);
				S11_ang.push(temp2[2] * Math.PI / 180);
				S21_db.push(20 * Math.log(temp2[3]) / Math.LN10);
				S21_ang.push(temp2[4] * Math.PI / 180);
				break;
			case 'ri':
				S11_db.push(10 * Math.log(temp2[1] * temp2[1] + temp2[2] * temp2[2]) / Math.LN10);
				S11_ang.push(Math.atan2(temp2[2], temp2[1]));
				S21_db.push(10 * Math.log(temp2[3] * temp2[3] + temp2[4] * temp2[4]) / Math.LN10);
				S21_ang.push(Math.atan2(temp2[4], temp2[3]));
				break;
			default:
				throw new Error('Syntax error: need to be RI, MA or dB --- ' + thisLine);
			}
		}
	})
	function toFixed3(num){return Math.round(num * 1000) / 1000;}
	function toFixed6(num){return Math.round(num * 1000000) / 1000000;}
	var toFixedN = toFixed6;
	return {freq: freq, S21_db: S21_db.map(toFixedN), S21_angRad: S21_ang.map(toFixedN), S11_db: S11_db.map(toFixedN), S11_angRad: S11_ang.map(toFixedN)}
}

function ReadFileAsync(filename) {
	return new Promise(function (resolve, reject) {
		fs.readFile(path.join(__dirname, filename), "utf8", function (err, data) {
			if (err !== null)
				return reject(err);
			resolve(data);
		});
	});
}

/**************************************
* preloaded is available in browser
**************************************/
var preloaded = {};

ReadFileAsync("./template/JsHFSSProvisioning.txt")
.then(function (a) {
	var tempScript = util.format(a, __dirname.replace(/\\/g, "\\\\"))
	return execScript(tempScript)
})
.catch (function (e) {
	return undefined;
});

preloaded.Try = function (names) {
	var p1 = ReadFileAsync("./template/test.txt");
	return Promise.all([p1])
	.then(function (values) {
		var temp1 = util.format(values[0], JSON.stringify(names)),
		tempScript = temp1;
		return execScript(tempScript)
		.then(function (a) {
			return a;
		})
	})
	.then(JSON.parse);
/* 	.catch (function (e) {
		return e;
	}); */
}

preloaded.GetHFSSVariables = function () {
	var p1 = ReadFileAsync("./template/VbsHFSSSetup.txt"),
		p2 = ReadFileAsync("./template/VbsHFSSGetVariables.txt");
	return Promise.all([p1, p2])
	.then(function (values) {
		tempScript = values.join("\n\n");
		return execScript(tempScript, "vbs")
		.then(function (a) {
			return a; //ReadFileAsync("./temp/tempGetVariables.txt");
		})
	})
	.then(JSON.parse);
/* 	.catch (function (e) {
		return undefined;
	}); */
}

preloaded.SetHFSSVariableValue = function (names, dimension) { // names is string array
	var p1 = ReadFileAsync("./template/JsHFSSSetup.txt"),
		p2 = ReadFileAsync("./template/JsHFSSSetVariableValue.txt");
	return Promise.all([p1, p2])
	.then(function (values) {
		var temp2 = util.format(values[1], JSON.stringify(names), JSON.stringify(dimension)),
		tempScript = [values[0], temp2].join("\n\n");
		return execScript(tempScript)
		.then(function (a) {
			return a;
		})
	})
}

preloaded.GetHFSSVariableValue = function (names) { // names is string array
	var p1 = ReadFileAsync("./template/JsHFSSGetVariableValue.txt"),
		p2 = ReadFileAsync("./template/JsHFSSSetup.txt");
	return Promise.all([p1, p2])
	.then(function (values) {
		var temp1 = util.format(values[0], JSON.stringify(names)),
		tempScript = [values[1], temp1].join("\n\n");
		return execScript(tempScript)
		.then(function (a) {
			return a; //ReadFileAsync("./temp/tempGetVariableValue.txt");
		})
	})
	.then(JSON.parse)
	.then(function (a) {
		return a.map(function (x) {
			return Number(x.slice(0, -2));
		});
	});
/* 	.catch (function (e) {
		return undefined;
	}); */
}

preloaded.EvaluateDimension = function (names, dimension, s2p) {
	var p1 = ReadFileAsync("./template/JsHFSSSetup.txt"),
		p2 = ReadFileAsync("./template/JsHFSSSetVariableValue.txt"),
		p3 = ReadFileAsync("./template/JsHFSSAnalyze.txt");
	return Promise.all([p1, p2, p3])
	.then(function (values) {
		var temp2 = util.format(values[1], JSON.stringify(names), JSON.stringify(dimension)),
		temp3 = util.format(values[2], __dirname.replace(/\\/g, "\\\\"), s2p),
		tempScript = [values[0], temp2, temp3].join("\n\n");
		return execScript(tempScript)
		.then(function () {
			return ReadFileAsync(util.format("./temp/%s", s2p));
		})
	})
	.then(ParseS2P);
/* 	.catch (function (e) {
		return undefined
	}); */
}

preloaded.EvaluateDerivative = function (names, dimension) {
	/* return ReadFileAsync(util.format("./temp/%s", "Derivative.csv")); */
	var p1 = ReadFileAsync("./template/JsHFSSSetup.txt"),
		p2 = ReadFileAsync("./template/JsHFSSSetVariableValue.txt"),
		p3 = ReadFileAsync("./template/JsHFSSAnalyzeDerivative.txt"),
		csvFileName = "Derivative.csv";
	return Promise.all([p1, p2, p3])
	.then(function (values) {
		var temp2 = util.format(values[1], JSON.stringify(names), JSON.stringify(dimension)),
		temp3 = util.format(values[2], __dirname.replace(/\\/g, "\\\\"), JSON.stringify(names), csvFileName),
		tempScript = [values[0], temp2, temp3].join("\n\n");
		return execScript(tempScript)
		.then(function () {
			return ReadFileAsync(util.format("./temp/%s", csvFileName));
		})
	});
}

preloaded.Visa32Find = visa32.Visa32Find;
preloaded.Visa32Query = visa32.Visa32Query;
preloaded.KeysightPNAReadS = visa32.KeysightPNAReadS;

process.once('loaded', () => {
	global.preloaded = preloaded;
});