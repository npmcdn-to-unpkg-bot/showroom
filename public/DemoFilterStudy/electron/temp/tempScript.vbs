Dim oAnsoftApp
Dim oDesktop
Dim oProject
Dim oDesign

Set oAnsoftApp = CreateObject("AnsoftHfss.HfssScriptInterface")
Set oDesktop = oAnsoftApp.GetAppDesktop()
oDesktop.RestoreWindow
Set oProject = oDesktop.GetActiveProject()
Set oDesign = oProject.GetActiveDesign()

' Dim fso
' Set fso = WScript.CreateObject("Scripting.Filesystemobject")
' Const fsoForReading = 1
' Const fsoForWriting = 2
' Set f = fso.OpenTextFile("./temp/tempGetVariables.txt", fsoForWriting, True)

Dim props
props = oDesign.GetVariables()
' f.Write("[")
WScript.StdOut.Write "["
For indexP = LBound(props) to UBound(props)
	' f.Write("""" & props(indexA) & """")
	WScript.StdOut.Write """" & props(indexA) & """"
	If indexP < UBound(props) Then
		' f.Write(", ")
		WScript.StdOut.Write ", "
	End If
Next
' f.Write("]")
WScript.StdOut.Write "]"
' f.Close