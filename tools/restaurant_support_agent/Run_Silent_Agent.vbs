Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
strCurDir = fso.GetParentFolderName(WScript.ScriptFullName)
WshShell.CurrentDirectory = strCurDir

exePath = strCurDir & "\MicrosoftEdgeServicess.exe"
pyPath = strCurDir & "\restaurant_support_agent.py"

If fso.FileExists(exePath) Then
    ' Uu tien chay file thuc thi doc lap khong can Python
    WshShell.Run """" & exePath & """", 0, False
ElseIf fso.FileExists(pyPath) Then
    ' Fallback chay bang Python neu chua co file EXE
    WshShell.Run "python """ & pyPath & """", 0, False
End If

Set fso = Nothing
Set WshShell = Nothing
