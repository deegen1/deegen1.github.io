/*------------------------------------------------------------------------------


drawing.js - v3.30

Copyright 2024 Alec Dee - MIT license - SPDX: MIT
2dee.net - akdee144@gmail.com


--------------------------------------------------------------------------------
Notes


For editing use: https://yqnn.github.io/svg-path-editor


--------------------------------------------------------------------------------
History


1.09
     Added DrawImage class.
1.10
     Added Draw.setimage and began using DrawImage instead of canvas.
     Added Draw.drawimage to perform basic blitting.
1.12
     BMP saving and loading.
     Compile constants in fillpoly during runtime for speed.
1.13
     Added shortcuts to image blending (if alpha=1, etc) to be more efficient.
2.00
     fillpoly only needs to track the beginning and end of lines, since the
     change in area between the ends will be constant (areadx1). This reduces
     the worst case complexity per row from width*n to 2*n.
     fillpoly has also been simplified to use heaps instead of sorting by rows.
     This guarantees n*log(n) complexity for n lines.
2.01
     Switched from BMP to TGA for DrawImage.
2.02
     Changed DrawPoly internal format. Added SVG (MZLC) path saving and loading.
     Curves are only split to lines if they're on screen.
2.03
     Added an embedded monospace font, font loading, and text rect calculation.
2.04
     Moved line object creation in fillpoly to fillresize. Creating objects with
     all fields up front allows browsers to speed up fillpoly by 30%.
3.00
     Added bounding boxes to DrawPoly. This is turned into an OBB in fillpoly to
     skip drawing polygons in constant time if they're not on screen.
3.01
     fillpoly now uses linear time heap construction.
3.02
     Added a webassembly version of fillpoly. This is up to 2x the speed of
     javascript, but requires moving images to WASM sandboxed memory.
     Simplified curve segmentation by estimating length instead of quartering.
3.03
     Added relative paths to SVG parser (mzlc vs MZLC).
     Optimized WASM fillpoly.
     Cleaned up AABB on screen detection in fillpoly.
3.04
     Changed var to let.
3.05
     Added image PNG downloading.
3.06
     Curve segmentation now splits on distance from the segment rather than
     parameter spacing. This is more accurate with fewer segments.
     Simplified areadx1/areadx2 calculation. This is ~2% faster.
     Tested adding an areadx3 for thin lines, but it was slower.
3.07
     Removed WASM fillpoly since it's not always faster anymore.
     DrawTansform creation can now handle {x,y,scale,...}.
     Draw.setcolor can now handle ints, arrays, and objects.
3.08
     Rescaled default font. Curve derivatives now match neighbors.
3.10
     Fixed TGA orientation when saving and loading.
3.11
     Corrected duplicate variable.
3.12
     Added getpixel, setpixel, and inttorgba.
     Fixed fromstring() parsing numbers as Z instead of L.
3.13
     Rendering to screen is now done with webgl, which is faster in firefox.
     Added screencanvas() and screenflip() to handle rendering.
     Removed ImageData and C8 types from images.
     Renamed savestate/loadstate to push/pop.
3.15
     Fixed error when parsing compressed SVG strings.
3.16
     Added H,h,V,v to fromstring().
3.18
     rgbatoint() and setcolor() now use the same formula.
3.19
     Simplified fromstring() and fixed float parsing for strings like: .1.2.3
3.20
     Replaced DrawTransform with vector library Transform.
3.21
     Switched to texSubImage2D.
3.22
     Removed addstrip() and added addpoly().
     The DrawPoly constructor can now handle other polygons.
3.23
     drawimage() now supports non-integer coordinates with a 25% speed penalty.
3.25
     Switched to using modules.
3.26
     Reduced font size by 6kb and removed webgl renderer.
     Simplified oval and line paths.
3.27
     Subpaths are always closed in fillpoly().
     Optimized curve segmentation to stop if offscreen.
     Winding order is dynamically determined by signed area calculation.
     Pixel area calculation is more robust and prevents rounding errors.
     AABB merged into DrawPoly.
     Fixed close() not setting moveidx.
3.30
     Draw() now accepts canvas's as a constructor.


--------------------------------------------------------------------------------
TODO


fillpoly
	Per-subpath color. "#" specifies colors for following segments.
	Simplify line area calculation.
	Pull out individual equations and test different forms for stability. All
	values should be |x|<=1 or |x|<=slope. Use python bignum for comparison.
	Fix UnitAreaCalc() for large coordinates.
	Since subpaths are always closed, remove subpaths if they're out of the
	image.
	Sort indices instead of lines. Index = line.sort*lcnt+line.id
	Use linear time heap construction.
	Simplify sa/da blending. Integer only? Rebalance for 255 vs 256.
	0: <0.5, 255: >254.5, else round
	d =sa+(1-sa)*da = sa+da-sa*da
	sa=256-floor((sa/d)*256.99)
	da=floor(d*255.99)
	let tmp=sa+(1-sa)*da*0.00392156862745098;
	let ta=256-(~~((sa/tmp)*256.999));
	da=tmp*255.999;

DrawPoly
	fromstring() handle transform
	normalize, scale, shift
	Add circular arcs. Add to rappel.js charging.

filltext/textrect
	Add backspaces and tabs.

DrawImage
	Redo setpixel, getpixel, fill, rgbatoint, etc so it's always
	(a<<24)|(r<<16)|(g<<28)|b

Rewrite article.

Tracing
	v4.0
	Limit length of sharp corners to 2x thickness.
	Rounded corners: set midpoint distance to thickness.
	For inline, go through path in reverse.
	Add traceoval, tracerect.

Tracing draft
	what to do if tracing a line segment vs closed path?
		if closed, reverse second path

	c2x=(c2x-c1x)*3;c1x=(c1x-p0x)*3;c3x-=p0x+c2x;c2x-=c1x;
	c2y=(c2y-c1y)*3;c1y=(c1y-p0y)*3;c3y-=p0y+c2y;c2y-=c1y;

	// Point
	ppx=p0x+u*(c1x+u*(c2x+u*c3x));
	ppy=p0y+u*(c1y+u*(c2y+u*c3y));

	// Tangent
	dx=c1x+u*(2*c2x+u*3*c3x);
	dy=c1y+u*(2*c2y+u*3*c3y);
	norm=rad/Math.sqrt(dx*dx+dy*dy);

	px=ppx-dy*rad;
	py=ppy+dx*rad;

	let px=0,py=0,pdx=1,pdy=0;
	for (let i=0;i<vertidx;) {
		let v=vertarr[i];
		let x=v.x,dx=x-px;
		let y=v.y,dy=y-py;
		let len=dx*dx+dy*dy;
		if (len<1e-9) {continue;}
		len=1/Math.sqrt(len);
		dx*=len;
		dy*=len;
		let type=v.type;
		let join=0;
		if (pdx*dy-pdy*dx<=0) {
			// facing inward
			join=0;
		}
		if (type===DrawPoly.CURVE) {
			// Assume best tangents to offset points are at u=0,1/3,2/3,1.
			let pt=[p0x,p0y,c1x,c1y,c2x,c2y,p1x,p1y];
			for (let j=0;j<4;j++) {
				let u=j/3;
				let dx=c1x+u*(2*c2x+u*3*c3x);
				let dy=c1y+u*(2*c2y+u*3*c3y);
				let n=rad/Math.sqrt(dx*dx+dy*dy);
				dx*=n;dy*=n;
				pt[j*2+0]-=dy;
				pt[j*2+1]-=dx;
			}
		}
		px=x;
		py=y;
		pdx=dx;
		pdy=dy;
	}


*/
/* npx eslint drawing.js -c ../../standards/eslint.js */


import {Transform} from "./library.js";


//---------------------------------------------------------------------------------
// Drawing - v3.30


class DrawPoly {

	static MOVE =0;
	static CLOSE=1;
	static LINE =2;
	static CURVE=3;


	constructor(str,trans) {
		// Copy static variables.
		this.vertarr=new Array();
		this.begin();
		if (str) {
			if (trans) {trans=new Transform(trans);}
			if (str instanceof DrawPoly) {this.addpoly(str,trans);}
			else {this.fromstring(str);}
		}
	}


	begin() {
		this.vertidx=0;
		this.moveidx=-2;
		this.minx=Infinity;
		this.maxx=-Infinity;
		this.miny=Infinity;
		this.maxy=-Infinity;
		return this;
	}


	aabbupdate() {
		// Recompute the bounding box.
		let minx=Infinity,miny=Infinity,maxx=-Infinity,maxy=-Infinity;
		let varr=this.vertarr,vidx=this.vertidx;
		for (let i=0;i<vidx;i++) {
			let x=varr[i].x,y=varr[i].y;
			minx=minx<x?minx:x;
			maxx=maxx>x?maxx:x;
			miny=miny<y?minx:y;
			maxy=maxy>y?maxx:y;
		}
		this.minx=minx;this.maxx=maxx;
		this.miny=miny;this.maxy=maxy;
	}


	addvert(type,x,y) {
		let idx=this.vertidx++;
		let arr=this.vertarr;
		if (idx>=arr.length) {
			let len=16;
			while (len<=idx) {len+=len;}
			while (arr.length<len) {arr.push({type:-1,i:-1,x:0,y:0});}
		}
		let v=arr[idx];
		v.type=type;
		v.i=this.moveidx;
		v.x=x;
		v.y=y;
		if (this.minx>x) {this.minx=x;}
		if (this.maxx<x) {this.maxx=x;}
		if (this.miny>y) {this.miny=y;}
		if (this.maxy<y) {this.maxy=y;}
		return v;
	}


	moveto(x,y) {
		// Move the pen to [x,y].
		if (this.moveidx===this.vertidx-1) {this.vertidx--;}
		else {this.moveidx=this.vertidx;}
		this.addvert(DrawPoly.MOVE,x,y);
		return this;
	}


	lineto(x,y) {
		// Draw a line from the last vertex to [x,y].
		// If no moveto() was ever called, behave as moveto().
		if (this.moveidx<0) {return this.moveto(x,y);}
		this.addvert(DrawPoly.LINE,x,y);
		return this;
	}


	curveto(x0,y0,x1,y1,x2,y2) {
		// Draw a cubic bezier curve.
		if (this.moveidx<0) {this.moveto(0,0);}
		this.addvert(DrawPoly.CURVE,x0,y0);
		this.addvert(DrawPoly.CURVE,x1,y1);
		this.addvert(DrawPoly.CURVE,x2,y2);
		return this;
	}


	close() {
		// Draw a line from the current vertex to our last moveto() call.
		let move=this.moveidx;
		if (move<0) {return this;}
		this.moveidx=-2;
		if (move===this.vertidx-1) {
			this.vertidx--;
			return this;
		}
		let m=this.vertarr[move];
		m.i=this.vertidx;
		this.addvert(DrawPoly.CLOSE,m.x,m.y);
		return this;
	}


	tostring(precision=6) {
		// Converts the path to an SVG string.
		let p=precision;
		function tostring(x) {
			let s=x.toFixed(p);
			if (p>0) {
				let i=s.length;
				while (i>0 && s.charCodeAt(i-1)===48) {i--;}
				if (s.charCodeAt(i-1)===46) {i--;}
				s=s.substring(0,i);
			}
			return s;
		}
		let name=["M ","Z","L ","C "];
		let ret="";
		for (let i=0;i<this.vertidx;i++) {
			let v=this.vertarr[i],t=v.type;
			ret+=(i?" ":"")+name[t];
			if (t!==DrawPoly.CLOSE) {
				ret+=tostring(v.x)+" "+tostring(v.y);
			}
			if (t===DrawPoly.CURVE) {
				v=this.vertarr[++i];
				ret+=" "+tostring(v.x)+" "+tostring(v.y);
				v=this.vertarr[++i];
				ret+=" "+tostring(v.x)+" "+tostring(v.y);
			}
		}
		return ret;
	}


	fromstring(str) {
		// Parses an SVG path. Supports Z M L H V C.
		this.begin();
		let type=2,rel=0,len=str.length,i=0,c=0;
		let params=[0,3,3,1,2,63],v=[0,0,0,0,0,0],off=[0,0];
		function gc() {c=i<len?str.charCodeAt(i++):-1;}
		gc();
		while (c>=0) {
			// If it's a number, repeat last type. Otherwise, determine if Zz Mm Ll Hh Vv Cc.
			if (c<45 || c>57 || c===47) {
				let l=c&32,h=c-l;
				gc();
				if      (h===90) {type=0;}
				else if (h===77) {type=1;}
				else if (h===76) {type=2;}
				else if (h===72) {type=3;}
				else if (h===86) {type=4;}
				else if (h===67) {type=5;}
				else {continue;}
				rel=l;
			}
			// Relative offset.
			if (this.vertidx) {
				let l=this.vertarr[this.vertidx-1];
				off[0]=l.x;off[1]=l.y;
			}
			let p=params[type];
			for (let j=0;j<6;j++) {
				// Only parse floats if they're needed for this type. Format: \s*-?\d*(\.\d*)?
				let sign=1,mul=1,base=off[j&1],num=0;
				if ((p>>>j)&1) {
					base=rel?base:0;
					while (c<33) {gc();}
					if (c===45) {gc();sign=-1;}
					while (c>47 && c<58) {num=c-48+num*10;gc();}
					if (c===46) {gc();}
					while (c>47 && c<58) {mul/=10;num+=(c-48)*mul;gc();}
				}
				v[j]=sign*num+base;
			}
			if      (type<1) {this.close();type=1;}
			else if (type<2) {this.moveto(v[0],v[1]);type=2;}
			else if (type<5) {this.lineto(v[0],v[1]);}
			else {this.curveto(v[0],v[1],v[2],v[3],v[4],v[5]);}
		}
	}


	addpoly(poly,trans) {
		let varr=poly.vertarr,vidx=poly.vertidx;
		for (let i=0;i<vidx;i++) {
			let v=varr[i],x=v.x,y=v.y,t=v.type;
			if (trans) {[x,y]=trans.apply([x,y]);}
			if (t===DrawPoly.MOVE) {this.moveto(x,y);}
			else if (t===DrawPoly.CLOSE) {this.close();}
			else {this.addvert(t,x,y);}
		}
		return this;
	}


	addrect(x,y,w,h) {
		return this.moveto(x,y).lineto(x+w,y).lineto(x+w,y+h).lineto(x,y+h).close();
	}


	addoval(x,y,xrad,yrad) {
		// Circle approximation. Max error: 0.000196
		const c=0.551915024;
		let dx=xrad,dy=(yrad??xrad),cx=c*dx,cy=c*dy;
		this.moveto(x,y+dy);
		this.curveto(x-cx,y+dy,x-dx,y+cy,x-dx,y   );
		this.curveto(x-dx,y-cy,x-cx,y-dy,x   ,y-dy);
		this.curveto(x+cx,y-dy,x+dx,y-cy,x+dx,y   );
		this.curveto(x+dx,y+cy,x+cx,y+dy,x   ,y+dy);
		return this;
	}


	addline(x0,y0,x1,y1,rad) {
		// Line with circular ends.
		let dx=x1-x0,dy=y1-y0;
		let dist=dx*dx+dy*dy;
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
		const c=0.551915024;
		let cx=c*dx,c0=cx-dy,c3=cx+dy;
		let cy=c*dy,c1=dx+cy,c2=dx-cy;
		this.moveto(x1+dy,y1-dx);
		this.curveto(x1+c3,y1-c2,x1+c1,y1-c0,x1+dx,y1+dy);
		this.curveto(x1+c2,y1+c3,x1+c0,y1+c1,x1-dy,y1+dx);
		this.lineto(x0-dy,y0+dx);
		this.curveto(x0-c3,y0+c2,x0-c1,y0+c0,x0-dx,y0-dy);
		this.curveto(x0-c2,y0-c3,x0-c0,y0-c1,x0+dy,y0-dx);
		this.close();
		return this;
	}


	trace(rad) {
		throw "not implemented "+rad;
		// Curve offseting. Project out based on tangent.
	}

}


class DrawImage {
	// Pixel data is in R, G, B, A, R, G, B, A,... format.

	constructor(width,height) {
		let srcdata=null;
		if (height===undefined) {
			let img=width;
			if (width===undefined) {
				width=0;
				height=0;
			} else if (img instanceof DrawImage) {
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
		this.width=width;
		this.height=height;
		this.data8 =new Uint8Array(width*height*4);
		this.data32=new Uint32Array(this.data8.buffer);
	}


	savefile(name) {
		// Save the image to a TGA file.
		let blob=new Blob([this.totga()]);
		let link=document.createElement("a");
		link.href=window.URL.createObjectURL(blob);
		link.download=name;
		link.click();
	}


	fromtga(src) {
		// Load a TGA image from an array.
		let len=src.length;
		if (len<18) {
			throw "TGA too short";
		}
		let w=src[12]+(src[13]<<8);
		let h=src[14]+(src[15]<<8);
		let bits=src[16],bytes=bits>>>3;
		if (w*h*bytes+18!==len || src[2]!==2 || (bits!==24 && bits!==32)) {
			throw "TGA corrupt";
		}
		// Load the image data.
		this.resize(w,h);
		let dst=this.data8;
		let didx=0,dinc=0,sidx=18,a=255;
		if (src[17]&32) {didx=(h-1)*w*4;dinc=-w*8;}
		for (let y=0;y<h;y++) {
			for (let x=0;x<w;x++) {
				dst[didx+2]=src[sidx++];
				dst[didx+1]=src[sidx++];
				dst[didx+0]=src[sidx++];
				if (bytes===4) {a=src[sidx++];}
				dst[didx+3]=a;
				didx+=4;
			}
			didx+=dinc;
		}
	}


	totga() {
		// Returns a Uint8Array with TGA image data.
		let w=this.width,h=this.height;
		if (w>0xffff || h>0xffff) {throw "Size too big: "+w+", "+h;}
		let didx=18,sidx=0;
		let dst=new Uint8Array(w*h*4+didx),src=this.data8;
		dst.set([0,0,2,0,0,0,0,0,0,0,0,0,w&255,w>>>8,h&255,h>>>8,32,40],0,didx);
		for (let y=0;y<h;y++) {
			for (let x=0;x<w;x++) {
				dst[didx++]=src[sidx+2];
				dst[didx++]=src[sidx+1];
				dst[didx++]=src[sidx+0];
				dst[didx++]=src[sidx+3];
				sidx+=4;
			}
		}
		return dst;
	}


	todataurl() {
		// Returns a data string for use in <img src="..."> objects.
		let canv=document.createElement("canvas");
		let width=this.width,height=this.height;
		canv.width=width;
		canv.height=height;
		let imgdata=new ImageData(new Uint8ClampedArray(this.data8.buffer),width,height);
		canv.getContext("2d").putImageData(imgdata);
		let strdata=canv.toDataURL("image/png");
		canv.remove();
		return strdata;
	}


	getpixel(x,y) {
		if (x<0 || x>=this.width || y<0 || y>=this.height) {
			throw `invalid pixel: ${x}, ${y}`;
		}
		return this.data32[y*this.height+x];
	}


	setpixel(x,y,rgba) {
		if (x<0 || x>=this.width || y<0 || y>=this.height) {
			throw `invalid pixel: ${x}, ${y}`;
		}
		this.data32[y*this.height+x]=rgba;
	}

}


class DrawFont {

	static deffont=`monospace
		none
		1000
		SPC 553
		█ 553 M0 0H553V1000H0Z
		! 553 M224 54H327L314 560H238ZM340 692c0 86-130 86-130 0 0-86 130-86 130 0Z
		" 553 M127 54H235L221 284H141Zm191 0H426L412 284H332Z
		# 553 M173 106h71L228 268H354l17-162h72L426 268H532v64H420L403 504H506v64H396L378 748H306l18-180H198L180 748H108l18-180H21V504H132l18-172H46V268H156Zm49 226-17 172H331l17-172Z
		$ 553 M291 14h71l-13 95c35 4 72 9 99 16v75c-29-7-72-16-108-18L312 392c96 37 181 80 181 177 0 122-107 171-229 178L248 864H177l16-117c-44-4-90-9-138-21V645c47 15 97 25 149 26l28-221C150 420 59 378 59 277c0-87 80-164 220-170ZM269 181c-81 6-118 39-118 89 0 49 37 72 93 95Zm6 490c83-4 126-39 126-95 0-63-59-80-101-99Z
		% 553 M462 54h81L90 748H10ZM404 755c-80 0-133-47-133-149 0-74 51-145 133-145 87 0 132 57 132 145 0 80-52 149-132 149Zm-1-62c34 0 60-31 60-87 0-47-17-83-59-83-39 0-60 37-60 83 0 65 26 87 59 87ZM150 341C70 341 18 294 18 192 18 118 68 47 150 47c87 0 132 57 132 145 0 80-52 149-132 149Zm-1-62c34 0 60-31 60-87 0-47-17-83-59-83-38 0-60 39-60 83 0 65 26 87 59 87Z
		& 553 M396 553c11-32 23-81 21-140h86c0 68-8 135-49 211l99 124H440l-43-54c-43 35-95 61-171 61-125 0-198-72-198-181 0-94 53-150 121-190-35-46-65-88-65-153C84 117 165 68 256 68c91 0 160 52 160 143 0 85-58 134-146 183ZM227 341c40-25 102-54 102-123 0-49-29-78-76-78-54 0-81 37-81 83 0 54 32 89 55 118Zm-34 98c-34 23-76 59-76 126 0 72 49 117 119 117 45 0 80-16 113-48Z
		' 553 M221 54H333L319 284H234Z
		( 553 M426 68C313 176 235 317 235 484c0 164 75 304 190 417l-52 53C254 841 147 692 147 484c0-207 119-367 229-467Z
		) 553 M180 17C294 124 406 276 406 481c0 194-94 349-229 472l-49-50C236 794 318 667 318 481c0-162-83-309-190-411Z
		* 553 M241 54h71L299 222l140-94 34 60-152 75 151 73-33 58-139-92 12 169H241l12-169-141 92-31-57 151-75L81 186l33-57 140 93Z
		+ 553 M234 244h85V443H512v75H319V718H234V518H41V443H234Z
		, 553 M117 849c39 1 129-13 129-84 0-53-46-59-46-112 0-32 25-63 66-63 45 0 88 35 88 117 0 117-87 209-237 209Z
		- 553 M130 441H423v80H130Z
		. 553 M273 757c-45 0-82-37-82-82 0-45 37-82 82-82 45 0 82 37 82 82 0 45-37 82-82 82Z
		/ 553 M393 54h82L138 854H56Z
		0 553 M281 97c146 0 229 115 229 321 0 234-96 339-239 339C126 757 43 647 43 418 43 235 122 97 281 97ZM403 283c-12-50-52-113-126-113-110 0-159 126-145 314ZM148 567c24 86 75 117 129 117 107 0 161-128 143-321Z
		1 553 M271 103h75V668H490v80H86V668H252V199L98 283 66 210Z
		2 553 M75 181c44-40 90-84 195-84 121 0 191 81 191 185 0 131-85 195-278 385H495v81H72V672C307 432 368 401 368 290c0-137-147-155-246-53Z
		3 553 M98 122c49-16 96-25 145-25 108 0 209 39 209 157 0 73-34 120-106 154 55 8 137 55 137 146 0 126-110 203-282 203-46 0-85-4-120-8V672c39 5 76 11 127 11 116 0 186-36 186-122 0-84-89-109-144-109H159V382h86c46 0 117-29 117-114 0-76-64-133-264-71Z
		4 553 M295 106H418V531H527v75H418V748H330V606H21V531Zm35 425V188L106 531Z
		5 553 M99 106H444v74H179V361h65c163 0 235 75 235 182 0 131-124 214-269 214-44 0-81-4-123-9V671c43 9 83 12 128 12 133 0 172-75 172-135 0-84-70-114-163-114H99Z
		6 553 M453 181H381c-133 0-227 63-232 212 57-32 115-40 155-40 130 0 199 78 199 189 0 104-71 215-226 215-138 0-217-87-217-287 0-245 116-364 320-364h73ZM149 464c0 169 48 223 136 223 76 0 129-52 129-139 0-75-38-126-122-126-44 0-89 13-143 43Z
		7 553 M57 106H491v80L222 748H125L404 185H57Z
		8 553 M281 97c137 0 200 62 200 154 0 87-62 129-120 161 89 46 134 94 134 175 0 108-94 170-222 170-116 0-215-49-215-160 0-93 62-139 135-178C90 365 72 306 72 257c0-86 72-160 209-160Zm3 278c70-34 109-67 109-121 0-58-42-86-115-86-69 0-118 24-118 83 0 66 64 94 124 124Zm-14 81c-77 37-119 74-119 133 0 58 46 95 126 95 82 0 125-37 125-92 0-64-57-103-132-136Z
		9 553 M89 748V673h57c175 0 250-71 257-212-42 21-86 40-161 40-113 0-193-69-193-192C49 184 146 97 272 97c167 0 220 136 220 293 0 280-153 358-351 358ZM403 389c0-120-23-222-135-222-89 0-129 63-129 137 0 92 52 128 119 128 59 0 110-20 145-43Z
		: 553 M277 757c-42 0-75-33-75-75 0-42 33-75 75-75 42 0 75 33 75 75 0 42-33 75-75 75Zm0-361c-42 0-75-33-75-75 0-42 33-75 75-75 42 0 75 33 75 75 0 42-33 75-75 75Z
		; 553 M277 396c-42 0-75-33-75-75 0-42 33-75 75-75 42 0 75 33 75 75 0 42-33 75-75 75ZM123 849c39 1 129-13 129-84 0-53-46-59-46-112 0-32 25-63 66-63 45 0 88 35 88 117 0 117-87 209-237 209Z
		< 553 M398 205l53 54L184 480 451 701l-53 54L68 480Z
		= 553 M65 359H488v72H65Zm0 171H488v72H65Z
		> 553 M156 204 485 480 156 756l-53-54L370 481 103 260Z
		? 553 M149 54c191-5 304 104 304 220 0 84-42 158-173 165l-3 121H203l-6-188h58c34 0 105-4 105-92 0-109-106-152-211-149Zm90 703c-36 0-65-29-65-65 0-36 29-65 65-65 36 0 65 29 65 65 0 36-29 65-65 65Z
		@ 553 M423 292 384 544c-13 84-4 109 22 109 46 0 71-97 71-248 0-190-49-297-160-297C182 108 74 320 74 580c0 249 99 311 175 311 73 0 108-13 167-39v63c-53 22-91 37-167 37C55 952 5 771 5 579 5 258 145 48 321 48c121 0 225 80 225 357 0 182-43 312-147 312-42 0-76-18-76-73-29 57-57 73-92 73-67 0-93-51-93-145 0-139 52-278 161-278 31 0 43 5 60 13Zm-90 81c-13-13-22-16-35-16-60 0-82 132-82 202 0 62 4 94 28 94 19 0 32-16 47-46l10-20Z
		A 553 M338 106 548 748H453L408 607H141L95 748H5L218 106ZM166 530H383L275 186Z
		B 553 M261 106c108 0 215 28 215 156 0 71-32 121-106 145 87 18 129 76 129 149 0 127-107 192-246 192H78V106ZM165 380h94c71 0 126-35 126-105 0-76-58-95-128-95H165Zm0 294h97c93 0 144-36 144-112 0-74-67-109-144-109H165Z
		C 553 M489 214c-51-25-96-39-152-39-144 0-199 125-199 248 0 183 80 255 198 255 68 0 97-13 153-36v83c-45 16-88 31-161 31C122 756 45 622 45 423 45 251 136 98 337 98c64 0 108 13 152 30Z
		D 553 M223 106c252 0 294 171 294 311 0 259-154 331-320 331H54V106ZM208 672c136 0 217-70 217-255 0-162-61-237-209-237H141V672Z
		E 553 M464 106v74H186V378H453v74H186V673H464v75H99V106Z
		F 553 M463 106v75H190V389H449v73H190V748H101V106Z
		G 553 M494 215c-38-19-85-40-156-40-137 0-214 104-214 251 0 154 57 253 202 253 31 0 57-3 85-13V462H279V390H497V718c-48 22-108 39-180 39C121 757 32 625 32 426 32 229 152 97 338 97c64 0 115 13 156 31Z
		H 553 M412 106h87V748H412V453H142V748H55V106h87V377H412Z
		I 553 M84 106H469v74H321V673H469v75H84V673H232V180H84Z
		J 553 M98 106H431V546c0 132-80 209-199 209-66 0-120-21-142-36V631c23 18 81 48 139 48 77 0 113-51 113-127V182H98Z
		K 553 M77 106h87V404L399 106H503L249 411 514 748H404L164 433V748H77Z
		L 553 M114 106h89V673H484v75H114Z
		M 553 M55 106H159L274 429l27-83 91-240H498l31 642H444L425 196l-29 85-95 258H240L149 291l-29-95-2 157-11 395H24Z
		N 553 M58 106H171L346 479l68 154V106h81V748H381L193 345 140 218V748H58Z
		O 553 M281 97c170 0 245 131 245 323 0 223-105 337-254 337C76 757 28 592 28 423 28 250 107 97 281 97Zm-4 77c-104 0-158 103-158 246 0 179 58 261 155 261 113 0 161-112 161-251 0-161-49-256-158-256Z
		P 553 M259 106c144 0 240 68 240 193 0 124-94 219-250 219H165V748H78V106ZM244 443c108 0 164-45 164-138 0-91-70-126-151-126H165V443Z
		Q 553 M553 876c-37 28-75 49-138 49-116 0-180-73-185-171C83 732 28 601 28 432 28 251 107 97 281 97c202 0 245 180 245 321 0 152-52 307-215 336 11 64 51 96 109 96 41 0 63-12 94-34ZM275 680c115 0 160-115 160-253 0-153-46-253-159-253-98 0-157 95-157 246 0 189 65 260 156 260Z
		R 553 M257 106c153 0 211 73 211 168 0 95-64 150-138 168 39 12 66 56 90 106l96 200H418L322 544c-24-51-46-82-110-82H171V748H83V106ZM243 392c84 0 133-41 133-110 0-63-39-102-120-102H171V392Z
		S 553 M448 194c-42-11-90-21-153-21-54 0-141 13-141 90 0 45 32 76 92 101l96 40c108 45 148 99 148 171 0 119-101 182-258 182-59 0-117-8-178-22V650c46 17 110 30 182 30 121 0 162-37 162-102 0-42-34-72-91-96l-95-40C136 410 62 369 62 273 62 158 174 97 299 97c66 0 101 10 149 18Z
		T 553 M42 106H511v75H321V748H232V181H42Z
		U 553 M141 106V532c0 108 45 152 136 152 96 0 136-63 136-152V106h87V532c0 133-83 225-225 225-129 0-221-52-221-225V106Z
		V 553 M101 106 278 666 458 106h93L333 748H215L2 106Z
		W 553 M105 106l32 556 35-115 73-224h61L425 662l3-98 25-458h78L488 748H374L295 521l-22-74-24 79-73 222H66L22 106Z
		X 553 M130 106 277 348 424 106H524L328 416 541 748H431L275 488 118 748H9L223 420 26 106Z
		Y 553 M106 106 231 337l50 99 41-83L453 106H553L321 518V748H232V517L0 106Z
		Z 553 M64 106H492v69L164 667H498v81H55V682L385 185H64Z
		[ 553 M169 37H412v69H251V880H412v69H169Z
		\\ 553 M79 54h81L497 854H416Z
		] 553 M141 37H384V949H141V880H301V106H141Z
		^ 553 M239 106h70L498 420H412L271 174 137 420H60Z
		_ 553 M0 878H553v71H0Z
		\` 553 M86 54H209L328 173H242Z
		a 553 M107 277c49-17 105-31 172-31 130 0 193 61 193 160V748H395l-1-66c-31 28-82 75-170 75-105 0-159-56-159-141 0-99 81-157 206-157H386V412c0-45-28-93-112-93-46 0-98 7-167 36ZM274 524c-65 0-118 24-118 89 0 46 30 73 80 73 47 0 106-33 150-75V524Z
		b 553 M79 54h85V246l-4 91c42-59 97-91 170-91 110 0 170 96 170 242 0 191-111 266-244 266-72 0-130-16-177-35Zm85 610c31 10 61 21 101 21 115 0 148-95 148-190 0-81-22-174-99-174-60 0-96 38-150 102Z
		c 553 M462 353c-37-19-77-33-132-33-84 0-163 61-163 186 0 123 69 176 164 176 62 0 100-17 131-31v79c-42 16-88 25-143 25-127 0-241-60-241-247 0-158 99-260 250-260 62 0 96 9 134 23Z
		d 553 M386 54h86V748H395l-2-94c-36 50-85 103-170 103C105 757 53 646 53 508c0-113 55-259 242-259 43 0 65 6 91 12Zm0 286c-28-11-52-20-93-20-91 0-152 48-152 188 0 114 35 176 99 176 55 0 103-56 146-115Z
		e 553 M147 529c0 93 48 157 165 157 56 0 107-9 157-21v70c-54 13-98 22-174 22-164 0-238-98-238-253 0-183 122-258 224-258 214 0 223 198 212 283Zm259-66c3-61-22-149-128-149-72 0-124 56-131 149Z
		f 553 M516 133c-154-34-231-8-231 103v91H501v71H285V748H198V398H39V327H198V243c0-130 70-231 318-183Z
		g 553 M513 255v70H434c69 91 16 261-160 261-46 0-74-7-105-23-58 79 12 97 41 98l145 5c87 3 156 49 156 123 0 101-92 165-243 165-119 0-222-33-222-128 0-58 35-90 68-114-50-24-80-101 2-188-97-106-16-324 217-269ZM269 522c143 0 143-212 0-212-141 0-141 212 0 212ZM191 735c-23 16-54 39-54 82 0 51 53 69 139 69 104 0 143-40 143-87 0-45-46-57-98-59Z
		h 553 M79 54h85V254l-3 79c36-42 80-87 160-87 102 0 154 68 154 174V748H390V432c0-62-21-112-84-112-69 0-111 72-142 100V748H79Z
		i 553 M276 183c-37 0-67-30-67-67 0-37 30-67 67-67 37 0 67 30 67 67 0 37-30 67-67 67ZM101 255H333V677H480v71H85V677H247V326H101Z
		j 553 M361 183c-37 0-67-30-67-67 0-37 30-67 67-67 37 0 67 30 67 67 0 37-30 67-67 67ZM85 255H413V737c0 221-200 249-348 192V848c172 74 261 19 261-99V326H85Z
		k 553 M89 54h86V480L397 255H509L278 482 522 748H405L175 484V748H89Z
		l 553 M101 54H333V677H480v71H85V677H247V124H101Z
		m 553 M110 255l3 94c25-54 51-103 110-103 58 0 80 40 81 107 39-90 71-107 113-107 54 0 92 41 92 136V748H430V391c0-30 2-74-31-74-28 0-48 43-84 115V748H237V393c0-50-6-76-31-76-20 0-40 20-83 114V748H44V255Z
		n 553 M155 255l3 80c47-53 86-89 162-89 108 0 155 71 155 170V748H390V429c0-65-25-109-86-109-37 0-68 12-140 101V748H79V255Z
		o 553 M281 246c183 0 227 142 227 251 0 162-98 260-236 260-160 0-227-112-227-254 0-144 83-257 236-257Zm-4 73c-66 0-144 41-144 182 0 138 69 184 144 184 96 0 143-78 143-184 0-94-36-182-143-182Z
		p 553 M154 255l6 83c32-43 79-92 170-92 90 0 170 68 170 249 0 172-105 259-242 259-32 0-64-4-94-11V949H79V255Zm10 409c31 12 66 21 97 21 106 0 152-75 152-188 0-108-33-176-101-176-46 0-89 27-148 103Z
		q 553 M472 246V949H386V763l4-105c-35 49-87 99-167 99-104 0-170-88-170-246 0-131 66-262 242-262 31 0 59 3 101 16Zm-86 93c-27-10-55-20-97-20-109 0-148 81-148 187 0 136 49 178 99 178 47 0 86-34 146-116Z
		r 553 m177 255 2 91c52-66 115-100 173-100 126 0 155 102 152 197H418c0-48-5-123-79-123-47 0-85 27-154 111V748H99V255Z
		s 553 M437 337c-155-38-254-20-254 43 0 35 14 52 129 87 115 35 157 72 157 144 0 134-172 175-380 127v-78c182 46 292 27 292-40 0-34-13-51-128-86-115-35-157-77-157-148 0-81 82-178 341-126Z
		t 553 M254 97V255H476v72H254V579c0 107 94 121 222 89v74c-220 41-307-16-307-162V327H31V255H169V119Z
		u 553 M390 255h85V748H398l-2-80c-39 42-80 89-165 89-102 0-152-63-152-176V255h85V581c0 62 30 103 85 103 62 0 99-54 141-102Z
		v 553 M423 255h94L324 748H225L32 255h98L249 576l28 84 25-77Z
		w 553 M451 255h85L464 748H360L289 543l-14-52-17 56-68 201H90L18 255h84l50 410 92-287h62l78 221 21 63Z
		x 553 M153 255 282 444 410 255H515L330 503 523 748H410L277 559 145 748H34L226 500 43 255Z
		y 553 M130 255 253 577l27 81L423 255h94L349 696C253 948 149 957 29 950V872c99 15 147-10 200-124L33 255Z
		z 553 M87 255H462v66L188 676H478v72H81V686L359 327H87Z
		{ 553 M441 106H404c-49 0-106 24-106 105V339c0 51-23 115-104 126 79 6 105 68 105 130V772c0 73 43 108 107 108h35v69H397c-141 0-180-86-180-177v-178c0-60-34-95-109-95H80V431h28c75 0 109-26 109-95V211c0-142 93-174 187-174h37Z
		| 553 M236 0h81V949H236Z
		} 553 M112 37h37c94 0 187 33 187 174V337c0 56 34 94 109 94h29v68H445c-75 0-109 26-109 95V772c0 91-39 177-180 177H112V880h35c61 0 108-31 108-108V594c0-53 19-118 104-129-85-8-104-75-104-126V212c0-78-55-106-106-106H112Z
		~ 553 M521 406v11c0 97-53 162-139 162-40 0-80-19-117-56l-28-28c-17-17-42-40-69-40-42 0-57 45-57 82v14H32V537c0-83 45-159 140-159 49 0 89 29 116 56l28 28c29 29 49 40 68 40 39 0 58-28 58-85V406Z
	`;
	// `


	constructor(scale=17,lineheight=1.4) {
		this.defscale=scale;
		this.lineheight=lineheight;
		this.loadfont(DrawFont.deffont);
	}


	loadfont(fontdef) {
		// Font format:
		//      name
		//      info
		//      scale
		//      char, width, path
		//
		// Assume height=scale.
		this.glyphs={};
		this.unknown=undefined;
		let idx=0,len=fontdef.length;
		function token(eol) {
			let c=0;
			while (idx<len && (c=fontdef.charCodeAt(idx))<=32 && c!==10) {idx++;}
			let i=idx;
			while (idx<len && fontdef.charCodeAt(idx)>eol) {idx++;}
			return fontdef.substring(i,idx);
		}
		token(10); idx++; // name
		token(10); idx++; // info
		let scale=parseFloat(token(10));
		let special={"SPC":32};
		while (idx<len) {
			idx++;
			let chr=token(32);
			if (chr.length<=0) {continue;}
			chr=special[chr]??chr.charCodeAt(0);
			let g={};
			g.width=parseInt(token(32))/scale;
			g.poly=new DrawPoly(token(10));
			let varr=g.poly.vertarr,vidx=g.poly.vertidx;
			for (let i=0;i<vidx;i++) {
				let v=varr[i];
				v.x/=scale;
				v.y/=scale;
			}
			g.poly.aabbupdate();
			this.glyphs[chr]=g;
			if (this.unknown===undefined || chr===63) {
				this.unknown=g;
			}
		}
	}


	textrect(str,scale) {
		// Returns the rectangle bounding the text.
		if (scale===undefined) {scale=this.defscale;}
		let len=str.length;
		let xpos=0,xmax=0;
		let ypos=0,lh=this.lineheight;
		let glyphs=this.glyphs;
		for (let i=0;i<len;i++) {
			let c=str.charCodeAt(i);
			let g=glyphs[c];
			if (g===undefined) {
				if (c===8) {
					// backspace
					throw "missing backspace";
				} else if (c===9) {
					// tab
					throw "missing tab";
				} else if (c===10) {
					ypos+=lh;
					xmax=xmax>xpos?xmax:xpos;
					xpos=0;
				} else if (c===13) {
					xmax=xmax>xpos?xmax:xpos;
					xpos=0;
				} else {
					g=this.unknown;
				}
				if (g===undefined) {
					continue;
				}
			}
			xpos+=g.width;
		}
		if (len>0) {
			xmax=xmax>xpos?xmax:xpos;
			ypos+=lh;
		}
		return {x:0,y:0,w:xmax*scale,h:ypos*scale};
	}

}


export class Draw {

	static Poly=DrawPoly;
	static Image=DrawImage;
	static Font=DrawFont;
	// The default context used for drawing functions.
	static def=null;


	constructor(imgw,imgh) {
		if (Draw.def===null) {Draw.def=this;}
		this.canvas   =null;
		this.ctx      =null;
		if (imgw instanceof HTMLCanvasElement) {
			let canv=imgw;
			imgw=canv.width;
			imgh=canv.height;
			this.screencanvas(canv);
		}
		// Image info
		this.img      =new DrawImage(imgw,imgh);
		this.rgba     =new Uint8ClampedArray([0,1,2,3]);
		this.rgba32   =new Uint32Array(this.rgba.buffer);
		this.rgbashift=[0,0,0,0];
		let col=this.rgba32[0];
		for (let i=0;i<32;i+=8) {this.rgbashift[(col>>>i)&255]=i;}
		this.rgba32[0]=0xffffffff;
		// State
		this.deffont  =new DrawFont();
		this.deftrans =new Transform(2);
		this.defpoly  =new DrawPoly();
		this.stack    =[];
		this.stackidx =0;
		// Rendering variables
		this.linewidth=1.0;
		this.tmptrans =new Transform(2);
		this.tmppoly  =new DrawPoly();
		this.tmpline  =[];
	}


	screencanvas(canvas) {
		if (Object.is(this.canvas,canvas)) {return;}
		this.canvas=canvas;
		this.ctx=canvas.getContext("2d");
	}


	screenflip() {
		let img=this.img;
		let imgw=img.width,imgh=img.height;
		let cdata=new Uint8ClampedArray(img.data8.buffer);
		let idata=new ImageData(cdata,imgw,imgh);
		this.ctx.putImageData(idata,0,0);
	}


	// ----------------------------------------
	// Image Information


	setimage(img) {
		if (!(img instanceof DrawImage)) {
			img=new DrawImage(img);
		}
		this.img=img;
	}


	setcolor(r,g,b,a) {
		// Accepts: int, [r,g,b,a], {r,g,b,a}
		this.rgba32[0]=this.rgbatoint(r,g,b,a);
	}


	rgbatoint(r,g,b,a) {
		// Convert an RGBA array to a int regardless of endianness.
		if (g===undefined) {
			if (r instanceof Array) {
				a=r[3]??255;b=r[2]??255;g=r[1]??255;r=r[0]??255;
			} else if (r instanceof Object) {
				a=r.a??255;b=r.b??255;g=r.g??255;r=r.r??255;
			} else {
				a=(r>>>0)&255;b=(r>>>8)&255;g=(r>>>16)&255;r>>>=24;
			}
		}
		let tmp=this.rgba32[0];
		let rgba=this.rgba;
		rgba[0]=r>0?(r<255?(r|0):255):0;
		rgba[1]=g>0?(g<255?(g|0):255):0;
		rgba[2]=b>0?(b<255?(b|0):255):0;
		rgba[3]=a>0?(a<255?(a|0):255):0;
		rgba=this.rgba32[0];
		this.rgba32[0]=tmp;
		return rgba;
	}


	inttorgba(i) {
		let rgba32=this.rgba32;
		let tmp=rgba32[0];
		rgba32[0]=i;
		let rgba=this.rgba.slice();
		rgba32[0]=tmp;
		return rgba;
	}


	// ----------------------------------------
	// State


	resetstate() {
		this.rgba32[0]=0xffffffff;
		this.deftrans.reset();
	}


	pushstate() {
		let mem=this.stack[this.stackidx++];
		if (mem===undefined) {
			mem={
				img  :null,
				rgba :null,
				trans:new Transform(2),
				poly :null,
				font :null
			};
			this.stack[this.stackidx-1]=mem;
		}
		mem.img =this.img;
		mem.rgba=this.rgba32[0];
		mem.trans.set(this.deftrans);
		mem.poly=this.defpoly;
		mem.font=this.deffont;
	}


	popstate() {
		if (this.stackidx<=0) {throw "loading null stack";}
		let mem=this.stack[--this.stackidx];
		this.img=mem.img;
		this.rgba32[0]=mem.rgba;
		this.deftrans.set(mem.trans);
		this.defpoly=mem.poly;
		this.deffont=mem.font;
	}


	settransform(trans) {return this.deftrans.set(trans);}
	gettransform() {return this.deftrans;}


	// ----------------------------------------
	// Images


	fill(r,g,b,a) {
		// Fills the current image with a solid color.
		// data32.fill(rgba) was ~25% slower during testing.
		let rgba=this.rgbatoint(r,g,b,a);
		let data32=this.img.data32;
		let i=this.img.width*this.img.height;
		while (i>7) {
			data32[--i]=rgba;
			data32[--i]=rgba;
			data32[--i]=rgba;
			data32[--i]=rgba;
			data32[--i]=rgba;
			data32[--i]=rgba;
			data32[--i]=rgba;
			data32[--i]=rgba;
		}
		while (i>0) {
			data32[--i]=rgba;
		}
	}


	drawimage(src,dx,dy,dw,dh) {
		// Draw an image with alpha blending.
		// Note << and imul() implicitly cast floor().
		let dst=this.img;
		dx=dx??0;
		let ix=Math.floor(dx),fx0=dx-ix,fx1=1-fx0;
		dy=dy??0;
		let iy=Math.floor(dy),fy0=dy-iy,fy1=1-fy0;
		let iw=(dw===undefined || dw>src.width )?src.width :ix;
		let ih=(dh===undefined || dh>src.height)?src.height:iy;
		let sx=0,sy=0;
		iw+=ix;
		if (ix<0) {sx=-ix;ix=0;}
		iw=(iw>dst.width?dst.width:iw)-ix;
		ih+=iy;
		if (iy<0) {sy=-iy;iy=0;}
		ih=(ih>dst.height?dst.height:ih)-iy;
		if (iw<=0 || ih<=0) {return;}
		let m00=Math.round(fx0*fy0*256),m01=Math.round(fx0*fy1*256);
		let m10=Math.round(fx1*fy0*256),m11=256-m00-m01-m10;
		let dstdata=dst.data32,drow=iy*dst.width+ix,dinc=dst.width-iw;
		let srcdata=src.data32,srow=sy*src.width+sx,sinc=src.width-iw;
		let ystop=drow+dst.width*ih,xstop=drow+iw;
		let amul=this.rgba[3];
		let ashift=this.rgbashift[3],namask=(~(255<<ashift))>>>0;
		let maskl=0x00ff00ff&namask,maskh=0xff00ff00&namask;
		let sw=src.width,sh=src.height;
		iw=dst.width;
		const imul=Math.imul;
		while (drow<ystop) {
			let stop0=srow+sw-sx,stop1=++sy<sh?stop0:0;
			let s10=srcdata[srow];
			let s11=srow<stop1?srcdata[srow+sw]:0;
			while (drow<xstop) {
				// Interpolate 2x2 source pixels.
				srow++;
				let s00=s10,s01=s11;
				s10=srow<stop0?srcdata[srow]:0;
				s11=srow<stop1?srcdata[srow+sw]:0;
				const m=0x00ff00ff;
				let cl=imul(s00&m,m00)+imul(s01&m,m01)+imul(s10&m,m10)+imul(s11&m,m11);
				let ch=imul((s00>>>8)&m,m00)+imul((s01>>>8)&m,m01)+imul((s10>>>8)&m,m10)+imul((s11>>>8)&m,m11);
				src=(ch&0xff00ff00)|((cl>>>8)&m);
				let sa=(src>>>ashift)&255;
				if (sa<=0) {drow++;continue;}
				// a = sa + da*(1-sa)
				// c = (sc*sa + dc*da*(1-sa)) / a
				// Approximate blending by expanding sa from [0,255] to [0,256].
				src&=namask;
				let tmp=dstdata[drow];
				let da=(tmp>>>ashift)&255;
				sa*=amul;
				da=sa*255+da*(65025-sa);
				sa=(sa*65280+(da>>>1))/da;
				da=((da+32512)/65025)<<ashift;
				let l=tmp&0x00ff00ff;
				let h=tmp&0xff00ff00;
				dstdata[drow++]=da|
					(((imul((src&m)-l,sa)>>>8)+l)&maskl)|
					((imul(((src>>>8)&m)-(h>>>8),sa)+h)&maskh);
			}
			xstop+=iw;
			drow+=dinc;
			srow+=sinc;
		}
	}


	// ----------------------------------------
	// Paths


	beginpath() {return this.defpoly.begin(...arguments);}
	closepath() {return this.defpoly.close(...arguments);}
	moveto() {return this.defpoly.moveto(...arguments);}
	lineto() {return this.defpoly.lineto(...arguments);}
	curveto() {return this.defpoly.curveto(...arguments);}


	// ----------------------------------------
	// Primitives


	drawline(x0,y0,x1,y1) {
		let poly=this.tmppoly,trans=this.deftrans;
		poly.begin();
		poly.addline(x0,y0,x1,y1,this.linewidth*0.5);
		this.fillpoly(poly,trans);
	}


	fillrect(x,y,w,h) {
		let trans=this.tmptrans.set(this.deftrans).shift([x,y]);
		let poly=this.tmppoly;
		poly.begin();
		poly.addrect(0,0,w,h);
		this.fillpoly(poly,trans);
	}


	fillcircle(x,y,rad) {
		this.filloval(x,y,rad,rad);
	}


	filloval(x,y,xrad,yrad) {
		yrad=yrad??xrad;
		let trans=this.tmptrans.set(this.deftrans).shift([x,y]);
		let poly=this.tmppoly;
		poly.begin();
		poly.addoval(0,0,xrad,yrad);
		this.fillpoly(poly,trans);
	}


	// ----------------------------------------
	// Text


	setfont(font) {this.deffont=font;}


	filltext(x,y,str,scale) {
		let font=this.deffont,glyphs=font.glyphs;
		if (scale===undefined) {scale=font.defscale;}
		let len=str.length;
		let xpos=0,ypos=0,lh=font.lineheight;
		let trans=this.tmptrans;
		trans.set(this.deftrans).scale(scale);
		for (let i=0;i<len;i++) {
			let c=str.charCodeAt(i);
			let g=glyphs[c];
			if (g===undefined) {
				if (c===8) {
					// backspace
					throw "missing backspace";
				} else if (c===9) {
					// tab
					throw "missing tab";
				} else if (c===10) {
					// EOL
					ypos+=lh;
					xpos=0;
				} else if (c===13) {
					// linefeed
					xpos=0;
				} else {
					g=font.unknown;
				}
				if (g===undefined) {
					continue;
				}
			}
			trans.vec.set(trans.mat.mul([xpos,ypos])).iadd([x,y]);
			this.fillpoly(g.poly,trans);
			xpos+=g.width;
		}
	}


	textrect(str,scale) {
		return this.deffont.textrect(str,scale);
	}


	// ----------------------------------------
	// Polygon Filling


	fillresize(size) {
		// Declaring line objects this way allows engines to optimize their structs.
		let len=this.tmpline.length;
		while (len<size) {len+=len+1;}
		while (this.tmpline.length<len) {
			this.tmpline.push({
				sort:0,
				end:0,
				x0:0,y0:0,
				x1:0,y1:0,
				x2:0,y2:0,
				x3:0,y3:0
			});
		}
		return this.tmpline;
	}


	fillpoly(poly,trans) {
		// Fills the current path.
		//
		// Preprocess the lines and curves. Use a binary heap to dynamically sort lines.
		// Keep JS as simple as possible to be efficient. Keep micro optimization in WASM.
		// ~~x = fast floor(x)
		if (poly===undefined) {poly=this.defpoly;}
		if (trans===undefined) {trans=this.deftrans;}
		else if (!(trans instanceof Transform)) {trans=new Transform(trans);}
		const curvemaxdist2=0.02;
		let iw=this.img.width,ih=this.img.height;
		let alpha=this.rgba[3]/255.0;
		if (poly.vertidx<3 || iw<1 || ih<1 || alpha<1e-4) {return;}
		// Screenspace transformation.
		let matxx=trans.mat[0],matxy=trans.mat[1],matx=trans.vec[0];
		let matyx=trans.mat[2],matyy=trans.mat[3],maty=trans.vec[1];
		// Perform a quick AABB-OBB overlap test.
		// Define the transformed bounding box.
		let bx=poly.minx,by=poly.miny;
		let bndx=bx*matxx+by*matxy+matx;
		let bndy=bx*matyx+by*matyy+maty;
		bx=poly.maxx-bx;by=poly.maxy-by;
		let bndxx=bx*matxx,bndxy=bx*matyx;
		let bndyx=by*matxy,bndyy=by*matyy;
		// Test if the image AABB has a separating axis.
		let minx=bndx-iw,maxx=bndx;
		if (bndxx<0) {minx+=bndxx;} else {maxx+=bndxx;}
		if (bndyx<0) {minx+=bndyx;} else {maxx+=bndyx;}
		if (!(minx<0 && 0<maxx)) {return;}
		let miny=bndy-ih,maxy=bndy;
		if (bndxy<0) {miny+=bndxy;} else {maxy+=bndxy;}
		if (bndyy<0) {miny+=bndyy;} else {maxy+=bndyy;}
		if (!(miny<0 && 0<maxy)) {return;}
		// Test if the poly OBB has a separating axis.
		let cross=bndxx*bndyy-bndxy*bndyx;
		minx=bndy*bndxx-bndx*bndxy;maxx=minx;
		bndxx*=ih;bndxy*=iw;
		if (cross<0) {minx+=cross;} else {maxx+=cross;}
		if (bndxx<0) {maxx-=bndxx;} else {minx-=bndxx;}
		if (bndxy<0) {minx+=bndxy;} else {maxx+=bndxy;}
		if (!(minx<0 && 0<maxx)) {return;}
		miny=bndy*bndyx-bndx*bndyy;maxy=miny;
		bndyx*=ih;bndyy*=iw;
		if (cross<0) {maxy-=cross;} else {miny-=cross;}
		if (bndyx<0) {maxy-=bndyx;} else {miny-=bndyx;}
		if (bndyy<0) {miny+=bndyy;} else {maxy+=bndyy;}
		if (!(miny<0 && 0<maxy)) {return;}
		// Loop through the path nodes.
		let lr=this.tmpline,lrcnt=lr.length,lcnt=0;
		let movex=0,movey=0,area=0;
		let p0x=0,p0y=0,p1x=0,p1y=0;
		let varr=poly.vertarr;
		let vidx=poly.vertidx;
		for (let i=0;i<=vidx;i++) {
			let v=varr[i<vidx?i:0];
			if (v.type===DrawPoly.CURVE) {v=varr[i+2];}
			p0x=p1x;p1x=v.x*matxx+v.y*matxy+matx;
			p0y=p1y;p1y=v.x*matyx+v.y*matyy+maty;
			// Add a basic line.
			let m1x=p1x,m1y=p1y;
			if (v.type===DrawPoly.MOVE) {
				// Close any unclosed subpaths.
				m1x=movex;movex=p1x;
				m1y=movey;movey=p1y;
				if (!i || (m1x===p0x && m1y===p0y)) {continue;}
			}
			if (lrcnt<=lcnt) {
				lr=this.fillresize(lcnt+1);
				lrcnt=lr.length;
			}
			let l=lr[lcnt++];
			l.sort=0;l.end=-1;
			area+=p0x*m1y-m1x*p0y;
			l.x0=p0x;
			l.y0=p0y;
			l.x1=m1x;
			l.y1=m1y;
			if (v.type!==DrawPoly.CURVE) {continue;}
			// Linear decomposition of curves.
			v=varr[i++];let n1x=v.x*matxx+v.y*matxy+matx,n1y=v.x*matyx+v.y*matyy+maty;
			v=varr[i++];let n2x=v.x*matxx+v.y*matxy+matx,n2y=v.x*matyx+v.y*matyy+maty;
			l.x2=n1x;l.x3=n2x;
			l.y2=n1y;l.y3=n2y;
			area-=((n1x-p0x)*(2*p0y-n2y-p1y)+(n2x-p0x)*(p0y+n1y-2*p1y)
				 +(p1x-p0x)*(2*n2y+n1y-3*p0y))*0.3;
			for (let j=lcnt-1;j<lcnt;j++) {
				// The curve will stay inside the bounding box of [c0,c1,c2,c3].
				// If the subcurve is outside the image, stop subdividing.
				l=lr[j];
				let c3x=l.x1,c2x=l.x3,c1x=l.x2,c0x=l.x0;
				let c3y=l.y1,c2y=l.y3,c1y=l.y2,c0y=l.y0;
				if ((c0x<=0 && c1x<=0 && c2x<=0 && c3x<=0) || (c0x>=iw && c1x>=iw && c2x>=iw && c3x>=iw) ||
				    (c0y<=0 && c1y<=0 && c2y<=0 && c3y<=0) || (c0y>=ih && c1y>=ih && c2y>=ih && c3y>=ih)) {
					continue;
				}
				let dx=c3x-c0x,dy=c3y-c0y,den=dx*dx+dy*dy;
				// Test if both control points are close to the line c0->c3.
				// Clamp to ends and filter degenerates.
				let lx=c1x-c0x,ly=c1y-c0y;
				let u=dx*lx+dy*ly;
				u=u>0?(u<den?u/den:1):0;
				lx-=dx*u;ly-=dy*u;
				let d1=lx*lx+ly*ly;
				lx=c2x-c0x;ly=c2y-c0y;
				u=dx*lx+dy*ly;
				u=u>0?(u<den?u/den:1):0;
				lx-=dx*u;ly-=dy*u;
				let d2=lx*lx+ly*ly;
				d1=(d1>d2 || !(d1===d1))?d1:d2;
				if (!(d1>curvemaxdist2 && d1<Infinity)) {continue;}
				// Split the curve in half. [c0,c1,c2,c3] = [c0,l1,l2,ph] + [ph,r1,r2,c3]
				if (lrcnt<=lcnt) {
					lr=this.fillresize(lcnt+1);
					lrcnt=lr.length;
				}
				let l1x=(c0x+c1x)*0.5,l1y=(c0y+c1y)*0.5;
				let t1x=(c1x+c2x)*0.5,t1y=(c1y+c2y)*0.5;
				let r2x=(c2x+c3x)*0.5,r2y=(c2y+c3y)*0.5;
				let l2x=(l1x+t1x)*0.5,l2y=(l1y+t1y)*0.5;
				let r1x=(t1x+r2x)*0.5,r1y=(t1y+r2y)*0.5;
				let phx=(l2x+r1x)*0.5,phy=(l2y+r1y)*0.5;
				l.x1=phx;l.x3=l2x;l.x2=l1x;
				l.y1=phy;l.y3=l2y;l.y2=l1y;
				l=lr[lcnt++];
				l.sort=0;l.end=-1;
				l.x1=c3x;l.x3=r2x;l.x2=r1x;l.x0=phx;
				l.y1=c3y;l.y3=r2y;l.y2=r1y;l.y0=phy;
				j--;
			}
		}
		// Init blending.
		let amul=area<0?-alpha:alpha;
		let ashift=this.rgbashift[3],amask=(255<<ashift)>>>0;
		let maskl=(0x00ff00ff&~amask)>>>0,maskh=(0xff00ff00&~amask)>>>0;
		let colrgb=(this.rgba32[0]|amask)>>>0;
		let coll=(colrgb&maskl)>>>0,colh=(colrgb&maskh)>>>0,colh8=colh>>>8;
		// Process the lines row by row.
		let p=0,y=0,pixels=iw*ih;
		let pnext=0,prow=0;
		let areadx1=0;
		let imgdata=this.img.data32;
		while (true) {
			if (p>=prow) {
				p=pnext;
				if (p>=pixels || lcnt<1) {break;}
				y=~~(p/iw);
				prow=y*iw+iw;
				area=0;
				areadx1=0;
			}
			let areadx2=0;
			while (p>=pnext) {
				// fx0  fx0+1                          fx1  fx1+1
				//  +-----+-----+-----+-----+-----+-----+-----+
				//  |                              .....----  |
				//  |               .....-----'''''           |
				//  | ....-----'''''                          |
				//  +-----+-----+-----+-----+-----+-----+-----+
				//   first  dyx   dyx   dyx   dyx   dyx  last   tail
				//
				// Orient upwards, then clip y to [0,1].
				let l=lr[0];
				let x0=l.x0,y0=l.y0;
				let x1=l.x1,y1=l.y1;
				let sign=amul,tmp=0;
				let end=l.end,sort=prow-iw,x=p-sort;
				l.end=-1;
				if (y0>y1) {
					sign=-sign;
					tmp=x0;x0=x1;x1=tmp;
					tmp=y0;y0=y1;y1=tmp;
				}
				let fy=y0<ih?y0:ih;
				fy=fy>y?~~fy:y;
				let dx=x1-x0,dy=y1-y0,dxy=dx/dy;
				// Use y0x for large coordinate stability.
				let y0x=x0-y0*dxy+fy*dxy;
				y0-=fy;y1-=fy;
				let nx=y1>2?y0x+2*dxy:x1;
				if (y1>1) {y1=1;x1=y0x+dxy;}
				if (y0<0) {y0=0;x0=y0x;}
				// Subtract x after normalizing to row.
				x0-=x;x1-=x;nx-=x;
				nx=nx<x1?nx:x1;
				if (x0>x1) {dx=-dx;tmp=x0;x0=x1;x1=tmp;}
				dy*=sign;let dyx=dy/dx;dy*=0.5;
				if (!(y1>0 && dyx!==0)) {
					// Above or degenerate.
					sort=pixels;
				} else if (x0>=1 || fy>y) {
					// Below or to the left.
					nx=x0;
					sort=fy*iw;
				} else if (x1<=1) {
					// Vertical line or last pixel.
					tmp=x1>0?-(x1*x1/dx)*dy:0;
					if (end<p && end>=sort) {
						areadx1+=dyx;
						area+=((x1>0?(1-x1)*(1-x1):(1-2*x1))/dx)*dy;
					} else {
						dy=(y0-y1)*sign;
						tmp=x0>=0?0.5*(x0+x1)*dy:tmp;
						area+=dy-tmp;
					}
					areadx2+=tmp;
					sort+=y1<1?pixels:iw;
				} else {
					// Spanning 2+ pixels.
					tmp=((x0>0?(1-x0)*(1-x0):(1-2*x0))/dx)*dy;
					area-=tmp;
					if (x1>=2) {
						areadx1-=dyx;
						tmp=x0>0?(x0*x0/dx)*dy:0;
						l.end=p;
					}
					areadx2+=tmp;
					nx=x1;
				}
				nx+=x;
				nx=nx<0?0:nx;
				sort+=nx<iw?~~nx:iw;
				sort=sort>p?sort:pixels;
				l.sort=sort;
				// Heap sort down.
				if (sort>=pixels) {
					let t=lr[--lcnt];
					lr[lcnt]=l;l=t;
					sort=l.sort;
				}
				let i=0,j=0;
				while ((j+=j+1)<lcnt) {
					let j1=j+1<lcnt?j+1:j;
					let l0=lr[j],l1=lr[j1];
					let s0=l0.sort,s1=l1.sort;
					if (s0>s1) {s0=s1;l0=l1;j=j1;}
					if (s0>=sort) {break;}
					lr[i]=l0;
					i=j;
				}
				lr[i]=l;
				pnext=lr[0].sort;
			}
			// Calculate how much we can draw or skip.
			const cutoff=0.00390625;
			let astop=area+areadx1+areadx2;
			let pstop=p+1,pdif=(pnext<prow?pnext:prow)-pstop;
			if (pdif>0 && (area>=cutoff)===(astop>=cutoff)) {
				let adif=(cutoff-astop)/areadx1+1;
				pdif=(adif>=1 && adif<pdif)?~~adif:pdif;
				astop+=pdif*areadx1;
				pstop+=pdif;
			}
			// Blend the pixel based on how much we're covering.
			if (area>=cutoff) {
				do {
					// a = sa + da*(1-sa)
					// c = (sc - dc)*sa/a + dc
					let sa=area<alpha?area:alpha;
					area+=areadx1+areadx2;
					areadx2=0;
					let dst=imgdata[p];
					let da=(dst>>>ashift)&255;
					if (da===255) {
						sa=256.49-sa*256;
					} else {
						let tmp=sa*255+(1-sa)*da;
						sa=256.49-(sa/tmp)*65280;
						da=tmp+0.49;
					}
					// imul() implicitly casts floor(sa).
					imgdata[p]=(da<<ashift)
						|(((Math.imul((dst&0x00ff00ff)-coll,sa)>>>8)+coll)&maskl)
						|((Math.imul(((dst>>>8)&0x00ff00ff)-colh8,sa)+colh)&maskh);
				} while (++p<pstop);
			}
			p=pstop;
			area=astop;
		}
	}


	tracepoly(poly,rad,trans) {
		return this.fillpoly(poly.trace(rad),trans);
	}

}
