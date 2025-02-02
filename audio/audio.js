/*------------------------------------------------------------------------------


audio.js - v2.04

Copyright 2024 Alec Dee - MIT license - SPDX: MIT
deegen1.github.io - akdee144@gmail.com


--------------------------------------------------------------------------------
Notes


NSynth (magenta) library
https://csounds.com/manual/html/MiscModalFreq.html
http://aspress.co.uk/sd/index.html
https://petersalomonsen.com/articles/assemblyscriptphysicalmodelingsynthesis/
assemblyscriptphysicalmodelingsynthesis.html
Supercollider patch files (.scd)


--------------------------------------------------------------------------------
History


1.07
     Changed Sound.add(offset) to add(time).
1.08
     Added Audio.update() to resume after user interaction.
2.00
     Added Audio.sequencer() to make scripting music easier.
     Premade sounds now use randomized phases to reduce aliasing.
2.01
     Changed sequencer to use piano / scientific pitch notation.
2.02
     Cleaned up Biquad.calccoefs() and sequencer parser.
2.03
     Improved the sequencer notation.
     Added default notes to instruments to make it easier to start scripting.
     Changed flat note notation from abc to AbBbCb etc.
     Added line numbers to errors.
2.04
     Simplified parsenum and parsenote.
     Attempted to extend sequencer to edit waveforms for sound effects, but it
     was too slow and inflexible.
     Retuned hi-hat, kick drum, and snare drum.


--------------------------------------------------------------------------------
TODO


capital = must be number
	{id:"con"  ,size: 1,params:"x"},
	{id:"expr" ,size: 1,params:"+-/*^<>~%"},
	{id:"tri"  ,size: 4,params:"fhlx"},
	{id:"saw"  ,size: 4,params:"fhlx"},
	{id:"sqr"  ,size: 4,params:"fhlx"},
	{id:"pulse",size: 4,params:"fhlxW"},
	{id:"sin"  ,size: 4,params:"fhlx"},
	{id:"osc"  ,size: 4,params:"fhlxP"},
	{id:"noise",size: 4,params:"hl"},
	{id:"del"  ,size: 1,params:"tM"},
	{id:"env"  ,size: 1,params:"LE"},
	{id:"bpf"  ,size:14,params:"fbg"},
	{id:"lpf"  ,size:14,params:"fbg"},

Generic oscillator, mod by largest X, don't assume it's 1
Can make an expression based oscillator by plugging saw into an expr
expressions
	separate vals, ops, stack
	reverse polish notation, operate on 2 highest in stack, return elem[0]
	separate with spaces to avoid confusion with negative numbers
	5 3 + 6 * N0 N1 + 2 ^ - = (5+3)*6-(N0+N1)^2
	N0 1 < 1 ~ > = N0 1 < -1 > = MAX(MIN(N0,1),-(1)) = CLIP(N0,1)

0: TRI FN 1 2 3 F 400
0: TRI F N1 N2 N3 400 H 0.5
0: tri f n1 n2 n3 400 h 0.5
1: ENV LIN 0.1 400 500
allow node inputs for tables
sfx.set(0,"F",200);
block
	[prev][next]
		[val f64][init f64][inputs zero term u8]
	if inputs>0
	every node has the same fields
	FREQ 0
	MAX  1
	MIN  2
node
	type
	output
	F freq
	H max, vol, gain
	L min
	X x, bandwidth
	inputs
		[dst][count][src 1][src 2]...
		[dst][count][src 1][src 2]...
		[0]
	loop through active
during first pass, set inputs to node number, then resolve to address later
Data
	W pulse width
	b0,b1,b2,a1,a2
	start
	P table
Extra
	env
	points
	width


https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Using_AudioWorklet
add sfxnode and sfxsnd
Convert drums to SFX().
Convert sound effects to SFX().
Redo strings to use time instead of decay. Add to sequencer.
https://phoboslab.org/log/2025/01/synth

Waveguides
	https://www.osar.fr/notes/waveguides/
	https://www.ee.columbia.edu/~ronw/dsp/
	Use excitation wave and comb filters. Don't add them together.
	Splitting into N bands and adding them together increases the gain by N.
	Or subtract from signal as different filters process the sample.
	https://petersalomonsen.com/articles/assemblyscriptphysicalmodelingsynthesis/assemblyscriptphysicalmodelingsynthesis.html

Audio.update
	If a song was played while silenced, skip to it's current time upon resume.
	Also remove fully played sounds.
	Taper volume up over 1 ms.
	Use click event to start audio.

Add a piano roll editor.
Convert audio.html songs to beats.
Sound effects
	Go through sound design book.
	thunder clap
Remove envelopes?


*/
/* jshint esversion: 11  */
/* jshint bitwise: false */
/* jshint eqeqeq: true   */
/* jshint curly: true    */


//---------------------------------------------------------------------------------
// Audio - v2.04


class _AudioSound {

	constructor(freq=44100,len=0) {
		// accepts len/path and frequency
		Audio.initdef();
		this.audio=Audio.def;
		this.freq=freq;
		this.queue=null;
		let type=typeof len;
		if (type==="number") {
			this.resizelen(len);
		} else if (type==="string") {
			this.loadfile(len);
		} else {
			this.resizelen(0);
		}
	}


	get(i) {
		let len=this.len;
		let data=this.data;
		if (len<2) {return len?data[0]:0;}
		if (i<0) {i=(i%len)+len;}
		else if (i>=len) {i%=len;}
		let j0=Math.floor(i);
		i-=j0;
		let j1=j0+1<len?j0+1:0;
		return data[j0]*(1-i)+data[j1]*i;
	}


	slicelen(start=0,len=Infinity) {
		start=Math.floor(start);
		if (start<0) {
			len+=start;
			start=0;
		}
		if (start>this.len) {start=this.len;}
		if (len>this.len-start) {len=this.len-start;}
		len=Math.floor(len);
		let newsnd=new Audio.Sound(this.freq,len);
		let newdata=newsnd.data;
		let data=this.data;
		for (let i=0;i<len;i++) {newdata[i]=data[start+i];}
		return newsnd;
	}


	slicetime(start=0,len=Infinity) {
		return this.slicelen(start*this.freq,len*this.freq);
	}


	copy() {return this.slicelen();}


	trim(eps=1e-4) {
		return this.trimend(eps).trimstart(eps);
	}


	trimstart(eps=1e-4) {
		let data=this.data;
		let len=this.len,pos=0;
		while (pos<len && Math.abs(data[pos])<=eps) {pos++;}
		for (let i=pos;i<len;i++) {data[i-pos]=data[i];}
		return this.resizelen(len-pos);
	}


	trimend(eps=1e-4) {
		let data=this.data;
		let len=this.len;
		while (len>0 && Math.abs(data[len-1])<=eps) {len--;}
		return this.resizelen(len);
	}


	resizelen(len) {
		// Over-allocate in case we keep modifying the sound.
		this.loaded=true;
		let olddata=this.data;
		let oldlen=olddata?olddata.length:-1;
		let newlen=(len>oldlen || 3*len<oldlen)?len*2:oldlen;
		let data=this.data;
		if (newlen!==oldlen) {
			if (newlen>0) {
				this.ctxbuf=this.audio.ctx.createBuffer(1,newlen,this.freq);
				data=this.ctxbuf.getChannelData(0);
			} else {
				this.ctxbuf=null;
				data=new Float32Array(0);
			}
			let copylen=oldlen<newlen?oldlen:newlen;
			for (let i=0;i<copylen;i++) {data[i]=olddata[i];}
		}
		let clearlen=this.len<newlen?this.len:newlen;
		this.data=data;
		for (let i=len;i<clearlen;i++) {data[i]=0;}
		this.len=len;
		this.time=len/this.freq;
		return this;
	}


	resizetime(time) {return this.resizelen(Math.round(time*this.freq));}


	loadfile(path) {
		// Load and replace the sound with a WAV file.
		this.resizelen(0);
		this.loaded=false;
		let req=new XMLHttpRequest();
		req.open("GET",path,true);
		req.responseType="arraybuffer";
		req.onload=((evt)=>{
			if (req.response) {
				let data=new Uint8Array(req.response);
				this.fromwav(data);
			}
		});
		req.send(null);
	}


	savefile(name) {
		// Save the sound to a WAV file.
		let blob=new Blob([this.towav()]);
		let link=document.createElement("a");
		link.href=window.URL.createObjectURL(blob);
		link.download=name;
		link.click();
	}


	fromwav(data,dataidx=0) {
		// Load a sound from WAV data. Can handle PCM or floating point samples.
		// Converts multi-channel to mono-channel.
		this.loaded=true;
		// Helper functions.
		function read32(i) {
			i+=dataidx;
			return ((data[i+3]<<24)|(data[i+2]<<16)|(data[i+1]<<8)|data[i])>>>0;
		}
		function read16(i) {
			i+=dataidx;
			return ((data[i+1]<<8)|data[i])>>>0;
		}
		let convu8 =new Uint8Array([1,0,0,0,0,0,0,0]);
		let convf32=new Float32Array(convu8.buffer,0);
		let convf64=new Float64Array(convu8.buffer);
		let little =(new Uint32Array(convu8.buffer))[0]===1;
		function readf32(i) {
			for (let j=0;j<4;j++) {convu8[j]=data[dataidx+i+(little?j:(3-j))];}
			return convf32[0];
		}
		function readf64(i) {
			for (let j=0;j<8;j++) {convu8[j]=data[dataidx+i+(little?j:(7-j))];}
			return convf64[0];
		}
		// Check RIFF and WAVE signatures.
		if (data.length<44 || read32(0)!==0x46464952 || read32(8)!==0x45564157) {
			return this;
		}
		let filelen=read32(4)+8;
		if (filelen>data.length) {filelen=data.length;}
		// Find the format and data blocks.
		let fmtidx=-1,fmtlen=-1;
		let datidx=-1,datlen=-1;
		for (let i=12;i+8<=filelen;) {
			let blockid=read32(i);
			let blocklen=read32(i+4)+8;
			if (blocklen<=0) {
				throw "corrupt block";
			} else if (blockid===0x20746d66) {
				fmtidx=i;
				fmtlen=blocklen;
			} else if (blockid===0x61746164) {
				datidx=i;
				datlen=blocklen;
			}
			i+=blocklen;
		}
		if (fmtlen<24 || datlen<0) {
			throw "could not find format or data blocks";
		}
		// Read the format block.
		let fmt =read16(fmtidx+ 8);
		let chan=read16(fmtidx+10);
		let freq=read32(fmtidx+12);
		let bits=read16(fmtidx+22);
		// Allow loading of PCM and float data.
		if (!(fmt===1 && bits>=8 && (bits&7)===0) && !(fmt===3 && (bits===32 || bits===64))) {
			return this;
		}
		// Parse the data block.
		let bytes=bits>>>3;
		let samples=Math.floor((datlen-8)/(chan*bytes));
		let channorm=1/chan;
		this.freq=freq;
		this.resizelen(samples);
		let snddata=this.data;
		datidx+=8+dataidx;
		if (fmt===1) {
			let mid=1<<(bits-1),offn=mid*2;
			let normp=1.0/(mid-1),normn=1.0/mid;
			datidx+=bytes-1;
			for (let s=0;s<samples;s++) {
				let nsum=0.0;
				for (let c=0;c<chan;c++) {
					let csum=0;
					for (let b=0;b<bytes;b++) {csum=csum*256+data[datidx-b];}
					nsum+=csum<mid?csum*normp:(csum-offn)*normn;
					datidx+=bytes;
				}
				snddata[s]=nsum*channorm;
			}
		} else {
			for (let s=0;s<samples;s++) {
				let nsum=0.0;
				for (let c=0;c<chan;c++) {
					if (bits===32) {nsum+=readf32(datidx);}
					if (bits===64) {nsum+=readf64(datidx);}
					datidx+=bytes;
				}
				snddata[s]=nsum*channorm;
			}
		}
		return this;
	}


	towav() {
		// Convert the sound to a 32-bit floating point WAV file.
		// Helper functions.
		function write32(i,x) {
			for (let j=0;j<4;j++) {data[i+j]=(x>>>(j*8))&255;}
		}
		function write16(i,x) {
			for (let j=0;j<2;j++) {data[i+j]=(x>>>(j*8))&255;}
		}
		let convu8 =new Uint8Array([1,0,0,0]);
		let convf32=new Float32Array(convu8.buffer,0);
		let little =(new Uint32Array(convu8.buffer))[0]===1;
		function writef32(i,x) {
			convf32[0]=x;
			for (let j=0;j<4;j++) {data[i+(little?j:(3-j))]=convu8[j];}
		}
		// Write RIFF and WAVE signatures.
		let bytes=4,bits=bytes*8,chan=1,fmt=3,freq=Math.round(this.freq);
		let sndlen=this.len,snddata=this.data;
		let data=new Uint8Array(sndlen*bytes*chan+12+24+8);
		write32(0,0x46464952);
		write32(4,data.length-8);
		write32(8,0x45564157);
		// Write format block.
		write32(12,0x20746d66);
		write32(16,16);
		write16(20,fmt);
		write16(22,chan);
		write32(24,freq);
		write32(28,freq*bytes*chan);
		write16(32,bytes*chan);
		write16(34,bits);
		// Write data block.
		write32(36,0x61746164);
		write32(40,data.length-44);
		for (let s=0;s<sndlen;s++) {
			writef32(44+s*4,snddata[s]);
		}
		return data;
	}


	play(volume,pan,freq) {
		return this.audio.play(this,volume,pan,freq);
	}


	addindex(snd,dstoff=0,vol=1.0) {
		// Add sound samples to the current sound.
		let srcoff=0,srclen=snd.len;
		if (dstoff<0) {
			srcoff=-dstoff;
			srclen+=dstoff;
		}
		if (srclen<=0) {return this;}
		if (dstoff+srclen>this.len) {
			this.resizelen(dstoff+srclen);
		}
		let dstdata=this.data;
		let srcdata=snd.data;
		// If we're adding the sound to itself, we may need to go back-to-front.
		if (dstoff<srcoff) {
			for (let i=0;i<srclen;i++) {
				dstdata[dstoff++]+=srcdata[srcoff++]*vol;
			}
		} else {
			dstoff+=srclen;
			srcoff+=srclen;
			for (let i=0;i<srclen;i++) {
				dstdata[--dstoff]+=srcdata[--srcoff]*vol;
			}
		}
		return this;
	}


	add(snd,time=0,vol=1.0) {
		return this.addindex(snd,Math.round(time*this.freq),vol);
	}


	getvol() {
		let data=this.data,len=data.length;
		let v=0,x;
		for (let i=0;i<len;i++) {
			x=Math.abs(data[i]);
			v=v<x?x:v;
		}
		return v;
	}


	scalevol(mul,normalize=false) {
		let data=this.data,len=data.length;
		if (normalize) {
			let norm=this.getvol();
			mul=norm>1e-10?mul/norm:0;
		}
		for (let i=0;i<len;i++) {data[i]*=mul;}
		return this;
	}


	scalelen(newlen) {
		let data=this.data,len=this.len;
		if (len<newlen) {
			// Stretch by linearly interpolating.
			this.resizelen(newlen);
			data=this.data;
			let sinc=len-1,dinc=newlen-1;
			let spos=len-1,dpos=newlen;
			let x0=len>0?data[spos]:0,xd=0;
			let rem=0,iden=1/dinc;
			while (dpos>0) {
				data[--dpos]=x0+xd*rem;
				rem-=sinc;
				if (rem<0) {
					rem+=dinc;
					xd=x0;
					x0=data[--spos];
					xd=(xd-x0)*iden;
				}
			}
		} else if (len>newlen) {
			// Shrink by summing and averaging.
			let rem=0,rden=1/len,sum=0,sden=newlen/len,x;
			let dpos=0,spos=0;
			while (dpos<newlen) {
				x=data[spos++];
				sum+=x;
				rem+=newlen;
				if (rem>=len) {
					rem-=len;
					x=rem>0?x*(rem*rden):0;
					data[dpos++]=sum*sden-x;
					sum=x;
				}
			}
			this.resizelen(newlen);
		}
		return this;
	}


	scaletime(newtime) {
		return this.scalelen(Math.round((newtime/this.time)*this.freq));
	}

}


class _AudioSFX {


	// Input and output arrays are null separated for ease of processing.

	// nodelink
	//  inprev, innext
	//  outprev, outnext
	//  dst

	constructor(type,params) {
		// con, expr (+-*/^tanh,min,max,clip), table, env, biquad, delay
		/*this.typestr=type;
		this.clock=-1;
		this.output=0;
		this.outarr=[];
		this.input=[];
		this.instr=[];
		this.inarr=[];
		let data={};
		let typenum=0;
		let typemap={
			"con":0,
			"+":0,"-":1,"*":2","/":3,"^":4,"min":5,"max":6,"clip":7,"tanh":8,
			"noise":0,
			"sin":0,"saw":1,"sqr":2,"pulse":3,"tri":4,"points":5
		};
		let num=typemap[type];
		if (num<1) {
			typenum=0;
			data.value=params.v??0;
			this.value=data.value;
		} else if ((num-=1)<9) {
			typenum=1;
			throw "expression";
		} else if ((num-=1)<1) {
			typenum=2;
			data.vol=params.v??1;
			data.add=params.a??0;
			data.rval=0;
			data.rinc=1;
		} else if ((num-=9)<6) {
			// table inputs: [x0, y0, x1, y1, ...]
			// x(0), x(n)=1, x(i)<=x(i+1)
			// {r (rate),v (volume), a (add),x (value),p (points),c (cycle)}
			instr=["rate","x","max","min"];
			typenum=3;
			let pt=[];
			if      (num===0) {for (let i=0;i<2048;i++) {let u=i/2047;pt+=[u,Math.sin(u*Math.PI*2)];}}
			else if (num===1) {pt=[0,-1,1,1];}
			else if (num===2) {pt=[0,1,0.5,1,0.5,-1,1,-1];}
			else if (num===3) {let c=params.c??0.5;pt=[0,1,c,1,c,-1,1,-1];}
			else if (num===4) {pt=[0,-1,0.5,1,1,-1];}
			else if (num===5) {pt=params.p.slice();}
			data.points=pt;
			data.x=((params.x??0)%1+1)%1;
			data.rate=params.r??0;
			data.vol=params.v??1;
			data.add=params.a??0;
			let tbl=[0]*(Math.floor(pt.length/2)*3);
			for (let i=2,j=0;i<pt.length;i+=2,j+=3) {
				let x=pt[i],y=pt[i+1],dx=x-pt[i-2],dy=y-pt[i-1];
				tbl[j]=x;tbl[j+1]=dy/dx;tbl[j+2]=y1-x1*tbl[j+1];
			}
			tbl[tbl.length-3]=Infinity;
			data.tbl=tbl;
			let start=[0]*2048;
			for (let i=0,j=0;i<2048;i++) {
				while (i/2047>=tbl[j]) {j+=3};
				start[i]=j;
			}
			data.start=start;
		}
		this.data=data;
		this.typenum=typenum;*/
	}


	/*disconnect(dst,dstnum) {
		let src=this;
		let inarr=dst.inarr,inlen=inarr.length,i=0;
		while (i<inlen && dstnum>=0) {
			let n=inarr[i++];
			if (dstnum) {dstnum-=n===null;}
			else if (Object.is(n,src)) {break;}
		}
		if (!dstnum) {
			while (i<inlen) {inarr[i-1]=inarr[i];i++;}
			dst.inarr=inarr.slice(0,inlen-1);
		}
	}*/


	connect(dst,dstnum) {
		let src=this;
		src.outarr.push(dst);
		let inarr=dst.inarr,inlen=inarr.length,i=0;
		while (i<inlen && dstnum>0) {
			let n=inarr[i++];
			dstnum-=n===null;
		}
		dst.inarr=inarr.slice(0,i)+[src]+inarr.slice(i);
	}


	reset() {
	}


	next(x,clock) {
		if (clock===undefined) {clock=this.clock+1;}
		if (clock<=this.clock) {return this.value;}
		this.clock=clock;
		// Loop through any inputs we have.
		let input=this.input;
		let data=this.data;
		let inarr=this.inarr;
		let dpos=0,dval=0,inlen=inarr.length;
		for (let i=0;i<inlen;i++) {
			let n=inarr[i];
			if (n===null) {
				dval=0;
				dpos++;
			} else {
				dval+=n.next(undefined,clock);
				input[dpos]=dval;
			}
		}
		let type=this.typenum;
		let val=0;
		if (type===0) {
			val=data.value;
		} else if (type===1) {
			// Expression
		} else if (type===2) {
			// Noise
			let h=data.rval;
			data.rval=(h+data.rinc)>>>0;
			h=Math.imul(h^(h>>>16),0xf8b7629f);
			h=Math.imul(h^(h>>> 8),0xcbc5c2b5);
			h=Math.imul(h^(h>>>24),0xf5a5bda5)>>>0;
			val=h*(2.0/4294967295.0)-1;
			val=val*data.vol+data.add;
		} else if (type===3) {
			// Oscillator
			let x=data.x%1.0;
			x=x>0?x:(x+1);x=x>0?x:0;
			data.x=x+data.rate;
			let tbl=data.tbl,start=data.start;
			let i=start[Math.floor(x*start.length)];
			while (x>=tbl[i]) {i+=3;}
			val=x*tbl[i+1]+tbl[i+2];
			val=val*data.vol+data.add;
		} else if (type===4) {
			// Envelope
		} else if (type===5) {
			// Biquad
		} else if (type===6) {
			// Delay
		}
		this.value=val;
	}


	fill(snd) {
		let data=snd.data;
		let len=snd.len;
		this.reset();
		for (let i=0;i<len;i++) {data[i]=this.next();}
	}

}


class _AudioInstance {

	constructor(snd,vol=1.0,pan=0.0,freq=null) {
		let audio=snd.audio;
		// Audio player link
		this.audprev=null;
		this.audnext=audio.queue;
		audio.queue =this;
		// Sound link
		this.snd    =snd;
		this.sndprev=null;
		this.sndnext=snd.queue;
		snd.queue   =this;
		// Misc
		this.rate   =1.0;
		this.playing=false;
		this.done   =false;
		// src -> gain -> pan -> ctx
		let ctx=audio.ctx;
		this.ctx=ctx;
		this.ctxpan=ctx.createStereoPanner();
		this.setpan(pan);
		this.ctxpan.connect(ctx.destination);
		this.ctxgain=ctx.createGain();
		this.setvolume(vol);
		this.ctxgain.connect(this.ctxpan);
		let ctxsrc=ctx.createBufferSource();
		this.ctxsrc=ctxsrc;
		ctxsrc.addEventListener("ended",()=>{this.remove();});
		ctxsrc.buffer=snd.ctxbuf;
		ctxsrc.connect(this.ctxgain);
		if (snd.ctxbuf) {
			ctxsrc.start(0,0,snd.time);
			this.playing=true;
		}
	}


	remove() {
		if (this.done) {return;}
		this.done=true;
		this.playing=false;
		let audio=this.snd.audio;
		let audprev=this.audprev;
		let audnext=this.audnext;
		if (audprev===null) {
			audio.queue=audnext;
		} else {
			audprev.audnext=audnext;
			this.audprev=null;
		}
		if (audnext!==null) {
			audnext.audprev=audprev;
			this.audnext=null;
		}
		// this.audio=null;
		let sndprev=this.sndprev;
		let sndnext=this.sndnext;
		if (sndprev===null) {
			this.snd.queue=sndnext;
		} else {
			sndprev.sndnext=sndnext;
			this.sndprev=null;
		}
		if (sndnext!==null) {
			sndnext.sndprev=sndprev;
			this.sndnext=null;
		}
		// this.snd=null;
		this.ctxsrc.disconnect();
		this.ctxgain.disconnect();
		this.ctxpan.disconnect();
	}


	stop() {
		if (!this.done) {
			this.playing=false;
			this.ctxsrc.stop();
		}
	}


	start() {
		if (!this.done) {
			this.playing=true;
			this.ctxsrc.start();
		}
	}


	setpan(pan) {
		// -1: 100% left channel
		//  0: 100% both channels
		// +1: 100% right channel
		if (pan<-1) {pan=-1;}
		else if (pan>1) {pan=1;}
		else if (isNaN(pan)) {pan=0;}
		this.pan=pan;
		if (!this.done) {
			this.ctxpan.pan.setValueAtTime(this.pan,this.ctx.currentTime);
		}
	}


	setvolume(vol) {
		if (isNaN(vol)) {vol=1;}
		this.volume=vol;
		if (!this.done) {
			this.ctxgain.gain.setValueAtTime(this.volume,this.ctx.currentTime);
		}
	}

}


class _AudioDelay {
	// Delay filter with linear interpolation.

	constructor(rate,delay) {
		this.rate=rate;
		this.delay=delay;
		this.pos=0;
		this.len=Math.floor(rate*delay)+2;
		this.data=new Float32Array(this.len);
	}


	add(x) {
		if (++this.pos>=this.len) {this.pos=0;}
		this.data[this.pos]=x;
	}


	get(delay) {
		if (delay===undefined) {
			delay=this.delay;
		} else if (delay<0 || delay>this.delay) {
			throw `Delay too large ${delay} > ${this.delay}`;
		}
		delay*=this.rate;
		let i=Math.floor(delay);
		let f=delay-i;
		let len=this.len,data=this.data;
		i=this.pos-i;
		if (i<0) {i+=len;}
		let j=i-1;
		if (j<0) {j+=len;}
		return data[i]*(1-f)+data[j]*f;
	}


	process(x) {
		this.add(x);
		return this.get();
	}

}


class _AudioEnvelope {
	// Envelope/gain filter.

	static CON=0;
	static LIN=1;
	static EXP=2;


	constructor(arr=null,eps=0.001) {
		// [ type, time, target, type, time, target, ... ]
		// type = con, lin, exp
		this.last=null;
		this.stop=0;
		this.eps=eps;
		this.envarr=[];
		for (let i=0;arr && i<arr.length;i+=3) {
			this.add(arr[i],arr[i+1],arr[i+2]);
		}
	}


	add(type,time,target) {
		if (time<0 || isNaN(time)) {
			throw "envelope invalid time: "+time.toString();
		}
		let envarr=this.envarr;
		let prev=envarr.length>0?envarr[envarr.length-1]:null;
		let prevtar=prev?prev.target:0;
		let prevstop=prev?prev.stop:0;
		let env={};
		env.start=prevstop;
		env.stop=prevstop+time;
		env.type=type;
		if (type===_AudioEnvelope.CON || time<=0) {
			env.mul=0;
			env.con=target;
		} else if (type===_AudioEnvelope.LIN) {
			env.mul=(target-prevtar)/time;
			env.con=prevtar-env.mul*prevstop;
		} else if (type===_AudioEnvelope.EXP) {
			// Scale the exponential by 1/(1-eps) to reach our target values.
			let leps=Math.log(this.eps);
			let expmul=(target-prevtar)/(1-this.eps);
			if (expmul<0) {
				env.mul=leps/time;
				env.con=Math.log(-expmul)-env.mul*prevstop;
				env.expcon=prevtar+expmul;
			} else {
				env.mul=-leps/time;
				env.con=Math.log(expmul)+leps-env.mul*prevstop;
				env.expcon=target-expmul;
			}
		} else {
			throw "envelope type not recognized: "+type;
		}
		env.target=target;
		envarr.push(env);
		this.stop=env.stop;
		return this;
	}


	get(time) {
		let env=this.last;
		// If we're in a new time segment.
		if (env===null || time<env.start || time>=env.stop) {
			env=null;
			if (time>=0 && time<this.stop) {
				let envarr=this.envarr;
				let i=0,len=envarr.length;
				while (i<len && time>=envarr[i].stop) {i++;}
				env=i<len?envarr[i]:null;
			}
			this.last=env;
			if (env===null) {return 0;}
		}
		let u=time*env.mul+env.con;
		if (env.type!==_AudioEnvelope.EXP) {return u;}
		else {return Math.exp(u)+env.expcon;}
	}

}


class _AudioBiquad {
	// Biquad filter type 1
	// https://shepazu.github.io/Audio-EQ-Cookbook/audio-eq-cookbook.html
	// lingain(db)  = exp(db/(ln(10)*40))
	// bandwidth(Q) = sinh^-1(0.5/Q)*2/ln(2)

	static NONE     =0;
	static LOWPASS  =1;
	static HIGHPASS =2;
	static BANDPASS =3;
	static NOTCH    =4;
	static ALLPASS  =5;
	static PEAK     =6;
	static LOWSHELF =7;
	static HIGHSHELF=8;


	constructor(type,rate,bandwidth=1,lingain=1) {
		// Bandwidth in kHz.
		// rate = freq / sample rate
		// Gain is applied to input signal.
		this.type=type;
		this.rate=rate;
		this.gain=lingain;
		this.bandwidth=bandwidth;
		this.clear();
		this.calccoefs();
	}


	clear() {
		this.x1=0;
		this.x2=0;
		this.y1=0;
		this.y2=0;
	}


	process(x) {
		let y=this.b0*x+this.b1*this.x1+this.b2*this.x2
		               -this.a1*this.y1-this.a2*this.y2;
		if (!(y>-Infinity && y<Infinity)) {y=0;}
		this.x2=this.x1;
		this.x1=x;
		this.y2=this.y1;
		this.y1=y;
		return y;
	}


	prev() {return this.y1;}


	response(rate) {
		// Return the magnitude,phase response to a given frequency.
		// rate = freq / sample rate
		let w=Math.PI*2*rate;
		let cos1=Math.cos(-w),cos2=Math.cos(-2*w);
		let sin1=Math.sin(-w),sin2=Math.sin(-2*w);
		let realzero=this.b1*cos1+this.b2*cos2+this.b0;
		let imagzero=this.b1*sin1+this.b2*sin2;
		let realpole=this.a1*cos1+this.a2*cos2+1;
		let imagpole=this.a1*sin1+this.a2*sin2;
		let den=realpole*realpole+imagpole*imagpole;
		let realw=(realzero*realpole+imagzero*imagpole)/den;
		let imagw=(imagzero*realpole-realzero*imagpole)/den;
		let mag=Math.sqrt(realw*realw+imagw*imagw);
		let phase=-Math.atan2(imagw,realw)/rate;
		return [mag,phase];
	}


	updatecoefs(type,rate,bandwidth=1,lingain=1) {
		if (this.type!==type || this.rate!==rate || this.bandwidth!==bandwidth || this.gain!==lingain) {
			this.type=type;
			this.rate=rate;
			this.gain=lingain;
			this.bandwidth=bandwidth;
			this.calccoefs();
		}
	}


	calccoefs() {
		let b0=1,b1=0,b2=0;
		let a0=1,a1=0,a2=0;
		let v  =this.gain;
		let ang=2*Math.PI*this.rate;
		let sn =Math.sin(ang);
		let cs =Math.cos(ang);
		let q  =0.5/Math.sinh(Math.log(2)*0.5*this.bandwidth*ang/sn);
		let a  =sn/(2*q);
		let vr =2*Math.sqrt(v)*a;
		let type=this.type;
		if (type===_AudioBiquad.NONE) {
		} else if (type===_AudioBiquad.LOWPASS) {
			b1=(1-cs)*v;
			b2=0.5*b1*v;
			b0=b2;
			a0=1+a;
			a1=-2*cs;
			a2=1-a;
		} else if (type===_AudioBiquad.HIGHPASS) {
			b1=(-1-cs)*v;
			b2=-0.5*b1*v;
			b0=b2;
			a0=1+a;
			a1=-2*cs;
			a2=1-a;
		} else if (type===_AudioBiquad.BANDPASS) {
			b1=0;
			b2=-a*v;
			b0=-b2;
			a0=1+a;
			a1=-2*cs;
			a2=1-a;
		} else if (type===_AudioBiquad.NOTCH) {
			b1=-2*cs*v;
			b2=v;
			b0=v;
			a0=1+a;
			a1=-2*cs;
			a2=1-a;
		} else if (type===_AudioBiquad.ALLPASS) {
			b1=-2*cs*v;
			b2=(1+a)*v;
			b0=(1-a)*v;
			a0=b2;
			a1=b1;
			a2=1-a;
		} else if (type===_AudioBiquad.PEAK) {
			b0=1+a*v;
			b1=-2*cs;
			b2=1-a*v;
			a0=1+a/v;
			a1=-2*cs;
			a2=1-a/v;
		} else if (type===_AudioBiquad.LOWSHELF) {
			b0=v*((v+1)-(v-1)*cs+vr);
			b1=2*v*((v-1)-(v+1)*cs);
			b2=v*((v+1)-(v-1)*cs-vr);
			a0=(v+1)+(v-1)*cs+vr;
			a1=-2*((v-1)+(v+1)*cs);
			a2=(v+1)+(v-1)*cs-vr;
		} else if (type===_AudioBiquad.HIGHSHELF) {
			b0=v*((v+1)+(v-1)*cs+vr);
			b1=-2*v*((v-1)+(v+1)*cs);
			b2=v*((v+1)+(v-1)*cs-vr);
			a0=(v+1)-(v-1)*cs+vr;
			a1=2*((v-1)-(v+1)*cs);
			a2=(v+1)-(v-1)*cs-vr;
		} else {
			throw "Biquad type not recognized: "+type;
		}
		this.a1=a1/a0;
		this.a2=a2/a0;
		this.b0=b0/a0;
		this.b1=b1/a0;
		this.b2=b2/a0;
	}

}


class Audio {

	static Sound    =_AudioSound;
	static Instance =_AudioInstance;
	static Delay    =_AudioDelay;
	static Envelope =_AudioEnvelope;
	static Biquad   =_AudioBiquad;

	// The default context used for audio functions.
	static def=null;
	static randacc=0;
	static randinc=0;


	constructor(freq=44100) {
		let con=this.constructor;
		Object.assign(this,con);
		if (con.def===null) {con.def=this;}
		this.freq=freq;
		this.queue=null;
		let ctx=new AudioContext({latencyHint:"interactive",sampleRate:freq});
		this.ctx=ctx;
		if (!Audio.def) {Audio.initdef(this).wakeup();}
	}


	static initdef(def) {
		if (!def) {def=Audio.def;}
		if (!def) {def=new Audio();}
		Audio.def=def;
		if (!Audio.randinc) {
			Audio.randinc=1;
			Audio.randacc=performance.timeOrigin+performance.now();
			Audio.randinc=((Audio.noise1()*0xffffffff)|1)>>>0;
			Audio.randacc=(Audio.noise1()*0xffffffff)>>>0;
		}
		return def;
	}


	play(snd,volume,pan,freq) {
		return new _AudioInstance(snd,volume,pan,freq);
	}


	update() {
		// Audio is silenced until a sound is played after user interaction.
		if (!this.ctx.currentTime) {
			this.ctx.resume();
		}
	}


	// ----------------------------------------
	// Oscillators
	// All input domains are wrapped to [0,1).
	// NaN and infinite values return the minimum value.


	static saw(x) {
		//   /|  /|  /|
		//  / | / | / |
		// /  |/  |/  |
		x%=1.0;
		x=x<0?1+x:x;
		return x>=0?x*2-1:-1;
	}


	static sin(x) {
		x%=1.0;
		return x>=-1?Math.sin(x*6.2831853071795864769252866):-1;
	}


	static tri(x) {
		//   /\    /\    /
		//  /  \  /  \  /
		// /    \/    \/
		x%=1.0;
		x=x<0.0?1+x:x;
		x=x>0.5?1-x:x;
		return x>=0?x*4-1:-1;
	}


	static sqr(x) {
		//    __    __
		//   |  |  |  |
		//   |  |  |  |
		// __|  |__|  |__
		x%=1.0;
		x=x<0?1+x:x;
		return x>=0?(x>0.5?1:-1):-1;
	}


	static noise1(x) {
		// Noise with interpolation. If undefined, acts as a PRNG.
		// Returns a value in [0,1].
		if (x===undefined) {
			x=Audio.randacc;
			Audio.randacc=(x+Audio.randinc)>>>0;
		}
		let v=x%1;
		if (v<0) {v+=1;}
		else if (isNaN(v)) {v=0;x=0;}
		let u0=(Math.floor(x)>>>0)+0x66daacfd,u1=u0+1;
		u0=Math.imul(u0^(u0>>>16),0xf8b7629f);
		u0=Math.imul(u0^(u0>>> 8),0xcbc5c2b5);
		u0=Math.imul(u0^(u0>>>24),0xf5a5bda5)>>>0;
		u1=Math.imul(u1^(u1>>>16),0xf8b7629f);
		u1=Math.imul(u1^(u1>>> 8),0xcbc5c2b5);
		u1=Math.imul(u1^(u1>>>24),0xf5a5bda5)>>>0;
		return (u0+(u1-u0)*v)*(1.0/4294967295.0);
	}


	static noise(x) {
		return Audio.noise1(x)*2-1;
	}


	static clip(x,min,max) {
		// Same as clamping.
		if (min>max) {
			let tmp=min;
			min=max;
			max=tmp;
		}
		if (x>=max) {return max;}
		return x>=min?x:min;
	}


	static wrap(x,min,max) {
		if (min>max) {
			let tmp=min;
			min=max;
			max=tmp;
		}
		// Prevent floating point drift for successive calls.
		if (x>=min && x<=max) {return x;}
		max-=min;
		x=(x-min)%max;
		if (x<0) {x+=max;}
		return x>=0?x+min:min;
	}


	// ----------------------------------------
	// Sequencer


	static sequencer(seq) {
		// Converts a shorthand script into music.
		// Note format: [CDEFGAB][#b][octave]. Ex: A4  B#12  C-1.2
		//
		//  Symbol |             Description             |         Parameters
		// --------+-------------------------------------+----------------------------
		//   ,     | Separate and advance time by 1 BPM. |
		//   , X   | Separate and advance time by X BPM. |
		//   '     | Line Comment.                       |
		//   "     | Block comment. Terminate with "     |
		//   bass: | Define a sequence named bass.       |
		//   bass  | Reference a sequence named bass.    | [vol=1]
		//   OUT:  | Final output sequence.              |
		//   BPM   | Beats per minute.                   | [240]
		//   VOL   | Sets volume. Resets every sequence. | [1.0]
		//   CUT   | Cuts off sequence at time+delta.    | [delta=0]
		//   AG    | Acoustic Guitar                     | [note=A3] [vol=1] [len=4]
		//   XY    | Xylophone                           | [note=C4] [vol=1] [len=2]
		//   MR    | Marimba                             | [note=C4] [vol=1] [len=2]
		//   GS    | Glockenspiel                        | [note=A6] [vol=1] [len=1]
		//   HH    | Hi-hat                              | [note=A8] [vol=1] [len=.1]
		//   KD    | Kick Drum                           | [note=B2] [vol=1] [len=.2]
		//   SD    | Snare Drum                          | [note=G3] [vol=1] [len=.2]
		//
		let seqpos=0,seqlen=seq.length,sndfreq=44100;
		let bpm=240,time=0,subvol=1,sepdelta=0;
		let argmax=7,args=0;
		let argstr=new Array(argmax);
		for (let i=0;i<argmax;i++) {argstr[i]="";}
		let subsnd=null,nextsnd=subsnd;
		let rand=[Audio.randacc,Audio.randinc];
		[Audio.randacc,Audio.randinc]=[0,0xcadffab1];
		// ,:'"
		let stoptoken={44:true,58:true,39:true,34:true};
		let sequences={
			"BPM": 1,"VOL": 2,"CUT": 3,
			"AG": 10,
			"XY": 11,"MR": 12,"GS": 13,
			"HH": 14,"KD": 15,"SD": 16
		};
		function error(msg) {
			[Audio.randacc,Audio.randinc]=rand;
			let line=1;
			for (let i=0;i<seqpos;i++) {line+=seq.charCodeAt(i)===10;}
			let argsum=argstr.slice(0,args).join(" ");
			throw "Sequencer error:\n\tError: "+msg+"\n\tLine : "+line+"\n\targs : "+argsum;
		}
		function parsenum(str,def=NaN,name="") {
			// Parse numbers in format: [+-]\d*(\.\d*)?
			if (!str && !isNaN(def)) {return def;}
			let len=str.length,i=0,d=0;
			let c=i<len?str.charCodeAt(i):0;
			let neg=c===45;
			if (c===45 || c===43) {i++;}
			let num=0,den=1;
			while (i<len && (c=str.charCodeAt(i)-48)>=0 && c<=9) {d=1;i++;num=num*10+c;}
			if (c===-2) {i++;}
			while (i<len && (c=str.charCodeAt(i)-48)>=0 && c<=9) {d=1;i++;den*=0.1;num+=c*den;}
			if (i===len && d) {return neg?-num:num;}
			if (name) {error("invalid "+name);}
			return NaN;
		}
		function parsenote(str,def,name) {
			// Convert a piano note to a frequency. Ex: A4 = 440hz
			// Format: sign + BAGFEDC + #b + octave.
			if (!str) {str=def;}
			let val=parsenum(str);
			if (!isNaN(val)) {return val;}
			let slen=str.length,i=0;
			let c=i<slen?str.charCodeAt(i):0;
			let mag=c===45?-440:440;
			if (c===45 || c===43) {i++;}
			c=(i<slen?str.charCodeAt(i++):0)-65;
			if (c<0 || c>6) {error("invalid "+name);}
			let n=[48,46,57,55,53,52,50][c];
			c=i<slen?str.charCodeAt(i):0;
			if (c===35 || c===98) {n+=c===98?1:-1;i++;}
			let oct=parsenum(str.substring(i),NaN,name);
			return mag*Math.pow(2,-n/12+oct);
		}
		while (seqpos<seqlen || args>0) {
			// We've changed sequences.
			if (!Object.is(subsnd,nextsnd)) {
				subsnd=nextsnd;
				subvol=1;
				time=0;
				sepdelta=0;
			}
			// Read through whitespace and comments.
			let c=0;
			while (seqpos<seqlen && (c=seq.charCodeAt(seqpos))<33) {seqpos++;}
			if (c===39 || c===34) {
				// If " stop at ". If ' stop at \n.
				let eoc=c===34?34:10;
				while (seqpos<seqlen && seq.charCodeAt(++seqpos)!==eoc) {}
				seqpos++;
				continue;
			}
			c=seqpos<seqlen?seq[seqpos]:"";
			if (c===",") {
				seqpos++;
			} else if (c===":") {
				// Sequence definition.
				seqpos++;
				if (!args) {error("Invalid label");}
				let name=argstr[--args];
				argstr[args]="";
				if (!name || sequences[name]) {error("'"+name+"' already defined");}
				nextsnd=new Audio.Sound(sndfreq);
				sequences[name]=nextsnd;
			} else if (seqpos<seqlen) {
				// Read the next token.
				if (args>=argmax) {error("Too many arguments");}
				let start=seqpos;
				while (seqpos<seqlen && (c=seq.charCodeAt(seqpos))>32 && !stoptoken[c]) {seqpos++;}
				argstr[args++]=seq.substring(start,seqpos);
				continue;
			}
			// Parse current tokens. Check for a time delta.
			let a=0;
			let delta=parsenum(argstr[a++]);
			if (isNaN(delta)) {delta=sepdelta;a--;}
			if (bpm) {sepdelta=1;time+=delta*60/bpm;}
			else {sepdelta=0;time+=delta;}
			time=time>0?time:0;
			if (a>=args) {continue;}
			// Find the instrument or sequence to play.
			let inst=sequences[argstr[a++]];
			if (inst===undefined) {error("Unrecognized instrument");}
			let type=isNaN(inst)?0:inst;
			let snd=null,vol=1;
			if (type===0) {
				vol=parsenum(argstr[a],1,"volume");
				snd=inst;
			} else if (type===1) {
				bpm=parsenum(argstr[a],240,"BPM");
			} else if (type===2) {
				subvol=parsenum(argstr[a],1,"volume");
			} else if (type===3) {
				time+=parsenum(argstr[a],0,"delta");
				time=time>0?time:0;
				if (subsnd) {subsnd.resizetime(time);}
			} else {
				// Instruments
				type-=10;
				let note=["A3","C4","C4","A6","A8","B2","G3"][type];
				let len=[4,2,2,1,0.1,0.2,0.2][type];
				let freq=parsenote(argstr[a++],note,"note or frequency");
				vol=parsenum(argstr[a++],1,"volume");
				len=parsenum(argstr[a],len,"length");
				if      (type===0) {snd=Audio.createguitar(1,freq,0.2);}
				else if (type===1) {snd=Audio.createxylophone(1,freq);}
				else if (type===2) {snd=Audio.createmarimba(1,freq);}
				else if (type===3) {snd=Audio.createglockenspiel(1,freq);}
				else if (type===4) {snd=Audio.createdrumhihat(1,freq,len);}
				else if (type===5) {snd=Audio.createdrumkick(1,freq,len);}
				else if (type===6) {snd=Audio.createdrumsnare(1,freq,len);}
			}
			// Add the new sound to the sub sequence.
			if (!snd) {sepdelta=0;}
			else if (subsnd) {subsnd.add(snd,time,subvol*vol);}
			while (args>0) {argstr[--args]="";}
		}
		[Audio.randacc,Audio.randinc]=rand;
		subsnd=sequences["OUT"];
		if (!subsnd) {throw "OUT not defined";}
		return subsnd;
	}


	// ----------------------------------------
	// String Instruments


	static generatestring(volume=1.0,freq=200,pos=0.5,inharm=0.00006,decay=1.2,sndfreq=44100) {
		// Jason Pelc
		// http://large.stanford.edu/courses/2007/ph210/pelc2/
		// Stop when e^(-decay*time/sndfreq)<=cutoff
		const cutoff=1e-3;
		decay/=sndfreq;
		freq/=sndfreq;
		let harmonics=Math.ceil(0.5/freq);
		let sndlen=Math.ceil(-Math.log(cutoff)/decay);
		let snd=new Audio.Sound(sndfreq,sndlen);
		let data=snd.data;
		// Generate coefficients.
		if (pos<0.0001) {pos=0.0001;}
		if (pos>0.9999) {pos=0.9999;}
		let listen=pos; // 0.16;
		let c0=listen*Math.PI;
		let c1=(2*volume)/(Math.PI*Math.PI*pos*(1-pos));
		let c2=freq*Math.PI*2;
		// Process highest to lowest for floating point accuracy.
		for (let n=harmonics;n>0;n--) {
			// Calculate coefficients for the n'th harmonic.
			let n2=n*n;
			let harmvol=Math.sin(n*c0)*c1/n2;
			if (Math.abs(harmvol)<=cutoff) {continue;}
			// Correct n2 by -1 so the fundamental = freq.
			let ihscale=n*Math.sqrt(1+(n2-1)*inharm);
			let harmdecay=-decay*ihscale;
			let harmmul=Math.exp(harmdecay);
			let harmlen=Math.ceil(Math.log(cutoff/Math.abs(harmvol))/harmdecay);
			if (harmlen>sndlen) {harmlen=sndlen;}
			// Randomize the phase to prevent aliasing.
			let harmfreq=c2*ihscale;
			let harmphase=Audio.noise()*3.141592654;
			// Generate the waveform.
			for (let i=0;i<harmlen;i++) {
				data[i]+=harmvol*Math.sin(harmphase);
				harmvol*=harmmul;
				harmphase+=harmfreq;
			}
		}
		// Taper the ends.
		let head=Math.ceil(0.010*sndfreq);
		for (let i=0;i<head && i<sndlen;i++) {data[i]*=i/head;}
		let tail=Math.ceil(0.005*sndfreq);
		for (let i=0;i<tail && i<sndlen;i++) {data[sndlen-1-i]*=i/tail;}
		return snd;
	}


	static createguitar(volume=1.0,freq=200,pluck=0.5,sndfreq=44100) {
		return Audio.generatestring(volume,freq,pluck,0.000050,1.2,sndfreq);
	}


	static createxylophone(volume=1.0,freq=250,pos=0.5,sndfreq=44100) {
		// freq = constant / length^2
		return Audio.generatestring(volume,freq,pos,0.374520,3.2,sndfreq);
	}


	static createmarimba(volume=1.0,freq=250,pos=0.5,sndfreq=44100) {
		return Audio.generatestring(volume,freq,pos,0.947200,3.2,sndfreq);
	}


	static createglockenspiel(volume=0.2,freq=1867,pos=0.5,sndfreq=44100) {
		return Audio.generatestring(volume,freq,pos,0.090000,1.3,sndfreq);
	}


	static createmusicbox(volume=0.1,freq=877,sndfreq=44100) {
		return Audio.generatestring(volume,freq,0.40,0.050000,2.3,sndfreq);
	}


	// ----------------------------------------
	// Percussion Instruments


	static createdrumhihat(volume=1.0,freq=7000,time=0.1,sndfreq=44100) {
		let len=Math.ceil(time*sndfreq);
		let snd=new Audio.Sound(sndfreq,len);
		let gain=new Audio.Envelope([Audio.Envelope.LIN,0.005,volume*0.7,Audio.Envelope.EXP,time-0.005,0]);
		let hp=new Audio.Biquad(Audio.Biquad.HIGHPASS,freq/sndfreq);
		let bp=new Audio.Biquad(Audio.Biquad.BANDPASS,freq*1.4/sndfreq);
		let data=snd.data;
		for (let i=0;i<len;i++) {
			let t=i/sndfreq,u=(1-0.2*i/len)*freq/sndfreq;
			let x=Audio.noise();
			hp.updatecoefs(Audio.Biquad.HIGHPASS,u);
			bp.updatecoefs(Audio.Biquad.BANDPASS,u*1.4);
			x=bp.process(x)+hp.process(x);
			data[i]=x*gain.get(t);
		}
		return snd;
	}


	static createdrumkick(volume=1.0,freq=120,time=0.2,sndfreq=44100) {
		let len=Math.ceil(time*sndfreq);
		let snd=new Audio.Sound(sndfreq,len);
		let gain=new Audio.Envelope([Audio.Envelope.LIN,0.005,volume*2,Audio.Envelope.EXP,time-0.005,0]);
		let lp=new Audio.Biquad(Audio.Biquad.LOWPASS,freq/sndfreq);
		let data=snd.data;
		let f=0;
		for (let i=0;i<len;i++) {
			let t=i/sndfreq,u=(1-0.75*i/len)*freq/sndfreq;
			f+=u;
			let x=Audio.noise()+Audio.tri(f)*0.8;
			lp.updatecoefs(Audio.Biquad.LOWPASS,u,1.75);
			x=lp.process(x);
			data[i]=x*gain.get(t);
		}
		return snd;
	}


	static createdrumsnare(volume=1.0,freq=200,time=0.2,sndfreq=44100) {
		let len=Math.ceil(time*sndfreq);
		let snd=new Audio.Sound(sndfreq,len);
		let gain=new Audio.Envelope([Audio.Envelope.LIN,0.005,volume,Audio.Envelope.EXP,time-0.005,0]);
		let lp=new Audio.Biquad(Audio.Biquad.LOWPASS,10000/sndfreq);
		let hp=new Audio.Biquad(Audio.Biquad.HIGHPASS,freq/sndfreq);
		let data=snd.data;
		let f=0;
		for (let i=0;i<len;i++) {
			let t=i/sndfreq,u=(1-0.5*i/len)*freq/sndfreq;
			f+=u;
			let x=Audio.noise()+Audio.tri(f*0.5)*0.8;
			hp.updatecoefs(Audio.Biquad.HIGHPASS,u);
			x=hp.process(x);
			x=lp.process(x);
			data[i]=x*gain.get(t);
		}
		return snd;
	}


	// ----------------------------------------
	// Wind Instruments


	static createflute(volume=1.0,freq=200) {
		let sndfreq=44100,len=sndfreq*2;
		let snd=new Audio.Sound(sndfreq,len);
		// let voldecay=Math.log(1e-4)/4;
		let data=snd.data;
		let filter=new Audio.Biquad(Audio.Biquad.LOWPASS,freq/sndfreq,2);
		let delay=new Audio.Delay(sndfreq,1/freq),delaygain=-0.95;
		for (let i=0;i<len;i++) {
			let t=i/sndfreq;
			// let mul=Math.exp(voldecay*t);
			let x=t<0.5?Audio.noise(i):0;
			x=filter.process(x)+delay.get()*delaygain;
			delay.add(x);
			data[i]=x;
		}
		snd.scalevol(volume,true);
		return snd;
	}


	static createtuba(volume=1.0,freq=300) {
		let sndfreq=44100,len=sndfreq*3;
		let snd=new Audio.Sound(sndfreq,len);
		let voldecay=Math.log(1e-4)/3;
		let data=snd.data;
		let filter=new Audio.Biquad(Audio.Biquad.LOWPASS,freq/sndfreq,1);
		let delay=new Audio.Delay(sndfreq,0.02),delaygain=0.95;
		for (let i=0;i<len;i++) {
			let t=i/sndfreq;
			let mul=Math.exp(voldecay*t);
			let x=filter.process(Audio.noise(i))*mul;
			x+=delay.get()*delaygain;
			delay.add(x);
			data[i]=x;
		}
		snd.scalevol(volume,true);
		return snd;
	}


	// ----------------------------------------
	// Sound Effects


	/*static sfxlib={
		"explosion1":`
			freq: NUM 300, env: LIN 0.005 1, EXP 1.995 0, LIN 2
			sig: NOI 4 3, MUL env, sigl: sig, LPF freq 1 0.77, sigb: sig, BPF freq 2 0.23
			OUT: sigl, 0 sigb, 0 OUT -0.685 0.785, -10 CUT 4`,
		"gunshot1":`
			freq: NUM 1000, env: LIN 0.005 0.5, EXP 0.295 0, LIN 0.7
			sig : NOI 1 3, MUL env, sigl: sig, LPF freq 1 0.5, sigb: sig, BPF freq 2 0.5
			OUT : sigl, 0 sigb, 0 OUT -0.65 0.825, -10 CUT 1`,
		"beep1":`
			env: LIN .005 .5, LIN .015, EXP .18 0, MUL env
			OUT: TRI .2 2000 .7, 0 NOI .2 .3, BPF 2000 2.4, MUL env`
	};


	static loadsfx(name,vol=1) {
		let str=Audio.sfxlib[name];
		if (str==="undefined") {throw "SFX '"+name+"' unknown";}
		return Audio.SFX(str).scalevol(vol);
	}*/


	// ----------------------------------------
	// User Interface


	static generateui(volume=0.04,freq=200,time=0.2,noise=0.5,sndfreq=44100) {
		let len=Math.ceil(time*sndfreq);
		let snd=new Audio.Sound(sndfreq,len);
		let data=snd.data;
		let attack=0.01,sustain=time*0.25;
		let scale=freq/5000;
		let bp1=new Audio.Biquad(Audio.Biquad.BANDPASS,freq/sndfreq,6*scale);
		// let bp2=new Audio.Biquad(Audio.Biquad.BANDPASS, 700/sndfreq,3*scale);
		// let del=new Audio.Delay(sndfreq,time*0.25);
		let seed=Math.floor(Audio.noise1()*0xffffff);
		for (let i=0;i<len;i++) {
			let t=i/sndfreq;
			let x=0;
			if (t<attack) {x=t/attack;}
			else if (t-attack<sustain) {x=1-(t-attack)/sustain;}
			x*=x;
			x*=bp1.process(Audio.tri(t*freq)*(1-noise)+Audio.noise(seed+i)*noise);
			// x+=del.get();
			// This bandpass adds low frequency vibrations from the hypothetical console.
			// del.add(bp2.process(x)*0.25);
			data[i]=x;
		}
		snd.scalevol(volume,true);
		return snd;
	}


	static createuiincrease(volume=0.05) {
		return Audio.generateui(volume,2000,0.2,0.5);
	}


	static createuidecrease(volume=0.05) {
		return Audio.generateui(volume,1500,0.2,0.5);
	}


	static createuiconfirm(volume=0.05) {
		return Audio.generateui(volume,4000,2.0,0.25);
	}


	static createuierror(volume=0.05) {
		return Audio.generateui(volume,800,1.0,0.5);
	}


	static createuiclick(volume=0.05) {
		return Audio.generateui(volume,800,0.2,0.75);
	}


	// ----------------------------------------
	// Misc


	static generatethud(volume=1.0,freq=8000,time=0.02,sndfreq=44100) {
		// Pitch should increase slightly with force.
		let decay=Math.log(1e-4)/(time*sndfreq);
		let len=Math.ceil(Math.log(1e-4)/decay);
		let snd=new Audio.Sound(sndfreq,len);
		let data=snd.data;
		let vmul=Math.exp(decay),vtmp=1;
		freq/=sndfreq;
		let seed=Math.floor(Audio.noise1()*0xffffff);
		let bp1=new Audio.Biquad(Audio.Biquad.BANDPASS,freq,2);
		let bp2=new Audio.Biquad(Audio.Biquad.BANDPASS,freq,2);
		let del=new Audio.Delay(sndfreq,0.003),delmul=0.9;
		for (let i=0;i<len;i++) {
			let x=Audio.noise(seed+i)*vtmp;
			vtmp*=vmul;
			x=bp1.process(x);
			x=bp2.process(x);
			x+=del.process(x)*delmul;
			data[i]=x;
		}
		snd.scalevol(volume,true);
		return snd;
	}


	static createmarble(volume=0.5) {
		return Audio.generatethud(volume,8000,0.02);
	}


	static createthud(volume=1.0) {
		return Audio.generatethud(volume,100,0.2);
	}


	static createelectricity(volume=0.15,freq=159.8,time=1.5) {
		let sndfreq=44100,len=Math.ceil(time*sndfreq);
		let ramp=0.01*sndfreq,rampden=1/ramp,tail=len-ramp;
		let snd=new Audio.Sound(sndfreq,len);
		let data=snd.data;
		let seed=Math.floor(Audio.noise1()*0xffffff);
		let freq0=freq/sndfreq,freq1=freq0*1.002;
		let lp3=new Audio.Biquad(Audio.Biquad.LOWPASS,3000/sndfreq);
		for (let i=0;i<len;i++) {
			let x=Audio.saw((seed+i)*freq0)+Audio.saw((seed+i)*freq1);
			x=Audio.clip(x*0.5,-0.5,0.5);
			x=lp3.process(x);
			if (i<ramp || i>tail) {x*=(i<ramp?i:len-1-i)*rampden;}
			data[i]=x;
		}
		snd.scalevol(volume,true);
		return snd;
	}


	static createlaser(volume=0.5,freq=10000,time=0.25) {
		let sndfreq=44100,len=Math.ceil(time*sndfreq);
		let ramp=0.01*sndfreq,rampden=1/ramp,tail=len-ramp;
		let snd=new Audio.Sound(sndfreq,len);
		let data=snd.data;
		freq*=Math.PI*2/sndfreq;
		let phase=Audio.noise()*3.141592654;
		let vmul=Math.exp(Math.log(1e-4)/len),vol=1;
		// Instead of a delay constant, use a delay multiplier. Scales sum < 1.
		// Array format: delay, scale, delay, scale, ...
		let deltable=[0.99,-0.35,0.90,-0.28,0.80,-0.21,0.40,-0.13];
		let delays=deltable.length;
		for (let i=0;i<len;i++) {
			let x=Math.sin(phase+i*freq)*vol;
			if (i<ramp) {x*=i*rampden;}
			vol*=vmul;
			for (let j=0;j<delays;j+=2) {
				let u=i*deltable[j],k=Math.floor(u);
				if (k>=0 && k+1<i) {
					u-=k;
					x+=(data[k]*(1-u)+data[k+1]*u)*deltable[j+1];
				}
			}
			if (i>tail) {x*=(len-1-i)*rampden;}
			data[i]=x;
		}
		snd.scalevol(volume,true);
		return snd;
	}


	static generateexplosion(volume=0.75,freq=1000,time=0.25,sndfreq=44100) {
		let len=Math.ceil(time*sndfreq);
		let ramp=0.01*sndfreq,rampden=1/ramp,tail=len-ramp;
		let snd=new Audio.Sound(sndfreq,len);
		let data=snd.data;
		let vmul=Math.exp(Math.log(1e-4)*3/len),vol=1;
		let f=freq/(freq+1000);
		let lpcoef=1-f,bpcoef=f,del=0.75+0.15*f,delmul=-0.9+0.5*f;
		let seed=Math.floor(Audio.noise1()*0xffffff);
		let lp=new Audio.Biquad(Audio.Biquad.LOWPASS,freq/sndfreq,1);
		let bp=new Audio.Biquad(Audio.Biquad.BANDPASS,freq/sndfreq,2);
		for (let i=0;i<len;i++) {
			let x=Audio.noise(seed+i)*vol;
			vol*=vmul;
			x=lp.process(x)*lpcoef+bp.process(x)*bpcoef;
			let u=i*del,k=Math.floor(u);
			if (k>=0 && k+1<i) {
				u-=k;
				x+=(data[k]*(1-u)+data[k+1]*u)*delmul;
			}
			if (i<ramp || i>tail) {x*=(i<ramp?i:len-1-i)*rampden;}
			data[i]=x;
		}
		snd.scalevol(volume,true);
		return snd;
	}


	static createexplosion1(volume=0.5) {
		return Audio.generateexplosion(volume,100,5.0);
	}


	static createexplosion2(volume=1.0) {
		return Audio.generateexplosion(volume,300,5.0);
	}


	static creategunshot1(volume=0.25) {
		return Audio.generateexplosion(volume,500,0.25);
	}


	static creategunshot2(volume=0.5) {
		return Audio.generateexplosion(volume,1000,1.0);
	}


	static creategunhit(volume=0.25) {
		return Audio.generateexplosion(volume,200,0.10);
	}

}

