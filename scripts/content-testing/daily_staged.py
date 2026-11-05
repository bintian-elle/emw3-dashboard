"""Build the scheduled analysis stages without rewriting model conclusions."""
from copy import deepcopy


def campaign_packet(packet, name):
    result = deepcopy(packet)
    result['tests'] = [test for test in packet['tests'] if test['test_id'] == name]
    history = result.get('supporting_data', {}).get('daily_history')
    if isinstance(history, dict):
        result['supporting_data']['daily_history'] = {name: history.get(name, [])}
    result['generation_stage'] = {'kind': 'campaign', 'campaign': name}
    return result


def channel_packet(packet, reports):
    result = deepcopy(packet)
    result['channel_tests'] = result.pop('tests')
    result['tests'] = []
    result['completed_campaign_reports'] = deepcopy(reports)
    result['generation_stage'] = {'kind': 'channel'}
    return result


def merge_channel(channel, reports):
    result = deepcopy(channel)
    result['campaigns'] = [deepcopy(campaign) for report in reports for campaign in report['campaigns']]
    return result
