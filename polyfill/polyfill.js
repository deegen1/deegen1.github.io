/*------------------------------------------------------------------------------


polyfill.js - v1.00

Copyright 2024 Alec Dee - MIT license - SPDX: MIT
deegen1.github.io - akdee144@gmail.com


--------------------------------------------------------------------------------
TODO


Fill from the left

larea
lmul
lidx

might be gaps between y and next miny
might be gaps between x and next minx
	if alpha<=0, skip
	if alpha>=1, fill
	else, blend
	larea+=lmul*skip

Speed test alternate version with no sorting for maxy,maxr


*/
/* jshint esversion: 6   */
/* jshint bitwise: false */
/* jshint eqeqeq: true   */
/* jshint curly: true    */

/*
function polyfill0(imgdata,imgwidth,imgheight,lines) {
	if (samples===undefined) {
		samples=16;
	}
	var samplepoints=new Float64Array(samples*samples*2);
	for (var y=0;y<samples;y++) {
		for (var x=0;x<samples;x++) {
			var i=(y*samples+x)*2;
			samplepoints[i+0]=(x+1.0)/(samples+1);
			samplepoints[i+1]=(y+1.0)/(samples+1);
		}
	}
}


function polyfill1(imgdata,imgwidth,imgheight,lines) {
	// Preprocess the lines. Reject anything with a NaN, too narrow (y1-y0), or
	// above or below the image.
	var linearr=polyfill.linearr;
	if (linearr===undefined) {polyfill.linearr=linearr=[];}
	var minx=imgwidth,maxx=0,miny=imgheight,maxy=0,ycnt=0;
	for (var i=0;i<lines.length;i++) {
		var line=linearr[ycnt];
		if (line===undefined) {linearr[ycnt]=line={};}
		var [x0,y0,x1,y1]=lines[i];
		var dx=x1-x0;
		var dy=y1-y0;
		line.miny=Math.max(Math.floor(Math.min(y0,y1)),0);
		line.maxy=Math.min(Math.ceil(Math.max(y0,y1)),imgheight);
		if (Math.abs(dy)>1e-10 && line.miny<line.maxy && !Math.isNaN(dx)) {
			line.x0=x0;
			line.y0=y0;
			line.x1=x1;
			line.y1=y1;
			line.minr=0;
			line.maxr=0;
			line.minx=Math.max(Math.floor(Math.min(x0,x1)),0);
			line.maxx=Math.min(Math.ceil(Math.max(x0,x1)),imgwidth);
			minx=Math.min(minx,line.minx);
			maxx=Math.max(maxx,line.maxx);
			miny=Math.min(miny,line.miny);
			maxy=Math.max(maxy,line.maxy);
			ycnt++;
		}
	}
	// If all lines are outside the image, abort.
	if (minx>=maxx || miny>=maxy) {
		return;
	}
	// Sort by min y.
	var lr=linearr,l,i,j,tmp;
	for (i=1;i<ycnt;i++) {
		j=i;l=lr[i];tmp=l.miny;
		while (j>0 && tmp<lr[j-1].miny) {lr[j]=lr[j-1];j--;}
		lr[j]=l;
	}
	// Process the lines row by row.
	var ylo=0,yhi=0,y=lr[0].miny;
	while (true) {
		while (ylo<yhi && lr[ylo].maxy<=y) {ylo++;}
		if (ylo>=ycnt) {break;}
		// Skip any gaps of empty rows.
		if (ylo===yhi) {y=lr[yhi].miny;}
		// Add any new lines on this row and sort by max y.
		while (yhi<ycnt && (l=lr[yhi]).miny<=y) {
			l.maxr=y*l.slope+l.con;
			j=yhi++;tmp=l.maxy;
			while (j>ylo && tmp<lr[j-1].maxy) {lr[j]=lr[j-1];j--;}
			lr[j]=l;
		}
		// Sort by min row.
		var xcnt=0;
		for (i=ylo;i<yhi;i++) {
			l=lr[i];
			l.minr=Math.max(l.maxr,l.minx);
			l.maxr=Math.min(l.maxr+l.slope,l.maxx);
			j=xcnt++;tmp=l.minr;
			while (j>0 && tmp<ca[j-1].minr) {ca[j]=ca[j-1];j--;}
			ca[j]=l;
		}
		var xlo=0,xhi=0,x=ca[0].minr;
		var larea=0.0;
		// Process the lines on this row, column by column.
		y++;
	}
}
*/

function polyfill(imgdata,imgwidth,imgheight,lines) {
	// Preprocess the lines. Reject anything with a NaN, too narrow (y1-y0), or
	// above or below the image.
	var lr=polyfill.linearr;
	if (lr===undefined) {polyfill.linearr=lr=[];}
	var minx=imgwidth,maxx=0,miny=imgheight,maxy=0,ycnt=0;
	var l,i,j,tmp;
	for (i=0;i<lines.length;i++) {
		l=lr[ycnt];
		if (l===undefined) {lr[ycnt]=l={};}
		var [x0,y0,x1,y1]=lines[i];
		var dx=x1-x0;
		var dy=y1-y0;
		l.miny=Math.max(Math.floor(Math.min(y0,y1)),0);
		l.maxy=Math.min(Math.ceil(Math.max(y0,y1)),imgheight);
		if (Math.abs(dy)>1e-10 && l.miny<l.maxy && !isNaN(dx)) {
			l.x0=x0;
			l.y0=y0;
			l.x1=x1;
			l.y1=y1;
			l.slope=dx/dy;
			l.con=x0-y0*l.slope;
			l.sign=(dx>0.0)^(dx>=0.0);
			l.minr=0;
			l.maxr=0;
			l.minx=Math.max(Math.floor(Math.min(x0,x1)),0);
			l.maxx=Math.min(Math.ceil(Math.max(x0,x1)),imgwidth);
			minx=Math.min(minx,l.minx);
			maxx=Math.max(maxx,l.maxx);
			miny=Math.min(miny,l.miny);
			maxy=Math.max(maxy,l.maxy);
			ycnt++;
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
	// Process the lines row by row.
	var ylo=0,yhi=0,y=lr[0].miny,ynext=y;
	var pixrow=y*imgwidth;
	while (true) {
		// Add any new lines on this row.
		while (ynext<=y) {
			l=lr[yhi++];
			l.minr=(y+    l.sign)*l.slope+l.con;
			l.maxr=(y+1.0-l.sign)*l.slope+l.con;
			ynext=yhi<ycnt?lr[yhi].miny:Infinity;
		}
		// Sort by min row and remove rows we've passed.
		for (i=ylo;i<yhi;i++) {
			l=lr[i];j=i;
			if (l.maxy<=y) {
				while (j>ylo) {lr[j]=lr[j-1];j--;}
				ylo++;
			} else {
				l.minr=Math.floor((y+    l.sign)*l.slope+l.con);
				l.maxr=Math.ceil( (y+1.0-l.sign)*l.slope+l.con);
				l.minr=Math.max(l.minr,l.minx);
				l.maxr=Math.min(l.maxr,l.maxx);
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
		var larea=0.0;
		var pixcol=pixrow+x;
		// Process the lines on this row, column by column.
		while (true) {
			while (xnext<=x) {
				l=lr[xhi++];
				xnext=xhi<yhi?lr[xhi].minr:Infinity;
			}
			for (i=xlo;i<xhi;i++) {
				l=lr[i];
				if (l.maxr<=x) {
					j=i;
					while (j>xlo) {lr[j]=lr[j-1];j--;}
					lr[j]=l;
					xlo++;
					//larea+=Math.min(Math.max(line.y1,r0),r1)
					//      -Math.min(Math.max(line.y0,r0),r1);
				} else {
				}
			}
			// Skip any gaps of empty colums.
			//if (xlo===xhi) {
				if (xlo>=yhi) {break;}
			//	pixrow+=xnext-x;
			//	x=xnext;
			//	continue;
			//}
			//if (ylo<yhi) {
				imgdata[pixcol]=0xffffffff;
			//}
			x++;
			pixcol++;
		}
		/*
		r0=y;
		r1=y+1.0;
		minr=maxr;
		maxr=(r1-y0)*((x1-x0)/(y1-y0))+x0
		maxr=r1*slope+con
		...
		maxr+=slope
		if (maxr>line.maxx) {maxr=line.maxx;}
		slope=(x1-x0)/(y1-y0)
		con=x0-y0*slope
		*/
		pixrow+=imgwidth;
		y++;
	}
}

//---------------------------------------------------------------------------------
// Demonstration


// Convert an RGBA array to a int regardless of endianness.
var _rgba_arr8=new Uint8ClampedArray([0,1,2,3]);
var _rgba_arr32=new Uint32Array(_rgba_arr8.buffer);
function rgbatoint(r,g,b,a) {
	_rgba_arr8[0]=r;
	_rgba_arr8[1]=g;
	_rgba_arr8[2]=b;
	_rgba_arr8[3]=a;
	return _rgba_arr32[0];
}


function drawfill(scene,r,g,b) {
	// fill() was ~25% slower during testing.
	// imgdata.fill(rgba);
	var rgba=rgbatoint(r,g,b,255);
	var imgdata=scene.backbuf32;
	var i=scene.canvas.width*scene.canvas.height;
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


class PolyDemo1 {

	constructor(divid) {
		// Swap the <div> with <canvas>
		var elem=document.getElementById(divid);
		this.parentelem=elem.parentNode;
		var canvas=document.createElement("canvas");
		elem.replaceWith(canvas);
		// Setup the UI.
		canvas.width=600;
		canvas.height=600;
		this.canvas=canvas;
		this.ctx=this.canvas.getContext("2d");
		this.backbuf=this.ctx.createImageData(canvas.width,canvas.height);
		this.backbuf32=new Uint32Array(this.backbuf.data.buffer);
		this.update();
	}


	update() {
		var ctx=this.ctx;
		drawfill(this,0,0,0);
		var lines=[
			[200,400,300,200],
			[300,200,400,400],
			[400,400,200,400]
		];
		polyfill(this.backbuf32,this.canvas.width,this.canvas.height,lines);
		ctx.putImageData(this.backbuf,0,0);
	}

}

