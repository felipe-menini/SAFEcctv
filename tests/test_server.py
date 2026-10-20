"""Integration tests use temporary databases and generated secrets only."""
import base64
import http.client
import io
import json
from pathlib import Path
import tempfile
import threading
import unittest
import zipfile
from PIL import Image
import servidor_safe as safe


class ServerTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.secret = 'temporary-test-' + safe.secrets.token_urlsafe(16)
        self.server = safe.create_server('127.0.0.1', 0, Path(self.tmp.name),
                                         {'fmenini': self.secret, 'smenini': self.secret})
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.port = self.server.server_address[1]

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        self.tmp.cleanup()

    def request(self, path, data=None, auth=None, method=None, headers=None):
        conn = http.client.HTTPConnection('127.0.0.1', self.port)
        h = {'Content-Type': 'application/json'}
        if auth:
            h.update({'Cookie': auth[0], 'X-CSRF-Token': auth[1]})
        h.update(headers or {})
        conn.request(method or ('POST' if data is not None else 'GET'), path,
                     json.dumps(data) if data is not None else None, h)
        r = conn.getresponse()
        raw = r.read()
        result = (r.status, dict(r.getheaders()), raw)
        conn.close()
        return result

    def login(self, username):
        status, headers, body = self.request('/api/login', {'username': username, 'password': self.secret})
        self.assertEqual(status, 200, body)
        self.assertIn('HttpOnly', headers['Set-Cookie'])
        self.assertIn('SameSite=Strict', headers['Set-Cookie'])
        return headers['Set-Cookie'].split(';')[0], json.loads(body)['csrf']

    def image(self):
        out = io.BytesIO()
        Image.new('RGB', (32, 16), 'red').save(out, 'PNG')
        return 'data:image/png;base64,' + base64.b64encode(out.getvalue()).decode()

    def test_access_roles_head_and_private_files(self):
        for p in ['/', '/app.js', '/api/workspace', '/planner/index.html']:
            self.assertIn(self.request(p)[0], (401, 303))
            self.assertIn(self.request(p, method='HEAD')[0], (401, 303))
        cctv = self.login('smenini')
        for p in ['/', '/app.js', '/api/workspace', '/api/catalogo', '/api/proveedores', '/api/presupuestos']:
            self.assertEqual(self.request(p, auth=cctv)[0], 403, p)
        self.assertEqual(self.request('/cctv', auth=cctv)[0], 200)
        admin = self.login('fmenini')
        for p in ['/.git/config', '/%2e%2e/.env', '/docs/foo', '/servidor_safe.py', '/catalogo/catalogo.json']:
            self.assertIn(self.request(p, auth=admin)[0], (403, 404), p)
        self.assertEqual(self.request('/app.js', auth=admin, method='HEAD')[0], 200)

    def test_csrf_origin_logout_expiration(self):
        a = self.login('fmenini')
        self.assertEqual(self.request('/api/logout', {}, auth=(a[0], 'bad'))[0], 403)
        self.assertEqual(self.request('/api/logout', {}, auth=a, headers={'Origin': 'https://evil.test'})[0], 403)
        self.assertEqual(self.request('/api/logout', {}, auth=a)[0], 200)
        self.assertEqual(self.request('/api/me', auth=a)[0], 401)

    def test_workspace_images_revision_portable_backup_restart(self):
        a = self.login('fmenini')
        w = {'settings': {'logoData': self.image()}, 'catalog': [{'id': 'p', 'name': 'Camera', 'image': self.image()}],
             'suppliers': [{'name': 'supplier'}], 'saved': [], 'packages': [{'id': 'kit'}],
             'draft': {'id': 'q', 'items': [], 'cctvPlan': {'background': {'src': self.image()}}}}
        r = self.request('/api/workspace', {'revision': 0, 'workspace': w}, auth=a)
        self.assertEqual(r[0], 200, r[2])
        result = json.loads(self.request('/api/workspace', auth=a)[2])
        self.assertEqual(result['revision'], 1)
        self.assertEqual(result['workspace']['packages'], w['packages'])
        self.assertTrue(result['workspace']['draft']['cctvPlan']['background']['src'].startswith('data:image/'))
        url = result['workspace']['catalog'][0]['image']
        self.assertTrue(url.startswith('/media/'))
        self.assertEqual(self.request(url, auth=a)[0], 200)
        self.assertEqual(self.request(url, auth=self.login('smenini'))[0], 403)
        self.assertEqual(len(list((Path(self.tmp.name) / 'media').glob('*'))), 1)
        self.assertEqual(self.request('/api/workspace', {'revision': 0, 'workspace': w}, auth=a)[0], 409)
        export = json.loads(self.request('/api/export', auth=a)[2])
        self.assertTrue(export['catalog'][0]['image'].startswith('data:image/'))
        self.assertEqual(self.request('/api/import', {'revision': 1, 'backup': export}, auth=a)[0], 200)
        store = safe.Store(Path(self.tmp.name))
        self.assertEqual(store.workspace()['revision'], 2)
        self.assertEqual(store.workspace()['workspace']['suppliers'], w['suppliers'])

    def test_plan_owner_media_and_validation(self):
        a, b = self.login('fmenini'), self.login('smenini')
        image = self.image()
        uploaded = self.request('/api/media', {'image': image}, auth=b)
        self.assertEqual(uploaded[0], 200, uploaded[2])
        url = json.loads(uploaded[2])['url']
        plan = {'name': 'Test', 'background': {'src': url}, 'cameras': [], 'shapes': []}
        self.assertEqual(self.request('/api/plans/test-plan', {'revision': 0, 'plan': plan}, auth=b)[0], 200)
        self.assertEqual(json.loads(self.request('/api/plans', auth=b)[2])['plans'][0]['name'], 'Test')
        self.assertEqual(self.request('/api/plans/test-plan', auth=a)[0], 404)
        self.assertEqual(self.request('/api/plans/test-plan', {'revision': 0, 'plan': plan}, auth=b)[0], 409)
        self.assertTrue(json.loads(self.request('/api/plans/test-plan', auth=b)[2])['plan']['background']['src'].startswith('data:image/'))
        for value in ['data:image/png;base64,aGVsbG8=', 'data:image/svg+xml;base64,PHN2Zy8+', '/media/' + '0' * 64]:
            self.assertEqual(self.request('/api/media', {'image': value}, auth=b)[0], 422)

    def test_admin_manages_technical_plans_without_cctv_escalation(self):
        a, b = self.login('fmenini'), self.login('smenini')
        plan = {'name': 'CCTV owned', 'cameras': [], 'shapes': []}
        self.assertEqual(self.request('/api/plans/shared-id', {'revision': 0, 'plan': plan}, auth=b)[0], 200)
        plans = json.loads(self.request('/api/plans', auth=a)[2])['plans']
        self.assertEqual(plans[0]['owner'], 'smenini')
        path = '/api/plans/shared-id?owner=smenini'
        self.assertEqual(self.request(path, auth=a)[0], 200)
        url = json.loads(self.request('/api/media', {'image': self.image()}, auth=a)[2])['url']
        plan['background'] = {'src': url}
        plan['name'] = 'Edited by admin'
        self.assertEqual(self.request(path, {'revision': 1, 'plan': plan}, auth=a)[0], 200)
        self.assertEqual(self.request(url, auth=b)[0], 200)
        self.assertEqual(json.loads(self.request(path, auth=b)[2])['plan']['name'], 'Edited by admin')
        for method in ('GET', 'HEAD', 'POST'):
            self.assertEqual(self.request('/api/plans/shared-id?owner=fmenini', {} if method=='POST' else None, auth=b, method=method)[0], 403)

    def test_backup_restore_atomic_and_hashes(self):
        a = self.login('fmenini')
        self.request('/api/media', {'image': self.image()}, auth=a)
        root = Path(self.tmp.name)
        backup, bad, dest = root/'backup.zip', root/'bad.zip', root/'restored'
        self.server.store.backup(backup)
        with zipfile.ZipFile(bad, 'w') as z:
            z.writestr('safe.sqlite3', 'not sqlite')
        with self.assertRaises(ValueError):
            safe.restore_backup(bad, dest)
        self.assertFalse(dest.exists())
        safe.restore_backup(backup, dest)
        restored = safe.Store(dest)
        with restored.connect() as db:
            self.assertEqual(db.execute('SELECT count(*) FROM sessions').fetchone()[0], 0)
            self.assertEqual(db.execute('SELECT count(*) FROM media').fetchone()[0], 1)
        with self.assertRaises(ValueError):
            safe.restore_backup(backup, dest)

    def test_legacy_migration_idempotent_and_preserves_files(self):
        root = Path(self.tmp.name)/'legacy'
        (root/'catalogo').mkdir(parents=True)
        source = root/'catalogo'/'catalogo.json'
        source.write_text(json.dumps([{'id':'legacy','name':'Legacy','image':self.image()}]))
        self.assertTrue(self.server.store.migrate(root))
        self.assertFalse(self.server.store.migrate(root))
        self.assertTrue(source.exists())
        self.assertEqual(self.server.store.workspace()['workspace']['catalog'][0]['name'], 'Legacy')

    def test_import_invalid_image_is_atomic_and_password_rotation(self):
        a = self.login('fmenini')
        w = self.server.store.workspace()['workspace']
        w['catalog'] = [{'name':'invalid','image':'data:image/png;base64,aGVsbG8='}]
        self.assertEqual(self.request('/api/import', {'revision':0,'backup':dict(w,format='safe-security-cotizador-v1')},auth=a)[0],422)
        self.assertEqual(self.server.store.workspace()['revision'],0)
        self.server.store.password('fmenini', 'rotated-'+safe.secrets.token_urlsafe(20))
        self.assertEqual(self.request('/api/me',auth=a)[0],401)
        self.assertEqual(self.request('/api/login',{'username':'fmenini','password':self.secret})[0],401)

    def test_empty_database_requires_secrets(self):
        with tempfile.TemporaryDirectory() as d:
            with self.assertRaises(ValueError):
                safe.Store(Path(d))


if __name__ == '__main__':
    unittest.main()
