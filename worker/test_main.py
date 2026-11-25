from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def test_normalize_volume_and_mass():
    res = client.post(
        "/normalize",
        json=[
            {"amount": 1, "unit": "cup", "ingredient": "bread flour"},
            {"amount": 2, "unit": "oz", "ingredient": "butter"},
            {"amount": 1, "unit": "tbsp", "ingredient": "mystery"},
        ],
    )
    body = res.json()
    assert body[0]["grams"] == 127
    assert body[1]["grams"] == 56.7
    assert body[2]["grams"] is None


def test_compile_returns_pdf():
    res = client.post("/compile", json={"typst": "= hello\nsome text"})
    assert res.status_code == 200
    assert res.content[:4] == b"%PDF"
