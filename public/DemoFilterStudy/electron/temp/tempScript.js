var oAnsoftApp, oDesktop, oProject, oDesign, oModule;
oAnsoftApp = new ActiveXObject("AnsoftHfss.HfssScriptInterface");
oDesktop = oAnsoftApp.GetAppDesktop();
//oDesktop.RestoreWindow();
oProject = oDesktop.GetActiveProject();
oDesign = oProject.GetActiveDesign();

//var fso = new ActiveXObject("Scripting.FileSystemObject"), fsoForWriting = 2, f = fso.OpenTextFile("./temp/tempGetVariableValue.txt", fsoForWriting, true);
var variableNames = ["A","PL","B","M01","TT","M11","M12","M22","M23","M33","M34","M44","M45","M55","M56","M66","M0L","Rs","S01","S12","S23","S34","S45","S56","S0L","S11","S22","S33","S44","S55","S66","TT1"]; // string array
//f.Write("[");
WScript.StdOut.Write("[");
for (var i = 0; i < variableNames.length; i++){
	//f.Write("\"" + oDesign.GetVariableValue(variableNames[i]) + "\"");
	WScript.StdOut.Write("\"" + oDesign.GetVariableValue(variableNames[i]) + "\"");
	if (i < variableNames.length - 1){
		//f.Write(", ");
		WScript.StdOut.Write(", ");
	}
}
//f.Write("]");
WScript.StdOut.Write("]");
//f.Close();