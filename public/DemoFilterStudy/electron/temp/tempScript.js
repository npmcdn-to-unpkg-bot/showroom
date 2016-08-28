var oAnsoftApp, oDesktop, oProject, oDesign, oModule;
oAnsoftApp = new ActiveXObject("AnsoftHfss.HfssScriptInterface");
oDesktop = oAnsoftApp.GetAppDesktop();
//oDesktop.RestoreWindow();
oProject = oDesktop.GetActiveProject();
oDesign = oProject.GetActiveDesign();

var variableNames = ["M11","M22","M33","M44","M55","M66","M01","M12","M23","M34","M45","M56","M0L","M13","M46"], // string array
	variableValues = [0.3032,0.1909,0.3234,0.1741,0.2013,0.2897,0.1761,0.5366,0.3371,0.2852,0.5937,0.6582,0.2003,0.5662,0.3844]; // number array
for (var i = 0; i < variableNames.length; i++){
	oDesign.SetVariableValue(variableNames[i], variableValues[i].toString() + "in");
}