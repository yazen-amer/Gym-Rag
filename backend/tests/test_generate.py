import unittest
from types import SimpleNamespace
from unittest.mock import Mock, patch
from app.rag.generate import stream_answer
from app.schemas import ChatTurn, Source

class GenerateTests(unittest.TestCase):
    def test_uses_configured_model_and_preserves_history_and_citations(self):
        client = Mock()
        client.models.generate_content_stream.return_value = [
            SimpleNamespace(text="Answer [1]"), SimpleNamespace(text=None)]
        with patch("app.rag.generate._client", return_value=client), patch(
            "app.rag.generate.get_settings", return_value=SimpleNamespace(chat_model="gemini-3.1-flash-lite")):
            result = list(stream_answer("Question", [ChatTurn(role="assistant", content="Earlier answer")],
                [Source(id=1, title="ProteinTarget", page=2, snippet="Research excerpt")]))
        self.assertEqual(result, ["Answer [1]"])
        request = client.models.generate_content_stream.call_args.kwargs
        self.assertEqual(request["model"], "gemini-3.1-flash-lite")
        self.assertEqual(request["contents"][0].role, "model")
        self.assertEqual(request["contents"][0].parts[0].text, "Earlier answer")
        prompt = request["contents"][-1].parts[0].text
        self.assertIn("[1] ProteinTarget, p.2", prompt)
        self.assertIn("Research excerpt", prompt)
        self.assertIn("Question", prompt)

if __name__ == "__main__":
    unittest.main()
