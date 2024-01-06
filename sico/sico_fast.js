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
	var hlilen=0;
	for (var i=hlitable.length-1;i>=0;i--) {
		var hliobj=hlitable[i];
		var addr=Number(st.findlabel(hliobj[0]));
		if (addr<0x100000000 && hlilen<=addr) {
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
/wdxNkoFPTIAAA==
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
	//var mems=st.mem.slice();
	var module=st.wasm.module;
	var wasmmem=module.instance.exports.memory;
	var envlen=9,hlilen=st.wasm.hli16.length,memlen=st.mem.length;
	var pagebytes=65536;
	var pages=Math.ceil((envlen*8+memlen*8+hlilen*2)/pagebytes);
	console.log("resize:",(envlen*8+memlen*8+hlilen*2));
	pages-=Math.floor(wasmmem.buffer.byteLength/pagebytes);
	if (pages>0) {wasmmem.grow(pages);}
	var endian=(new Uint32Array((new BigUint64Array([4n])).buffer))[0];
	var off=0,newhli,newmem,env64,envh32,envl32;
	env64 =new BigUint64Array(wasmmem.buffer,off,envlen); off+= env64.byteLength;
	newmem=new BigUint64Array(wasmmem.buffer,off,memlen); off+=newmem.byteLength;
	newhli=new    Uint16Array(wasmmem.buffer,off,hlilen); off+=newhli.byteLength;
	envh32=new Uint32Array(env64.buffer,env64.byteOffset+  endian);
	envl32=new Uint32Array(env64.buffer,env64.byteOffset+4-endian);
	newhli.set(st.wasm.hli16);
	if (st.mem.length!==0) {newmem.set(st.mem,0,memlen);}
	//newmem.set(mems);
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
	//if (module===null) {
		// If wasm fails to load, use a backup.
	//	return;
		return SICOFastJSRun(st,insts,time);
	//}
	if (st.state!==st.RUNNING) {
		return;
	}
	if (!Object.is(st.wasm.oldmem,st.mem)) {
		SICOFastResize(st);
	}
	var env64=st.wasm.env64;
	env64[5]=st.ip;
	env64[6]=1000n;//(insts<0 || insts>0x80000000)?0xffffffffffffffffn:BigInt(insts);
	module.instance.exports.run();
	st.ip=st.wasm.env64[5];
}

