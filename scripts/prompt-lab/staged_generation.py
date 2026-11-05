"""Transport separately generated campaign and channel reports without rewriting them."""
from copy import deepcopy


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
    if kind == 'channel':
        result['frozen_input']['completed_campaign_reports'] = deepcopy(completed)
    return result


def merge_reports(channel, campaigns):
    result = deepcopy(channel)
    for lang in ('en', 'zh'):
        result[lang]['presentation']['styles_per_scope'] = True
        for campaign in campaigns:
            result[lang]['presentation']['blocks'].extend(deepcopy(campaign[lang]['presentation']['blocks']))
            result[lang]['campaigns'].extend(deepcopy(campaign[lang]['campaigns']))
    return result
