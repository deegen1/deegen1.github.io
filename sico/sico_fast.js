/*------------------------------------------------------------------------------


sico_fast.js - v1.05

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


     +-------+-----+-----+-----+
     | stack | env | mem | HLI |
     +-------+-----+-----+-----+


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
	var memlen=Number(sico.memlen),memlen2=memlen-2;
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
				memlen=Number(sico.memlen);
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
		env:   null,
		envl32:null,
		envh32:null,
		hli16: null,
		module:null,
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
	var memlen=st.memlen;
	var hlilen=0;
	for (var i=hlitable.length-1;i>=0;i--) {
		var hliobj=hlitable[i];
		var addr=Number(st.findlabel(hliobj[0]));
		if (addr<memlen && hlilen<=addr) {
			hlilen=addr+1;
		}
	}
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
		F+eG4IZeNgAA
	`;
	var gzipbytes=Uint8Array.from(atob(wasmstr),(c)=>c.codePointAt(0));
	var gzipstream=new Blob([gzipbytes]).stream();
	var decstream=gzipstream.pipeThrough(new DecompressionStream("gzip"));
	var decblob=await new Response(decstream).blob();
	var wasmbytes=new Uint8Array(await decblob.arrayBuffer());
	// Set up IO functions.
	function dbgprintjs(h,l) {
		var s="Debug: "+((BigInt(h>>>0)<<32n)+BigInt(l>>>0))+"\n";
		console.log(s);
		st.print(s);
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
		return Number(performance.now()>=st.timelimit);
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
	var off=module.instance.exports.getheapbase();
	var wasmmem=module.instance.exports.memory;
	var envlen=9,hlilen=st.wasm.hli16.length,memlen=st.mem.length;
	var pagebytes=65536;
	var pages=Math.ceil((off+envlen*8+memlen*8+hlilen*2)/pagebytes);
	pages-=Math.floor(wasmmem.buffer.byteLength/pagebytes);
	if (pages>0) {wasmmem.grow(pages);}
	var endian=(new Uint32Array((new BigUint64Array([4n])).buffer))[0];
	var newhli,newmem,env64,envh32,envl32;
	env64 =new BigUint64Array(wasmmem.buffer,off,envlen); off+= env64.byteLength;
	newmem=new BigUint64Array(wasmmem.buffer,off,memlen); off+=newmem.byteLength;
	newhli=new    Uint16Array(wasmmem.buffer,off,hlilen); off+=newhli.byteLength;
	envh32=new Uint32Array(env64.buffer,env64.byteOffset+  endian);
	envl32=new Uint32Array(env64.buffer,env64.byteOffset+4-endian);
	newhli.set(st.wasm.hli16);
	if (st.mem.length!==0) {newmem.set(st.mem);}
	st.wasm.env64 =env64;
	st.wasm.envh32=envh32;
	st.wasm.envl32=envl32;
	st.mem        =newmem;
	st.wasm.oldmem=st.mem;
	env64[0]=BigInt(envlen);
	env64[1]=st.memlen;
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
	if (module===null) {
		// Use a backup until the module loads.
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
	env64[6]=(insts<0 || insts>0x80000000)?0xffffffffffffffffn:BigInt(insts);
	module.instance.exports.run();
	st.ip=st.wasm.env64[5];
}

