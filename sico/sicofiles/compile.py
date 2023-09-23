#!/usr/bin/python3
"""
Compile C source files and concatenate libraries.
Store output in "compiled" directory.
"""


import os,re,sys,shutil


# Directory helpers
pydir =os.path.dirname(os.path.abspath(__file__))
webdir=os.path.realpath(os.path.join(pydir,"../.."))
outdir=os.path.realpath(os.path.join(pydir,"../libraries"))
cmpdir=os.path.realpath(os.path.join(pydir,"./compiled"))
libdir=os.path.realpath(os.path.join(pydir,"./library"))
mscdir=os.path.realpath(os.path.join(pydir,"./misc"))

def webjoin(path): return os.path.join(webdir,path)
def outjoin(path): return os.path.join(outdir,path)
def cmpjoin(path): return os.path.join(cmpdir,path)
def libjoin(path): return os.path.join(libdir,path)
def mscjoin(path): return os.path.join(mscdir,path)

def loadfile(path):
	with open(path,"r") as f:
		return "".join(f.readlines())
	raise "failed to load file"

def concat(input,output):
	text=""
	for file in input: text+=loadfile(file)
	with open(output,"w") as f: f.write(text)


# Compile the master library. Add line numbers to the index.
if not os.path.isdir(cmpdir): os.mkdir(cmpdir)
master=loadfile(libjoin("master_header.sico"))
files=("uint.sico","int.sico","random.sico","string.sico","memory.sico")
for file in files:
	path=libjoin(file)
	data=loadfile(path)
	idx="{0:s}  |  {1:>4d}".format(file,master.count("\n")+1)
	master=re.sub(re.escape("$"+file+"  |"),idx,master,1)
	master+=data
with open(cmpjoin("master.sico"),"w") as f:
	f.write(master)


# Compile demos
concat([libjoin("hello_demo.sico")]                        ,cmpjoin("hello_demo.sico"))
concat([libjoin("memory_demo.sico"),cmpjoin("master.sico")],cmpjoin("memory_demo.sico"))
concat([libjoin("random_demo.sico"),cmpjoin("master.sico")],cmpjoin("random_demo.sico"))
concat([libjoin("string_demo.sico"),cmpjoin("master.sico")],cmpjoin("string_demo.sico"))
concat([libjoin("uint_demo.sico")  ,cmpjoin("master.sico")],cmpjoin("uint_demo.sico"))


# Compile tests
concat([libjoin("int_test.sico")   ,cmpjoin("master.sico")],cmpjoin("int_test.sico"))
concat([libjoin("memory_test.sico"),cmpjoin("master.sico")],cmpjoin("memory_test.sico"))
concat([libjoin("random_test.sico"),cmpjoin("master.sico")],cmpjoin("random_test.sico"))
concat([libjoin("uint_test.sico")  ,cmpjoin("master.sico")],cmpjoin("uint_test.sico"))


# Copy compiled files to the site library
shutil.copyfile(cmpjoin("hello_demo.sico") ,outjoin("hello_demo.sico"))
shutil.copyfile(libjoin("int.sico")        ,outjoin("int.sico"))
shutil.copyfile(cmpjoin("master.sico")     ,outjoin("master.sico"))
shutil.copyfile(libjoin("memory.sico")     ,outjoin("memory.sico"))
shutil.copyfile(cmpjoin("memory_demo.sico"),outjoin("memory_demo.sico"))
shutil.copyfile(cmpjoin("string_demo.sico"),outjoin("string_demo.sico"))
shutil.copyfile(libjoin("random.sico")     ,outjoin("random.sico"))
shutil.copyfile(cmpjoin("random_demo.sico"),outjoin("random_demo.sico"))
shutil.copyfile(libjoin("string.sico")     ,outjoin("string.sico"))
shutil.copyfile(cmpjoin("string_demo.sico"),outjoin("string_demo.sico"))
shutil.copyfile(libjoin("uint.sico")       ,outjoin("uint.sico"))
shutil.copyfile(cmpjoin("uint_demo.sico")  ,outjoin("uint_demo.sico"))


# Compile sico.c, sico_graphics.c, and sicotest.c
if os.path.isfile(cmpjoin("sico")): os.remove(cmpjoin("sico"))
os.system("gcc -Wall -Wextra -O3 "+os.path.join(pydir,"../sico.c")+" -o "+cmpjoin("sico"))
if os.path.isfile(cmpjoin("sico_graphics")): os.remove(cmpjoin("sico_graphics"))
os.system("gcc -Wall -Wextra -O3 "+mscjoin("sico_graphics.c")+" -o "+cmpjoin("sico_graphics")+" -lSDL2")
if os.path.isfile(cmpjoin("sico_test")): os.remove(cmpjoin("sico_test"))
os.system("gcc -I\""+os.path.join(pydir,"../")+"\" -fsanitize=address -fsanitize=undefined "+mscjoin("sico_test.c")+" -o "+cmpjoin("sico_test"))


# Compile offline HTML interpreter.
htmlcss =loadfile(webjoin("style/style.css"))
htmljs  =loadfile(webjoin("style/style.js"))
htmlint =loadfile(webjoin("sico/sico.js"))
htmledit=loadfile(webjoin("sico/editor.js"))
htmldef =loadfile(cmpjoin("uint_demo.sico"))
htmldef =htmldef.replace("&","&amp;")
htmldef =htmldef.replace("<","&lt;")
htmldef =htmldef.replace(">","&gt;")
htmlsrc ="""
<!DOCTYPE HTML>
<html lang="en">
<head>
	<meta charset="utf-8">
	<title>SICO - The Single Instruction Computer</title>
	<style>\n"""+htmlcss+"""\n</style>
	<script>\n"""+htmljs+"\n"+htmlint+"\n"+htmledit+"""\n</script>
</head>
<body>
<div class="content"><h1>SICO Offline Editor</h1>
	<div style="text-align:center;">
		<button id="sico_run">&#9654;&nbsp;&nbsp;&nbsp;Run</button>
		<button id="sico_reset">&#8634;&nbsp;&nbsp;&nbsp;Reset</button>
		<button id="sico_save">&#8595;&nbsp;&nbsp;&nbsp;Save</button>
		<button id="sico_load">&#8593;&nbsp;&nbsp;&nbsp;Load</button>
		<button id="sico_advanced">&#9776;&nbsp;&nbsp;&nbsp;Advanced</button>
	</div>
	<div id="sico_menu" class="codeblock" style="box-sizing:border-box;width:100%;display:none;font-family:sans-serif;white-space:normal;">
		<p>Advanced Settings</p><br>
		<input type="checkbox" id="sico_keyboard" checked>
		<label for="sico_keyboard"> Grab Keyboard:<br>
			<br>
			<span style="padding-left:2rem;">&bull;</span> Enables tab key<br>
			<span style="padding-left:2rem;">&bull;</span> F9: run<br>
			<span style="padding-left:2rem;">&bull;</span> F10: reset<br>
			<span style="padding-left:2rem;">&bull;</span> F11: release keyboard
		</label>
	</div>
	<canvas id="sico_canvas" style="display:none;background:#000000;width:100%;margin-top:1rem"></canvas>
	<textarea id="sico_output" style="box-sizing:border-box;width:100%;height:14rem;" class="consoleblock" spellcheck="false" readonly>Please enable javascript to run</textarea>
	<textarea id="sico_editor" style="box-sizing:border-box;width:100%;height:40rem;" class="codeblock" spellcheck="false">"""+htmldef+"""</textarea>
</div>
</body>
</html>
"""
with open(cmpjoin("sico_offline.html"),"w") as f: f.write(htmlsrc)
