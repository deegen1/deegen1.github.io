/*------------------------------------------------------------------------------


drawing.js - v4.01

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
     Compile constants in fillpath during runtime for speed.
1.13
     Added shortcuts to image blending (if alpha=1, etc) to be more efficient.
2.00
     fillpath only needs to track the beginning and end of lines, since the
     change in area between the ends will be constant (areadx1). This reduces
     the worst case complexity per row from width*n to 2*n.
     fillpath has also been simplified to use heaps instead of sorting by rows.
     This guarantees n*log(n) complexity for n lines.
2.01
     Switched from BMP to TGA for DrawImage.
2.02
     Changed DrawPath internal format. Added SVG (MZLC) path saving and loading.
     Curves are only split to lines if they're on screen.
2.03
     Added an embedded monospace font, font loading, and text rect calculation.
2.04
     Moved line object creation in fillpath to fillresize. Creating objects with
     all fields up front allows browsers to speed up fillpath by 30%.
3.00
     Added bounding boxes to DrawPath. This is turned into an OBB in fillpath to
     skip drawing paths in constant time if they're not on screen.
3.01
     fillpath now uses linear time heap construction.
3.02
     Added a webassembly version of fillpath. This is up to 2x the speed of
     javascript, but requires moving images to WASM sandboxed memory.
     Simplified curve segmentation by estimating length instead of quartering.
3.03
     Added relative paths to SVG parser (mzlc vs MZLC).
     Optimized WASM fillpath.
     Cleaned up AABB on screen detection in fillpath.
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
     Removed WASM fillpath since it's not always faster anymore.
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
     Removed addstrip() and added addpath().
     The DrawPath constructor can now handle other paths.
3.23
     drawimage() now supports non-integer coordinates with a 25% speed penalty.
3.25
     Switched to using modules.
3.26
     Reduced font size by 6kb and removed webgl renderer.
     Simplified oval and line paths.
3.27
     Subpaths are always closed in fillpath().
     Optimized curve segmentation to stop if offscreen.
     Winding order is dynamically determined by signed area calculation.
     Pixel area calculation is more robust and prevents rounding errors.
     AABB merged into DrawPath.
     Fixed close() not setting moveidx.
3.30
     Draw() now accepts canvas's as a constructor.
3.31
     rgbatoint() now assumes alpha=255.
     Fixed mixing up x and y in aabbupdate().
     Added transforms to path creation.
     fromstring() no longer relies on DrawPath to track vertex position.
     Simplified transforms in fillrect(), filloval(), etc.
3.32
     Renamed polygons to paths.
4.00
     drawimage() now applies transforms.
4.01
     Removed areadx1 calculation from drawimage(). 1kb smaller and 25% faster.
     Added DrawImage.loadfile().


--------------------------------------------------------------------------------
TODO


Keep under 50kb, minus header.

polytest.js
	Improve UnitAreaCalc().

DrawPath
	don't remove empty moves
	Add circular arcs. Add to rappel.js charging.
	start at ang0, clamp |ang1-ang0|<2PI, keep sign

filltext/textrect
	Add backspaces and tabs.
	halign, valign [0,1]

fillpath
	Minkowski difference AABB-OBB test
		Each +-dx,+-dy combo used once
		[[iw,0],[dx,-dy],[0,ih],[-dx,-dy],...]
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

DrawImage
	Performance test in chrome.
	Used fixed point math.
	Faster pixel overlap calculation.
	Fast path for untransformed blitting?

Tracing
	v5.0
	Limit length of sharp corners to 2x thickness.
	Rounded corners: set midpoint distance to thickness.
	For inline, go through path in reverse.
	Add traceoval, tracerect.

Tracing draft
	what to do if tracing a line segment vs closed path?
		if closed, reverse second path
	What to do for empty moves? M->M,Z,EOP
		Draw circle around move

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
		if (type===DrawPath.CURVE) {
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
// Drawing - v4.01


class DrawPath {

	static MOVE =0;
	static CLOSE=1;
	static LINE =2;
	static CURVE=3;


	constructor(str,trans) {
		// Copy static variables.
		this.vertarr=new Array();
		this.begin();
		if (str) {
			if (str instanceof DrawPath) {this.addpath(str,trans);}
			else {this.fromstring(str,trans);}
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
			let v=varr[i],x=v.x,y=v.y;
			minx=minx<x?minx:x;
			maxx=maxx>x?maxx:x;
			miny=miny<y?miny:y;
			maxy=maxy>y?maxy:y;
		}
		this.minx=minx;this.maxx=maxx;
		this.miny=miny;this.maxy=maxy;
	}


	apply(trans) {
		if (!trans) {return;}
		trans=new Transform(trans);
		let varr=this.vertarr,vidx=this.vertidx;
		for (let i=0;i<vidx;i++) {
			let v=varr[i];
			let t=trans.apply([v.x,v.y]);
			v.x=t[0];v.y=t[1];
		}
		this.aabbupdate();
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
		this.addvert(DrawPath.MOVE,x,y);
		return this;
	}


	lineto(x,y) {
		// Draw a line from the last vertex to [x,y].
		// If no moveto() was ever called, behave as moveto().
		if (this.moveidx<0) {return this.moveto(x,y);}
		this.addvert(DrawPath.LINE,x,y);
		return this;
	}


	curveto(x0,y0,x1,y1,x2,y2) {
		// Draw a cubic bezier curve.
		if (this.moveidx<0) {this.moveto(0,0);}
		this.addvert(DrawPath.CURVE,x0,y0);
		this.addvert(DrawPath.CURVE,x1,y1);
		this.addvert(DrawPath.CURVE,x2,y2);
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
		this.addvert(DrawPath.CLOSE,m.x,m.y);
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
			if (t!==DrawPath.CLOSE) {
				ret+=tostring(v.x)+" "+tostring(v.y);
			}
			if (t===DrawPath.CURVE) {
				v=this.vertarr[++i];
				ret+=" "+tostring(v.x)+" "+tostring(v.y);
				v=this.vertarr[++i];
				ret+=" "+tostring(v.x)+" "+tostring(v.y);
			}
		}
		return ret;
	}


	fromstring(str,trans) {
		// Parses an SVG path. Supports Z M L H V C.
		this.begin();
		let type=2,rel=0,len=str.length,i=0,c=0,move=0;
		let params=[0,48,48,16,32,63],v=[0,0,0,0,0,0,0,0];
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
			let p=params[type];
			for (let j=0;j<6;j++) {
				// Only parse floats if they're needed for this type. Format: \s*-?\d*(\.\d*)?
				let sign=1,mul=1,base=v[4+(j&1)],num=0;
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
			move=move?4:2;
			if      (type<1) {this.close();type=1;move=0;}
			else if (type<2) {this.moveto(v[4],v[5]);type=2;move=2;}
			else if (type<5) {this.lineto(v[4],v[5]);}
			else {this.curveto(v[0],v[1],v[2],v[3],v[4],v[5]);}
			v[4^move]=v[6^move];v[5^move]=v[7^move];
		}
		this.apply(trans);
	}


	addpath(path,trans) {
		trans=new Transform(trans?trans:{dim:2});
		let varr=path.vertarr,vidx=path.vertidx;
		for (let i=0;i<vidx;i++) {
			let v=varr[i],x=v.x,y=v.y,t=v.type;
			[x,y]=trans.apply([x,y]);
			if (t===DrawPath.MOVE) {this.moveto(x,y);}
			else if (t===DrawPath.CLOSE) {this.close();}
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
			} else if ((typeof img)==="string") {
				this.loadfile(img);
				width=height=0;
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


	loadfile(name) {
		let xml=new XMLHttpRequest();
		xml.open("GET",name,true);
		xml.responseType="arraybuffer";
		xml.onload=()=>{
			let buf=xml.response;
			if (buf) {this.fromtga(new Uint8Array(buf));}
			else {throw "can't open "+name;}
		};
		xml.send(null);
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
		if (w*h*bytes+18>len || src[2]!==2 || (bits!==24 && bits!==32)) {
			throw "TGA corrupt";
		}
		// Load the image data.
		this.resize(w,h);
		let dst=this.data8;
		let didx=0,dinc=0,sidx=18,a=255;
		if (!(src[17]&32)) {didx=(h-1)*w*4;dinc=-w*8;}
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
		! 553 M340 692c0-86-130-86-130 0 0 86 130 86 130 0ZM238 560h76L327 54H224Z
		" 553 M332 284h80L426 54H318Zm-191 0h80L235 54H127Z
		# 553 M173 106h71L228 268H354l17-162h72L426 268H532v64H420L403 504H506v64H396L378 748H306l18-180H198L180 748H108l18-180H21V504H132l18-172H46V268H156Zm49 226-17 172H331l17-172Z
		$ 553 M291 14h71l-13 95c35 4 72 9 99 16v75c-29-7-72-16-108-18L312 392c96 37 181 80 181 177 0 122-107 171-229 178L248 864H177l16-117c-44-4-90-9-138-21V645c47 15 97 25 149 26l28-221C150 420 59 378 59 277c0-87 80-164 220-170ZM269 181c-81 6-118 39-118 89 0 49 37 72 93 95Zm6 490c83-4 126-39 126-95 0-63-59-80-101-99Z
		% 553 M462 54h81L90 748H10ZM404 755c-80 0-133-47-133-149 0-74 51-145 133-145 87 0 132 57 132 145 0 80-52 149-132 149Zm-1-62c34 0 60-31 60-87 0-47-17-83-59-83-39 0-60 37-60 83 0 65 26 87 59 87ZM150 341C70 341 18 294 18 192 18 118 68 47 150 47c87 0 132 57 132 145 0 80-52 149-132 149Zm-1-62c34 0 60-31 60-87 0-47-17-83-59-83-38 0-60 39-60 83 0 65 26 87 59 87Z
		& 553 M396 553c11-32 23-81 21-140h86c0 68-8 135-49 211l99 124H440l-43-54c-43 35-95 61-171 61-125 0-198-72-198-181 0-94 53-150 121-190-35-46-65-88-65-153C84 117 165 68 256 68c91 0 160 52 160 143 0 85-58 134-146 183ZM227 341c40-25 102-54 102-123 0-49-29-78-76-78-54 0-81 37-81 83 0 54 32 89 55 118Zm-34 98c-34 23-76 59-76 126 0 72 49 117 119 117 45 0 80-16 113-48Z
		' 553 M234 284h85L333 54H221Z
		( 553 M376 17C266 117 147 277 147 484c0 208 107 357 226 470l52-53C310 788 235 648 235 484c0-167 78-308 191-416Z
		) 553 M180 17C294 124 406 276 406 481c0 194-94 349-229 472l-49-50C236 794 318 667 318 481c0-162-83-309-190-411Z
		* 553 M241 54h71L299 222l140-94 34 60-152 75 151 73-33 58-139-92 12 169H241l12-169-141 92-31-57 151-75L81 186l33-57 140 93Z
		+ 553 M234 244h85V443H512v75H319V718H234V518H41V443H234Z
		, 553 M117 849c39 1 129-13 129-84 0-53-46-59-46-112 0-32 25-63 66-63 45 0 88 35 88 117 0 117-87 209-237 209Z
		- 553 M130 441H423v80H130Z
		. 553 M273 757c-45 0-82-37-82-82 0-45 37-82 82-82 45 0 82 37 82 82 0 45-37 82-82 82Z
		/ 553 M393 54h82L138 854H56Z
		0 553 M420 363c18 193-36 321-143 321-54 0-105-31-129-117ZM132 484c-14-188 35-314 145-314 74 0 114 63 126 113ZM281 97C122 97 43 235 43 418c0 229 83 339 228 339 143 0 239-105 239-339 0-206-83-321-229-321Z
		1 553 M66 210l32 73 154-84V668H86v80H490V668H346V103H271Z
		2 553 M75 181c44-40 90-84 195-84 121 0 191 81 191 185 0 131-85 195-278 385H495v81H72V672C307 432 368 401 368 290c0-137-147-155-246-53Z
		3 553 M98 197c200-62 264-5 264 71 0 85-71 114-117 114H159v70h91c55 0 144 25 144 109 0 86-70 122-186 122-51 0-88-6-127-11v77c35 4 74 8 120 8 172 0 282-77 282-203 0-91-82-138-137-146 72-34 106-81 106-154C452 136 351 97 243 97c-49 0-96 9-145 25Z
		4 553 M106 531 330 188V531Zm-85 0v75H330V748h88V606H527V531H418V106H295Z
		5 553 M99 434H224c93 0 163 30 163 114 0 60-39 135-172 135-45 0-85-3-128-12v77c42 5 79 9 123 9 145 0 269-83 269-214 0-107-72-182-235-182H179V180H444V106H99Z
		6 553 M149 465c54-30 99-43 143-43 84 0 122 51 122 126 0 87-53 139-129 139-88 0-136-54-136-223ZM453 106H380C176 106 60 225 60 470c0 200 79 287 217 287 155 0 226-111 226-215 0-111-69-189-199-189-40 0-98 8-155 40 5-149 99-212 232-212h72Z
		7 553 M57 106H491v80L222 748H125L404 185H57Z
		8 553 M281 97c137 0 200 62 200 154 0 87-62 129-120 161 89 46 134 94 134 175 0 108-94 170-222 170-116 0-215-49-215-160 0-93 62-139 135-178C90 365 72 306 72 257c0-86 72-160 209-160Zm3 278c70-34 109-67 109-121 0-58-42-86-115-86-69 0-118 24-118 83 0 66 64 94 124 124Zm-14 81c-77 37-119 74-119 133 0 58 46 95 126 95 82 0 125-37 125-92 0-64-57-103-132-136Z
		9 553 M89 748V673h57c175 0 250-71 257-212-42 21-86 40-161 40-113 0-193-69-193-192C49 184 146 97 272 97c167 0 220 136 220 293 0 280-153 358-351 358ZM403 389c0-120-23-222-135-222-89 0-129 63-129 137 0 92 52 128 119 128 59 0 110-20 145-43Z
		: 553 M277 757c-42 0-75-33-75-75 0-42 33-75 75-75 42 0 75 33 75 75 0 42-33 75-75 75Zm0-361c-42 0-75-33-75-75 0-42 33-75 75-75 42 0 75 33 75 75 0 42-33 75-75 75Z
		; 553 M277 396c-42 0-75-33-75-75 0-42 33-75 75-75 42 0 75 33 75 75 0 42-33 75-75 75ZM123 849c39 1 129-13 129-84 0-53-46-59-46-112 0-32 25-63 66-63 45 0 88 35 88 117 0 117-87 209-237 209Z
		< 553 M398 205l53 54L184 480l267 221-53 54L68 480Z
		= 553 M65 359H488v72H65Zm0 171H488v72H65Z
		> 553 M103 260 370 481 103 702l53 54L485 480 156 204Z
		? 553 M149 54c191-5 304 104 304 220 0 84-42 158-173 165l-3 121H203l-6-188h58c34 0 105-4 105-92 0-109-106-152-211-149Zm90 703c-36 0-65-29-65-65 0-36 29-65 65-65 36 0 65 29 65 65 0 36-29 65-65 65Z
		@ 553 M423 292 384 544c-13 84-4 109 22 109 46 0 71-97 71-248 0-190-49-297-160-297C182 108 74 320 74 580c0 249 99 311 175 311 73 0 108-13 167-39v63c-53 22-91 37-167 37C55 952 5 771 5 579 5 258 145 48 321 48c121 0 225 80 225 357 0 182-43 312-147 312-42 0-76-18-76-73-29 57-57 73-92 73-67 0-93-51-93-145 0-139 52-278 161-278 31 0 43 5 60 13Zm-90 81c-13-13-22-16-35-16-60 0-82 132-82 202 0 62 4 94 28 94 19 0 32-16 47-46l10-20Z
		A 553 M275 186 383 530H166Zm-57-80L5 748H95l46-141H408l45 141h95L338 106Z
		B 553 M261 106c108 0 215 28 215 156 0 71-32 121-106 145 87 18 129 76 129 149 0 127-107 192-246 192H78V106ZM165 380h94c71 0 126-35 126-105 0-76-58-95-128-95H165Zm0 294h97c93 0 144-36 144-112 0-74-67-109-144-109H165Z
		C 553 M489 214c-51-25-96-39-152-39-144 0-199 125-199 248 0 183 80 255 198 255 68 0 97-13 153-36v83c-45 16-88 31-161 31C122 756 45 622 45 423 45 251 136 98 337 98c64 0 108 13 152 30Z
		D 553 M141 672V180h75c148 0 209 75 209 237 0 185-81 255-217 255ZM54 106V748H197c166 0 320-72 320-331 0-140-42-311-294-311Z
		E 553 M464 106v74H186V378H453v74H186V673H464v75H99V106Z
		F 553 M463 106v75H190V389H449v73H190V748H101V106Z
		G 553 M494 128c-41-18-92-31-156-31C152 97 32 229 32 426c0 199 89 331 285 331 72 0 132-17 180-39V390H279v72H411V666c-28 10-54 13-85 13-145 0-202-99-202-253 0-147 77-251 214-251 71 0 118 21 156 40Z
		H 553 M412 106h87V748H412V453H142V748H55V106h87V377H412Z
		I 553 M84 106H469v74H321V673H469v75H84V673H232V180H84Z
		J 553 M98 182H342V552c0 76-36 127-113 127-58 0-116-30-139-48v88c22 15 76 36 142 36 119 0 199-77 199-209V106H98Z
		K 553 M77 106h87V404L399 106H503L249 411 514 748H404L164 433V748H77Z
		L 553 M114 106h89V673H484v75H114Z
		M 553 M24 748h83l11-395 2-157 29 95 91 248h61l95-258 29-85 19 552h85L498 106H392L301 346l-27 83L159 106H55Z
		N 553 M58 106H171L346 479l68 154V106h81V748H381L193 345 140 218V748H58Z
		O 553 M277 174c109 0 158 95 158 256 0 139-48 251-161 251-97 0-155-82-155-261 0-143 54-246 158-246Zm4-77C107 97 28 250 28 423c0 169 48 334 244 334 149 0 254-114 254-337 0-192-75-323-245-323Z
		P 553 M165 443V179h92c81 0 151 35 151 126 0 93-56 138-164 138ZM78 106V748h87V518h84c156 0 250-95 250-219 0-125-96-193-240-193Z
		Q 553 M553 876c-37 28-75 49-138 49-116 0-180-73-185-171C83 732 28 601 28 432 28 251 107 97 281 97c202 0 245 180 245 321 0 152-52 307-215 336 11 64 51 96 109 96 41 0 63-12 94-34ZM275 680c115 0 160-115 160-253 0-153-46-253-159-253-98 0-157 95-157 246 0 189 65 260 156 260Z
		R 553 M171 392V180h85c81 0 120 39 120 102 0 69-49 110-133 110ZM83 106V748h88V462h41c64 0 86 31 110 82l96 204h98L420 548c-24-50-51-94-90-106 74-18 138-73 138-168 0-95-58-168-211-168Z
		S 553 M448 115c-48-8-83-18-149-18C174 97 62 158 62 273c0 96 74 137 150 169l95 40c57 24 91 54 91 96 0 65-41 102-162 102-72 0-136-13-182-30v85c61 14 119 22 178 22 157 0 258-63 258-182 0-72-40-126-148-171l-96-40c-60-25-92-56-92-101 0-77 87-90 141-90 63 0 111 10 153 21Z
		T 553 M42 106H511v75H321V748H232V181H42Z
		U 553 M54 106V532c0 173 92 225 221 225 142 0 225-92 225-225V106H413V532c0 89-40 152-136 152-91 0-136-44-136-152V106Z
		V 553 M101 106 278 666 458 106h93L333 748H215L2 106Z
		W 553 M105 106l32 556 35-115 73-224h61L425 662l3-98 25-458h78L488 748H374l-79-227-22-74-24 79-73 222H66L22 106Z
		X 553 M130 106 277 348 424 106H524L328 416 541 748H431L275 488 118 748H9L223 420 26 106Z
		Y 553 M106 106 231 337l50 99 41-83L453 106H553L321 518V748H232V517L0 106Z
		Z 553 M64 106H492v69L164 667H498v81H55V682L385 185H64Z
		[ 553 M169 37H412v69H251V880H412v69H169Z
		\\ 553 M79 54h81L497 854H416Z
		] 553 M141 106H301V880H141v69H384V37H141Z
		^ 553 M60 420h77L271 174 412 420h86L309 106H239Z
		_ 553 M0 878H553v71H0Z
		\` 553 M242 173h86L209 54H86Z
		a 553 M386 524v87c-44 42-103 75-150 75-50 0-80-27-80-73 0-65 53-89 118-89ZM107 355c69-29 121-36 167-36 84 0 112 48 112 93v47H271C146 459 65 517 65 616c0 85 54 141 159 141 88 0 139-47 170-75l1 66h77V406c0-99-63-160-193-160-67 0-123 14-172 31Z
		b 553 M164 423c54-64 90-102 150-102 77 0 99 93 99 174 0 95-33 190-148 190-40 0-70-11-101-21ZM79 719c47 19 105 35 177 35 133 0 244-75 244-266 0-146-60-242-170-242-73 0-128 32-170 91l4-91V54H79Z
		c 553 M462 353c-37-19-77-33-132-33-84 0-163 61-163 186 0 123 69 176 164 176 62 0 100-17 131-31v79c-42 16-88 25-143 25-127 0-241-60-241-247 0-158 99-260 250-260 62 0 96 9 134 23Z
		d 553 M386 569c-43 59-91 115-146 115-64 0-99-62-99-176 0-140 61-188 152-188 41 0 65 9 93 20Zm0-308c-26-6-48-12-91-12C108 249 53 395 53 508c0 138 52 249 170 249 85 0 134-53 170-103l2 94h77V54H386Z
		e 553 M147 529c0 93 48 157 165 157 56 0 107-9 157-21v70c-54 13-98 22-174 22-164 0-238-98-238-253 0-183 122-258 224-258 214 0 223 198 212 283Zm259-66c3-61-22-149-128-149-72 0-124 56-131 149Z
		f 553 M516 60C268 12 198 113 198 243v84H39v71H198V748h87V398H501V327H285V236c0-111 77-137 231-103Z
		g 553 M513 255v70H434c69 91 16 261-160 261-46 0-74-7-105-23-58 79 12 97 41 98l145 5c87 3 156 49 156 123 0 101-91 165-243 165-120 0-222-33-222-128 0-58 35-90 68-114-50-24-80-101 2-188-97-106-16-324 217-269ZM269 522c143 0 143-212 0-212-141 0-141 212 0 212ZM191 735c-23 16-54 39-54 82 0 51 53 69 139 69 104 0 143-40 143-87 0-45-46-57-98-59Z
		h 553 M79 748h85V420c31-28 73-100 142-100 63 0 84 50 84 112V748h85V420c0-106-52-174-154-174-80 0-124 45-160 87l3-79V54H79Z
		i 553 M276 183c-37 0-67-30-67-67 0-37 30-67 67-67 37 0 67 30 67 67 0 37-30 67-67 67ZM101 255H333V677H480v71H85V677H247V326H101Z
		j 553 M361 183c-37 0-67-30-67-67 0-37 30-67 67-67 37 0 67 30 67 67 0 37-30 67-67 67ZM85 255H413V737c0 221-200 249-348 192V848c172 74 261 19 261-99V326H85Z
		k 553 M89 54h86V480L397 255H509L278 482 522 748H405L175 484V748H89Z
		l 553 M101 54H333V677H480v71H85V677H247V124H101Z
		m 553 M110 255l3 94c25-54 51-103 110-103 58 0 80 40 81 107 39-90 71-107 113-107 54 0 92 41 92 136V748H430V391c0-30 2-74-31-74-28 0-48 43-84 115V748H237V393c0-50-6-76-31-76-20 0-40 20-83 114V748H44V255Z
		n 553 M155 255l3 80c47-53 86-89 162-89 108 0 155 71 155 170V748H390V429c0-65-25-109-86-109-37 0-68 12-140 101V748H79V255Z
		o 553 M277 319c107 0 143 88 143 182 0 106-47 184-143 184-75 0-144-46-144-184 0-141 78-182 144-182Zm4-73C128 246 45 359 45 503c0 142 67 254 227 254 138 0 236-98 236-260 0-109-44-251-227-251Z
		p 553 M154 255l6 83c32-43 79-92 170-92 90 0 170 68 170 249 0 172-105 259-242 259-32 0-64-4-94-11V949H79V255Zm10 409c31 12 66 21 97 21 106 0 152-75 152-188 0-108-33-176-101-176-46 0-89 27-148 103Z
		q 553 M472 246V949H386V763l4-105c-35 49-87 99-167 99-104 0-170-88-170-246 0-131 66-262 242-262 31 0 59 3 101 16Zm-86 93c-27-10-55-20-97-20-109 0-148 81-148 187 0 136 49 178 99 178 47 0 86-34 146-116Z
		r 553 M99 255V748h86V431c69-84 107-111 154-111 74 0 79 75 79 123h86c3-95-26-197-152-197-58 0-121 34-173 100l-2-91Z
		s 553 M437 337c-155-38-254-20-254 43 0 35 14 52 129 87 115 35 157 72 157 144 0 134-172 175-380 127v-78c182 46 292 27 292-40 0-34-13-51-128-86-115-35-157-77-157-148 0-81 82-178 341-126Z
		t 553 M254 97V255H476v72H254V579c0 107 94 121 222 89v74c-220 41-307-16-307-162V327H31V255H169V119Z
		u 553 M390 255h85V748H398l-2-80c-39 42-80 89-165 89-102 0-152-63-152-176V255h85V581c0 62 30 103 85 103 62 0 99-54 141-102Z
		v 553 M423 255h94L324 748H225L32 255h98L249 576l28 84 25-77Z
		w 553 M451 255h85L464 748H360l-71-205-14-52-17 56-68 201H90L18 255h84l50 410 92-287h62l78 221 21 63Z
		x 553 M153 255 282 444 410 255H515L330 503 523 748H410L277 559 145 748H34L226 500 43 255Z
		y 553 M130 255 253 577l27 81L423 255h94L349 696C253 948 149 957 29 950V872c99 15 147-10 200-124L33 255Z
		z 553 M87 255H462v66L188 676H478v72H81V686L359 327H87Z
		{ 553 M441 37H404c-94 0-187 32-187 174V336c0 69-34 95-109 95H80v68h28c75 0 109 35 109 95V772c0 91 39 177 180 177h44V880H406c-64 0-107-35-107-108V595c0-62-26-124-105-130 81-11 104-75 104-126V211c0-81 57-105 106-105h37Z
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
			g.path=new DrawPath(token(10));
			let varr=g.path.vertarr,vidx=g.path.vertidx;
			for (let i=0;i<vidx;i++) {
				let v=varr[i];
				v.x/=scale;
				v.y/=scale;
			}
			g.path.aabbupdate();
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

	static Path=DrawPath;
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
		this.defpath  =new DrawPath();
		this.stack    =[];
		this.stackidx =0;
		// Rendering variables
		this.linewidth=1.0;
		this.tmptrans =new Transform(2);
		this.tmppath  =new DrawPath();
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


	rgbatoint(r,g,b,a=255) {
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
				path :null,
				font :null
			};
			this.stack[this.stackidx-1]=mem;
		}
		mem.img =this.img;
		mem.rgba=this.rgba32[0];
		mem.trans.set(this.deftrans);
		mem.path=this.defpath;
		mem.font=this.deffont;
	}


	popstate() {
		if (this.stackidx<=0) {throw "loading null stack";}
		let mem=this.stack[--this.stackidx];
		this.img=mem.img;
		this.rgba32[0]=mem.rgba;
		this.deftrans.set(mem.trans);
		this.defpath=mem.path;
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


	drawimage(srcimg,offx,offy,trans) {
		// For a given destination pixel, use trans^-1 to project it onto the source and
		// use area calculations to average the color.
		// det(trans) = pixel area
		//
		//                 .
		//               .' '.
		//             .'     '.
		//  +--+      '.        '.
		//  |  |  ->    '.        '.
		//  +--+          '.       .'
		//                  '.   .'
		//                    '.'
		//
		if (trans===undefined) {trans=this.deftrans;}
		else if (!(trans instanceof Transform)) {trans=new Transform(trans);}
		let dstimg=this.img;
		let dstw=dstimg.width,dsth=dstimg.height;
		let srcw=srcimg.width,srch=srcimg.height;
		// src->dst transformation.
		let matxx=trans.mat[0],matxy=trans.mat[1],matx=trans.vec[0]+offx;
		let matyx=trans.mat[2],matyy=trans.mat[3],maty=trans.vec[1]+offy;
		let det=matxx*matyy-matxy*matyx;
		let alpha=det*this.rgba[3]/(255*255);
		if (Math.abs(srcw*srch*alpha)<1e-10 || !dstw || !dsth) {return;}
		// Check trans(src) and dst AABB overlap. Calculate vertex positions.
		let minx=Infinity,maxx=-Infinity;
		let miny=Infinity,maxy=-Infinity;
		const dstvert=[0,0,0,0,0,0,0,0];
		for (let i=0;i<8;i+=2) {
			let u=((20>>i)&1)?srcw:0,v=((80>>i)&1)?srch:0;
			let x=u*matxx+v*matxy+matx;dstvert[i  ]=x;
			let y=u*matyx+v*matyy+maty;dstvert[i+1]=y;
			minx=minx<x?minx:x;
			maxx=maxx>x?maxx:x;
			miny=miny<y?miny:y;
			maxy=maxy>y?maxy:y;
		}
		if (!(minx<dstw && maxx>0 && miny<dsth && maxy>0)) {return;}
		let dstminy=miny>0?~~miny:0;
		let dstmaxy=maxy<dsth?Math.ceil(maxy):dsth;
		// Check inv(dst) and src AABB overlap.
		let invxx= matyy/det,invxy=-matxy/det,invx=-matx*invxx-maty*invxy;
		let invyx=-matyx/det,invyy= matxx/det,invy=-matx*invyx-maty*invyy;
		minx=Infinity;maxx=-Infinity;
		miny=Infinity;maxy=-Infinity;
		for (let i=0;i<4;i++) {
			let u=((6>>i)&1)?dstw:0,v=((12>>i)&1)?dsth:0;
			let x=u*invxx+v*invxy+invx;
			let y=u*invyx+v*invyy+invy;
			minx=minx<x?minx:x;
			maxx=maxx>x?maxx:x;
			miny=miny<y?miny:y;
			maxy=maxy>y?maxy:y;
		}
		if (!(minx<srcw && maxx>0 && miny<srch && maxy>0)) {return;}
		// Precompute pixel AABB offsets.
		let pixminx=(invxx<0?invxx:0)+(invxy<0?invxy:0);
		let pixminy=(invyx<0?invyx:0)+(invyy<0?invyy:0);
		let pixmaxx=invxx+invxy-pixminx+(1-1e-7);
		let pixmaxy=invyx+invyy-pixminy+(1-1e-7);
		// Iterate over dst rows.
		let [rshift,gshift,bshift,ashift]=this.rgbashift;
		let dstdata=dstimg.data32;
		let srcdata=srcimg.data32;
		for (let dsty=dstminy;dsty<dstmaxy;dsty++) {
			// Calculate dst x bounds for the row.
			minx=Infinity;maxx=-Infinity;
			let vx=dstvert[6],vy=dstvert[7];
			for (let i=0;i<8;i+=2) {
				let x0=vx,x1=dstvert[i  ];
				let y0=vy,y1=dstvert[i+1];
				vx=x1;vy=y1;
				if (y0>y1) {x1=x0;x0=vx;y1=y0;y0=vy;}
				y0-=dsty;y1-=dsty;
				if (!(y0<1 && y1>0)) {continue;}
				let dx=x1-x0,dy=y1-y0,dxy=dx/dy;
				let y0x=x0-y0*dxy,y1x=y0x+dxy;
				x0=y0>0?x0:y0x;
				x1=y1<1?x1:y1x;
				if (x0>x1) {y0=x0;x0=x1;x1=y0;}
				minx=minx<x0?minx:x0;
				maxx=maxx>x1?maxx:x1;
			}
			if (!(minx<dstw && maxx>0)) {continue;}
			let dstrow=dsty*dstw;
			let dstminx=minx>0?~~minx:0;
			let dstmaxx=maxx<dstw?Math.ceil(maxx):dstw;
			for (let dstx=dstminx;dstx<dstmaxx;dstx++) {
				// Project the dst pixel to src and calculate AABB.
				let srcx0=dstx*invxx+dsty*invxy+invx;
				let srcy0=dstx*invyx+dsty*invyy+invy;
				minx=srcx0+pixminx;let srcminx=minx>0?~~minx:0;
				miny=srcy0+pixminy;let srcminy=miny>0?~~miny:0;
				maxx=srcx0+pixmaxx;let srcmaxx=maxx<srcw?~~maxx:srcw;
				maxy=srcy0+pixmaxy;let srcmaxy=maxy<srch?~~maxy:srch;
				// Iterate over src rows.
				let sa=0,sr=0,sg=0,sb=0;
				for (let srcy=srcminy;srcy<srcmaxy;srcy++) {
					// Sum the src pixels.
					let row=srcy*srcw;
					for (let srcx=srcminx;srcx<srcmaxx;srcx++) {
						let area=0,minc=srcw,maxc=-1;
						let sx0=srcx0-srcx,sy0=srcy0-srcy,sx=sx0,sy=sy0;
						for (let i=0;i<4;i++) {
							// Calculate transformed pixel vertices.
							let xflag=(3>>i)&1,yflag=(6>>i)&1;
							let x0=sx,x1=sx0+(xflag?invxx:0)+(yflag?invxy:0);
							let y0=sy,y1=sy0+(xflag?invyx:0)+(yflag?invyy:0);
							sx=x1;sy=y1;
							let sign=alpha;
							if (x0>x1) {sign=-sign;x1=x0;x0=sx;y1=y0;y0=sy;}
							if (y0>y1) {sign=-sign;y0=1-y0;y1=1-y1;}
							if (!(y0<1 && y1>0)) {continue;}
							// Clip to unit box.
							let dx=x1-x0,dy=y1-y0;
							let x0y=y0-dy*(x0/dx);
							let x1y=y1+dy*((1-x1)/dx);
							let y0x=x0-dx*(y0/dy);
							let y1x=x1+dx*((1-y1)/dy);
							if (y0<0) {y0=0;x0=y0x;}
							if (y1>1) {y1=1;x1=y1x;}
							minc=minc<x0?minc:x0;
							maxc=maxc>x1?maxc:x1;
							// Calculate area to the right.
							if (x1<=0) {
								area+=(y0-y1)*sign;
							} else if (x0<1) {
								let tmp=y0;
								if (x0<0) {x0=0;y0=x0y;}
								if (x1>1) {x1=1;y1=x1y;}
								area+=(tmp-y1-(y0-y1)*(x0+x1)*0.5)*sign;
							}
						}
						// Skip pixels if we are too far left or right.
						if (maxc<=0) {break;}
						if (minc>=1) {srcx+=(~~minc)-1;continue;}
						// Scale pixel color by the area and premultiply alpha.
						let col=srcdata[row+srcx];
						let amul=area*((col>>>ashift)&255);
						sa+=amul;
						sr+=amul*((col>>>rshift)&255);
						sg+=amul*((col>>>gshift)&255);
						sb+=amul*((col>>>bshift)&255);
						if (maxc<=1) {break;}
					}
				}
				// Blend with dst. Note alpha*det already averages the src colors.
				if (sa>1e-8) {
					// a = sa + da*(1-sa)
					// c = (sc*sa + dc*da*(1-sa)) / a
					sa=sa<1?sa:1;
					let pix=dstrow+dstx;
					let col=dstdata[pix];
					let dmul=(((col>>>ashift)&255)/255)*(1-sa);
					let a=sa+dmul,adiv=1.001/a;
					let da=a*255.255;
					let dr=(sr+dmul*((col>>>rshift)&255))*adiv;
					let dg=(sg+dmul*((col>>>gshift)&255))*adiv;
					let db=(sb+dmul*((col>>>bshift)&255))*adiv;
					dstdata[pix]=(da<<ashift)|(dr<<rshift)|(dg<<gshift)|(db<<bshift);
				}
			}
		}
	}


	// ----------------------------------------
	// Paths


	beginpath() {return this.defpath.begin(...arguments);}
	closepath() {return this.defpath.close(...arguments);}
	moveto() {return this.defpath.moveto(...arguments);}
	lineto() {return this.defpath.lineto(...arguments);}
	curveto() {return this.defpath.curveto(...arguments);}


	// ----------------------------------------
	// Primitives


	drawline(x0,y0,x1,y1) {
		let w=this.linewidth;
		let path=this.tmppath.begin().addline(x0,y0,x1,y1,w*0.5);
		this.fillpath(path);
	}


	fillrect(x,y,w,h) {
		let path=this.tmppath.begin().addrect(x,y,w,h);
		this.fillpath(path);
	}


	fillcircle(x,y,rad) {
		this.filloval(x,y,rad,rad);
	}


	filloval(x,y,xrad,yrad) {
		yrad=yrad??xrad;
		let path=this.tmppath.begin().addoval(x,y,xrad,yrad);
		this.fillpath(path);
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
			this.fillpath(g.path,trans);
			xpos+=g.width;
		}
	}


	textrect(str,scale) {
		return this.deffont.textrect(str,scale);
	}


	// ----------------------------------------
	// Path Filling


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


	fillpath(path,trans) {
		// Fills the current path.
		//
		// Preprocess the lines and curves. Use a binary heap to dynamically sort lines.
		// Keep JS as simple as possible to be efficient. Keep micro optimization in WASM.
		// ~~x = fast floor(x)
		if (path===undefined) {path=this.defpath;}
		if (trans===undefined) {trans=this.deftrans;}
		else if (!(trans instanceof Transform)) {trans=new Transform(trans);}
		const curvemaxdist2=0.02;
		let iw=this.img.width,ih=this.img.height;
		let alpha=this.rgba[3]/255.0;
		if (path.vertidx<3 || iw<1 || ih<1 || alpha<1e-4) {return;}
		// Screenspace transformation.
		let matxx=trans.mat[0],matxy=trans.mat[1],matx=trans.vec[0];
		let matyx=trans.mat[2],matyy=trans.mat[3],maty=trans.vec[1];
		// Perform an AABB-OBB overlap test.
		// Define the transformed bounding box.
		let bx=path.minx,by=path.miny;
		let bndx=bx*matxx+by*matxy+matx;
		let bndy=bx*matyx+by*matyy+maty;
		bx=path.maxx-bx;by=path.maxy-by;
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
		// Test if the path OBB has a separating axis.
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
		let varr=path.vertarr;
		let vidx=path.vertidx;
		for (let i=0;i<=vidx;i++) {
			let v=varr[i<vidx?i:0];
			if (v.type===DrawPath.CURVE) {v=varr[i+2];}
			p0x=p1x;p1x=v.x*matxx+v.y*matxy+matx;
			p0y=p1y;p1y=v.x*matyx+v.y*matyy+maty;
			// Add a basic line.
			let m1x=p1x,m1y=p1y;
			if (v.type===DrawPath.MOVE) {
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
			if (v.type!==DrawPath.CURVE) {continue;}
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
					// a = da + ( 1-da)*sa
					// c = dc + (sc-dc)*sa/a
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


	tracepath(path,rad,trans) {
		return this.fillpath(path.trace(rad),trans);
	}

}
