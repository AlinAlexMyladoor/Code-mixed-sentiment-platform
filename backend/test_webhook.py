import requests

BASE = "http://localhost:8000/webhook"

SAMPLES = [
    {
        "object": "page",
        "entry": [
            {
                "id": "123456789",
                "time": 1690000001,
                "changes": [
                    {
                        "value": {
                            "message": "I absolutely love the new features! Customer service was super fast.",
                            "comment_id": "test_comment_positive",
                        },
                        "field": "feed",
                    }
                ],
            }
        ],
    },
    {
        "object": "page",
        "entry": [
            {
                "id": "123456789",
                "time": 1690000002,
                "changes": [
                    {
                        "value": {
                            "message": "Wow, what a brilliant idea to increase the price again!",
                            "comment_id": "test_comment_sarcastic",
                        },
                        "field": "feed",
                    }
                ],
            }
        ],
    },
    {
        "object": "page",
        "entry": [
            {
                "id": "987654321",
                "time": 1690000003,
                "changes": [
                    {
                        "value": {
                            "message": "Product romba nalla illa da, worst experience ever.",
                            "comment_id": "test_comment_codemixed",
                        },
                        "field": "feed",
                    }
                ],
            }
        ],
    },
]

if __name__ == "__main__":
    for idx, payload in enumerate(SAMPLES, start=1):
        print(f"\nSending sample {idx}...")
        try:
            response = requests.post(BASE, json=payload, timeout=10)
            print(f"Status: {response.status_code} | Body: {response.json()}")
        except Exception as exc:
            print(f"Failed: {exc}")
