/*------------------------------------------------------------------------------


drawing.js - v1.16

Copyright 2024 Alec Dee - MIT license - SPDX: MIT
deegen1.github.io - akdee144@gmail.com


--------------------------------------------------------------------------------
TODO


inverse rotation in transform()
Path string format
	M Z L C
	add tostring()
	change internal representation
Have article include curve diagrams, like schematics.
Create font/image fitting
	average r,g,b values to account for both grayscale and subpixel accuracy
	color=(r+g+b)/(3*255)
	assign cost: 80/curve+10/line+1/point
Image scaling and rotation.
More accurate linearization of curves. Split on curvature, not length.
Tracing - project out based on tangent.


*/
/* jshint esversion: 6   */
/* jshint bitwise: false */
/* jshint eqeqeq: true   */
/* jshint curly: true    */


//---------------------------------------------------------------------------------
// Anti-aliased Image Drawing - v1.15


class _DrawTransform {

	static MATXX=0;
	static MATXY=1;
	static MATX =2;
	static MATYX=3;
	static MATYY=4;
	static MATY =5;
	static MULX =6;
	static MULY =7;
	static ANG  =8;
	static ROTX =9;
	static ROTY =10;
	static OFFX =11;
	static OFFY =12;


	constructor(trans) {
		if (trans!==undefined) {
			this.data=trans.data.slice();
		} else {
			this.data=new Float64Array([1,0,0,0,1,0,1,1,0,1,0,0,0]);
		}
	}


	clear() {
		this.data.set([1,0,0,0,1,0,1,1,0,1,0,0,0]);
	}


	copy(t) {
		this.data.set(t.data);
		return this;
	}


	calcmatrix() {
		// Precalculates the transformation matrix.
		// point -> scale -> rotate -> offset
		var data=this.data;
		data[0]= data[ 9]*data[6];
		data[1]= data[10]*data[7];
		data[2]= data[11];
		data[3]=-data[10]*data[6];
		data[4]= data[ 9]*data[7];
		data[5]= data[12];
	}


	setangle(ang) {
		var data=this.data;
		ang%=6.283185307;
		data[ 8]=ang;
		data[ 9]=Math.cos(ang);
		data[10]=-Math.sin(ang);
		this.calcmatrix();
		return this;
	}


	addangle(ang) {
		return this.setangle(this.data[8]+ang);
	}


	getangle() {
		return this.data[3];
	}


	setscale(x,y) {
		if (y===undefined) {y=x[1];x=x[0];}
		this.data[6]=x;
		this.data[7]=y;
		this.calcmatrix();
		return this;
	}


	mulscale(x,y) {
		if (y===undefined) {y=x[1];x=x[0];}
		this.data[6]*=x;
		this.data[7]*=y;
		this.calcmatrix();
		return this;
	}


	getscale() {
		return [this.data[6],this.data[7]];
	}


	setoffset(x,y) {
		if (y===undefined) {y=x[1];x=x[0];}
		this.data[11]=x;
		this.data[12]=y;
		this.calcmatrix();
		return this;
	}


	addoffset(x,y) {
		if (y===undefined) {y=x[1];x=x[0];}
		return this.setoffset(this.data[11]+x,this.data[12]+y);
	}


	getoffset() {
		return [this.data[11],this.data[12]];
	}


	apply(x,y) {
		// Applies all transformations to a point.
		if (y===undefined) {y=x[1];x=x[0];}
		var data=this.data,t=x;
		x=t*data[0]+y*data[1]+data[2];
		y=t*data[3]+y*data[4]+data[5];
		return [x,y];
	}


	undo(x,y) {
		// Applies the inverse transform to [x,y].
		if (y===undefined) {y=x[1];x=x[0];}
		var data=this.data;
		x-=data[2];
		y-=data[5];
		var det=data[0]*data[4]-data[1]*data[3],t=x;
		x=(t*data[4]-y*data[1])/det;
		y=(y*data[0]-t*data[3])/det;
		return [x,y];
	}

}


class _DrawPoly {

	constructor() {
		this.vertarr=new Float64Array();
		this.vertidx=0;
		this.linearr=new Uint32Array();
		this.lineidx=0;
		this.curvarr=new Uint32Array();
		this.curvidx=0;
		this.moved=0;
		this.moveidx=-1;
	}


	begin() {
		this.vertidx=0;
		this.lineidx=0;
		this.curvidx=0;
		this.moved=0;
		return this;
	}


	resize(verts,lines,curvs) {
		// Resizes internal memory to fit additional vertices and lines.
		var idx,len,arr;
		if (verts>0) {
			idx=this.vertidx+verts*2;
			len=this.vertarr.length||1;
			if (idx>=len) {
				do {len+=len;} while (idx>=len);
				arr=new Float64Array(len);
				arr.set(this.vertarr);
				this.vertarr=arr;
			}
		}
		if (lines>0) {
			idx=this.lineidx+lines*2;
			len=this.linearr.length||1;
			if (idx>=len) {
				do {len+=len;} while (idx>=len);
				arr=new Uint32Array(len);
				arr.set(this.linearr);
				this.linearr=arr;
			}
		}
		if (curvs>0) {
			idx=this.curvidx+curvs*4;
			len=this.curvarr.length||1;
			if (idx>=len) {
				do {len+=len;} while (idx>=len);
				arr=new Uint32Array(len);
				arr.set(this.curvarr);
				this.curvarr=arr;
			}
		}
	}


	moveto(x,y) {
		// Move the pen to [x,y].
		this.resize(1,0,0);
		this.moved=1;
		var idx=this.vertidx;
		this.moveidx=idx;
		this.vertarr[idx  ]=x;
		this.vertarr[idx+1]=y;
		return this;
	}


	lineto(x,y) {
		// Draw a line from the last vertex to [x,y].
		// If no moveto() was ever called, behave as moveto().
		if (this.moved===0) {
			return this.moveto(x,y);
		}
		var vidx=this.vertidx;
		var lidx=this.lineidx;
		if (this.moved===1) {
			this.moved=2;
			vidx+=2;
		}
		this.resize(2,1,0);
		this.linearr[lidx++]=vidx-2;
		this.linearr[lidx++]=vidx;
		this.lineidx=lidx;
		this.vertarr[vidx++]=x;
		this.vertarr[vidx++]=y;
		this.vertidx=vidx;
		return this;
	}


	curveto(x0,y0,x1,y1,x2,y2) {
		// Draw a cubic bezier curve.
		if (this.moved===0) {
			return this.moveto(x0,y0);
		}
		var vidx=this.vertidx;
		var cidx=this.curvidx;
		if (this.moved===1) {
			this.moved=2;
			vidx+=2;
		}
		this.resize(4,0,1);
		this.curvarr[cidx++]=vidx-2;
		this.curvarr[cidx++]=vidx;
		this.vertarr[vidx++]=x0;
		this.vertarr[vidx++]=y0;
		this.curvarr[cidx++]=vidx;
		this.vertarr[vidx++]=x1;
		this.vertarr[vidx++]=y1;
		this.curvarr[cidx++]=vidx;
		this.vertarr[vidx++]=x2;
		this.vertarr[vidx++]=y2;
		this.curvidx=cidx;
		this.vertidx=vidx;
		return this;
	}


	close() {
		// Draw a line from the current vertex to our last moveto() call.
		if (this.moved!==2) {return this;}
		this.resize(0,1,0);
		var lidx=this.lineidx;
		this.linearr[lidx++]=this.vertidx-2;
		this.linearr[lidx++]=this.moveidx;
		this.lineidx=lidx;
		this.moved=0;
		return this;
	}


	addarray(points) {
		// Assumes an array of [x0,y0,x1,y1,...] where every 2 pairs is a separate line.
		var len=points.length;
		if (len<=0 || (len%4)!==0) {return;}
		for (var i=0;i<len;i+=4) {
			this.moveto(points[i  ],points[i+1]);
			this.lineto(points[i+2],points[i+3]);
		}
		return this;
	}


	addstrip(points) {
		// Assumes a loop of [x0,y0,x1,y1,...] where every pair is a separate line.
		var len=points.length;
		if (len<=0 || (len%2)!==0) {return;}
		this.moveto(points[0],points[1]);
		for (var i=2;i<len;i+=2) {
			this.lineto(points[i],points[i+1]);
		}
		this.close();
		return this;
	}


	// addpoly(poly,transform) {
	// 	return this;
	// }


	addline(x0,y0,x1,y1,rad) {
		var dx=x1-x0,dy=y1-y0;
		var dist=dx*dx+dy*dy;
		if (dist<1e-20) {
			x1=x0;
			y1=y0;
			dx=rad;
			dy=0.0;
		} else {
			dist=rad/Math.sqrt(dist);
			dx*=dist;
			dy*=dist;
		}
		const a=1.00005519,b=0.55342686,c=0.99873585;
		/*var ax=a*dx,ay=a*dy;
		var bx=b*dx,cy=c*dy,c0=bx-cy,c3=bx+cy;
		var cx=c*dx,by=b*dy,c1=cx+by,c2=cx-by;
		this.moveto(x1-ay,y1+ax);
		this.curveto(x1+c0,y1+c1,x1+c2,y1+c3,x1+ax,y1+ay);
		this.curveto(x1+c1,y1-c0,x1+c3,y1-c2,x1+ay,y1-ax);
		this.lineto(x0+ay,y0-ax);
		this.curveto(x0-c0,y0-c1,x0-c2,y0-c3,x0-ax,y0-ay);
		this.curveto(x0-c1,y0+c0,x0-c3,y0+c2,x0-ay,y0+ax);
		this.close();*/
		var ax=a*dx,ay=a*dy;
		var bx=b*dx,cy=c*dy,c0=bx-cy,c3=bx+cy;
		var cx=c*dx,by=b*dy,c1=cx+by,c2=cx-by;
		this.moveto(x1+ay,y1-ax);
		this.curveto(x1+c3,y1-c2,x1+c1,y1-c0,x1+ax,y1+ay);
		this.curveto(x1+c2,y1+c3,x1+c0,y1+c1,x1-ay,y1+ax);
		this.lineto(x0-ay,y0+ax);
		this.curveto(x0-c3,y0+c2,x0-c1,y0+c0,x0-ax,y0-ay);
		this.curveto(x0-c2,y0-c3,x0-c0,y0-c1,x0+ay,y0-ax);
		this.close();
		return this;
	}


	addrect(x,y,w,h) {
		this.addstrip([0,0,1,0,1,1,0,1]);
		//this.addstrip([0,0,1,0,1,-1,0,-1]);
		return this;
	}


	addoval(x,y,xrad,yrad) {
		// David Ellsworth and Spencer Mortensen constants.
		const a=1.00005519,b=0.55342686,c=0.99873585;
		var ax=-a*xrad,ay=a*yrad;
		var bx=-b*xrad,by=b*yrad;
		var cx=-c*xrad,cy=c*yrad;
		this.moveto(x,y+ay);
		this.curveto(x+bx,y+cy,x+cx,y+by,x+ax,y   );
		this.curveto(x+cx,y-by,x+bx,y-cy,x   ,y-ay);
		this.curveto(x-bx,y-cy,x-cx,y-by,x-ax,y   );
		this.curveto(x-cx,y+by,x-bx,y+cy,x   ,y+ay);
		return this;
	}

}


class _DrawFont {

	constructor(name) {
		this.glyphs={};
	}

}


class _DrawImage {

	constructor(width,height) {
		var srcdata=null;
		if (height===undefined) {
			var img=width;
			if (width===undefined) {
				width=0;
				height=0;
			} else if (img instanceof _DrawImage) {
				width=img.width;
				height=img.height;
				srcdata=img.data8;
			} else if (img instanceof HTMLCanvasElement) {
				width=img.width;
				height=img.height;
				srcdata=img.getContext("2d").createImageData(width,height).data;
			} else if (img instanceof ImageData) {
				width=img.width;
				height=img.height;
				srcdata=img.data;
			}
		}
		this.resize(width,height);
		if (srcdata!==null) {this.data8.set(srcdata);}
	}


	resize(width,height) {
		this.width =width;
		this.height=height;
		width=Math.max(1,Math.floor(width));
		height=Math.max(1,Math.floor(height));
		this.dataim=new ImageData(width,height);
		this.data8 =new Uint8Array(this.dataim.data.buffer);
		this.datac8=new Uint8ClampedArray(this.data8.buffer);
		this.data32=new Uint32Array(this.data8.buffer);
	}


	fromtga(src) {
		// Load a TGA image from an array.
		var len=src.length;
		if (len<18) {
			throw "TGA too short";
		}
		var w=src[12]+(src[13]<<8);
		var h=src[14]+(src[15]<<8);
		var bits=src[16],bytes=bits>>>3;
		if (w*h*bytes+18!==len || src[2]!==2 || (bits!==24 && bits!==32)) {
			throw "TGA corrupt";
		}
		// Load the image data.
		this.resize(w,h);
		var dst=this.data8,didx=0,sidx=18;
		for (var y=0;y<h;y++) {
			for (var x=0;x<w;x++) {
				dst[didx++]=src[sidx++];
				dst[didx++]=src[sidx++];
				dst[didx++]=src[sidx++];
				if (bytes===3) {dst[didx++]=255}
				else {dst[didx++]=src[sidx++];}
			}
		}
	}


	totga() {
		// Returns a Uint8Array with TGA image data.
		var w=this.width,h=this.height;
		if (w>0xffff || h>0xffff) {throw "Size too big: "+w+", "+h;}
		var didx=18,dst=new Uint8Array(w*h*4+didx);
		var sidx= 0,src=this.data8;
		dst.set([0,0,2,0,0,0,0,0,0,0,0,0,w&255,w>>>8,h&255,h>>>8,32,0],0,didx);
		for (var y=0;y<h;y++) {
			for (var x=0;x<w;x++) {
				dst[didx++]=src[sidx++];
				dst[didx++]=src[sidx++];
				dst[didx++]=src[sidx++];
				dst[didx++]=src[sidx++];
			}
		}
		return dst;
	}

}


class Draw {

	// Put these under the Draw namespace.
	static Transform=_DrawTransform;
	static Poly     =_DrawPoly;
	static Font     =_DrawFont;
	static Image    =_DrawImage;


	constructor() {
		var con=this.constructor;
		// Image info
		this.img      =new con.Image(1,1);
		this.rgba     =new Uint8ClampedArray([0,1,2,3]);
		this.rgba32   =new Uint32Array(this.rgba.buffer);
		this.rgbashift=[0,0,0,0];
		var col=this.rgba32[0];
		for (var i=0;i<32;i+=8) {this.rgbashift[(col>>>i)&255]=i;}
		this.rgba32[0]=0xffffffff;
		// Screen transforms
		this.viewoffx =0.0;
		this.viewoffy =0.0;
		this.viewmulx =1.0;
		this.viewmuly =1.0;
		// Object transforms
		this.deffont  =new con.Font();
		this.deftrans =new con.Transform();
		this.defpoly  =new con.Poly();
		this.stack    =[];
		this.stackidx =0;
		// Rendering variables
		this.linewidth=1.0;
		this.tmptrans =new con.Transform();
		this.tmppoly  =new con.Poly();
		this.tmpvert  =[];
		this.tmpline  =[];
	}


	// ----------------------------------------
	// Image Information


	setimage(img) {
		if (!(img instanceof this.constructor.Image)) {
			img=new this.constructor.Image(img);
		}
		this.img=img;
	}


	setcolor(r,g,b,a) {
		if (g===undefined) {a=(r>>>0)&255;b=(r>>>8)&255;g=(r>>>16)&255;r>>>=24;}
		if (a===undefined) {a=255;}
		this.rgba[0]=Math.max(Math.min(Math.floor(r?r:0),255),0);
		this.rgba[1]=Math.max(Math.min(Math.floor(g?g:0),255),0);
		this.rgba[2]=Math.max(Math.min(Math.floor(b?b:0),255),0);
		this.rgba[3]=Math.max(Math.min(Math.floor(a?a:0),255),0);
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
		this.rgba32[0]=0xffffffff;
		this.deftrans.clear();
	}


	savestate() {
		var mem=this.stack[this.stackidx++];
		if (mem===undefined) {
			mem={
				img  :null,
				rgba :null,
				trans:new this.constructor.Transform(),
				poly :null,
				font :null
			};
			this.stack[this.stackidx-1]=mem;
		}
		mem.img =this.img;
		mem.rgba=this.rgba32[0];
		mem.trans.copy(this.deftrans);
		mem.poly=this.defpoly;
		mem.font=this.deffont;
	}


	loadstate() {
		if (this.stackidx<=0) {throw "loading null stack";}
		var mem=this.stack[--this.stackidx];
		this.img=mem.img;
		this.rgba32[0]=mem.rgba;
		this.deftrans.copy(mem.trans);
		this.defpoly=mem.poly;
		this.deffont=mem.font;
	}


	transform(x,y) {
		var [ox,oy]=this.deftrans.apply(x,y);
		ox=(ox-this.viewoffx)*this.viewmulx;
		oy=(oy-this.viewoffy)*this.viewmuly;
		return [ox,oy];
	}


	setviewscale(x,y) {
		this.viewmulx=x;
		this.viewmuly=y;
	}


	setviewoffset(x,y) {
		this.viewoffx=x;
		this.viewoffy=y;
	}


	setangle(ang)  {return this.deftrans.setangle(ang);}
	addangle(ang)  {return this.deftrans.addangle(ang);}
	getangle()     {return this.deftrans.getangle();}
	setscale(x,y)  {return this.deftrans.setscale(x,y);}
	mulscale(x,y)  {return this.deftrans.mulscale(x,y);}
	getscale()     {return this.deftrans.getscale();}
	setoffset(x,y) {return this.deftrans.setoffset(x,y);}
	addoffset(x,y) {return this.deftrans.addoffset(x,y);}
	getoffset()    {return this.deftrans.getoffset();}


	// ----------------------------------------
	// Images


	fillimage(r,g,b,a) {
		// Fills the current image with a solid color.
		// imgdata.fill(rgba) was ~25% slower during testing.
		if (r===undefined) {r=g=b=0;}
		if (a===undefined) {a=255;}
		var rgba=this.rgbatoint(r,g,b,a);
		var imgdata=this.img.data32;
		var i=this.img.width*this.img.height;
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


	drawimage(src,dx,dy,dw,dh) {
		// Draw an image with alpha blending.
		var dst=this.img;
		dx=(dx===undefined)?0:(dx|0);
		dy=(dy===undefined)?0:(dy|0);
		dw=(dw===undefined || dw>src.width )?src.width :(dx|0);
		dh=(dh===undefined || dh>src.height)?src.height:(dh|0);
		var sx=0,sy=0;
		dw+=dx;
		if (dx<0) {sx=-dx;dx=0;}
		dw=(dw>dst.width?dst.width:dw)-dx;
		dh+=dy;
		if (dy<0) {sy=-dy;dy=0;}
		dh=(dh>dst.height?dst.height:dh)-dy;
		if (dw<=0 || dh<=0) {return;}
		var dstdata=dst.data32,drow=dy*dst.width+dx,dinc=dst.width-dw;
		var srcdata=src.data32,srow=sy*src.width+sx,sinc=src.width-dw;
		var ystop=drow+dst.width*dh,xstop=drow+dw;
		var amul=this.rgba[3],amul0=amul/255.0,amul1=amul*(256.0/65025.0);
		var filllim=amul0>0?255/amul0:Infinity;
		var ashift=this.rgbashift[3],amask=(255<<ashift)>>>0,namask=(~amask)>>>0;
		var maskl=0x00ff00ff&namask,maskh=0xff00ff00&namask;
		var sa,da,l,h,tmp;
		dw=dst.width;
		while (drow<ystop) {
			while (drow<xstop) {
				// a = sa + da*(1-sa)
				// c = (sc*sa + dc*da*(1-sa)) / a
				src=srcdata[srow++];
				sa=(src>>>ashift)&255;
				src&=namask;
				if (sa>=filllim) {
					dstdata[drow++]=src|(Math.floor(sa*amul0)<<ashift);
					continue;
				}
				if (sa<=0) {drow++;continue;}
				tmp=dstdata[drow];
				da=(tmp>>>ashift)&255;
				if (da===0) {
					dstdata[drow++]=src|(Math.floor(sa*amul0)<<ashift);
					continue;
				}
				// Approximate blending by expanding sa from [0,255] to [0,256].
				if (da===255) {
					sa=Math.floor(sa*amul1);
					da=amask;
				} else {
					sa*=amul;
					da=sa*255+da*(65025-sa);
					sa=Math.floor((sa*0xff00+(da>>>1))/da);
					da=Math.floor((da+32512)/65025)<<ashift;
				}
				l=tmp&0x00ff00ff;
				h=tmp&0xff00ff00;
				dstdata[drow++]=da|
					(((Math.imul((src&0x00ff00ff)-l,sa)>>>8)+l)&maskl)|
					((Math.imul(((src>>>8)&0x00ff00ff)-(h>>>8),sa)+h)&maskh);
			}
			xstop+=dw;
			drow+=dinc;
			srow+=sinc;
		}
	}


	// ----------------------------------------
	// Paths


	beginpath() {return this.defpoly.begin();}
	closepath() {return this.defpoly.close();}
	moveto(x,y) {return this.defpoly.moveto(x,y);}
	lineto(x,y) {return this.defpoly.lineto(x,y);}
	curveto(x0,y0,x1,y1,x2,y2) {return this.defpoly.curveto(x0,y0,x1,y1,x2,y2);}


	// ----------------------------------------
	// Primitives


	drawline(x0,y0,x1,y1) {
		var poly=this.tmppoly,trans=this.deftrans;
		poly.begin();
		poly.addline(x0,y0,x1,y1,this.linewidth*0.5);
		this.fill(poly,trans);
	}


	fillrect(x,y,w,h) {
		var poly=this.tmppoly,trans=this.tmptrans;
		trans.copy(this.deftrans).addoffset(x,y).mulscale(w,h);
		poly.begin();
		poly.addrect(0,0,1,1);
		this.fill(poly,trans);
	}


	fillcircle(x,y,rad) {
		this.filloval(x,y,rad,rad);
	}


	filloval(x,y,xrad,yrad) {
		var poly=this.tmppoly,trans=this.tmptrans;
		trans.copy(this.deftrans).addoffset(x,y).mulscale(xrad,yrad);
		poly.begin();
		poly.addoval(0,0,1,1);
		this.fill(poly,trans);
	}


	// ----------------------------------------
	// Text


	setfont(name) {
	}


	filltext(x,y,str,scale) {
		if (scale===undefined) {scale=1.0;}
	}


	textrect(str,scale) {
		// Returns the rectangle bounding the text.
	}


	// ----------------------------------------
	// Polygon Filling


	fill(poly,trans) {
		// Fills the current path.
		//
		// Preprocess the lines and curves. Reject anything with a NaN, too narrow, or
		// outside the image. Use a binary heap to dynamically sort lines.
		if (poly ===undefined) {poly =this.defpoly ;}
		if (trans===undefined) {trans=this.deftrans;}
		if (poly.lineidx<=0 && poly.curvidx<=0) {return;}
		var l,i,j,tmp;
		var iw=this.img.width,ih=this.img.height,imgdata=this.img.data32;
		// Convert all points to screenspace.
		var vmulx=this.viewmulx,voffx=this.viewoffx;
		var vmuly=this.viewmuly,voffy=this.viewoffy;
		var matxx=trans.data[0]*vmulx,matxy=trans.data[1]*vmulx,matx=(trans.data[2]-voffx)*vmulx;
		var matyx=trans.data[3]*vmuly,matyy=trans.data[4]*vmuly,maty=(trans.data[5]-voffy)*vmuly;
		var x0,y0,x1,y1;
		var tv=this.tmpvert;
		if (tv.length<poly.vertidx) {
			tv=new Float64Array(poly.vertidx*2);
			this.tmpvert=tv;
		}
		for (i=poly.vertidx-2;i>=0;i-=2) {
			x0=poly.vertarr[i  ];
			y0=poly.vertarr[i+1];
			tv[i  ]=x0*matxx+y0*matxy+matx;
			tv[i+1]=x0*matyx+y0*matyy+maty;
		}
		// Add regular lines.
		var lr=this.tmpline,lrcnt=lr.length,lcnt=0,newlen;
		if (lcnt+(poly.lineidx>>1)>=lrcnt) {
			newlen=(lcnt+(poly.lineidx>>1))*2;
			while (lrcnt<newlen) {lr.push({});lrcnt++;}
			this.tmpline=lr;
		}
		for (i=poly.lineidx-2;i>=0;i-=2) {
			var a=poly.linearr[i],b=poly.linearr[i+1];
			l=lr[lcnt++];
			l.x0=tv[a  ];
			l.y0=tv[a+1];
			l.x1=tv[b  ];
			l.y1=tv[b+1];
		}
		// Linear decomposition of curves.
		// 1: split into 4 segments
		// 2: subdivide if the segments are too big
		var splitlen=3;
		var cv=poly.curvarr;
		for (i=poly.curvidx-4;i>=0;i-=4) {
			// Get the control points and check if the curve's on the screen.
			var p0=cv[i  ],p0x=tv[p0],p0y=tv[p0+1];
			var p1=cv[i+1],p1x=tv[p1],p1y=tv[p1+1];
			var p2=cv[i+2],p2x=tv[p2],p2y=tv[p2+1];
			var p3=cv[i+3],p3x=tv[p3],p3y=tv[p3+1];
			x0=Math.min(p0x,Math.min(p1x,Math.min(p2x,p3x)));
			x1=Math.max(p0x,Math.max(p1x,Math.max(p2x,p3x)));
			y0=Math.min(p0y,Math.min(p1y,Math.min(p2y,p3y)));
			y1=Math.max(p0y,Math.max(p1y,Math.max(p2y,p3y)));
			if (x0>=iw || y0>=ih || y1<=0) {continue;}
			if (x1<=0) {
				if (lcnt>=lrcnt) {
					newlen=(lcnt+1)*2;
					while (lrcnt<newlen) {lr.push({});lrcnt++;}
					this.tmpline=lr;
				}
				l=lr[lcnt++];
				l.x0=p0x;
				l.y0=p0y;
				l.x1=p3x;
				l.y1=p3y;
				continue;
			}
			// Interpolate points.
			p2x=(p2x-p1x)*3;p1x=(p1x-p0x)*3;p3x-=p0x+p2x;p2x-=p1x;
			p2y=(p2y-p1y)*3;p1y=(p1y-p0y)*3;p3y-=p0y+p2y;p2y-=p1y;
			var ppx=p0x,ppy=p0y,u0=0;
			for (j=0;j<4;j++) {
				var u1=(j+1)/4;
				var cpx=p0x+u1*(p1x+u1*(p2x+u1*p3x))-ppx;
				var cpy=p0y+u1*(p1y+u1*(p2y+u1*p3y))-ppy;
				var dist=Math.sqrt(cpx*cpx+cpy*cpy);
				var segs=Math.ceil(dist/splitlen);
				// Split up the current segment.
				if (lcnt+segs>=lrcnt) {
					newlen=(lcnt+segs)*2;
					while (lrcnt<newlen) {lr.push({});lrcnt++;}
					this.tmpline=lr;
				}
				u1=(u1-u0)/segs;
				for (var s=0;s<segs;s++) {
					u0+=u1;
					cpx=p0x+u0*(p1x+u0*(p2x+u0*p3x));
					cpy=p0y+u0*(p1y+u0*(p2y+u0*p3y));
					l=lr[lcnt++];
					l.x0=ppx;
					l.y0=ppy;
					l.x1=cpx;
					l.y1=cpy;
					ppx=cpx;
					ppy=cpy;
				}
			}
		}
		// Prune lines.
		var minx=iw,maxx=0,miny=ih,maxy=0,maxcnt=lcnt;
		var amul=this.rgba[3]/255.0;
		var y0x,y1x,dy,dx;
		if ((matxx<0)!==(matyy<0)) {amul=-amul;}
		lcnt=0;
		for (i=0;i<maxcnt;i++) {
			l=lr[i];
			// If we mirror the image, we need to flip the line direction.
			x0=l.x0;y0=l.y0;
			x1=l.x1;y1=l.y1;
			dx=x1-x0;
			dy=y1-y0;
			// Too thin or NaN.
			if (!(dx===dx) || !(Math.abs(dy)>1e-10)) {continue;}
			// Clamp y to [0,imgheight), then clamp x so x<imgwidth.
			l.dxy=dx/dy;
			l.dyx=Math.abs(dx)>1e-10?dy/dx:0;
			y0x=x0-y0*l.dxy;
			var yhx=x0+(ih-y0)*l.dxy;
			var xwy=y0+(iw-x0)*l.dyx;
			if (y0<0 ) {y0=0 ;x0=y0x;}
			if (y0>ih) {y0=ih;x0=yhx;}
			if (y1<0 ) {y1=0 ;x1=y0x;}
			if (y1>ih) {y1=ih;x1=yhx;}
			if (Math.abs(y1-y0)<1e-20) {continue;}
			if (x0>=iw && x1>=iw) {maxx=iw;continue;}
			var fx=y0<y1?x0:x1;
			if (x0>=iw) {x0=iw;y0=xwy;}
			if (x1>=iw) {x1=iw;y1=xwy;}
			// Calculate the bounding box.
			l.minx=Math.max(Math.floor(Math.min(x0,x1)),0);
			var fy=Math.floor(Math.min(y0,y1));
			l.maxy=Math.ceil(Math.max(y0,y1));
			minx=Math.min(minx,l.minx);
			maxx=Math.max(maxx,Math.max(x0,x1));
			miny=Math.min(miny,fy);
			maxy=Math.max(maxy,l.maxy);
			l.maxy*=iw;
			// Heap sort based on miny and x.
			l.yidx=-1;
			fx=Math.min(fx,(fy+1-l.y0)*l.dxy+l.x0);
			l.sort=fy*iw+Math.max(Math.floor(fx),l.minx);
			j=lcnt++;
			lr[i]=lr[j];
			var p,lp;
			while (j>0 && l.sort<(lp=lr[p=(j-1)>>1]).sort) {
				lr[j]=lp;
				j=p;
			}
			lr[j]=l;
		}
		// If all lines are outside the image, abort.
		if (minx>=iw || maxx<=0 || minx>=maxx || miny>=maxy || lcnt<=0) {
			return;
		}
		// Init blending.
		var ashift=this.rgbashift[3],amask=(255<<ashift)>>>0,imask=1.0/amask;
		var maskl=(0x00ff00ff&~amask)>>>0,maskh=(0xff00ff00&~amask)>>>0;
		var sa,da;
		var colrgb=(this.rgba32[0]&~amask)>>>0;
		var coll=(colrgb&0x00ff00ff)>>>0,colh=(colrgb&0xff00ff00)>>>0,colh8=colh>>>8;
		var filllim=(255-0.5)/255;
		// Process the lines row by row.
		var x=lr[0].sort,y;
		var xnext=x,xrow=-1;
		var area,areadx1,areadx2;
		var pixels=iw*ih;
		while (true) {
			areadx2=0;
			if (x>=xrow) {
				if (xnext<x || xnext>=pixels) {break;}
				x=xnext;
				y=Math.floor(x/iw);
				xrow=(y+1)*iw;
				area=0;
				areadx1=0;
			}
			while (x>=xnext) {
				// fx0  fx0+1                          fx1  fx1+1
				//  +-----+-----+-----+-----+-----+-----+-----+
				//  |                              .....----  |
				//  |               .....-----'''''           |
				//  | ....-----'''''                          |
				//  +-----+-----+-----+-----+-----+-----+-----+
				//   first  dyx   dyx   dyx   dyx   dyx  last   tail
				l=lr[0];
				if (l.yidx!==y) {
					l.yidx=y;
					x0=l.x0;y0=l.y0-y;
					x1=l.x1;y1=l.y1-y;
					var dyx=l.dyx,dxy=l.dxy;
					var y0x=x0-y0*dxy;
					var y1x=y0x+dxy;
					if (y0<0) {y0=0;x0=y0x;}
					if (y0>1) {y0=1;x0=y1x;}
					if (y1<0) {y1=0;x1=y0x;}
					if (y1>1) {y1=1;x1=y1x;}
					var next=(y0>y1?x0:x1)+(dxy<0?dxy:0);
					next=xrow+Math.max(Math.floor(next),l.minx);
					if (next>=l.maxy) {next=Infinity;}
					if (x1<x0) {tmp=x0;x0=x1;x1=tmp;dyx=-dyx;}
					var fx0=Math.floor(x0);
					var fx1=Math.floor(x1);
					x0-=fx0;
					x1-=fx1;
					if (fx0===fx1 || fx1<0) {
						// Vertical line - avoid divisions.
						dy=(y0-y1)*amul;
						tmp=fx1>=0?(x0+x1)*dy*0.5:0;
						area+=dy-tmp;
						areadx2+=tmp;
						l.sort=next;
					} else {
						dyx*=amul;
						var mul=dyx*0.5,n0=x0-1,n1=x1-1;
						area    -=n0*n0*mul-(fx0<0?fx0*dyx:0);
						areadx1 -=dyx;
						areadx2 +=x0*x0*mul;
						l.area   =n1*n1*mul;
						l.areadx1=dyx;
						l.areadx2=x1*x1*mul;
						l.next=next;
						l.sort=fx1<iw?fx1+xrow-iw:next;
					}
				} else {
					area   +=l.area;
					areadx1+=l.areadx1;
					areadx2-=l.areadx2;
					l.sort  =l.next;
				}
				// Heap sort down.
				i=0;
				while ((j=i+i+1)<lcnt) {
					if (j+1<lcnt && lr[j+1].sort<lr[j].sort) {j++;}
					if (lr[j].sort>=l.sort) {break;}
					lr[i]=lr[j];
					i=j;
				}
				lr[i]=l;
				xnext=lr[0].sort;
			}
			// Shade the pixels based on how much we're covering.
			// If the area isn't changing much use the same color for multiple pixels.
			var xdraw=x+1;
			if (areadx2===0) {
				tmp=Math.floor(area*255+0.5);
				tmp=Math.min(Math.max(tmp+(areadx1<0?-0.5:0.5),0.5),254.5);
				tmp=(tmp/255-area)/areadx1+x;
				xdraw=(tmp>x && tmp<xnext)?Math.ceil(tmp):xnext;
				if (xdraw>xrow) {xdraw=xrow;}
			}
			areadx2+=(xdraw-x)*areadx1;
			if (area>=filllim) {
				tmp=colrgb|(Math.floor(area*255+0.5)<<ashift);
				while (x<xdraw) {imgdata[x++]=tmp;}
			} else if (area>0.001954) {
				// a = sa + da*(1-sa)
				// c = (sc*sa + dc*da*(1-sa)) / a
				var sa1=256-Math.floor(area*256+0.5);
				while (x<xdraw) {
					tmp=imgdata[x];
					da=(tmp&amask)>>>0;
					if (da===amask) {
						sa=sa1;
					} else {
						da=area+da*imask*(1-area);
						sa=256-Math.floor((area/da)*256+0.5);
						da=Math.floor(da*255+0.5)<<ashift;
					}
					imgdata[x++]=da|
						(((Math.imul((tmp&0x00ff00ff)-coll,sa)>>>8)+coll)&maskl)|
						((Math.imul(((tmp>>>8)&0x00ff00ff)-colh8,sa)+colh)&maskh);
				}
			}
			x=xdraw;
			area+=areadx2;
		}
	}


	// trace(poly,trans) {
	//	// Traces the current path
	// }

}
