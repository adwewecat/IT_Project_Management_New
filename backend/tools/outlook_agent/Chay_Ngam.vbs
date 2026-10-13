Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
strPath = fso.GetAbsolutePathName(fso.GetParentFolderName(WScript.ScriptFullName))
batPath = fso.BuildPath(strPath, "Chay_Outlook_Agent.bat")

WshShell.CurrentDirectory = strPath
WshShell.Run """" & batPath & """ /silent", 0, False
