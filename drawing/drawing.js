/*------------------------------------------------------------------------------


drawing.js - v1.11

Copyright 2024 Alec Dee - MIT license - SPDX: MIT
deegen1.github.io - akdee144@gmail.com


--------------------------------------------------------------------------------
TODO


https://gasiulis.name/cubic-curve-offsetting/
Speed up fillpoly()
	Create stress tests
		few lines / curves, short
		many lines / curves, short
		few  L/C, med
		many L/C, med
		few  L/C, large
		many L/C, large
		old circle drawing
		drawing images
		many = 2^n
		size = % of background image
	mergesort
	Instead of calculating per-pixel overlap, calculate [minx,maxx,delta].
	While x in [minx,maxx), area+=delta
	More accurate linearization of curves. Split on curvature, not length.
add image class
	save as bmp
Path string format
	M Z L C
	add tostring()
	change internal representation
tracing
	path inflection points
	project out based on tangent
Have article include curve diagrams, like schematics.
Create font/image fitting
	average r,g,b values to account for both grayscale and subpixel accuracy
	assign cost: 80/curve+10/line+1/point
Clip lines on corner of screen.
Add tracepoly().
Inline blending using toString() and new Function().


*/
/* jshint esversion: 6   */
/* jshint bitwise: false */
/* jshint eqeqeq: true   */
/* jshint curly: true    */


//---------------------------------------------------------------------------------
// Anti-aliased Image Drawing - v1.09


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
		data[10]=Math.sin(ang);
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
		var x0=(y*data[10]+x*data[ 9])/data[6];
		var y0=(y*data[ 9]-x*data[10])/data[7];
		return [x0,y0];
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
		var ax=a*dx,ay=a*dy;
		var bx=b*dx,by=b*dy;
		var cx=c*dx,cy=c*dy;
		this.moveto(x1-ay,y1+ax);
		this.curveto(x1+bx-cy,y1+by+cx,x1+cx-by,y1+cy+bx,x1+ax,y1+ay);
		this.curveto(x1+cx+by,y1+cy-bx,x1+bx+cy,y1+by-cx,x1+ay,y1-ax);
		this.lineto(x0+ay,y0-ax);
		this.curveto(x0-bx+cy,y0-by-cx,x0-cx+by,y0-cy-bx,x0-ax,y0-ay);
		this.curveto(x0-cx-by,y0-cy+bx,x0-bx-cy,y0-by+cx,x0-ay,y0+ax);
		this.close();
		return this;
	}


	addrect(x,y,w,h) {
		this.addstrip([0,0,1,0,1,-1,0,-1]);
		return this;
	}


	addoval(x,y,xrad,yrad) {
		// David Ellsworth and Spencer Mortensen constants.
		const a=1.00005519,b=0.55342686,c=0.99873585;
		var ax=a*xrad,ay=a*yrad;
		var bx=b*xrad,by=b*yrad;
		var cx=c*xrad,cy=c*yrad;
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
		this.width =width;
		this.height=height;
		this.dataim=new ImageData(width,height);
		this.data8 =new Uint8Array(this.dataim.data.buffer);
		this.datac8=new Uint8ClampedArray(this.data8.buffer);
		this.data32=new Uint32Array(this.data8.buffer);
		if (srcdata!==null) {this.data8.set(srcdata);}
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
		this.compileblending();
		// Screen transforms
		this.viewoffx =0.0;
		this.viewoffy =0.0;
		this.viewmulx =1.0;
		this.viewmuly =1.0;
		// Object transforms
		this.deffont  =new con.Font();
		this.deftrans =new con.Transform();
		this.defpoly  =new con.Poly();
		this.stack    =[this.deftrans];
		this.stackidx =0;
		// Rendering variables
		this.linewidth=1.0;
		this.tmptrans =new con.Transform();
		this.tmppoly  =new con.Poly();
		this.tmpvert  =[];
		this.tmpline  =[];
		this.tmpsort  =[];
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


	compileblending() {
		// Compiling to constants is slightly faster.
		var ashift=this.rgbashift[3];
		this.alphablend=new Function("dst","src",`
			// a = sa + da*(1-sa)
			// c = (sc*sa + dc*da*(1-sa)) / a
			var sa=(src>>>${ashift})&255;
			if (sa===0  ) {return dst;}
			if (sa===255) {return src;}
			var da=(dst>>>${ashift})&255;
			if (da===0  ) {return src;}
			// Approximate blending by expanding sa from [0,255] to [0,256].
			if (da===255) {
				sa+=sa>>>7;
				src|=${(255<<ashift)>>>0};
			} else {
				da=(sa+da)*255-sa*da;
				sa=Math.floor((sa*0xff00+(da>>>1))/da);
				da=Math.floor((da*0x00ff+0x7f00)/65025)<<${ashift};
				src=(src&${(~(255<<ashift)>>>0)})|da;
				dst=(dst&${(~(255<<ashift)>>>0)})|da;
			}
			var l=dst&0x00ff00ff,h=dst&0xff00ff00;
			return ((((Math.imul((src&0x00ff00ff)-l,sa)>>>8)+l)&0x00ff00ff)+
				  ((Math.imul(((src>>>8)&0x00ff00ff)-(h>>>8),sa)+h)&0xff00ff00))>>>0;
		`);
	}


	// ----------------------------------------
	// Transforms
	// point -> scale -> rotate -> offset -> view offset -> view scale


	clearstate() {return this.deftrans.clear();}


	savestate() {
		var trans=this.stack[++this.stackidx];
		if (trans===undefined) {
			trans=new this.constructor.Transform();
			this.stack[this.stackidx]=trans;
		}
		this.deftrans=trans.copy(this.deftrans);
	}


	loadstate() {
		if (this.stackidx<=0) {throw "loading null stack";}
		this.deftrans=this.stack[--this.stackidx];
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
	// Paths


	beginpath() {return this.defpoly.begin();}
	closepath() {return this.defpoly.close();}
	moveto(x,y) {return this.defpoly.moveto(x,y);}
	lineto(x,y) {return this.defpoly.lineto(x,y);}
	curveto(x0,y0,x1,y1,x2,y2) {return this.defpoly.curveto(x0,y0,x1,y1,x2,y2);}


	// ----------------------------------------
	// Basic Drawing


	fill(r,g,b,a) {
		// Fills the current buffer with a solid color.
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


	// ----------------------------------------
	// Primitives


	line(x0,y0,x1,y1) {
		var poly=this.tmppoly,trans=this.deftrans;
		poly.begin();
		poly.addline(x0,y0,x1,y1,this.linewidth*0.5);
		this.fillpoly(poly,trans);
	}


	fillrect(x,y,w,h) {
		var poly=this.tmppoly,trans=this.tmptrans;
		trans.copy(this.deftrans).addoffset(x,y).mulscale(w,h);
		poly.begin();
		poly.addrect(0,0,1,1);
		this.fillpoly(poly,trans);
	}


	fillcircle(x,y,rad) {
		this.filloval(x,y,rad,rad);
	}


	filloval(x,y,xrad,yrad) {
		var poly=this.tmppoly,trans=this.tmptrans;
		trans.copy(this.deftrans).addoffset(x,y).mulscale(xrad,yrad);
		poly.begin();
		poly.addoval(0,0,1,1);
		this.fillpoly(poly,trans);
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


	polysort(arr,start,stop,field) {
		var len=stop-start;
		for (var i=0;i<len;i++) {
			sortval[i]=arr[i+start][field];
		}
		/*for (var half=1;half<len;half+=half) {
			i=0;i0=0;i1=half;j0=half;j1=half+half;
			j1=j1<len?j1:len;
			while (i0<i1 && j0<j1) {
				if (arr[i0]<=arr[j0]) {dst[i++]=arr[i0++];}
				else {dst[i++]=arr[j0++];}
			}
			while (i0<i1) {dst[i++]=arr[i0++];}
			while (j0<j1) {dst[i++]=arr[j0++];}
			tmp=arr;arr=dst;dst=tmp;
		}*/
	}


	fillpoly(poly,trans) {
		// Preprocess the lines and curves. Reject anything with a NaN, too narrow, or
		// outside the image.
		if (poly ===undefined) {poly =this.defpoly ;}
		if (trans===undefined) {trans=this.deftrans;}
		if (poly.lineidx<=0 && poly.curvidx<=0) {return;}
		var l,i,j,tmp;
		var imgwidth=this.img.width,imgheight=this.img.height,imgdata=this.img.data32;
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
		var lr=this.tmpline,lrcnt=lr.length,ycnt=0;
		if (ycnt+(poly.lineidx>>1)>=lrcnt) {
			var newlen=(ycnt+(poly.lineidx>>1))*2;
			while (lrcnt<newlen) {lr.push({});lrcnt++;}
			this.tmpline=lr;
		}
		for (i=poly.lineidx-2;i>=0;i-=2) {
			var p0=poly.linearr[i],p1=poly.linearr[i+1];
			l=lr[ycnt++];
			l.x0=tv[p0  ];
			l.y0=tv[p0+1];
			l.x1=tv[p1  ];
			l.y1=tv[p1+1];
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
			if (x0>=imgwidth || y0>=imgheight || y1<=0) {continue;}
			if (x1<=0) {
				if (ycnt>=lrcnt) {
					var newlen=(ycnt+1)*2;
					while (lrcnt<newlen) {lr.push({});lrcnt++;}
					this.tmpline=lr;
				}
				l=lr[ycnt++];
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
				if (ycnt+segs>=lrcnt) {
					var newlen=(ycnt+segs)*2;
					while (lrcnt<newlen) {lr.push({});lrcnt++;}
					this.tmpline=lr;
				}
				u1=(u1-u0)/segs;
				for (var s=0;s<segs;s++) {
					u0+=u1;
					cpx=p0x+u0*(p1x+u0*(p2x+u0*p3x));
					cpy=p0y+u0*(p1y+u0*(p2y+u0*p3y));
					l=lr[ycnt++];
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
		var swap=((matxx<0)!==(matyy<0))+0;
		var minx=imgwidth,maxx=0,miny=imgheight,maxy=0;
		for (i=ycnt-1;i>=0;i--) {
			l=lr[i];
			// If we mirror the image, we need to flip the line direction.
			if (swap) {
				x0=l.x1;y0=l.y1;
				x1=l.x0;y1=l.y0;
				l.x0=x0;l.x1=x1;
				l.y0=y0;l.y1=y1;
			} else {
				x0=l.x0;y0=l.y0;
				x1=l.x1;y1=l.y1;
			}
			// Add the line if it's in the screen or to the left.
			var dx=x1-x0;
			var dy=y1-y0;
			l.minx=Math.max(Math.floor(Math.min(x0,x1)),0);
			l.miny=Math.max(Math.floor(Math.min(y0,y1)),0);
			l.maxy=Math.min(Math.ceil(Math.max(y0,y1)),imgheight);
			if (l.minx<imgwidth && l.miny<l.maxy && dx===dx && Math.abs(dy)>1e-10) {
				l.dxy=dx/dy;
				l.cxy=x0-y0*l.dxy;
				l.dyx=Math.abs(dx)>1e-10?dy/dx:0;
				l.cyx=y0-x0*l.dyx;
				l.maxx=Math.min(Math.ceil(Math.max(x0,x1)),imgwidth);
				minx=Math.min(minx,l.minx);
				maxx=Math.max(maxx,l.maxx);
				miny=Math.min(miny,l.miny);
				maxy=Math.max(maxy,l.maxy);
				continue;
			}
			// Remove the line.
			lr[i]=lr[--ycnt];
			lr[ycnt]=l;
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
		// Init blending.
		var ashift=this.rgbashift[3];
		var amul=this.rgba[3]*(256.0/255.0);
		var colrgba=(this.rgba32[0]|(255<<ashift))>>>0;
		var colrgb=(colrgba&(~(255<<ashift)))>>>0;
		var blend=this.alphablend;
		// Process the lines row by row.
		var ylo=0,yhi=0,y=miny,ynext=y,ny;
		var pixrow=(imgheight-1-y)*imgwidth;
		while (y<maxy) {
			// Add any new lines on this row.
			ny=y+1;
			while (ynext<ny) {
				l=lr[yhi++];
				l.minr=0;
				l.maxr=0;
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
					if (l.maxr<=x) {
						j=i;
						while (j>xlo) {lr[j]=lr[j-1];j--;}
						lr[j]=l;
						xlo++;
					}
					// Clamp the line segment to the unit square and calculate the area to the right.
					y0=l.y0-y;
					y1=l.y1-y;
					x0=l.x0-x;
					x1=l.x1-x;
					var x0y=y0-x0*l.dyx;
					var x1y=x0y+l.dyx;
					var y0x=x0-y0*l.dxy;
					var y1x=y0x+l.dxy;
					tmp=0.0;
					if (y0<0.0) {
						x0=y0x;
						y0=0.0;
					} else if (y0>1.0) {
						x0=y1x;
						y0=1.0;
					}
					if (y1<0.0) {
						x1=y0x;
						y1=0.0;
					} else if (y1>1.0) {
						x1=y1x;
						y1=1.0;
					}
					if (x0<0.0) {
						tmp+=x0y-y0;
						x0=0.0;
						y0=x0y;
					} else if (x0>1.0) {
						x0=1.0;
						y0=x1y;
					}
					if (x1<0.0) {
						tmp+=y1-x0y;
						x1=0.0;
						y1=x0y;
					} else if (x1>1.0) {
						x1=1.0;
						y1=x1y;
					}
					tmp+=(y1-y0)*(2-x0-x1)*0.5;
					area+=tmp-l.area;
					l.area=tmp;
				}
				// Shade the pixels based on how much we're covering.
				pixcol=pixrow+x;
				x=xlo===xhi?xnext:(x+1);
				pixstop=pixrow+x;
				tmp=Math.min(area,1)*amul;
				if (tmp>=255) {
					while (pixcol<pixstop) {
						imgdata[pixcol++]=colrgba;
					}
				} else if (tmp>=1) {
					tmp=colrgb+(Math.floor(tmp)<<ashift);
					while (pixcol<pixstop) {
						imgdata[pixcol]=blend(imgdata[pixcol++],tmp);
					}
				}
			}
			pixrow-=imgwidth;
			y++;
		}
	}


	drawimage(src,dx,dy,dw,dh) {
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
		dw=dst.width;
		var s3=this.rgbashift[3],sc,sa;
		const blend=this.alphablend;
		const blendfill=255;
		while (drow<ystop) {
			while (drow<xstop) {
				sc=srcdata[srow++];
				sa=(sc>>>s3)&255;
				if (sa>=blendfill) {
					dstdata[drow]=sc;
				} else if (sa>0) {
					dstdata[drow]=blend(dstdata[drow],sc);
				}
				drow++;
			}
			xstop+=dw;
			drow+=dinc;
			srow+=sinc;
		}
	}

}
