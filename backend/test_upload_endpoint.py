import requests

url = "http://localhost:8000/api/v1/upload"
files = {'file': ('test.png', b'fake image content', 'image/png')}
data = {'folder': 'logos'}

# We need a token. I'll try to find one or just check the status code for 401/403 vs 404
response = requests.post(url, files=files, data=data)
print(f"Status Code: {response.status_code}")
print(f"Response: {response.text}")

url_v2 = "http://localhost:8000/api/v1/upload/upload"
response_v2 = requests.post(url_v2, files=files, data=data)
print(f"v2 Status Code: {response_v2.status_code}")
