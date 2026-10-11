import unittest
from unittest.mock import Mock
from scripts.restore_index import restore


class RestoreTests(unittest.TestCase):
    def test_batches_missing_chunks_and_preserves_existing(self):
        snapshot = {key: list(range(205)) for key in ('ids', 'embeddings', 'documents', 'metadatas')}
        collection = Mock()
        collection.get.return_value = {'ids': [0, 204]}
        self.assertEqual(restore(collection, snapshot), 203)
        batches = [call.kwargs for call in collection.upsert.call_args_list]
        self.assertEqual([len(b['ids']) for b in batches], [100, 100, 3])
        self.assertEqual([i for b in batches for i in b['ids']], list(range(1, 204)))
        for batch in batches:
            self.assertTrue(all(batch[key] == batch['ids'] for key in snapshot))
        collection.get.return_value = {'ids': snapshot['ids']}
        collection.upsert.reset_mock()
        self.assertEqual(restore(collection, snapshot), 0)
        collection.upsert.assert_not_called()
