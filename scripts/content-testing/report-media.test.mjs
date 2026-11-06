import {test} from 'node:test';import assert from 'node:assert/strict';import {reportMediaType} from './report-media.mjs';
test('stores native image and video formats from AI analysis without requiring WebP',()=>{
 for(const [file,hex,mime] of [['frame.jpg','ffd8ffe0','image/jpeg'],['creative.png','89504e470d0a1a0a','image/png'],['image.webp','524946460000000057454250','image/webp'],['source.mp4','000000206674797069736f6d','video/mp4']])assert.equal(reportMediaType(file,Buffer.from(hex,'hex')),mime);
});
test('rejects path traversal and executable content masquerading as media',()=>{for(const file of ['../frame.png','image.svg','page.html','frame.png'])assert.throws(()=>reportMediaType(file,Buffer.from('<script>bad</script>')));});
