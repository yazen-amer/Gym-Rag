import json
import unittest
from unittest.mock import patch
from fastapi.testclient import TestClient
from app.main import app
from app.config import Settings
from app.schemas import Source


class ChatTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.settings = patch("app.api.routes.get_settings", return_value=Settings(
            gemini_api_key="test", cohere_api_key="test", _env_file=None))
        self.settings.start()
        self.addCleanup(self.settings.stop)

    def events(self, response):
        return [(frame.splitlines()[0][7:], json.loads(frame.splitlines()[1][6:]))
                for frame in response.text.strip().split("\n\n")]

    def test_chat_streams_sources_tokens_and_done(self):
        sources = [Source(id=1, title="Protein", page=1, snippet="Evidence")]
        with patch("app.api.routes.retrieve", return_value=sources), patch(
            "app.api.routes.stream_answer", return_value=iter(["Answer ", "[1]"])):
            response = self.client.post("/api/chat", json={"message": "Protein?"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual([e for e, _ in self.events(response)], ["sources", "token", "token", "done"])

    def test_missing_credentials_returns_actionable_503(self):
        with patch("app.api.routes.get_settings", return_value=Settings(
            gemini_api_key="", cohere_api_key="", _env_file=None)):
            response = self.client.post("/api/chat", json={"message": "Protein?"})
        self.assertEqual(response.status_code, 503)
        self.assertIn("GEMINI_API_KEY", response.json()["detail"])

    def test_empty_index_is_error_without_generation(self):
        with patch("app.api.routes.retrieve", return_value=[]), patch("app.api.routes.stream_answer") as generate:
            events = self.events(self.client.post("/api/chat", json={"message": "Protein?"}))
        self.assertEqual(events[0][0], "error")
        generate.assert_not_called()

    def test_provider_failure_is_error_without_done_or_secret(self):
        with patch("app.api.routes.retrieve", side_effect=RuntimeError("secret api-key")):
            with self.assertLogs("app.api.routes", level="ERROR"):
                response = self.client.post("/api/chat", json={"message": "Protein?"})
        self.assertEqual([e for e, _ in self.events(response)], ["error"])
        self.assertNotIn("secret", response.text)

    def test_mid_generation_failure_preserves_tokens_and_reports_error(self):
        def fail():
            yield "Partial"
            raise RuntimeError("provider failure")
        with patch("app.api.routes.retrieve", return_value=[Source(id=1, title="Paper", snippet="Evidence")]), patch(
            "app.api.routes.stream_answer", return_value=fail()):
            with self.assertLogs("app.api.routes", level="ERROR"):
                response = self.client.post("/api/chat", json={"message": "Protein?"})
        self.assertEqual([e for e, _ in self.events(response)], ["sources", "token", "error"])

    def test_invalid_message_and_role_are_rejected(self):
        for body in [{"message": "  "}, {"message": "Hi", "history": [{"role": "system", "content": "bad"}]}]:
            self.assertEqual(self.client.post("/api/chat", json=body).status_code, 422)


if __name__ == "__main__":
    unittest.main()
