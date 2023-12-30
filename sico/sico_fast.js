/*------------------------------------------------------------------------------


sico_fast.js - v1.01

Copyright 2023 Alec Dee - MIT license - SPDX: MIT
deegen1.github.io - akdee144@gmail.com


--------------------------------------------------------------------------------
Notes


Webassembly acceleration for SICO.
SICO.run() will call SICO_fast_run() automatically if it's detected.


          Mode     |   Time
     --------------+-----------
       JS BigInt   |  2282.20
       JS Fast     |    42.62
       WASM        |    18.83
       WASM + HLI  |     0.20


Memory layout:


     +-----+-----+----+-----+
     | env | mem | IO | HLI |
     +-----+-----+----+-----+


--------------------------------------------------------------------------------
TODO


wasm not loading in chrome
create a wasm object
reload if source changes
use envlen, memlen, iolen, hlilen
Allow sleeping
Speed up drawimage byte shifting, add another IO buffer
hlimap shrink after setting


*/
/* jshint esversion: 11  */
/* jshint bitwise: false */
/* jshint eqeqeq: true   */
/* jshint curly: true    */


function SICO_med_run(st,insts,time) {
	// This version of run() unrolls several operations to speed things up.
	// It's 53 times faster than using bigint functions, but slower than wasm.
	if (st.state!==st.RUNNING) {return;}
	if (insts===undefined) {insts=Infinity;}
	if (time ===undefined) {time =Infinity;}
	var big=Object.is(st.oldmem,st.mem)-1;
	var iphi=Number(st.ip>>32n),iplo=Number(st.ip&0xffffffffn);
	var modhi=Number(st.mod>>32n),modlo=Number(st.mod&0xffffffffn);
	var memh=st.memh,meml=st.meml;
	var alloc=Number(st.alloc),alloc2=alloc-2;
	var ahi,alo,chi,clo;
	var bhi,blo,mbhi,mblo;
	var ip,a,b,c,ma,mb,mem;
	var i,timeiters=0;
	while (insts>0) {
		// Periodically check if we've run for too long.
		if (--timeiters<=0) {
			if (performance.now()>=time) {break;}
			timeiters=2048;
		}
		if (st.sleep!==null) {
			// If sleeping for longer than the time we have, abort.
			if (st.sleep>=time) {break;}
			// If we're sleeping for more than 4ms, defer until later.
			var sleep=st.sleep-performance.now();
			if (sleep>4 && time<Infinity) {
				setTimeout(st.run.bind(st,insts,time),sleep-2);
				break;
			}
			// Busy wait.
			while (performance.now()<st.sleep) {}
			st.sleep=null;
			timeiters=0;
		}
		// Execute using bigints.
		if (big!==0) {
			big=0;
			ip=st.uint((BigInt(iphi)<<32n)+BigInt(iplo));
			a =st.getmem(ip++);
			b =st.getmem(ip++);
			c =st.getmem(ip++);
			ma=st.getmem(a);
			mb=st.getmem(b);
			if (ma<=mb) {ip=c;}
			st.setmem(a,ma-mb);
			mem=st.mem;
			if (!Object.is(st.oldmem,mem)) {
				st.oldmem=mem;
				var endian=(new Uint32Array((new BigUint64Array([4n])).buffer))[0];
				st.memh=memh=new Uint32Array(mem.buffer,mem.byteOffset+  endian);
				st.meml=meml=new Uint32Array(mem.buffer,mem.byteOffset+4-endian);
				alloc=Number(st.alloc);
				alloc2=alloc-2;
			}
			iphi=Number(ip>>32n);
			iplo=Number(ip&0xffffffffn);
			insts--;
			if (st.state!==st.RUNNING) {break;}
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
	st.ip=st.uint((BigInt(iphi)<<32n)+BigInt(iplo));
}


function SICO_fast_resize(st) {
	// wasm has its own sandboxed memory, so allocate memory in wasm and remap our
	// IO buffer and SICO memory into it. If mem.byteOffset=0, SICO's memory has been
	// reallocated.
	if (st.mem.byteOffset!==0) {return;}
	var wasm=st.wasmmod;
	var io64=st.wasmio64,lo32=st.wasmlo32,hi32=st.wasmhi32;
	var wasmmem=wasm.instance.exports.memory;
	var iolen=8,hlilen=st.wasmhli.length,memlen=st.mem.length;
	var pagebytes=65536;
	var pages=Math.ceil((iolen*8+hlilen*2+memlen*8)/pagebytes);
	pages-=Math.floor(wasmmem.buffer.byteLength/pagebytes);
	if (pages>0) {wasmmem.grow(pages);}
	var endian=(new Uint32Array((new BigUint64Array([4n])).buffer))[0];
	var off=0,newhli,newmem;
	io64  =new BigUint64Array(wasmmem.buffer,off,iolen ); off+=  io64.byteLength;
	newmem=new BigUint64Array(wasmmem.buffer,off,memlen); off+=newmem.byteLength;
	newhli=new    Uint16Array(wasmmem.buffer,off,hlilen); off+=newhli.byteLength;
	hi32  =new    Uint32Array(wasmmem.buffer,  endian,iolen*2);
	lo32  =new    Uint32Array(wasmmem.buffer,4-endian,iolen*2);
	newhli.set(st.wasmhli,0);
	newmem.set(st.mem,0);
	st.wasmio64=io64;
	st.wasmhi32=hi32;
	st.wasmlo32=lo32;
	st.wasmbuf=newmem;
	st.mem=newmem;
	io64[0]=st.mod;
	io64[2]=st.alloc;
	io64[5]=BigInt(hlilen);
	st.print("resize: "+st.alloc+"\n");
}


async function SICO_fast_init(st) {
	// sico_wasm.c -> compile -> gzip -> base64
	var wasmstr=`
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
vTt379y9Pb+nXs7fmf8HtnzRypkmAAA=
	`;
	var gzipbytes=Uint8Array.from(atob(wasmstr),(c)=>c.codePointAt(0));
	var gzipstream=new Blob([gzipbytes]).stream();
	var decstream=gzipstream.pipeThrough(new DecompressionStream("gzip"));
	var decblob=await new Response(decstream).blob();
	var wasmbytes=new Uint8Array(await decblob.arrayBuffer());
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
	st.wasmhli=hlimap;
	// Set up IO functions.
	function getmem() {
		var io64=st.wasmio64;
		io64[7]=st.getmem(io64[6]);
	}
	function setmem() {
		st.setmem(st.wasmio64[6],st.wasmio64[7]);
		SICO_fast_resize(st);
		st.wasmhi32[14]=0;
		st.wasmlo32[14]=st.state!==st.RUNNING || st.mem.byteOffset===0;
	}
	function gettime() {
		st.wasmhi32[14]=0;
		st.wasmlo32[14]=performance.now();
	}
	var imports={getmem,setmem,gettime};
	WebAssembly.instantiate(wasmbytes,{env:imports}).then(
		(mod)=>st.wasmmod=mod,
	);
}


function SICO_Fast_run(st,insts,time) {
	// On first run load the wasm module.
	if (!Object.is(st.wasmbuf,st.mem)) {
		st.wasmbuf=st.mem;
		st.wasmmod=undefined;
		SICO_fast_init(st);
	}
	if (st.state!==st.RUNNING) {
		return;
	}
	if (st.wasmmod===undefined) {
		// If wasm fails to load, use a backup.
		return SICO_med_run(st,insts,time);
	}
	SICO_fast_resize(st);
	var lo32=st.wasmlo32,hi32=st.wasmhi32;
	st.wasmio64[1]=st.ip;
	if (insts===undefined || insts<0 || insts>0x80000000) {
		hi32[6]=0;
		lo32[6]=0xffffffff;
	} else {
		hi32[6]=0;
		lo32[6]=insts;
	}
	if (time===undefined || time<0 || time>=Infinity) {
		hi32[8]=0xffffffff;
		lo32[8]=0xffffffff;
	} else {
		hi32[8]=0;
		lo32[8]=time;
	}
	st.wasmmod.instance.exports.run();
	st.ip=st.wasmio64[1];
}
	/*
class SICO_Fast {



Env:
 0 envlen (8*len)
 1 memlen (8*len)
 2 buflen (8*len)
 3 hlilen (2*len)
 4 ip
 5 mod
 6 insts
 7 time
 8 sleep
 9 IO 1
10 IO 2


	constructor(sico) {
		sico.fast=this;
		this.sico=sico;
		this.envlen=8;
		this.memlen=sico.alloc;
		this.iolen =0;
		this.hlilen=0;
		this.hlimap=Uint16Array(0);
		this.oldmem=undefined;
		this.oldsrc=undefined;
	}


	async function loadwasm() {
	}


}

function SICO_Fast_run(st,insts,time) {
	if (st.fast===undefined) {new SICO_Fast(st);}
	return st.fast.run(insts,time);
}
	*/
