"""Isolated Compose runtime/recreate/restore QA. Does not access real SAFE data."""
import base64
import http.client
import io
import json
from pathlib import Path
import secrets
import socket
import subprocess
import tempfile
import time
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]


def main():
    project = 'safe-qa-' + secrets.token_hex(5)
    with socket.socket() as sock:
        sock.bind(('127.0.0.1', 0))
        port = sock.getsockname()[1]
    secret = secrets.token_urlsafe(30)
    with tempfile.TemporaryDirectory(prefix='safe-compose-qa-') as tmp:
        env = Path(tmp)/'test.env'
        env.write_text(f'SAFE_ADMIN_PASSWORD={secret}\nSAFE_CCTV_PASSWORD={secret}\nSAFE_PUBLIC_PORT={port}\nSAFE_BIND_HOST=127.0.0.1\nSAFE_SECURE_COOKIE=0\n')
        override = Path(tmp)/'compose.json'
        override.write_text(json.dumps({'services': {'safe': {'image': 'safe-manager-qa:local'}}}))
        compose = ['docker','compose','--project-name',project,'--env-file',str(env),'-f',str(ROOT/'docker-compose.yml'),'-f',str(override)]

        def run(*args, capture=False):
            return subprocess.run([*compose,*args],cwd=ROOT,check=True,text=True,capture_output=capture).stdout

        def request(path, data=None, auth=None):
            conn = http.client.HTTPConnection('127.0.0.1',port,timeout=10)
            headers = {'Content-Type':'application/json'}
            if auth: headers.update(Cookie=auth[0], **{'X-CSRF-Token':auth[1]})
            conn.request('POST' if data is not None else 'GET',path,json.dumps(data) if data is not None else None,headers)
            r=conn.getresponse();raw=r.read();out=(r.status,dict(r.getheaders()),raw);conn.close();return out

        def login(user):
            code,headers,raw=request('/api/login',{'username':user,'password':secret})
            assert code==200,raw
            return headers['Set-Cookie'].split(';')[0],json.loads(raw)['csrf']

        def ready():
            for _ in range(60):
                try:
                    if request('/healthz')[0]==200:return
                except (OSError,http.client.HTTPException):pass
                time.sleep(.5)
            raise AssertionError('Container did not become ready')

        try:
            run('config','--quiet')
            run('up','-d','--no-build','--wait','--wait-timeout','90')
            ready()
            admin,cctv=login('fmenini'),login('smenini')
            assert request('/api/workspace',auth=cctv)[0]==403
            out=io.BytesIO();Image.new('RGB',(16,8),'blue').save(out,'PNG')
            image='data:image/png;base64,'+base64.b64encode(out.getvalue()).decode()
            workspace={'settings':{'companyName':'Docker QA','logoData':image},'catalog':[{'id':'qa','name':'QA image','image':image}], 'suppliers':[],'saved':[],'packages':[{'id':'qa-kit'}],'draft':{'id':'qa-draft','items':[],'cctvPlan':{'background':{'src':image}}}}
            assert request('/api/workspace',{'revision':0,'workspace':workspace},admin)[0]==200
            plan={'name':'Docker owner plan','cameras':[],'shapes':[],'background':{'src':image}}
            assert request('/api/plans/docker-plan',{'revision':0,'plan':plan},cctv)[0]==200
            assert request('/api/plans/docker-plan?owner=smenini',auth=admin)[0]==200
            before=json.loads(request('/api/workspace',auth=admin)[2]);url=before['workspace']['catalog'][0]['image']
            assert request(url,auth=admin)[0]==200
            run('exec','-T','safe','python','servidor_safe.py','backup','/data/qa-backup.zip')
            run('exec','-T','safe','python','servidor_safe.py','restore','/data/qa-backup.zip','--data-dir','/data/restored')
            verified=run('exec','-T','safe','python','-c',"import os; from pathlib import Path; from servidor_safe import Store; s=Store('/data/restored'); assert os.getuid()==10001; assert s.workspace()['workspace']['packages']==[{'id':'qa-kit'}]; db=s.connect(); exec('with db as c:\\n assert c.execute(\\\"SELECT count(*) FROM media\\\").fetchone()[0]==1\\n assert c.execute(\\\"SELECT count(*) FROM plans\\\").fetchone()[0]==1\\n assert c.execute(\\\"SELECT count(*) FROM sessions\\\").fetchone()[0]==0'); print('nonroot restore verified')",capture=True)
            print(verified.strip())
            run('up','-d','--no-build','--force-recreate','--wait','--wait-timeout','90')
            ready();admin=login('fmenini');cctv=login('smenini')
            after=json.loads(request('/api/workspace',auth=admin)[2])
            assert after==before
            assert request(url,auth=admin)[0]==200
            assert json.loads(request('/api/plans/docker-plan',auth=cctv)[2])['plan']['background']['src'].startswith('data:image/')
            print('PASS Docker Compose healthy, nonroot/read-only, roles, media dedupe, backup/restore inside named volume, persistence after force-recreate')
        finally:
            run('down','--volumes','--remove-orphans')


if __name__=='__main__':
    main()
