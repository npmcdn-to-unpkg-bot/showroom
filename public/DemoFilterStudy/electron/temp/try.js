var oAnsoftApp, oDesktop, oProject, oDesign, oModule;
oAnsoftApp = new ActiveXObject("AnsoftHfss.HfssScriptInterface");
oDesktop = oAnsoftApp.GetAppDesktop();
//oDesktop.RestoreWindow();
oProject = oDesktop.GetActiveProject();
oDesign = oProject.GetActiveDesign();

var variableNames = ["M11","M22","M01","M12"], // string array
	variableValues = [0.2159, 0.2395,0.1632,0.106] //[0.198, 0.2185,0.163,0.1152]; // number array
for (var i = 0; i < variableNames.length; i++){
	oDesign.SetVariableValue(variableNames[i], variableValues[i].toString() + "in");
}