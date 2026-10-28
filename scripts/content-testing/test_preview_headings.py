import ast,re,unittest
from pathlib import Path
source=Path(__file__).with_name('run-preview.py').read_text()
tree=ast.parse(source)
functions=[node for node in tree.body if isinstance(node,ast.FunctionDef) and node.name=='numbered_report_parts']
namespace={'re':re}
if functions:exec(compile(ast.Module(body=functions,type_ignores=[]),'<headings>','exec'),namespace)
class HeadingTests(unittest.TestCase):
 def parse(self,text):
  self.assertIn('numbered_report_parts',namespace)
  return namespace['numbered_report_parts'](text)
 def test_latest_numbered_parts_ignore_input_subheadings(self):
  self.assertEqual(self.parse('# Prompt\n## Input\n### Data rules\n## 1. Executive Summary\n## 2. Macro Overview\n### 2.1 Metrics\n## 3. Micro Deep Dive\n## 4. Actions'),['Executive Summary','Macro Overview','Micro Deep Dive','Actions'])
 def test_three_part_edm_and_bilingual_titles(self):
  self.assertEqual(self.parse('## 1. Summary\n## 2. Module (Breakdown)\n## 3. Actions\uff08Next Steps\uff09'),['Summary','Module','Actions'])
 def test_legacy_format_does_not_get_mistaken_for_numbered_parts(self):
  self.assertEqual(self.parse('## Output Format\n### 1. Details\n### 2. Actions'),[])
if __name__=='__main__':unittest.main()
