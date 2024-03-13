/*------------------------------------------------------------------------------


polytests.js - v1.06

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
// Misc


/*
function demoimage() {
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
}
*/


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


function areacalc1(x0,y0,x1,y1) {
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


function areacalc2(x0,y0,x1,y1) {
	// Calculate the area to the right of the line.
	// If y0<y1, the area is negative.
	var tmp;
	var sign=1;
	if (x0>x1) {
		sign=-sign;
		tmp=x0;x0=x1;x1=tmp;
		tmp=y0;y0=y1;y1=tmp;
	}
	if (y0>y1) {
		sign=-sign;
		y0=1-y0;
		y1=1-y1;
	}
	var difx=x1-x0;
	var dify=y1-y0;
	if (dify<1e-10 || y0>=1 || y1<=0) {return 0;}
	var dxy=difx/dify;
	var dyx=difx>1e-10?dify/difx:0;
	var x0y=y0-x0*dyx;
	var x1y=x0y+dyx;
	// var y0x=x0-y0*dxy;
	// var y1x=y0x+dxy;
	tmp=0.0;
	if (y0<0.0) {
		x0-=y0*dxy;
		y0=0.0;
	}
	if (y1>1.0) {
		x1-=y1*dxy-dxy;
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
	return tmp*sign;
}


function areatest1() {
	// See if the area approximation matches the exact calculation.
	var samples=1<<16;
	var errlim=2/samples;
	var tests=10000;
	var maxdif1=0,maxdif2=0;
	var dif,areac;
	for (var test=0;test<tests;test++) {
		var x0=Math.random()*10-5;
		var y0=Math.random()*10-5;
		var x1=Math.random()*10-5;
		var y1=Math.random()*10-5;
		if (test&256) {x1=x0;}
		if (test&512) {y1=y0;}
		var areaa=areaapprox(x0,y0,x1,y1,samples);
		areac=areacalc1(x0,y0,x1,y1);
		dif=Math.abs(areaa-areac);
		if (maxdif1<dif || !(dif===dif)) {maxdif1=dif;}
		areac=areacalc2(x0,y0,x1,y1);
		dif=Math.abs(areaa-areac);
		if (maxdif2<dif || !(dif===dif)) {maxdif2=dif;}
	}
	console.log("max dif 1: "+maxdif1);
	console.log("max dif 2: "+maxdif2);
	console.log("exp dif  : "+errlim);
}


//---------------------------------------------------------------------------------
// Test 2 - Area Segments


function getrowlines(x0,y0,x1,y1,rowlines,idx,amul) {
	//
	//     fx0  fx0+1                          fx1  fx1+1
	//      +-----+-----+-----+-----+-----+-----+-----+
	//      |                              .....----  |
	//      |               .....-----'''''           |
	//      | ....-----'''''                          |
	//      +-----+-----+-----+-----+-----+-----+-----+
	//       first  dyx   dyx   dyx   dyx   dyx  last   tail
	//
	var r,rl=rowlines;
	/*if (x0>x1) {
		var tmp;
		amul=-amul;
		tmp=x0;x0=x1;x1=tmp;
		tmp=y0;y0=y1;y1=tmp;
	}*/
	var difx=x1-x0;
	var dify=y1-y0;
	if (Math.abs(dify)<1e-10 || (y0>=1 && y1>=1) || (y0<=0 && y1<=0)) {return idx;}
	if (Math.abs(difx)<1e-10) {x1=x0;difx=0;}
	var dxy=difx/dify;
	var y0x=x0-y0*dxy;
	var y1x=y0x+dxy;
	if (y0<0) {y0=0;x0=y0x;}
	if (y0>1) {y0=1;x0=y1x;}
	if (y1<0) {y1=0;x1=y0x;}
	if (y1>1) {y1=1;x1=y1x;}
	var fx0=Math.floor(x0);
	var fx1=Math.floor(x1);
	x0-=fx0;
	x1-=fx1;
	if (fx0===fx1) {
		// Vertical line - avoid divisions.
		var dy=(y0-y1)*amul,c=(2-x0-x1)*dy*0.5;
		r=rl[idx++]; r[0]=fx0  ; r[1]=0; r[2]=c;
		r=rl[idx++]; r[0]=fx1+1; r[1]=0; r[2]=dy-c;
	} else {
		var dyx=(dify/difx)*amul;
		var mul=dyx*0.5,n0=x0-1,n1=x1-1;
		r=rl[idx++]; r[0]=fx0  ; r[1]=   0; r[2]=-n0*n0*mul;
		r=rl[idx++]; r[0]=fx0+1; r[1]=-dyx; r[2]= x0*x0*mul;
		r=rl[idx++]; r[0]=fx1  ; r[1]=   0; r[2]= n1*n1*mul;
		r=rl[idx++]; r[0]=fx1+1; r[1]= dyx; r[2]=-x1*x1*mul;
		// if (fx0+1>fx1) {throw "unsorted";}
	}
	return idx;
}


function areatest2() {
	// See if the area approximation matches the exact calculation.
	var rnd=new Random(1);
	var amul=0.7117;
	var tests=100000;
	var maxdif=0;
	var swaps=0;
	for (var test=0;test<tests;test++) {
		var minx=Infinity,maxx=-Infinity;
		var miny=Infinity,maxy=-Infinity;
		var lines=rnd.modu32(5);
		var linearr=[];
		for (var i=0;i<lines;i++) {
			var x0=rnd.getf64()*200-50;
			var y0=rnd.getf64()*200-50;
			var x1=rnd.getf64()*200-50;
			var y1=rnd.getf64()*200-50;
			if (rnd.getf64()<0.25) {x0=Math.floor(x0);}
			if (rnd.getf64()<0.25) {y0=Math.floor(y0);}
			if (rnd.getf64()<0.25) {x1=x0;}
			if (rnd.getf64()<0.25) {y1=y0;}
			minx=Math.floor(Math.min(minx,Math.min(x0,x1)))-2;
			maxx=Math.ceil( Math.max(maxx,Math.max(x0,x1)))+2;
			miny=Math.floor(Math.min(miny,Math.min(y0,y1)))-2;
			maxy=Math.ceil( Math.max(maxy,Math.max(y0,y1)))+2;
			linearr[i]={x0:x0,y0:y0,x1:x1,y1:y1};
		}
		var rowarr=new Array(lines*4);
		for (var i=0;i<rowarr.length;i++) {rowarr[i]=[0,0,0];}
		for (var cy=miny;cy<maxy;cy++) {
			var rowlines=0;
			for (var i=0;i<lines;i++) {
				var l=linearr[i];
				rowlines=getrowlines(l.x0,l.y0-cy,l.x1,l.y1-cy,rowarr,rowlines,amul);
			}
			for (var i=1;i<rowlines;i++) {
				var j=i,r=rowarr[j];
				while (j>0 && r[0]<rowarr[j-1][0]) {
					swaps++;
					rowarr[j]=rowarr[j-1];
					j--;
				}
				rowarr[j]=r;
			}
			var area=0,arearate=0;
			var ridx=0,nextx=ridx<rowlines?rowarr[ridx][0]:Infinity;
			var cx=minx+Math.floor(rnd.getf64()*(maxx-minx));
			for (;cx<maxx;cx++) {
				while (cx>=nextx) {
					var r=rowarr[ridx++];
					area+=r[1]*(cx-nextx)+r[2];
					arearate+=r[1];
					nextx=ridx<rowlines?rowarr[ridx][0]:Infinity;
				}
				area+=arearate;
				var areac=0.0;
				for (var i=0;i<lines;i++) {
					var l=linearr[i];
					areac+=areacalc1(l.x0-cx,l.y0-cy,l.x1-cx,l.y1-cy)*amul;
				}
				var dif=Math.abs(areac-area);
				if (maxdif<dif || !(dif===dif)) {
					// console.log(dif);
					maxdif=dif;
				}
			}
		}
	}
	console.log("max dif: "+maxdif);
	console.log("swap: "+swaps);
}


//---------------------------------------------------------------------------------
// Stride Test
// Calculate how many pixels can be filled with the same color.


function stridecalc1(x,xnext,area,areadx1,areadx2) {
	var base=Math.floor(area*255+0.5);
	base=Math.min(Math.max(base,0),255);
	while (x<xnext) {
		x++;
		area+=areadx1+areadx2;
		areadx2=0;
		var tmp=Math.floor(area*255+0.5);
		tmp=Math.min(Math.max(tmp,0),255);
		if (base!==tmp) {break;}
	}
	return x;
}


function stridecalc2(x,xnext,area,areadx1,areadx2) {
	var xdraw=x+1,tmp;
	if (areadx2===0) {
		tmp=Math.floor(area*255+0.5);
		tmp=Math.min(Math.max(tmp+(areadx1<0?-0.5:0.5),0.5),254.5);
		tmp=(tmp/255-area)/areadx1+x;
		xdraw=(tmp>x && tmp<xnext)?Math.ceil(tmp):xnext;
	}
	return xdraw;
}


function stridetest() {
	console.log("testing stride calculation");
	var rnd=new Random();
	var tests=100000;
	var tmp;
	for (var test=0;test<tests;test++) {
		var x=rnd.modu32(200)+100;
		var xnext=x+rnd.modu32(100);
		var area=rnd.getf64()*4-2;
		tmp=rnd.modu32(31);
		tmp=tmp>16?0:(1/(1<<tmp));
		var areadx1=(rnd.getf64()*4-2)*tmp;
		// tmp=rnd.modu32(31);
		// tmp=tmp>16?0:(1/(1<<tmp));
		// var areadx2=(rnd.getf64()*4-2)*tmp;
		var areadx2=0;
		var stride1=stridecalc1(x,xnext,area,areadx1,areadx2);
		var stride2=stridecalc2(x,xnext,area,areadx1,areadx2);
		if (stride1!==stride2) {
			console.log("bad stride: "+test);
			console.log(stride1+" != "+stride2);
			console.log("x    = "+x);
			console.log("next = "+xnext);
			console.log("area = "+area);
			console.log("dx1  = "+areadx1);
			console.log("dx2  = "+areadx2);
			return;
		}
	}
	console.log("passed");
}


//---------------------------------------------------------------------------------
// Test 2 - Fast Pixel Blending


function blendtest1() {
	// expects alpha in [0,256], NOT [0,256).
	var samples=20000000*2;
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
// Test 3 - Pixel compositing


var blend_rgbashift=[0,0,0,0];
(function (){
	var rgba  =new Uint8ClampedArray([0,1,2,3]);
	var rgba32=new Uint32Array(rgba.buffer);
	var col=rgba32[0];
	for (var i=0;i<32;i+=8) {blend_rgbashift[(col>>>i)&255]=i;}
})();
const [blend_r,blend_g,blend_b,blend_a]=blend_rgbashift;


function blendref(dst,src) {
	// a = sa + da*(1-sa)
	// c = (sc*sa + dc*da*(1-sa)) / a
	var sa=(src>>>blend_a)&255;
	if (sa===0) {return dst;}
	sa/=255.0;
	var a=sa+(((dst>>>blend_a)&255)/255.0)*(1-sa);
	sa/=a;
	var da=1-sa;
	return ((Math.max(Math.min(a*255.001,255),0)<<blend_a)+
		(Math.max(Math.min(((src>>>blend_r)&255)*sa+((dst>>>blend_r)&255)*da,255),0)<<blend_r)+
		(Math.max(Math.min(((src>>>blend_g)&255)*sa+((dst>>>blend_g)&255)*da,255),0)<<blend_g)+
		(Math.max(Math.min(((src>>>blend_b)&255)*sa+((dst>>>blend_b)&255)*da,255),0)<<blend_b))>>>0;
}


function blendfast1(dst,src) {
	// a = sa + da*(1-sa)
	// c = (sc*sa + dc*da*(1-sa)) / a
	var sa=(src>>>blend_a)&255;
	if (sa===0  ) {return dst;}
	if (sa===255) {return src;}
	var da=(dst>>>blend_a)&255;
	if (da===0  ) {return src;}
	if (da===255) {
		sa/=255.0;
		var da=1-sa;
		return ((255<<blend_a)|
			(Math.max(Math.min(((src>>>blend_r)&255)*sa+((dst>>>blend_r)&255)*da,255),0)<<blend_r)|
			(Math.max(Math.min(((src>>>blend_g)&255)*sa+((dst>>>blend_g)&255)*da,255),0)<<blend_g)|
			(Math.max(Math.min(((src>>>blend_b)&255)*sa+((dst>>>blend_b)&255)*da,255),0)<<blend_b))>>>0;
	}
	sa/=255.0;
	var a=sa+(da/255.0)*(1-sa);
	sa/=a;
	var da=1-sa;
	return ((Math.max(Math.min(a*255.001,255),0)<<blend_a)+
		(Math.max(Math.min(((src>>>blend_r)&255)*sa+((dst>>>blend_r)&255)*da,255),0)<<blend_r)+
		(Math.max(Math.min(((src>>>blend_g)&255)*sa+((dst>>>blend_g)&255)*da,255),0)<<blend_g)+
		(Math.max(Math.min(((src>>>blend_b)&255)*sa+((dst>>>blend_b)&255)*da,255),0)<<blend_b))>>>0;
}


function blendfast3(dst,src) {
	// a = sa + da*(1-sa)
	// c = (sc*sa + dc*da*(1-sa)) / a
	var sa=(src>>>blend_a)&255;
	if (sa===0  ) {return dst;}
	if (sa===255) {return src;}
	var da=(dst>>>blend_a)&255;
	if (da===0  ) {return src;}
	// Approximate blending by expanding sa from [0,255] to [0,256].
	if (da===255) {
		sa+=sa>>>7;
		src|=255<<blend_a;
	} else {
		da=(sa+da)*255-sa*da;
		sa=Math.floor((sa*0xff00+(da>>>1))/da);
		da=Math.floor((da*0x00ff+0x7f00)/65025)<<blend_a;
		src=(src&(~(255<<blend_a)))|da;
		dst=(dst&(~(255<<blend_a)))|da;
	}
	var l=dst&0x00ff00ff,h=dst&0xff00ff00;
	return ((((Math.imul((src&0x00ff00ff)-l,sa)>>>8)+l)&0x00ff00ff)+
		  ((Math.imul(((src>>>8)&0x00ff00ff)-(h>>>8),sa)+h)&0xff00ff00))>>>0;
}


const blendfast2=new Function("dst","src",`
	// a = sa + da*(1-sa)
	// c = (sc*sa + dc*da*(1-sa)) / a
	var sa=(src>>>${blend_a})&255;
	if (sa===0  ) {return dst;}
	if (sa===255) {return src;}
	var da=(dst>>>${blend_a})&255;
	if (da===0  ) {return src;}
	if (da===255) {
		//((imul((dst&0x00ff00ff)-coll,d)>>>8)+coll)&0x00ff00ff)+
		//((imul(((dst&0xff00ff00)>>>8)-colh2,d)+colh)&0xff00ff00);
		//return 0;
	}
	sa/=255.0;
	var a=sa+(da/255.0)*(1-sa);
	sa/=a;
	var da=1-sa;
	return ((Math.max(Math.min(a*255.001,255),0)<<${blend_a})+
		(Math.max(Math.min(((src>>>${blend_r})&255)*sa+((dst>>>${blend_r})&255)*da,255),0)<<${blend_r})+
		(Math.max(Math.min(((src>>>${blend_g})&255)*sa+((dst>>>${blend_g})&255)*da,255),0)<<${blend_g})+
		(Math.max(Math.min(((src>>>${blend_b})&255)*sa+((dst>>>${blend_b})&255)*da,255),0)<<${blend_b}))>>> 0;
`.replace(/(>>>)0/g,""));

const blendfast4=new Function("dst","src",`
	// a = sa + da*(1-sa)
	// c = (sc*sa + dc*da*(1-sa)) / a
	var sa=(src>>>${blend_a})&255;
	if (sa===0  ) {return dst;}
	if (sa===255) {return src;}
	var da=(dst>>>${blend_a})&255;
	if (da===0  ) {return src;}
	// Approximate blending by expanding sa from [0,255] to [0,256].
	if (da===255) {
		sa+=sa>>>7;
		src|=${(255<<blend_a)>>>0};
	} else {
		da=(sa+da)*255-sa*da;
		sa=Math.floor((sa*0xff00+(da>>>1))/da);
		da=Math.floor((da*0x00ff+0x7f00)/65025)<<${blend_a};
		src=(src&${(~(255<<blend_a)>>>0)})|da;
		dst=(dst&${(~(255<<blend_a)>>>0)})|da;
	}
	var l=dst&0x00ff00ff,h=dst&0xff00ff00;
	return ((((Math.imul((src&0x00ff00ff)-l,sa)>>>8)+l)&0x00ff00ff)+
		  ((Math.imul(((src>>>8)&0x00ff00ff)-(h>>>8),sa)+h)&0xff00ff00))>>>0;
`);

/* Inline blending

// Setup
var sa,sa0,sa1,sai,da,dst;
var ashift=this.rgbashift[3],amask=(255<<ashift)>>>0,namask=(~amask)>>>0;
var colrgba=this.rgba32[0]|amask,alpha=this.rgba[3]/255.0;
var coll=colrgba&0x00ff00ff,colh=colrgba&0xff00ff00,colh8=colh>>>8;

// Execution
sa0=Math.min(area,1)*alpha;
if (sa0>=0.999) {
	while (pixcol<pixstop) {
		imgdata[pixcol++]=colrgba;
	}
} else if (sa0>=1/256.0) {
	// Inlining blending is twice as fast as a blend() function.
	sai=(1-sa0)/255.0;
	sa1=256-Math.floor(sa0*256);
	while (pixcol<pixstop) {
		// Approximate blending by expanding sa from [0,255] to [0,256].
		dst=imgdata[pixcol];
		da=(dst>>>ashift)&255;
		if (da===0) {
			imgdata[pixcol++]=0xffffffff;
			continue;
		} else if (da===255) {
			sa=sa1;
		} else if (da<255) {
			da=sa0+da*sai;
			sa=256-Math.floor(Math.min(sa0/da,1)*256);
			da=Math.floor(da*255+0.5);
		}
		imgdata[pixcol++]=((
			(((Math.imul((dst&0x00ff00ff)-coll,sa)>>>8)+coll)&0x00ff00ff)+
			((Math.imul(((dst>>>8)&0x00ff00ff)-colh8,sa)+colh)&0xff00ff00)
			)&namask)|(da<<ashift);
	}
}
*/

function blendtest2() {
	// https://en.wikipedia.org/wiki/Alpha_compositing
	// src drawn on dst
	// a = sa + da*(1-sa)
	// c = (sc*sa + dc*da*(1-sa)) / a
	console.log("testing blending 3");
	var am=255<<blend_a,nm=(~am)>>>0;
	var count=0;
	for (var test=0;test<1000000;test++) {
		var src=Math.floor(Math.random()*0x100000000);
		var dst=Math.floor(Math.random()*0x100000000);
		if ((test& 3)===0) {src=(src&nm)>>>0;}
		if ((test& 3)===1) {src=(src|am)>>>0;}
		if ((test&12)===0) {dst=(dst&nm)>>>0;}
		if ((test&12)===8) {dst=(dst|am)>>>0;}
		dst>>>=0;
		src>>>=0;
		var ref=blendref(dst,src);
		var calc=blendfast4(dst,src);
		var err=0;
		var dif0=Math.abs(((ref>>>0)&255)-((calc>>>0)&255));
		var dif1=Math.abs(((ref>>>8)&255)-((calc>>>8)&255));
		var dif2=Math.abs(((ref>>>16)&255)-((calc>>>16)&255));
		var dif3=Math.abs(((ref>>>24)&255)-((calc>>>24)&255));
		count+=dif0+dif1+dif2+dif3;
		if (dif0>1 || dif1>1 || dif2>1 || dif3>1) {
			console.log("error");
			console.log(src,dst);
			console.log(ref.toString(16),calc.toString(16));
			return;
		}
	}
	console.log("sum: "+count);
	console.log("passed");
	var sum=0,dst,src;
	var t0=performance.now();
	for (var test=0;test<10000000;test++) {
		src=Math.floor(Math.random()*0x100000000);
		dst=Math.floor(Math.random()*0x100000000);
		if ((test& 3)===0) {src=(src&nm)>>>0;}
		if ((test& 3)===1) {src=(src|am)>>>0;}
		if ((test&12)===0) {dst=(dst&nm)>>>0;}
		if ((test&12)===8) {dst=(dst|am)>>>0;}
		sum^=blendref(dst,src);
	}
	t0=performance.now()-t0;
	var t1=performance.now();
	for (var test=0;test<10000000;test++) {
		src=Math.floor(Math.random()*0x100000000);
		dst=Math.floor(Math.random()*0x100000000);
		if ((test& 3)===0) {src=(src&nm)>>>0;}
		if ((test& 3)===1) {src=(src|am)>>>0;}
		if ((test&12)===0) {dst=(dst&nm)>>>0;}
		if ((test&12)===8) {dst=(dst|am)>>>0;}
		sum^=blendfast3(dst,src);
	}
	t1=performance.now()-t1;
	var t2=performance.now();
	for (var test=0;test<10000000;test++) {
		src=Math.floor(Math.random()*0x100000000);
		dst=Math.floor(Math.random()*0x100000000);
		if ((test& 3)===0) {src=(src&nm)>>>0;}
		if ((test& 3)===1) {src=(src|am)>>>0;}
		if ((test&12)===0) {dst=(dst&nm)>>>0;}
		if ((test&12)===8) {dst=(dst|am)>>>0;}
		sum^=blendfast4(dst,src);
	}
	t2=performance.now()-t2;
	console.log(sum);
	console.log(t0);
	console.log(t1);
	console.log(t2);
	console.log("passed");
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
	/*p3x=p3x-p0x+3*(p1x-p2x);
	p3y=p3y-p0y+3*(p1y-p2y);
	p2x=3*(p2x+p0x-2*p1x);
	p2y=3*(p2y+p0y-2*p1y);
	p1x=3*(p1x-p0x);
	p1y=3*(p1y-p0y);
	var cpx=p0x+u1*(p1x+u1*(p2x+u1*p3x));
	var cpy=p0y+u1*(p1y+u1*(p2y+u1*p3y));*/
	p2x=(p2x-p1x)*3;p1x=(p1x-p0x)*3;p3x-=p0x+p2x;p2x-=p1x;
	p2y=(p2y-p1y)*3;p1y=(p1y-p0y)*3;p3y-=p0y+p2y;p2y-=p1y;
	var cpx=p0x+u1*(p1x+u1*(p2x+u1*p3x));
	var cpy=p0y+u1*(p1y+u1*(p2y+u1*p3y));
	return [cpx,cpy];
}


function bezierpolytest() {
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
// Bezier Segmentation Tests


function bezierdistance(curve,linearr) {
	var p0x=curve[0],p1x=curve[2],p2x=curve[4],p3x=curve[6];
	var p0y=curve[1],p1y=curve[3],p2y=curve[5],p3y=curve[7];
	p2x=(p2x-p1x)*3;p1x=(p1x-p0x)*3;p3x-=p0x+p2x;p2x-=p1x;
	p2y=(p2y-p1y)*3;p1y=(p1y-p0y)*3;p3y-=p0y+p2y;p2y-=p1y;
	var len=linearr.length;
	if (len<1 || Math.abs(linearr[len-1].u-1)>1e-8) {
		throw "invalid points";
	}
	var u0,u1=0;
	var lx0,ly0,lx1=p0x,ly1=p0y,ldx,ldy;
	var maxdist=0;
	for (var i=0;i<len;i++) {
		// Calculate the points of this segment.
		var l=linearr[i];
		u0=u1;
		u1=l.u;
		if (u0>=u1) {
			throw "points not sorted";
		}
		lx0=lx1;lx1=p0x+u1*(p1x+u1*(p2x+u1*p3x));ldx=lx1-lx0;
		ly0=ly1;ly1=p0y+u1*(p1y+u1*(p2y+u1*p3y));ldy=ly1-ly0;
		var mag=ldx*ldx+ldy*ldy;
		// Make sure the line endpoints match our calculation.
		var dx0=l.x0-lx0,dy0=l.y0-ly0,err0=dx0*dx0+dy0*dy0;
		var dx1=l.x1-lx1,dy1=l.y1-ly1,err1=dx1*dx1+dy1*dy1;
		if (err0>1e-10 || err1>1e-10) {
			throw "points not on curve: "+i+"/"+len;
		}
		// Find the greatest distance from the curve to [p0,p1].
		var ldist=Math.sqrt(ldx*ldx+ldy*ldy);
		var steps=Math.floor(ldist+20);
		var umul=(u1-u0)/(steps-1);
		for (var s=0;s<steps;s++) {
			var u=s*umul+u0;
			var cpx=p0x+u*(p1x+u*(p2x+u*p3x))-lx0;
			var cpy=p0y+u*(p1y+u*(p2y+u*p3y))-ly0;
			var u=cpx*ldx+cpy*ldy;
			if (u<0) {u=0;}
			else if (u>=mag) {u=1;}
			else {u/=mag;}
			cpx-=u*ldx;
			cpy-=u*ldy;
			var dist=cpx*cpx+cpy*cpy;
			if (maxdist<dist) {
				maxdist=dist;
			}
		}
	}
	return Math.sqrt(maxdist);
}


function beziersegment1(tv,splitlen) {
	// Get the control points and check if the curve's on the screen.
	var p0=0,p0x=tv[p0],p0y=tv[p0+1];
	var p1=2,p1x=tv[p1],p1y=tv[p1+1];
	var p2=4,p2x=tv[p2],p2y=tv[p2+1];
	var p3=6,p3x=tv[p3],p3y=tv[p3+1];
	/*x0=Math.min(p0x,Math.min(p1x,Math.min(p2x,p3x)));
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
	}*/
	// Interpolate points.
	var lr=[],lrcnt=0,lcnt=0;
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
			//this.tmpline=lr;
		}
		u1=(u1-u0)/segs;
		for (var s=0;s<segs;s++) {
			u0+=u1;
			cpx=p0x+u0*(p1x+u0*(p2x+u0*p3x));
			cpy=p0y+u0*(p1y+u0*(p2y+u0*p3y));
			l=lr[lcnt++];
			l.u=u0;
			l.x0=ppx;
			l.y0=ppy;
			l.x1=cpx;
			l.y1=cpy;
			ppx=cpx;
			ppy=cpy;
		}
	}
	return lr.slice(0,lcnt);
}


function beziersegment2(tv,splitlen) {
	// Get the control points and check if the curve's on the screen.
	var p0=0,p0x=tv[p0],p0y=tv[p0+1];
	var p1=2,p1x=tv[p1],p1y=tv[p1+1];
	var p2=4,p2x=tv[p2],p2y=tv[p2+1];
	var p3=6,p3x=tv[p3],p3y=tv[p3+1];
	/*x0=Math.min(p0x,Math.min(p1x,Math.min(p2x,p3x)));
	x1=Math.max(p0x,Math.max(p1x,Math.max(p2x,p3x)));
	y0=Math.min(p0y,Math.min(p1y,Math.min(p2y,p3y)));
	y1=Math.max(p0y,Math.max(p1y,Math.max(p2y,p3y)));
	if (x0>=iw || y0>=ih || y1<=0) {continue;}*/
	splitlen*=splitlen;
	var lr=[],lrcnt=0,lcnt=0;
	if (lcnt>=lrcnt) {
		var newlen=(lcnt+1)*2;
		while (lrcnt<newlen) {lr.push({});lrcnt++;}
		//this.tmpline=lr;
	}
	var l=lr[lcnt++];
	l.x0=p0x;
	l.y0=p0y;
	l.x1=p3x;
	l.y1=p3y;
	l.u0=0;
	l.u =1;
	// Interpolate points.
	p2x=(p2x-p1x)*3;p1x=(p1x-p0x)*3;p3x-=p0x+p2x;p2x-=p1x;
	p2y=(p2y-p1y)*3;p1y=(p1y-p0y)*3;p3y-=p0y+p2y;p2y-=p1y;
	for (var i=0;i<lcnt;) {
		l=lr[i];
		var u=(l.u0+l.u)*0.5;
		var mpx=p0x+u*(p1x+u*(p2x+u*p3x));
		var mpy=p0y+u*(p1y+u*(p2y+u*p3y));
		var dx=mpx-l.x0,dy=mpy-l.y0;
		var dist=dx*dx+dy*dy;
		if (dist<splitlen) {
			dx=mpx-l.x1;dy=mpy-l.y1;
			dist=dx*dx+dy*dy;
		}
		if (dist>=splitlen) {
			// Split up the current segment.
			if (lcnt>=lrcnt) {
				var newlen=(lcnt+1)*2;
				while (lrcnt<newlen) {lr.push({});lrcnt++;}
				//this.tmpline=lr;
			}
			var n=lr[lcnt++];
			n.u0=u;
			n.u =l.u;
			n.x0=mpx;
			n.y0=mpy;
			n.x1=l.x1;
			n.y1=l.y1;
			l.x1=mpx;
			l.y1=mpy;
			l.u =u;
		} else {
			i++;
		}
	}
	for (var i=1;i<lcnt;i++) {
		var j=i;l=lr[j];
		while (j>0 && l.u<lr[j-1].u) {
			lr[j]=lr[j-1];
			j--;
		}
		lr[j]=l;
	}
	return lr.slice(0,lcnt);
}


function beziersegment3(tv,splitlen) {
	// Get the control points and check if the curve's on the screen.
	var p0=0,p0x=tv[p0],p0y=tv[p0+1];
	var p1=2,p1x=tv[p1],p1y=tv[p1+1];
	var p2=4,p2x=tv[p2],p2y=tv[p2+1];
	var p3=6,p3x=tv[p3],p3y=tv[p3+1];
	/*x0=Math.min(p0x,Math.min(p1x,Math.min(p2x,p3x)));
	x1=Math.max(p0x,Math.max(p1x,Math.max(p2x,p3x)));
	y0=Math.min(p0y,Math.min(p1y,Math.min(p2y,p3y)));
	y1=Math.max(p0y,Math.max(p1y,Math.max(p2y,p3y)));
	if (x0>=iw || y0>=ih || y1<=0) {continue;}*/
	var lr=[],lrcnt=0,lcnt=0;
	if (lcnt>=lrcnt) {
		var newlen=(lcnt+1)*2;
		while (lrcnt<newlen) {lr.push({});lrcnt++;}
		//this.tmpline=lr;
	}
	var l=lr[lcnt++];
	l.x0=p0x;
	l.y0=p0y;
	l.x1=p3x;
	l.y1=p3y;
	l.u0=0;
	l.u =1;
	// Interpolate points.
	p2x=(p2x-p1x)*3;p1x=(p1x-p0x)*3;p3x-=p0x+p2x;p2x-=p1x;
	p2y=(p2y-p1y)*3;p1y=(p1y-p0y)*3;p3y-=p0y+p2y;p2y-=p1y;
	for (var i=0;i<lcnt;) {
		l=lr[i];
		var u2=l.u0*0.75+l.u*0.25,u7=l.u0*0.25+l.u*0.75;
		var m2x=p0x+u2*(p1x+u2*(p2x+u2*p3x));
		var m2y=p0y+u2*(p1y+u2*(p2y+u2*p3y));
		var m7x=p0x+u7*(p1x+u7*(p2x+u7*p3x));
		var m7y=p0y+u7*(p1y+u7*(p2y+u7*p3y));
		var dx,dy,dist,dists;
		/*dx=l.x1-l.x0;dy=l.y1-l.y0;dist  =Math.sqrt(dx*dx+dy*dy);
		dx=m2x -l.x0;dy=m2y -l.y0;dists =Math.sqrt(dx*dx+dy*dy);
		dx=m7x -m2x ;dy=m7y -m2y ;dists+=Math.sqrt(dx*dx+dy*dy);
		dx=l.x1-m7x ;dy=l.y1-m7y ;dists+=Math.sqrt(dx*dx+dy*dy);
		if (dists>=dist*1.0001 && dists>1) {
			// Split up the current segment.
			if (lcnt+3>=lrcnt) {
				var newlen=(lcnt+3)*2;
				while (lrcnt<newlen) {lr.push({});lrcnt++;}
				//this.tmpline=lr;
			}
			var n;
			n=lr[lcnt++];n.u0=u2;n.u=u7 ;n.x0=m2x;n.y0=m2y;n.x1=m7x ;n.y1=m7y ;
			n=lr[lcnt++];n.u0=u7;n.u=l.u;n.x0=m7x;n.y0=m7y;n.x1=l.x1;n.y1=l.y1;
			l.x1=m2x;
			l.y1=m2y;
			l.u =u2;
		} else {
			i++;
		}*/
		/*dx=l.x1-l.x0;dy=l.y1-l.y0;dist  =Math.sqrt(dx*dx+dy*dy);
		dx=m2x -l.x0;dy=m2y -l.y0;dists =Math.sqrt(dx*dx+dy*dy);
		dx=m7x -m2x ;dy=m7y -m2y ;dists+=Math.sqrt(dx*dx+dy*dy);
		dx=l.x1-m7x ;dy=l.y1-m7y ;dists+=Math.sqrt(dx*dx+dy*dy);
		if (dists>=dist+0.05) {
		//if (dists>=Math.max(dist*1.00001,dist+0.001)) {
			// Split up the current segment.
			if (lcnt+3>=lrcnt) {
				var newlen=(lcnt+3)*2;
				while (lrcnt<newlen) {lr.push({});lrcnt++;}
				//this.tmpline=lr;
			}
			var n;
			n=lr[lcnt++];n.u0=u2;n.u=u7 ;n.x0=m2x;n.y0=m2y;n.x1=m7x ;n.y1=m7y ;
			n=lr[lcnt++];n.u0=u7;n.u=l.u;n.x0=m7x;n.y0=m7y;n.x1=l.x1;n.y1=l.y1;
			l.x1=m2x;
			l.y1=m2y;
			l.u =u2;
		} else {
			i++;
		}*/
		dist  =Math.abs(l.x1-l.x0)+Math.abs(l.y1-l.y0);
		dists =Math.abs(m2x -l.x0)+Math.abs(m2y -l.y0);
		dists+=Math.abs(m7x -m2x )+Math.abs(m7y -m2y );
		dists+=Math.abs(l.x1-m7x )+Math.abs(l.y1-m7y );
		if (dists>=dist+0.001) {
		//if (dists>=Math.max(dist*1.00001,dist+0.001)) {
			// Split up the current segment.
			if (lcnt+3>=lrcnt) {
				var newlen=(lcnt+3)*2;
				while (lrcnt<newlen) {lr.push({});lrcnt++;}
				//this.tmpline=lr;
			}
			var n;
			n=lr[lcnt++];n.u0=u2;n.u=u7 ;n.x0=m2x;n.y0=m2y;n.x1=m7x ;n.y1=m7y ;
			n=lr[lcnt++];n.u0=u7;n.u=l.u;n.x0=m7x;n.y0=m7y;n.x1=l.x1;n.y1=l.y1;
			l.x1=m2x;
			l.y1=m2y;
			l.u =u2;
		} else {
			i++;
		}
		/*dx=l.x1-l.x0;dy=l.y1-l.y0;dist  =Math.sqrt(dx*dx+dy*dy);
		dx=m2x -l.x0;dy=m2y -l.y0;dists =Math.sqrt(dx*dx+dy*dy);
		dx=m7x -m2x ;dy=m7y -m2y ;dists+=Math.sqrt(dx*dx+dy*dy);
		dx=l.x1-m7x ;dy=l.y1-m7y ;dists+=Math.sqrt(dx*dx+dy*dy);
		if (dists>=dist*1.0001 && dists>1) {
			// Split up the current segment.
			if (lcnt+2>=lrcnt) {
				var newlen=(lcnt+2)*2;
				while (lrcnt<newlen) {lr.push({});lrcnt++;}
				//this.tmpline=lr;
			}
			var n;
			n=lr[lcnt++];n.u0=u2;n.u=l.u;n.x0=m2x;n.y0=m2y;n.x1=l.x1;n.y1=l.y1;
			l.x1=m2x;
			l.y1=m2y;
			l.u =u2;
		} else {
			i++;
		}*/
		/*dx=l.x1-l.x0;dy=l.y1-l.y0;dist =(dx*dx+dy*dy);
		dx=m2x -l.x0;dy=m2y -l.y0;dists=(dx*dx+dy*dy);
		dx=m7x -m2x ;dy=m7y -m2y ;dists=Math.max(dists,dx*dx+dy*dy);
		dx=l.x1-m7x ;dy=l.y1-m7y ;dists=Math.max(dists,dx*dx+dy*dy);
		if (dists>=dist*0.22 && dists>1) {
			// Split up the current segment.
			if (lcnt+2>=lrcnt) {
				var newlen=(lcnt+2)*2;
				while (lrcnt<newlen) {lr.push({});lrcnt++;}
				//this.tmpline=lr;
			}
			var n;
			n=lr[lcnt++];n.u0=u2;n.u=l.u;n.x0=m2x;n.y0=m2y;n.x1=l.x1;n.y1=l.y1;
			l.x1=m2x;
			l.y1=m2y;
			l.u =u2;
		} else {
			i++;
		}*/
	}
	for (var i=1;i<lcnt;i++) {
		var j=i;l=lr[j];
		while (j>0 && l.u<lr[j-1].u) {
			lr[j]=lr[j-1];
			j--;
		}
		lr[j]=l;
	}
	return lr.slice(0,lcnt);
}


function beziersegment4(tv,splitlen) {
	// Get the control points and check if the curve's on the screen.
	var p0=0,p0x=tv[p0],p0y=tv[p0+1];
	var p1=2,p1x=tv[p1],p1y=tv[p1+1];
	var p2=4,p2x=tv[p2],p2y=tv[p2+1];
	var p3=6,p3x=tv[p3],p3y=tv[p3+1];
	/*x0=Math.min(p0x,Math.min(p1x,Math.min(p2x,p3x)));
	x1=Math.max(p0x,Math.max(p1x,Math.max(p2x,p3x)));
	y0=Math.min(p0y,Math.min(p1y,Math.min(p2y,p3y)));
	y1=Math.max(p0y,Math.max(p1y,Math.max(p2y,p3y)));
	if (x0>=iw || y0>=ih || y1<=0) {continue;}*/
	var lr=[],lrcnt=0,lcnt=0;
	if (lcnt>=lrcnt) {
		var newlen=(lcnt+1)*2;
		while (lrcnt<newlen) {lr.push({});lrcnt++;}
		//this.tmpline=lr;
	}
	var l=lr[lcnt++];
	l.x0=p0x;
	l.y0=p0y;
	l.x1=p3x;
	l.y1=p3y;
	l.u0=0;
	l.u =1;
	// Interpolate points.
	p2x=(p2x-p1x)*3;p1x=(p1x-p0x)*3;p3x-=p0x+p2x;p2x-=p1x;
	p2y=(p2y-p1y)*3;p1y=(p1y-p0y)*3;p3y-=p0y+p2y;p2y-=p1y;
	for (var i=0;i<lcnt;) {
		l=lr[i];
		var u=(l.u0+l.u)*0.5;
		var mx=p0x+u*(p1x+u*(p2x+u*p3x));
		var my=p0y+u*(p1y+u*(p2y+u*p3y));
		var mdx=p1x+u*2*p2x+u*u*3*p3x;
		var mdy=p1y+u*2*p2y+u*u*3*p3y;
		var mag=mdx*mdx+mdy*mdy;
		var dx,dy,dist,dists;
		dx=mx-l.x0;dy=my-l.y0;var dist0=dx*dx+dy*dy,err0=dx*mdx+dy*mdy;
		dx=l.x1-mx;dy=l.y1-my;var dist1=dx*dx+dy*dy,err1=dx*mdx+dy*mdy;
		if ((err0<0 || err1<0 || err0*err0<mag*dist0*0.9992 || err1*err1<mag*dist1*0.9992) && (dist0>1 || dist1>1)) {
			// Split up the current segment.
			if (lcnt+3>=lrcnt) {
				var newlen=(lcnt+3)*2;
				while (lrcnt<newlen) {lr.push({});lrcnt++;}
				//this.tmpline=lr;
			}
			var n=lr[lcnt++];
			n.u0=u;
			n.u =l.u;
			n.x0=mx;
			n.y0=my;
			n.x1=l.x1;
			n.y1=l.y1;
			l.x1=mx;
			l.y1=my;
			l.u =u;
		} else {
			i++;
		}
	}
	for (var i=1;i<lcnt;i++) {
		var j=i;l=lr[j];
		while (j>0 && l.u<lr[j-1].u) {
			lr[j]=lr[j-1];
			j--;
		}
		lr[j]=l;
	}
	return lr.slice(0,lcnt);
}

/*
function beziersegment4(tv,splitlen) {
	// Get the control points and check if the curve's on the screen.
	var p0=0,p0x=tv[p0],p0y=tv[p0+1];
	var p1=2,p1x=tv[p1],p1y=tv[p1+1];
	var p2=4,p2x=tv[p2],p2y=tv[p2+1];
	var p3=6,p3x=tv[p3],p3y=tv[p3+1];
	//x0=Math.min(p0x,Math.min(p1x,Math.min(p2x,p3x)));
	//x1=Math.max(p0x,Math.max(p1x,Math.max(p2x,p3x)));
	//y0=Math.min(p0y,Math.min(p1y,Math.min(p2y,p3y)));
	//y1=Math.max(p0y,Math.max(p1y,Math.max(p2y,p3y)));
	//if (x0>=iw || y0>=ih || y1<=0) {continue;}
	var lr=[],lrcnt=0,lcnt=0;
	if (lcnt>=lrcnt) {
		var newlen=(lcnt+1)*2;
		while (lrcnt<newlen) {lr.push({});lrcnt++;}
		//this.tmpline=lr;
	}
	var l=lr[lcnt++];
	l.x0=p0x;
	l.y0=p0y;
	l.x1=p3x;
	l.y1=p3y;
	l.u0=0;
	l.u =1;
	l.dx0=p1x-p0x;l.dy0=p1y-p0y;
	l.dx1=p3x-p2x;l.dy1=p3y-p2y;
	// Interpolate points.
	p2x=(p2x-p1x)*3;p1x=(p1x-p0x)*3;p3x-=p0x+p2x;p2x-=p1x;
	p2y=(p2y-p1y)*3;p1y=(p1y-p0y)*3;p3y-=p0y+p2y;p2y-=p1y;
	for (var i=0;i<lcnt;) {
		l=lr[i];
		var u=(l.u0+l.u)*0.5;
		var dx=p1x+u*(2*p2x+u*3*p3x);
		var dy=p1y+u*(2*p2y+u*3*p3y);
	console.log(3*(),3*(p1y-p0y));
	console.log(3*(p3x-p2x),3*(p3y-p2y));
	// Interpolate points.
	p2x=(p2x-p1x)*3;p1x=(p1x-p0x)*3;p3x-=p0x+p2x;p2x-=p1x;
	p2y=(p2y-p1y)*3;p1y=(p1y-p0y)*3;p3y-=p0y+p2y;p2y-=p1y;
	for (var i=0;i<10;i++) {
		var u=i/9.0;

		console.log(dx,dy);
	}
	throw "x";
}
*/

function beziersegmenttest() {
	var rnd=new Random(10);
	var curve=new Array(8);
	var distsum=0,segsum=0;
	var tests=100;
	for (var test=0;test<tests;test++) {
		for (var i=0;i<8;i++) {
			curve[i]=(rnd.getf64()*2-1)*100;
		}
		var lr=beziersegment4(curve,3);
		var dist=bezierdistance(curve,lr);
		distsum+=dist;
		segsum+=lr.length;
		console.log(test,dist,lr.length);
	}
	console.log("dist: "+distsum);
	console.log("segs: "+segsum);
}


//---------------------------------------------------------------------------------
// Test 3 - Line Sorting


function sortfunc0(arr,start,stop,field) {
	var len=stop-start,i,tmp;
	if (sortfunc0.sortval===undefined || sortfunc0.sortval.length<stop) {
		sortfunc0.sortval=new Float64Array(stop*2);
		sortfunc0.sortobj=new Array(stop*2);
		sortfunc0.dstval=new Float64Array(stop*2);
	}
	var sortval=sortfunc0.sortval;
	for (i=start;i<stop;i++) {
		sortval[i]=arr[i][field];
	}
	var sortobj=arr;
	var dstval=sortfunc0.dstval;
	var dstobj=sortfunc0.sortobj;
	for (var half=1;half<len;half+=half) {
		var hstop=stop-half;
		for (i=start;i<stop;) {
			var i0=i ,i1=i <hstop?i +half:stop;
			var j0=i1,j1=i1<hstop?i1+half:stop;
			while (i0<i1 && j0<j1) {
				if (sortval[i0]<=sortval[j0]) {
					dstval[i]=sortval[i0  ];
					dstobj[i]=sortobj[i0++];
				} else {
					dstval[i]=sortval[j0  ];
					dstobj[i]=sortobj[j0++];
				}
				i++;
			}
			while (i0<i1) {
				dstval[i  ]=sortval[i0  ];
				dstobj[i++]=sortobj[i0++];
			}
			while (j0<j1) {
				dstval[i  ]=sortval[j0  ];
				dstobj[i++]=sortobj[j0++];
			}
		}
		tmp=sortval;sortval=dstval;dstval=tmp;
		tmp=sortobj;sortobj=dstobj;dstobj=tmp;
	}
	if (!Object.is(sortobj,arr)) {
		for (i=start;i<stop;i++) {arr[i]=sortobj[i];}
	}
}


function sortfunc1(arr,start,stop,field) {
	var len=stop-start,i,tmp;
	if (sortfunc1.sortobj===undefined || sortfunc1.sortobj.length<len) {
		sortfunc1.sortobj=new Array(len*2);
		sortfunc1.dstobj =new Array(len*2);
	}
	var sortobj=sortfunc1.sortobj;
	var dstobj=sortfunc1.dstobj;
	for (i=0;i<len;i++) {sortobj[i]=arr[i+start];}
	for (var half=1;half<len;half+=half) {
		var hlen=len-half;
		for (i=0;i<len;) {
			var i0=i ,i1=i <hlen?i +half:len;
			var j0=i1,j1=i1<hlen?i1+half:len;
			while (i0<i1 && j0<j1) {
				if (sortobj[i0][field]<=sortobj[j0][field]) {
					dstobj[i++]=sortobj[i0++];
				} else {
					dstobj[i++]=sortobj[j0++];
				}
			}
			while (i0<i1) {dstobj[i++]=sortobj[i0++];}
			while (j0<j1) {dstobj[i++]=sortobj[j0++];}
		}
		tmp=sortobj;sortobj=dstobj;dstobj=tmp;
	}
	for (i=0;i<len;i++) {
		arr[start+i]=sortobj[i];
	}
}


function sortfunc2(arr,start,stop,field) {
	var len=stop-start,i,tmp;
	if (sortfunc2.sortobj===undefined || sortfunc2.sortobj.length<len) {
		sortfunc2.sortobj=new Array(len*2);
		sortfunc2.dstobj =new Array(len*2);
	}
	var sortobj=sortfunc2.sortobj;
	var dstobj=sortfunc2.dstobj;
	for (i=0;i<len;i++) {sortobj[i]=arr[i+start];}
	for (var half=1;half<len;half+=half) {
		var hlen=len-half;
		for (i=0;i<len;) {
			var i0=i ,i1=i <hlen?i +half:len;
			var j0=i1,j1=i1<hlen?i1+half:len;
			if (i0<i1 && j0<j1) {
				var iv=sortobj[i0][field];
				var jv=sortobj[j0][field];
				while (1) {
					if (iv<=jv) {
						dstobj[i++]=sortobj[i0++];
						if (i0>=i1) {break;}
						iv=sortobj[i0][field];
					} else {
						dstobj[i++]=sortobj[j0++];
						if (j0>=j1) {break;}
						jv=sortobj[j0][field];
					}
				}
			}
			while (i0<i1) {dstobj[i++]=sortobj[i0++];}
			while (j0<j1) {dstobj[i++]=sortobj[j0++];}
		}
		tmp=sortobj;sortobj=dstobj;dstobj=tmp;
	}
	for (i=0;i<len;i++) {
		arr[start+i]=sortobj[i];
	}
}


function sortfunc3(arr,start,stop,field) {
	var len=stop-start,arr0=arr,i,tmp;
	if (sortfunc3.sortobj===undefined || sortfunc3.sortobj.length<stop) {
		sortfunc3.sortobj=new Array(stop*2);
	}
	var dst=sortfunc3.sortobj;
	for (var half=1;half<len;half+=half) {
		var hstop=stop-half;
		for (i=start;i<stop;) {
			var i0=i ,i1=i <hstop?i +half:stop;
			var j0=i1,j1=i1<hstop?i1+half:stop;
			if (i0<i1 && j0<j1) {
				var iv=arr[i0][field];
				var jv=arr[j0][field];
				while (1) {
					if (iv<=jv) {
						dst[i++]=arr[i0++];
						if (i0>=i1) {break;}
						iv=arr[i0][field];
					} else {
						dst[i++]=arr[j0++];
						if (j0>=j1) {break;}
						jv=arr[j0][field];
					}
				}
			}
			while (i0<i1) {dst[i++]=arr[i0++];}
			while (j0<j1) {dst[i++]=arr[j0++];}
		}
		tmp=dst;dst=arr;arr=tmp;
	}
	if (!Object.is(arr0,arr)) {
		for (i=start;i<stop;i++) {arr0[i]=arr[i];}
	}
}


function sortfunc4(arr,start,stop,field) {
	var len=stop-start,i;
	if (len<33) {
		for (i=start+1;i<stop;i++) {
			var j=i,obj=arr[i],val=obj[field];
			while (j>start && val<arr[j-1][field]) {
				arr[j]=arr[j-1];
				j--;
			}
			arr[j]=obj;
		}
		return;
	}
	if (sortfunc4.sortobj===undefined || sortfunc4.sortobj.length<stop) {
		sortfunc4.sortobj=new Array(stop*2);
	}
	var dst=sortfunc4.sortobj,arr0=arr,tmp;
	for (var half=1;half<len;half+=half) {
		var hstop=stop-half;
		for (i=start;i<stop;) {
			var i0=i ,i1=i <hstop?i +half:stop;
			var j0=i1,j1=i1<hstop?i1+half:stop;
			if (i0<i1 && j0<j1) {
				var io=arr[i0],iv=io[field];
				var jo=arr[j0],jv=jo[field];
				while (1) {
					if (iv<=jv) {
						dst[i++]=io;
						if (++i0>=i1) {break;}
						io=arr[i0];iv=io[field];
					} else {
						dst[i++]=jo;
						if (++j0>=j1) {break;}
						jo=arr[j0];jv=jo[field];
					}
				}
			}
			while (i0<i1) {dst[i++]=arr[i0++];}
			while (j0<j1) {dst[i++]=arr[j0++];}
		}
		tmp=dst;dst=arr;arr=tmp;
	}
	if (!Object.is(arr0,arr)) {
		for (i=start;i<stop;i++) {arr0[i]=arr[i];}
	}
}


function sortfunc5(arr,start,stop,field) {
	var half=16;
	for (var i=start;i<stop;) {
		var i0=i,i1=i+half;i1=i1<stop?i1:stop;
		while (++i<i1) {
			var j=i,obj=arr[i],val=obj[field];
			while (j>i0 && val<arr[j-1][field]) {
				arr[j]=arr[j-1];
				j--;
			}
			arr[j]=obj;
		}
	}
	var len=stop-start;
	if (len<=16) {return;}
	if (sortfunc5.sortobj===undefined || sortfunc5.sortobj.length<stop) {
		sortfunc5.sortobj=new Array(stop*2);
	}
	var dst=sortfunc5.sortobj,arr0=arr,tmp;
	for (;half<len;half+=half) {
		var hstop=stop-half;
		for (i=start;i<stop;) {
			var i0=i ,i1=i <hstop?i +half:stop;
			var j0=i1,j1=i1<hstop?i1+half:stop;
			if (i0<i1 && j0<j1) {
				var io=arr[i0],iv=io[field];
				var jo=arr[j0],jv=jo[field];
				while (1) {
					if (iv<=jv) {
						dst[i++]=io;
						if (++i0>=i1) {break;}
						io=arr[i0];iv=io[field];
					} else {
						dst[i++]=jo;
						if (++j0>=j1) {break;}
						jo=arr[j0];jv=jo[field];
					}
				}
			}
			while (i0<i1) {dst[i++]=arr[i0++];}
			while (j0<j1) {dst[i++]=arr[j0++];}
		}
		tmp=dst;dst=arr;arr=tmp;
	}
	if (!Object.is(arr0,arr)) {
		for (i=start;i<stop;i++) {arr0[i]=arr[i];}
	}
}


function sorttest() {
	var funcs=[sortfunc0,sortfunc1,sortfunc2,sortfunc3,sortfunc4,sortfunc5];
	for (var b=0;b<14;b++) {
		var len=1<<b;
		var arr=new Array(len);
		for (var i=0;i<len;i++) {arr[i]={val:0,idx:i};}
		var trials=Math.floor(1000000/len);
		var line=b+": ",t0;
		for (var f=0;f<funcs.length;f++) {
			const sort=funcs[f];
			t0=performance.now();
			for (var trial=0;trial<trials;trial++) {
				for (var i=0;i<len;i++) {arr[i].val=Math.random();}
				sort(arr,0,len,"val");
			}
			line+=Math.floor(performance.now()-t0)+", ";
		}
		console.log(line);
	}
}


//---------------------------------------------------------------------------------
// Main


function testmain() {
	console.log("starting polygon tests");
	// areatest1();
	// areatest2();
	// stridetest();
	// blendtest1();
	// blendtest2();
	// bezierpolytest();
	//beziersegmenttest();
	// sorttest();
}


//window.addEventListener("load",testmain);
