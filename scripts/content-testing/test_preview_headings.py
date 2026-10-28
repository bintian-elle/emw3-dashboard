import ast,re,unittest,json
from pathlib import Path
source=Path(__file__).with_name('run-preview.py').read_text()
tree=ast.parse(source)
functions=[node for node in tree.body if isinstance(node,ast.FunctionDef) and node.name in ('numbered_report_parts','schema','decode')]
namespace={'re':re,'json':json}
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
class EnglishContractTests(unittest.TestCase):
 def test_english_titles_and_identity_survive_without_chinese_fallback(self):
  packet={'report_id':'meta','language':'en','required_sections':['宏观','行动'],'tests':[{'test_id':'campaign-a'}],'run_id':'daily-en','period':{'start':'2026-10-20','end':'2026-10-26','label':'Last Week (Tue–Mon)'},'scope':'period','channel':'Meta','prompt_sha256':'hash'}
  report={'schema_version':'channel-prompt-preview-v1','report_id':'meta','language':'en','title':'Meta','executive_summary':'Retain for validation.','sections':[{'title':'Macro overview','markdown':'Evidence.'},{'title':'Next actions','markdown':'Retest.'}],'campaigns':[{'test_id':'campaign-a','summary':'Retain.','detail_markdown':'Specific action.'}],'data_gaps':[],'sources':[]}
  self.assertEqual(namespace['schema'](packet)['properties']['language']['enum'],['en'])
  self.assertEqual(namespace['decode'](json.dumps(report),packet)['language'],'en')
  report['language']='zh-CN'
  with self.assertRaises(AssertionError):namespace['decode'](json.dumps(report),packet)
if __name__=='__main__':unittest.main()
