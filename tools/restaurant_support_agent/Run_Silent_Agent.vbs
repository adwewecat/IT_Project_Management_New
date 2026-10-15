Set WshShell = CreateObject("WScript.Shell")
strCurDir = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)
WshShell.CurrentDirectory = strCurDir
WshShell.Run "python """ & strCurDir & "\restaurant_support_agent.py""", 0, False
Set WshShell = Nothing
