import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseChartColors,validChartColor} from './ai-dashboard-colors.ts';
import {percentChange} from './ai-dashboard-periods.ts';
test('chart color persistence accepts only preset tokens and six-digit colors',()=>{const saved={trend:{spend:'#12Ab90',revenue:'var(--color-chart-3)',bad:'url(https://example.com)',expression:'var(--anything)'}};assert.deepEqual(parseChartColors(JSON.parse(JSON.stringify(saved))),{trend:{spend:'#12Ab90',revenue:'var(--color-chart-3)'}});assert.equal(validChartColor('#12345'),false);assert.equal(validChartColor('red'),false);assert.deepEqual(parseChartColors(null),{});});
test('comparison changes follow EDM absolute-baseline rule',()=>{assert.equal(percentChange(-50,-100),50);assert.equal(percentChange(-150,-100),-50);assert.equal(percentChange(0,100),-100);assert.equal(percentChange(0,0),null);assert.equal(percentChange(NaN,100),null);});
