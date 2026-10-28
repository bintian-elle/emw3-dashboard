"""Use the existing AI Bluevua bot and DM; never copy its token into Git."""
import json
import os
import sys
import urllib.parse
import urllib.request
from pathlib import Path


def resolve_channel(call, user):
    """im:read is already granted; im:write is not required to reuse a DM."""
    cursor = None
    seen = set()
    while True:
        params = {'types': 'im', 'limit': 200}
        if cursor:
            params['cursor'] = cursor
        result = call('conversations.list', params)
        for channel in result.get('channels', []):
            if channel.get('user') == user and channel.get('id', '').startswith('D'):
                return channel['id']
        cursor = result.get('response_metadata', {}).get('next_cursor')
        if not cursor:
            # chat:write supports addressing a user directly through the app's Messages tab.
            return user
        if cursor in seen:
            raise RuntimeError('Slack returned a repeated DM cursor')
        seen.add(cursor)


def main():
    config = json.loads(Path(os.environ.get('TESTING_SLACK_CONFIG', '/home/ubuntu/work/anc-slack-bridge/config/production.json')).read_text())
    values = {}
    for line in Path(config['secret_file']).read_text().splitlines():
        line = line.strip()
        if line and not line.startswith('#') and '=' in line:
            key, value = line.removeprefix('export ').split('=', 1)
            values[key.strip()] = value.strip().strip('\"\'')
    token = values.get('ANC_BLUEVUA_BOT_TOKEN') or values.get('SLACK_BOT_TOKEN')
    if not token:
        raise RuntimeError('AI Bluevua Slack bot credential is unavailable')

    def call(method, payload):
        headers = {'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json; charset=utf-8'}
        url = 'https://slack.com/api/' + method
        if method == 'conversations.list':
            req = urllib.request.Request(url + '?' + urllib.parse.urlencode(payload), headers=headers)
        else:
            req = urllib.request.Request(url, json.dumps(payload).encode(), headers)
        with urllib.request.urlopen(req, timeout=30) as response:
            result = json.load(response)
        if not result.get('ok'):
            raise RuntimeError('Slack rejected notification: ' + str(result.get('error', 'unknown')))
        return result

    user = os.environ.get('TESTING_SLACK_USER_ID', 'U0BN7GWSX0S')
    channel = resolve_channel(call, user)
    if len(sys.argv) > 1 and sys.argv[1] == '--check':
        result = call('auth.test', {})
        print(json.dumps({'ok': True, 'bot_user_id': result['user_id'], 'existing_dm_ready': channel.startswith('D')}))
        return
    result = call('chat.postMessage', {'channel': channel, 'text': sys.argv[1], 'unfurl_links': False, 'unfurl_media': False})
    print(json.dumps({'ok': True, 'ts': result['ts']}))


if __name__ == '__main__':
    main()
