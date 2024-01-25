/*------------------------------------------------------------------------------


polyfill.js - v1.02

Copyright 2024 Alec Dee - MIT license - SPDX: MIT
deegen1.github.io - akdee144@gmail.com


--------------------------------------------------------------------------------
TODO


Create font/image fitting.
	per character
	width
	height
	strips
	strip 1
	strip 2
	...
Create primitives.
	lines
	rectangles
	circles
	high line count
	text
Create stress tests.
Optimize sorting lines. Heap/merge sort?
Optimize clipping line to unit square.
Instead of calculating per-pixel overlap, calculate [minx,maxx,delta].
	While x in [minx,maxx), area+=delta
	If multiple spans overlap, add delta to shortest split.


for (var half=1;half<len;half+=half) {
	i=0;i0=0;i1=half;j0=half;j1=half+half;
	j1=j1<len?j1:len;
	while (i0<i1 && j0<j1) {
		if (arr[i0]<=arr[j0]) {dst[i++]=arr[i0++];}
		else {dst[i++]=arr[j0++];}
	}
	while (i0<i1) {dst[i++]=arr[i0++];}
	while (j0<j1) {dst[i++]=arr[j0++];}
	tmp=arr;arr=dst;dst=tmp;
}


*/
/* jshint esversion: 6   */
/* jshint bitwise: false */
/* jshint eqeqeq: true   */
/* jshint curly: true    */


//---------------------------------------------------------------------------------
// Anti-aliased Image Drawing - v1.00


class IMG {


	// ----------------------------------------
	// Image Information


	static canvas   =undefined;
	static imgwidth =undefined;
	static imgheight=undefined;
	static imgdata  =undefined;
	static rgba     =[255,255,255,255];
	static rgb32    =0xffffffff;


	static setimage(canvas,buf32) {
		if (!(buf32 instanceof Uint32Array)) {
			throw "buf32 not Uint32Array";
		}
		IMG.canvas=canvas;
		IMG.imgwidth=canvas.width;
		IMG.imgheight=canvas.height;
		IMG.imgdata=buf32;
	}


	static setcolor(r,g,b) {
		r=Math.floor(r);r=r>0?r:0;r=r<255?r:255;
		g=Math.floor(g);g=g>0?g:0;g=g<255?g:255;
		b=Math.floor(b);b=b>0?b:0;b=b<255?b:255;
		IMG.rgba[0]=r;
		IMG.rgba[1]=g;
		IMG.rgba[2]=b;
		IMG.rgba32=IMG.rgbatoint(r,g,b,IMG.rgba[3]);
	}


	// ----------------------------------------
	// Transform
	// point -> scale -> rotate -> offset


	static linethickness=1.0;
	static scalex   =1.0;
	static scaley   =1.0;
	static offx     =0.0;
	static offy     =0.0;
	static ang      =0.0;
	static rotx     =1.0;
	static roty     =0.0;
	static mulxx    =1.0;
	static mulxy    =0.0;
	static mulyx    =0.0;
	static mulyy    =1.0;


	static setscale(x,y) {
		IMG.scalex=x;
		IMG.scaley=y;
		IMG.mulxx= IMG.rotx*x;
		IMG.mulxy=-IMG.roty*y;
		IMG.mulyx= IMG.roty*x;
		IMG.mulyy= IMG.rotx*y;
	}


	static setangle(ang) {
		IMG.ang=ang;
		IMG.rotx=Math.cos(ang);
		IMG.roty=Math.sin(ang);
		IMG.setscale(IMG.scalex,IMG.scaley);
	}


	static setoffset(x,y) {
		IMG.offx=x;
		IMG.offy=y;
	}


	static cleartransform() {
		IMG.linethickness=1.0;
		IMG.scalex=1.0;
		IMG.scaley=1.0;
		IMG.offx  =0.0;
		IMG.offy  =0.0;
		IMG.ang   =0.0;
		IMG.rotx  =1.0;
		IMG.roty  =0.0;
		IMG.mulxx =1.0;
		IMG.mulxy =0.0;
		IMG.mulyx =0.0;
		IMG.mulyy =1.0;
	}


	static transform(x,y) {
		var t=x;
		x=t*IMG.mulxx+y*IMG.mulxy+IMG.offx;
		y=t*IMG.mulyx+y*IMG.mulyy+IMG.offy;
		return [x,y];
	}


	// ----------------------------------------
	// Basic Drawing


	static rgbatoint(r,g,b,a) {
		// Convert an RGBA array to a int regardless of endianness.
		var rgba8=IMG.rgba8;
		if (rgba8===undefined) {
			IMG.rgba8=rgba8=new Uint8ClampedArray([0,1,2,3]);
			IMG.rgba32=new Uint32Array(rgba8.buffer);
		}
		rgba8[0]=r;
		rgba8[1]=g;
		rgba8[2]=b;
		rgba8[3]=a;
		return IMG.rgba32[0];
	}


	static fill(r,g,b) {
		// fill() was ~25% slower during testing.
		// imgdata.fill(rgba);
		var rgba=IMG.rgbatoint(r,g,b,255);
		var imgdata=IMG.imgdata;
		var i=IMG.imgwidth*IMG.imgheight;
		while (i>7) {
			imgdata[--i]=rgba;
			imgdata[--i]=rgba;
			imgdata[--i]=rgba;
			imgdata[--i]=rgba;
			imgdata[--i]=rgba;
			imgdata[--i]=rgba;
			imgdata[--i]=rgba;
			imgdata[--i]=rgba;
		}
		while (i>0) {
			imgdata[--i]=rgba;
		}
	}


	// ----------------------------------------
	// Primitives


	static line(x0,y0,x1,y1) {
		var thick=IMG.linethickness*0.5;
	}


	static circle(x,y,rad) {
	}


	static oval(x,y,xrad,yrad) {
	}


	static rect(x,y,w,h) {
	}


	// ----------------------------------------
	// Polygon Filling


	static polyfill(lines) {
		// Preprocess the lines. Reject anything with a NaN, too narrow (y1-y0), or
		// above or below the image.
		var func=IMG.polyfill;
		var cache=func.cache||0;
		if (cache<lines.length) {
			cache=cache*2>lines.length?cache*2:lines.length;
			func.cache=cache;
			func.lr=new Array(cache);
		}
		var lr=func.lr;
		var imgdata=IMG.imgdata,imgwidth=IMG.imgwidth,imgheight=IMG.imgheight;
		var mulxx=IMG.mulxx,mulxy=IMG.mulxy,offx=IMG.offx;
		var mulyx=IMG.mulyx,mulyy=IMG.mulyy,offy=IMG.offy;
		var swap=(IMG.scalex<0)!==(IMG.scaley<0);
		var minx=imgwidth,maxx=0,miny=imgheight,maxy=0,ycnt=0;
		var x0,y0,x1,y1;
		var l,i,j,tmp;
		for (i=lines.length-1;i>=0;i--) {
			// Get the line points and transform() them.
			// If we mirror the image, we need to flip the line direction.
			if (swap) {[x1,y1,x0,y0]=lines[i];}
			else      {[x0,y0,x1,y1]=lines[i];}
			tmp=x0;
			x0=tmp*mulxx+y0*mulxy+offx;
			y0=tmp*mulyx+y0*mulyy+offy;
			tmp=x1;
			x1=tmp*mulxx+y1*mulxy+offx;
			y1=tmp*mulyx+y1*mulyy+offy;
			// Add the line if it's in the screen or to the left.
			var dx=x1-x0;
			var dy=y1-y0;
			l=lr[ycnt];
			if (l===undefined) {lr[ycnt]=l={};}
			l.miny=Math.max(Math.floor(Math.min(y0,y1)),0);
			l.maxy=Math.min(Math.ceil(Math.max(y0,y1)),imgheight);
			if (Math.abs(dy)>1e-10 && l.miny<l.maxy && !isNaN(dx)) {
				l.minx=Math.max(Math.floor(Math.min(x0,x1)),0);
				l.maxx=Math.min(Math.ceil(Math.max(x0,x1)),imgwidth);
				if (l.minx<imgwidth) {
					l.x0=x0;
					l.y0=y0;
					l.x1=x1;
					l.y1=y1;
					l.dxy=dx/dy;
					l.cxy=x0-y0*l.dxy;
					l.dyx=dy/dx;
					l.cyx=y0-x0*l.dyx;
					l.minr=0;
					l.maxr=0;
					ycnt++;
					miny=Math.min(miny,l.miny);
					maxy=Math.max(maxy,l.maxy);
				}
				minx=Math.min(minx,l.minx);
				maxx=Math.max(maxx,l.maxx);
			}
		}
		// If all lines are outside the image, abort.
		if (minx>=maxx || miny>=maxy) {
			return;
		}
		// Sort by min y.
		for (i=1;i<ycnt;i++) {
			j=i;l=lr[i];tmp=l.miny;
			while (j>0 && tmp<lr[j-1].miny) {lr[j]=lr[j-1];j--;}
			lr[j]=l;
		}
		// Split RGB.
		var colrgba=IMG.rgbatoint(255,255,255,255);
		var coll=(colrgba&0x00ff00ff)>>>0;
		var colh=(colrgba&0xff00ff00)>>>0;
		var colh2=colh>>>8;
		// Process the lines row by row.
		var ylo=0,yhi=0,y=miny,ynext=y,ny;
		var pixrow=y*imgwidth;
		while (y<maxy) {
			// Add any new lines on this row.
			ny=y+1;
			while (ynext<ny) {
				l=lr[yhi++];
				ynext=yhi<ycnt?lr[yhi].miny:imgheight;
			}
			// Sort by min row and remove rows we've passed.
			for (i=ylo;i<yhi;i++) {
				l=lr[i];j=i;
				if (l.maxy<=y) {
					while (j>ylo) {lr[j]=lr[j-1];j--;}
					ylo++;
				} else {
					l.minr=Math.min(Math.max(Math.floor((l.dxy>0?y:ny)*l.dxy+l.cxy),l.minx),maxx);
					l.maxr=Math.min(Math.ceil((l.dxy>0?ny:y)*l.dxy+l.cxy),l.maxx);
					tmp=l.minr;
					while (j>ylo && tmp<lr[j-1].minr) {lr[j]=lr[j-1];j--;}
				}
				lr[j]=l;
			}
			// Skip any gaps of empty rows.
			if (ylo===yhi) {
				if (ylo>=ycnt) {break;}
				y=ynext;
				pixrow=y*imgwidth;
				continue;
			}
			var xlo=ylo,xhi=ylo,x=lr[xhi].minr,xnext=x;
			var area=0.0,a;
			var pixcol,pixstop,dst;
			// Process the lines on this row, column by column.
			while (x<maxx) {
				while (xnext<=x) {
					l=lr[xhi++];
					l.area=0.0;
					xnext=xhi<yhi?lr[xhi].minr:maxx;
				}
				for (i=xlo;i<xhi;i++) {
					l=lr[i];
					var ly0=l.y0-y;
					var ly1=l.y1-y;
					if (l.maxr<=x) {
						j=i;
						while (j>xlo) {lr[j]=lr[j-1];j--;}
						lr[j]=l;
						xlo++;
						tmp=Math.max(Math.min(ly0,1),0)-Math.max(Math.min(ly1,1),0);
					} else {
						// Clamp the line segment to the unit square.
						var lx0=l.x0-x;
						var lx1=l.x1-x;
						if (ly0>ly1) {
							tmp=ly0;ly0=ly1;ly1=tmp;
							tmp=lx0;lx0=lx1;lx1=tmp;
						}
						var difx=lx1-lx0;
						var dify=ly1-ly0;
						var dxy=difx/dify;
						var dyx=dify/difx;
						tmp=0.0;
						var x0y=-lx0*dyx+ly0;
						var x1y=x0y+dyx;
						if (ly0<0.0) {
							lx0-=ly0*dxy;
							ly0=0.0;
						}
						if (ly1>1.0) {
							lx1+=(1.0-ly1)*dxy;
							ly1=1.0;
						}
						if (lx0<0.0) {
							tmp=x0y-ly0;
							lx0=0;
							ly0=x0y;
						} else if (lx0>1.0) {
							ly0=x1y;
							lx0=1.0;
						}
						if (lx1<0.0) {
							tmp=ly1-x0y;
							lx1=0;
							ly1=x0y;
						} else if (lx1>1.0) {
							ly1=x1y;
							lx1=1.0;
						}
						tmp+=(ly1-ly0)*(1-(lx0+lx1)*0.5);
						if (l.y0<l.y1) {tmp=-tmp;}
					}
					area+=tmp-l.area;
					l.area=tmp;
				}
				// Shade the pixels based on how much we're covering.
				pixcol=pixrow+x;
				x=xlo===xhi?xnext:(x+1);
				pixstop=pixrow+x;
				if (area>=0.9981) {
					while (pixcol<pixstop) {
						imgdata[pixcol++]=colrgba;
					}
				} else if (area>0.0019) {
					a=Math.floor((1.0-area)*256);
					while (pixcol<pixstop) {
						dst=imgdata[pixcol];
						imgdata[pixcol++]=
							(((Math.imul((dst&0x00ff00ff)-coll,a)>>>8)+coll)&0x00ff00ff)+
							((Math.imul(((dst&0xff00ff00)>>>8)-colh2,a)+colh)&0xff00ff00);
					}
				}
			}
			pixrow+=imgwidth;
			y++;
		}
	}


	// ----------------------------------------
	// Text


	static setfont() {
	}


	static print(x,y,str) {
	}


}


//---------------------------------------------------------------------------------
// Demonstration


function polyfill_jag(imgdata,imgwidth,imgheight,lines) {
	// Preprocess the lines. Reject anything with a NaN, too narrow (y1-y0), or
	// above or below the image.
	var func=polyfill_jag;
	var cache=func.cache||0;
	if (cache<lines.length) {
		cache=cache*2>lines.length?cache*2:lines.length;
		func.cache=cache;
		func.lr=new Array(cache);
	}
	var lr=func.lr;
	var minx=imgwidth,maxx=0,miny=imgheight,maxy=0,ycnt=0;
	var l,i,j,tmp;
	for (i=lines.length-1;i>=0;i--) {
		l=lr[ycnt];
		if (l===undefined) {lr[ycnt]=l={};}
		var [x0,y0,x1,y1]=lines[i];
		var dx=x1-x0;
		var dy=y1-y0;
		l.miny=Math.max(Math.floor(Math.min(y0,y1)),0);
		l.maxy=Math.min(Math.ceil(Math.max(y0,y1)),imgheight);
		if (Math.abs(dy)>1e-10 && l.miny<l.maxy && !isNaN(dx)) {
			l.minx=Math.max(Math.floor(Math.min(x0,x1)),0);
			l.maxx=Math.min(Math.ceil(Math.max(x0,x1)),imgwidth);
			if (l.minx<imgwidth) {
				l.x0=x0;
				l.y0=y0;
				l.x1=x1;
				l.y1=y1;
				l.dxy=dx/dy;
				l.cxy=x0-y0*l.dxy;
				l.dyx=dy/dx;
				l.cyx=y0-x0*l.dyx;
				l.minr=0;
				l.maxr=0;
				ycnt++;
				miny=Math.min(miny,l.miny);
				maxy=Math.max(maxy,l.maxy);
			}
			minx=Math.min(minx,l.minx);
			maxx=Math.max(maxx,l.maxx);
		}
	}
	// If all lines are outside the image, abort.
	if (minx>=maxx || miny>=maxy) {
		return;
	}
	// Sort by min y.
	for (i=1;i<ycnt;i++) {
		j=i;l=lr[i];tmp=l.miny;
		while (j>0 && tmp<lr[j-1].miny) {lr[j]=lr[j-1];j--;}
		lr[j]=l;
	}
	// Split RGB.
	var colrgba=IMG.rgbatoint(255,255,255,255);
	// Process the lines row by row.
	var ylo=0,yhi=0,y=miny,ynext=y,ny;
	var pixrow=y*imgwidth;
	while (y<maxy) {
		// Add any new lines on this row.
		ny=y+1;
		while (ynext<ny) {
			l=lr[yhi++];
			ynext=yhi<ycnt?lr[yhi].miny:imgheight;
		}
		// Sort by min row and remove rows we've passed.
		for (i=ylo;i<yhi;i++) {
			l=lr[i];j=i;
			if (l.maxy<=y) {
				while (j>ylo) {lr[j]=lr[j-1];j--;}
				ylo++;
			} else {
				l.minr=Math.min(Math.max(Math.floor((l.dxy>0?y:ny)*l.dxy+l.cxy),l.minx),maxx);
				l.maxr=Math.min(Math.ceil((l.dxy>0?ny:y)*l.dxy+l.cxy),l.maxx);
				tmp=l.minr;
				while (j>ylo && tmp<lr[j-1].minr) {lr[j]=lr[j-1];j--;}
			}
			lr[j]=l;
		}
		// Skip any gaps of empty rows.
		if (ylo===yhi) {
			if (ylo>=ycnt) {break;}
			y=ynext;
			pixrow=y*imgwidth;
			continue;
		}
		var xlo=ylo,xhi=ylo,x=lr[xhi].minr,xnext=x;
		var area=0.0;
		var pixcol,pixstop;
		// Process the lines on this row, column by column.
		while (x<maxx) {
			while (xnext<=x) {
				l=lr[xhi++];
				l.area=0.0;
				xnext=xhi<yhi?lr[xhi].minr:maxx;
			}
			for (i=xlo;i<xhi;i++) {
				l=lr[i];
				var ly0=l.y0-y;
				var ly1=l.y1-y;
				if (l.maxr<=x) {
					j=i;
					while (j>xlo) {lr[j]=lr[j-1];j--;}
					lr[j]=l;
					xlo++;
					tmp=Math.max(Math.min(ly0,1),0)-Math.max(Math.min(ly1,1),0);
				} else {
					// Clamp the line segment to the unit square.
					tmp=1.0;
					if (l.y0<l.y1) {tmp=-tmp;}
				}
				area+=tmp-l.area;
				l.area=tmp;
			}
			// Shade the pixels based on how much we're covering.
			pixcol=pixrow+x;
			x=xlo===xhi?xnext:(x+1);
			pixstop=pixrow+x;
			if (area>=0.5) {
				while (pixcol<pixstop) {
					imgdata[pixcol++]=colrgba;
				}
			}
		}
		pixrow+=imgwidth;
		y++;
	}
}


class PolyDemo1 {

	constructor(divid) {
		// Swap the <div> with <canvas>
		var elem=document.getElementById(divid);
		this.parentelem=elem.parentNode;
		var canvas=document.createElement("canvas");
		elem.replaceWith(canvas);
		// Setup the UI.
		canvas.width=400;
		canvas.height=200;
		this.canvas=canvas;
		this.ctx=this.canvas.getContext("2d");
		this.backbuf=this.ctx.createImageData(canvas.width,canvas.height);
		this.backbuf32=new Uint32Array(this.backbuf.data.buffer);
		canvas.style.imageRendering="pixelated";
		canvas.style.width="90%";
		var state=this;
		function update() {
			state.update();
			requestAnimationFrame(update);
		}
		update();
	}


	update() {
		var ctx=this.ctx;
		IMG.setimage(this.canvas,this.backbuf32);
		IMG.fill(this,0,0,0);
		IMG.setoffset(115,100);
		IMG.setangle(((performance.now()%18000)/18000)*3.14159265*2);
		var sides=5;
		var lines=[];
		for (var s=0;s<sides;s++) {
			var a0=3.14159265*2*(s+0)/sides;
			var a1=3.14159265*2*(s+1)/sides;
			lines[s*2+0]=[Math.cos(a0)*1.00,Math.sin(a0)*1.00,Math.cos(a1)*1.00,Math.sin(a1)*1.00];
			lines[s*2+1]=[Math.cos(a1)*0.75,Math.sin(a1)*0.75,Math.cos(a0)*0.75,Math.sin(a0)*0.75];
		}
		IMG.setscale(60,60);
		IMG.polyfill(lines);
		IMG.setangle(-IMG.ang-3.14159265/sides);
		IMG.setoffset(285,IMG.offy);
		var jaglines=[];
		for (var s=0;s<lines.length;s++) {
			var [x0,y0,x1,y1]=lines[s];
			[x0,y0]=IMG.transform(x0,y0);
			[x1,y1]=IMG.transform(x1,y1);
			jaglines[s]=[x0,y0,x1,y1];
		}
		polyfill_jag(IMG.imgdata,IMG.imgwidth,IMG.imgheight,jaglines);
		ctx.putImageData(this.backbuf,0,0);
	}

}

