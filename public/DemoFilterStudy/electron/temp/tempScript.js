var fso = new ActiveXObject("Scripting.FileSystemObject"),
	dirName = C:\\Users\\sam\\Documents\\User\\Embeded\\ServerApp\\Heroku\\showroom\\public\\DemoFilterStudy\\electron;

if (!fso.FolderExists(dirName + "/temp")){
	WScript.Echo(dirName + "/temp does not exist. Creating ...");
	fso.CreateFolder(dirName + "/temp");
}