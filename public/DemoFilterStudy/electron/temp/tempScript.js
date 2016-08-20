var oAnsoftApp, oDesktop, oProject, oDesign, oModule;
oAnsoftApp = new ActiveXObject("AnsoftHfss.HfssScriptInterface");
oDesktop = oAnsoftApp.GetAppDesktop();
//oDesktop.RestoreWindow();
oProject = oDesktop.GetActiveProject();
oDesign = oProject.GetActiveDesign();

var variableNames = ["M11","M22","M33","M44","M55","M66","M01","M12","M23","M34","M45","M56","M0L"], // string array
	variableValues = [0.4263,0.471,0.4754,0.4756,0.4711,0.4263,0.303,0.188,0.17,0.16715,0.16965,0.1878,0.3031]; // number array
for (var i = 0; i < variableNames.length; i++){
	oDesign.SetVariableValue(variableNames[i], variableValues[i].toString() + "in");
}

var WshShell = WScript.CreateObject ("WScript.Shell");
oDesign.Analyze("Setup1 : Sweep1");
oModule = oDesign.GetModule("Solutions");
oModule.ExportNetworkData("", ["Setup1:Sweep1"], 3, WshShell.CurrentDirectory + "\\temp\\s0.s2p", ["All"], false, 50, "S", -1, 2, 15);