"""Serve the viewer locally, independent of the current working directory."""
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import argparse
parser = argparse.ArgumentParser()
parser.add_argument('--port', type=int, default=8080)
args = parser.parse_args()
web = Path(__file__).resolve().parents[1] / 'web'
print(f'Magneto: http://127.0.0.1:{args.port}/', flush=True)
try:
    ThreadingHTTPServer(('127.0.0.1', args.port), partial(SimpleHTTPRequestHandler, directory=str(web))).serve_forever()
except KeyboardInterrupt:
    pass
