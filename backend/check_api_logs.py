import sys
sys.path.insert(0, '.')

# Test admin_logs directly (bypassing the circular init.py chain)
try:
    import importlib.util, os
    spec = importlib.util.spec_from_file_location("admin_logs",
        os.path.join("app", "api", "v1", "admin_logs.py"))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    routes = [r.path for r in mod.router.routes]
    print(f"admin_logs routes: {routes}")
    print("admin_logs router: OK")
except Exception as e:
    import traceback
    print(f"admin_logs FAILED: {e}")
    traceback.print_exc()
