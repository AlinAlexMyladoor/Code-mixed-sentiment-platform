import requests

url = "http://localhost:8000/webhook"

payload = {
  "object": "page",
  "entry": [
    {
      "id": "123456789",
      "time": 1690000001,
      "changes": [
        {
          "value": {
            "from": {"id": "11111", "name": "Happy Customer"},
            "post_id": "123456789_111",
            "message": "I absolutely love the new features! Customer service was super fast.",
            "comment_id": "test_comment_positive"
          },
          "field": "feed"
        }
      ]
    }
  ]
}

print("Sending payload to backend...")
try:
    response = requests.post(url, json=payload)
    print(f"Server Response: {response.status_code}")
    print(response.json())
except Exception as e:
    print(f"Failed to connect: {e}")