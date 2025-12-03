# pip install RangeHTTPServer
from RangeHTTPServer import RangeRequestHandler
from http import HTTPStatus
import socketserver
import logging
import sys
import urllib.parse
import os
import time 


PORT = 8004
DIRECTORY = '.'
SPA = False

class HTTPRequestHandler(RangeRequestHandler):
  allow_reuse_address = True
  
  def __init__(self, *args, **kwargs):
    super().__init__(*args, directory=DIRECTORY, **kwargs)
  
  def server_bind(self):
    self.socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    super().server_bind()
  
  def do_GET(self):
    if not SPA:
      return super().do_GET()
    
    path = urllib.parse.unquote(self.path)
    print(f'GET {path}')
    file_path = self.translate_path(path)
    if self.is_static_file(path):
      if os.path.exists(file_path) and os.path.isfile(file_path):
        return super().do_GET()
      else:
        self.send_error(404, "404 Not Found")
        return
    
    # SPA 路由
    self.path = SPA
    return super().do_GET()
    
  def is_static_file(self, path):
    """判断是否是静态文件"""
    # 静态文件扩展名列表
    static_extensions = [
      '.js', '.css', '.png', '.jpg', '.jpeg', '.gif', 
      '.svg', '.ico', '.woff', '.woff2', '.ttf', '.eot',
      '.json', '.xml', '.txt', '.map'
    ]
    
    # 获取文件扩展名
    _, ext = os.path.splitext(path.lower())
    return ext in static_extensions
    
  def end_headers(self):
    # self.send_header('Cache-Control', 'no-store')
    # 或者使用 'no-cache' 来允许缓存但每次都需验证
    self.send_header('Cache-Control', 'no-cache')
    super().end_headers()
  
  def log_message(self, format, *args):
    message = format % args
    sys.stderr.write(f"[{self.log_date_time_string()}] {message.translate(self._control_char_table)}\n")

  def log_request(self, code='-', size='-'):
    if isinstance(code, HTTPStatus):
      code = code.value
    path = urllib.parse.unquote(self.path)
    self.log_message(
      '"%s %s" %s %s',
      self.command,
      path, 
      str(code), 
      str(size),
    )


socketserver.TCPServer.allow_reuse_address = True  

with socketserver.TCPServer(("", PORT), HTTPRequestHandler) as httpd:
  print(f"Serving at port {PORT}")
  try:
    httpd.serve_forever()
  except KeyboardInterrupt:
    print('\rKeyboardInterrupt')
  except Exception:
    logging.exception('错误:')
  finally:
    httpd.shutdown()
    httpd.server_close()
    time.sleep(0.5)
