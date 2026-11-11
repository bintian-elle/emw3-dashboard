"""Transport separately generated campaign and channel reports without rewriting them."""
from copy import deepcopy
import json

def analysis_prompt_contents(versions, channel):
    return [versions[key]['content'] for key in (channel, 'readability')]

def visual_analysis_instructions(job):
    channel = job.get('period', {}).get('channel', job['frozen_input'].get('channel'))
    prompt = '\n\n'.join(analysis_prompt_contents(job['versions'], channel))
    contract = job.get('_presentation_contract')
    if contract:
        prompt += ('\n\nOutput structure: Use exactly these section IDs in this order: '
                   + json.dumps(contract['sections'], ensure_ascii=False)
                   + '. Every block must use the corresponding section_id and scope '
                   + json.dumps(contract['scope'], ensure_ascii=False)
                   + '. Include substantive blocks for every section in both languages. '
                     'Keep these IDs unchanged; visible titles remain your choice.')
    return prompt


def generation_plan(job):
    packet = job['frozen_input']
    if (job.get('_generation_stage') or job.get('mode') != 'analysis'
            or 'translation' in job.get('versions', {}) or packet.get('chat')
            or 'visual_context' not in packet or not packet.get('campaigns')):
        return [('single', None)]
    return [('campaign', name) for name in packet['campaigns']] + [('channel', None)]


def stage_input(job, kind, campaign, completed):
    result = deepcopy(job)
    result['_generation_stage'] = {'kind': kind, 'campaign': campaign}
    sections = result['frozen_input'].get('visual_context', {}).get('sections', [])
    ids = [section['id'] for section in sections]
    if ids and len(set(ids)) == len(ids):
        scope = campaign if kind == 'campaign' else 'channel'
        result['_presentation_contract'] = {'sections': ids, 'scope': scope}
        for language in ('en', 'zh'):
            try:
                presentation = result['output_schema']['properties'][language]['properties']['presentation']['properties']
                presentation['sections']['items']['properties']['id']['enum'] = ids
                block = presentation['blocks']['items']['properties']
                block['section_id']['enum'] = ids
                block['scope']['enum'] = [scope]
            except KeyError:
                # Single-language schemas and older non-visual jobs do not have both branches.
                pass
    if kind == 'channel':
        result['frozen_input']['completed_campaign_reports'] = deepcopy(completed)
    return result


def validate_stage_result(job, result):
    contract = job.get('_presentation_contract')
    if not contract:
        return
    required, scope = contract['sections'], contract['scope']
    for language in ('en', 'zh'):
        if language not in result:
            continue
        presentation = result[language]['presentation']
        if [item.get('id') for item in presentation.get('sections', [])] != required:
            raise ValueError('Generated section IDs do not match the required section order')
        blocks = presentation.get('blocks', [])
        actual = [item.get('section_id') for item in blocks if item.get('scope') == scope]
        if any(item.get('scope') != scope for item in blocks) or any(section not in actual for section in required):
            raise ValueError('Generated scope is missing required section blocks')
        if any(section not in required for section in actual) or [required.index(section) for section in actual] != sorted(required.index(section) for section in actual):
            raise ValueError('Generated section blocks are unknown or out of order')


def merge_reports(channel, campaigns):
    result = deepcopy(channel)
    for lang in ('en', 'zh'):
        result[lang]['presentation']['styles_per_scope'] = True
        for campaign in campaigns:
            result[lang]['presentation']['blocks'].extend(deepcopy(campaign[lang]['presentation']['blocks']))
            result[lang]['campaigns'].extend(deepcopy(campaign[lang]['campaigns']))
    return result
