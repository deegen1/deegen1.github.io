/*------------------------------------------------------------------------------


audio.js - v2.02

Copyright 2024 Alec Dee - MIT license - SPDX: MIT
deegen1.github.io - akdee144@gmail.com


--------------------------------------------------------------------------------
Notes


NSynth (magenta) library
https://csounds.com/manual/html/MiscModalFreq.html
http://aspress.co.uk/sd/index.html
https://petersalomonsen.com/articles/assemblyscriptphysicalmodelingsynthesis/
assemblyscriptphysicalmodelingsynthesis.html


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
     Improved the sequencer: added default notes to instruments to make it
     easier to start scripting.
     Changed flat note notation from abc to AbBbCb etc.
     Added line numbers to errors.


--------------------------------------------------------------------------------
TODO


Remove scalevol() for sound effect normalization.
Waveguides
	https://www.osar.fr/notes/waveguides/
	https://www.ee.columbia.edu/~ronw/dsp/
	Use excitation wave and comb filters. Don't add them together.
	Splitting into N bands and adding them together increases the gain by N.
	Or subtract from signal as different filters process the sample.
	https://petersalomonsen.com/articles/assemblyscriptphysicalmodelingsynthesis/assemblyscriptphysicalmodelingsynthesis.html
Audio.update
	If a song was played while silenced, skip to it's current time upon resume.
Drums
	Use biquad updatecoefs() for snare.
	snare:
		energy level, scale freq and noise off of it
		noise: simulate frequency of wires hitting based on energy
	kick:
		random noise and down freq, like thud
	hihat:
		random noise and up freq
Make a comparison between new and old versions.
See if response() phase is correct. Compare against intermediate values in
calccoefs()?
editor
	deegen.org/audio/beatrix.html
	deegen.org/beatrix
	Name for music maker: beatrix
	anime music girl on drums
https://www.youtube.com/watch?v=Nrs8fPdi82w


*/
/* jshint esversion: 11  */
/* jshint bitwise: false */
/* jshint eqeqeq: true   */
/* jshint curly: true    */


//---------------------------------------------------------------------------------
// Audio - v2.02


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
		let oldlen=olddata?olddata.length:0;
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
		else if (isNaN(pan) || pan===undefined || pan===null) {pan=0;}
		this.pan=pan;
		if (!this.done) {
			this.ctxpan.pan.setValueAtTime(this.pan,this.ctx.currentTime);
		}
	}


	setvolume(vol) {
		if (isNaN(vol) || vol===undefined || vol===null) {vol=1;}
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

	static NONE     =0;
	static LOWPASS  =1;
	static HIGHPASS =2;
	static BANDPASS =3;
	static NOTCH    =4;
	static ALLPASS  =5;
	static PEAK     =6;
	static LOWSHELF =7;
	static HIGHSHELF=8;


	constructor(type,rate,bandwidth=1,peakgain=0) {
		// Bandwidth in kHz.
		// rate = freq / sample rate
		this.type=type;
		this.rate=rate;
		this.peakgain=peakgain;
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


	updatecoefs(type,rate,bandwidth=1,peakgain=0) {
		if (this.type!==type || this.rate!==rate || this.bandwidth!==bandwidth || this.peakgain!==peakgain) {
			this.type=type;
			this.rate=rate;
			this.peakgain=peakgain;
			this.bandwidth=bandwidth;
			this.calccoefs();
		}
	}


	calccoefs() {
		let b0=1,b1=0,b2=0;
		let a0=1,a1=0,a2=0;
		let v  =Math.exp(this.peakgain/(Math.log(10)*40));
		let ang=2*Math.PI*this.rate;
		let sn =Math.sin(ang);
		let cs =Math.cos(ang);
		let q  =0.5/Math.sinh(Math.log(2)*0.5*this.bandwidth*ang/sn);
		let a  =sn/(2*q);
		let vr =2*Math.sqrt(v)*a;
		let type=this.type;
		if (type===_AudioBiquad.NONE) {
		} else if (type===_AudioBiquad.LOWPASS) {
			b1=1-cs;
			b0=0.5*b1;
			b2=b0;
			a0=1+a;
			a1=-2*cs;
			a2=1-a;
		} else if (type===_AudioBiquad.HIGHPASS) {
			b1=-1-cs;
			b0=-0.5*b1;
			b2=b0;
			a0=1+a;
			a1=-2*cs;
			a2=1-a;
		} else if (type===_AudioBiquad.BANDPASS) {
			b0=a;
			b1=0;
			b2=-b0;
			a0=1+a;
			a1=-2*cs;
			a2=1-a;
		} else if (type===_AudioBiquad.NOTCH) {
			b0=1;
			b1=-2*cs;
			b2=b0;
			a0=1+a;
			a1=-2*cs;
			a2=1-a;
		} else if (type===_AudioBiquad.ALLPASS) {
			b0=1-a;
			b1=-2*cs;
			b2=1+a;
			a0=b2;
			a1=b1;
			a2=b0;
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
	static randstate=0;


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
	// NaN and infinite values return 0 or the minimum value.


	static sin1(x) {
		x%=1.0;
		if (isNaN(x)) {return 0;}
		return Math.sin(x*6.2831853071795864769252866)*0.5+0.5;
	}


	static sin(x) {
		x%=1.0;
		if (isNaN(x)) {return 0;}
		return Math.sin(x*6.2831853071795864769252866);
	}


	static saw1(x) {
		//   /|  /|  /|
		//  / | / | / |
		// /  |/  |/  |
		x%=1.0;
		if (x<0) {x+=1;}
		return x>=0?x:0;
	}


	static saw(x) {
		return Audio.saw1(x+0.5)*2-1;
	}


	static tri1(x) {
		//   /\    /\    /
		//  /  \  /  \  /
		// /    \/    \/
		x%=1.0;
		if (x<0) {x+=1;}
		x*=2;
		if (x>1) {return 2-x;}
		return x>0?x:0;
	}


	static tri(x) {
		return Audio.tri1(x+0.25)*2-1;
	}


	static sqr1(x) {
		//    __    __
		//   |  |  |  |
		//   |  |  |  |
		// __|  |__|  |__
		x%=1.0;
		if (x<0) {x+=1;}
		return x>0.5?1:0;
	}


	static sqr(x) {
		return Audio.sqr1(x)*2-1;
	}


	static noise1(x) {
		// Noise with interpolation. If undefined, acts as a PRNG.
		// Returns a value in [0,1].
		if (x===undefined) {
			x=Audio.randstate;
			Audio.randstate=(x+1)>>>0;
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
		// Converts a shorthand string into music.
		// Everything is processed top to bottom, left to right.
		//
		//   Symbol |             Description             |  Parameters
		//  --------+-------------------------------------+-----------------
		//   AG     | Acoustic Guitar                     | [note=A3] [len]
		//   XY     | Xylophone                           | [note=C4] [len]
		//   MR     | Marimba                             | [note=C4] [len]
		//   GS     | Glockenspiel                        | [note=A6] [len]
		//   KD     | Kick Drum                           | [note=B2] [len]
		//   SD     | Snare Drum                          | [note=G2] [len]
		//   HH     | Hihat                               | [note=A8] [len]
		//   VOL    | Sets volume. Resets every sequence. | [1.0]
		//   BPM    | Beats per minute.                   | [240]
		//   CUT    | Cuts off sequence at time+delta.    | [delta=0]
		//   ,      | Separate and advance time by 1 BPM. |
		//   , X    | Separate and advance time by X BPM. |
		//   '      | Line Comment.                       |
		//   "      | Block comment. Terminate with "     |
		//   #bass: | Define a sequence named #bass.      |
		//   #bass  | Reference a sequence named #bass.   |
		//   #out:  | Final output sequence.              |
		//
		// notes = B, Bb, A#, A, Ab, G#, G, Gb, F#, F, Fb, E, Eb, D#, D, Db, C#, C
		// Ex: A4, B#12.5, C-1
		let seqpos=0,seqlen=seq.length;
		let parammax=5;
		let paramstr=new Array(parammax);
		let params=0;
		let bpm=240,time=0,vol=1;
		let sepdelta=0;
		// ,:'"
		let stoptoken={44:true,58:true,39:true,34:true};
		// freq = 440*2^(-note/12+octave)
		let notearr=[
			["Bb",47],["B",46],
			["A#",47],["Ab",49],["A",48],
			["G#",49],["Gb",51],["G",50],
			["F#",51],["F",52],
			["Eb",54],["E",53],
			["D#",54],["Db",56],["D",55],
			["C#",56],["C",57]
		];
		let sequences={
			"BPM": {id: 1, max:2, def:240},
			"VOL": {id: 2, max:2, def:1},
			"CUT": {id: 3, max:2, def:0},
			"AG" : {id:10, max:2, freq:"A3"},
			"XY" : {id:11, max:2, freq:"C4"},
			"MR" : {id:12, max:2, freq:"C4"},
			"GS" : {id:13, max:2, freq:"A6"},
			"KD" : {id:14, max:2, freq:"B2"},
			"SD" : {id:15, max:2, freq:"G2"},
			"HH" : {id:16, max:2, freq:"A8"}
		};
		let subsnd=null,nextsnd=null;
		function parsenum(str,def) {
			// Parse numbers in format: [+-]\d*\.?\d*
			if (!str) {str=def;}
			let len=str.length,i=0;
			let c=i<len?str.charCodeAt(i):0;
			let neg=0;
			if (c===45) {i++;neg=1;}
			else if (c===43) {i++;}
			else if ((c<48 || c>57) && c!==46) {return NaN;}
			let num=0;
			while (i<len && (c=str.charCodeAt(i))>=48 && c<=57) {
				i++;
				num=num*10+(c-48);
			}
			if (c===46) {
				let den=1;
				while (i<len && (c=str.charCodeAt(++i))>=48 && c<=57) {
					den/=10;
					num+=(c-48)*den;
				}
			}
			if (i<len) {return NaN;}
			return neg?-num:num;
		}
		function parsenote(str,def) {
			// Convert a piano note to a frequency. Ex: A4 = 440hz
			if (!str) {str=def;}
			let slen=str.length;
			let pick=null;
			for (let note of notearr) {
				let nstr=note[0],nlen=nstr.length,i=0;
				while (i<nlen && i<slen && nstr[i]===str[i]) {i++;}
				if (i===nlen) {pick=note;break;}
			}
			let freq=NaN;
			if (pick) {
				let oct=parsenum(str.substring(pick[0].length));
				freq=440*Math.pow(2,-pick[1]/12+oct);
			}
			return freq;
		}
		function error(msg) {
			let line=1;
			for (let i=0;i<seqpos;i++) {line+=seq.charCodeAt(i)===10;}
			throw msg+":\nLine  : "+line+"\nParams: "+paramstr.slice(0,params).join(" ");
		}
		while (seqpos<seqlen || params>0) {
			// We've changed sequences.
			if (!Object.is(subsnd,nextsnd)) {
				subsnd=nextsnd;
				time=0;
				vol=1;
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
				if (!params) {error("Invalid label");}
				let name=paramstr[--params];
				paramstr[params]="";
				if (!name || sequences[name]) {error("'"+name+"' already defined");}
				nextsnd=new Audio.Sound();
				sequences[name]=nextsnd;
			} else if (seqpos<seqlen) {
				// Read the next token.
				if (params>=parammax) {error("Too many parameters");}
				let start=seqpos;
				while (seqpos<seqlen && (c=seq.charCodeAt(seqpos))>32 && !stoptoken[c]) {seqpos++;}
				paramstr[params++]=seq.substring(start,seqpos);
				continue;
			}
			// Parse current tokens. Check for a time delta.
			let p=0;
			let delta=parsenum(paramstr[p++]);
			if (isNaN(delta)) {delta=sepdelta;p--;}
			sepdelta=1;
			time+=delta*60/bpm;
			if (!(time>0)) {time=0;}
			if (!params) {continue;}
			// Find the instrument or sequence to play.
			let inst=sequences[paramstr[p++]];
			let type=inst?inst.id:undefined;
			let pmax=p-1+(inst.max?inst.max:1);
			if (params>pmax) {error("Too many parameters");}
			let snd=null;
			if (inst===undefined) {
				error("Unrecognized instrument");
			} else if (type===undefined) {
				// Load a sound.
				snd=inst;
			} else if (type===1) {
				bpm=parsenum(paramstr[p],inst.def);
				if (!(bpm>0.01)) {error("Invalid BPM");}
			} else if (type===2) {
				vol=parsenum(paramstr[p],inst.def);
				if (isNaN(vol)) {error("Invalid volume");}
			} else if (type===3) {
				time-=parsenum(paramstr[p],inst.def);
				if (subsnd) {subsnd.resizetime(time);}
			} else {
				// Load a predefined instrument.
				let freq=parsenote(paramstr[p],inst.freq);
				// let time=parsenum(p++,4);
				// let nvol=parsenum(p++,vol);
				if (isNaN(freq)) {error("Invalid note");}
				else if (type===10) {snd=Audio.createguitar(1,freq,0.2);}
				else if (type===11) {snd=Audio.createxylophone(1,freq);}
				else if (type===12) {snd=Audio.createmarimba(1,freq);}
				else if (type===13) {snd=Audio.createglockenspiel(1,freq);}
				else if (type===14) {snd=Audio.createdrumkick(1,freq);}
				else if (type===15) {snd=Audio.createdrumsnare(1,freq);}
				else if (type===16) {snd=Audio.createdrumhihat(1,freq);}
			}
			if (snd && subsnd) {subsnd.add(snd,time,vol);}
			while (params>0) {paramstr[--params]="";}
		}
		subsnd=sequences["#out"];
		if (!subsnd) {throw "#out not defined";}
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
		let gain=new Audio.Envelope([Audio.Envelope.LIN,0.01,volume,Audio.Envelope.EXP,time-0.01,0]);
		let hp=new Audio.Biquad(Audio.Biquad.HIGHPASS,freq/sndfreq);
		let bp=new Audio.Biquad(Audio.Biquad.BANDPASS,freq*1.4/sndfreq);
		let seed=Math.floor(Audio.noise1()*0xffffff);
		let data=snd.data;
		for (let i=0;i<len;i++) {
			let t=i/sndfreq;
			let x=Audio.noise(seed+i);
			x=bp.process(x);
			x=hp.process(x);
			x=Audio.clip(x,-1,1);
			data[i]=x*gain.get(t);
		}
		return snd;
	}


	static createdrumkick(volume=1.0,freq=120,time=0.2,sndfreq=44100) {
		let len=Math.ceil(time*sndfreq);
		let snd=new Audio.Sound(sndfreq,len);
		let gain=new Audio.Envelope([Audio.Envelope.LIN,0.01,volume*0.5,Audio.Envelope.LIN,time-0.01,0]);
		let freq1=freq/sndfreq,freq2=freq1*0.41;
		let osc1=new Audio.Envelope([Audio.Envelope.CON,0,freq1,Audio.Envelope.LIN,0.01,freq1,Audio.Envelope.LIN,time-0.01,freq1*0.2]);
		let osc2=new Audio.Envelope([Audio.Envelope.CON,0,freq2,Audio.Envelope.LIN,0.01,freq2,Audio.Envelope.LIN,time-0.01,freq2*0.2]);
		let phase1=Audio.noise()*3.141592654,phase2=Audio.noise()*3.141592654;
		let data=snd.data;
		for (let i=0;i<len;i++) {
			let t=i/sndfreq;
			let x=Audio.sin(phase1)+Audio.sin(phase2);
			phase1+=osc1.get(t);
			phase2+=osc2.get(t);
			data[i]=x*gain.get(t);
		}
		return snd;
	}


	static createdrumsnare(volume=1.0,freq=100,time=0.2,sndfreq=44100) {
		let len=Math.ceil(time*sndfreq);
		let snd=new Audio.Sound(sndfreq,len);
		let gain=new Audio.Envelope([Audio.Envelope.LIN,0.01,volume,Audio.Envelope.EXP,time-0.01,0]);
		let freq1=freq/sndfreq,freq2=freq1*0.41;
		let osc1=new Audio.Envelope([Audio.Envelope.CON,0,freq1,Audio.Envelope.LIN,0.01,freq1,Audio.Envelope.LIN,time-0.01,freq1*0.2]);
		let osc2=new Audio.Envelope([Audio.Envelope.CON,0,freq2,Audio.Envelope.LIN,0.01,freq2,Audio.Envelope.LIN,time-0.01,freq2*0.2]);
		let oscn=new Audio.Envelope([Audio.Envelope.LIN,time,1]);
		let seed=Math.floor(Audio.noise1()*0xffffff);
		let phase1=Audio.noise()*3.141592654,phase2=Audio.noise()*3.141592654;
		let hp0=new Audio.Biquad(Audio.Biquad.HIGHPASS,freq/sndfreq);
		let hp1=new Audio.Biquad(Audio.Biquad.HIGHPASS,10*freq/sndfreq);
		let data=snd.data;
		for (let i=0;i<len;i++) {
			let t=i/sndfreq;
			let n=Audio.noise(seed+i);
			let n0=hp0.process(n);
			let n1=hp1.process(n);
			n=n0+oscn.get(t)*(n1-n0);
			let x=(Audio.sin(phase1)+Audio.sin(phase2))*0.5*0.2+n*0.8;
			phase1+=osc1.get(t);
			phase2+=osc2.get(t);
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
			let x=Audio.saw1((seed+i)*freq0)+Audio.saw1((seed+i)*freq1);
			x=Audio.clip(x-1,-0.5,0.5);
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

