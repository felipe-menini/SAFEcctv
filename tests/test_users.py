"""Account/module security regression; synthetic temporary data only."""
import json
import secrets
import unittest
from tests.test_server import ServerTests
import servidor_safe as safe

class UserModuleTests(ServerTests):
    # Do not duplicate inherited legacy tests in this class.
    def setUp(self):
        super().setUp()
        for name in ('fmenini', 'smenini'):
            self.server.store.password(name, self.secret)
        self.admin = self.login('fmenini')
        self.temp = 'Temporary-' + secrets.token_urlsafe(20)
        self.newpass = 'Permanent-' + secrets.token_urlsafe(20)

    def account(self, name='alice', modules=None):
        return self.request('/api/users', {'name': name, 'modules': modules or ['cotizador', 'relevamiento'],
                                         'password': self.temp, 'current': self.secret}, auth=self.admin)

    def signin(self, name='alice', password=None):
        r = self.request('/api/login', {'username': name, 'password': password or self.temp})
        if r[0] != 200: return r, None
        return r, (r[1]['Set-Cookie'].split(';')[0], json.loads(r[2])['csrf'])

    def change(self, auth):
        r = self.request('/api/password', {'current': self.temp, 'password': self.newpass}, auth=auth)
        self.assertEqual(r[0], 200, r[2])
        return self.signin(password=self.newpass)[1]

    def test_account_lifecycle_and_forced_password(self):
        r = self.account(); self.assertEqual(r[0], 200, r[2])
        self.assertNotIn(b'hash', r[2]); self.assertNotIn(self.temp.encode(), r[2])
        r, auth = self.signin(); self.assertTrue(json.loads(r[2])['mustChangePassword'])
        for path in ('/', '/session.js', '/api/workspace', '/api/plans', '/app.js'):
            self.assertEqual(self.request(path, auth=auth)[0], 403, path)
        auth = self.change(auth)
        self.assertEqual(self.request('/api/workspace', auth=auth)[0], 200)
        self.assertEqual(self.request('/api/users', auth=auth)[0], 403)
        r = self.request('/api/users/alice', {'modules':['ayuda'], 'current':self.secret}, auth=self.admin)
        self.assertEqual(r[0], 200, r[2]); self.assertEqual(self.request('/api/me', auth=auth)[0], 401)
        _, auth = self.signin(password=self.newpass)
        self.assertEqual(self.request('/api/workspace', auth=auth)[0], 403)
        self.assertEqual(self.request('/api/users/alice', {'active':False,'current':self.secret}, auth=self.admin)[0], 200)
        self.assertEqual(self.request('/api/me', auth=auth)[0], 401)
        self.assertEqual(self.signin(password=self.newpass)[0][0], 401)
        self.assertEqual(self.request('/api/users/alice', {'active':True,'password':self.temp,'current':self.secret}, auth=self.admin)[0], 200)
        self.assertTrue(json.loads(self.signin()[0][2])['mustChangePassword'])

    def test_projection_partial_merge_and_module_matrix(self):
        w=self.server.store.workspace()['workspace']; w.update(settings={'companyName':'PUBLIC','private':'SECRET'}, catalog=[{'id':'p','name':'Camera','cost':123,'supplierId':'PRIVATE'}], suppliers=[{'name':'PRIVATE'}], saved=[{'clientName':'PRIVATE'}], draft={'clientName':'PRIVATE','survey':{'notes':'PRIVATE'}})
        self.server.store.save_workspace(w,0,'fmenini')
        self.assertEqual(self.account()[0],200)
        _,auth=self.signin(); auth=self.change(auth)
        r=self.request('/api/workspace',auth=auth); self.assertNotIn(b'PRIVATE',r[2]); self.assertNotIn(b'SECRET',r[2]); self.assertNotIn(b'"cost"',r[2])
        d=json.loads(r[2]); self.assertNotIn('suppliers',d['workspace']); self.assertNotIn('saved',d['workspace'])
        self.assertEqual(self.request('/api/workspace',{'revision':d['revision'],'workspace':{'draft':{'clientName':'own','survey':{'notes':'own'}}}},auth=auth)[0],200)
        self.assertEqual(self.server.store.workspace()['workspace']['draft']['clientName'],'PRIVATE')
        d=json.loads(self.request('/api/workspace',auth=auth)[2])
        self.assertEqual(self.request('/api/workspace',{'revision':d['revision'],'workspace':{'suppliers':[]}},auth=auth)[0],403)
        for path in ('/api/proveedores','/api/presupuestos','/api/export','/api/import','/api/plans','/api/users','/cctv'):
            for method in ('GET','HEAD'):
                self.assertIn(self.request(path,auth=auth,method=method)[0],(403,404),path)
        self.assertEqual(self.request('/api/users/alice', {'role':'admin','current':self.temp},auth=auth)[0],403)
        for module in safe.MODULES:
            self.assertEqual(self.request('/api/users/alice',{'modules':[module],'current':self.secret},auth=self.admin)[0],200)
            _,auth=self.signin(password=self.newpass)
            r=self.request('/api/me',auth=auth); self.assertEqual(json.loads(r[2])['modules'],[module])
            for path,required in [('/api/catalogo','catalogo'),('/api/proveedores','proveedores'),('/api/presupuestos','presupuestos'),('/api/plans','plano')]:
                for method in ('GET','HEAD'):
                    self.assertEqual(self.request(path,auth=auth,method=method)[0],200 if module==required else 403,(module,path))

    def test_admin_protections_reauth_csrf_and_password_bounds(self):
        for data in ({'active':False}, {'role':'user'}, {'modules':[]}):
            r=self.request('/api/users/fmenini',dict(data,current=self.secret),auth=self.admin)
            self.assertEqual(r[0],422,r[2])
        self.assertEqual(self.account()[0],200)
        for headers in ({'Origin':'https://evil.invalid'}, {'X-CSRF-Token':'bad'}):
            self.assertEqual(self.request('/api/users/alice', {'active':False,'current':self.secret},auth=self.admin,headers=headers)[0],403)
        self.assertEqual(self.request('/api/users/alice', {'active':False,'current':'wrong'},auth=self.admin)[0],403)
        for password in ('short', 'x'*1025):
            self.assertEqual(self.request('/api/users/alice', {'password':password,'current':self.secret},auth=self.admin)[0],422)
        for _ in range(8): self.request('/api/users/alice', {'active':False,'current':'wrong'},auth=self.admin)
        self.assertEqual(self.request('/api/users/alice', {'active':False,'current':self.secret},auth=self.admin)[0],429)

    def test_media_scope_revocation_owner_and_private_history(self):
        self.assertEqual(self.account(modules=['relevamiento','plano'])[0],200)
        _,auth=self.signin();auth=self.change(auth)
        image=self.request('/api/media',{'image':self.image(),'module':'relevamiento'},auth=auth)
        self.assertEqual(image[0],200,image[2]);url=json.loads(image[2])['url']
        for method in ('GET','HEAD'):
            r=self.request(url,auth=auth,method=method);self.assertEqual(r[0],200);self.assertEqual(r[1]['Cache-Control'],'no-store')
        self.assertEqual(self.request('/api/media',{'image':self.image(),'module':'catalogo'},auth=auth)[0],403)
        self.assertEqual(self.request('/api/users/alice',{'modules':['plano'],'current':self.secret},auth=self.admin)[0],200)
        self.assertEqual(self.request(url,auth=auth)[0],401)
        _,auth=self.signin(password=self.newpass)
        for method in ('GET','HEAD'): self.assertEqual(self.request(url,auth=auth,method=method)[0],403)
        plan={'name':'Alice retained','cameras':[],'shapes':[]}
        self.assertEqual(self.request('/api/plans/alice-plan',{'revision':0,'plan':plan},auth=auth)[0],200)
        self.assertEqual(self.request('/api/plans/alice-plan?owner=fmenini',auth=auth)[0],403)
        self.assertEqual(self.request('/api/users/alice',{'active':False,'current':self.secret},auth=self.admin)[0],200)
        with self.server.store.connect() as db:
            self.assertEqual(db.execute("SELECT count(*) FROM plans WHERE owner='alice'").fetchone()[0],1)
        self.assertEqual(self.request('/api/users/alice',{'active':True,'modules':['cotizador','presupuestos','relevamiento'],'current':self.secret},auth=self.admin)[0],200)
        _,auth=self.signin(password=self.newpass)
        d=json.loads(self.request('/api/workspace',auth=auth)[2]);q={'id':'private','clientName':'ALICE-ONLY','survey':{'notes':'SURVEY-PRIVATE'}}
        self.assertEqual(self.request('/api/workspace',{'revision':d['revision'],'workspace':{'saved':[q],'draft':q}},auth=auth)[0],200)
        self.assertEqual(self.account(name='bobby',modules=['cotizador','presupuestos'])[0],200)
        _,other=self.signin('bobby');self.assertEqual(self.request('/api/password',{'current':self.temp,'password':self.newpass},auth=other)[0],200)
        _,other=self.signin('bobby',self.newpass)
        self.assertNotIn(b'ALICE-ONLY',self.request('/api/workspace',auth=other)[2])
        self.assertEqual(self.request('/api/users/alice',{'modules':['cotizador','presupuestos'],'current':self.secret},auth=self.admin)[0],200)
        _,auth=self.signin(password=self.newpass)
        d=json.loads(self.request('/api/workspace',auth=auth)[2]);self.assertNotIn('survey',d['workspace']['draft']);self.assertNotIn('survey',d['workspace']['saved'][0])
        self.assertEqual(self.request('/api/workspace',{'revision':d['revision'],'workspace':{'draft':{'clientName':'changed'},'saved':[{'id':'private','clientName':'changed'}]}},auth=auth)[0],200)
        with self.server.store.connect() as db:
            saved=json.loads(db.execute("SELECT payload FROM user_workspaces WHERE owner='alice'").fetchone()[0]);self.assertEqual(saved['draft']['survey']['notes'],'SURVEY-PRIVATE');self.assertEqual(saved['saved'][0]['survey']['notes'],'SURVEY-PRIVATE')

    def test_permissions_are_additive_for_help_and_plan(self):
        self.assertEqual(self.account(modules=['ayuda'])[0],200)
        _,auth=self.signin();self.change(auth)
        for granted in (['ayuda'],['plano','ayuda']):
            self.assertEqual(self.request('/api/users/alice',{'modules':granted,'current':self.secret},auth=self.admin)[0],200)
            _,auth=self.signin(password=self.newpass)
            for method in ('GET','HEAD'):
                self.assertEqual(self.request('/',auth=auth,method=method)[0],200)
                self.assertEqual(self.request('/session.js',auth=auth,method=method)[0],200)
            body=self.request('/session.js',auth=auth)[2].decode()
            boot=json.loads(body.removeprefix('window.__SAFE_BOOT=').removesuffix(';'))
            self.assertEqual(boot['workspace'],{})
            self.assertEqual(self.request('/api/workspace',auth=auth)[0],403)
            self.assertEqual(self.request('/cctv',auth=auth)[0],200 if 'plano' in granted else 403)

    def test_write_allowlist_for_every_module(self):
        from safe_access import WORKSPACE_MODULES, DRAFT_MODULES, SHARED_FIELDS
        self.assertEqual(self.account()[0],200)
        _,auth=self.signin();self.change(auth)
        for module in safe.MODULES:
            self.assertEqual(self.request('/api/users/alice',{'modules':[module],'current':self.secret},auth=self.admin)[0],200)
            _,auth=self.signin(password=self.newpass)
            for field,value in [('settings',{}),('catalog',[]),('packages',[]),('suppliers',[]),('saved',[]),('draft',{'id':'matrix'})]:
                revision=self.server.store.workspace()['revision']
                expected=module in WORKSPACE_MODULES and (SHARED_FIELDS.get(field)==module or field=='saved' and module=='presupuestos' or field=='draft' and module in DRAFT_MODULES)
                r=self.request('/api/workspace',{'revision':revision,'workspace':{field:value}},auth=auth)
                self.assertEqual(r[0],200 if expected else 403,(module,field,r[2]))
            revision=self.server.store.workspace()['revision']
            r=self.request('/api/workspace',{'revision':revision,'workspace':{'draft':{'survey':{'notes':'forbidden'}}}},auth=auth)
            self.assertEqual(r[0],200 if module=='relevamiento' else 403,(module,r[2]))

    def test_legacy_cctv_media_revocation_survives_restart(self):
        self.assertEqual(self.request('/api/users/smenini',{'modules':['plano','relevamiento'],'current':self.secret},auth=self.admin)[0],200)
        _,auth=self.signin('smenini',self.secret)
        r=self.request('/api/media',{'image':self.image(),'module':'relevamiento'},auth=auth)
        self.assertEqual(r[0],200,r[2]);url=json.loads(r[2])['url']
        self.assertEqual(self.request(url,auth=auth)[0],200)
        self.assertEqual(self.request('/api/users/smenini',{'modules':['plano'],'current':self.secret},auth=self.admin)[0],200)
        _,auth=self.signin('smenini',self.secret)
        self.assertEqual(self.request(url,auth=auth)[0],403)
        # Re-open the persisted DB twice, exactly as a service restart does.
        for _ in range(2):
            self.server.store=safe.Store(self.tmp.name)
            for method in ('GET','HEAD'):
                self.assertEqual(self.request(url,auth=auth,method=method)[0],403)
            with self.server.store.connect() as db:
                self.assertFalse(db.execute("SELECT 1 FROM media_modules WHERE owner='smenini' AND module='plano' AND hash=?",(url[7:],)).fetchone())

    def test_previous_database_migration_and_restore(self):
        import sqlite3
        import tempfile
        from pathlib import Path
        with tempfile.TemporaryDirectory() as root:
            root=Path(root);old=root/'old';old.mkdir()
            db=sqlite3.connect(old/'safe.sqlite3');db.executescript(safe.SCHEMA)
            salt=secrets.token_hex(16)
            db.execute('INSERT INTO users VALUES(?,?,?,?)',('fmenini','admin',salt,safe.password_hash(self.secret,salt)))
            db.execute('INSERT INTO users VALUES(?,?,?,?)',('smenini','cctv',salt,safe.password_hash(self.secret,salt)))
            db.execute('INSERT INTO workspace VALUES(1,7,?)',(json.dumps({'settings':{},'catalog':[],'saved':[{'id':'keep'}],'packages':[],'suppliers':[],'draft':None}),))
            db.execute('INSERT INTO plans VALUES(?,?,?,?)',('smenini','keep',1,json.dumps({'name':'Keep'})))
            db.execute('INSERT INTO sessions VALUES(?,?,?,?)',('old','fmenini','old',99999999999));db.commit();db.close()
            store=safe.Store(old)
            with store.connect() as db:
                admin=db.execute("SELECT * FROM users WHERE name='fmenini'").fetchone();tech=db.execute("SELECT * FROM users WHERE name='smenini'").fetchone()
                self.assertTrue(admin['must_change']);self.assertTrue(tech['must_change']);self.assertEqual(json.loads(tech['modules']),['plano']);self.assertEqual(db.execute('SELECT count(*) FROM sessions').fetchone()[0],0)
                self.assertEqual(db.execute('SELECT count(*) FROM plans').fetchone()[0],1)
            self.assertEqual(store.workspace()['revision'],7)
            store.backup(root/'full.zip');safe.restore_backup(root/'full.zip',root/'restored');restored=safe.Store(root/'restored')
            self.assertEqual(restored.workspace()['workspace']['saved'][0]['id'],'keep')

    def test_bootstrap_force_and_credentials_no_truncation(self):
        # Existing fixtures explicitly enroll accounts; emulate a bootstrap-only account here.
        with self.server.store.connect() as db: db.execute("UPDATE users SET must_change=1 WHERE name='smenini'")
        r,auth=self.signin('smenini',self.secret);self.assertTrue(json.loads(r[2])['mustChangePassword'])
        self.assertEqual(self.request('/cctv',auth=auth)[0],403)
        self.assertEqual(self.request('/api/login',{'username':'fmenini','password':self.secret+'x'*1025})[0],401)
        self.assertEqual(self.request('/api/password',{'current':self.secret,'password':'x'*14},auth=auth)[0],422)
        self.assertEqual(self.request('/api/password',{'current':self.secret,'password':'é'*600},auth=auth)[0],422)
        self.assertEqual(self.request('/api/password',{'current':self.secret,'password':self.newpass},auth=auth,headers={'Origin':'https://evil.invalid'})[0],403)
        self.assertEqual(self.request('/api/password',{'current':self.secret,'password':self.newpass},auth=auth)[0],200)
        self.assertEqual(self.request('/api/me',auth=auth)[0],401)
        self.assertEqual(self.account(modules=['ayuda'])[0],200)
        self.assertEqual(self.request('/api/users/alice',{'modules':[],'current':self.secret},auth=self.admin)[0],200)
        self.assertEqual(self.signin()[0][0],401)

# Inherited tests are executed separately by test_server.py.
for _name in list(ServerTests.__dict__):
    if _name.startswith('test_') and _name not in UserModuleTests.__dict__:
        setattr(UserModuleTests,_name,None)
if __name__=='__main__': unittest.main()
