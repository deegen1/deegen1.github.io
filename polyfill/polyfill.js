/*------------------------------------------------------------------------------


polyfill.js - v1.05

Copyright 2024 Alec Dee - MIT license - SPDX: MIT
deegen1.github.io - akdee144@gmail.com


--------------------------------------------------------------------------------
TODO


raw mouse vs scaled
Create primitives
	circles
	lines
	text
Create font/image fitting.
	per character
	width
	height
	strips
	strip 1
	strip 2
	...
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
// Anti-aliased Image Drawing - v1.05


class Draw {

	constructor() {
		// Image info
		this.canvas   =undefined;
		this.imgwidth =undefined;
		this.imgheight=undefined;
		this.imgdata  =undefined;
		this.rgba     =new Uint8ClampedArray([255,255,255,255]);
		this.rgba32   =new Uint32Array(this.rgba.buffer);
		// Transforms
		this.linethickness=1.0;
		this.scalex   =1.0;
		this.scaley   =1.0;
		this.offx     =0.0;
		this.offy     =0.0;
		this.ang      =0.0;
		this.rotx     =1.0;
		this.roty     =0.0;
		this.mulxx    =1.0;
		this.mulxy    =0.0;
		this.mulyx    =0.0;
		this.mulyy    =1.0;
	}


	// ----------------------------------------
	// Image Information


	setimage(canvas,buf32) {
		if (!(buf32 instanceof Uint32Array)) {
			throw "buf32 not Uint32Array";
		}
		this.canvas=canvas;
		this.imgwidth=canvas.width;
		this.imgheight=canvas.height;
		this.imgdata=buf32;
	}


	setcolor(r,g,b) {
		r=Math.floor(r);r=r>0?r:0;r=r<255?r:255;
		g=Math.floor(g);g=g>0?g:0;g=g<255?g:255;
		b=Math.floor(b);b=b>0?b:0;b=b<255?b:255;
		this.rgba[0]=r;
		this.rgba[1]=g;
		this.rgba[2]=b;
	}


	rgbatoint(r,g,b,a) {
		// Convert an RGBA array to a int regardless of endianness.
		var tmp=this.rgba32[0];
		var rgba=this.rgba;
		rgba[0]=r;
		rgba[1]=g;
		rgba[2]=b;
		rgba[3]=a;
		rgba=this.rgba32[0];
		this.rgba32[0]=tmp;
		return rgba;
	}


	// ----------------------------------------
	// Transforms
	// point -> scale -> rotate -> offset


	setscale(x,y) {
		this.scalex=x;
		this.scaley=y;
		this.mulxx= this.rotx*x;
		this.mulxy=-this.roty*y;
		this.mulyx= this.roty*x;
		this.mulyy= this.rotx*y;
	}


	setangle(ang) {
		this.ang=ang;
		this.rotx=Math.cos(ang);
		this.roty=Math.sin(ang);
		this.setscale(this.scalex,this.scaley);
	}


	setoffset(x,y) {
		this.offx=x;
		this.offy=y;
	}


	cleartransform() {
		this.linethickness=1.0;
		this.scalex=1.0;
		this.scaley=1.0;
		this.offx  =0.0;
		this.offy  =0.0;
		this.ang   =0.0;
		this.rotx  =1.0;
		this.roty  =0.0;
		this.mulxx =1.0;
		this.mulxy =0.0;
		this.mulyx =0.0;
		this.mulyy =1.0;
	}


	transform(x,y) {
		// Applies all transformations to a point.
		var t=x;
		x=t*this.mulxx+y*this.mulxy+this.offx;
		y=t*this.mulyx+y*this.mulyy+this.offy;
		return [x,y];
	}


	// ----------------------------------------
	// Basic Drawing


	fill(r,g,b) {
		// fill() was ~25% slower during testing.
		// imgdata.fill(rgba);
		var rgba=this.rgbatoint(r,g,b,255);
		var imgdata=this.imgdata;
		var i=this.imgwidth*this.imgheight;
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


	line(x0,y0,x1,y1) {
		var rad=this.linethickness*0.5;
	}


	rect(x,y,w,h) {
		if (w<0) {x+=w;w=-w;}
		if (h<0) {y+=h;h=-h;}
		var lines=[
			[0,0,w,0],[w,0,w,h],
			[w,h,0,h],[0,h,0,0]
		];
		var tx=this.offx,ty=this.offy;
		this.offx+=x;
		this.offy+=y;
		this.polyfill(lines);
		this.offx=tx;
		this.offy=ty;
	}


	circle(x,y,rad) {
	}


	oval(x,y,xrad,yrad) {
	}


	// ----------------------------------------
	// Polygon Filling


	polyfill(lines) {
		// Preprocess the lines. Reject anything with a NaN, too narrow (y1-y0), or
		// above or below the image.
		var func=this.polyfill;
		var cache=func.cache||0;
		if (cache<lines.length) {
			cache=cache*2>lines.length?cache*2:lines.length;
			func.cache=cache;
			func.lr=new Array(cache);
		}
		var lr=func.lr;
		var imgdata=this.imgdata,imgwidth=this.imgwidth,imgheight=this.imgheight;
		var mulxx=this.mulxx,mulxy=this.mulxy,offx=this.offx;
		var mulyx=this.mulyx,mulyy=this.mulyy,offy=this.offy;
		var swap=(this.scalex<0)!==(this.scaley<0);
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
		var colrgba=this.rgba32[0];
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
				ynext=yhi<ycnt?lr[yhi].miny:maxy;
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
					y0=l.y0-y;
					y1=l.y1-y;
					if (l.maxr<=x) {
						j=i;
						while (j>xlo) {lr[j]=lr[j-1];j--;}
						lr[j]=l;
						xlo++;
						tmp=Math.max(Math.min(y0,1),0)-Math.max(Math.min(y1,1),0);
					} else {
						// Clamp the line segment to the unit square.
						x0=l.x0-x;
						x1=l.x1-x;
						if (y0>y1) {
							tmp=y0;y0=y1;y1=tmp;
							tmp=x0;x0=x1;x1=tmp;
						}
						var difx=x1-x0;
						var dify=y1-y0;
						var dxy=difx/dify;
						var dyx=dify/difx;
						var x0y=-x0*dyx+y0;
						var x1y=x0y+dyx;
						tmp=0.0;
						if (y0<0.0) {
							x0-=y0*dxy;
							y0=0.0;
						}
						if (y1>1.0) {
							x1+=(1.0-y1)*dxy;
							y1=1.0;
						}
						if (x0<0.0) {
							tmp=x0y-y0;
							x0=0;
							y0=x0y;
						} else if (x0>1.0) {
							y0=x1y;
							x0=1.0;
						}
						if (x1<0.0) {
							tmp=y1-x0y;
							x1=0;
							y1=x0y;
						} else if (x1>1.0) {
							y1=x1y;
							x1=1.0;
						}
						tmp+=(y1-y0)*(1-(x0+x1)*0.5);
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


	setfont(name) {
	}


	print(x,y,str) {
	}

}

