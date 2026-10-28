"""Reuse the private, existing Slack bot. Never copy its token into this repository."""
import json, os, sys, urllib.request
from pathlib import Path

def main():
    config=json.loads(Path(os.environ.get('TESTING_SLACK_CONFIG','/home/ubuntu/work/anc-slack-bridge/config/production.json')).read_text())
    values={}
    for line in Path(config['secret_file']).read_text().splitlines():
        line=line.strip()
        if line and not line.startswith('#') and '=' in line:
            key,value=line.removeprefix('export ').split('=',1); values[key.strip()]=value.strip().strip('\"\'')
    token=values.get('ANC_BLUEVUA_BOT_TOKEN') or values.get('SLACK_BOT_TOKEN')
    if not token:
        # Existing installations may namespace bot token variable names.
        token=next((v for k,v in values.items() if 'BOT' in k.upper() and 'TOKEN' in k.upper() and v.startswith('xoxb-')),None)
    if not token: raise RuntimeError('Slack bot credential is unavailable')
    def call(method,payload):
        req=urllib.request.Request('https://slack.com/api/'+method,json.dumps(payload).encode(),{'Authorization':'Bearer '+token,'Content-Type':'application/json; charset=utf-8'})
        with urllib.request.urlopen(req,timeout=30) as response: result=json.load(response)
        if not result.get('ok'): raise RuntimeError('Slack rejected notification: '+str(result.get('error','unknown')))
        return result
    if len(sys.argv)>1 and sys.argv[1]=='--check':
        result=call('auth.test',{});print(json.dumps({'ok':True,'bot_user_id':result['user_id']}));return
    channel=call('conversations.open',{'users':os.environ.get('TESTING_SLACK_USER_ID','U0BN7GWSX0S')})['channel']['id']
    result=call('chat.postMessage',{'channel':channel,'text':sys.argv[1],'unfurl_links':False,'unfurl_media':False})
    print(json.dumps({'ok':True,'ts':result['ts']}))
if __name__=='__main__': main()
