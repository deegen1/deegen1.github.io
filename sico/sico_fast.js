/*------------------------------------------------------------------------------


sico_fast.js - v1.02

Copyright 2023 Alec Dee - MIT license - SPDX: MIT
deegen1.github.io - akdee144@gmail.com


--------------------------------------------------------------------------------
Notes


Webassembly acceleration for SICO.
SICO.run() will call SICOFastRun() automatically if it's detected.


          Mode     |   Time
     --------------+-----------
       JS BigInt   |  2282.20
       JS Fast     |    42.62
       WASM        |    18.83
       WASM + HLI  |     0.20


Memory layout:


     +-----+-----+-----+-----+
     | env | mem | buf | HLI |
     +-----+-----+-----+-----+


Environment variables:


     0 envlen
     1 memlen
     2 buflen
     3 hlilen
     4 mod
     5 IO start
     6 ip
     7 instruction limit
     8 IO 1
     9 IO 2


--------------------------------------------------------------------------------
TODO


drawimage: 0.0094s, 11.44s total
Speed up drawimage byte shifting, add another IO buffer
https://developer.mozilla.org/en-US/docs/Web/API/ImageData/ImageData


*/
/* jshint esversion: 11  */
/* jshint bitwise: false */
/* jshint eqeqeq: true   */
/* jshint curly: true    */


//---------------------------------------------------------------------------------
// Javascript Fallback


function SICOFastJSRun(sico,insts,time) {
	// This version of run() unrolls several operations to speed things up.
	// It's 53 times faster than using bigint functions, but slower than wasm.
	if (sico.state!==sico.RUNNING) {return;}
	var fast=sico.fast;
	if (fast===undefined) {sico.fast=fast={};}
	var big=Object.is(fast.mem,sico.mem)-1;
	var iphi=Number(sico.ip>>32n),iplo=Number(sico.ip&0xffffffffn);
	var modhi=Number(sico.mod>>32n),modlo=Number(sico.mod&0xffffffffn);
	var memh=fast.memh,meml=fast.meml;
	var alloc=Number(sico.alloc),alloc2=alloc-2;
	var ahi,alo,chi,clo;
	var bhi,blo,mbhi,mblo;
	var ip,a,b,ma,mb,mem;
	var i,timeiters=0;
	while (insts>0) {
		// Periodically check if we've run for too long.
		if (--timeiters<=0) {
			if (performance.now()>=time) {break;}
			timeiters=2048;
		}
		// Execute using bigints.
		if (big!==0) {
			big=0;
			ip=(BigInt(iphi)<<32n)+BigInt(iplo);
			a =sico.getmem(ip++);
			b =sico.getmem(ip++);
			ma=sico.getmem(a);
			mb=sico.getmem(b);
			ip=ma<=mb?sico.getmem(ip):((ip+1n)%sico.mod);
			sico.setmem(a,ma-mb);
			mem=sico.mem;
			if (!Object.is(fast.mem,mem)) {
				fast.mem=mem;
				var endian=(new Uint32Array((new BigUint64Array([4n])).buffer))[0];
				fast.memh=memh=new Uint32Array(mem.buffer,mem.byteOffset+  endian);
				fast.meml=meml=new Uint32Array(mem.buffer,mem.byteOffset+4-endian);
				alloc=Number(sico.alloc);
				alloc2=alloc-2;
			}
			iphi=Number(ip>>32n);
			iplo=Number(ip&0xffffffffn);
			insts--;
			if (sico.state!==sico.RUNNING) {break;}
			continue;
		}
		// Load a, b, and c.
		if (iphi>0 || iplo>=alloc2) {big=1;continue;}
		i=iplo+iplo;
		ahi=memh[i];
		alo=meml[i];
		i+=2;
		bhi=memh[i];
		blo=meml[i];
		i+=2;
		chi=memh[i];
		clo=meml[i];
		// Input
		if (bhi>0 || blo>=alloc) {big=1;continue;}
		i=blo+blo;
		mbhi=memh[i];
		mblo=meml[i];
		// Output
		if (ahi>0 || alo>=alloc) {big=1;continue;}
		i=alo+alo;
		mblo=meml[i]-mblo;
		mbhi=memh[i]-mbhi;
		if (mblo<0) {
			mblo+=0x100000000;
			mbhi--;
		}
		if (mbhi===0 && mblo===0) {
			iphi=chi;
			iplo=clo;
		} else if (mbhi<0) {
			mblo+=modlo;
			mbhi+=modhi;
			if (mblo>=0x100000000) {
				mblo-=0x100000000;
				mbhi++;
			}
			iphi=chi;
			iplo=clo;
		} else {
			iplo+=3;
		}
		meml[i]=mblo;
		memh[i]=mbhi;
		insts--;
	}
	sico.ip=(BigInt(iphi)<<32n)+BigInt(iplo);
}


//---------------------------------------------------------------------------------
// WASM


function SICOFastInit(st) {
	st.wasm={
		env64: null,
		envh32:null,
		envl32:null,
		//memh32:null,
		//meml32:null,
		//buf32: null,
		//buf64: null,
		hli16: [],
		module:undefined,
		oldlbl:null,
		oldmem:null
	};
	SICOFastLoadHLI(st);
	SICOFastLoadWASM(st);
}


function SICOFastLoadHLI(st) {
	// Find high-level intercepts.
	var hlitable=[
		// 00xx - none
		// 01xx - uint
		// 02xx - int
		// 03xx - mem
		// 04xx - rand
		// 05xx - string
		// 06xx - image
		// 07xx - audio
		["uint.cmp",0x0100],
		["uint.min",0x0101],
		["uint.max",0x0102],
		["uint.set",0x0103],
		["uint.neg",0x0104],
		["uint.add",0x0105],
		["uint.sub",0x0106],
		["uint.mul",0x0107],
		["uint.div",0x0108],
		["uint.gcd",0x0109],
		["uint.shl",0x010a],
		["uint.shr",0x010b],
		["uint.not",0x010c],
		["uint.and",0x010d],
		["uint.or" ,0x010e],
		["uint.xor",0x010f],
		["image.setpixel",0x060a]
	];
	var hlilen=-1;
	for (var i=hlitable.length-1;i>=0;i--) {
		var hliobj=hlitable[i];
		var addr=Number(st.findlabel(hliobj[0]));
		if (addr<0x100000000 && hlilen<addr) {
			hlilen=addr;
		}
	}
	hlilen+=4-((hlilen>>>0)&3);
	var hlimap=new Uint16Array(hlilen);
	for (var i=hlitable.length-1;i>=0;i--) {
		var hliobj=hlitable[i];
		var addr=Number(st.findlabel(hliobj[0]));
		if (addr>=0 && addr<hlilen) {
			hlimap[addr]=hliobj[1];
		}
	}
	st.wasm.hli16=hlimap;
	st.wasm.oldlbl=st.lblroot;
}


async function SICOFastLoadWASM(st) {
	// Attempt to load the WebAssembly program.
	// sico_wasm.c -> compile -> gzip -> base64
	var wasmstr=`
		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
		9f8DVQwW/VMyAAA=
	`;
	var gzipbytes=Uint8Array.from(atob(wasmstr),(c)=>c.codePointAt(0));
	var gzipstream=new Blob([gzipbytes]).stream();
	var decstream=gzipstream.pipeThrough(new DecompressionStream("gzip"));
	var decblob=await new Response(decstream).blob();
	var wasmbytes=new Uint8Array(await decblob.arrayBuffer());
	// Set up IO functions.
	function getmemjs() {
		var env64=st.wasm.env64;
		env64[9]=st.getmem(env64[8]);
	}
	function setmemjs() {
		st.setmem(st.wasm.env64[8],st.wasm.env64[9]);
		if (!Object.is(st.wasm.oldmem,st.mem)) {
			SICOFastResize(st);
		}
		st.wasm.envh32[18]=0;
		st.wasm.envl32[18]=st.state!==st.RUNNING || st.mem.byteOffset===0;
	}
	function timelimitjs() {
		st.wasm.envh32[18]=0;
		st.wasm.envl32[18]=performance.now()>=st.timelimit;
	}
	var imports={getmemjs,setmemjs,timelimitjs};
	WebAssembly.instantiate(wasmbytes,{env:imports}).then(
		(mod)=>st.wasm.module=mod,
	);
}


function SICOFastResize(st) {
	// wasm has its own sandboxed memory, so allocate memory in wasm and remap our
	// IO buffer and SICO memory into it. If mem.byteOffset=0, SICO's memory has been
	// reallocated.
	var module=st.wasm.module;
	var wasmmem=module.instance.exports.memory;
	var envlen=10,hlilen=st.wasm.hli16.length,memlen=st.mem.length;
	var pagebytes=65536;
	var pages=Math.ceil((envlen*8+hlilen*2+memlen*8)/pagebytes);
	pages-=Math.floor(wasmmem.buffer.byteLength/pagebytes);
	if (pages>0) {wasmmem.grow(pages);}
	var endian=(new Uint32Array((new BigUint64Array([4n])).buffer))[0];
	var off=0,newhli,newmem,env64,envh32,envl32;
	env64 =new BigUint64Array(wasmmem.buffer,off,envlen); off+= env64.byteLength;
	newmem=new BigUint64Array(wasmmem.buffer,off,memlen); off+=newmem.byteLength;
	newhli=new    Uint16Array(wasmmem.buffer,off,hlilen); off+=newhli.byteLength;
	envh32=new    Uint32Array(wasmmem.buffer,  endian,envlen*2);
	envl32=new    Uint32Array(wasmmem.buffer,4-endian,envlen*2);
	newhli.set(st.wasm.hli16,0);
	if (st.mem.byteOffset===0) {newmem.set(st.mem,0);}
	st.wasm.env64 =env64;
	st.wasm.envh32=envh32;
	st.wasm.envl32=envl32;
	st.mem=newmem;
	st.wasm.oldmem=st.mem;
	env64[0]=BigInt(envlen);
	env64[1]=BigInt(memlen);
	env64[2]=0n;
	env64[3]=BigInt(hlilen);
	env64[4]=st.mod;
	env64[5]=st.io;
}


function SICOFastRun(st,insts,time) {
	// On first run load the wasm module.
	if (st.wasm===undefined || !Object.is(st.wasm.oldlbl,st.lblroot)) {
		SICOFastInit(st);
	}
	var module=st.wasm.module;
	if (module===undefined) {
		// If wasm fails to load, use a backup.
		return SICOFastJSRun(st,insts,time);
	}
	if (st.state!==st.RUNNING) {
		return;
	}
	if (!Object.is(st.wasm.oldmem,st.mem)) {
		SICOFastResize(st);
	}
	var env64=st.wasm.env64;
	env64[6]=st.ip;
	if (insts<0 || insts>0x80000000) {
		env64[7]=0xffffffffffffffffn;
	} else {
		env64[7]=BigInt(insts);
	}
	module.instance.exports.run();
	st.ip=st.wasm.env64[6];
}

