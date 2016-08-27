var oAnsoftApp, oDesktop, oProject, oDesign, oModule;
oAnsoftApp = new ActiveXObject("AnsoftHfss.HfssScriptInterface");
oDesktop = oAnsoftApp.GetAppDesktop();
//oDesktop.RestoreWindow();
oProject = oDesktop.GetActiveProject();
oDesign = oProject.GetActiveDesign();

var variableNames = ["M11","M22","M01","M12"], // string array
	variableValues = [0.2126,0.2362,0.166,0.1115]; // number array
for (var i = 0; i < variableNames.length; i++){
	oDesign.SetVariableValue(variableNames[i], variableValues[i].toString() + "in");
}