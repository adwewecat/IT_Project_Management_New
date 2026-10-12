import subprocess
import win32service
import win32serviceutil

ip = "10.8.45.11"
print(f"Testing direct OpenSCManager to {ip}...")
try:
    hscm = win32service.OpenSCManager(ip, None, win32service.SC_MANAGER_ENUMERATE_SERVICE)
    print("Success OpenSCManager!")
except Exception as e:
    print("OpenSCManager error:", e)

# Try net use IPC$ with credentials
passwords = ["cHH!3#+@", "123456", "Administrator", "1"]
usernames = [r".\Administrator", "Administrator", r"ggg\Administrator", "pos"]

for u in usernames:
    for p in passwords:
        cmd = f'net use \\\\{ip}\\IPC$ "{p}" /user:"{u}"'
        res = subprocess.run(cmd, capture_output=True, text=True, shell=True)
        if res.returncode == 0:
            print(f"SUCCESS connecting IPC$ with user={u}, pass={p}")
            # Try OpenSCManager again
            try:
                hscm = win32service.OpenSCManager(ip, None, win32service.SC_MANAGER_ENUMERATE_SERVICE)
                print("OpenSCManager after IPC$ SUCCESS!")
                # Enum services
                statuses = win32service.EnumServicesStatus(hscm)
                farcar_svcs = [s for s in statuses if "FARCAR" in s[0].upper() or "FARCAR" in s[1].upper()]
                print("Farcar services:", farcar_svcs)
            except Exception as e:
                print("OpenSCManager after IPC$ failed:", e)
            # disconnect
            subprocess.run(f"net use \\\\{ip}\\IPC$ /delete /y", capture_output=True, shell=True)
            break
        else:
            # print(f"Failed {u}/{p}: {res.stderr.strip()}")
            pass
