/*------------------------------------------------------------------------------


drawing.js - v1.25

Copyright 2024 Alec Dee - MIT license - SPDX: MIT
deegen1.github.io - akdee144@gmail.com


--------------------------------------------------------------------------------
Notes


For editing use: https://yqnn.github.io/svg-path-editor


--------------------------------------------------------------------------------
TODO


SVG call close() if last point != moveto().
Allow for relative m, z, l, c.
Tracing - project out based on tangent.
Image scaling and rotation.
Polygon filling
	Reject lines during first parse.
	More accurate linearization of curves. Split on curvature, not length.
	Simplify area dx1/dx2 calculation.


*/
/* jshint esversion: 11  */
/* jshint bitwise: false */
/* jshint eqeqeq: true   */
/* jshint curly: true    */


//---------------------------------------------------------------------------------
// Anti-aliased Image Drawing - v1.25


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
		var data=this.data;
		data[11]=x;
		data[12]=y;
		data[2]=data[11];
		data[5]=data[12];
		return this;
	}


	addoffset(x,y,apply) {
		if (y===undefined) {y=x[1];x=x[0];}
		var data=this.data;
		if (apply) {
			var w=x;
			x=w*data[0]+y*data[1];
			y=w*data[3]+y*data[4];
		}
		data[11]+=x;
		data[12]+=y;
		data[2]=data[11];
		data[5]=data[12];
		return this;
	}


	getoffset() {
		return [this.data[11],this.data[12]];
	}


	apply(x,y) {
		// Applies all transformations to a point.
		if (y===undefined) {y=x[1];x=x[0];}
		var data=this.data,w=x;
		x=w*data[0]+y*data[1]+data[2];
		y=w*data[3]+y*data[4]+data[5];
		return [x,y];
	}


	undo(x,y) {
		// Applies the inverse transform to [x,y].
		if (y===undefined) {y=x[1];x=x[0];}
		var data=this.data,w=x;
		var det=data[0]*data[4]-data[1]*data[3];
		w-=data[2];
		y-=data[5];
		x=(w*data[4]-y*data[1])/det;
		y=(y*data[0]-w*data[3])/det;
		return [x,y];
	}

}


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
		var minx=Infinity,miny=Infinity,maxx=-Infinity,maxy=-Infinity;
		var varr=this.vertarr,vidx=this.vertidx;
		for (var i=0;i<vidx;i++) {
			var x=varr[i].x,y=varr[i].y;
			if (minx>x) {minx=x;}
			if (miny>y) {miny=y;}
			if (maxx<x) {maxx=x;}
			if (maxy<y) {maxy=y;}
		}
		this.aabb={minx:minx,maxx:maxx,dx:maxx-minx,
		           miny:miny,maxy:maxy,dy:maxy-miny};
	}


	addvert(type,x,y) {
		var idx=this.vertidx++;
		var arr=this.vertarr;
		if (idx>=arr.length) {
			for (var len=8;len<=idx;len+=len) {}
			while (arr.length<len) {arr.push({type:-1,x:0,y:0,i:-1});}
		}
		var v=arr[idx];
		v.type=type;
		v.x=x;
		v.y=y;
		v.i=this.moveidx;
		var aabb=this.aabb;
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
		var move=this.moveidx;
		if (move<0) {return this;}
		if (move===this.vertidx-1) {
			this.vertidx--;
			return this;
		}
		var m=this.vertarr[move];
		m.i=this.vertidx;
		this.addvert(this.CLOSE,m.x,m.y);
		this.moveidx=-2;
		return this;
	}


	tostring(precision) {
		// Converts the path to an SVG string.
		var p=precision===undefined?10:precision;
		function tostring(x) {
			var s=x.toFixed(p);
			if (p>0) {
				var i=s.length;
				while (i>0 && s.charCodeAt(i-1)===48) {i--;}
				if (s.charCodeAt(i-1)===46) {i--;}
				s=s.substring(0,i);
			}
			return s;
		}
		var name=["M ","Z","L ","C "];
		var ret="";
		for (var i=0;i<this.vertidx;i++) {
			var v=this.vertarr[i],t=v.type;
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
		// Parses an SVG path. Supports M, Z, L, C.
		this.begin();
		var type,j,len=str.length;
		var params=[2,0,2,6],v=[0,0,0,0,0,0];
		function isnum(c) {
			c=c.length!==undefined?c.charCodeAt(0):c;
			return c>42 && c<58 && c!==44 && c!==47;
		}
		for (var i=0;i<len;) {
			var c=str[i++];
			if (c==="M") {type=0;}
			else if (c==="Z") {type=1;}
			else if (c==="L") {type=2;}
			else if (c==="C") {type=3;}
			else if (isnum(c)) {type=2;i--;}
			else {continue;}
			for (var t=0;t<params[type];t++) {
				for (j=i;j<len && !isnum(str.charCodeAt(j));j++) {}
				for (i=j;i<len && isnum(str.charCodeAt(i));i++) {}
				v[t]=parseFloat(str.substring(j,i));
			}
			if (type===0) {this.moveto(v[0],v[1]);}
			else if (type===1) {this.close();}
			else if (type===2) {this.lineto(v[0],v[1]);}
			else {this.curveto(v[0],v[1],v[2],v[3],v[4],v[5]);}
		}
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
		this.addstrip([x,y,x+w,y,x+w,y+h,x,y+h]);
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
		this.width=width;
		this.height=height;
		if (width<1 || height<1) {
			width=1;
			height=1;
		}
		this.data8  =new Uint8Array(width*height*4);
		this.datac8 =new Uint8ClampedArray(this.data8.buffer);
		this.data32 =new Uint32Array(this.data8.buffer);
		this.imgdata=new ImageData(this.datac8,width,height);
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
				if (bytes===3) {dst[didx++]=255;}
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


class _DrawFont {

	static deffont=`monospace
		none
		1000
		SPC 580
		! 580 M 235 56 L 343 56 L 329 586 L 250 586 Z M 288 793 C 250 793 220 763 220 725 C 220 687 250 657 288 657 C 326 657 356 687 357 725 C 356 763 326 793 288 793
		" 580 M 133 56 L 246 56 L 232 298 L 148 298 Z M 334 56 L 447 56 L 433 298 L 348 298 Z
		# 580 M 181 111 L 256 111 L 239 281 L 372 281 L 389 111 L 465 111 L 447 281 L 558 281 L 558 348 L 440 348 L 422 528 L 530 528 L 530 595 L 415 595 L 397 784 L 321 784 L 339 595 L 208 595 L 189 784 L 113 784 L 132 595 L 22 595 L 22 528 L 139 528 L 157 348 L 49 348 L 49 281 L 164 281 Z M 233 348 L 215 528 L 347 528 L 365 348 Z
		$ 580 M 305 14 L 379 14 L 366 115 C 399 119 435 122 470 131 L 470 210 C 436 202 402 194 356 190 L 327 411 C 459 460 517 511 517 599 C 515 762 328 783 277 783 L 261 906 L 186 906 L 202 783 C 156 779 106 774 57 761 L 57 676 C 93 688 161 702 213 704 L 244 472 C 159 441 64 398 62 294 C 62 209 127 120 292 112 Z M 282 189 C 209 195 160 222 158 281 C 157 338 210 364 256 382 Z M 288 704 C 382 696 419 662 421 603 C 423 546 367 521 314 500 Z
		% 580 M 484 56 L 569 56 L 95 784 L 10 784 Z M 19 199 C 19 121 69 49 160 49 C 244 49 295 103 295 199 C 295 281 248 357 155 357 C 65 357 19 297 19 199 M 158 114 C 128 114 95 139 95 204 C 95 269 124 292 156 292 C 190 292 219 263 219 204 C 219 133 187 114 158 114 M 285 633 C 285 555 335 483 426 483 C 510 483 561 537 561 633 C 561 715 514 791 421 791 C 331 791 285 731 285 633 M 424 548 C 394 548 361 573 361 638 C 361 703 390 726 422 726 C 456 726 485 697 485 638 C 485 567 453 548 424 548
		& 580 M 416 579 C 428 544 439 495 437 433 L 527 433 C 527 506 519 575 476 654 L 580 784 L 461 784 L 416 728 C 371 763 318 791 237 791 C 108 791 29 716 29 602 C 29 503 85 445 156 402 C 120 355 88 310 88 242 C 88 122 173 71 268 71 C 364 71 436 126 436 221 C 436 312 375 363 283 414 Z M 238 357 C 279 333 345 301 345 229 C 345 177 315 147 265 147 C 209 147 180 186 180 234 C 180 289 214 327 238 357 M 202 460 C 167 485 122 523 122 593 C 122 668 176 714 247 714 C 295 714 330 698 366 665 Z
		' 580 M 232 56 L 349 56 L 334 298 L 246 298 Z
		( 580 M 446 70 C 326 185 246 336 246 508 C 247 677 324 828 446 945 L 392 1000 C 266 882 154 726 154 508 C 154 290 283 115 394 17 Z
		) 580 M 188 17 C 309 129 425 287 425 504 C 425 710 327 869 186 1000 L 134 947 C 247 832 333 700 333 504 C 333 333 243 176 134 72 Z
		* 580 M 254 56 L 327 56 L 314 233 L 460 134 L 496 197 L 337 276 L 495 352 L 460 413 L 315 317 L 327 493 L 254 493 L 265 317 L 117 413 L 85 353 L 243 275 L 85 195 L 120 135 L 266 233 Z
		+ 580 M 246 255 L 334 255 L 334 464 L 537 464 L 537 542 L 334 542 L 334 752 L 246 752 L 246 542 L 43 542 L 43 464 L 246 464 Z
		, 580 M 259 802 C 259 747 210 739 210 685 C 210 649 236 618 279 618 C 326 618 371 652 371 742 C 371 864 277 961 123 960 L 123 890 C 159 891 258 877 259 802
		- 580 M 136 461 L 444 461 L 444 545 L 136 545 Z
		. 580 M 286 793 C 238 793 200 754 200 708 C 200 661 239 621 286 621 C 333 621 372 662 372 708 C 372 753 334 793 286 793
		/ 580 M 413 56 L 498 56 L 145 895 L 59 895 Z
		0 580 M 295 101 C 447 101 534 219 534 438 C 535 668 444 793 284 793 C 126 793 45 668 45 438 C 45 219 142 101 295 101 M 423 296 C 410 244 368 178 291 178 C 175 178 124 310 138 508 Z M 155 594 C 184 688 233 716 291 716 C 405 716 458 579 440 381 Z
		1 580 M 284 108 L 363 108 L 363 701 L 513 701 L 513 784 L 91 784 L 91 701 L 264 701 L 264 209 L 103 297 L 70 221 Z
		2 580 M 79 190 C 125 148 173 101 283 101 C 414 101 483 187 483 296 C 483 435 394 500 192 699 L 519 699 L 519 784 L 76 784 L 76 704 C 286 486 386 426 386 304 C 386 162 232 140 128 249 Z
		3 580 M 103 128 C 153 110 203 101 255 101 C 366 101 474 143 474 266 C 474 343 439 390 363 428 C 421 436 506 485 506 581 C 506 721 383 793 211 793 C 164 793 124 789 85 784 L 85 704 C 125 710 164 715 219 715 C 340 715 413 679 413 588 C 413 500 323 476 262 474 L 167 474 L 167 400 L 257 400 C 349 393 380 338 380 281 C 380 201 313 142 103 205 Z
		4 580 M 309 111 L 438 111 L 438 556 L 553 556 L 553 635 L 438 635 L 438 784 L 346 784 L 346 635 L 22 635 L 22 556 Z M 346 556 L 346 198 L 112 556 Z
		5 580 M 104 111 L 466 111 L 466 189 L 188 189 L 188 378 L 261 378 C 422 378 502 457 502 569 C 502 706 371 793 220 793 C 174 793 135 788 92 784 L 92 702 C 136 713 178 714 225 715 C 365 715 406 638 406 575 C 406 489 340 457 242 455 L 104 455 Z
		6 580 M 475 189 L 386 189 C 269 189 161 256 156 411 C 214 377 277 369 319 369 C 457 369 527 448 527 567 C 527 677 455 793 291 793 C 145 793 64 702 64 493 C 64 240 180 111 393 111 L 475 111 Z M 156 487 C 156 661 204 719 299 719 C 380 719 434 666 434 575 C 434 496 398 443 306 441 C 259 441 216 453 156 487
		7 580 M 60 111 L 515 111 L 515 195 L 233 784 L 131 784 L 424 194 L 60 194 Z
		8 580 M 295 101 C 443 101 504 167 504 263 C 504 354 439 399 379 432 C 472 480 519 531 519 616 C 519 729 421 793 286 793 C 168 793 61 743 61 626 C 61 529 126 480 202 439 C 94 383 76 321 76 270 C 76 169 163 101 295 101 M 298 393 C 370 359 413 321 413 266 C 413 206 370 176 292 176 C 219 176 168 201 168 263 C 168 333 236 362 298 393 M 283 478 C 202 517 158 556 158 618 C 158 677 207 716 290 716 C 380 716 422 676 422 621 C 422 554 362 513 283 478
		9 580 M 285 101 C 461 101 515 243 515 409 C 515 704 356 784 148 784 L 93 784 L 93 706 L 153 706 C 337 706 414 631 423 483 C 379 506 333 525 254 525 C 135 525 51 453 51 324 C 51 193 153 101 285 101 M 423 407 C 423 282 399 175 281 175 C 188 175 146 241 146 319 C 146 414 198 452 271 452 C 334 452 386 432 423 407
		: 580 M 290 416 C 246 416 211 381 211 337 C 211 293 246 258 290 258 C 334 258 369 293 369 337 C 369 381 334 416 290 416 M 290 793 C 246 793 211 758 211 714 C 211 670 246 635 290 635 C 334 635 369 670 369 714 C 369 758 334 793 290 793
		; 580 M 290 416 C 246 416 211 381 211 337 C 211 293 246 258 290 258 C 334 258 369 293 369 337 C 369 381 334 416 290 416 M 129 890 C 161 892 265 877 265 802 C 265 747 216 739 216 685 C 216 647 244 618 285 618 C 329 618 378 651 378 742 C 378 863 283 961 129 960 Z
		< 580 M 417 214 L 473 271 L 192 503 L 473 735 L 417 792 L 71 503 Z
		= 580 M 69 375 L 511 375 L 511 451 L 69 451 Z M 69 555 L 511 555 L 511 631 L 69 631 Z
		> 580 M 163 214 L 509 503 L 163 792 L 108 735 L 389 503 L 108 271 Z
		? 580 M 156 56 C 358 50 475 166 475 287 C 475 375 431 453 294 459 L 290 586 L 213 586 L 207 389 L 267 389 C 298 389 378 386 378 294 C 378 179 264 132 156 136 Z M 251 794 C 213 794 183 764 183 726 C 183 688 212 657 251 657 C 289 657 319 688 319 726 C 319 764 289 794 251 794
		@ 580 M 443 306 L 402 571 C 389 659 398 684 426 684 C 472 683 500 596 500 425 C 500 226 449 112 333 112 C 226 112 152 236 122 328 C 67 499 68 651 96 771 C 143 964 285 961 437 893 L 437 959 C 380 981 341 998 261 998 C 57 998 5 809 5 607 C 5 447 33 344 78 246 C 132 128 227 50 335 50 C 439 50 509 109 544 207 C 569 278 580 391 568 521 C 558 627 524 751 418 751 C 375 751 339 733 339 675 C 308 735 278 751 242 751 C 173 751 145 697 145 600 C 145 454 198 308 314 308 C 346 308 359 314 376 322 Z M 349 390 C 337 374 299 362 273 396 C 245 432 227 513 227 579 C 227 652 230 684 256 684 C 271 684 286 673 299 648 L 316 615 Z
		A 580 M 354 111 L 575 784 L 475 784 L 428 637 L 148 637 L 100 784 L 5 784 L 229 111 Z M 174 555 L 402 555 L 288 195 Z
		B 580 M 274 111 C 387 111 499 141 499 275 C 499 349 466 402 388 427 C 479 446 523 507 523 583 C 523 716 411 783 265 784 L 82 784 L 82 111 Z M 173 399 L 272 399 C 346 399 404 361 404 288 C 404 213 342 188 270 188 L 173 188 Z M 173 707 L 275 707 C 372 707 426 669 426 589 C 426 523 370 475 275 475 L 173 475 Z
		C 580 M 512 224 C 461 197 413 183 353 183 C 201 183 145 315 145 444 C 145 636 228 710 352 710 C 423 710 462 694 512 673 L 512 759 C 463 776 422 792 344 792 C 124 792 47 647 47 444 C 47 251 154 102 353 102 C 421 102 467 115 512 134 Z
		D 580 M 234 111 C 498 111 542 291 542 437 C 542 709 381 784 207 784 L 56 784 L 56 111 Z M 228 705 C 336 705 446 652 446 437 C 446 267 380 189 228 188 L 148 188 L 148 705 Z
		E 580 M 486 111 L 486 188 L 195 188 L 195 397 L 475 397 L 475 474 L 195 474 L 195 706 L 486 706 L 486 784 L 104 784 L 104 111 Z
		F 580 M 485 111 L 485 189 L 199 189 L 199 407 L 470 407 L 470 484 L 199 484 L 199 784 L 106 784 L 106 111 Z
		G 580 M 518 225 C 478 206 429 183 354 183 C 211 183 130 293 130 447 C 130 608 187 707 342 712 C 374 712 402 708 431 698 L 431 484 L 293 484 L 293 408 L 521 408 L 521 752 C 469 775 408 793 332 793 C 127 793 34 654 34 447 C 34 240 159 101 355 101 C 422 101 475 115 518 134 Z
		H 580 M 432 111 L 523 111 L 523 784 L 432 784 L 432 475 L 149 475 L 149 784 L 57 784 L 57 111 L 149 111 L 149 396 L 432 396 Z
		I 580 M 89 111 L 491 111 L 491 188 L 336 188 L 336 706 L 491 706 L 491 784 L 89 784 L 89 706 L 244 706 L 244 188 L 89 188 Z
		J 580 M 103 111 L 452 111 L 452 573 C 452 711 368 791 243 791 C 173 791 117 770 94 754 L 94 662 C 119 681 177 711 240 711 C 320 711 359 659 359 579 L 359 190 L 103 190 Z
		K 580 M 80 111 L 172 111 L 172 424 L 419 111 L 527 111 L 261 431 L 539 784 L 424 784 L 172 454 L 172 784 L 80 784 Z
		L 580 M 120 111 L 213 111 L 213 706 L 507 706 L 507 784 L 120 784 Z
		M 580 M 58 111 L 167 111 L 287 450 L 411 111 L 522 111 L 555 784 L 465 784 L 446 203 L 315 565 L 252 565 L 125 203 L 112 784 L 25 784 Z
		N 580 M 61 111 L 179 111 L 434 663 L 434 111 L 519 111 L 519 784 L 400 784 L 147 229 L 147 784 L 61 784 Z
		O 580 M 295 101 C 472 101 551 237 551 441 C 551 674 444 793 285 793 C 79 793 30 621 30 444 C 30 262 112 101 295 101 M 291 181 C 182 181 125 289 125 441 C 125 628 185 713 287 713 C 406 713 456 597 456 451 C 456 282 405 181 291 181
		P 580 M 272 111 C 423 111 523 182 523 314 C 523 444 426 542 261 542 L 173 542 L 173 784 L 82 784 L 82 111 Z M 256 464 C 369 464 428 417 428 320 C 428 224 354 187 270 187 L 173 187 L 173 464 Z
		Q 580 M 580 917 C 541 948 500 969 435 969 C 314 969 246 894 241 790 C 87 768 29 630 29 453 C 29 263 112 101 295 101 C 509 101 551 292 551 438 C 551 592 505 756 326 790 C 338 858 380 890 441 890 C 483 889 507 879 539 854 Z M 288 712 C 411 712 455 594 456 448 C 456 286 408 183 289 183 C 187 183 124 280 125 440 C 125 638 192 711 288 712
		R 580 M 270 111 C 430 111 490 187 490 287 C 490 388 424 445 346 464 C 378 472 412 516 424 542 L 541 784 L 438 784 L 333 560 C 316 523 284 485 232 485 L 179 485 L 179 784 L 88 784 L 88 111 Z M 255 411 C 343 411 394 370 394 296 C 394 231 356 188 269 188 L 179 188 L 179 411 Z
		S 580 M 470 203 C 426 192 375 180 308 180 C 255 180 161 195 161 276 C 161 324 203 359 258 381 L 361 423 C 474 469 513 529 513 603 C 513 728 408 793 243 793 C 180 793 121 785 57 770 L 57 681 C 105 699 172 712 247 712 C 374 712 418 673 418 606 C 418 564 382 528 322 504 L 222 463 C 141 430 65 381 65 286 C 65 161 183 101 314 101 C 382 101 420 112 470 121 Z
		T 580 M 44 111 L 536 111 L 536 189 L 336 189 L 336 784 L 244 784 L 244 189 L 44 189 Z
		U 580 M 148 111 L 148 571 C 148 665 195 716 290 716 C 390 716 433 651 433 557 L 433 111 L 524 111 L 524 562 C 524 698 435 793 288 793 C 173 793 56 751 56 564 L 56 111 Z
		V 580 M 106 111 L 292 698 L 480 111 L 578 111 L 349 784 L 225 784 L 2 111 Z
		W 580 M 110 111 L 143 695 L 257 338 L 321 338 L 446 695 L 475 111 L 557 111 L 511 784 L 393 784 L 286 467 L 184 784 L 70 784 L 23 111 Z
		X 580 M 136 111 L 290 365 L 445 111 L 550 111 L 344 436 L 567 784 L 452 784 L 288 512 L 123 784 L 9 784 L 234 440 L 27 111 Z
		Y 580 M 110 111 L 294 456 L 475 111 L 580 111 L 336 543 L 336 784 L 244 784 L 244 541 L 0 111 Z
		Z 580 M 67 111 L 515 111 L 515 184 L 171 699 L 522 699 L 522 784 L 57 784 L 57 715 L 403 194 L 67 194 Z
		[ 580 M 178 38 L 432 38 L 432 110 L 263 110 L 263 923 L 432 923 L 432 995 L 178 995 Z
		\\ 580 M 83 56 L 168 56 L 521 895 L 436 895 Z
		] 580 M 149 38 L 402 38 L 402 995 L 149 995 L 149 923 L 316 923 L 316 110 L 149 110 Z
		^ 580 M 251 111 L 324 111 L 522 440 L 433 440 L 284 182 L 143 440 L 63 440 Z
		_ 580 M 0 921 L 580 921 L 580 995 L 0 995 Z
		\` 580 M 90 56 L 219 56 L 344 181 L 254 181 Z
		a 580 M 112 291 C 164 273 222 258 293 258 C 429 258 495 322 495 426 L 495 784 L 415 784 L 413 714 C 381 745 327 793 235 793 C 125 793 69 736 69 646 C 69 542 150 481 275 481 L 405 481 L 405 432 C 405 385 375 334 287 334 C 239 334 185 342 112 372 Z M 287 549 C 219 549 163 576 163 643 C 163 689 195 718 248 718 C 297 718 359 685 405 640 L 405 549 Z
		b 580 M 83 56 L 172 56 L 168 352 C 212 292 270 258 346 258 C 461 258 524 359 524 512 C 524 714 408 790 268 790 C 193 790 143 776 83 754 Z M 172 695 C 204 706 236 717 278 717 C 399 717 433 617 433 519 C 433 434 410 336 329 336 C 266 336 229 377 172 444 Z
		c 580 M 484 369 C 446 350 404 336 346 336 C 258 336 175 400 175 531 C 175 660 248 714 347 714 C 414 714 443 700 484 682 L 484 765 C 441 781 392 791 335 791 C 202 791 82 729 82 533 C 81 367 185 260 344 260 C 409 260 445 270 484 284 Z
		d 580 M 405 56 L 495 56 L 495 784 L 415 784 L 412 685 C 374 738 323 793 234 793 C 110 793 56 678 56 533 C 56 414 113 261 309 261 C 355 261 378 267 405 274 Z M 405 356 C 376 345 350 335 307 335 C 212 335 148 386 148 533 C 148 652 184 716 252 716 C 309 716 360 659 405 596 Z
		e 580 M 154 554 C 154 652 205 718 327 718 C 386 718 438 710 491 696 L 491 770 C 435 784 390 793 309 793 C 137 793 60 691 60 529 C 60 331 190 258 295 258 C 519 258 529 466 517 554 Z M 426 485 C 430 425 404 330 292 330 C 215 330 161 388 154 485 Z
		f 580 M 541 140 C 503 132 470 125 418 125 C 349 125 299 159 299 247 L 299 342 L 525 342 L 525 417 L 299 417 L 299 784 L 207 784 L 207 417 L 41 417 L 41 342 L 207 342 L 207 255 C 207 118 284 50 420 50 C 472 50 501 56 541 62 Z
		g 580 M 538 267 L 538 340 L 454 340 C 467 353 485 385 485 433 C 485 548 395 614 284 614 C 239 614 212 607 177 590 C 166 605 154 622 154 646 C 154 673 182 690 218 692 L 372 698 C 467 702 536 750 536 828 C 536 933 439 1000 281 1000 C 156 1000 48 966 48 866 C 48 806 85 771 120 745 C 103 739 68 711 68 662 C 68 620 90 585 122 548 C 93 516 80 486 80 438 C 80 333 160 258 282 258 C 315 258 332 262 350 267 Z M 282 547 C 350 547 395 497 395 436 C 395 385 363 325 282 325 C 238 325 171 353 171 436 C 171 524 245 547 282 547 M 200 770 C 176 788 143 810 144 857 C 143 911 216 930 289 929 C 400 928 441 879 440 838 C 439 794 397 776 339 775 Z
		h 580 M 82 56 L 172 56 L 169 349 C 207 305 253 258 337 258 C 444 258 498 329 498 441 L 498 784 L 408 784 L 408 453 C 408 387 387 335 321 335 C 249 335 203 412 172 441 L 172 784 L 82 784 Z
		i 580 M 290 191 C 251 191 220 159 220 120 C 220 81 251 50 290 50 C 329 50 360 81 360 120 C 360 159 329 191 290 191 M 106 267 L 349 267 L 349 709 L 503 709 L 503 784 L 89 784 L 89 709 L 259 709 L 259 341 L 106 341 Z
		j 580 M 379 191 C 340 191 308 158 308 120 C 308 81 340 50 379 50 C 418 50 449 81 449 120 C 449 159 418 191 379 191 M 89 267 L 433 267 L 433 773 C 433 934 331 1000 209 1000 C 158 1000 111 992 68 973 L 68 888 C 126 917 179 924 215 924 C 302 924 342 862 342 786 L 342 341 L 89 341 Z
		k 580 M 94 56 L 183 56 L 183 503 L 416 267 L 534 267 L 291 506 L 547 784 L 424 784 L 183 507 L 183 784 L 94 784 Z
		l 580 M 106 56 L 349 56 L 349 709 L 503 709 L 503 784 L 89 784 L 89 709 L 259 709 L 259 129 L 106 129 Z
		m 580 M 115 267 L 119 366 C 145 309 172 258 234 258 C 295 258 318 300 318 370 C 360 276 393 258 437 258 C 490 258 534 297 534 399 L 534 784 L 451 784 L 451 408 C 451 379 452 332 419 332 C 389 332 369 378 331 452 L 331 784 L 249 784 L 249 412 C 249 360 242 332 216 332 C 195 332 174 353 129 452 L 129 784 L 46 784 L 46 267 Z
		n 580 M 162 267 L 166 351 C 215 296 256 258 336 258 C 449 258 498 332 498 436 L 498 784 L 408 784 L 408 449 C 408 382 383 335 319 335 C 280 335 247 348 172 441 L 172 784 L 82 784 L 82 267 Z
		o 580 M 295 258 C 487 258 533 407 533 521 C 533 691 430 793 285 793 C 117 793 47 677 47 528 C 47 377 134 258 295 258 M 291 334 C 221 334 139 378 139 525 C 139 668 212 718 290 718 C 391 718 441 635 441 525 C 441 427 403 334 291 334
		p 580 M 162 267 L 168 354 C 201 309 251 258 346 258 C 441 258 524 329 524 519 C 524 700 414 790 271 790 C 237 790 203 786 172 779 L 172 995 L 82 995 L 82 267 Z M 172 695 C 205 709 241 717 274 717 C 385 717 433 640 433 521 C 433 408 399 336 327 336 C 279 336 234 365 172 445 Z
		q 580 M 495 258 L 495 995 L 405 995 L 409 689 C 372 742 318 793 234 793 C 126 793 56 702 56 536 C 56 399 125 261 309 261 C 342 261 371 264 415 278 Z M 405 356 C 377 345 347 334 303 334 C 187 334 148 420 148 531 C 148 673 198 716 252 716 C 301 716 342 682 405 596 Z
		r 580 M 185 267 L 188 363 C 242 294 308 258 369 258 C 501 258 529 359 529 464 L 438 464 C 438 414 434 336 356 335 C 306 336 266 364 194 451 L 194 784 L 103 784 L 103 267 Z
		s 580 M 458 353 C 408 342 371 333 311 333 C 242 333 192 352 192 399 C 192 453 257 467 327 490 C 466 533 492 576 492 641 C 492 746 386 793 269 793 C 211 793 150 787 94 774 L 94 691 C 143 704 195 717 267 717 C 355 717 399 696 399 650 C 399 611 378 593 265 559 C 145 522 101 479 101 405 C 101 312 191 258 312 258 C 383 258 414 266 458 273 Z
		t 580 M 267 102 L 267 267 L 499 267 L 499 342 L 267 342 L 267 609 C 267 689 320 715 384 715 C 436 715 462 708 499 699 L 499 776 C 459 786 432 791 369 791 C 225 791 177 719 177 608 L 177 342 L 33 342 L 33 267 L 177 267 L 177 125 Z
		u 580 M 408 267 L 498 267 L 498 784 L 418 784 L 415 700 C 374 745 330 793 242 793 C 137 793 82 726 82 609 L 82 267 L 172 267 L 172 609 C 172 674 203 716 261 716 C 326 716 363 662 408 610 Z
		v 580 M 444 267 L 542 267 L 339 784 L 236 784 L 34 267 L 136 267 L 290 692 Z
		w 580 M 473 267 L 561 267 L 486 784 L 378 784 L 288 515 L 199 784 L 94 784 L 19 267 L 107 267 L 159 697 L 257 396 L 321 396 L 425 694 Z
		x 580 M 160 267 L 296 466 L 430 267 L 540 267 L 346 527 L 549 784 L 430 784 L 290 586 L 152 784 L 36 784 L 237 524 L 45 267 Z
		y 580 M 136 267 L 293 690 L 444 267 L 542 267 L 365 733 C 271 981 165 1006 31 996 L 30 915 C 140 929 181 905 241 784 L 34 267 Z
		z 580 M 92 267 L 484 267 L 484 337 L 197 708 L 501 708 L 501 784 L 84 784 L 84 719 L 377 342 L 92 342 Z
		{ 580 M 462 110 L 424 110 C 372 110 311 138 312 221 L 312 356 C 312 409 288 476 203 488 C 283 494 313 551 313 623 L 313 810 C 313 885 359 922 426 923 L 462 923 L 462 995 L 416 995 C 269 995 228 905 228 810 L 228 623 C 228 560 192 523 113 523 L 84 523 L 84 452 L 113 452 C 192 452 228 424 228 353 L 228 221 C 228 72 325 38 424 38 L 462 38 Z
		| 580 M 248 0 L 332 0 L 332 995 L 248 995 Z
		} 580 M 118 38 L 156 38 C 255 38 352 72 352 221 L 352 353 C 352 424 388 452 467 452 L 496 452 L 496 523 L 467 523 C 388 523 352 560 352 623 L 352 810 C 352 905 311 995 164 995 L 118 995 L 118 923 L 154 923 C 221 922 267 885 267 810 L 267 623 C 267 551 297 494 377 488 C 292 476 268 409 268 356 L 268 221 C 269 138 208 110 156 110 L 118 110 Z
		~ 580 M 546 426 L 546 437 C 546 539 491 607 401 607 C 359 607 317 587 280 550 L 249 519 C 230 500 204 477 176 477 C 132 477 116 524 116 563 L 116 578 L 34 578 L 34 563 C 34 476 81 396 180 396 C 232 396 273 426 302 455 L 331 484 C 364 517 383 526 403 526 C 444 526 464 497 464 437 L 464 426 Z
		█ 580 M 0 0 L 580 0 L 580 1000 L 0 1000 Z
	`;
	// `


	constructor(defscale) {
		this.defscale=defscale===undefined?16:defscale;
		this.lineheight=1.1;
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
		var idx=0,len=fontdef.length;
		function token(eol) {
			var c;
			while (idx<len && (c=fontdef.charCodeAt(idx))<=32 && c!==10) {idx++;}
			var i=idx;
			while (idx<len && fontdef.charCodeAt(idx)>eol) {idx++;}
			return fontdef.substring(i,idx);
		}
		token(10); idx++; // name
		token(10); idx++; // info
		var scale=parseFloat(token(10));
		while (idx<len) {
			idx++;
			var chr=token(32);
			if (chr.length<=0) {continue;}
			chr=chr==="SPC"?32:chr.charCodeAt(0);
			var g={};
			g.width=parseInt(token(32))/scale;
			g.poly=new Draw.Poly(token(10));
			var varr=g.poly.vertarr,vidx=g.poly.vertidx;
			for (var i=0;i<vidx;i++) {
				var v=varr[i];
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
		var len=str.length;
		var xpos=0,xmax=0;
		var ypos=0,lh=this.lineheight;
		var glyphs=this.glyphs;
		for (var i=0;i<len;i++) {
			var c=str.charCodeAt(i);
			var g=glyphs[c];
			if (g===undefined) {
				if (c===10) {
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
	static Transform=_DrawTransform;
	static Poly     =_DrawPoly;
	static Font     =_DrawFont;
	static Image    =_DrawImage;


	constructor(width,height) {
		var con=this.constructor;
		Object.assign(this,con);
		// Image info
		this.img      =new con.Image(width,height);
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
		this.rgba[0]=r?Math.max(Math.min(Math.floor(r),255),0):0;
		this.rgba[1]=g?Math.max(Math.min(Math.floor(g),255),0):0;
		this.rgba[2]=b?Math.max(Math.min(Math.floor(b),255),0):0;
		this.rgba[3]=a?Math.max(Math.min(Math.floor(a),255),0):0;
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


	transformpoint(x,y) {
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


	settransform(trans) {return this.deftrans.copy(trans);}
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


	fill(r,g,b,a) {
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
		var font=this.deffont,glyphs=font.glyphs;
		if (scale===undefined) {scale=font.defscale;}
		var len=str.length;
		var xpos=0,lh=font.lineheight;
		var trans=this.tmptrans;
		trans.copy(this.deftrans).addoffset(x,y).mulscale(scale,scale);
		for (var i=0;i<len;i++) {
			var c=str.charCodeAt(i);
			var g=glyphs[c];
			if (g===undefined) {
				if (c===10) {
					trans.addoffset(-xpos,lh,true);
					xpos=0;
				} else if (c===13) {
					trans.addoffset(-xpos,0,true);
					xpos=0;
				} else {
					g=font.unknown;
				}
				if (g===undefined) {
					continue;
				}
			}
			this.fillpoly(g.poly,trans);
			trans.addoffset(g.width,0,true);
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
		var len=this.tmpline.length;
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
				dyx:0,
				maxy:0,
				minx:0,
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
		if (poly ===undefined) {poly =this.defpoly ;}
		if (trans===undefined) {trans=this.deftrans;}
		var iw=this.img.width,ih=this.img.height,imgdata=this.img.data32;
		if (poly.vertidx<3 || iw<1 || ih<1) {return;}
		// Screenspace transformation.
		var vmulx=this.viewmulx,voffx=this.viewoffx;
		var vmuly=this.viewmuly,voffy=this.viewoffy;
		var matxx=trans.data[0]*vmulx,matxy=trans.data[1]*vmulx,matx=(trans.data[2]-voffx)*vmulx;
		var matyx=trans.data[3]*vmuly,matyy=trans.data[4]*vmuly,maty=(trans.data[5]-voffy)*vmuly;
		// Perform a quick AABB-OBB overlap test.
		// Define the transformed bounding box.
		var aabb=poly.aabb;
		var bndx=aabb.minx*matxx+aabb.miny*matxy+matx;
		var bndy=aabb.minx*matyx+aabb.miny*matyy+maty;
		var bnddx0=aabb.dx*matxx,bnddy0=aabb.dx*matyx;
		var bnddx1=aabb.dy*matxy,bnddy1=aabb.dy*matyy;
		// Test if the image AABB has a separating axis.
		var minx=bndx,maxx=bndx,miny=bndy,maxy=bndy;
		if (bnddx0<0) {minx+=bnddx0;} else {maxx+=bnddx0;}
		if (bnddy0<0) {miny+=bnddy0;} else {maxy+=bnddy0;}
		if (bnddx1<0) {minx+=bnddx1;} else {maxx+=bnddx1;}
		if (bnddy1<0) {miny+=bnddy1;} else {maxy+=bnddy1;}
		if (maxx<=0 || iw<=minx || maxy<=0 || ih<=miny) {
			return;
		}
		// Test if the poly OBB has a separating axis.
		var cross=bnddx0*bnddy1-bnddy0*bnddx1;
		minx=cross<0?cross:0;maxx=cross-minx;maxy=-minx;miny=-maxx;
		if (bnddx0<0) {maxx-=ih*bnddx0;} else {minx-=ih*bnddx0;}
		if (bnddy0<0) {minx+=iw*bnddy0;} else {maxx+=iw*bnddy0;}
		if (bnddx1<0) {maxy-=ih*bnddx1;} else {miny-=ih*bnddx1;}
		if (bnddy1<0) {miny+=iw*bnddy1;} else {maxy+=iw*bnddy1;}
		var proj0=bndx*bnddy0-bndy*bnddx0;
		var proj1=bndx*bnddy1-bndy*bnddx1;
		if (maxx<=proj0 || proj0<=minx || maxy<=proj1 || proj1<=miny) {
			return;
		}
		// Loop through the path nodes.
		var l,i,j,tmp;
		var lr=this.tmpline,lrcnt=lr.length,lcnt=0;
		var splitlen=3;
		var x0,y0,x1,y1;
		var p0x,p0y,p1x,p1y;
		var dx,dy;
		var varr=poly.vertarr;
		for (i=0;i<poly.vertidx;i++) {
			var v=varr[i];
			if (v.type===poly.CURVE) {v=varr[i+2];}
			p0x=p1x; p1x=v.x*matxx+v.y*matxy+matx;
			p0y=p1y; p1y=v.x*matyx+v.y*matyy+maty;
			if (v.type===poly.MOVE) {continue;}
			// Add a basic line.
			if (lrcnt<=lcnt) {
				lr=this.fillresize(lcnt+1);
				lrcnt=lr.length;
			}
			l=lr[lcnt++];
			l.x0=p0x;
			l.y0=p0y;
			l.x1=p1x;
			l.y1=p1y;
			if (v.type===poly.CURVE) {
				// Linear decomposition of curves.
				// Get the control points and check if the curve's on the screen.
				v=varr[i++]; var c1x=v.x*matxx+v.y*matxy+matx,c1y=v.x*matyx+v.y*matyy+maty;
				v=varr[i++]; var c2x=v.x*matxx+v.y*matxy+matx,c2y=v.x*matyx+v.y*matyy+maty;
				var c3x=p1x,c3y=p1y;
				x0=Math.min(p0x,Math.min(c1x,Math.min(c2x,c3x)));
				x1=Math.max(p0x,Math.max(c1x,Math.max(c2x,c3x)));
				y0=Math.min(p0y,Math.min(c1y,Math.min(c2y,c3y)));
				y1=Math.max(p0y,Math.max(c1y,Math.max(c2y,c3y)));
				if (x0>=iw || y0>=ih || y1<=0) {lcnt--;continue;}
				if (x1<=0) {continue;}
				// Estimate bezier length.
				var dist;
				dx=c1x-p0x;dy=c1y-p0y;dist =Math.sqrt(dx*dx+dy*dy);
				dx=c2x-c1x;dy=c2y-c1y;dist+=Math.sqrt(dx*dx+dy*dy);
				dx=c3x-c2x;dy=c3y-c2y;dist+=Math.sqrt(dx*dx+dy*dy);
				dx=p0x-c3x;dy=p0y-c3y;dist+=Math.sqrt(dx*dx+dy*dy);
				var segs=Math.ceil(dist*0.5/splitlen);
				if (segs<=1) {continue;}
				lcnt--;
				if (lrcnt<=lcnt+segs) {
					lr=this.fillresize(lcnt+segs+1);
					lrcnt=lr.length;
				}
				// Segment the curve.
				c2x=(c2x-c1x)*3;c1x=(c1x-p0x)*3;c3x-=p0x+c2x;c2x-=c1x;
				c2y=(c2y-c1y)*3;c1y=(c1y-p0y)*3;c3y-=p0y+c2y;c2y-=c1y;
				var ppx=p0x,ppy=p0y,unorm=1.0/segs;
				for (var s=0;s<segs;s++) {
					var u=(s+1)*unorm;
					var cpx=p0x+u*(c1x+u*(c2x+u*c3x));
					var cpy=p0y+u*(c1y+u*(c2y+u*c3y));
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
		minx=iw;maxx=0;miny=ih;maxy=0;
		var amul=this.rgba[3]*(256.0/255.0);
		if ((matxx<0)!==(matyy<0)) {amul=-amul;}
		var y0x,y1x;
		var maxcnt=lcnt;
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
			l.area=NaN;
			fx=Math.min(fx,(fy+1-l.y0)*l.dxy+l.x0);
			l.sort=fy*iw+Math.max(Math.floor(fx),l.minx);
			lr[i]=lr[lcnt];
			lr[lcnt++]=l;
		}
		// If all lines are outside the image, abort.
		if (minx>=iw || maxx<=0 || minx>=maxx || miny>=maxy || lcnt<=0) {
			return;
		}
		// Linear time heap construction.
		for (var p=(lcnt>>1)-1;p>=0;p--) {
			i=p;
			l=lr[p];
			while ((j=i+i+1)<lcnt) {
				if (j+1<lcnt && lr[j+1].sort<lr[j].sort) {j++;}
				if (lr[j].sort>=l.sort) {break;}
				lr[i]=lr[j];
				i=j;
			}
			lr[i]=l;
		}
		// Init blending.
		var ashift=this.rgbashift[3],amask=(255<<ashift)>>>0,imask=1.0/amask;
		var maskl=(0x00ff00ff&~amask)>>>0,maskh=(0xff00ff00&~amask)>>>0;
		var sa,da;
		var colrgb=(this.rgba32[0]&~amask)>>>0;
		var coll=(colrgb&0x00ff00ff)>>>0,colh=(colrgb&0xff00ff00)>>>0,colh8=colh>>>8;
		var filllim=255;
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
				if (isNaN(l.area)) {
					x0=l.x0;y0=l.y0-y;
					x1=l.x1;y1=l.y1-y;
					var dyx=l.dyx,dxy=l.dxy;
					y0x=x0-y0*dxy;
					y1x=y0x+dxy;
					if (y0<0) {y0=0;x0=y0x;}
					if (y0>1) {y0=1;x0=y1x;}
					if (y1<0) {y1=0;x1=y0x;}
					if (y1>1) {y1=1;x1=y1x;}
					var next=Math.floor((y0>y1?x0:x1)+(dxy<0?dxy:0));
					next=(next>l.minx?next:l.minx)+xrow;
					if (next>=l.maxy) {next=pixels;}
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
						if (fx0<0) {
							area-=mul-(x0+fx0)*dyx;
						} else {
							area-=n0*n0*mul;
							areadx2+=x0*x0*mul;
						}
						areadx1-=dyx;
						l.area=n1*n1*mul;
						l.areadx1=dyx;
						l.areadx2=x1*x1*mul;
						l.next=next;
						l.sort=fx1<iw?fx1+xrow-iw:next;
					}
				} else {
					area   +=l.area;
					areadx1+=l.areadx1;
					areadx2-=l.areadx2;
					l.area  =NaN;
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
			// If the area isn't changing much use the same area for multiple pixels.
			var xdraw=x+1;
			var sa1=Math.floor(area+0.5);
			if (areadx2===0) {
				tmp=Math.min(Math.max(sa1+(areadx1<0?-0.5:0.5),0.5),255.5);
				tmp=(tmp-area)/areadx1+x;
				xdraw=(tmp>x && tmp<xnext)?Math.ceil(tmp):xnext;
				if (xdraw>xrow) {xdraw=xrow;}
			}
			areadx2+=(xdraw-x)*areadx1;
			if (sa1>=filllim) {
				tmp=colrgb|(Math.min(sa1,255)<<ashift);
				do {imgdata[x++]=tmp;} while (x<xdraw);
			} else if (sa1>0) {
				// a = sa + da*(1-sa)
				// c = (sc*sa + dc*da*(1-sa)) / a
				sa1=256-sa1;
				var sab=area/256,sai=(1-sab)*imask;
				do {
					var dst=imgdata[x];
					da=(dst&amask)>>>0;
					if (da===amask) {
						sa=sa1;
					} else {
						tmp=sab+da*sai;
						sa=256-Math.floor(area/tmp+0.5);
						da=Math.floor(tmp*255+0.5)<<ashift;
					}
					imgdata[x++]=da|
						(((Math.imul((dst&0x00ff00ff)-coll,sa)>>>8)+coll)&maskl)|
						((Math.imul(((dst>>>8)&0x00ff00ff)-colh8,sa)+colh)&maskh);
				} while (x<xdraw);
			}
			x=xdraw;
			area+=areadx2;
		}
	}


	// trace(poly,trans) {
	// 	// Traces the current path
	// }

}


async function DrawWASMSetup() {
	// Attempt to load the WebAssembly program.
	// fill_wasm.c -> compile -> gzip -> base64
	if (Draw.wasmloading) {return;}
	Draw.wasmloading=1;
	var wasmstr=`
		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
	`;
	var gzipbytes=Uint8Array.from(atob(wasmstr),(c)=>c.codePointAt(0));
	var gzipstream=new Blob([gzipbytes]).stream();
	var decstream=gzipstream.pipeThrough(new DecompressionStream("gzip"));
	var decblob=await new Response(decstream).blob();
	var wasmbytes=new Uint8Array(await decblob.arrayBuffer());
	// Compile module.
	var module=new WebAssembly.Module(wasmbytes);
	if (!module) {
		console.log("could not load module");
		Draw.wasmloading=2;
		return;
	}
	// console.log("loading module");
	Draw.wasmmodule=module;
	// Set up class functions.
	Draw.prototype.wasmprinti64=function(h,l) {
		var s="Debug: "+((BigInt(h>>>0)<<32n)+BigInt(l>>>0))+"\n";
		console.log(s);
	};
	Draw.prototype.wasmprintf64=function(x) {
		var s="Debug: "+x;
		console.log(s);
	};
	Draw.prototype.wasmimage=function(img) {
		// console.log("setting image");
		var wasm=this.wasm,old=wasm.img;
		if (old!==null && !Object.is(old,img)) {
			// Generate a new copy for the old image.
			var width=old.width,height=old.height,copy=true;
			if (width<1 || height<1) {
				width=1;
				height=1;
				copy=false;
			}
			old.data8  =new Uint8Array(width*height*4);
			old.datac8 =new Uint8ClampedArray(old.data8.buffer);
			old.data32 =new Uint32Array(old.data8.buffer);
			old.imgdata=new ImageData(old.datac8,width,height);
			if (copy) {old.data32.set(wasm.imgdata);}
		}
		wasm.img=img||null;
		this.wasmresize(0);
	};
	Draw.prototype.wasmresize=function(bytes) {
		// console.log("resizing to: "+bytes);
		if (!bytes) {bytes=0;}
		var wasm=this.wasm;
		var img=wasm.img;
		if (img!==null) {
			wasm.width=img.width;
			wasm.height=img.height;
		} else {
			wasm.width=0;
			wasm.height=0;
		}
		var align=15;
		var imglen=(12+wasm.width*wasm.height*4+align)&~align;
		var pathlen=(6*8+4+4+24*wasm.vertmax+align)&~align;
		var heaplen=(wasm.heaplen+align)&~align;
		var sumlen=heaplen+imglen+pathlen;
		if (bytes && sumlen<bytes) {sumlen=bytes;}
		var newlen=1;
		while (newlen<sumlen) {newlen+=newlen;}
		var pagebytes=65536;
		var wasmmem=wasm.instance.exports.memory;
		var pages=Math.ceil((newlen-wasmmem.buffer.byteLength)/pagebytes);
		if (pages>0) {wasmmem.grow(pages);}
		var memu32=new Uint32Array(wasmmem.buffer,heaplen);
		wasm.memu32=memu32;
		memu32[0]=wasmmem.buffer.byteLength;
		memu32[1]=wasm.width;
		memu32[2]=wasm.height;
		wasm.imgdata=null;
		if (img!==null) {
			// Rebind the image pixel buffer.
			var width=img.width;
			var height=img.height;
			if (width<1 || height<1) {
				width=1;
				height=1;
			}
			var pixels=width*height;
			var buf=wasmmem.buffer,off=heaplen+12;
			wasm.imgdata=new Uint32Array(buf,off,pixels);
			if (img.data32.buffer.byteLength>0) {
				wasm.imgdata.set(img.data32);
			}
			img.data8  =new Uint8Array(buf,off,pixels*4);
			img.datac8 =new Uint8ClampedArray(buf,off,pixels*4);
			img.data32 =wasm.imgdata;
			img.imgdata=new ImageData(img.datac8,width,height);
		}
		wasm.tmpu32=new Uint32Array(wasmmem.buffer,heaplen+imglen);
		wasm.tmpf64=new Float64Array(wasmmem.buffer,heaplen+imglen);
		var dif=wasmmem.buffer.byteLength-wasm.tmpu32.byteOffset;
		wasm.vertmax=Math.floor((dif-(6*8+4+4))/24);
	};
	Draw.prototype.wasminit=function() {
		var con=this.constructor;
		var state=this;
		function wasmprinti64(h,l) {state.wasmprinti64(h,l);}
		function wasmprintf64(x)   {state.wasmprintf64(x);}
		function wasmresize(bytes) {state.wasmresize(bytes);}
		var imports={env:{wasmprinti64,wasmprintf64,wasmresize}};
		var inst=new WebAssembly.Instance(con.wasmmodule,imports);
		this.wasm={
			instance:inst,
			exports :inst.exports,
			heaplen :inst.exports.getheapbase(),
			memu32  :null,
			img     :null,
			imgdata :null,
			width   :0,
			height  :0,
			tmpu32  :null,
			tmpf64  :null,
			vertmax :0,
			fill    :inst.exports.fillpoly
		};
		this.wasmresize(0);
		return this.wasm;
	};
	Draw.prototype.fillpoly=function(poly,trans) {
		// Fills the current path.
		//
		// Preprocess the lines and curves. Reject anything with a NaN, too narrow, or
		// outside the image. Use a binary heap to dynamically sort lines.
		if (poly ===undefined) {poly =this.defpoly ;}
		if (trans===undefined) {trans=this.deftrans;}
		var iw=this.img.width,ih=this.img.height,imgdata=this.img.data32;
		if (poly.vertidx<3 || iw<1 || ih<1) {return;}
		// Screenspace transformation.
		var vmulx=this.viewmulx,voffx=this.viewoffx;
		var vmuly=this.viewmuly,voffy=this.viewoffy;
		var matxx=trans.data[0]*vmulx,matxy=trans.data[1]*vmulx,matx=(trans.data[2]-voffx)*vmulx;
		var matyx=trans.data[3]*vmuly,matyy=trans.data[4]*vmuly,maty=(trans.data[5]-voffy)*vmuly;
		// Perform a quick AABB-OBB overlap test.
		// Define the transformed bounding box.
		var aabb=poly.aabb;
		var bndx=aabb.minx*matxx+aabb.miny*matxy+matx;
		var bndy=aabb.minx*matyx+aabb.miny*matyy+maty;
		var bnddx0=aabb.dx*matxx,bnddy0=aabb.dx*matyx;
		var bnddx1=aabb.dy*matxy,bnddy1=aabb.dy*matyy;
		// Test if the image AABB has a separating axis.
		var minx=bndx,maxx=bndx,miny=bndy,maxy=bndy;
		if (bnddx0<0) {minx+=bnddx0;} else {maxx+=bnddx0;}
		if (bnddy0<0) {miny+=bnddy0;} else {maxy+=bnddy0;}
		if (bnddx1<0) {minx+=bnddx1;} else {maxx+=bnddx1;}
		if (bnddy1<0) {miny+=bnddy1;} else {maxy+=bnddy1;}
		if (maxx<=0 || iw<=minx || maxy<=0 || ih<=miny) {
			return;
		}
		// Test if the poly OBB has a separating axis.
		var cross=bnddx0*bnddy1-bnddy0*bnddx1;
		minx=cross<0?cross:0;maxx=cross-minx;maxy=-minx;miny=-maxx;
		if (bnddx0<0) {maxx-=ih*bnddx0;} else {minx-=ih*bnddx0;}
		if (bnddy0<0) {minx+=iw*bnddy0;} else {maxx+=iw*bnddy0;}
		if (bnddx1<0) {maxy-=ih*bnddx1;} else {miny-=ih*bnddx1;}
		if (bnddy1<0) {miny+=iw*bnddy1;} else {maxy+=iw*bnddy1;}
		var proj0=bndx*bnddy0-bndy*bnddx0;
		var proj1=bndx*bnddy1-bndy*bnddx1;
		if (maxx<=proj0 || proj0<=minx || maxy<=proj1 || proj1<=miny) {
			return;
		}
		var wasm=this.wasm;
		if (wasm===undefined) {
			wasm=this.wasminit();
		}
		if (!Object.is(imgdata,wasm.imgdata) || iw!==wasm.width || ih!==wasm.height) {
			this.wasmimage(this.img);
		}
		var vidx=poly.vertidx,varr=poly.vertarr;
		if (vidx>wasm.vertmax) {
			wasm.vertmax=vidx;
			this.wasmresize(0);
		}
		var tmpf64=wasm.tmpf64;
		var tmpu32=wasm.tmpu32;
		// transform [0-48]
		tmpf64[0]=matxx;
		tmpf64[1]=matxy;
		tmpf64[2]=matx;
		tmpf64[3]=matyx;
		tmpf64[4]=matyy;
		tmpf64[5]=maty;
		// color [48-52]
		tmpu32[12]=this.rgba32[0];
		// path [52-...]
		tmpu32[13]=vidx;
		var idx=7;
		for (var i=0;i<vidx;i++) {
			var v=varr[i];
			tmpu32[(idx++)<<1]=v.type;
			tmpf64[idx++]=v.x;
			tmpf64[idx++]=v.y;
		}
		wasm.fill();
	};
	Draw.wasmloading=3;
	// console.log("wasm done");
}
DrawWASMSetup();
