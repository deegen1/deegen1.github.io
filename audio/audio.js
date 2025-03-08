/*------------------------------------------------------------------------------


audio.js - v3.03

Copyright 2024 Alec Dee - MIT license - SPDX: MIT
2dee.net - akdee144@gmail.com


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
3.00
     Created Audio.SFX to script and run node-based sound effects. Comes with
     expressions, oscillators, delays, and filters. Multiple inputs can be
     combined with reverse polish notation.
     Remade all sound effects and most instruments as SFX scripts.
     Audio now tracks if browser audio is suspended (like in new tabs) and
     resumes audio.
3.01
     Sound instances now stop and start properly by recreating the audio node.
     Browser audio now gets muted and unmuted properly.
     Cleaned up SFX.parse() error reporting.


--------------------------------------------------------------------------------
TODO


Waveguides
	https://www.osar.fr/notes/waveguides/
	https://petersalomonsen.com/articles/assemblyscriptphysicalmodelingsynthesis/assemblyscriptphysicalmodelingsynthesis.html

AIVA or UDIO for midi creation.
Remove envelopes, biquad, and delay?
Better explanation of compiled form in article.

UI
	Add a piano roll editor.
	Graphical node editor.
	Line showing current position on waveform when playing.
	Click anywhere to jump to time.
	Start/resume/reset.
	Syntax highlighting.

Sequencer
	Swap length and volume in sequencer, since we never set the volume.
	Get rid of case sensitivity.

Sound effects
	Optimize %mod lines in sfx.fill().
	Speed up input processing. Move constants to different section?
	Simplify attribute naming in namemap[].
	Configure delay filter to cache at a static frequency. If rate is too
	small accumulate till we have enough. If too large, split up and fill
	multiple values. fill=delay_freq/play_freq
	WASM fill.
	Convert oscillator table to AVL tree. Allow vars for points.
	If node=last, return node.y. Otherwise lerp node and next(node).
	Store {parent,weight},{prev,next},{left,right},{x},{y} = 20 bytes
	Go through sound design book. Thunder clap, etc.

Allow inst to play effects
	https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Using_AudioWorklet


*/
/* npx eslint audio.js -c ../../standards/eslint.js */
/* global */


//---------------------------------------------------------------------------------
// Audio - v3.03


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
		len=isNaN(len) || len<0?0:(len|0);
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
		req.onload=(()=>{
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
		dstoff=Math.floor(dstoff);
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

	// Array Format
	//  Offset | Data
	// --------+--------------
	//         | Header data
	//       0 | [u32 next]
	//       4 | [u32 in stop]
	//       8 |      [u32 src stop 1] [u32 src 1] [u32 src 2] ... [dst 1]
	//   stop1 |      [u32 src stop 2] [u32 src 1] [u32 src 2] ... [dst 2]
	//   stop2 |      ...
	//         |      VAR/OP format: [8: OP,24: addr]
	//         |      CON    format: [8: OP,24: addr] [f32 con]
	//  instop | Node data
	//       0 | [u32 type]
	//       4 | [f32 output]
	//       8 | [f32 field 1]
	//      12 | [f32 field 2]
	//      16 | ...
	//    next | Next node header

	// Rules
	// Node names begin with a # symbol. The last node is used as output.
	// Node outputs can be used as inputs for most parameters.
	// Ex, a square wave modulated by a sine wave: #osc: SIN F 200 #out: SQR F #osc
	// Combine inputs with reverse polish notation. Leftover terms are summed.
	// Ex, (#osca*2)+(#oscb-1): #out: SQR F #osca 2 * #oscb 1 -


	constructor(str) {
		this.parse(str);
	}


	reset() {
		this.di32.set(this.orig);
	}


	tosound(time=10,silence=0.1,freq=44100) {
		// Plays the effect until a max time or span of silence.
		if (isNaN(time) || time<0) {time=Infinity;}
		if (isNaN(silence) || silence<0) {silence=Infinity;}
		let snd;
		let maxlen=Math.floor(freq*time);
		if (silence>=Infinity) {
			// Fill the whole time.
			if (time>=Infinity) {throw "infinite sound";}
			snd=new Audio.Sound(freq,maxlen);
			this.fill(snd);
		} else {
			// Fill until max time or silence.
			const thres=1e-5;
			let sillen=Math.floor(freq*silence);
			let genlen=Math.floor(freq*0.2)+1;
			snd=new Audio.Sound(freq,0);
			let len=snd.len,silpos=0;
			let data=snd.data;
			for (let dst=0;dst<maxlen && dst-silpos<sillen;) {
				let newlen=dst+genlen;
				if (newlen>len) {
					if (newlen>maxlen) {newlen=maxlen;}
					len=newlen;
					snd.resizelen(len);
					data=snd.data;
				}
				this.fill(snd,dst,newlen-dst);
				while (dst<newlen) {
					if (Math.abs(data[dst++])>thres) {silpos=dst;}
				}
			}
			while (len>silpos) {data[--len]=0;}
			snd.len=len;
			snd.time=len/freq;
		}
		this.reset();
		return snd;
	}


	geti(name) {
		// Gets the value at #node.attr. Ex: #osc1.f
		let addr=this.namemap[name];
		if (addr===undefined) {throw name+" not found";}
		return this.di32[addr];
	}


	getf(name) {
		let addr=this.namemap[name];
		if (addr===undefined) {throw name+" not found";}
		return this.df32[addr];
	}


	seti(name,val) {
		// Sets the value at #node.attr.
		let addr=this.namemap[name];
		if (addr===undefined) {throw name+" not found";}
		this.di32[addr]=val;
		return this;
	}


	setf(name,val) {
		let addr=this.namemap[name];
		if (addr===undefined) {throw name+" not found";}
		this.df32[addr]=val;
		return this;
	}


	// ----------------------------------------
	// Parser


	parse(seqstr) {
		// Last node is returned. Node names must start with #.
		// Translating addresses: (node_num+1)<<8+param_num
		const EXPR=0,ENV=1,TBL=2,NOI=8,DEL=9,OSC0=2,OSC1=7,FIL0=10,FIL1=17;
		const CON=0,VAR=1,OP=2,VBITS=24,VMASK=(1<<VBITS)-1,PBITS=8,PMASK=(1<<PBITS)-1;
		this.namemap={};
		let nodetypes=[
			{str:"expr" ,type: 0,params:" "},
			{str:"env"  ,type: 1,params:"asri "},
			{str:"tbl"  ,type: 2,params:"fphl t"},
			{str:"tri"  ,type: 3,params:"fphl "},
			{str:"pulse",type: 4,params:"fphl w"},
			{str:"saw"  ,type: 5,params:"fphl "},
			{str:"sin"  ,type: 6,params:"fphl "},
			{str:"sqr"  ,type: 7,params:"fphl "},
			{str:"noise",type: 8,params:"hl  "},
			{str:"del"  ,type: 9,params:"tmi "},
			{str:"lpf"  ,type:10,params:"fbgi"},
			{str:"hpf"  ,type:11,params:"fbgi"},
			{str:"bpf"  ,type:12,params:"fbgi"},
			{str:"npf"  ,type:13,params:"fbgi"},
			{str:"apf"  ,type:14,params:"fbgi"},
			{str:"pkf"  ,type:15,params:"fbgi"},
			{str:"lsf"  ,type:16,params:"fbgi"},
			{str:"hsf"  ,type:17,params:"fbgi"}
		];
		seqstr=seqstr.toLowerCase();
		let s=0,seqlen=seqstr.length;
		let sndfreq=44100;
		let ndecl=new Int32Array(seqlen>>1);
		let naddr=new Int32Array(seqlen>>1);
		let node=null,nparam=0,nodes=0,nid=0;
		let name="";
		let paramarr=new Array(10);
		let paramcon=new Array(10);
		let dpos=0;
		let di32=new Int32Array(0);
		let df32=new Float32Array(di32.buffer);
		function error(msg,s0,s1) {
			let line=1,start=0;
			for (let i=0;i<s0;i++) {if (seqstr.charCodeAt(i)===10) {start=i+1;line++;}}
			if (s1===undefined) {s1=s0+1;s0=start;}
			let argsum=seqstr.substring(s0,s1);
			throw "Sequencer error:\n\tError: "+msg+"\n\tLine : "+line+"\n\targs : "+argsum;
		}
		function getc() {return s<seqlen?seqstr.charCodeAt(s):0;}
		function findc(str,c) {
			let i=str.length;while (--i>=0 && str.charCodeAt(i)!==c) {}
			return i;
		}
		while (s<seqlen || node) {
			// Read through whitespace and comments.
			let c=0;
			while ((c=getc())<33 && c>0) {s++;}
			if (c===39 || c===34) {
				// If " stop at ". If ' stop at \n.
				let eoc=c===34?34:10;
				do {s++;} while ((c=getc())!==eoc && c>0);
				s++;
				continue;
			}
			// Stop at :'"
			let c0=getc(),s0=s++;
			while ((c=getc())>32 && c!==34 && c!==39 && c!==58) {s++;}
			// Types: 0 const, 1 node, 2 op, 3 process
			let tval=nodes,tid=3,s1=s;
			while ((c=getc())<33 && c>0) {s++;}
			if (!node && c!==58) {
				// Node type. If we can't identify it, default to EXPR.
				let n=nodetypes.length,str=seqstr.substring(s0,s1);
				while (--n>=0 && str!==nodetypes[n].str) {}
				node=nodetypes[n>0?n:0];
				let params=node.params.length;
				for (let i=0;i<params;i++) {paramarr[i]=new Array();}
				nparam=0;
				if (n>=0) {continue;}
			}
			if (c0===35) {
				// Find the node's ID.
				while (--tval>=0) {
					let i=ndecl[tval],j=s1-1;
					while (j>=s0 && seqstr[i]===seqstr[j]) {i--;j--;}
					if (j<s0) {break;}
				}
				// If we have a new node name or a definition.
				if (tval<0) {tval=nodes++;naddr[tval]=-s0-1;ndecl[tval]=s1-1;}
				if (c!==58) {tid=VAR;tval=((tval+1)<<PBITS)|1;}
				else {s++;if (naddr[tval]>=0) {error("node already defined",s0,s1);}}
			} else if (s1-s0<2 && c0>96 && c0<123) {
				// Parameter.
				nparam=findc(node.params,c0);
				if (nparam<0) {error("invalid parameter",s0,s1);}
				continue;
			} else if (s1-s0<2 && c0 && (c0<48 || c0>57)) {
				// Operator.
				tval=findc(" ~+-*%/^<>",c0);
				if (tval<0) {error("invalid operator",s0,s1);}
				tid=OP;
			} else if (c0) {
				// Parse numbers in format: [+-]\d*(\.\d*)?
				let i=s0,d=0;
				c=i<s1?seqstr.charCodeAt(i):0;
				let neg=c===45?-1:1;
				if (c===45 || c===43) {i++;}
				let num=0,den=1;
				while (i<s1 && (c=seqstr.charCodeAt(i)-48)>=0 && c<=9) {d=1;i++;num=num*10+c;}
				if (c===-2) {i++;}
				while (i<s1 && (c=seqstr.charCodeAt(i)-48)>=0 && c<=9) {d=1;i++;den*=0.1;num+=c*den;}
				if (i<s1 || !d) {error("invalid token",s0,s1);}
				tval=neg*num;
				tid=CON;
			}
			// Process the token.
			if (tid<3) {
				if (!node) {error("node type undefined",s0,s);}
				paramarr[nparam].push({type:tid,val:tval});
				continue;
			}
			if (node) {
				// Make sure expressions are valid and preprocess constant expressions.
				let params=node.params.length;
				let type=node.type;
				for (let i=0;i<params;i++) {
					// Don't evaluate osc.p.
					let stack=paramarr[i];
					if (type===TBL && i===5) {continue;}
					let h=0;
					for (let p of stack) {
						h+=p.type!==OP?1:(p.val<2?0:-1);
						if (h<=0) {error("not enough operands in expression: "+node.str,s0-1);}
					}
					// Sum everything left in the stack.
					while (h-->1) {
						let p={type:OP,val:2},l=stack.length;
						stack.push(p);
						while (l>2 && stack[l-2].type!==OP) {stack[l]=stack[l-1];l--;}
						stack[l]=p;
					}
					h=0;
					for (let j=0;j<stack.length;j++) {
						let p=stack[j];
						if (p.type===OP) {
							let min=p.val<2?1:2;
							let p1=stack[h-min],p2=stack[h-1];
							if (p1.type===CON && p2.type===CON) {
								let v1=p1.val,v2=p2.val;
								switch (p.val) {
									case 0: break;
									case 1: v1=-v1;break;
									case 2: v1+=v2;break;
									case 3: v1-=v2;break;
									case 4: v1*=v2;break;
									case 5: v1%=v2;break;
									case 6: v1/=v2;break;
									case 7: v1=Math.pow(v1,v2);break;
									case 8: v1=v1<v2?v1:v2;break;
									case 9: v1=v1>v2?v1:v2;break;
								}
								h-=min;
								p.type=CON;
								p.val=v1;
							}
						}
						stack[h++]=p;
					}
					paramarr[i]=stack.slice(0,h);
				}
				let param=paramarr;
				let iscon=paramcon;
				for (let i=0;i<params;i++) {
					iscon[i]=1;
					for (let p of param[i]) {iscon[i]&=p.type===CON;}
				}
				// Default arguments.
				let noff=(nid+1)<<PBITS;
				let size=params;
				let def=[],negp=-1;
				if (type===EXPR) {
					size=0;
					def=[0];
				} else if (type===ENV) {
					def=[0,0,0,1,0];
				} else if (type>=OSC0 && type<=OSC1) {
					def=[NaN,0,1,-1,0,0.5];
					negp=3;
					if (type===TBL) {
						if (!iscon[5]) {error("table points must be constants",s0-1);}
						let p=param[5],len=p.length;
						if (len<4) {error("table must have at least 2 points",s0-1);}
						if (len&1) {error("table must have an even number of values: "+len,s0-1);}
						for (let i=2;i<len;i+=2) {
							let j=i,x=p[j],y=p[j+1];
							while (j>0 && p[j-2].val>x.val) {p[j]=p[j-2];p[j+1]=p[j-1];j-=2;}
							p[j]=x;p[j+1]=y;
						}
						if (p[0].val!==0) {error("table must start at x=0",s0-1);}
						for (let i=1;i<len;i+=2) {p[i].val=p[i].val*0.5+0.5;}
						size+=len-1;
					}
				} else if (type===NOI) {
					// noise
					let rand=dpos+params;
					def=[1,-1,Math.imul(rand,0x7eccc553),Math.imul(rand,0x49e15d71)|1];
					negp=1;
				} else if (type===DEL) {
					// delay
					if (!param[0].length) {error("delay must have a time",s0-1);}
					if (!param[1].length && iscon[0]) {param[1].push({type:CON,val:param[0][0].val});}
					let max=(param[1].length===1 && iscon[1])?param[1][0].val:NaN;
					let len=Math.floor(sndfreq*max)+2;
					if (isNaN(len)) {error("max delay must be constant",s0-1);}
					def=[NaN,NaN,0,0];
					size+=len;
				} else if (type>=FIL0 && type<=FIL1) {
					size+=11;
					def=[NaN,1,1,NaN];
				} else {
					error("unknown known type: "+type,s0-1);
				}
				if (negp>0 && !param[negp].length && param[negp-1].length) {
					// set to -[h]
					let h=negp-1;
					if (iscon[h]) {param[negp].push({type:CON,val:-param[h][0].val});}
					else {param[negp].push({type:VAR,val:noff+2+h},{type:OP,val:1});}
					iscon[negp]=iscon[h];
				}
				for (let p=0;p<params;p++) {
					if (!param[p].length) {
						if (isNaN(def[p])) {error(node.params[p]+" must have a value",s0-1);}
						param[p].push({type:CON,val:def[p]});
					}
				}
				// Overallocate to fit our data.
				let resize=dpos+4+size;
				for (let p=0;p<params;p++) {resize+=!iscon[p]?param[p].length*2+2:0;}
				if (resize>resize || resize>VMASK) {
					error("not enough memory: "+resize,s0-1);
				}
				if (resize>di32.length) {
					let newlen=resize*2;
					let tmp=new Int32Array(newlen);
					for (let i=di32.length;i<newlen;i++) {tmp[i]=0;}
					tmp.set(di32);
					di32=tmp;
					df32=new Float32Array(di32.buffer);
				}
				// Fill inputs and fields.
				let dpos0=dpos++; // next
				dpos++; // in stop
				// Pack inputs if they're non contants.
				for (let p=0;p<params;p++) {
					if (iscon[p]) {continue;}
					let in0=dpos++,ppos=-1;
					for (let prm of param[p]) {
						let pt=prm.type;
						if (pt===OP) {
							let val=prm.val<<VBITS;
							if (ppos>=0) {di32[ppos]|=val;}
							else {di32[dpos++]=val;}
							ppos=-1;
						} else if (pt===CON) {
							ppos=dpos;
							di32[dpos++]=1;
							df32[dpos++]=prm.val;
						} else {
							ppos=dpos;
							di32[dpos++]=prm.val;
						}
					}
					di32[in0]=dpos; // src stop
					di32[dpos++]=p+1+(type!==EXPR); // dst
				}
				di32[dpos0+1]=dpos; // in stop
				di32[dpos++]=type; // type
				// Allocate state values and fill in constants.
				let dpos1=dpos+size+1;
				if (dpos1>resize || dpos1>VMASK) {
					error("out of bounds: "+dpos1+" > "+resize,s0-1);
				}
				for (let p=0;p<params;p++) {
					if (!iscon[p]) {continue;}
					let prm=param[p];
					let off=dpos+p+(type!==EXPR),len=prm.length;
					if (type===TBL && p===5) {
						for (let i=0;i<len;i++) {df32[off+i]=prm[i].val;}
					} else if ((type===DEL && p>2) || (type===NOI && p>2)) {
						di32[off]=prm[0].val;
					} else {
						df32[off]=prm[0].val;
					}
				}
				// Map names to addresses for ease of use.
				this.namemap[name]=dpos0;
				this.namemap[name+".type"]=dpos-1;
				this.namemap[name+".out"]=dpos;
				for (let p=0;p<params;p++) {
					let pstr=node.params[p];
					let off=dpos+p+(type!==EXPR);
					if (off===dpos) {pstr="out";}
					if (type>=OSC0 && type<=OSC1 && p===4) {pstr="acc";}
					if (type===ENV && p===4) {pstr="time";}
					if (type===NOI && p>1) {pstr=["acc","inc"][p-2];}
					if (type===DEL && p>2) {pstr=["pos","len"][p-3];}
					if (!pstr.trim()) {pstr="p"+p;}
					this.namemap[name+"."+pstr]=off;
				}
				dpos=dpos1;
				di32[dpos0]=dpos; // next
				node=null;
			}
			naddr[tval]=dpos;
			nid=tval;
			name=seqstr.substring(s0,s1);
		}
		// Find any undefined nodes.
		for (let i=0;i<nodes;i++) {
			let a=-naddr[i];
			if (a>0) {error("undefined node",a-1,ndecl[i]+1);}
		}
		// Convert node numbers to output addresses.
		let maxh=0;
		for (let d=0;d<dpos;) {
			let next=di32[d++],istop=di32[d++];
			while (d<istop) {
				let sstop=di32[d++];
				if (maxh<sstop-d) {maxh=sstop-d;}
				while (d<sstop) {
					let d0=d++,tmp=di32[d0];
					let op=tmp&~VMASK,src=(tmp&VMASK)>>>0;
					if (src>PMASK) {
						tmp=naddr[(src>>>PBITS)-1];
						src=(src&PMASK)+di32[tmp+1];
					} else if (src===1) {
						src=d++;
					}
					di32[d0]=op|src;
				}
				di32[d++]+=istop;
			}
			d=next;
		}
		// Resize to dpos + stack.
		di32=di32.slice(0,dpos);
		this.stack=new Float64Array(maxh);
		this.di32=di32;
		this.df32=new Float32Array(di32.buffer);
		this.orig=di32.slice();
	}


	// ----------------------------------------
	// Generator


	biquadcoefs(n,type,rate,bw,gain) {
		const LPF=10,HPF=11,BPF=12,NPF=13,APF=14,PKF=15,LSF=16,HSF=17;
		let b0=1,b1=0,b2=0;
		let a0=1,a1=0,a2=0;
		let v  =gain;
		let ang=2*Math.PI*rate;
		let sn =Math.sin(ang);
		let cs =Math.cos(ang);
		let q  =0.5/Math.sinh(Math.log(2)*0.5*bw*ang/sn);
		let a  =sn/(2*q);
		let vr =2*Math.sqrt(v)*a;
		if (type===LPF) {
			b1=(1-cs)*v;
			b2=0.5*b1;
			b0=b2;
			a0=1+a;
			a1=-2*cs;
			a2=1-a;
		} else if (type===HPF) {
			b1=(-1-cs)*v;
			b2=-0.5*b1;
			b0=b2;
			a0=1+a;
			a1=-2*cs;
			a2=1-a;
		} else if (type===BPF) {
			b1=0;
			b2=-a*v;
			b0=-b2;
			a0=1+a;
			a1=-2*cs;
			a2=1-a;
		} else if (type===NPF) {
			b1=-2*cs*v;
			b2=v;
			b0=v;
			a0=1+a;
			a1=-2*cs;
			a2=1-a;
		} else if (type===APF) {
			b1=-2*cs*v;
			b2=(1+a)*v;
			b0=(1-a)*v;
			a0=b2;
			a1=b1;
			a2=1-a;
		} else if (type===PKF) {
			b0=1+a*v;
			b1=-2*cs;
			b2=1-a*v;
			a0=1+a/v;
			a1=-2*cs;
			a2=1-a/v;
		} else if (type===LSF) {
			b0=v*((v+1)-(v-1)*cs+vr);
			b1=2*v*((v-1)-(v+1)*cs);
			b2=v*((v+1)-(v-1)*cs-vr);
			a0=(v+1)+(v-1)*cs+vr;
			a1=-2*((v-1)+(v+1)*cs);
			a2=(v+1)+(v-1)*cs-vr;
		} else if (type===HSF) {
			b0=v*((v+1)+(v-1)*cs+vr);
			b1=-2*v*((v-1)+(v+1)*cs);
			b2=v*((v+1)+(v-1)*cs-vr);
			a0=(v+1)-(v-1)*cs+vr;
			a1=2*((v-1)-(v+1)*cs);
			a2=(v+1)-(v-1)*cs-vr;
		} else {
			throw "Biquad type not recognized: "+type;
		}
		let df32=this.df32;
		df32[n+11]=b0/a0;
		df32[n+12]=b1/a0;
		df32[n+13]=b2/a0;
		df32[n+14]=a1/a0;
		df32[n+15]=a2/a0;
	}


	next() {
		let dst=[0];
		this.fill(dst);
		return dst[0];
	}


	fill(snd,start,len) {
		// Fills a sound or array with the effect's output.
		let snddata=snd;
		let sndlen =snd.length;
		let sndfreq=44100;
		if (sndlen===undefined) {
			snddata=snd.data;
			sndlen =snd.len;
			sndfreq=snd.freq;
		}
		if (start===undefined) {start=0;}
		if (len===undefined) {len=sndlen;}
		if (start+len<sndlen) {sndlen=start+len;}
		let sndrate=1/sndfreq;
		const EXPR=0,ENV=1,TBL=2,TRI=3,PLS=4,SAW=5,SIN=6,SQR=7,NOI=8,DEL=9;
		const OSC0=2,OSC1=7,FIL0=10,FIL1=17;
		const VBITS=24,VMASK=(1<<VBITS)-1;
		for (let sndpos=start;sndpos<sndlen;sndpos++) {
			let di32=this.di32,df32=this.df32;
			let stack=this.stack;
			let n=0,nstop=di32.length;
			let out=0;
			// Loop through each node.
			while (n<nstop) {
				let next=di32[n++],istop=di32[n++];
				// Loop through each input.
				while (n<istop) {
					let sstop=di32[n++],s=0;
					// Loop through each source.
					// Process the RPN expression. Memory IO is expensive so try to minimize it.
					// The first element will always be [x] or ~[x].
					let tmp=di32[n++],op=tmp>>>VBITS,src=(tmp&VMASK)>>>0;
					n+=n===src;
					let val=df32[src];
					if (op) {val=-val;}
					while (n<sstop) {
						tmp=di32[n++];op=tmp>>>VBITS;src=(tmp&VMASK)>>>0;
						let x=val;
						if (src) {n+=n===src;x=df32[src];if (op<2) {stack[s++]=val;}}
						else if (op>1) {val=stack[--s];}
						switch (op) {
							case 0: val= x;break;
							case 1: val=-x;break;
							case 2: val+=x;break;
							case 3: val-=x;break;
							case 4: val*=x;break;
							case 5: val%=x;break;
							case 6: val/=x;break;
							case 7: val=Math.pow(val,x);break;
							case 8: val=val<x?val:x;break;
							case 9: val=val>x?val:x;break;
						}
					}
					// Set a value in the node.
					df32[di32[n++]]=val;
				}
				let type=di32[n++];
				if (type===EXPR) {
					out=df32[n];
				} else if (type===ENV) {
					// Attack, sustain, release.
					let atk=df32[n+1];
					let sus=df32[n+2],s1=atk+sus;
					let rel=df32[n+3],r1=rel+s1;
					let t  =df32[n+5];
					out=df32[n+4];
					df32[n+5]=t+sndrate;
					// Want: e^decay=eps, a+b*e^(decay*0)=1, a+b*e^(decay*1)=0
					// eps=0.01, decay=ln(eps), b=1/(1-eps), a=1-b
					const decay=-4.605170186,b=100/99,a=-1/99;
					if      (t>=r1) {out=0;}
					else if (t>=s1) {out*=a+b*Math.exp(decay*(t-s1)/rel);}
					else if (t<atk) {out*=t/atk;}
				} else if (type>=OSC0 && type<=OSC1) {
					// Oscillators.
					let freq =df32[n+1];
					let phase=df32[n+2];
					let hi   =df32[n+3];
					let lo   =df32[n+4];
					let acc  =df32[n+5];
					let mod  =type!==TBL?1:df32[next-2];
					let u=(acc+phase)%mod;
					if (u<0) {u+=mod;}
					df32[n+5]=(acc+freq*sndrate)%mod;
					if      (type===TRI) {out=(u<0.5?u:1-u)*2;}
					else if (type===PLS) {out=u<df32[n+6]?0:1;}
					else if (type===SAW) {out=u;}
					else if (type===SIN) {out=Math.sin(u*(Math.PI*2))*0.5+0.5;}
					else if (type===SQR) {out=u<0.5?0:1;}
					else if (type===TBL) {
						// Binary search to find what points we're between.
						let l=n+6,h=next-4;
						while (l<h) {let m=l+(((h-l+2)>>>2)<<1);if (df32[m]>u) {h=m-2;} else {l=m;}}
						// Interpolate between the points.
						let x=df32[l],y=df32[l+1];
						out=y+(df32[l+3]-y)*((u-x)/(df32[l+2]-x));
					}
					out=out*(hi-lo)+lo;
				} else if (type===NOI) {
					// Noise.
					let hi =df32[n+1];
					let lo =df32[n+2];
					let inc=di32[n+4];
					let val=di32[n+3]+inc;
					di32[n+3]=val;
					val=Math.imul(val^(val>>>16),0xf8b7629f);
					val=Math.imul(val^(val>>> 8),0xcbc5c2b5);
					val=Math.imul(val^(val>>>24),0xf5a5bda5);
					out=((val>>>0)/4294967295)*(hi-lo)+lo;
				} else if (type===DEL) {
					// Delay.
					let del=df32[n+1];
					let max=df32[n+2];
					let sig=df32[n+3];
					let pos=di32[n+4];
					let len=next-n-5;
					// Add the latest input.
					if (++pos>=len) {pos=0;}
					di32[n+4]=pos;
					df32[n+5+pos]=sig;
					// Interpolate the delayed output.
					del=del<max?del:max;
					del=del>0?del*sndfreq:0;
					let i=del>>>0,j;
					let f=del-i;
					i=pos-i;i=i<0?i+len:i;
					j=i-1  ;j=j<0?j+len:j;
					out=df32[n+5+i]*(1-f)+df32[n+5+j]*f;
				} else if (type>=FIL0 && type<=FIL1) {
					// Biquad filters.
					let freq=df32[n+1],bw=df32[n+2],gain=df32[n+3];
					if (df32[n+5]!==freq || df32[n+6]!==bw || df32[n+7]!==gain) {
						df32[n+5]=freq;df32[n+6]=bw;df32[n+7]=gain;
						this.biquadcoefs(n,type,freq/sndfreq,bw,gain);
					}
					// Process the input. y1 is kept in df32[n] as the previous output.
					let x =df32[n+4];
					let x1=df32[n+8],x2=df32[n+ 9];
					let y1=df32[n  ],y2=df32[n+10];
					out=df32[n+11]*x+df32[n+12]*x1+df32[n+13]*x2-df32[n+14]*y1-df32[n+15]*y2;
					df32[n+ 8]=x;
					df32[n+ 9]=x1;
					df32[n+10]=y1;
				}
				out=!isNaN(out)?out:0;
				df32[n]=out;
				n=next;
			}
			snddata[sndpos]=out;
		}
	}


	// ----------------------------------------
	// Default Sounds


	static deflib={
		"uiinc":"#vol: .05 #freq: 1500 #time: 0.1 #osc1: NOISE H .4 #osc2: TRI F #freq #bpf: BPF F #freq B .0012 #freq * I #osc1 #osc2 #out: ENV A .01 S #time .01 - .5 * R #time .01 - .5 * I #bpf #vol *",
		"uidec":"#vol: .05 #freq: 1000 #time: 0.1 #osc1: NOISE H .4 #osc2: TRI F #freq #bpf: BPF F #freq B .0012 #freq * I #osc1 #osc2 #out: ENV A .01 S #time .01 - .5 * R #time .01 - .5 * I #bpf #vol *",
		"uiconf":"#vol: .05 #freq: 4000 #time: 1.0 #osc1: NOISE H .4 #osc2: TRI F #freq #bpf: BPF F #freq B .0012 #freq * I #osc1 #osc2 #out: ENV A .01 R #time .01 - I #bpf #vol *",
		"uierr":"#vol: .1 #freq: 400 #time: 0.5 #osc1: NOISE H .4 #osc2: TRI F #freq #bpf: BPF F #freq B .0012 #freq * I #osc1 #osc2 #out: ENV A .01 R #time .01 - I #bpf #vol *",
		"uiclick":"#vol: .1 #freq: 180 #time: 0.1 #osc1: NOISE H .4 #osc2: TRI F #freq #bpf: BPF F #freq B .0012 #freq * I #osc1 #osc2 #out: ENV A .01 R #time .01 - I #bpf #vol *",
		"explosion1":"#vol: 5 #freq: 300 #time: 2 #u: #freq #freq 1000 + / #noi: NOISE #lpf: LPF F #freq B 1 G 1 #u - I #noi #bpf: BPF F #freq B 2 G #u I #noi #del: DEL T 0.15 #u * 0.75 + M 0.9 I 0.5 #u * 0.9 - #sig * #sig: #del #lpf #bpf #out: ENV A 0.01 R #time 0.01 - I #sig #vol *",
		"explosion2":"#vol: 9 #freq: 100 #time: 2 #u: #freq #freq 1000 + / #noi: NOISE #lpf: LPF F #freq B 1 G 1 #u - I #noi #bpf: BPF F #freq B 2 G #u I #noi #del: DEL T 0.15 #u * 0.75 + M 0.9 I 0.5 #u * 0.9 - #sig * #sig: #del #lpf #bpf #out: ENV A 0.01 R #time 0.01 - I #sig #vol *",
		"gunshot1":"#vol: 5 #freq: 500 #time: .25 #u: #freq #freq 1000 + / #noi: NOISE #lpf: LPF F #freq B 1 G 1 #u - I #noi #bpf: BPF F #freq B 2 G #u I #noi #del: DEL T 0.15 #u * 0.75 + M 0.9 I 0.5 #u * 0.9 - #sig * #sig: #del #lpf #bpf #out: ENV A 0.01 R #time 0.01 - I #sig #vol *",
		"gunshot2":"#vol: 1 #freq: 1000 #time: .25 #u: #freq #freq 1000 + / #noi: NOISE #lpf: LPF F #freq B 1 G 1 #u - I #noi #bpf: BPF F #freq B 2 G #u I #noi #del: DEL T 0.15 #u * 0.75 + M 0.9 I 0.5 #u * 0.9 - #sig * #sig: #del #lpf #bpf #out: ENV A 0.01 R #time 0.01 - I #sig #vol *",
		"missile1":"#noi1: NOISE H 1000 #noi2: #noi1 1 < -1 > #freq: TRI F 20 H 1000 L 100 #sigl: LPF F #freq I #noi2 B 1 #sigb: BPF F #freq I #noi2 B 2 #out: ENV A .015 R .985 I #sigl #sigb",
		"electricity":"#freq: 159 #saw0: SAW F #freq #saw1: SAW F #freq 1.002 * #sig: LPF F 3000 I #saw0 #saw1 + 0.5 < -0.5 > #out : ENV S 2 I #sig",
		"laser":"#vol: 1 #freq: 10000 #time: .25 #t: SAW F 1 #time / L 0 H #time #del1: DEL T #t .01 * M .5 I #sig -.35 * #del2: DEL T #t .10 * M .5 I #sig -.28 * #del3: DEL T #t .20 * M .5 I #sig -.21 * #del4: DEL T #t .60 * M .5 I #sig -.13 * #osc: SIN F #freq H 0.7 #sig: #osc #del1 #del2 #del3 #del4 #out: ENV A 0.01 R #time .01 - I #sig #vol *",
		"thud":"#vol: 10 #freq: 80 #time: .2 #noi: NOISE #bpf1: BPF F #freq B 2 I #noi #bpf2: BPF F #freq B 2 I #bpf1 #sig: #bpf2 #del #del: DEL T 0.003 I #bpf2 0.9 * #out: ENV R #time I #sig #vol *",
		"marble":"#vol: .05 #freq: 7000 #time: .02 #noi: NOISE #bpf1: BPF F #freq B 2 I #noi #bpf2: BPF F #freq B 2 I #bpf1 #sig: #bpf2 #del #del: DEL T 0.003 I #bpf2 0.9 * #out: ENV R #time I #sig #vol *"
	};


	static defload(name,vol,freq,time) {
		let str=_AudioSFX.deflib[name];
		if (str===undefined) {throw "unknown effect: "+name;}
		let sfx=new _AudioSFX(str);
		if (vol !==undefined) {sfx.setf("#vol.out" ,vol );}
		if (freq!==undefined) {sfx.setf("#freq.out",freq);}
		if (time!==undefined) {sfx.setf("#time.out",time);}
		return sfx;
	}


	static defsnd(name,vol,freq,time) {
		let sfx=_AudioSFX.defload(name,vol,freq,time);
		let silence=Infinity;
		if (isNaN(time) || time<0) {time=NaN;silence=0.1;}
		return sfx.tosound(time,silence);
	}


	static defplay(name,vol,freq,time) {
		_AudioSFX.defsnd(name,vol,freq,time).play();
	}

}


class _AudioInstance {

	// We can only call start/stop once. In order to pause a buffer node, we need to
	// destroy and recreate the node.

	constructor(snd,vol=1.0,pan=0.0) {
		let audio=snd.audio;
		// Audio player link
		this.audio  =audio;
		this.audprev=null;
		this.audnext=audio.queue;
		audio.queue =this;
		// Sound link
		this.snd    =snd;
		this.sndprev=null;
		this.sndnext=snd.queue;
		snd.queue   =this;
		// Misc
		this.volume =vol;
		this.rate   =1.0;
		this.playing=false;
		this.done   =false;
		this.muted  =audio.muted;
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
		let st=this;
		ctxsrc.onended=function(){st.remove();};
		ctxsrc.buffer=snd.ctxbuf;
		ctxsrc.connect(this.ctxgain);
		if (snd.ctxbuf) {
			if (!this.muted) {ctxsrc.start(0,0,snd.time);}
			this.playing=true;
		}
		this.time=-performance.now()*0.001;
	}


	remove() {
		if (this.done) {return;}
		this.done=true;
		if (this.playing) {this.time+=performance.now()*0.001;}
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
		this.ctxsrc.onended=undefined;
		try {this.ctxsrc.stop();} catch {}
		this.ctxsrc.disconnect();
		this.ctxgain.disconnect();
		this.ctxpan.disconnect();
	}


	stop() {
		// Audio nodes can't start and stop, so recreate the node.
		if (!this.done && this.playing) {
			this.playing=false;
			this.muted=this.audio.muted;
			let src=this.ctxsrc;
			let endfunc=src.onended;
			src.onended=undefined;
			try {src.stop();} catch {}
			src.disconnect();
			this.time+=performance.now()*0.001;
			src=this.ctx.createBufferSource();
			src.onended=endfunc;
			src.buffer=this.snd.ctxbuf;
			src.connect(this.ctxgain);
			this.ctxsrc=src;
		}
	}


	start() {
		if (!this.done && !this.playing) {
			this.playing=true;
			this.muted=this.audio.muted;
			let rem=this.snd.time-this.time;
			if (rem<=0) {this.remove();}
			else if (!this.muted) {this.ctxsrc.start(0,this.time,rem);}
			this.time-=performance.now()*0.001;
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
			this.ctxpan.pan.value=this.pan;
		}
	}


	setvolume(vol) {
		if (isNaN(vol)) {vol=1;}
		this.volume=vol;
		if (!this.done) {
			vol*=this.audio.volume;
			this.ctxgain.gain.value=vol;
		}
	}


	gettime() {
		return this.time+(this.playing?performance.now()*0.001:0);
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
			b2=0.5*b1;
			b0=b2;
			a0=1+a;
			a1=-2*cs;
			a2=1-a;
		} else if (type===_AudioBiquad.HIGHPASS) {
			b1=(-1-cs)*v;
			b2=-0.5*b1;
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
	static SFX      =_AudioSFX;
	static Instance =_AudioInstance;
	static Delay    =_AudioDelay;
	static Envelope =_AudioEnvelope;
	static Biquad   =_AudioBiquad;

	// The default context used for audio functions.
	static def=null;
	static randacc=0;
	static randinc=0;


	constructor(freq=44100) {
		Object.assign(this,this.constructor);
		this.freq=freq;
		this.queue=null;
		this.volume=1;
		let ctx=new AudioContext({latencyHint:"interactive",sampleRate:freq});
		this.ctx=ctx;
		// 2 = Audio mute, 1 = browser mute
		this.muted=2;
		this.mutefunc=function(){ctx.resume();};
		this.updatetime=NaN;
		if (!Audio.def) {Audio.initdef(this);}
		let st=this;
		function update() {if (st.update()) {requestAnimationFrame(update);}}
		update();
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


	mute(val) {
		if (val!==undefined) {this.muted=(val?2:0)|(this.muted&1);}
		return (this.muted&2)?true:false;
	}


	update() {
		// Audio is silenced until a sound is played after user interaction.
		// https://html.spec.whatwg.org/#activation-triggering-input-event
		let muted=(this.muted&2)|(this.ctx.state!=="running");
		if ((muted^this.muted)&1) {
			let events=["keydown","mousedown","pointerdown","pointerup","touchend"];
			for (let evt of events) {
				if (muted&1) {document.addEventListener(evt,this.mutefunc);}
				else {document.removeEventListener(evt,this.mutefunc);}
			}
			this.muted=muted;
		}
		// Track time played while audio is suspended. Restart or remove sounds if needed.
		let inst=this.queue;
		while (inst) {
			let next=inst.next;
			if ((muted || inst.muted) && inst.playing) {
				let time=inst.time;
				if (!inst.muted) {
					inst.stop();
					inst.time=time;
					inst.playing=true;
				}
				time+=performance.now()*0.001;
				if (time>inst.snd.time || !muted) {
					inst.playing=false;
					inst.time=time;
					inst.start();
				}
			}
			inst=next;
		}
		return true;
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
		return x>=-1?Math.sin(x*(Math.PI*2)):-1;
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
		// The last sequence is returned as the sound.
		// Note format: [CDEFGAB][#b][octave]. Ex: A4  B#12  C-1.2
		//
		//  Symbol |             Description             |         Parameters
		// --------+-------------------------------------+-----------------------------
		//   ,     | Separate and advance time by 1 BPM. |
		//   , X   | Separate and advance time by X BPM. |
		//   '     | Line Comment.                       |
		//   "     | Block comment. Terminate with "     |
		//   bass: | Define a sequence named bass.       |
		//   bass  | Reference a sequence named bass.    | [vol=1]
		//   BPM   | Beats per minute.                   | [240]
		//   VOL   | Sets volume. Resets every sequence. | [1.0]
		//   CUT   | Cuts off sequence at time+delta.    | [delta=0]
		//   AG    | Acoustic Guitar                     | [note=A3] [vol=1] [len=5.0]
		//   XY    | Xylophone                           | [note=C4] [vol=1] [len=2.2]
		//   MR    | Marimba                             | [note=C4] [vol=1] [len=2.2]
		//   GS    | Glockenspiel                        | [note=A6] [vol=1] [len=5.3]
		//   MB    | Music Box                           | [note=A5] [vol=1] [len=3.0]
		//   HH    | Hi-hat                              | [note=A8] [vol=1] [len=0.1]
		//   KD    | Kick Drum                           | [note=B2] [vol=1] [len=0.2]
		//   SD    | Snare Drum                          | [note=G3] [vol=1] [len=0.2]
		//
		let seqpos=0,seqlen=seq.length,sndfreq=44100;
		let bpm=240,time=0,subvol=1,sepdelta=0;
		let argmax=7,args=0;
		let argstr=new Array(argmax);
		for (let i=0;i<argmax;i++) {argstr[i]="";}
		let subsnd=null,nextsnd=new Audio.Sound(sndfreq);
		let rand=[Audio.randacc,Audio.randinc];
		[Audio.randacc,Audio.randinc]=[0,0xcadffab1];
		// ,:'"
		let stoptoken={44:true,58:true,39:true,34:true};
		let sequences={
			"BPM": 1,"VOL": 2,"CUT": 3,
			"AG": 10,
			"XY": 11,"MR": 12,"GS": 13,"MB": 14,
			"HH": 15,"KD": 16,"SD": 17,
			"":nextsnd
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
				subsnd.resizetime(time);
			} else {
				// Instruments
				type-=10;
				let note=["A3","C4","C4","A6","A5","A8","B2","G3"][type];
				let time=[3.0,2.2,2.2,5.3,3.0,0.1,0.2,0.2][type];
				let freq=parsenote(argstr[a++],note,"note or frequency");
				vol=parsenum(argstr[a++],1,"volume");
				time=parsenum(argstr[a],time,"length");
				if      (type===0) {snd=Audio.createguitar(1,freq,0.2,time);}
				else if (type===1) {snd=Audio.createxylophone(1,freq,0.5,time);}
				else if (type===2) {snd=Audio.createmarimba(1,freq,0.5,time);}
				else if (type===3) {snd=Audio.createglockenspiel(1,freq,0.5,time);}
				else if (type===4) {snd=Audio.createmusicbox(1,freq,time);}
				else if (type===5) {snd=Audio.createdrumhihat(1,freq,time);}
				else if (type===6) {snd=Audio.createdrumkick(1,freq,time);}
				else if (type===7) {snd=Audio.createdrumsnare(1,freq,time);}
			}
			// Add the new sound to the sub sequence.
			if (!snd) {sepdelta=0;}
			else {subsnd.add(snd,time,subvol*vol);}
			while (args>0) {argstr[--args]="";}
		}
		[Audio.randacc,Audio.randinc]=rand;
		return nextsnd;
	}


	// ----------------------------------------
	// String Instruments


	static generatestring(volume=1.0,freq=200,pos=0.5,inharm=0.00006,time=3,sndfreq=44100) {
		// Jason Pelc
		// http://large.stanford.edu/courses/2007/ph210/pelc2/
		// Stop when e^(-decay*time/sndfreq)<=cutoff
		const cutoff=1e-3;
		freq/=sndfreq;
		let harmonics=Math.ceil(0.5/freq);
		let sndlen=Math.ceil(sndfreq*time);
		let snd=new Audio.Sound(sndfreq,sndlen);
		let data=snd.data;
		// Generate coefficients.
		if (pos<0.0001) {pos=0.0001;}
		if (pos>0.9999) {pos=0.9999;}
		let listen=pos; // 0.16;
		let c0=listen*Math.PI;
		let c1=(2*volume)/(Math.PI*Math.PI*pos*(1-pos));
		let c2=freq*Math.PI*2;
		let decay=Math.log(0.01)/sndlen;
		// Process highest to lowest for floating point accuracy.
		for (let n=harmonics;n>0;n--) {
			// Calculate coefficients for the n'th harmonic.
			let n2=n*n;
			let harmvol=Math.sin(n*c0)*c1/n2;
			if (Math.abs(harmvol)<=cutoff) {continue;}
			// Correct n2 by -1 so the fundamental = freq.
			let ihscale=n*Math.sqrt(1+(n2-1)*inharm);
			let harmdecay=decay*ihscale;
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
		let end=Math.ceil(0.01*sndfreq);
		end=end<sndlen?end:sndlen;
		for (let i=0;i<end;i++) {let u=i/end;data[i]*=u;}
		end=Math.ceil(0.5*sndfreq);
		end=end<sndlen?end:sndlen;
		for (let i=0;i<end;i++) {let u=i/end;data[sndlen-1-i]*=u;}
		return snd;
	}


	static createguitar(volume=1.0,freq=200,pluck=0.5,time=3,sndfreq=44100) {
		return Audio.generatestring(volume,freq,pluck,0.000050,time,sndfreq);
	}


	static createxylophone(volume=1.0,freq=250,pos=0.5,time=2.2,sndfreq=44100) {
		// freq = constant / length^2
		return Audio.generatestring(volume,freq,pos,0.374520,time,sndfreq);
	}


	static createmarimba(volume=1.0,freq=250,pos=0.5,time=2.2,sndfreq=44100) {
		return Audio.generatestring(volume,freq,pos,0.947200,time,sndfreq);
	}


	static createglockenspiel(volume=0.2,freq=1867,pos=0.5,time=5.3,sndfreq=44100) {
		return Audio.generatestring(volume,freq,pos,0.090000,time,sndfreq);
	}


	static createmusicbox(volume=0.1,freq=877,time=3.0,sndfreq=44100) {
		return Audio.generatestring(volume,freq,0.40,0.050000,time,sndfreq);
	}


	// ----------------------------------------
	// Percussion Instruments


	static createdrumhihat(volume=0.2,freq=7000,time=0.1) {
		return (new Audio.SFX(`
			#vol : ${volume}
			#freq: ${freq}
			#time: ${time}
			#sig : NOISE H 0.7 #vol *
			#hpf : HPF F #freq I #sig
			#bpf : BPF F #freq 1.4 * I #sig
			#out : ENV A 0.005 R #time 0.005 - I #hpf #bpf`
		)).tosound(time);
	}


	static createdrumkick(volume=0.3,freq=80,time=0.2) {
		return (new Audio.SFX(`
			#vol : ${volume}
			#freq: ${freq}
			#time: ${time}
			#f   : SAW F 1 #time / L #freq H #freq .25 *
			#sig1: NOISE H 8
			#sig2: TRI F #f H 1.8
			#lpf : LPF F #f B 1.75 I #sig1 #sig2
			#out : ENV A 0.005 R #time 0.005 - I #lpf #vol *`
		)).tosound(time);
	}


	static createdrumsnare(volume=0.1,freq=200,time=0.2) {
		return (new Audio.SFX(`
			#vol : ${volume}
			#freq: ${freq}
			#time: ${time}
			#f   : SAW F 1 #time / L #freq H #freq .5 *
			#sig1: NOISE H 1
			#sig2: TRI F #f .5 * H 1
			#hpf : HPF F #f I #sig1 #sig2
			#lpf : LPF F 10000 I #hpf
			#out : ENV A 0.005 R #time 0.005 - I #lpf #vol *`
		)).tosound(time);
	}


	// ----------------------------------------
	// Wind Instruments


	static createflute(volume=1.0,freq=200,time=2.0) {
		return (new Audio.SFX(`
			#vol : ${volume}
			#freq: ${freq}
			#time: ${time}
			#noi : NOISE
			#nenv: ENV S #time .5 * I #noi
			#lpf : LPF F #freq B 2 I #nenv
			#sig : #del -.95 * #lpf
			#del : DEL T .5 #freq / M .2 I #sig
			#out : #sig`
		)).tosound(time);
	}


	static createtuba(volume=1.0,freq=300,time=2.0) {
		return (new Audio.SFX(`
			#vol : ${volume}
			#freq: ${freq}
			#time: ${time}
			#noi : NOISE
			#nenv: ENV R #time I #noi
			#lpf : LPF F #freq I #nenv
			#sig : #del .95 * #lpf
			#del : DEL T .02 M .2 I #sig
			#out : #sig`
		)).tosound(time);
	}

}

