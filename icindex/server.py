#!/usr/bin/python3

import http.server,ssl,sys,os


class SiteHandler(http.server.SimpleHTTPRequestHandler):
	def end_headers(self):
		self.send_header("Access-Control-Allow-Origin","*")
		self.send_header("Cross-Origin-Opener-Policy","same-origin")
		self.send_header("Cross-Origin-Embedder-Policy","require-corp")
		http.server.SimpleHTTPRequestHandler.end_headers(self)


if __name__=="__main__":
	addr="localhost"
	port=int(sys.argv[1]) if len(sys.argv)>1 else 8000
	print("http://{0}:{1}".format(addr,port))
	cwd=os.getcwd()
	os.chdir("./")
	httpd=http.server.HTTPServer((addr,port),SiteHandler)
	# for HTTPS, need certificate
	# ctx=ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
	# httpd.socket=ctx.wrap_socket(httpd.socket,server_side=True)
	httpd.serve_forever()
	os.chdir(cwd)
