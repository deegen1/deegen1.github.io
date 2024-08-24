/*------------------------------------------------------------------------------


audio.js - v1.00

Copyright 2024 Alec Dee - MIT license - SPDX: MIT
deegen1.github.io - akdee144@gmail.com


--------------------------------------------------------------------------------
Notes


For examples use https://freewavesamples.com or NSynth (magenta) library.
https://msp.ucsd.edu/software.html
Most sound effects have exponential decay.
Different frequencies have different decay rates based on material properties.


--------------------------------------------------------------------------------
TODO


check max volume of guitar
Maraca probability of collision vs wall, vs beads + intensity.
Based on number of beads vs relative size.
bead hit = small sine wave + fast decay
sliding guassian, middle is < 0
guitar add fret position, freq*length/(1-fret)
drums: https://www.youtube.com/watch?v=wYlOw8YXoBs
https://euphonics.org/3-3-marimbas-and-xylophones/
https://csounds.com/manual/html/MiscModalFreq.html
http://supermediocre.org/wp-content/uploads/2017/05/Lily_xylophone_paper_2017.pdf
phaser
flanger
https://www.youtube.com/watch?v=YnQoBLL0TxM
http://aspress.co.uk/ds/sound_examples.html
https://webaudioapi.com/book/Web_Audio_API_Boris_Smus_html/ch06.html#s06_3
https://webaudioapi.com/book/Web_Audio_API_Boris_Smus_html/ch06.html
guitar string diagram
quad filter diagrams
sound effects
	explosion
	hi hat
	drum kick
	sax
	thud
	marbles
	laser
	electricity
	button press
reverb only low pass notes
out of phase reverb
	look up annihilation movie ost
	play one sine wave out of sync
	off = tri(t*200)
	sin(x) + sin(x+off)

Guitar.prototype.strumChord = function(time, downstroke, velocity, chord) {
 new GuitarString(audioCtx, audioDestination, 0, 2, 4),   // E2
this.strings[stringNumber].pluck(time, velocity, chord[stringNumber]);


https://www.ee.columbia.edu/~ronw/dsp/
https://github.com/mrahtz/javascript-karplus-strong/blob/master/karplus-strong/guitarstring_asm.js

// flying saucer
sndfreq =44100
sndtime =5
sndnotes=int(sndtime*sndfreq)
sndarr =list(range(sndnotes))
umin=(1/sndfreq)*math.pi*200
umax=(1/sndfreq)*math.pi*500
uspan=0.3
j=0
for i in range(sndnotes):
	u=((i/sndfreq)%uspan)/uspan
	u=abs(u-0.5)*2
	df=u*(umax-umin)+umin
	j+=df
	sndarr[i]=math.sin(j)

*/
/* jshint esversion: 11  */
/* jshint bitwise: false */
/* jshint eqeqeq: true   */
/* jshint curly: true    */


//---------------------------------------------------------------------------------
// Audio - v1.00


class _AudioSound {

	constructor(len,freq) {
		// accepts len/path and frequency
		this.audio=Audio.def;
		this.freq=freq===undefined?44100:freq;
		this.queue=null;
		let type=typeof len;
		if (type==="number") {
			this.resize(len);
		} else if (type==="string") {
			this.loadfile(len);
		} else {
			this.resize(0);
		}
	}


	resize(size) {
		this.loaded=true;
		this.len=size;
		if (size>0) {
			this.ctxbuf=this.audio.ctx.createBuffer(1,size,this.freq);
			this.data=this.ctxbuf.getChannelData(0);
		} else {
			this.ctxbuf=null;
			this.data=new Float32Array(0);
		}
	}


	loadfile(path) {
		// Load and replace the sound with a WAV file.
		this.resize(0);
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
		let data=this.towav();
		let blob=new Blob([data]);
		let link=document.createElement("a");
		link.href=window.URL.createObjectURL(blob);
		link.download=name;
		link.click();
	}


	fromwav(data,dataidx) {
		// Load a sound from WAV data. Can handle PCM or floating point samples.
		// Converts multi-channel to mono-channel.
		if (!dataidx) {dataidx=0;}
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
				console.log("corrupt block");
				return this;
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
			console.log("could not find format or data blocks");
			return this;
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
		this.resize(samples);
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


	getvolume() {
		let data=this.data,len=data.length;
		let v=0,x;
		for (let i=0;i<len;i++) {
			x=Math.abs(data[i]);
			v=x>v?x:v;
		}
		return v;
	}


	scale(v) {
		let data=this.data,len=data.length;
		for (let i=0;i<len;i++) {
			data[i]*=v;
		}
	}

}


class _AudioInstance {

	constructor(snd,volume,pan,freq) {
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
		this.playing=true;
		this.done   =false;
		// src -> gain -> pan -> ctx
		let ctx=audio.ctx;
		this.ctx=ctx;
		this.ctxpan=ctx.createStereoPanner();
		this.setpan(pan);
		this.ctxpan.connect(ctx.destination);
		this.ctxgain=ctx.createGain();
		this.setvolume(volume);
		this.ctxgain.connect(this.ctxpan);
		let ctxsrc=ctx.createBufferSource();
		this.ctxsrc=ctxsrc;
		ctxsrc.addEventListener("ended",()=>{this.remove();});
		ctxsrc.buffer=snd.ctxbuf;
		ctxsrc.connect(this.ctxgain);
		ctxsrc.start();
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


class _AudioBiquad {
	// Biquad filter type 1
	// https://shepazu.github.io/Audio-EQ-Cookbook/audio-eq-cookbook.html

	constructor(type,rate,bandwidth,peakgain) {
		// rate = freq / sample rate
		this.type=type;
		this.rate=rate;
		this.peakgain=peakgain||0;
		this.bandwidth=bandwidth||1;
		this.x1=0;
		this.x2=0;
		this.y1=0;
		this.y2=0;
		this.calccoefs();
	}


	process(x) {
		if (x<=-Infinity || x>=Infinity || isNaN(x)) {x=0;}
		let y=this.b0*x+this.b1*this.x1+this.b2*this.x2
		               -this.a1*this.y1-this.a2*this.y2;
		this.x2=this.x1;
		this.x1=x;
		this.y2=this.y1;
		this.y1=y;
		return y;
	}


	getq() {
		let ang=2*Math.PI*this.rate;
		let sn =Math.sin(ang);
		let q  =0.5/Math.sinh(Math.log(2)*0.5*this.bandwidth*ang/sn);
		return q;
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
		if (type==="none") {
		} else if (type==="lowpass") {
			b1=1-cs;
			b0=0.5*b1;
			b2=b0;
			a0=1+a;
			a1=-2*cs;
			a2=1-a;
		} else if (type==="highpass") {
			b1=-1-cs;
			b0=-0.5*b1;
			b2=b0;
			a0=1+a;
			a1=-2*cs;
			a2=1-a;
		} else if (type==="bandpass") {
			b0=a;
			b1=0;
			b2=-b0;
			a0=1+a;
			a1=-2*cs;
			a2=1-a;
		} else if (type==="notch") {
			b0=1;
			b1=-2*cs;
			b2=b0;
			a0=1+a;
			a1=-2*cs;
			a2=1-a;
		} else if (type==="allpass") {
			b0=1-a;
			b1=-2*cs;
			b2=1+a;
			a0=b2;
			a1=b1;
			a2=b0;
		} else if (type==="peak") {
			b0=1+a*v;
			b1=-2*cs;
			b2=1-a*v;
			a0=1+a/v;
			a1=-2*cs;
			a2=1-a/v;
		} else if (type==="lowshelf") {
			b0=v*((v+1)-(v-1)*cs+vr);
			b1=2*v*((v-1)-(v+1)*cs);
			b2=v*((v+1)-(v-1)*cs-vr);
			a0=(v+1)+(v-1)*cs+vr;
			a1=-2*((v-1)+(v+1)*cs);
			a2=(v+1)+(v-1)*cs-vr;
		} else if (type==="highshelf") {
			b0=v*((v+1)+(v-1)*cs+vr);
			b1=-2*v*((v-1)+(v+1)*cs);
			b2=v*((v+1)+(v-1)*cs-vr);
			a0=(v+1)-(v-1)*cs+vr;
			a1=2*((v-1)-(v+1)*cs);
			a2=(v+1)-(v-1)*cs-vr;
		} else {
			throw "type should be none, lowpass, highpass, bandpass, allpass, notch, peak, lowshelf, or highshelf: "+type;
		}
		this.b0=b0/a0;
		this.b1=b1/a0;
		this.b2=b2/a0;
		this.a1=a1/a0;
		this.a2=a2/a0;
	}

}


class Audio {

	static Sound   =_AudioSound;
	static Instance=_AudioInstance;
	static Biquad  =_AudioBiquad;

	// The default context used for audio functions.
	static def=null;


	constructor() {
		let con=this.constructor;
		Object.assign(this,con);
		if (con.def===null) {con.def=this;}
		this.freq=44100;
		this.queue=null;
		let ctx=new AudioContext({latencyHint:"interactive",sampleRate:this.freq});
		this.ctx=ctx;
		if (Audio.def===null) {
			Audio.def=this;
		}
	}


	static initdef() {
		if (!Audio.def) {new Audio();}
		return Audio.def;
	}


	play(snd,volume,pan,freq) {
		return new _AudioInstance(snd,volume,pan,freq);
	}


	setsound(snd) {
	}


	// ----------------------------------------
	// DCT


	static dct(arr,start,len) {
		// Computes the discrete cosine transform. Converts an array into a sum of
		// cosines.
		if (arr.data!==undefined) {arr=arr.data;}
		if (start===undefined) {start=0;}
		if (len===undefined) {len=arr.length-start;}
		if (start<0 || start+len>arr.length) {
			console.log("dct indices out of bounds:",start,len);
			return [];
		}
		if (len<=0) {return [];}
		// If len isn't a power of 2, pad it with 0's. Swap array elements to reproduce
		// the recursion of the standard FFT algorithm.
		let bits=0,nlen=1;
		while (nlen<len) {nlen+=nlen;bits++;}
		let real=new Array(nlen);
		let imag=new Array(nlen);
		for (let i=0;i<nlen;i++) {
			let rev=0,j=(i&1)?(nlen-1-(i>>1)):(i>>1);
			for (let b=0;b<bits;b++) {rev+=rev+((j>>>b)&1);}
			real[i]=rev<len?arr[start+rev]:0;
			imag[i]=0;
		}
		// Butterfly transform.
		for (let part=2;part<=nlen;part+=part) {
			let hpart=part>>>1,inc=Math.PI/hpart,ang=0;
			for (let h=0;h<hpart;h++) {
				let wr=Math.cos(ang),wi=Math.sin(ang);
				ang+=inc;
				for (let i=h;i<nlen;i+=part) {
					let j=i+hpart;
					let ur=real[i],ui=imag[i];
					let vr=real[j],vi=imag[j];
					let tr=wr*vr-wi*vi;
					let ti=wi*vr+wr*vi;
					real[i]=ur+tr;
					imag[i]=ui+ti;
					real[j]=ur-tr;
					imag[j]=ui-ti;
				}
			}
		}
		// Convert FFT output to DCT and scale it.
		real[0]/=nlen;
		let inc=Math.PI/(2*nlen),ang=0,norm=2/nlen;
		for (let i=1;i<nlen;i++) {
			ang+=inc;
			let wr=Math.cos(ang),wi=Math.sin(ang);
			real[i]=(real[i]*wr-imag[i]*wi)*norm;
		}
		return real;
	}


	static idct(arr,start,len) {
		// Inverse discrete cosine transform. Converts coefficients of cosines into the
		// original array.
		if (arr.data!==undefined) {arr=arr.data;}
		if (start===undefined) {start=0;}
		if (len===undefined) {len=arr.length-start;}
		if (start<0 || start+len>arr.length) {
			console.log("idct indices out of bounds:",start,len);
			return [];
		}
		if (len<=0) {return [];}
		// If len isn't a power of 2, pad it with 0's. Undo the final rotation of the
		// DCT and swap the array elements to reproduce recursion.
		let bits=0,nlen=1;
		while (nlen<len) {nlen+=nlen;bits++;}
		let real=new Array(nlen);
		let imag=new Array(nlen);
		let inc=Math.PI/(2*nlen);
		for (let i=0;i<nlen;i++) {
			let rev=0;
			for (let b=0;b<bits;b++) {rev+=rev+((i>>>b)&1);}
			let val=rev<len?arr[start+rev]:0,ang=rev*inc;
			real[i]=val*Math.cos(ang);
			imag[i]=val*Math.sin(ang);
		}
		// Butterfly transform.
		for (let part=2;part<=nlen;part+=part) {
			let hpart=part>>>1,inc=Math.PI/hpart,ang=0;
			for (let h=0;h<hpart;h++) {
				let wr=Math.cos(ang),wi=Math.sin(ang);
				ang+=inc;
				for (let i=h;i<nlen;i+=part) {
					let j=i+hpart;
					let ur=real[i],ui=imag[i];
					let vr=real[j],vi=imag[j];
					let tr=wr*vr-wi*vi;
					let ti=wi*vr+wr*vi;
					real[i]=ur+tr;
					imag[i]=ui+ti;
					real[j]=ur-tr;
					imag[j]=ui-ti;
				}
			}
		}
		// Convert undo initial DCT permutation.
		for (let i=0;i<nlen;i++) {
			let j=(i&1)?(nlen-1-(i>>1)):(i>>1);
			imag[i]=real[j];
		}
		return imag;
	}


	static dctsample(arr,idx) {
		// Computes an individual coefficient of the DCT.
		let len=arr.length;
		let sum=0;
		if (idx===0) {
			for (let i=0;i<len;i++) {sum+=arr[i];}
			return sum/len;
		}
		let inc=Math.PI*(idx/len),ang=inc*0.5;
		for (let i=0;i<len;i++) {
			sum+=Math.cos(ang)*arr[i];
			ang+=inc;
		}
		return sum*2/len;
	}


	static idctsample(arr,idx) {
		// Computes an element of the original array given DCT coefficients.
		let len=arr.length;
		let inc=Math.PI*(idx+0.5)/len,ang=0,sum=0;
		for (let i=0;i<len;i++) {
			sum+=Math.cos(ang)*arr[i];
			ang+=inc;
		}
		return sum;
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
		if (x>1) {return 1-x;}
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
		// PRNG noise with interpolation for different frequencies.
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


	static clamp(x,min,max) {
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
	// Generators


	static createstring(sndfreq,freq,volume,pos,inharm,harmexp,decay) {
		// Jason Pelc
		// http://large.stanford.edu/courses/2007/ph210/pelc2/
		if (freq===undefined) {freq=220;}
		if (pos===undefined) {pos=0.21;}
		pos=pos>0.00001?pos:0.00001;
		pos=pos<0.99999?pos:0.99999;
		if (volume===undefined) {volume=1;}
		const cutoff=1e-4;
		// Generate coefficients.
		let c0=inharm*inharm;
		let c1=pos*Math.PI;
		let c2=(2*volume)/(Math.PI*c1*(1-pos));
		let c3=freq*2*Math.PI;
		let coefs=Math.ceil(sndfreq/(2*freq));
		// Stop when e^(-decay*time/sndfreq)<=cutoff
		let sndlen=Math.ceil(-Math.log(cutoff)*sndfreq/decay);
		let snd=new Audio.Sound(sndlen,sndfreq);
		let snddata=snd.data;
		for (let n=coefs;n>0;n--) {
			// Calculate coefficients for the n'th harmonic.
			// Go highest to lowest for floating point accuracy.
			let n2=n*n;
			let harmmul=Math.sin(n*c1)*c2/n2;
			if (Math.abs(harmmul)<=cutoff) {continue;}
			// Correct n2 by -1 so the fundamental = freq.
			//let harmfreq=n*c3*Math.sqrt(1+n2*c0)/sndfreq;
			let harmfreq=n*c3*Math.sqrt(1+(n2-1)*c0)/sndfreq;
			//console.log(harmfreq*sndfreq/(Math.PI*2),harmmul);
			let dscale=-decay*Math.pow(n,harmexp)/sndfreq;
			let harmlen=Math.ceil(Math.log(cutoff/Math.abs(harmmul))/dscale);
			if (harmlen>sndlen) {harmlen=sndlen;}
			// Generate the waveform.
			let harmphase=0;
			let harmdecay=Math.exp(dscale);
			for (let i=0;i<harmlen;i++) {
				snddata[i]+=harmmul*Math.sin(harmphase);
				harmmul*=harmdecay;
				harmphase+=harmfreq;
			}
		}
		return snd;
	}


	static createguitar(sndfreq,freq,pluck,volume) {
		// freq ~ 220 hz, volume ~ 1.0
		return Audio.createstring(sndfreq,freq,volume,pluck,0.0092,1.0,1.7);
	}


	static createbassguitar(sndfreq,freq,pluck,volume) {
		// freq ~ 80 hz, volume ~ 1.0
		return Audio.createstring(sndfreq,freq,volume,pluck,0.0092,2.0,1.7);
	}


	static createmarimba(sndfreq,freq,pos,volume) {
		// freq ~ 250 hz, volume ~ 1.0
		// length = 3924cm/freq
		return Audio.createstring(sndfreq,freq,volume,pos,0.40,2.0,3.2);
	}


	static createglockenspiel(sndfreq,freq,pos,volume) {
		// freq ~ 1873 hz, volume ~ 0.2
		return Audio.createstring(sndfreq,freq,volume,pos,0.30,2.0,1.3);
	}


	static createmusicbox(sndfreq,freq,volume) {
		// freq ~ 877 hz, volume ~ 0.1
		return Audio.createstring(sndfreq,freq,volume,0.40,0.32,1.0,2.2);
	}

}

