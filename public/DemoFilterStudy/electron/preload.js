// preload.js
const fs = require('fs'),
	path = require('path'),
	exec = require('child_process').exec,
	isWin = process.platform.indexOf('win') === 0;

function execScript(scriptsArray, options, callback){
	if(typeof options === 'function'){
		callback = options;
		options = null;
	}
	if(isWin){
		var file = 'tempScript.vbs';
		fs.writeFileSync(file, scriptsArray.join("\n"));
		exec('cscript.exe /nologo "' + file + '"', options, function(){
			fs.unlinkSync(file);
			if(callback) callback();
		});
	}
}

var preloaded = {};

preloaded.readFilePromise = function (filename){
	var _promise = new Promise(function(resolve, reject) {
		fs.readFile(path.join(__dirname, filename), 'utf8', function read(err, data) {
				if (err) {
						reject(Error("It broke"));
				} else {
					resolve(data);
				}
		});
	});
	return _promise;
}

preloaded.ParseS2P = function(inputString){
	var freqMulti, dataFormat, temp1, temp2, temp3, temp4, freq = [], S21_db = [], S21_ang = [], S11_db = [], S11_ang = [];
	inputString.split("\n").forEach(function(thisLine){
		thisLine = thisLine.trim();
		if ((thisLine.length === 0) || (thisLine.charAt(0) === '!')) { return; }
		temp1 = thisLine.split(/\s{1,}/i);
		if (temp1[0] === '#') {
			if (temp1.length < 4) { throw new Error('Syntax error: at least 4 elements required --- ' + thisLine)}
			dataFormat = temp1[3].toLowerCase();
			switch (temp1[1].toLowerCase()){
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
			switch (dataFormat){
				case 'db':
					S21_db.push(temp2[1]);
					S21_ang.push(temp2[2] * Math.PI / 180);
					S11_db.push(temp2[3]);
					S11_ang.push(temp2[4] * Math.PI / 180);
					break;
				case 'ma':
					S21_db.push(20 * Math.log(temp2[1]) / Math.LN10);
					S21_ang.push(temp2[2] * Math.PI / 180);
					S11_db.push(20 * Math.log(temp2[3]) / Math.LN10);
					S11_ang.push(temp2[4] * Math.PI / 180);
					break;
				case 'ri':
					S21_db.push(10 * Math.log(temp2[1] * temp2[1] + temp2[2] * temp2[2]) / Math.LN10);
					S21_ang.push(Math.atan2(temp2[2], temp2[1]));
					S11_db.push(10 * Math.log(temp2[3] * temp2[3] + temp2[4] * temp2[4]) / Math.LN10);
					S11_ang.push(Math.atan2(temp2[4], temp2[3]));
					break;
				default:
					throw new Error('Syntax error: need to be RI, MA or dB --- ' + thisLine);
			}
		}
	})
	function toFixed3(num){return Math.round(num * 1000) / 1000;}
	return {freq: freq, S21_db: S21_db.map(toFixed3), S21_angRad: S21_ang.map(toFixed3), S11_db: S11_db.map(toFixed3), S11_angRad: S11_ang.map(toFixed3)}
}
	
process.once('loaded', () => {
  global.preloaded = preloaded;
});