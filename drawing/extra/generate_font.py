import os, re, subprocess, math, time
from PIL import Image, ImageFont, ImageDraw

text     = " !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~"
fontpath = "../../../files/consola.ttf"
point    = 20
width    = 0
backimg  = Image.new(mode="RGB",size=(1000,1000))
backdraw = ImageDraw.Draw(backimg)

while True:
	font = ImageFont.truetype(fontpath,point+1)
	# rect = backdraw.textbbox((0,0),"A\n"*127+"A"*128,font=font)
	# charw,charh = rect[2]*1.0/128.0,rect[3]*1.2/128.0
	# rect = backdraw.textbbox((0,0),(text+"\n")*127+text,font=font)
	rect = backdraw.textbbox((0,0),text,font=font)
	# charw,charh = rect[2]/len(text),rect[3]/128.0
	print("{0}: {1:.3f}, {2:.3f}".format(point+1,rect[2],rect[3]))
	if rect[3] > backimg.height: break
	width = math.floor(rect[2]/len(text)+0.5)
	point += 1

print("point: ",point)
print("width: ",width)
font = ImageFont.truetype(fontpath,point)

backimg  = Image.new(mode="RGB",size=(width,1000))
backdraw = ImageDraw.Draw(backimg)
savedir = "font/"
for char in text:
	backdraw.rectangle((0,0,backimg.width,backimg.height),fill=(0,0,0,255))
	rect = backdraw.textbbox((0,0),char,font=font)
	backdraw.text((0,0),char,font=font)
	num = ord(char)
	path = savedir + "{0:03d}.png".format(num)
	backimg.save(path)
	print(char,rect)
