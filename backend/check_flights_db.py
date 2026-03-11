import sqlite3
import os

db_path = 'tour_saas.db'
if not os.path.exists(db_path):
    print(f"Database not found at {db_path}")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()
cursor.execute('SELECT id, title, flights_enabled, flight_origin_cities FROM packages WHERE status = "published"')
rows = cursor.fetchall()

print("Published Packages Flight Status:")
for row in rows:
    print(f"ID: {row[0]}, Title: {row[1]}, Flights Enabled: {bool(row[2])}, Origins: {row[3]}")

conn.close()
