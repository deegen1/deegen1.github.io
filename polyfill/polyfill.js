/*------------------------------------------------------------------------------


polyfill.js - v1.06

Copyright 2024 Alec Dee - MIT license - SPDX: MIT
deegen1.github.io - akdee144@gmail.com


--------------------------------------------------------------------------------
TODO


Create primitives
	circles
	lines
see if getting clipped when out of bounds
Create font/image fitting.
	average r,g,b values to account for both grayscale and subpixel accuracy
	per character
	width
	strips
	strip 1
	strip 2
	...
	class Font {
		name
		height
		unkchar
		charmap
	}
Create stress tests.
Optimize sorting lines. Heap/merge sort?
Instead of calculating per-pixel overlap, calculate [minx,maxx,delta].
	While x in [minx,maxx), area+=delta
	If multiple spans overlap, add delta to shortest split.
push/pop transform


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
// Anti-aliased Image Drawing - v1.06


class Draw {

	constructor() {
		// Image info
		this.canvas   =undefined;
		this.imgwidth =undefined;
		this.imgheight=undefined;
		this.imgdata  =undefined;
		this.rgba     =new Uint8ClampedArray([255,255,255,255]);
		this.rgba32   =new Uint32Array(this.rgba.buffer);
		// Screen transforms
		this.viewoffx =0.0;
		this.viewoffy =0.0;
		this.viewmulx =1.0;
		this.viewmuly =1.0;
		this.viewmax  =1.0;
		// Object transforms
		this.linewidth=1.0;
		this.mulx     =1.0;
		this.muly     =1.0;
		this.offx     =0.0;
		this.offy     =0.0;
		this.ang      =0.0;
		this.rotx     =1.0;
		this.roty     =0.0;
		this.matxx    =1.0;
		this.matxy    =0.0;
		this.matyx    =0.0;
		this.matyy    =1.0;
		this.matx     =0;
		this.maty     =0;
		this.stack    =[];
		this.stackpos =0;
		//
		this.cache    =0;
		this.pointarr =new Float64Array(0);
		this.linearr  =new Uint32Array(0);
		this.pointpos =0;
		this.linepos  =0;
		this.pointpoly=[];
		this.linepoly =[];
		this.cossize  =1<<16;
		this.costable =new Float64Array(this.cossize);
		var mul=6.283185307/this.cossize,tbl=this.costable;
		for (var c=this.cossize-1;c>=0;c--) {tbl[c]=c*mul;}
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
	// point -> scale -> rotate -> offset -> view offset -> view scale


	clearstate() {
		// Resets the current transformation.
		this.linewidth=1.0;
		this.mulx =1.0;
		this.muly =1.0;
		this.offx =0.0;
		this.offy =0.0;
		this.ang  =0.0;
		this.rotx =1.0;
		this.roty =0.0;
		this.matxx=1.0;
		this.matxy=0.0;
		this.matyx=0.0;
		this.matyy=1.0;
		this.matx =0.0;
		this.maty =0.0;
	}


	savestate() {
		var attr=this.stack[this.stackpos++];
		if (attr===undefined) {
			attr=new Float64Array(14);
			this.stack[this.stackpos-1]=attr;
		}
		attr[ 0]=this.linewidth;
		attr[ 1]=this.mulx;
		attr[ 2]=this.muly;
		attr[ 3]=this.offx;
		attr[ 4]=this.offy;
		attr[ 5]=this.ang;
		attr[ 6]=this.rotx;
		attr[ 7]=this.roty;
		attr[ 8]=this.matxx;
		attr[ 9]=this.matxy;
		attr[10]=this.matyx;
		attr[11]=this.matyy;
		attr[12]=this.matx;
		attr[13]=this.maty;
	}


	loadstate() {
		if (this.stackpos<=0) {
			throw "loading null stack";
		}
		var attr=this.stack[--this.stackpos];
		this.linewidth=attr[ 0];
		this.mulx =attr[ 1];
		this.muly =attr[ 2];
		this.offx =attr[ 3];
		this.offy =attr[ 4];
		this.ang  =attr[ 5];
		this.rotx =attr[ 6];
		this.roty =attr[ 7];
		this.matxx=attr[ 8];
		this.matxy=attr[ 9];
		this.matyx=attr[10];
		this.matyy=attr[11];
		this.matx =attr[12];
		this.maty =attr[13];
	}


	calcmatrix() {
		// Precalculates the transformation matrix.
		// point -> scale -> rotate -> offset -> view offset -> view scale
		var vmulx=this.viewmulx,vmuly=this.viewmuly;
		this.matxx= this.rotx*this.mulx*vmulx;
		this.matxy=-this.roty*this.muly*vmulx;
		this.matyx= this.roty*this.mulx*vmuly;
		this.matyy= this.rotx*this.muly*vmuly;
		this.matx = (this.offx-this.viewoffx)*vmulx;
		this.maty = (this.offy-this.viewoffy)*vmuly;
	}


	transform(x,y) {
		// Applies all transformations to a point.
		var t=x;
		x=t*this.matxx+y*this.matxy+this.matx;
		y=t*this.matyx+y*this.matyy+this.maty;
		return [x,y];
	}


	untransform(x,y) {
		x=(x-this.matx)/this.viewmulx;
		y=(y-this.maty)/this.viewmuly;
		var x0=(y*this.roty+x*this.rotx)/this.mulx;
		var y0=(y*this.rotx-x*this.roty)/this.muly;
		return [x0,y0];
	}


	setviewscale(x,y) {
		this.viewmulx=x;
		this.viewmuly=y;
		this.viewmax=Math.max(Math.abs(x),Math.abs(y));
		this.calcmatrix();
	}


	setviewoffset(x,y) {
		this.viewoffx=x;
		this.viewoffy=y;
		this.calcmatrix();
	}


	setscale(x,y) {
		this.mulx=x;
		this.muly=y;
		this.calcmatrix();
	}


	setangle(ang) {
		this.ang=ang;
		this.rotx=Math.cos(ang);
		this.roty=Math.sin(ang);
		this.calcmatrix();
	}


	setoffset(x,y) {
		this.offx=x;
		this.offy=y;
		this.calcmatrix();
	}


	// ----------------------------------------
	// Paths


	resizecache(size) {
		// Resizes the internal memory used to hold path data.
		size+=size+Math.max(this.pointpos,this.linepos);
		if (this.cache>=size) {return;}
		var cache=this.cache||1;
		while (cache<size) {cache+=cache;}
		var newpoint=new Float64Array(cache);
		newpoint.set(this.pointarr);
		this.pointarr=newpoint;
		var newline=new Uint32Array(cache);
		newline.set(this.linearr);
		this.linearr=newline;
	}


	beginpath() {
	}


	closepath() {
	}


	addpath(points,lines,moveto,close) {
		// Add an array of points and lines to the path.
		if (!lines) {
			// assume strip
		}
		//if (begin) {this.beginpath();}
		this.resizecache(points.length+lines.length);
		if (close) {this.closepath();}
	}


	moveto() {
		// Catch multiple moveto's.
	}


	lineto() {
	}


	// ----------------------------------------
	// Polygon Filling


	fillpoly() {
		// Preprocess the lines. Reject anything with a NaN, too narrow (y1-y0), or
		// above or below the image.
		var linepos=this.linepos;
		if (linepos<=0) {return;}
		if (this.linepoly.length<linepos) {
			var newlen=linepos*2;
			this.pointpoly=new Float64Array(newlen*2);
			this.linepoly=new Array(newlen);
		}
		var lr=this.linepoly;
		var imgdata=this.imgdata,imgwidth=this.imgwidth,imgheight=this.imgheight;
		var matxx=this.matxx,matxy=this.matxy,matx=this.matx;
		var matyx=this.matyx,matyy=this.matyy,maty=this.maty;
		var swap=((matxx<0)!==(matyy<0))+0;
		var minx=imgwidth,maxx=0,miny=imgheight,maxy=0,ycnt=0;
		var x0,y0,x1,y1;
		var l,i,j,tmp;
		for (i=this.pointpos-2;i>=0;i-=2) {
			x0=this.pointarr[i  ];
			y0=this.pointarr[i+1];
			this.pointpoly[i  ]=x0*matxx+y0*matxy+matx;
			this.pointpoly[i+1]=x0*matyx+y0*matyy+maty;
		}
		for (i=this.linepos-2;i>=0;i-=2) {
			// Get the line points and transform() them.
			// If we mirror the image, we need to flip the line direction.
			var p0=this.linearr[i+swap]*2,p1=this.linearr[i+1-swap]*2;
			// Add the line if it's in the screen or to the left.
			x0=this.pointpoly[p0];y0=this.pointpoly[p0+1];
			x1=this.pointpoly[p1];y1=this.pointpoly[p1+1];
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
							x0=1.0;
							y0=x1y;
						}
						if (x1<0.0) {
							tmp=y1-x0y;
							x1=0;
							y1=x0y;
						} else if (x1>1.0) {
							x1=1.0;
							y1=x1y;
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
	// Basic Drawing


	fill(r,g,b,a) {
		// Fills the current buffer with a solid color.
		// imgdata.fill(rgba) was ~25% slower during testing.
		if (r===undefined) {r=g=b=0;}
		if (a===undefined) {a=255;}
		var rgba=this.rgbatoint(r,g,b,a);
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


	getcirclepoints(circ) {
		var segments=Math.ceil(Math.sqrt(circ)*0.5+0.1)*4;
		var ret=this.circlemap[segments];
		if (ret===undefined) {
			var lines=new Uint32Array(segments*2);
			var points=new Float64Array(segments*2);
			var ang=0,mul=6.283185307/segments;
			for (var i=0,j=0;i<segments;i++,j+=2) {
				points[j  ]=Math.cos(ang);
				points[j+1]=Math.sin(ang);
				ang+=mul;
				lines[j  ]=i;
				lines[j+1]=i+1;
			}
			lines[j-1]=0;
			ret=[points,lines];
			this.circlemap[segments]=ret;
		}
		return ret;
	}


	line(x0,y0,x1,y1) {
		this.resizecache(2);
		var rad=this.linewidth*0.5;
		var circ=6.283185307*rad;
		var [points,lines]=this.getcirclepoints(circ);
	}


	fillrect(x,y,w,h) {
		//this.resizecache(4);
		if (w<0) {x+=w;w=-w;}
		if (h<0) {y+=h;h=-h;}
		var tmp=[this.matx,this.maty,this.pointarr,this.linearr,this.linepos,this.pointpos];
		this.pointarr=new Float64Array([0,0,w,0,w,h,0,h]);
		this.linearr=new Uint32Array([0,1,1,2,2,3,3,0]);
		this.pointpos=8;
		this.linepos=8;
		this.matx+=x;
		this.maty+=y;
		this.fillpoly();
		[this.matx,this.maty,this.pointarr,this.linearr,this.linepos,this.pointpos]=tmp;
	}


	circle(x,y,rad) {
		this.oval(x,r,rad,rad);
	}


	oval(x,y,xrad,yrad) {
		if (yrad===undefined) {yrad=xrad;}
		var segs=Math.ceil(Math.sqrt(Math.max(xrad,yrad)*this.viewmax)*3/4)*4;
		/*var ox=this.offx,oy=this.offy;
		var sx=this.mulx,sy=this.muly;
		xrad=Math.abs(xrad*sx);
		yrad=Math.abs(yrad*sy);
		if (!(xrad>1e-5 && yrad>1e-5)) {
			return;
		}
		this.mulx=xrad;
		this.muly=yrad;
		this.offx+=x;
		this.offy+=y;
		// circ = 2*pi*sqrt((x^2+y^2)/2)
		var circ=4.442882938*Math.sqrt(xrad*xrad+yrad*yrad)*this.viewmax;
		var [points,lines]=this.getcirclepoints(circ);
		this.polyfill(points,lines);
		this.mulx=sx;
		this.muly=sy;
		this.offx=ox;
		this.offy=oy;*/
	}


	//circle=oval;


	// ----------------------------------------
	// Text


	setfont(name) {
	}


	filltext(x,y,str,scale) {
		if (scale===undefined) {scale=1.0;}
	}


	textrect(str,scale) {
		// Returns the rectangle bounding a string.
	}

}

