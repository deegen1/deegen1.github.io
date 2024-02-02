/*------------------------------------------------------------------------------


drawing.js - v1.07

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
// Anti-aliased Image Drawing - v1.07


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
		data[1]=-data[10]*data[7];
		data[2]= data[11];
		data[3]= data[10]*data[6];
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
		this.moved=0;
		this.moveidx=-1;
	}


	begin() {
		this.vertidx=0;
		this.lineidx=0;
		this.moved=0;
		return this;
	}


	resize(verts,lines) {
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
	}


	moveto(x,y) {
		// Move the pen to [x,y].
		this.resize(1,0);
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
		this.resize(1,1);
		this.linearr[lidx++]=vidx-2;
		this.linearr[lidx++]=vidx;
		this.lineidx=lidx;
		this.vertarr[vidx++]=x;
		this.vertarr[vidx++]=y;
		this.vertidx=vidx;
		return this;
	}


	close() {
		// Draw a line from the current vertex to our last moveto() call.
		if (this.moved!==2) {return this;}
		this.resize(0,1);
		var lidx=this.lineidx;
		this.linearr[lidx++]=this.vertidx-2;
		this.linearr[lidx++]=this.moveidx;
		this.lineidx=lidx;
		this.moved=0;
		return this;
	}


	addlines(points) {
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


	//addpoly(poly,transform) {
	//	return this;
	//}

}


class _DrawFont {
}


class Draw {

	// Put these under the Draw namespace.
	static Transform=_DrawTransform;
	static Poly     =_DrawPoly;
	static Font     =_DrawFont;


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
		this.viewmul  =1.0;
		// Object transforms
		this.deftrans =new this.constructor.Transform();
		this.defpoly  =new this.constructor.Poly();
		this.stack    =[this.deftrans];
		this.stackidx =0;
		//
		this.linewidth=0.001;
		this.circlemap={};
		this.rectpoly =new this.constructor.Poly();
		this.rectpoly.addstrip([0,0,1,0,1,1,0,1]);
		this.tmptrans =new this.constructor.Transform();
		this.polyvert =[];
		this.polyline =[];
	}


	// ----------------------------------------
	// Image Information


	setimage(canvas,buf32) {
		if (!(buf32 instanceof Uint32Array)) {
			throw "buf32 is not a Uint32Array";
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
		if (this.stackidx<=0) {
			throw "loading null stack";
		}
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
		this.viewmul=Math.max(Math.abs(x),Math.abs(y));
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


	// ----------------------------------------
	// Polygon Filling


	fillpoly(poly,trans) {
		// Preprocess the lines. Reject anything with a NaN, too narrow (y1-y0), or
		// above or below the image.
		if (poly ===undefined) {poly =this.defpoly;}
		if (trans===undefined) {trans=this.deftrans;}
		var lineidx=poly.lineidx;
		if (lineidx<=0) {return;}
		if (this.polyline.length<lineidx) {
			var newlen=lineidx*2;
			this.polyvert=new Float64Array(newlen*2);
			this.polyline=new Array(newlen);
		}
		var lr=this.polyline;
		var imgdata=this.imgdata,imgwidth=this.imgwidth,imgheight=this.imgheight;
		var vmulx=this.viewmulx,voffx=this.viewoffx;
		var vmuly=this.viewmuly,voffy=this.viewoffy;
		var matxx=trans.data[0]*vmulx,matxy=trans.data[1]*vmulx,matx=(trans.data[2]-voffx)*vmulx;
		var matyx=trans.data[3]*vmuly,matyy=trans.data[4]*vmuly,maty=(trans.data[5]-voffy)*vmuly;
		var swap=((matxx<0)!==(matyy<0))+0;
		var minx=imgwidth,maxx=0,miny=imgheight,maxy=0,ycnt=0;
		var x0,y0,x1,y1;
		var l,i,j,tmp;
		for (i=poly.vertidx-2;i>=0;i-=2) {
			x0=poly.vertarr[i  ];
			y0=poly.vertarr[i+1];
			this.polyvert[i  ]=x0*matxx+y0*matxy+matx;
			this.polyvert[i+1]=x0*matyx+y0*matyy+maty;
		}
		for (i=poly.lineidx-2;i>=0;i-=2) {
			// Get the line points and transform() them.
			// If we mirror the image, we need to flip the line direction.
			var p0=poly.linearr[i+swap],p1=poly.linearr[i+1-swap];
			// Add the line if it's in the screen or to the left.
			x0=this.polyvert[p0];y0=this.polyvert[p0+1];
			x1=this.polyvert[p1];y1=this.polyvert[p1+1];
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
						tmp+=y0-x0y;
						x0=0.0;
						y0=x0y;
					} else if (x0>1.0) {
						x0=1.0;
						y0=x1y;
					}
					if (x1<0.0) {
						tmp+=x0y-y1;
						x1=0.0;
						y1=x0y;
					} else if (x1>1.0) {
						x1=1.0;
						y1=x1y;
					}
					tmp+=(y0-y1)*(2-x0-x1)*0.5;
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


	calcsegs(xrad,yrad) {
		if (yrad===undefined) {yrad=xrad;}
		xtmp=Math.abs(xrad*this.viewmul);
		ytmp=Math.abs(yrad*this.viewmul);
		var d=xtmp+ytmp,h=(xtmp-ytmp)/d;h*=h;
		var segs=Math.floor(d*(256+h*(64+h*(4+h)))*0.006872234);
		return segs;
	}


	line(x0,y0,x1,y1) {
		var rad=this.linewidth*0.5;
		var circ=6.283185307*rad;
	}


	fillrect(x,y,w,h) {
		var trans=this.tmptrans.copy(this.deftrans);
		trans.addoffset(x,y).mulscale(w,h);
		this.fillpoly(this.rectpoly,trans);
	}


	circle(x,y,rad) {
		this.oval(x,y,rad,rad);
	}


	oval(x,y,xrad,yrad) {
		// The optimal number of segments is 0.56*circumference. This offers the best
		// accuracy to segment ratio.
		// mul = 0.56*PI/256 = 0.006872234
		if (yrad===undefined) {yrad=xrad;}
		var trans=this.tmptrans.copy(this.deftrans);
		trans.addoffset(x,y).mulscale(xrad,yrad);
		var xtmp=Math.abs(trans.data[6]*this.viewmul);
		var ytmp=Math.abs(trans.data[7]*this.viewmul);
		if (xtmp<0.01 && ytmp<0.01) {return;}
		var d=xtmp+ytmp,h=(xtmp-ytmp)/d;h*=h;
		var segs=Math.floor(d*(256+h*(64+h*(4+h)))*0.006872234);
		if (segs<4) {segs=4;}
		var poly=new this.constructor.Poly();
		poly.begin();
		var arc=6.283185307/segs,ang=0;
		for (var i=0;i<segs;i++) {
			poly.lineto(Math.cos(ang),Math.sin(ang));
			ang+=arc;
		}
		poly.close();
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
		// Returns the rectangle bounding a string.
	}

}

