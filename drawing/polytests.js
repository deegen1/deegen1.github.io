/*------------------------------------------------------------------------------


polytests.js - v1.03

Copyright 2024 Alec Dee - MIT license - SPDX: MIT
deegen1.github.io - akdee144@gmail.com


--------------------------------------------------------------------------------
Notes


Tests for:
	Area overlap
	Efficient pixel blending algorithms
	Circle approximation accuracy


--------------------------------------------------------------------------------
TODO


*/
/* jshint esversion: 6   */
/* jshint bitwise: false */
/* jshint eqeqeq: true   */
/* jshint curly: true    */


//---------------------------------------------------------------------------------
// Test 1 - Line Overlap Area Calculation


function areaapprox(x0,y0,x1,y1,samples) {
	if (Math.abs(y0-y1)<1e-10) {return 0;}
	var miny=Math.min(y0,y1),maxy=Math.max(y0,y1);
	var x,u;
	var rate=(x1-x0)/(y1-y0);
	var con =x0-y0*rate;
	var prev=null;
	var area=0;
	for (var s=0;s<=samples;s++) {
		u=s/samples;
		if (u>=miny && u<=maxy) {
			x=u*rate+con;
			x=1-Math.min(Math.max(x,0),1);
			if (prev!==null) {area+=prev+x;}
			prev=x;
		}
	}
	area/=2*samples;
	return (y0>y1?area:-area);
}


function areacalc(x0,y0,x1,y1) {
	// Calculate the area to the right of the line.
	// If y0<y1, the area is negative.
	if (Math.abs(y0-y1)<1e-10) {return 0;}
	var tmp;
	var difx=x1-x0;
	var dify=y1-y0;
	var dxy=difx/dify;
	var dyx=Math.abs(difx)>1e-10?dify/difx:0;
	var x0y=y0-x0*dyx;
	var x1y=x0y+dyx;
	var y0x=x0-y0*dxy;
	var y1x=y0x+dxy;
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
	return tmp;
}


function areatest() {
	// See if the area approximation matches the exact calculation.
	var samples=1<<16;
	var errlim=2/samples;
	var tests=10000;
	var maxdif=0;
	for (var test=0;test<tests;test++) {
		var x0=Math.random()*10-5;
		var y0=Math.random()*10-5;
		var x1=Math.random()*10-5;
		var y1=Math.random()*10-5;
		if (test&256) {x1=x0;}
		if (test&512) {y1=y0;}
		var areaa=areaapprox(x0,y0,x1,y1,samples);
		var areac=areacalc(x0,y0,x1,y1);
		var dif=Math.abs(areaa-areac);
		if (maxdif<dif || !(dif===dif)) {maxdif=dif;}
	}
	console.log("max dif: "+maxdif);
	console.log("exp dif: "+errlim);
}


//---------------------------------------------------------------------------------
// Test 2 - Fast Pixel Blending


function blendtest() {
	// expects alpha in [0,256], NOT [0,256).
	var samples=10000000*2;
	var arr0=new Uint32Array(samples);
	var i;
	for (i=0;i<samples;i+=2) {
		arr0[i+0]=(Math.random()*0x100000000)>>>0;
		arr0[i+1]=Math.floor(Math.random()*256.99);
	}
	var arr=new Uint32Array(samples);
	var arr8=new Uint8Array(arr.buffer);
	var src=(Math.random()*0x100000000)>>>0;
	var src3=(src>>>24)&0xff;
	var src2=(src>>>16)&0xff;
	var src1=(src>>> 8)&0xff;
	var src0=(src>>> 0)&0xff;
	var dst,a;
	var lh,hh,lh2,hh2;
	var hash,time,pos,hash0=null;
	// ----------------------------------------
	arr.set(arr0);hash=1;
	var base=performance.now();
	for (i=0;i<samples;i+=2) {
		hash=arr[i+1];
		hash=Math.imul(hash,0x1645a3d3)^arr[i];
	}
	base=performance.now()-base;
	console.log("baseline:",base,hash);
	console.log("Algorithm, Time, Accurate");
	// ----------------------------------------
	arr.set(arr0);hash=1;pos=0;time=performance.now();
	for (i=0;i<samples;i+=2) {
		a=arr[i+1];
		arr8[pos]=(arr8[pos]*a+src0*(256-a))>>>8;pos++;
		arr8[pos]=(arr8[pos]*a+src1*(256-a))>>>8;pos++;
		arr8[pos]=(arr8[pos]*a+src2*(256-a))>>>8;pos++;
		arr8[pos]=(arr8[pos]*a+src3*(256-a))>>>8;pos+=5;
		hash=Math.imul(hash,0x1645a3d3)^arr[i];
	}
	hash0=hash;
	time=performance.now()-time-base;
	console.log("Naive RGB #1",time,hash===hash0);
	// ----------------------------------------
	arr.set(arr0);hash=1;pos=0;time=performance.now();
	for (i=0;i<samples;i+=2) {
		a=arr[i+1];
		arr8[pos]=(((arr8[pos]-src0)*a)>>8)+src0;pos++;
		arr8[pos]=(((arr8[pos]-src1)*a)>>8)+src1;pos++;
		arr8[pos]=(((arr8[pos]-src2)*a)>>8)+src2;pos++;
		arr8[pos]=(((arr8[pos]-src3)*a)>>8)+src3;pos+=5;
		hash=Math.imul(hash,0x1645a3d3)^arr[i];
	}
	time=performance.now()-time-base;
	console.log("Naive RGB #2",time,hash===hash0);
	// ----------------------------------------
	arr.set(arr0);hash=1;pos=0;time=performance.now();
	lh=src&0x00ff00ff;
	hh=(src>>>8)&0x00ff00ff;
	for (i=0;i<samples;i+=2) {
		a=arr[i+1];
		dst=arr[i];
		arr[i]=((((dst&0x00ff00ff)*a+lh*(256-a))>>>8)&0x00ff00ff)+
		       ((((dst>>>8)&0x00ff00ff)*a+hh*(256-a))&0xff00ff00);
		hash=Math.imul(hash,0x1645a3d3)^arr[i];
	}
	time=performance.now()-time-base;
	console.log("32-bit #1",time,hash===hash0);
	// ----------------------------------------
	arr.set(arr0);hash=1;pos=0;time=performance.now();
	lh=src&0x00ff00ff;
	lh2=lh<<8;
	hh=(src>>>8)&0x00ff00ff;
	hh2=hh<<8;
	for (i=0;i<samples;i+=2) {
		a=arr[i+1];
		dst=arr[i];
		arr[i]=(((((dst&0x00ff00ff)-lh)*a+lh2)>>>8)&0x00ff00ff)+
		       (((((dst>>>8)&0x00ff00ff)-hh)*a+hh2)&0xff00ff00);
		hash=Math.imul(hash,0x1645a3d3)^arr[i];
	}
	time=performance.now()-time-base;
	console.log("32-bit #2",time,hash===hash0);
	// ----------------------------------------
	arr.set(arr0);hash=1;pos=0;time=performance.now();
	lh=src&0x00ff00ff;
	hh=src&0xff00ff00;
	var d256=1.0/256.0;
	for (i=0;i<samples;i+=2) {
		a=arr[i+1]*d256;
		dst=arr[i];
		arr[i]=((((dst&0x00ff00ff)-lh)*a+lh)&0x00ff00ff)+
		       ((((dst&0xff00ff00)-hh)*a+hh)&0xff00ff00);
		hash=Math.imul(hash,0x1645a3d3)^arr[i];
	}
	time=performance.now()-time-base;
	console.log("32-bit #3",time,hash===hash0);
	// ----------------------------------------
	arr.set(arr0);hash=1;pos=0;time=performance.now();
	lh=src&0x00ff00ff;
	hh=(src&0xff00ff00)>>>0;
	for (i=0;i<samples;i+=2) {
		a=arr[i+1];
		dst=arr[i];
		arr[i]=(((Math.imul((dst&0x00ff00ff)-lh,a)>>>8)+lh)&0x00ff00ff)+
		       ((Math.imul(((dst&0xff00ff00)-hh)>>>8,a)+hh)&0xff00ff00);
		hash=Math.imul(hash,0x1645a3d3)^arr[i];
	}
	time=performance.now()-time-base;
	console.log("imul #1",time,hash===hash0);
	// ----------------------------------------
	arr.set(arr0);hash=1;pos=0;time=performance.now();
	lh=(src&0x00ff00ff)>>>0;
	hh=(src&0xff00ff00)>>>0;
	hh2=hh>>>8;
	for (i=0;i<samples;i+=2) {
		a=arr[i+1];
		dst=arr[i];
		arr[i]=(((Math.imul((dst&0x00ff00ff)-lh,a)>>>8)+lh)&0x00ff00ff)+
		       ((Math.imul(((dst&0xff00ff00)>>>8)-hh2,a)+hh)&0xff00ff00);
		hash=Math.imul(hash,0x1645a3d3)^arr[i];
	}
	time=performance.now()-time-base;
	console.log("imul #2",time,hash===hash0);
}


//---------------------------------------------------------------------------------
// Test 3 - Bezier parameterization


function bezier0(points,u) {
	var v=1-u;
	var cpx=v*v*v*points[0]+3*v*v*u*points[2]+3*v*u*u*points[4]+u*u*u*points[6];
	var cpy=v*v*v*points[1]+3*v*v*u*points[3]+3*v*u*u*points[5]+u*u*u*points[7];
	return [cpx,cpy];
}


function bezier1(points,u1) {
	var p0x=points[0],p0y=points[1];
	var p1x=points[2],p1y=points[3];
	var p2x=points[4],p2y=points[5];
	var p3x=points[6],p3y=points[7];
	/*p3x=p3x+3*(p1x-p2x)-p0x;
	p3y=p3y+3*(p1y-p2y)-p0y;
	p2x=3*(p2x-2*p1x+p0x);
	p2y=3*(p2y-2*p1y+p0y);
	p1x=3*(p1x-p0x);
	p1y=3*(p1y-p0y);
	var cpx=p0x+u1*(p1x+u1*(p2x+u1*p3x));
	var cpy=p0y+u1*(p1y+u1*(p2y+u1*p3y));*/
	p3x=p3x-p0x+3*(p1x-p2x);
	p3y=p3y-p0y+3*(p1y-p2y);
	p2x=3*(p2x+p0x-2*p1x);
	p2y=3*(p2y+p0y-2*p1y);
	p1x=3*(p1x-p0x);
	p1y=3*(p1y-p0y);
	var cpx=p0x+u1*(p1x+u1*(p2x+u1*p3x));
	var cpy=p0y+u1*(p1y+u1*(p2y+u1*p3y));
	return [cpx,cpy];
}


function beziertest() {
	var tests=10000;
	var points=new Float64Array(8);
	var maxerr=0.0;
	for (var test=0;test<tests;test++) {
		for (var i=0;i<8;i++) {
			points[i]=Math.random()*10-5;
		}
		var u=Math.random()*10-5;
		var [x0,y0]=bezier0(points,u);
		var [x1,y1]=bezier1(points,u);
		x1-=x0;
		y1-=y0;
		var err=x1*x1+y1*y1;
		if (maxerr<err || !(err===err)) {
			maxerr=err;
		}
	}
	console.log("bezier err: "+maxerr);
}


//---------------------------------------------------------------------------------
// Test 3 - Linear Ellipse Approximation


function circumtest() {
	var xrad=3000,yrad=3001;
	var segs=10000;
	var distarr=new Float64Array(segs);
	var arc=2*Math.PI/segs;
	for (var s=0;s<segs;s++) {
		var a=s*arc;
		var b=a+arc;
		var xdif=(Math.cos(a)-Math.cos(b))*xrad;
		var ydif=(Math.sin(a)-Math.sin(b))*yrad;
		distarr[s]=Math.sqrt(xdif*xdif+ydif*ydif);
	}
	var sumlen=segs;
	while (sumlen>1) {
		for (var i=0,j=0;i<sumlen;i+=2,j++) {
			distarr[j]=distarr[i]+(i+1<sumlen?distarr[i+1]:0);
		}
		sumlen=j;
	}
	console.log(distarr[0],Math.sqrt(xrad*xrad+yrad*yrad)*Math.sqrt(2)*Math.PI);
	var xtmp=xrad+1e-20;// Math.abs(xrad*scalex*viewmul)+1e-10;
	var ytmp=yrad+1e-20;// Math.abs(yrad*scaley*viewmul)+1e-10;
	var d=xtmp+ytmp,h=(xtmp-ytmp)/d;h*=h;
	var mul=Math.PI/256;
	var circ=(d*(256+h*(64+h*(4+h)))*mul);
	console.log(circ);
}


function ellipseaccurate(imgdata,imgwidth,imgheight,x,y,xrad,yrad) {
	//
	//  x^2      y^2
	// ------ + ------ = 1
	// xrad^2   yrad^2
	//
	var xrad2=xrad*xrad,yrad2=yrad*yrad,xyrad2=xrad2*yrad2;
	var imgpos=0;
	for (var iy=0;iy<imgheight;iy++) {
		for (var ix=0;ix<imgwidth;ix++) {
			var cx=x-ix;
			var cy=y-iy;
			// If the closest point in the unit square is outside the ellipse, we know the
			// area=0.
			var dx=(Math.min(Math.max(cx,0),1)-cx)*yrad;
			var dy=(Math.min(Math.max(cy,0),1)-cy)*xrad;
			if (dx*dx+dy*dy>=xyrad2) {
				imgdata[imgpos++]=0;
				continue;
			}
			// If the farthest point is in the ellipse, area=1.
			dx=((cx>0.5?0:1)-cx)*yrad;
			dy=((cy>0.5?0:1)-cy)*xrad;
			if (dx*dx+dy*dy<=xyrad2) {
				imgdata[imgpos++]=1;
				continue;
			}
			// The unit square is straddling the edge.
			// The piecewise integral is a pain, so estimate it.
			var area=0;
			var samples=1<<16;
			var norm=1/(2*samples);
			var pdif=-1;
			for (var s=0;s<=samples;s++) {
				var lx=s/samples-cx;
				if (lx>-xrad && lx<xrad) {
					var ly=Math.sqrt(1-lx*lx/xrad2)*yrad;
					var y0=Math.min(Math.max(cy-ly,0),1);
					var y1=Math.min(Math.max(cy+ly,0),1);
					y1-=y0;
					if (pdif>-1) {area+=(pdif+y1)*norm;}
					pdif=y1;
				}
			}
			area=Math.min(Math.max(area,0),1);
			imgdata[imgpos++]=area;
		}
	}
}


function ellipselinear(imgdata,imgwidth,imgheight,cx,cy,xrad,yrad,segs) {
	// fillpoly() modified to write the area to an array.
	imgdata.fill(0.0);
	var lr=[];
	var minx=imgwidth,maxx=0,miny=imgheight,maxy=0,ycnt=0;
	var x0,y0,x1,y1;
	var l,i,j,tmp;
	for (i=0;i<segs;i++) {
		// Get the line points and transform() them.
		// If we mirror the image, we need to flip the line direction.
		var a=(i/segs)*6.283185307;
		var b=(((i+1)%segs)/segs)*6.283185307;
		x0=Math.cos(a)*xrad+cx;
		y0=Math.sin(a)*yrad+cy;
		x1=Math.cos(b)*xrad+cx;
		y1=Math.sin(b)*yrad+cy;
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
				// Clamp the line segment to the unit square.
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
			if (area>1e-5) {
				tmp=Math.min(Math.max(area,0),1);
				while (pixcol<pixstop) {
					imgdata[pixcol++]=tmp;
				}
			}

		}
		pixrow+=imgwidth;
		y++;
	}
}


function circumcalc(xrad,yrad) {
	var d=xrad+yrad,h=(xrad-yrad)/d;
	h*=h;
	var circ=d*(256+h*(64+h*(4+h)))*(Math.PI/256);
	return circ;
}


function ellipsegenerate0() {
	// Generate data.
	var imgwidth=1000;
	var imgheight=1000;
	var pixels=imgwidth*imgheight;
	var distacc=new Float64Array(pixels);
	var distlin=new Float64Array(pixels);
	var cx=Math.floor(imgwidth/2);
	var cy=Math.floor(imgheight/2);
	var radlimit=Math.floor(Math.min(imgwidth/2,imgheight/2)-2);
	var radbits=Math.log(radlimit)/Math.log(2);
	var tests=2000;
	var errlim=0.25;
	var data="";
	for (var test=0;test<tests;test++) {
		var cxrad,cyrad;
		if (test&1) {cxrad=Math.pow(2,Math.random()*radbits);}
		else        {cxrad=Math.random()*radlimit;}
		if (test&2) {cyrad=Math.pow(2,Math.random()*radbits);}
		else        {cyrad=Math.random()*radlimit;}
		ellipseaccurate(distacc,imgwidth,imgheight,cx,cy,cxrad,cyrad);
		var segs=4;
		var firstseg=Infinity;
		// Due to lines aligning with pixels, the maximum error can rise even though the
		// number of segments is going up. Verify the next 8 higher segment counts are
		// below the error limit to avoid false positives.
		while (segs<1000 && segs<firstseg+9) {
			ellipselinear(distlin,imgwidth,imgheight,cx,cy,cxrad,cyrad,segs);
			var maxdif=0.0;
			for (var i=0;i<pixels;i++) {
				var a=distacc[i],b=distlin[i];
				var dif=Math.abs(a-b);
				if (maxdif<dif) {
					maxdif=dif;
					if (maxdif>=errlim) {break;}
				}
			}
			if (maxdif>=errlim) {
				firstseg=Infinity;
			} else if (firstseg>segs) {
				firstseg=segs;
			}
			segs+=1;
		}
		segs=firstseg;
		var out="["+cxrad.toFixed(6)+","+cyrad.toFixed(6)+","+segs+"],";
		data+=out+"<br>";
		console.log(test+" -- "+out);
	}
	document.write("<p>var ellipsedata=[<br>"+data+"];</p>");
	/*var canvas=document.getElementById("polydemo3");
	var imgwidth=500;
	var imgheight=500;
	canvas.width=imgwidth;
	canvas.height=imgheight;
	var pixels=imgwidth*imgheight;
	var distacc=new Float64Array(pixels);
	var distlin=new Float64Array(pixels);
	var cx=Math.floor(imgwidth/2);
	var cy=Math.floor(imgheight/2);
	var cxrad=100;
	var cyrad=100;
	ellipseaccurate(distacc,imgwidth,imgheight,cx,cy,cxrad,cyrad);
	ellipselinear(distlin,imgwidth,imgheight,cx,cy,cxrad,cyrad,11);
	var ctx=canvas.getContext("2d");
	var backbuf=ctx.createImageData(canvas.width,canvas.height);
	var data8=backbuf.data,pix=0;
	for (var i=0;i<pixels;i++) {
		var area=Math.abs(distacc[i]-distlin[i]);
		area=Math.min(Math.max(Math.floor(area*256),0),255);
		data8[pix++]=area;
		data8[pix++]=area;
		data8[pix++]=area;
		data8[pix++]=255;
	}
	ctx.putImageData(backbuf,0,0);*/
}


function ellipsegraph0() {
	var canvas=document.createElement("canvas");
	document.body.appendChild(canvas);
	var imgwidth=2048;
	var imgheight=2048;
	var imgscale=imgwidth/1000;
	canvas.width=imgwidth;
	canvas.height=imgheight;
	canvas.style.position="absolute";
	canvas.style.left="0px";
	canvas.style.top="0px";
	canvas.style.zIndex=99;
	var ctx=canvas.getContext("2d");
	ctx.font=Math.floor(32*imgscale)+"px consolas";
	ctx.textBaseline="middle";
	ctx.textAlign="center";
	ctx.fillStyle="rgba(0,0,0,255)";
	ctx.fillRect(0,0,imgwidth,imgheight);
	var circles=3;
	var rad=imgwidth/12;
	for (var i=0;i<circles;i++) {
		var cx=imgwidth*((i+1)/(circles+1));
		var cy=rad*2.0;
		ctx.fillStyle="rgba(255,255,255,255)";
		ctx.beginPath();
		ctx.arc(cx,cy,rad,0,2*Math.PI);
		ctx.fill();
		var segs=[4,12,36][i];
		var txt=""+segs;
		ctx.fillText(txt,cx,(cy-rad)/1.5);
		ctx.fillStyle="rgba(0,0,255,255)";
		ctx.beginPath();
		for (var s=0;s<segs;s++) {
			var ang=Math.PI*2*s/segs;
			ctx.lineTo(Math.cos(ang)*rad+cx,Math.sin(ang)*rad+cy);
		}
		ctx.closePath();
		ctx.fill();
	}
	var rect={x:imgwidth/14,y:rad*4,w:imgwidth*12/14,h:rad*5};
	ctx.strokeStyle="rgba(255,255,255,255)";
	ctx.lineWidth=2*imgscale;
	ctx.beginPath();
	ctx.moveTo(rect.x,rect.y);
	ctx.lineTo(rect.x,rect.y+rect.h);
	ctx.lineTo(rect.x+rect.w,rect.y+rect.h);
	ctx.stroke();
	var data=ellipsedata;
	var datalen=data.length;
	ctx.fillStyle="rgba(255,0,0,255)";
	var minx=0,maxx=0,miny=0,maxy=0;
	for (var d=0;d<datalen;d++) {
		var xr=data[d][0],yr=data[d][1],y=data[d][2];
		// var h=(xr-yr)/(xr+yr);h*=h;
		// var x=(xr+yr)*(1+h/4+h*h/64+h*h*h/256+h*h*h*h*25/16384);
		// var x;
		// if (xr*3<yr || yr*3<xr) {x=Math.max(xr,yr);}
		// else {x=Math.sqrt(xr*xr+yr*yr);}
		var x=Math.sqrt(xr*xr+yr*yr);
		// var x=Math.sqrt(xr*yr);
		// var x=Math.max(xr,yr);
		// var x=xr+yr;
		// var x=Math.min(xr,yr);
		data[d][0]=x;
		minx=Math.min(minx,x);
		maxx=Math.max(maxx,x);
		miny=Math.min(miny,y);
		maxy=Math.max(maxy,y);
	}
	var mulx=rect.w/(maxx-minx),muly=rect.h/(maxy-miny);
	for (var d=0;d<datalen;d++) {
		var x=data[d][0],y=data[d][2];
		x=(x-minx)*mulx+rect.x;
		y=(rect.h-(y-miny)*muly)+rect.y;
		ctx.beginPath();
		ctx.arc(x,y,2*imgscale,0,Math.PI*2);
		ctx.fill();
	}
	var amul=0,acon=0.0,aarea=Infinity;
	for (var testmul=0.1;testmul<20;testmul+=0.01) {
		var testcon=0;
		for (var d=0;d<datalen;d++) {
			var x=data[d][0],y=data[d][2];
			var y0=Math.sqrt(x)*testmul;
			if (testcon+y0<y) {
				testcon=y-y0;
			}
		}
		var testarea=(testcon+testmul*Math.sqrt(maxx)*2/3)*maxx-(testcon+testmul*Math.sqrt(minx)*2/3)*minx;
		if (aarea>testarea) {
			aarea=testarea;
			amul=testmul;
			acon=testcon;
			console.log(amul,acon,aarea);
		}
	}
	ctx.fillStyle="rgba(0,0,255,255)";
	ctx.strokeStyle="rgba(0,0,255,255)";
	ctx.beginPath();
	for (var i=0;i<=rect.w;i++) {
		var x=(maxx-minx)*i/rect.w+minx;
		var y=Math.sqrt(x)*amul+acon;
		x=(x-minx)*mulx+rect.x;
		y=(rect.h-(y-miny)*muly)+rect.y;
		ctx.lineTo(x,y);
	}
	ctx.stroke();
}


function ellipsegenerate() {
	// Generate data.
	var imgwidth=1000;
	var imgheight=1000;
	var pixels=imgwidth*imgheight;
	var distacc=new Float64Array(pixels);
	var distlin=new Float64Array(pixels);
	var cx=Math.floor(imgwidth/2);
	var cy=Math.floor(imgheight/2);
	var radlimit=Math.floor(Math.min(imgwidth/2,imgheight/2)-2);
	var radbits=Math.log(radlimit)/Math.log(2);
	var tests=1000;
	var maxmul=201,mulden=100;
	var errarr=new Array(maxmul);
	for (var i=0;i<maxmul;i++) {
		errarr[i]=[Infinity,-Infinity];
	}
	for (var test=0;test<tests;test++) {
		var cxrad,cyrad;
		if (test&1) {cxrad=Math.pow(2,Math.random()*radbits);}
		else        {cxrad=Math.random()*radlimit;}
		if (test&2) {cyrad=Math.pow(2,Math.random()*radbits);}
		else        {cyrad=Math.random()*radlimit;}
		var circ=circumcalc(cxrad,cyrad);
		ellipseaccurate(distacc,imgwidth,imgheight,cx,cy,cxrad,cyrad);
		for (var m=0;m<maxmul;m++) {
			var segs=Math.floor(circ*(m/mulden));
			if (segs<3) {segs=3;}
			ellipselinear(distlin,imgwidth,imgheight,cx,cy,cxrad,cyrad,segs);
			var [minerr,maxerr]=errarr[m];
			for (var i=0;i<pixels;i++) {
				var err=distlin[i]-distacc[i];
				if (maxerr<err) {maxerr=err;}
				if (minerr>err) {minerr=err;}
			}
			errarr[m]=[minerr,maxerr];
		}
		console.log(test,errarr[100][0],errarr[100][1]);
	}
	var data="";
	for (var i=0;i<maxmul;i++) {
		data+="["+(i/mulden).toFixed(6)+","+(errarr[i][1]-errarr[i][0]).toFixed(6)+"],<br>";
	}
	document.write("<p>var ellipsedata=[<br>"+data+"];</p>");
}


function ellipsegraph() {
	var canvas=document.createElement("canvas");
	document.body.appendChild(canvas);
	var imgwidth=2048;
	var imgheight=2048;
	var imgscale=imgwidth/1000;
	canvas.width=imgwidth;
	canvas.height=imgheight;
	canvas.style.position="absolute";
	canvas.style.left="0px";
	canvas.style.top="0px";
	canvas.style.zIndex=99;
	var ctx=canvas.getContext("2d");
	ctx.font=Math.floor(32*imgscale)+"px consolas";
	ctx.textBaseline="middle";
	ctx.textAlign="center";
	ctx.fillStyle="rgba(0,0,0,255)";
	ctx.fillRect(0,0,imgwidth,imgheight);
	var rect={x:imgwidth/14,y:imgwidth/14,w:imgwidth*12/14,h:imgwidth*6/14};
	ctx.strokeStyle="rgba(255,255,255,255)";
	ctx.lineWidth=2*imgscale;
	ctx.beginPath();
	ctx.moveTo(rect.x,rect.y);
	ctx.lineTo(rect.x,rect.y+rect.h);
	ctx.lineTo(rect.x+rect.w,rect.y+rect.h);
	ctx.stroke();
	var data=ellipsedata;
	var datalen=data.length;
	ctx.fillStyle="rgba(255,0,0,255)";
	var minx=0,maxx=0,miny=0,maxy=0;
	for (var d=0;d<datalen;d++) {
		var x=data[d][0],y=data[d][1];
		y=(1-y)/(x+1e-20);
		minx=Math.min(minx,x);
		maxx=Math.max(maxx,x);
		miny=Math.min(miny,y);
		maxy=Math.max(maxy,y);
	}
	if (miny<0) {miny=0;}
	var mulx=rect.w/(maxx-minx),muly=rect.h/(maxy-miny);
	ctx.fillStyle="rgba(255,0,0,255)";
	ctx.strokeStyle="rgba(255,0,0,255)";
	ctx.beginPath();
	var maxmul=0,maxrate=0;
	for (var d=0;d<datalen;d++) {
		var x=data[d][0],y=data[d][1];
		y=(1-y)/(x+1e-20);
		if (y<0) {y=0;}
		if (maxrate<y) {
			maxrate=y;
			maxmul=x;
		}
		x=(x-minx)*mulx+rect.x;
		y=(rect.h-(y-miny)*muly)+rect.y;
		console.log(x,y);
		ctx.lineTo(x,y);
		// ctx.beginPath();
		// ctx.arc(x,y,2*imgscale,0,Math.PI*2);
		// ctx.fill();
	}
	ctx.stroke();
	console.log("best: "+maxmul+", "+maxrate);
	/*var amul=0,acon=0.0,aarea=Infinity;
	for (var testmul=0.1;testmul<20;testmul+=0.01) {
		var testcon=0;
		for (var d=0;d<datalen;d++) {
			var x=data[d][0],y=data[d][2];
			var y0=Math.sqrt(x)*testmul;
			if (testcon+y0<y) {
				testcon=y-y0;
			}
		}
		var testarea=(testcon+testmul*Math.sqrt(maxx)*2/3)*maxx-
		             (testcon+testmul*Math.sqrt(minx)*2/3)*minx;
		if (aarea>testarea) {
			aarea=testarea;
			amul=testmul;
			acon=testcon;
			console.log(amul,acon,aarea);
		}
	}
	ctx.fillStyle="rgba(0,0,255,255)";
	ctx.strokeStyle="rgba(0,0,255,255)";
	ctx.beginPath();
	for (var i=0;i<=rect.w;i++) {
		var x=(maxx-minx)*i/rect.w+minx;
		var y=Math.sqrt(x)*amul+acon;
		x=(x-minx)*mulx+rect.x;
		y=(rect.h-(y-miny)*muly)+rect.y;
		ctx.lineTo(x,y);
	}
	ctx.stroke();*/
}


//---------------------------------------------------------------------------------
// Main


function testmain() {
	console.log("starting polygon tests");
	// areatest();
	// blendtest();
	// beziertest();
	// circumtest();
	// ellipsegenerate();
	// ellipsegraph();
}


window.addEventListener("load",testmain);
