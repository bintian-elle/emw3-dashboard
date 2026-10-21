import importlib.util,unittest,tempfile
from pathlib import Path
spec=importlib.util.spec_from_file_location('creative_library',Path(__file__).with_name('refresh.py'))
mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
class InventoryTest(unittest.TestCase):
 def test_shared_asset_keeps_both_campaigns_and_no_performance_in_content(self):
  rows=[{'campaign':{'id':str(i),'name':f'Campaign {i}'},'assetGroup':{'id':str(i),'name':'Content Testing'}} for i in [1,2]]
  assets=[{'assetGroup':{'id':str(i)},'asset':{'id':'44','type':'TEXT','textAsset':{'text':'Pure water'}}} for i in [1,2]]
  result=mod.inventory({'saved':{'pmax-content-testing':{'inventory':rows,'assets':assets}}})
  self.assertEqual(len(result),1);self.assertEqual(len(result['google-44']['references']),2)
  self.assertEqual(result['google-44']['texts'],['Pure water'])
 def test_caption_and_each_carousel_slide_are_preserved(self):
  result=mod.inventory({'saved':{'social':{'posts':[{'id':'p','code':'code','url':'https://instagram.com/p/code','caption':'Exact caption','mediaType':'Carousel'}]}},'graphMetadata':{'p':{'children':{'data':[{'id':'s1','media_type':'IMAGE','media_url':'https://example.com/a.jpg'},{'id':'s2','media_type':'IMAGE','media_url':'https://example.com/b.jpg'}]}}}})
  self.assertEqual(set(result),{'social-s1','social-s2'})
  self.assertEqual(result['social-s2']['texts'],['Exact caption'])
 def test_unchanged_text_reuses_fingerprint_and_edited_copy_is_changed(self):
  item={'id':'text-1','name':'Headline','platform':'google','kind':'text','references':[],'texts':['Original'],'url':None,'thumbnail':None}
  with tempfile.TemporaryDirectory() as directory:
   root=Path(directory);first,changed=mod.extract(item,root,{})
   self.assertTrue(changed)
   second,changed=mod.extract(item,root,{'text-1':first});self.assertFalse(changed)
   item['texts']=['Revised'];third,changed=mod.extract(item,root,{'text-1':second});self.assertTrue(changed)
 def test_demand_gen_preserves_ad_copy_separately_from_media(self):
  row={'campaign':{'id':'1','name':'Demand campaign'},'adGroup':{'id':'2','name':'Pitcher General Audience'},'adGroupAd':{'ad':{'id':'3','name':'content testing-Better You Can Feel','demandGenMultiAssetAd':{'headlines':[{'text':'Better water'}],'descriptions':[{'text':'No refill needed'}],'marketingImages':[{'asset':'customers/1/assets/4'}]}}}}
  result=mod.inventory({'saved':{'demand-gen-content-testing':{'inventory':[row],'adAssets':[{'id':'4','type':'IMAGE','imageAsset':{'fullSize':{'url':'https://example.com/image.png'}}}]}}})
  self.assertEqual(result['google-ad-3']['texts'],['headlines: Better water','descriptions: No refill needed'])
  self.assertEqual(result['google-4']['kind'],'image')
 def test_digest_changes_with_content_not_dictionary_order(self):
  self.assertEqual(mod.digest({'a':1,'b':2}),mod.digest({'b':2,'a':1}))
  self.assertNotEqual(mod.digest({'text':'old'}),mod.digest({'text':'new'}))
if __name__=='__main__':unittest.main()
