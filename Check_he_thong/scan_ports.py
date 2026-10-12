import socket

ip = "10.8.45.11"
common_ports = [
    21, 22, 23, 25, 53, 80, 88, 135, 137, 138, 139, 443, 445, 
    593, 1433, 1726, 1727, 27017, 3389, 5900, 5985, 5986, 
    8000, 8080, 8888, 9000, 9090, 9999
]

print(f"Scanning ports on {ip}...")
for port in common_ports:
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.settimeout(1.0)
    res = s.connect_ex((ip, port))
    if res == 0:
        print(f"PORT {port} is OPEN!")
    s.close()
print("Scan done.")
