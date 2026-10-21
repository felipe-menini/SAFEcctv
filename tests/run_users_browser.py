"""Launch browser regressions with ephemeral loopback server and random credentials."""
import os
from pathlib import Path
import secrets
import subprocess
import sys
import tempfile
import threading
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import servidor_safe as safe

with tempfile.TemporaryDirectory() as directory:
    password='Test-only-'+secrets.token_urlsafe(24)
    server=safe.create_server('127.0.0.1',0,directory,{'fmenini':password,'smenini':password})
    # Fixture accounts have completed enrollment. Bootstrap behavior has a separate test.
    with server.store.connect() as db: db.execute('UPDATE users SET must_change=0')
    # Synthetic commercial data proves no data leak while sale-price projection remains functional.
    w=server.store.workspace()['workspace']
    w.update(settings={'companyName':'QA SAFE','private':'ADMIN-ONLY'},catalog=[{'id':'qa-camera','name':'QA Camera','category':'ip','cost':50,'currency':'USD','supplierId':'SECRET'}],suppliers=[{'name':'ADMIN-ONLY'}])
    server.store.save_workspace(w,0,'fmenini')
    thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
    env=dict(os.environ,SAFE_TEST_URL='http://127.0.0.1:'+str(server.server_address[1]),SAFE_TEST_PASSWORD=password,SAFE_TEST_TEMP_PASSWORD='Temp-'+secrets.token_urlsafe(24),SAFE_TEST_NEW_PASSWORD='Permanent-'+secrets.token_urlsafe(24))
    try:
        for test in sys.argv[1:] or ['qa_server.cjs','qa_users.cjs']:
            subprocess.run(['node',str(Path(__file__).parent/test)],env=env,check=True)
    finally:
        server.shutdown();server.server_close()
