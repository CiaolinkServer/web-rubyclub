#!/usr/bin/env python3
"""Static file server + proxy /api/* -> https://rubyclubph.com/api/* (tránh CORS khi dev local)."""

import http.server
import ssl
import sys
import urllib.error
import urllib.request

API_ORIGIN = 'https://rubyclubph.com'
PORT = 3000
HOP_BY_HOP = {
    'connection',
    'keep-alive',
    'proxy-authenticate',
    'proxy-authorization',
    'te',
    'trailers',
    'transfer-encoding',
    'upgrade',
    'host',
    'content-length',
}


class DevHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def do_OPTIONS(self):
        if self.path.startswith('/api/'):
            self.send_response(204)
            self._send_cors_headers()
            self.end_headers()
            return
        super().do_OPTIONS()

    def do_GET(self):
        if self.path.startswith('/api/'):
            self._proxy_api('GET')
            return
        super().do_GET()

    def do_POST(self):
        if self.path.startswith('/api/'):
            self._proxy_api('POST')
            return
        super().do_POST()

    def do_PUT(self):
        if self.path.startswith('/api/'):
            self._proxy_api('PUT')
            return
        super().do_PUT()

    def do_PATCH(self):
        if self.path.startswith('/api/'):
            self._proxy_api('PATCH')
            return
        super().do_PATCH()

    def do_DELETE(self):
        if self.path.startswith('/api/'):
            self._proxy_api('DELETE')
            return
        super().do_DELETE()

    def _send_cors_headers(self):
        origin = self.headers.get('Origin', '*')
        self.send_header('Access-Control-Allow-Origin', origin)
        self.send_header('Vary', 'Origin')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
        self.send_header(
            'Access-Control-Allow-Headers',
            'Authorization, Content-Type, Accept',
        )
        self.send_header('Access-Control-Max-Age', '86400')

    def _proxy_api(self, method):
        target = API_ORIGIN + self.path
        body = None

        if method in ('POST', 'PUT', 'PATCH'):
            length = int(self.headers.get('Content-Length', 0))
            if length > 0:
                body = self.rfile.read(length)

        headers = {}
        for key, value in self.headers.items():
            lower = key.lower()
            if lower in HOP_BY_HOP:
                continue
            headers[key] = value

        request = urllib.request.Request(target, data=body, headers=headers, method=method)

        try:
            context = ssl.create_default_context()
            with urllib.request.urlopen(request, context=context, timeout=60) as upstream:
                payload = upstream.read()
                self.send_response(upstream.status)
                self._send_cors_headers()
                for key, value in upstream.headers.items():
                    lower = key.lower()
                    if lower in HOP_BY_HOP or lower == 'content-encoding':
                        continue
                    self.send_header(key, value)
                self.end_headers()
                if payload:
                    self.wfile.write(payload)
        except urllib.error.HTTPError as err:
            payload = err.read()
            self.send_response(err.code)
            self._send_cors_headers()
            for key, value in err.headers.items():
                lower = key.lower()
                if lower in HOP_BY_HOP or lower == 'content-encoding':
                    continue
                self.send_header(key, value)
            self.end_headers()
            if payload:
                self.wfile.write(payload)
        except Exception as err:
            message = str(err).encode('utf-8')
            self.send_response(502)
            self._send_cors_headers()
            self.send_header('Content-Type', 'text/plain; charset=utf-8')
            self.send_header('Content-Length', str(len(message)))
            self.end_headers()
            self.wfile.write(message)


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else PORT
    server = http.server.ThreadingHTTPServer(('', port), DevHandler)
    print('Dev server: http://localhost:%s' % port)
    print('API proxy:  /api/* -> %s/api/*' % API_ORIGIN)
    server.serve_forever()


if __name__ == '__main__':
    main()
