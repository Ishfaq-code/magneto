import importlib.util
import json
from pathlib import Path
import sys
import threading
import unittest
from urllib.request import Request, urlopen
from urllib.error import HTTPError
from unittest.mock import patch
from http.server import ThreadingHTTPServer
from functools import partial

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
import decision_bridge as bridge
import serve


class BridgeTests(unittest.TestCase):
    def test_adapter_failure_does_not_leak_stderr(self):
        from types import SimpleNamespace
        with patch.object(bridge.subprocess,'run',return_value=SimpleNamespace(returncode=1,stderr='secret detail',stdout='')):
            with self.assertRaises(bridge.BridgeError) as e: bridge.invoke_snapshot({})
        self.assertNotIn('secret',str(e.exception))

    def test_adapter_deadline(self):
        with patch.object(bridge.subprocess,'run',side_effect=bridge.subprocess.TimeoutExpired('adapter',14)):
            with self.assertRaises(bridge.BridgeError) as e: bridge.invoke_snapshot({})
        self.assertEqual(e.exception.status,504)

    def test_reject_imported_book_payload(self):
        with self.assertRaises(bridge.ContractError): bridge.request_decision({'book_text':'private book'})

    def test_http_boundaries_and_service_error(self):
        server=ThreadingHTTPServer(('127.0.0.1',0),partial(serve.Handler,directory=str(serve.WEB)))
        thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
        url=f'http://127.0.0.1:{server.server_port}/api/decision'
        def post(data,headers):
            try:
                with urlopen(Request(url,data=data,headers=headers),timeout=2) as response: return response.status,json.load(response)
            except HTTPError as e:
                with e: return e.code,json.load(e)
        try:
            self.assertEqual(post(b'{}',{'Content-Type':'text/plain'})[0],415)
            self.assertEqual(post(b'{}',{'Content-Type':'application/json','Origin':'https://other.example'})[0],403)
            self.assertEqual(post(b'broken',{'Content-Type':'application/json'})[0],400)
            self.assertEqual(post(b'{}',{'Content-Type':'application/json'})[0],400)
            with patch.object(serve,'request_decision',side_effect=bridge.BridgeError('Timed out',504)):
                status,payload=post(b'{}',{'Content-Type':'application/json'})
                self.assertEqual(status,504);self.assertEqual(payload,{'error':'Timed out'})
        finally:
            server.shutdown();server.server_close();thread.join()


if __name__=='__main__': unittest.main()
