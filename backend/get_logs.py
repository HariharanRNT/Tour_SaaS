import sqlite3
conn = sqlite3.connect('app.db')
c = conn.cursor()
c.execute("SELECT name FROM sqlite_master WHERE type='table';")
print([row[0] for row in c.fetchall()])
try:
    c.execute("SELECT id, type, status, error, created_at FROM notification_logs ORDER BY created_at DESC LIMIT 5;")
    for row in c.fetchall():
        print(row)
except Exception as e:
    print(e)
