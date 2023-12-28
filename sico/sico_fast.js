/*------------------------------------------------------------------------------


sico_fast.js - v1.00

Copyright 2023 Alec Dee - MIT license - SPDX: MIT
deegen1.github.io - akdee144@gmail.com


--------------------------------------------------------------------------------
Notes


Webassembly acceleration for SICO.
SICO.run() will call SICO_fast_run() automatically if it's detected.


          Mode     |   Time
     --------------+-----------
       JS BigInt   |  2282.20
       JS Fast     |    42.40
       WASM        |    18.83
       WASM + HLI  |     0.20


--------------------------------------------------------------------------------
TODO


Abort loop if sleeping
recover sico_test.c


*/
/* jshint esversion: 11  */
/* jshint bitwise: false */
/* jshint eqeqeq: true   */
/* jshint curly: true    */


function SICO_med_run(st,insts,time) {
	// This version of run() unrolls several operations to speed things up.
	// It's 22 times faster than using bigint functions, but slower than wasm.
	if (st.state!==st.RUNNING) {return;}
	if (insts===undefined) {insts=Infinity;}
	if (time ===undefined) {time =Infinity;}
	// Performance testing.
	/*if (st.dbgtime===undefined) {
		st.dbgtime=performance.now();
		st.dbginst=0;
	}
	var dbginst=0;*/
	var big=Object.is(st.oldmem,st.mem)-1;
	var iphi=Number(st.ip>>32n),iplo=Number(st.ip&0xffffffffn);
	var memh=st.memh,meml=st.meml;
	var alloc=Number(st.alloc),alloc2=alloc-2;
	var ahi,alo,chi,clo;
	var bhi,blo,mbhi,mblo;
	var i,timeiters=0;
	while (insts>0) {
		// dbginst++;
		// Periodically check if we've run for too long.
		if (--timeiters<=0) {
			if (performance.now()>=time) {break;}
			timeiters=1024;
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
			var ip,a,b,c,ma,mb;
			ip=st.uint((BigInt(iphi)<<32n)+BigInt(iplo));
			a =st.getmem(ip++);
			b =st.getmem(ip++);
			c =st.getmem(ip++);
			ma=st.getmem(a);
			mb=st.getmem(b);
			if (ma<=mb) {ip=c;}
			st.setmem(a,ma-mb);
			if (!Object.is(st.oldmem,st.mem)) {
				st.oldmem=st.mem;
				var endian=(new Uint32Array((new BigUint64Array([4n])).buffer))[0];
				st.memh=memh=new Uint32Array(st.mem.buffer,  endian);
				st.meml=meml=new Uint32Array(st.mem.buffer,4-endian);
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
		mbhi=memh[i]-mbhi-(mblo<0);
		if (mbhi<0 || (mbhi===0 && mblo===0)) {
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
	// Performance testing.
	/*st.dbginst+=dbginst;
	if (st.state!==st.RUNNING) {
		var time=(performance.now()-st.dbgtime)/1000;
		st.print("\n-----------------------\nDebug Stats:\n\n");
		st.print("inst: "+st.dbginst+"\n");
		st.print("sec : "+time+"\n");
		st.print("rate: "+(st.dbginst/time)+"\n");
		st.dbgtime=undefined;
	}*/
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
		53546/aNmzduvnvrUD+8dePWP42O+aOpJgAA
	`;
	var gzipbytes=Uint8Array.from(atob(wasmstr),(c)=>c.codePointAt(0));
	var gzipstream=new Blob([gzipbytes]).stream();
	var decstream=gzipstream.pipeThrough(new DecompressionStream("gzip"));
	var wasmbytes=new Uint8Array(0);
	for await (var chunk of decstream) {
		var tmp=new Uint8Array(wasmbytes.byteLength+chunk.byteLength);
		tmp.set(wasmbytes,0);
		tmp.set(chunk,wasmbytes.byteLength);
		wasmbytes=tmp;
	}
	// Find high-level intercepts.
	var hlitable=[
		// 00xx - none
		// 01xx - uint
		// 02xx - int
		// 03xx - mem
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
		["image.setpixel",0x040a]
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


function SICO_fast_run(st,insts,time) {
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
	//console.log(io64[4],performance.now());
	//var t0=performance.now();
	st.wasmmod.instance.exports.run();
	//console.log(performance.now()-t0);
	st.ip=st.wasmio64[1];
}
