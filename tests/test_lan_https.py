"""Deployment contract checks; runtime TLS probe is documented separately."""
import pathlib, unittest
ROOT = pathlib.Path(__file__).resolve().parents[1]
class LanHttpsTests(unittest.TestCase):
    def test_proxy_is_private_nonroot_and_persistent(self):
        compose = (ROOT / 'compose.lan-https.yml').read_text()
        for expected in ('ports: !override', '127.0.0.1:8787:8787', 'SAFE_SECURE_COOKIE: "1"', '${SAFE_LAN_IP:?Set SAFE_LAN_IP}:443:8443', 'user: "10001:10001"', 'read_only: true', 'cap_drop: [ALL]', 'safe_tls_data:/data', 'safe_tls_config:/config'):
            self.assertIn(expected, compose)
        self.assertNotIn('privileged:', compose)
    def test_proxy_has_no_admin_or_plain_http_listener(self):
        config = (ROOT / 'Caddyfile.lan').read_text()
        for expected in ('admin off', 'skip_install_trust', 'auto_https disable_redirects', 'https_port 8443', 'default_sni {$SAFE_LAN_IP}', 'https://{$SAFE_LAN_IP}', 'tls internal', 'reverse_proxy safe:8787'):
            self.assertIn(expected, config)
        self.assertNotIn('header_up', config)  # preserve original Host and Origin
    def test_image_initializes_writable_named_volume_ownership(self):
        dockerfile = (ROOT / 'Dockerfile.proxy').read_text()
        for expected in ('FROM caddy:2.11.7-alpine', 'chown -R 10001:10001 /data /config', 'USER 10001:10001', 'setcap -r /usr/bin/caddy'):
            self.assertIn(expected, dockerfile)
if __name__ == '__main__': unittest.main()
