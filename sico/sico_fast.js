/*------------------------------------------------------------------------------


sico_fast.js - v1.03

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


     +-----+-----+-----+
     | env | mem | HLI |
     +-----+-----+-----+


Environment variables:


     0 envlen
     1 memlen
     2 hlilen
     3 mod
     4 IO start
     5 ip
     6 instruction limit
     7 IO 1
     8 IO 2


--------------------------------------------------------------------------------
TODO


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
	var memlen=Number(sico.alloc),memlen2=memlen-2;
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
				memlen=Number(sico.alloc);
				memlen2=memlen-2;
			}
			iphi=Number(ip>>32n);
			iplo=Number(ip&0xffffffffn);
			insts--;
			if (sico.state!==sico.RUNNING) {break;}
			continue;
		}
		// Load a, b, and c.
		if (iphi>0 || iplo>=memlen2) {big=1;continue;}
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
		if (bhi>0 || blo>=memlen) {big=1;continue;}
		i=blo+blo;
		mbhi=memh[i];
		mblo=meml[i];
		// Output
		if (ahi>0 || alo>=memlen) {big=1;continue;}
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
	`;
	var gzipbytes=Uint8Array.from(atob(wasmstr),(c)=>c.codePointAt(0));
	var gzipstream=new Blob([gzipbytes]).stream();
	var decstream=gzipstream.pipeThrough(new DecompressionStream("gzip"));
	var decblob=await new Response(decstream).blob();
	var wasmbytes=new Uint8Array(await decblob.arrayBuffer());
	// Set up IO functions.
	function dbgprintjs(h,l) {
		console.log("Debug:",(BigInt(h>>>0)<<32n)+BigInt(l>>>0));
	}
	function getmemjs() {
		var env64=st.wasm.env64;
		env64[8]=st.getmem(env64[7]);
	}
	function setmemjs() {
		st.setmem(st.wasm.env64[7],st.wasm.env64[8]);
		if (!Object.is(st.wasm.oldmem,st.mem)) {
			SICOFastResize(st);
		}
		st.wasm.envh32[16]=0;
		st.wasm.envl32[16]=st.state!==st.RUNNING || st.mem.byteOffset===0;
	}
	function timelimitjs() {
		st.wasm.envh32[16]=0;
		st.wasm.envl32[16]=performance.now()>=st.timelimit;
	}
	var imports={dbgprintjs,getmemjs,setmemjs,timelimitjs};
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
	var envlen=9,hlilen=st.wasm.hli16.length,memlen=st.mem.length;
	var pagebytes=65536;
	var pages=Math.ceil((envlen*8+memlen*8+hlilen*2)/pagebytes);
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
	if (st.mem.length!==0) {newmem.set(st.mem,0);}
	st.wasm.env64 =env64;
	st.wasm.envh32=envh32;
	st.wasm.envl32=envl32;
	st.mem        =newmem;
	st.wasm.oldmem=st.mem;
	env64[0]=BigInt(envlen);
	env64[1]=BigInt(memlen);
	env64[2]=BigInt(hlilen);
	env64[3]=st.mod;
	env64[4]=st.io;
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
	env64[5]=st.ip;
	if (insts<0 || insts>0x80000000) {
		env64[6]=0xffffffffffffffffn;
	} else {
		env64[6]=BigInt(insts);
	}
	module.instance.exports.run();
	st.ip=st.wasm.env64[5];
}

