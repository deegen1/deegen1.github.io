/*------------------------------------------------------------------------------


pixblendtest.js - v1.01

Copyright 2024 Alec Dee - MIT license - SPDX: MIT
deegen1.github.io - akdee144@gmail.com


--------------------------------------------------------------------------------
Notes


Tests for more efficient pixel blending algorithms.


*/
/* jshint esversion: 6   */
/* jshint bitwise: false */
/* jshint eqeqeq: true   */
/* jshint curly: true    */


function pixblendtest() {
	// expects alpha in [0,256], NOT [0,256).
	var samples=10000000*2;
	var arr0=new Uint32Array(samples);
	for (var i=0;i<samples;i+=2) {
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
	for (var i=0;i<samples;i+=2) {
		hash=arr[i+1];
		hash=Math.imul(hash,0x1645a3d3)^arr[i];
	}
	base=performance.now()-base;
	console.log("baseline:",base,hash);
	console.log("Algorithm, Time, Accurate");
	// ----------------------------------------
	arr.set(arr0);hash=1;pos=0;time=performance.now();
	for (var i=0;i<samples;i+=2) {
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
	for (var i=0;i<samples;i+=2) {
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
	for (var i=0;i<samples;i+=2) {
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
	for (var i=0;i<samples;i+=2) {
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
	for (var i=0;i<samples;i+=2) {
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
	for (var i=0;i<samples;i+=2) {
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
	for (var i=0;i<samples;i+=2) {
		a=arr[i+1];
		dst=arr[i];
		arr[i]=(((Math.imul((dst&0x00ff00ff)-lh,a)>>>8)+lh)&0x00ff00ff)+
		       ((Math.imul(((dst&0xff00ff00)>>>8)-hh2,a)+hh)&0xff00ff00);
		hash=Math.imul(hash,0x1645a3d3)^arr[i];
	}
	time=performance.now()-time-base;
	console.log("imul #2",time,hash===hash0);
}