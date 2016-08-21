var fso = new ActiveXObject("Scripting.FileSystemObject");

if (!fso.FolderExists("./temp")){
	WScript.Echo("./temp does not exist. Creating ...");
	fso.CreateFolder("./temp");
}