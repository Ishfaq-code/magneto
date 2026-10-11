import unittest
from magneto_research.config import ResearchConfig


class ConfigTests(unittest.TestCase):
    def make(self, **kwargs):
        return ResearchConfig(**dict(workspace_host='https://example.databricks.com',
                                     catalog='workspace', schema='magneto',
                                     source_volume='references', **kwargs))

    def test_no_director_fields_required(self):
        config = self.make()
        self.assertEqual(config.volume_name, 'workspace.magneto.references')
        self.assertIsNone(config.experiment_name)

    def test_rejects_credential_bearing_host(self):
        with self.assertRaises(ValueError):
            ResearchConfig('https://user:secret@example.com', 'a', 'b', 'c')

    def test_rejects_resource_paths(self):
        with self.assertRaises(ValueError):
            ResearchConfig('https://example.com', 'a', 'b', '../c')

    def test_rejects_incomplete_index_name(self):
        with self.assertRaises(ValueError):
            self.make(search_index='index')
