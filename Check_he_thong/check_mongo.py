import sys
import json
from datetime import datetime
from pymongo import MongoClient

def default_json(obj):
    if isinstance(obj, datetime):
        return obj.isoformat()
    return str(obj)

def main():
    host = "10.9.62.12"
    port = 27017
    print(f"Connecting to MongoDB at {host}:{port}...")

    # First attempt: no auth
    try:
        client = MongoClient(host, port, serverSelectionTimeoutMS=5000)
        info = client.server_info()
        print("Connected successfully without auth!")
        print(f"MongoDB version: {info.get('version')}")
    except Exception as e:
        print(f"Connection failed or auth required: {e}")
        return

    # Check databases
    try:
        dbs = client.list_database_names()
        print("\n=== Databases ===")
        for db_name in dbs:
            print(f"- {db_name}")
    except Exception as e:
        print(f"Could not list databases: {e}")

    # Check currentOp
    print("\n=== Current Operations (currentOp) ===")
    try:
        admin_db = client.admin
        # Check active operations that have run longer than 0 seconds or active queries
        current_ops = admin_db.command("currentOp", {"$all": False, "active": True})
        inprog = current_ops.get("inprog", [])
        print(f"Total active operations: {len(inprog)}")
        for op in inprog:
            opid = op.get("opid")
            secs_running = op.get("secs_running", 0)
            microsecs_running = op.get("microsecs_running", 0)
            op_type = op.get("op")
            ns = op.get("ns")
            command = op.get("command", {})
            client_ip = op.get("client")
            plan_summary = op.get("planSummary")
            waiting_for_lock = op.get("waitingForLock")
            print(f"--- OPID {opid} ---")
            print(f"  Time running: {secs_running}s ({microsecs_running} us)")
            print(f"  Client: {client_ip}")
            print(f"  Namespace: {ns}")
            print(f"  Op Type: {op_type}")
            print(f"  Waiting for lock: {waiting_for_lock}")
            print(f"  Plan Summary: {plan_summary}")
            print(f"  Command: {json.dumps(command, default=default_json)[:400]}")
    except Exception as e:
        print(f"Could not run currentOp: {e}")

    # Check serverStatus (opcounters, connections, etc.)
    print("\n=== Server Status Summary ===")
    try:
        status = admin_db.command("serverStatus")
        connections = status.get("connections", {})
        print(f"Connections: current={connections.get('current')}, available={connections.get('available')}, totalCreated={connections.get('totalCreated')}")
        
        opcounters = status.get("opcounters", {})
        print(f"Opcounters: {opcounters}")
        
        mem = status.get("mem", {})
        print(f"Memory (MB): resident={mem.get('resident')}, virtual={mem.get('virtual')}")
        
        global_lock = status.get("globalLock", {})
        print(f"Global Lock: activeClients={global_lock.get('activeClients')}, currentQueue={global_lock.get('currentQueue')}")
    except Exception as e:
        print(f"Could not get serverStatus: {e}")

if __name__ == "__main__":
    main()
