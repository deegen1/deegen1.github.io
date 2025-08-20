/*------------------------------------------------------------------------------


drawing.js - v3.20

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
     all fields up front allows browsers speeds up fillpoly by 30%.
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


--------------------------------------------------------------------------------
TODO


Try to reduce size to 30kb.
	Optimize font glyphs. Use /100 or /60 instead of /1000. Optimize svg.
	33x60
	Get font down to 5kb.
	Remove GL rendering.

fillpoly
	Per-subpath color. "F" specifies colors for following segments.
	Allow for different blend modes.
	Stop segmenting subcurves if they're offscreen.
	Try F32/I32 arrays.
	Remove math.min/max.
	drawing too much:
	let x=50,y=50;
	let ang=-Math.PI*0.5,amul=-Math.PI*2*0.437600;
	let poly=new Draw.Poly();
	poly.lineto(Math.cos(ang)*20+x,Math.sin(ang)*20+y);ang+=amul;
	poly.lineto(Math.cos(ang)*20+x,Math.sin(ang)*20+y);
	poly.lineto(Math.cos(ang)*26+x,Math.sin(ang)*26+y);ang-=amul;
	poly.lineto(Math.cos(ang)*26+x,Math.sin(ang)*26+y);
	draw.setcolor(255,255,255,255);
	draw.fillpoly(poly);

DrawPoly
	Remove addstrip().
	If we call moveto(), close the previous subpath.
	normalize, scale, shift
	closestpoint(point,transform)
	pointinside(point,transform)
	Add circular arcs.

filltext/textrect
	Add backspaces and tabs.

DrawImage
	Redo setpixel, getpixel, fill, rgbatoint, etc so it's always
	(a<<24)|(r<<16)|(g<<28)|b

Rewrite article.
Use module to put everything under Draw namespace.

Tracing
	v4.0
	Limit length of sharp corners to 2x thickness.
	Rounded corners: set midpoint distance to thickness.
	For inline, go through path in reverse.
	Add traceoval, tracerect.

Tracing draft
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
		if (type===_DrawPoly.CURVE) {
			// Assume best tangents to offset points are at u=0,1/3,2/3,1.
			let pt=[p0x,p0y,c1x,c1y,c2x,c2y,p1x,p1y];
			for (let j=0;j<4;j++) {
				let u=j/3;
				let cdx=c1x+u*(2*c2x+u*3*c3x);
				let cdy=c1y+u*(2*c2y+u*3*c3y);
				let cn=1/Math.sqrt(cdx*cdx+cdy*cdy);
				cdx*=cn;
				cdy*=cn;
				pt[j*2+0]-=cdy*rad;
				pt[j*2+1]-=cdx*rad;
			}
		}
		px=x;
		py=y;
		pdx=dx;
		pdy=dy;
	}


*/
/* npx eslint drawing.js -c ../../standards/eslint.js */
/* global Transform */


//---------------------------------------------------------------------------------
// Drawing - v3.20


class _DrawPoly {

	static MOVE =0;
	static CLOSE=1;
	static LINE =2;
	static CURVE=3;


	constructor(str) {
		// Copy static variables.
		Object.assign(this,this.constructor);
		this.vertarr=new Array();
		this.begin();
		if (str) {this.fromstring(str);}
	}


	begin() {
		this.vertidx=0;
		this.moveidx=-2;
		this.aabb={minx:Infinity,maxx:-Infinity,dx:0,
		           miny:Infinity,maxy:-Infinity,dy:0};
		return this;
	}


	aabbupdate() {
		// Recompute the bounding box.
		let minx=Infinity,miny=Infinity,maxx=-Infinity,maxy=-Infinity;
		let varr=this.vertarr,vidx=this.vertidx;
		for (let i=0;i<vidx;i++) {
			let x=varr[i].x,y=varr[i].y;
			if (minx>x) {minx=x;}
			if (miny>y) {miny=y;}
			if (maxx<x) {maxx=x;}
			if (maxy<y) {maxy=y;}
		}
		this.aabb={minx:minx,maxx:maxx,dx:maxx-minx,
		           miny:miny,maxy:maxy,dy:maxy-miny};
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
		let aabb=this.aabb;
		if (aabb.minx>x) {aabb.minx=x;aabb.dx=aabb.maxx-x;}
		if (aabb.miny>y) {aabb.miny=y;aabb.dy=aabb.maxy-y;}
		if (aabb.maxx<x) {aabb.maxx=x;aabb.dx=x-aabb.minx;}
		if (aabb.maxy<y) {aabb.maxy=y;aabb.dy=y-aabb.miny;}
		return v;
	}


	moveto(x,y) {
		// Move the pen to [x,y].
		if (this.moveidx===this.vertidx-1) {this.vertidx--;}
		else {this.moveidx=this.vertidx;}
		this.addvert(this.MOVE,x,y);
		return this;
	}


	lineto(x,y) {
		// Draw a line from the last vertex to [x,y].
		// If no moveto() was ever called, behave as moveto().
		if (this.moveidx<0) {return this.moveto(x,y);}
		this.addvert(this.LINE,x,y);
		return this;
	}


	curveto(x0,y0,x1,y1,x2,y2) {
		// Draw a cubic bezier curve.
		if (this.moveidx<0) {this.moveto(0,0);}
		this.addvert(this.CURVE,x0,y0);
		this.addvert(this.CURVE,x1,y1);
		this.addvert(this.CURVE,x2,y2);
		return this;
	}


	close() {
		// Draw a line from the current vertex to our last moveto() call.
		let move=this.moveidx;
		if (move<0) {return this;}
		if (move===this.vertidx-1) {
			this.vertidx--;
			return this;
		}
		let m=this.vertarr[move];
		m.i=this.vertidx;
		this.addvert(this.CLOSE,m.x,m.y);
		this.moveidx=-2;
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
			if (t!==this.CLOSE) {
				ret+=tostring(v.x)+" "+tostring(v.y);
			}
			if (t===this.CURVE) {
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
		let type=2,rel=0,len=str.length,i=0,c;
		let params=[0,3,3,1,2,63],v=[0,0,0,0,0,0],off=[0,0];
		function gc() {c=i<len?str.charCodeAt(i++):255;}
		gc();
		while (i<len) {
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


	addstrip(points) {
		// Assumes a loop of [x0,y0,x1,y1,...] where every pair is a separate line.
		let len=points.length;
		if (len<=0 || (len%2)!==0) {return;}
		this.moveto(points[0],points[1]);
		for (let i=2;i<len;i+=2) {
			this.lineto(points[i],points[i+1]);
		}
		this.close();
		return this;
	}


	// addpoly(poly,trans) {
	// 	return this;
	// }


	addline(x0,y0,x1,y1,rad) {
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
		const a=1.00005519,b=0.55342686,c=0.99873585;
		let ax=a*dx,ay=a*dy;
		let bx=b*dx,cy=c*dy,c0=bx-cy,c3=bx+cy;
		let cx=c*dx,by=b*dy,c1=cx+by,c2=cx-by;
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
		this.addstrip([x,y,x+w,y,x+w,y+h,x,y+h]);
		return this;
	}


	addoval(x,y,xrad,yrad) {
		// David Ellsworth and Spencer Mortensen constants.
		yrad=yrad??xrad;
		const a=1.00005519,b=0.55342686,c=0.99873585;
		let ax=-a*xrad,ay=a*yrad;
		let bx=-b*xrad,by=b*yrad;
		let cx=-c*xrad,cy=c*yrad;
		this.moveto(x,y+ay);
		this.curveto(x+bx,y+cy,x+cx,y+by,x+ax,y   );
		this.curveto(x+cx,y-by,x+bx,y-cy,x   ,y-ay);
		this.curveto(x-bx,y-cy,x-cx,y-by,x-ax,y   );
		this.curveto(x-cx,y+by,x-bx,y+cy,x   ,y+ay);
		return this;
	}


	trace(rad) {
		throw "not implemented "+rad;
		// Curve offseting. Project out based on tangent.
	}

}


class _DrawImage {
	// Pixel data is in R, G, B, A, R, G, B, A,... format.

	constructor(width,height) {
		let srcdata=null;
		if (height===undefined) {
			let img=width;
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


class _DrawFont {

	static deffont=`monospace
		none
		1000
		SPC 553
		█ 553 M 0 0 L 553 0 L 553 1000 L 0 1000 Z
		! 553 M 224 54 L 327 54 L 314 560 L 238 560 Z M 275 757 C 239 757 210 728 210 692 C 210 656 239 627 275 627 C 311 627 340 656 340 692 C 340 728 311 757 275 757
		" 553 M 127 54 L 235 54 L 221 284 L 141 284 Z M 318 54 L 426 54 L 412 284 L 332 284 Z
		# 553 M 173 106 L 244 106 L 228 268 L 354 268 L 371 106 L 443 106 L 426 268 L 532 268 L 532 332 L 420 332 L 403 504 L 506 504 L 506 568 L 396 568 L 378 748 L 306 748 L 324 568 L 198 568 L 180 748 L 108 748 L 126 568 L 21 568 L 21 504 L 132 504 L 150 332 L 46 332 L 46 268 L 156 268 Z M 222 332 L 205 504 L 331 504 L 348 332 Z
		$ 553 M 291 14 L 362 14 L 349 109 C 384 113 421 118 448 125 L 448 200 C 419 193 376 184 340 182 L 312 392 C 408 429 493 472 493 569 C 493 691 386 740 264 747 L 248 864 L 177 864 L 193 747 C 149 743 103 738 55 726 L 55 645 C 102 660 152 670 204 671 L 232 450 C 150 420 59 378 59 277 C 59 190 139 113 279 107 Z M 269 181 C 188 187 151 220 151 270 C 151 319 188 342 244 365 Z M 275 671 C 358 667 401 632 401 576 C 401 513 342 496 300 477 Z
		% 553 M 462 54 L 543 54 L 90 748 L 10 748 Z M 404 755 C 324 755 271 708 271 606 C 271 532 322 461 404 461 C 491 461 536 518 536 606 C 536 686 484 755 404 755 M 403 693 C 437 693 463 662 463 606 C 463 559 446 523 404 523 C 365 523 344 560 344 606 C 344 671 370 693 403 693 M 150 341 C 70 341 18 294 18 192 C 18 118 68 47 150 47 C 237 47 282 104 282 192 C 282 272 230 341 150 341 M 149 279 C 183 279 209 248 209 192 C 209 145 192 109 150 109 C 112 109 90 148 90 192 C 90 257 116 279 149 279
		& 553 M 396 553 C 407 521 419 472 417 413 L 503 413 C 503 481 495 548 454 624 L 553 748 L 440 748 L 397 694 C 354 729 302 755 226 755 C 101 755 28 683 28 574 C 28 480 81 424 149 384 C 114 338 84 296 84 231 C 84 117 165 68 256 68 C 347 68 416 120 416 211 C 416 297 358 346 270 395 Z M 227 341 C 267 316 329 287 329 218 C 329 169 300 140 253 140 C 199 140 172 177 172 223 C 172 277 204 312 227 341 M 193 439 C 159 462 117 498 117 565 C 117 637 166 682 236 682 C 281 682 316 666 349 634 Z
		' 553 M 221 54 L 333 54 L 319 284 L 234 284 Z
		( 553 M 426 68 C 313 176 235 317 235 484 C 235 648 310 788 425 901 L 373 954 C 254 841 147 692 147 484 C 147 277 266 117 376 17 Z
		) 553 M 180 17 C 294 124 406 276 406 481 C 406 675 312 830 177 953 L 128 903 C 236 794 318 667 318 481 C 318 319 235 172 128 70 Z
		* 553 M 241 54 L 312 54 L 299 222 L 439 128 L 473 188 L 321 263 L 472 336 L 439 394 L 300 302 L 312 471 L 241 471 L 253 302 L 112 394 L 81 337 L 232 262 L 81 186 L 114 129 L 254 222 Z
		+ 553 M 234 244 L 319 244 L 319 443 L 512 443 L 512 518 L 319 518 L 319 718 L 234 718 L 234 518 L 41 518 L 41 443 L 234 443 Z
		, 553 M 117 849 C 156 850 246 836 246 765 C 246 712 200 706 200 653 C 200 621 225 590 266 590 C 311 590 354 625 354 707 C 354 824 267 916 117 916 Z
		- 553 M 130 441 L 423 441 L 423 521 L 130 521 Z
		. 553 M 273 757 C 228 757 191 720 191 675 C 191 630 228 593 273 593 C 318 593 355 630 355 675 C 355 720 318 757 273 757
		/ 553 M 393 54 L 475 54 L 138 854 L 56 854 Z
		0 553 M 281 97 C 427 97 510 212 510 418 C 510 652 414 757 271 757 C 126 757 43 647 43 418 C 43 235 122 97 281 97 M 403 283 C 391 233 351 170 277 170 C 167 170 118 296 132 484 Z M 148 567 C 172 653 223 684 277 684 C 384 684 438 556 420 363 Z
		1 553 M 271 103 L 346 103 L 346 668 L 490 668 L 490 748 L 86 748 L 86 668 L 252 668 L 252 199 L 98 283 L 66 210 Z
		2 553 M 75 181 C 119 141 165 97 270 97 C 391 97 461 178 461 282 C 461 413 376 477 183 667 L 495 667 L 495 748 L 72 748 L 72 672 C 307 432 368 401 368 290 C 368 153 221 135 122 237 Z
		3 553 M 98 122 C 147 106 194 97 243 97 C 351 97 452 136 452 254 C 452 327 418 374 346 408 C 401 416 483 463 483 554 C 483 680 373 757 201 757 C 155 757 116 753 81 749 L 81 672 C 120 677 157 683 208 683 C 324 683 394 647 394 561 C 394 477 305 452 250 452 L 159 452 L 159 382 L 245 382 C 291 382 362 353 362 268 C 362 192 298 135 98 197 Z
		4 553 M 295 106 L 418 106 L 418 531 L 527 531 L 527 606 L 418 606 L 418 748 L 330 748 L 330 606 L 21 606 L 21 531 Z M 330 531 L 330 188 L 106 531 Z
		5 553 M 99 106 L 444 106 L 444 180 L 179 180 L 179 361 L 244 361 C 407 361 479 436 479 543 C 479 674 355 757 210 757 C 166 757 129 753 87 748 L 87 671 C 130 680 170 683 215 683 C 348 683 387 608 387 548 C 387 464 317 434 224 434 L 99 434 Z
		6 553 M 453 181 L 381 181 C 248 181 154 244 149 393 C 206 361 264 353 304 353 C 434 353 503 431 503 542 C 503 646 432 757 277 757 C 139 757 60 670 60 470 C 60 225 176 106 380 106 L 453 106 Z M 149 464 C 149 633 197 687 285 687 C 361 687 414 635 414 548 C 414 473 376 422 292 422 C 248 422 203 435 149 465
		7 553 M 57 106 L 491 106 L 491 186 L 222 748 L 125 748 L 404 185 L 57 185 Z
		8 553 M 281 97 C 418 97 481 159 481 251 C 481 338 419 380 361 412 C 450 458 495 506 495 587 C 495 695 401 757 273 757 C 157 757 58 708 58 597 C 58 504 120 458 193 419 C 90 365 72 306 72 257 C 72 171 144 97 281 97 M 284 375 C 354 341 393 308 393 254 C 393 196 351 168 278 168 C 209 168 160 192 160 251 C 160 317 224 345 284 375 M 270 456 C 193 493 151 530 151 589 C 151 647 197 684 277 684 C 359 684 402 647 402 592 C 402 528 345 489 270 456
		9 553 M 89 748 L 89 673 L 146 673 C 321 673 396 602 403 461 C 361 482 317 501 242 501 C 129 501 49 432 49 309 C 49 184 146 97 272 97 C 439 97 492 233 492 390 C 492 670 339 748 141 748 Z M 403 389 C 403 269 380 167 268 167 C 179 167 139 230 139 304 C 139 396 191 432 258 432 C 317 432 368 412 403 389
		: 553 M 277 757 C 235 757 202 724 202 682 C 202 640 235 607 277 607 C 319 607 352 640 352 682 C 352 724 319 757 277 757 M 277 396 C 235 396 202 363 202 321 C 202 279 235 246 277 246 C 319 246 352 279 352 321 C 352 363 319 396 277 396
		; 553 M 277 396 C 235 396 202 363 202 321 C 202 279 235 246 277 246 C 319 246 352 279 352 321 C 352 363 319 396 277 396 M 123 849 C 162 850 252 836 252 765 C 252 712 206 706 206 653 C 206 621 231 590 272 590 C 317 590 360 625 360 707 C 360 824 273 916 123 916 Z
		< 553 M 398 205 L 451 259 L 184 480 L 451 701 L 398 755 L 68 480 Z
		= 553 M 65 359 L 488 359 L 488 431 L 65 431 Z M 65 530 L 488 530 L 488 602 L 65 602 Z
		> 553 M 156 204 L 485 480 L 156 756 L 103 702 L 370 481 L 103 260 Z
		? 553 M 149 54 C 340 49 453 158 453 274 C 453 358 411 432 280 439 L 277 560 L 203 560 L 197 372 L 255 372 C 289 372 360 368 360 280 C 360 171 254 128 149 131 Z M 239 757 C 203 757 174 728 174 692 C 174 656 203 627 239 627 C 275 627 304 656 304 692 C 304 728 275 757 239 757
		@ 553 M 423 292 L 384 544 C 371 628 380 653 406 653 C 452 653 477 556 477 405 C 477 215 428 108 317 108 C 182 108 74 320 74 580 C 74 829 173 891 249 891 C 322 891 357 878 416 852 L 416 915 C 363 937 325 952 249 952 C 55 952 5 771 5 579 C 5 258 145 48 321 48 C 442 48 546 128 546 405 C 546 587 503 717 399 717 C 357 717 323 699 323 644 C 294 701 266 717 231 717 C 164 717 138 666 138 572 C 138 433 190 294 299 294 C 330 294 342 299 359 307 Z M 333 373 C 320 360 311 357 298 357 C 238 357 216 489 216 559 C 216 621 220 653 244 653 C 263 653 276 637 291 607 L 301 587 Z
		A 553 M 338 106 L 548 748 L 453 748 L 408 607 L 141 607 L 95 748 L 5 748 L 218 106 Z M 166 530 L 383 530 L 275 186 Z
		B 553 M 261 106 C 369 106 476 134 476 262 C 476 333 444 383 370 407 C 457 425 499 483 499 556 C 499 683 392 748 253 748 L 78 748 L 78 106 Z M 165 380 L 259 380 C 330 380 385 345 385 275 C 385 199 327 180 257 180 L 165 180 Z M 165 674 L 262 674 C 355 674 406 638 406 562 C 406 488 339 453 262 453 L 165 453 Z
		C 553 M 489 214 C 438 189 393 175 337 175 C 193 175 138 300 138 423 C 138 606 218 678 336 678 C 404 678 433 665 489 642 L 489 725 C 444 741 401 756 328 756 C 122 756 45 622 45 423 C 45 251 136 98 337 98 C 401 98 445 111 489 128 Z
		D 553 M 223 106 C 475 106 517 277 517 417 C 517 676 363 748 197 748 L 54 748 L 54 106 Z M 208 672 C 344 672 425 602 425 417 C 425 255 364 180 216 180 L 141 180 L 141 672 Z
		E 553 M 464 106 L 464 180 L 186 180 L 186 378 L 453 378 L 453 452 L 186 452 L 186 673 L 464 673 L 464 748 L 99 748 L 99 106 Z
		F 553 M 463 106 L 463 181 L 190 181 L 190 389 L 449 389 L 449 462 L 190 462 L 190 748 L 101 748 L 101 106 Z
		G 553 M 494 215 C 456 196 409 175 338 175 C 201 175 124 279 124 426 C 124 580 181 679 326 679 C 357 679 383 676 411 666 L 411 462 L 279 462 L 279 390 L 497 390 L 497 718 C 449 740 389 757 317 757 C 121 757 32 625 32 426 C 32 229 152 97 338 97 C 402 97 453 110 494 128 Z
		H 553 M 412 106 L 499 106 L 499 748 L 412 748 L 412 453 L 142 453 L 142 748 L 55 748 L 55 106 L 142 106 L 142 377 L 412 377 Z
		I 553 M 84 106 L 469 106 L 469 180 L 321 180 L 321 673 L 469 673 L 469 748 L 84 748 L 84 673 L 232 673 L 232 180 L 84 180 Z
		J 553 M 98 106 L 431 106 L 431 546 C 431 678 351 755 232 755 C 166 755 112 734 90 719 L 90 631 C 113 649 171 679 229 679 C 306 679 342 628 342 552 L 342 182 L 98 182 Z
		K 553 M 77 106 L 164 106 L 164 404 L 399 106 L 503 106 L 249 411 L 514 748 L 404 748 L 164 433 L 164 748 L 77 748 Z
		L 553 M 114 106 L 203 106 L 203 673 L 484 673 L 484 748 L 114 748 Z
		M 553 M 55 106 L 159 106 L 274 429 L 301 346 L 392 106 L 498 106 L 529 748 L 444 748 L 425 196 L 396 281 L 301 539 L 240 539 L 149 291 L 120 196 L 118 353 L 107 748 L 24 748 Z
		N 553 M 58 106 L 171 106 L 346 479 L 414 633 L 414 106 L 495 106 L 495 748 L 381 748 L 193 345 L 140 218 L 140 748 L 58 748 Z
		O 553 M 281 97 C 451 97 526 228 526 420 C 526 643 421 757 272 757 C 76 757 28 592 28 423 C 28 250 107 97 281 97 M 277 174 C 173 174 119 277 119 420 C 119 599 177 681 274 681 C 387 681 435 569 435 430 C 435 269 386 174 277 174
		P 553 M 259 106 C 403 106 499 174 499 299 C 499 423 405 518 249 518 L 165 518 L 165 748 L 78 748 L 78 106 Z M 244 443 C 352 443 408 398 408 305 C 408 214 338 179 257 179 L 165 179 L 165 443 Z
		Q 553 M 553 876 C 516 904 478 925 415 925 C 299 925 235 852 230 754 C 83 732 28 601 28 432 C 28 251 107 97 281 97 C 483 97 526 277 526 418 C 526 570 474 725 311 754 C 322 818 362 850 420 850 C 461 850 483 838 514 816 Z M 275 680 C 390 680 435 565 435 427 C 435 274 389 174 276 174 C 178 174 119 269 119 420 C 119 609 184 680 275 680
		R 553 M 257 106 C 410 106 468 179 468 274 C 468 369 404 424 330 442 C 369 454 396 498 420 548 L 516 748 L 418 748 L 322 544 C 298 493 276 462 212 462 L 171 462 L 171 748 L 83 748 L 83 106 Z M 243 392 C 327 392 376 351 376 282 C 376 219 337 180 256 180 L 171 180 L 171 392 Z
		S 553 M 448 194 C 406 183 358 173 295 173 C 241 173 154 186 154 263 C 154 308 186 339 246 364 L 342 404 C 450 449 490 503 490 575 C 490 694 389 757 232 757 C 173 757 115 749 54 735 L 54 650 C 100 667 164 680 236 680 C 357 680 398 643 398 578 C 398 536 364 506 307 482 L 212 442 C 136 410 62 369 62 273 C 62 158 174 97 299 97 C 365 97 400 107 448 115 Z
		T 553 M 42 106 L 511 106 L 511 181 L 321 181 L 321 748 L 232 748 L 232 181 L 42 181 Z
		U 553 M 141 106 L 141 532 C 141 640 186 684 277 684 C 373 684 413 621 413 532 L 413 106 L 500 106 L 500 532 C 500 665 417 757 275 757 C 146 757 54 705 54 532 L 54 106 Z
		V 553 M 101 106 L 278 666 L 458 106 L 551 106 L 333 748 L 215 748 L 2 106 Z
		W 553 M 105 106 L 137 662 L 172 547 L 245 323 L 306 323 L 425 662 L 428 564 L 453 106 L 531 106 L 488 748 L 374 748 L 295 521 L 273 447 L 249 526 L 176 748 L 66 748 L 22 106 Z
		X 553 M 130 106 L 277 348 L 424 106 L 524 106 L 328 416 L 541 748 L 431 748 L 275 488 L 118 748 L 9 748 L 223 420 L 26 106 Z
		Y 553 M 106 106 L 231 337 L 281 436 L 322 353 L 453 106 L 553 106 L 321 518 L 321 748 L 232 748 L 232 517 L 0 106 Z
		Z 553 M 64 106 L 492 106 L 492 175 L 164 667 L 498 667 L 498 748 L 55 748 L 55 682 L 385 185 L 64 185 Z
		[ 553 M 169 37 L 412 37 L 412 106 L 251 106 L 251 880 L 412 880 L 412 949 L 169 949 Z
		\\ 553 M 79 54 L 160 54 L 497 854 L 416 854 Z
		] 553 M 141 37 L 384 37 L 384 949 L 141 949 L 141 880 L 301 880 L 301 106 L 141 106 Z
		^ 553 M 239 106 L 309 106 L 498 420 L 412 420 L 271 174 L 137 420 L 60 420 Z
		_ 553 M 0 878 L 553 878 L 553 949 L 0 949 Z
		\` 553 M 86 54 L 209 54 L 328 173 L 242 173 Z
		a 553 M 107 277 C 156 260 212 246 279 246 C 409 246 472 307 472 406 L 472 748 L 395 748 L 394 682 C 363 710 312 757 224 757 C 119 757 65 701 65 616 C 65 517 146 459 271 459 L 386 459 L 386 412 C 386 367 358 319 274 319 C 228 319 176 326 107 355 Z M 274 524 C 209 524 156 548 156 613 C 156 659 186 686 236 686 C 283 686 342 653 386 611 L 386 524 Z
		b 553 M 79 54 L 164 54 L 164 246 L 160 337 C 202 278 257 246 330 246 C 440 246 500 342 500 488 C 500 679 389 754 256 754 C 184 754 126 738 79 719 Z M 164 664 C 195 674 225 685 265 685 C 380 685 413 590 413 495 C 413 414 391 321 314 321 C 254 321 218 359 164 423 Z
		c 553 M 462 353 C 425 334 385 320 330 320 C 246 320 167 381 167 506 C 167 629 236 682 331 682 C 393 682 431 665 462 651 L 462 730 C 420 746 374 755 319 755 C 192 755 78 695 78 508 C 78 350 177 248 328 248 C 390 248 424 257 462 271 Z
		d 553 M 386 54 L 472 54 L 472 748 L 395 748 L 393 654 C 357 704 308 757 223 757 C 105 757 53 646 53 508 C 53 395 108 249 295 249 C 338 249 360 255 386 261 Z M 386 340 C 358 329 334 320 293 320 C 202 320 141 368 141 508 C 141 622 176 684 240 684 C 295 684 343 628 386 569 Z
		e 553 M 147 529 C 147 622 195 686 312 686 C 368 686 419 677 469 665 L 469 735 C 415 748 371 757 295 757 C 131 757 57 659 57 504 C 57 321 179 246 281 246 C 495 246 504 444 493 529 Z M 406 463 C 409 402 384 314 278 314 C 206 314 154 370 147 463 Z
		f 553 M 516 133 C 480 126 448 119 399 119 C 333 119 285 152 285 236 L 285 327 L 501 327 L 501 398 L 285 398 L 285 748 L 198 748 L 198 398 L 39 398 L 39 327 L 198 327 L 198 243 C 198 113 271 48 400 48 C 450 48 478 53 516 60 Z
		g 553 M 513 255 L 513 325 L 434 325 C 446 341 463 369 463 413 C 463 522 377 586 271 586 C 228 586 200 579 169 563 C 159 579 147 593 147 616 C 147 645 181 660 210 661 L 355 666 C 442 669 511 715 511 789 C 511 890 419 954 268 954 C 149 954 46 921 46 826 C 46 768 81 736 114 712 C 96 705 65 678 65 631 C 65 591 84 561 116 524 C 89 492 76 463 76 418 C 76 318 153 246 269 246 C 300 246 317 250 334 255 Z M 269 522 C 335 522 376 474 376 416 C 376 365 343 310 269 310 C 227 310 163 338 163 416 C 163 500 233 522 269 522 M 191 735 C 168 751 137 773 137 817 C 137 876 213 886 276 886 C 381 886 419 845 419 799 C 419 754 373 742 321 740 Z
		h 553 M 79 54 L 164 54 L 164 254 L 161 333 C 197 291 241 246 321 246 C 423 246 475 314 475 420 L 475 748 L 390 748 L 390 432 C 390 370 369 320 306 320 C 237 320 195 392 164 420 L 164 748 L 79 748 Z
		i 553 M 276 183 C 239 183 209 153 209 116 C 209 79 239 49 276 49 C 313 49 343 79 343 116 C 343 153 313 183 276 183 M 101 255 L 333 255 L 333 677 L 480 677 L 480 748 L 85 748 L 85 677 L 247 677 L 247 326 L 101 326 Z
		j 553 M 361 183 C 324 183 294 153 294 116 C 294 79 324 49 361 49 C 398 49 428 79 428 116 C 428 153 398 183 361 183 M 85 255 L 413 255 L 413 737 C 413 891 316 954 199 954 C 151 954 106 946 65 929 L 65 848 C 120 874 171 882 205 882 C 288 882 326 821 326 749 L 326 326 L 85 326 Z
		k 553 M 89 54 L 175 54 L 175 480 L 397 255 L 509 255 L 278 482 L 522 748 L 405 748 L 175 484 L 175 748 L 89 748 Z
		l 553 M 101 54 L 333 54 L 333 677 L 480 677 L 480 748 L 85 748 L 85 677 L 247 677 L 247 124 L 101 124 Z
		m 553 M 110 255 L 113 349 C 138 295 164 246 223 246 C 281 246 303 286 304 353 C 343 263 375 246 417 246 C 471 246 509 287 509 382 L 509 748 L 430 748 L 430 391 C 430 361 432 317 399 317 C 371 317 351 360 315 432 L 315 748 L 237 748 L 237 393 C 237 343 231 317 206 317 C 186 317 166 337 123 431 L 123 748 L 44 748 L 44 255 Z
		n 553 M 155 255 L 158 335 C 205 282 244 246 320 246 C 428 246 475 317 475 416 L 475 748 L 390 748 L 390 429 C 390 364 365 320 304 320 C 267 320 236 332 164 421 L 164 748 L 79 748 L 79 255 Z
		o 553 M 281 246 C 464 246 508 388 508 497 C 508 659 410 757 272 757 C 112 757 45 645 45 503 C 45 359 128 246 281 246 M 277 319 C 211 319 133 360 133 501 C 133 639 202 685 277 685 C 373 685 420 607 420 501 C 420 407 384 319 277 319
		p 553 M 154 255 L 160 338 C 192 295 239 246 330 246 C 420 246 500 314 500 495 C 500 667 395 754 258 754 C 226 754 194 750 164 743 L 164 949 L 79 949 L 79 255 Z M 164 664 C 195 676 230 685 261 685 C 367 685 413 610 413 497 C 413 389 380 321 312 321 C 266 321 223 348 164 424 Z
		q 553 M 472 246 L 472 949 L 386 949 L 386 763 L 390 658 C 355 707 303 757 223 757 C 119 757 53 669 53 511 C 53 380 119 249 295 249 C 326 249 354 252 396 265 Z M 386 339 C 359 329 331 319 289 319 C 180 319 141 400 141 506 C 141 642 190 684 240 684 C 287 684 326 650 386 568 Z
		r 553 M 177 255 L 179 346 C 231 280 294 246 352 246 C 478 246 507 348 504 443 L 418 443 C 418 395 413 320 339 320 C 292 320 254 347 185 431 L 185 748 L 99 748 L 99 255 Z
		s 553 M 437 337 C 389 326 354 317 297 317 C 231 317 183 336 183 380 C 183 415 197 432 312 467 C 427 502 469 539 469 611 C 469 713 369 757 256 757 C 201 757 143 751 89 738 L 89 660 C 136 671 189 685 255 685 C 338 685 381 664 381 620 C 381 586 368 569 253 534 C 138 499 96 457 96 386 C 96 299 182 246 297 246 C 365 246 395 254 437 260 Z
		t 553 M 254 97 L 254 255 L 476 255 L 476 327 L 254 327 L 254 579 C 254 656 305 683 366 683 C 415 683 440 675 476 668 L 476 742 C 438 749 412 755 352 755 C 215 755 169 686 169 580 L 169 327 L 31 327 L 31 255 L 169 255 L 169 119 Z
		u 553 M 390 255 L 475 255 L 475 748 L 398 748 L 396 668 C 357 710 316 757 231 757 C 129 757 79 694 79 581 L 79 255 L 164 255 L 164 581 C 164 643 194 684 249 684 C 311 684 348 630 390 582 Z
		v 553 M 423 255 L 517 255 L 324 748 L 225 748 L 32 255 L 130 255 L 249 576 L 277 660 L 302 583 Z
		w 553 M 451 255 L 536 255 L 464 748 L 360 748 L 289 543 L 275 491 L 258 547 L 190 748 L 90 748 L 18 255 L 102 255 L 152 665 L 244 378 L 306 378 L 384 599 L 405 662 Z
		x 553 M 153 255 L 282 444 L 410 255 L 515 255 L 330 503 L 523 748 L 410 748 L 277 559 L 145 748 L 34 748 L 226 500 L 43 255 Z
		y 553 M 130 255 L 253 577 L 280 658 L 423 255 L 517 255 L 349 696 C 253 948 149 957 29 950 L 29 872 C 128 887 176 862 229 748 L 33 255 Z
		z 553 M 87 255 L 462 255 L 462 321 L 188 676 L 478 676 L 478 748 L 81 748 L 81 686 L 359 327 L 87 327 Z
		{ 553 M 441 106 L 404 106 C 355 106 298 130 298 211 L 298 339 C 298 390 275 454 194 465 C 273 471 299 533 299 595 L 299 772 C 299 845 342 880 406 880 L 441 880 L 441 949 L 397 949 C 256 949 217 863 217 772 L 217 594 C 217 534 183 499 108 499 L 80 499 L 80 431 L 108 431 C 183 431 217 405 217 336 L 217 211 C 217 69 310 37 404 37 L 441 37 Z
		| 553 M 236 0 L 317 0 L 317 949 L 236 949 Z
		} 553 M 112 37 L 149 37 C 243 37 336 70 336 211 L 336 337 C 336 393 370 431 445 431 L 474 431 L 474 499 L 445 499 C 370 499 336 525 336 594 L 336 772 C 336 863 297 949 156 949 L 112 949 L 112 880 L 147 880 C 208 880 255 849 255 772 L 255 594 C 255 541 274 476 359 465 C 274 457 255 390 255 339 L 255 212 C 255 134 200 106 149 106 L 112 106 Z
		~ 553 M 521 406 L 521 417 C 521 514 468 579 382 579 C 342 579 302 560 265 523 L 237 495 C 220 478 195 455 168 455 C 126 455 111 500 111 537 L 111 551 L 32 551 L 32 537 C 32 454 77 378 172 378 C 221 378 261 407 288 434 L 316 462 C 345 491 365 502 384 502 C 423 502 442 474 442 417 L 442 406 Z
	`;
	// `


	constructor(scale=17,lineheight=1.4) {
		this.defscale=scale;
		this.lineheight=lineheight;
		this.loadfont(this.constructor.deffont);
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
			let c;
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
			g.poly=new Draw.Poly(token(10));
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


class Draw {

	// Put these under the Draw namespace.
	static Poly     =_DrawPoly;
	static Font     =_DrawFont;
	static Image    =_DrawImage;


	// The default context used for drawing functions.
	static def=null;


	constructor(width,height) {
		let con=this.constructor;
		Object.assign(this,con);
		if (con.def===null) {con.def=this;}
		this.canvas   =null;
		this.ctxgl    =null;
		this.ctx2d    =null;
		// Image info
		this.img      =new con.Image(width,height);
		this.rgba     =new Uint8ClampedArray([0,1,2,3]);
		this.rgba32   =new Uint32Array(this.rgba.buffer);
		this.rgbashift=[0,0,0,0];
		let col=this.rgba32[0];
		for (let i=0;i<32;i+=8) {this.rgbashift[(col>>>i)&255]=i;}
		this.rgba32[0]=0xffffffff;
		// State
		this.deffont  =new con.Font();
		this.deftrans =new Transform(2);
		this.defpoly  =new con.Poly();
		this.stack    =[];
		this.stackidx =0;
		// Rendering variables
		this.linewidth=1.0;
		this.tmptrans =new Transform(2);
		this.tmppoly  =new con.Poly();
		this.tmpline  =[];
	}


	screencanvas(canvas) {
		// Rendering to a webgl texture is faster in firefox. Otherwise use 2d.
		if (Object.is(this.canvas,canvas)) {return;}
		this.canvas=canvas;
		try {
			let ctx=canvas.getContext("webgl2");
			let vs=ctx.createShader(ctx.VERTEX_SHADER);
			ctx.shaderSource(vs,`#version 300 es
				in vec2 a_position;
				in vec2 a_texcoord;
				out vec2 v_texcoord;
				void main() {
					gl_Position=vec4(a_position,0,1);
					v_texcoord=a_texcoord;
				}
			`);
			ctx.compileShader(vs);
			let fs=ctx.createShader(ctx.FRAGMENT_SHADER);
			ctx.shaderSource(fs,`#version 300 es
				precision highp float;
				in vec2 v_texcoord;
				uniform sampler2D u_texture;
				out vec4 outColor;
				void main() {
					outColor=texture(u_texture,v_texcoord);
				}
			`);
			ctx.compileShader(fs);
			let prog=ctx.createProgram();
			ctx.attachShader(prog,vs);
			ctx.attachShader(prog,fs);
			ctx.linkProgram(prog);
			ctx.useProgram(prog);
			let tex=ctx.createTexture();
			ctx.bindTexture(ctx.TEXTURE_2D,tex);
			ctx.texParameteri(ctx.TEXTURE_2D,ctx.TEXTURE_MIN_FILTER,ctx.NEAREST);
			ctx.texParameteri(ctx.TEXTURE_2D,ctx.TEXTURE_WRAP_S,ctx.CLAMP_TO_EDGE);
			ctx.texParameteri(ctx.TEXTURE_2D,ctx.TEXTURE_WRAP_T,ctx.CLAMP_TO_EDGE);
			let attrs=[
				{var:"a_position",arr:[-1,-1,-1,1,1,1,1,-1]},
				{var:"a_texcoord",arr:[0,1,0,0,1,0,1,1]}
			];
			for (let attr of attrs) {
				let buf=ctx.createBuffer();
				let loc=ctx.getAttribLocation(prog,attr.var);
				ctx.enableVertexAttribArray(loc);
				ctx.bindBuffer(ctx.ARRAY_BUFFER,buf);
				ctx.bufferData(ctx.ARRAY_BUFFER,new Float32Array(attr.arr),ctx.STATIC_DRAW);
				ctx.vertexAttribPointer(loc,2,ctx.FLOAT,false,0,0);
			}
			this.ctxgl=ctx;
		} catch(e) {
			console.log("failed to get webgl2 context:",e);
			this.ctx2d=canvas.getContext("2d");
		}
	}


	screenflip() {
		// Render to webgl or 2d.
		let img=this.img;
		let imgw=img.width,imgh=img.height;
		let ctx=this.ctxgl;
		if (ctx===null) {
			let cdata=new Uint8ClampedArray(img.data8.buffer);
			let idata=new ImageData(cdata,imgw,imgh);
			this.ctx2d.putImageData(idata,0,0);
		} else {
			ctx.viewport(0,0,imgw,imgh);
			ctx.texImage2D(ctx.TEXTURE_2D,0,ctx.RGBA8,imgw,imgh,0,ctx.RGBA,ctx.UNSIGNED_BYTE,img.data8);
			ctx.drawArrays(ctx.TRIANGLE_FAN,0,4);
		}
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


	fill(r=0,g=0,b=0,a=255) {
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
		dx=(dx===undefined)?0:(dx|0);
		dy=(dy===undefined)?0:(dy|0);
		dw=(dw===undefined || dw>src.width )?src.width :(dx|0);
		dh=(dh===undefined || dh>src.height)?src.height:(dh|0);
		let sx=0,sy=0;
		dw+=dx;
		if (dx<0) {sx=-dx;dx=0;}
		dw=(dw>dst.width?dst.width:dw)-dx;
		dh+=dy;
		if (dy<0) {sy=-dy;dy=0;}
		dh=(dh>dst.height?dst.height:dh)-dy;
		if (dw<=0 || dh<=0) {return;}
		let dstdata=dst.data32,drow=dy*dst.width+dx,dinc=dst.width-dw;
		let srcdata=src.data32,srow=sy*src.width+sx,sinc=src.width-dw;
		let ystop=drow+dst.width*dh,xstop=drow+dw;
		let amul=this.rgba[3],amul0=amul/255.0,amul1=amul*(256.0/65025.0);
		let filllim=amul0>0?255/amul0:Infinity;
		let ashift=this.rgbashift[3],amask=(255<<ashift)>>>0,namask=(~amask)>>>0;
		let maskl=0x00ff00ff&namask,maskh=0xff00ff00&namask;
		let sa,da,l,h,tmp;
		dw=dst.width;
		while (drow<ystop) {
			while (drow<xstop) {
				// a = sa + da*(1-sa)
				// c = (sc*sa + dc*da*(1-sa)) / a
				src=srcdata[srow++];
				sa=(src>>>ashift)&255;
				src&=namask;
				if (sa>=filllim) {
					dstdata[drow++]=src|((sa*amul0)<<ashift);
					continue;
				}
				if (sa<=0) {drow++;continue;}
				tmp=dstdata[drow];
				da=(tmp>>>ashift)&255;
				if (da===0) {
					dstdata[drow++]=src|((sa*amul0)<<ashift);
					continue;
				}
				// Approximate blending by expanding sa from [0,255] to [0,256].
				if (da===255) {
					sa*=amul1;
					da=amask;
				} else {
					sa*=amul;
					da=sa*255+da*(65025-sa);
					sa=(sa*65280+(da>>>1))/da;
					da=((da+32512)/65025)<<ashift;
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
		let poly=this.tmppoly,trans=this.deftrans;
		poly.begin();
		poly.addline(x0,y0,x1,y1,this.linewidth*0.5);
		this.fillpoly(poly,trans);
	}


	fillrect(x,y,w,h) {
		let poly=this.tmppoly,trans=this.deftrans;
		poly.begin();
		poly.addrect(x,y,w,h);
		this.fillpoly(poly,trans);
	}


	fillcircle(x,y,rad) {
		this.filloval(x,y,rad,rad);
	}


	filloval(x,y,xrad,yrad) {
		yrad=yrad??xrad;
		let poly=this.tmppoly,trans=this.deftrans;
		poly.begin();
		poly.addoval(x,y,xrad,yrad);
		this.fillpoly(poly,trans);
	}


	// ----------------------------------------
	// Text


	setfont(name) {
		throw "not implemented "+name;
	}


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
				next:0,
				x0:0,
				y0:0,
				x1:0,
				y1:0,
				dxy:0,
				amul:0,
				area:0,
				areadx1:0,
				areadx2:0
			});
		}
		return this.tmpline;
	}


	fillpoly(poly,trans) {
		// Fills the current path.
		//
		// Preprocess the lines and curves. Reject anything with a NaN, too narrow, or
		// outside the image. Use a binary heap to dynamically sort lines.
		// Keep JS as simple as possible to be efficient. Keep micro optimization in WASM.
		// ~~x = fast floor(x)
		if (poly===undefined) {poly=this.defpoly;}
		if (trans===undefined) {trans=this.deftrans;}
		else if (!(trans instanceof Transform)) {trans=new Transform(trans);}
		const curvemaxdist2=0.01;
		let iw=this.img.width,ih=this.img.height;
		let alpha=this.rgba[3]/255.0;
		if (poly.vertidx<3 || iw<1 || ih<1 || alpha<1e-4) {return;}
		// Screenspace transformation.
		let matxx=trans.mat[0],matxy=trans.mat[1],matx=trans.vec[0];
		let matyx=trans.mat[2],matyy=trans.mat[3],maty=trans.vec[1];
		// Perform a quick AABB-OBB overlap test.
		// Define the transformed bounding box.
		let aabb=poly.aabb;
		let bndx=aabb.minx*matxx+aabb.miny*matxy+matx;
		let bndy=aabb.minx*matyx+aabb.miny*matyy+maty;
		let bnddx0=aabb.dx*matxx,bnddy0=aabb.dx*matyx;
		let bnddx1=aabb.dy*matxy,bnddy1=aabb.dy*matyy;
		// Test if the image AABB has a separating axis.
		let minx=bndx-iw,maxx=bndx;
		if (bnddx0<0) {minx+=bnddx0;} else {maxx+=bnddx0;}
		if (bnddx1<0) {minx+=bnddx1;} else {maxx+=bnddx1;}
		if (maxx<=0 || 0<=minx) {return;}
		let miny=bndy-ih,maxy=bndy;
		if (bnddy0<0) {miny+=bnddy0;} else {maxy+=bnddy0;}
		if (bnddy1<0) {miny+=bnddy1;} else {maxy+=bnddy1;}
		if (maxy<=0 || 0<=miny) {return;}
		// Test if the poly OBB has a separating axis.
		let cross=bnddx0*bnddy1-bnddy0*bnddx1;
		minx=bndy*bnddx0-bndx*bnddy0;
		maxx=minx;bnddx0*=ih;bnddy0*=iw;
		if (cross <0) {minx+=cross ;} else {maxx+=cross ;}
		if (bnddx0<0) {maxx-=bnddx0;} else {minx-=bnddx0;}
		if (bnddy0<0) {minx+=bnddy0;} else {maxx+=bnddy0;}
		if (maxx<=0 || 0<=minx) {return;}
		miny=bndy*bnddx1-bndx*bnddy1;
		maxy=miny;bnddx1*=ih;bnddy1*=iw;
		if (cross <0) {maxy-=cross ;} else {miny-=cross ;}
		if (bnddx1<0) {maxy-=bnddx1;} else {miny-=bnddx1;}
		if (bnddy1<0) {miny+=bnddy1;} else {maxy+=bnddy1;}
		if (maxy<=0 || 0<=miny) {return;}
		// Loop through the path nodes.
		let lr=this.tmpline,lrcnt=lr.length,lcnt=0;
		let movex,movey;
		let p0x,p0y,p1x,p1y;
		let varr=poly.vertarr;
		let vidx=poly.vertidx;
		for (let i=0;i<vidx;i++) {
			let v=varr[i];
			if (v.type===poly.CURVE) {v=varr[i+2];}
			p0x=p1x; p1x=v.x*matxx+v.y*matxy+matx;
			p0y=p1y; p1y=v.x*matyx+v.y*matyy+maty;
			if (v.type===poly.MOVE) {movex=p1x;movey=p1y;continue;}
			// Add a basic line.
			if (lrcnt<=lcnt) {
				lr=this.fillresize(lcnt+1);
				lrcnt=lr.length;
			}
			let l=lr[lcnt++];
			l.x0=p0x;
			l.y0=p0y;
			l.x1=p1x;
			l.y1=p1y;
			if (v.type===poly.CURVE) {
				// Linear decomposition of curves.
				// Get the control points and check if the curve's on the screen.
				v=varr[i++]; let c1x=v.x*matxx+v.y*matxy+matx,c1y=v.x*matyx+v.y*matyy+maty;
				v=varr[i++]; let c2x=v.x*matxx+v.y*matxy+matx,c2y=v.x*matyx+v.y*matyy+maty;
				if ((p0x<=0 && p1x<=0 && c1x<=0 && c2x<=0) || (p0x>=iw && p1x>=iw && c1x>=iw && c2x>=iw) ||
				    (p0y<=0 && p1y<=0 && c1y<=0 && c2y<=0) || (p0y>=ih && p1y>=ih && c1y>=ih && c2y>=ih)) {
					continue;
				}
				l.amul=0;l.area=1;
				c2x=(c2x-c1x)*3;c1x=(c1x-p0x)*3;let c3x=p1x-p0x-c2x;c2x-=c1x;
				c2y=(c2y-c1y)*3;c1y=(c1y-p0y)*3;let c3y=p1y-p0y-c2y;c2y-=c1y;
				for (let j=lcnt-1;j<lcnt;j++) {
					// For each line segment between [u0,u1], sample the curve at 3 spots between
					// u0 and u1 and measure the distance to the line. If it's too great, split.
					//
					//    u        .25     .50       .75
					//                , - ~ ~ ~ - ,
					//            , '       |       ' ,
					//          ,   |       |        /
					//         ,    |       |       /
					//        ,     |       |      /
					//        ,     |       |     /
					// line   ------+-------+----+   clamped endpoint
					l=lr[j];
					let x0=l.x0,x1=l.x1,dx=x1-x0;
					let y0=l.y0,y1=l.y1,dy=y1-y0;
					let u0=l.amul,u1=l.area,du=(u1-u0)*0.25;
					let den=dx*dx+dy*dy;
					let maxdist=-Infinity,mu,mx,my;
					for (let s=0;s<3;s++) {
						// Project a point on the curve onto the line. Clamp to ends of line.
						u0+=du;
						let sx=p0x+u0*(c1x+u0*(c2x+u0*c3x)),lx=sx-x0;
						let sy=p0y+u0*(c1y+u0*(c2y+u0*c3y)),ly=sy-y0;
						let u=dx*lx+dy*ly;
						u=u>0?(u<den?u/den:1):0;
						lx-=dx*u;
						ly-=dy*u;
						let dist=lx*lx+ly*ly;
						if (maxdist<dist) {
							maxdist=dist;
							mu=u0;
							mx=sx;
							my=sy;
						}
					}
					if (maxdist>curvemaxdist2 && maxdist<Infinity) {
						// The line is too far from the curve, so split it.
						if (lrcnt<=lcnt) {
							lr=this.fillresize(lcnt+1);
							lrcnt=lr.length;
						}
						l.x1=mx;
						l.y1=my;
						l.area=mu;
						l=lr[lcnt++];
						l.x0=mx;
						l.y0=my;
						l.x1=x1;
						l.y1=y1;
						l.amul=mu;
						l.area=u1;
						j--;
					}
				}
			}
		}
		// Close the path.
		if (movex!==p1x || movey!==p1y) {
			if (lrcnt<=lcnt) {
				lr=this.fillresize(lcnt+1);
				lrcnt=lr.length;
			}
			let l=lr[lcnt++];
			l.x0=p1x;
			l.y0=p1y;
			l.x1=movex;
			l.y1=movey;
		}
		// Prune lines.
		minx=iw;maxx=0;miny=ih;maxy=0;
		let amul=(matxx<0)!==(matyy<0)?-alpha:alpha;
		let maxcnt=lcnt;
		lcnt=0;
		for (let i=0;i<maxcnt;i++) {
			let l=lr[i];
			// Always point the line up to simplify math.
			let x0=l.x0,x1=l.x1;
			let y0=l.y0,y1=l.y1;
			l.amul=amul;
			if (y0>y1) {
				l.x0=x1;l.x1=x0;x0=x1;x1=l.x1;
				l.y0=y1;l.y1=y0;y0=y1;y1=l.y1;
				l.amul=-amul;
			}
			let dx=x1-x0,dy=y1-y0;
			// Too thin or NaN.
			if (!(dx===dx) || !(dy>1e-9)) {continue;}
			// Clamp y to [0,imgheight), then clamp x so x<imgwidth.
			l.dxy=dx/dy;
			let dyx=Math.abs(dx)>1e-9?dy/dx:0;
			let y0x=x0-y0*l.dxy;
			let yhx=x0+(ih-y0)*l.dxy;
			let xwy=y0+(iw-x0)*dyx;
			if (y0<0 ) {y0=0 ;x0=y0x;}
			if (y1>ih) {y1=ih;x1=yhx;}
			if (y1-y0<1e-9) {continue;}
			if (x0>=iw && x1>=iw) {maxx=iw;continue;}
			if (x0>=iw) {x0=iw;y0=xwy;}
			if (x1>=iw) {x1=iw;y1=xwy;}
			// Calculate the bounding box.
			minx=Math.min(minx,Math.min(x0,x1));
			maxx=Math.max(maxx,Math.max(x0,x1));
			miny=miny<y0?miny:y0;
			maxy=maxy>y1?maxy:y1;
			let fy=~~y0;
			if (x1<x0) {x0=Math.max(l.x0+(fy+1-l.y0)*l.dxy,x1);}
			l.sort=fy*iw+(x0>0?~~x0:0);
			l.next=0;
			lr[i]=lr[lcnt];
			lr[lcnt++]=l;
		}
		// If all lines are outside the image, abort.
		if (minx>=iw || maxx<=0 || minx>=maxx || miny>=maxy || lcnt<=0) {
			return;
		}
		// Linear time heap construction.
		for (let p=(lcnt>>1)-1;p>=0;p--) {
			let i=p,j;
			let l=lr[p];
			while ((j=i+i+1)<lcnt) {
				if (j+1<lcnt && lr[j+1].sort<lr[j].sort) {j++;}
				if (lr[j].sort>=l.sort) {break;}
				lr[i]=lr[j];
				i=j;
			}
			lr[i]=l;
		}
		// Init blending.
		let ashift=this.rgbashift[3],amask=(255<<ashift)>>>0;
		let maskl=(0x00ff00ff&~amask)>>>0,maskh=(0xff00ff00&~amask)>>>0;
		let colrgb=(this.rgba32[0]|amask)>>>0;
		let coll=(colrgb&maskl)>>>0,colh=(colrgb&maskh)>>>0,colh8=colh>>>8;
		// Process the lines row by row.
		let x=lr[0].sort,y;
		let xnext=x,xrow=-1;
		let area,areadx1;
		let pixels=iw*ih;
		let imgdata=this.img.data32;
		while (true) {
			if (x>=xrow) {
				if (xnext>=pixels) {break;}
				x=xnext;
				y=~~(x/iw);
				xrow=(y+1)*iw;
				area=0;
				areadx1=0;
			}
			let areadx2=0;
			while (x>=xnext) {
				// fx0  fx0+1                          fx1  fx1+1
				//  +-----+-----+-----+-----+-----+-----+-----+
				//  |                              .....----  |
				//  |               .....-----'''''           |
				//  | ....-----'''''                          |
				//  +-----+-----+-----+-----+-----+-----+-----+
				//   first  dyx   dyx   dyx   dyx   dyx  last   tail
				let l=lr[0];
				if (x>=l.next) {
					let x0=l.x0,y0=l.y0-y;
					let x1=l.x1,y1=l.y1-y;
					let next=Infinity;
					let dxy=l.dxy,y0x=x0-y0*dxy;
					if (y0<0) {y0=0;x0=y0x;}
					if (y1>1) {y1=1;x1=y0x+dxy;next=x1;}
					if (x0>x1) {
						let tmp=x0;x0=x1;x1=tmp;dxy=-dxy;
						next-=dxy;next=next>l.x1?next:l.x1;
					}
					l.sort=next>=iw?pixels:(xrow+(next>0?~~next:0));
					let dyx=l.amul/dxy,dyh=dyx*0.5;
					let fx0=x-xrow+iw;
					let fx1=Math.floor(x1);
					x0-=fx0;
					x1-=fx0>fx1?fx0:fx1;
					let tmp=x1>0?-x1*x1*dyh:0;
					if (fx0>=fx1) {
						// Vertical line - avoid divisions.
						let dy=(y0-y1)*l.amul;
						tmp=x0>=0?(x0+x1)*dy*0.5:tmp;
						area+=dy-tmp;
					} else {
						if (fx1<iw) {
							l.area=dyh-x1*dyx-tmp;
							l.areadx1=dyx;
							l.areadx2=tmp;
							l.next=l.sort;
							l.sort=fx1+xrow-iw;
						}
						tmp=x0>0?x0*x0*dyh:0;
						area-=dyh-x0*dyx+tmp;
						areadx1-=dyx;
					}
					areadx2+=tmp;
				} else {
					area+=l.area;
					areadx1+=l.areadx1;
					areadx2+=l.areadx2;
					l.sort=l.next;
				}
				// Heap sort down.
				let i=0,j;
				while ((j=i+i+1)<lcnt) {
					if (j+1<lcnt && lr[j+1].sort<lr[j].sort) {j++;}
					if (lr[j].sort>=l.sort) {break;}
					lr[i]=lr[j];
					i=j;
				}
				lr[i]=l;
				xnext=lr[0].sort;
			}
			// Calculate how much we can draw or skip.
			const cutoff=0.00390625;
			let astop=area+areadx1+areadx2;
			let xstop=x+1,xdif=(xnext<xrow?xnext:xrow)-xstop;
			if (xdif>0 && (area>=cutoff)===(astop>=cutoff)) {
				let adif=(cutoff-astop)/areadx1+1;
				xdif=(adif>=1 && adif<xdif)?~~adif:xdif;
				astop+=xdif*areadx1;
				xstop+=xdif;
			}
			// Blend the pixel based on how much we're covering.
			if (area>=cutoff) {
				do {
					// a = sa + da*(1-sa)
					// c = (sc - dc)*sa/a + dc
					let sa=area<alpha?area:alpha;
					area+=areadx1+areadx2;
					areadx2=0;
					let dst=imgdata[x];
					let da=(dst>>>ashift)&255;
					if (da===255) {
						sa=256.49-sa*256;
					} else {
						let tmp=sa*255+(1-sa)*da;
						sa=256.49-sa*65280/tmp;
						da=tmp+0.49;
					}
					// imul() implicitly casts floor(sa).
					let col=(da<<ashift)
						|(((Math.imul((dst&0x00ff00ff)-coll,sa)>>>8)+coll)&maskl)
						|((Math.imul(((dst>>>8)&0x00ff00ff)-colh8,sa)+colh)&maskh);
					imgdata[x]=col;
				} while (++x<xstop);
			}
			x=xstop;
			area=astop;
		}
	}


	tracepoly(poly,rad,trans) {
		return this.fillpoly(poly.trace(rad),trans);
	}

}
