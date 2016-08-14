var variableNames = ["H","e","l","l","o","!"]; // string array
WScript.StdOut.Write("[");
for (var i = 0; i < variableNames.length; i++){
	WScript.StdOut.Write("\"" + variableNames[i] + "\"");
	if (i < variableNames.length - 1){
		WScript.StdOut.Write(", ");
	}
}
WScript.StdOut.Write("]");