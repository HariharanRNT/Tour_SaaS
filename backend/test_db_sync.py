import requests
import json
import sys

# use superadmin to get it
r = requests.post("http://localhost:8000/api/v1/auth/login", data={"username": "superadmin@example.com", "password": "password123"})
token = r.json().get("access_token")
if token:
    headers = {"Authorization": f"Bearer {token}"}
    # get package via admin endpoint if available, or just run query
    print("Logged in as superadmin")
else:
    print("Could not login as superadmin")

# Let's just query the DB using sync psycopg2 to avoid async issues and get the exact response
import psycopg2
try:
    conn = psycopg2.connect("dbname=rnt_tour user=postgres password=postgres host=localhost")
    cur = conn.cursor()
    cur.execute("SELECT advance_cancellation_enabled FROM packages WHERE id = '22d0c4c7-c57f-47ce-a93d-575bc6adda1d'")
    row = cur.fetchone()
    print("DB value:", row[0] if row else None)
except Exception as e:
    print(e)
