// NI-VISA Programmer Reference Manual
var ref = require('ref');
var ffi = require('ffi');

/**************************************************************
__VISATYPE.H and VISA.H definition__
uint32: ViSession, ViFindList, ViObject, ViAccessMode
int32:  ViStatus
char*:  ViRsrc, ViString
**************************************************************/
var VI_SUCCESS = 0,
uint32Ptr = ref.refType('uint32'),
visa32 = ffi.Library('visa32', {
	'viOpenDefaultRM': ['int32', [uint32Ptr] ],																				//ViStatus viOpenDefaultRM(ViPSession sesn)
	'viFindRsrc' : ['int32', ['uint32', 'string', uint32Ptr, uint32Ptr, 'pointer']],	//ViStatus viFindRsrc(ViSession sesn, ViString expr, ViPFindList findList, ViPUInt32 retcnt, ViChar instrDesc[])
	'viFindNext' : ['int32', ['uint32', 'pointer'] ],																	//ViStatus viFindNext(ViFindList findList, ViChar instrDesc[])
	'viOpen' : ['int32', ['uint32', 'string', 'uint32', 'uint32', uint32Ptr]],				//ViStatus viOpen(ViSession sesn, ViRsrc rsrcName, ViAccessMode accessMode, ViUInt32 openTimeout, ViPSession vi)
	'viPrintf' : ['int32', ['uint32', 'string']],																			//ViStatus viPrintf(ViSession vi, ViString writeFmt, ...)
	'viScanf' : ['int32', ['uint32', 'string', 'pointer']],														//ViStatus viScanf(ViSession vi, ViString readFmt, ...)
	'viClose' : ['int32', ['uint32']]																									//ViStatus viClose(ViObject vi)
});

function Visa32Find(findExpr){
	var i, viStatus, resourceManager = ref.alloc('uint32'), maxInstrDescLength = 256,
		instrDesc = Buffer.alloc(maxInstrDescLength, 0), findList = ref.alloc('uint32'),
		retcnt = ref.alloc('uint32'), result = [];

	return new Promise(function (resolve, reject) {
		viStatus = visa32.viOpenDefaultRM(resourceManager);
		console.log("viStatus: ", viStatus);
		visa32.viFindRsrc.async(resourceManager.deref(), "TCPIP0::*::SOCKET", findList, retcnt, instrDesc, function (err, res) {
			if (err) reject(err);
			console.log("viStatus: ", res);
			result.push(ref.readCString(instrDesc, 0));
			for(i = 0; i < retcnt.deref(); i++) {
				instrDesc.fill(0);
				viStatus = visa32.viFindNext(findList.deref(), instrDesc);
				result.push(ref.readCString(instrDesc, 0));
			}
			
			visa32.viClose(findList.deref());
			visa32.viClose(resourceManager.deref());
			console.log("result: ", result);
			resolve(result);
		});
	});
}

function Visa32Query(visaAddress, queryString, replyLength){
	replyLength = replyLength || 256;
	var viStatus, resourceManager = ref.alloc('uint32'), vi = ref.alloc('uint32'), responseBuffer = Buffer.alloc(replyLength, 0);

	return new Promise(function (resolve, reject) {
		viStatus = visa32.viOpenDefaultRM(resourceManager);

		//var visaAddress = 'GPIB0::22::INSTR'  'TCPIP0::1.2.3.4::999::SOCKET'
		console.log("ADDR : " + visaAddress);
		viStatus = visa32.viOpen(resourceManager.deref(), visaAddress, '0', '2000', vi);

		//var queryString = "*IDN?";
		viStatus = visa32.viPrintf(vi.deref(), queryString + "\n");
		visa32.viScanf.async(vi.deref(), "%s", responseBuffer, function (err, res) {
			if (err) reject(err);
			console.log("viStatus: ", res);
			visa32.viClose(vi.deref());
			visa32.viClose(resourceManager.deref());
			resolve(ref.readCString(responseBuffer, 0));
		});
	}

function KeysightPNAReadS(visaAddress){
	//Visa32Query(visaAddress, "ABORT;:INITIATE:IMMEDIATE;*OPC?");
	Visa32Query(visaAddress, "MMEM:STOR:TRAC:FORM:SNP DB");
	var result = Visa32Query(visaAddress, "CALC:DATA:SNP:PORTs? \"1,2\"", 3 * 1024 * 1024);
	Visa32Query(visaAddress, "*OPC?");
	return result;
}

exports = exports || {};
exports.Visa32Find = Visa32Find;
exports.Visa32Query = Visa32Query;
exports.KeysightPNAReadS = KeysightPNAReadS;

// if you use as module, please comment out below:
// exports.Visa32Query('GPIB0::22::INSTR','*IDN?');
/* exports.Visa32Find(); */