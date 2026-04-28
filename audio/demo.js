/*------------------------------------------------------------------------------


demo.js - v1.06

Copyright 2024 Alec Dee - MIT license - SPDX: MIT
2dee.net - akdee144@gmail.com


--------------------------------------------------------------------------------
TODO


*/
/* npx eslint demo.js -c ../../standards/eslint.js */


import {Audio} from "./audio.js";
import {Input,Random} from "./library.js";
Audio.initdef().mute(0);


//---------------------------------------------------------------------------------
// Guitar Strings


class DemoInst {

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
				let note =["A3","C4","C4","A6","A5","A8","B2","G3"][type];
				let ntime=[3.0,2.2,2.2,5.3,3.0,0.1,0.2,0.2][type];
				let freq =parsenote(argstr[a++],note,"note or frequency");
				vol=parsenum(argstr[a++],1,"volume");
				ntime=parsenum(argstr[a],ntime,"length");
				if      (type===0) {snd=DemoInst.createguitar(1,freq,0.2,ntime);}
				else if (type===1) {snd=DemoInst.createxylophone(1,freq,0.5,ntime);}
				else if (type===2) {snd=DemoInst.createmarimba(1,freq,0.5,ntime);}
				else if (type===3) {snd=DemoInst.createglockenspiel(1,freq,0.5,ntime);}
				else if (type===4) {snd=DemoInst.createmusicbox(1,freq,ntime);}
				else if (type===5) {snd=DemoInst.createdrumhihat(1,freq,ntime);}
				else if (type===6) {snd=DemoInst.createdrumkick(1,freq,ntime);}
				else if (type===7) {snd=DemoInst.createdrumsnare(1,freq,ntime);}
			}
			// Add the new sound to the sub sequence.
			if (!snd) {sepdelta=0;}
			else {subsnd.add(snd,time,subvol*vol);}
			while (args>0) {argstr[--args]="";}
		}
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
		let rnd=new Random();
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
			let harmphase=rnd.gets()*3.141592654;
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
		return DemoInst.generatestring(volume,freq,pluck,0.000050,time,sndfreq);
	}


	static createxylophone(volume=1.0,freq=250,pos=0.5,time=2.2,sndfreq=44100) {
		// freq = constant / length^2
		return DemoInst.generatestring(volume,freq,pos,0.374520,time,sndfreq);
	}


	static createmarimba(volume=1.0,freq=250,pos=0.5,time=2.2,sndfreq=44100) {
		return DemoInst.generatestring(volume,freq,pos,0.947200,time,sndfreq);
	}


	static createglockenspiel(volume=0.2,freq=1867,pos=0.5,time=5.3,sndfreq=44100) {
		return DemoInst.generatestring(volume,freq,pos,0.090000,time,sndfreq);
	}


	static createmusicbox(volume=0.1,freq=877,time=3.0,sndfreq=44100) {
		return DemoInst.generatestring(volume,freq,0.40,0.050000,time,sndfreq);
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


//---------------------------------------------------------------------------------
// Guitar Strings


export class StringSim {

	constructor(canvid,autotext,autoplay) {
		// Lengths are in cm.
		let st=this;
		let can=document.getElementById(canvid);
		this.stringlen=63.00;
		this.pluckpos=51.53;
		this.frets=22;
		let fretpos=new Array(this.frets+1);
		fretpos[0]=0;
		for (let i=1;i<=this.frets;i++) {
			fretpos[i]=fretpos[i-1]+(this.stringlen-fretpos[i-1])/18;
		}
		this.stringmin=this.stringlen-fretpos[this.frets];
		this.fretpos=fretpos;
		let fretdots=[
			{x: 2,y:0},
			{x: 4,y:0},
			{x: 6,y:0},
			{x: 8,y:0},
			{x:10,y:1.5},
			{x:10,y:-1.5},
			{x:12,y:0}
		];
		for (let i=0;i<fretdots.length;i++) {
			let dot=fretdots[i];
			dot.x=(fretpos[dot.x]+fretpos[dot.x+1])*0.5/(this.stringlen-this.stringmin);
		}
		this.fretdots=fretdots;
		let strings=[
			{name:"e",freq:329.63,vol:0.40},
			{name:"B",freq:246.94,vol:0.50},
			{name:"G",freq:196.00,vol:0.60},
			{name:"D",freq:146.83,vol:0.70},
			{name:"A",freq:110.00,vol:0.80},
			{name:"E",freq: 82.41,vol:0.90}
		];
		for (let i=0;i<strings.length;i++) {
			let u=i/(strings.length-1),v=1-u,n=255.99/Math.sqrt(u*u+v*v);
			strings[i].color="rgb("+Math.floor(v*n)+",0,"+Math.floor(u*n)+",";
		}
		this.strings=strings;
		this.scale=-1;
		this.input=new Input(can);
		this.input.disablenav();
		this.canvas=can;
		this.ctx=can.getContext("2d");
		this.pluckarr=[];
		this.plucks=0;
		this.click=-1;
		this.hover=-1;
		// Automatic player.
		this.autopausetime=0.1138;
		this.autoplucktime=0.01;
		this.autotime=0;
		this.autonotes=[];
		this.autopos=0xffffffff;
		this.autotext=document.getElementById(autotext);
		if (this.autotext) {
			this.autoplay=document.getElementById(autoplay);
			if (this.autoplay) {this.autoplay.onclick=function(){st.autotoggle();return false;};}
		}
		function update() {
			setTimeout(update,8);
			st.update();
		}
		update();
	}


	playstring(id,fret) {
		// Generate the string sound and visual cues.
		let pad=1/20,lx0=pad,lx1=1-pad;
		let str=this.strings[id];
		let len=this.stringlen,min=this.stringmin;
		fret=fret>0?fret:0;
		fret=fret<1?fret:1;
		let x=lx0+fret*(lx1-lx0);
		fret=(1-fret)*(len-min)+min;
		let pluck=1-(len-this.pluckpos)/fret;
		DemoInst.createguitar(str.vol,str.freq*len/fret,pluck).play();
		// Audio.SFX.defplay("string",str.vol,str.freq*len/fret);
		this.pluckarr[this.plucks++]={time:performance.now(),x:x,y:(id+0.75)*pad,str:str};
	}


	autotoggle() {
		// If we're already playing, stop and reset.
		let notelen=this.autonotes.length;
		if (this.autopos<notelen) {
			this.autopos=notelen;
			this.autoplay.innerHTML="&#9658; play";
			return;
		}
		// Restart the autoplay state and parse the text box.
		this.autotime=performance.now();
		this.autopos=0;
		this.autonotes=[];
		let text=this.autotext.value;
		text=text.replace(/[^ABDGEe\d-]/g,'');
		let strmap={"e":0,"B":1,"G":2,"D":3,"A":4,"E":5};
		let len=text.length;
		let time=0;
		let chordtime=0;
		let fretpos=this.fretpos;
		for (let i=0;i<len;i++) {
			let c=text[i];
			let id=strmap[c];
			if (id!==undefined) {
				let fret=0;
				while (i+1<len) {
					let n=text.charCodeAt(i+1);
					if (n<48 || n>57) {break;}
					i++;
					fret=fret*10+n-48;
				}
				fret=fret<22?fret:22;
				fret=fret>0?fret:0;
				let pos=fretpos[fret]/fretpos[this.frets];
				this.autonotes[this.autonotes.length]={time:time+chordtime,id:id,fret:pos};
				chordtime+=this.autoplucktime;
			} else if (c==="-") {
				time+=this.autopausetime;
				chordtime=0;
			}
		}
		this.autoplay.innerHTML="&#9632; stop";
	}


	autoupdate() {
		// Play the notes.
		let notes=this.autonotes;
		let notelen=notes.length;
		let notepos=this.autopos;
		if (notepos>=notelen) {return;}
		let time=(performance.now()-this.autotime)/1000;
		while (notepos<notelen && notes[notepos].time<=time) {
			let note=notes[notepos++];
			this.playstring(note.id,note.fret);
		}
		this.autopos=notepos;
		if (notepos>=notelen) {
			this.autoplay.innerHTML="&#9658; play";
		}
	}


	update() {
		let can=this.canvas;
		let scale=can.scrollWidth;
		let input=this.input;
		input.update();
		this.autoupdate();
		let pad=1/20,lx0=pad,lx1=1-pad;
		// See if we're hovering over a string.
		let [mx,my]=input.getmousepos();
		mx/=scale;
		my/=scale;
		let strings=this.strings;
		let x0=pad*0.75,x1=1-pad*0.75;
		let hover=-1;
		if (mx>=x0 && mx<=x1) {
			let c=my/pad-0.35,i=Math.floor(c);
			if (c-i<0.80 && i>=0 && i<strings.length) {hover=i;}
		}
		// If we're clicking.
		let click=-1;
		if (input.getkeydown(input.MOUSE.LEFT)) {
			click=hover;
			if (hover>=0 && this.click!==click) {
				let fret=(mx-lx0)/(lx1-lx0);
				this.playstring(click,fret);
			}
		}
		this.click=click;
		// Redraw strings and plucks.
		let plucks=this.plucks;
		if (plucks>0 || this.scale!==scale || this.hover!==hover) {
			this.hover=hover;
			let ctx=this.ctx;
			if (this.scale!==scale) {
				this.scale=scale;
				can.width=scale;
				can.height=Math.round((strings.length+0.5)*(scale/20));
				// Reset the context after a resize event.
				ctx.textAlign="center";
				ctx.textBaseline="middle";
				ctx.strokeStyle="#ffffff";
				ctx.font=(scale/40).toFixed(0)+"px monospace";
			}
			ctx.fillStyle="#000000";
			ctx.fillRect(0,0,can.width,can.height);
			ctx.fillStyle="#ffffff";
			let fretdots=this.fretdots;
			let midy=(strings.length+0.5)/40;
			let fscale=lx1-lx0;
			for (let i=0;i<fretdots.length;i++) {
				let dot=fretdots[i];
				ctx.beginPath();
				ctx.arc((lx0+dot.x*fscale)*scale,(midy+dot.y*pad)*scale,scale*0.0075,0,Math.PI*2);
				ctx.fill();
			}
			for (let i=0;i<strings.length;i++) {
				let str=strings[i],y=(i+0.75)*pad*scale,t=scale*0.0015;
				if (i===hover) {t*=3;}
				ctx.fillText(str.name,scale*0.025,y);
				ctx.fillRect(lx0*scale,y-t*0.5,(lx1-lx0)*scale,t);
			}
			let pluckarr=this.pluckarr;
			for (let i=plucks-1;i>=0;i--) {
				let p=pluckarr[i];
				let t=(performance.now()-p.time)/1000;
				let a=Math.exp(-1.316*t);
				if (a>=0.01) {
					ctx.fillStyle=p.str.color+a.toFixed(6)+")";
					ctx.beginPath();
					ctx.arc(p.x*scale,p.y*scale,scale*0.0225,0,Math.PI*2);
					ctx.fill();
				} else {
					pluckarr[i]=pluckarr[--plucks];
					pluckarr[plucks]=p;
				}
			}
			this.plucks=plucks;
		}
	}

}


//---------------------------------------------------------------------------------
// Xylophone


export class XylophoneSim {

	constructor(canvid) {
		// Lengths are in cm.
		let can=document.getElementById(canvid);
		this.bars=new Array(15);
		for (let i=0;i<this.bars.length;i++) {
			let len=22.2-0.614285*i;
			let u=i/(this.bars.length-1),v=1-u,n=255.99/Math.sqrt(u*u+v*v);
			this.bars[i]={
				color:"rgb("+Math.floor(v*n)+",0,"+Math.floor(u*n)+",",
				freq:98568/(len*len),
				len:len,
				x:0,
				y:0,
				w:0,
				h:0,
			};
		}
		this.whratio=8;
		this.scale=-1;
		this.input=new Input(can);
		this.input.disablenav();
		this.canvas=can;
		this.ctx=can.getContext("2d");
		this.hitarr=[];
		this.hits=0;
		this.click=-1;
		this.hover=-1;
		let st=this;
		function update() {
			setTimeout(update,8);
			st.update();
		}
		update();
	}


	update() {
		let can=this.canvas;
		let scale=can.scrollWidth;
		let input=this.input;
		input.update();
		let pad=1/20;
		let height=Math.round(6.5*(scale/20));
		// See if we're hovering over a string.
		let [mx,my]=input.getmousepos();
		// mx/=scale;
		// my/=scale;
		let bars=this.bars;
		let barh=(1-pad*4)*height/bars[0].len;
		let barw=barh*4;
		let bary=pad*2*height;
		let barpad=barw+pad*0.6*height;
		let barx=(scale-barpad*bars.length)/2;
		let bart=(pad/5)*height;
		let hover=-1;
		if (mx>=barx && mx<can.width && my>=bary && my<height) {
			let c=(mx-barx)/barpad,i=Math.floor(c);
			if (i>=0 && i<bars.length && c-i<barw/barpad) {
				let bar=bars[i];
				if (my>=bar.y && my<bar.y+bar.h) {hover=i;}
			}
		}
		// If we're clicking.
		let click=-1;
		let hits=this.hits;
		let hitarr=this.hitarr;
		if (input.getkeydown(input.MOUSE.LEFT)) {
			click=hover;
			if (hover>=0 && this.click!==click) {
				let bar=bars[click];
				let fret=(my-bar.y-bart)/(bar.h-2*bart);
				fret=fret<1?fret:1;
				fret=fret>0?fret:0;
				DemoInst.createxylophone(0.5,bar.freq,fret).play();
				// Audio.SFX.defplay("bell",0.5,bar.freq);
				let x=(bar.x+bar.w*0.5)/scale;
				let y=(bar.y+bart+fret*bar.h)/scale;
				hitarr[hits++]={time:performance.now(),x:x,y:y,bar:bar};
			}
		}
		this.click=click;
		// Redraw strings and plucks.
		if (hits>0 || this.scale!==scale || this.hover!==hover) {
			this.hover=hover;
			let ctx=this.ctx;
			if (this.scale!==scale) {
				this.scale=scale;
				can.width=scale;
				can.height=height;
				// Reset the context after a resize event.
				ctx.textAlign="center";
				ctx.textBaseline="middle";
				ctx.strokeStyle="#ffffff";
				ctx.font=(scale/40).toFixed(0)+"px monospace";
			}
			ctx.fillStyle="#000000";
			ctx.fillRect(0,0,can.width,can.height);
			for (let i=0;i<bars.length;i++) {
				let bar=bars[i];
				let w=barw,x=barx+barpad*i;
				let h=barh*bar.len,y=bary;// (height-h)*0.5;
				bar.x=x; bar.y=y;
				bar.w=w; bar.h=h;
				ctx.fillStyle="#ffffff";
				ctx.fillRect(x,y,w,h);
				ctx.fillStyle=i===this.hover?"#606060":"#303030";
				ctx.fillRect(x+bart,y+bart,w-2*bart,h-2*bart);
			}
			for (let i=hits-1;i>=0;i--) {
				let hit=hitarr[i];
				let t=(performance.now()-hit.time)/1000;
				let a=Math.exp(-1.316*t);
				if (a>=0.01) {
					ctx.fillStyle=hit.bar.color+a.toFixed(6)+")";
					ctx.beginPath();
					ctx.arc(hit.x*scale,hit.y*scale,scale*0.0225,0,Math.PI*2);
					ctx.fill();
				} else {
					hitarr[i]=hitarr[--hits];
					hitarr[hits]=hit;
				}
			}
			this.hits=hits;
		}
	}

}


//---------------------------------------------------------------------------------
// Misc Sounds


export function PlayUI(name) {
	let str="";
	if (name==="phone") {
		str=`
			'Phone Ring + Dial
			#toggle: SQR F 0.5 H 480 L 350
			#sin1: SIN F 440
			#sin2: SIN F #toggle
			#sig1: BPF F 2000 B 12 I #sin1 #sin2 + .9 < -.9 >
			#sig2: BPF F 400 B 3 I #sig1
			#hpf1: HPF F 90 I #sig1 .15 * .06 < -.06 > #sig2
			#hpf2: HPF F 90 I #hpf1 G .25
			#out : ENV A .01 S 1.98 R .01 I #hpf2
		`;
	} else if (name==="explosion") {
		str=`
			#vol: 5
			#freq: 300
			#time: 2
			#u: #freq #freq 1000 + /
			#noi: NOISE
			#lpf: LPF F #freq B 1 G 1 #u - I #noi
			#bpf: BPF F #freq B 2 G #u I #noi
			#del: DEL T 0.15 #u * 0.75 + M 0.9 I 0.5 #u * 0.9 - #sig *
			#sig: #del #lpf #bpf
			#out: ENV A 0.01 R #time 0.01 - I #sig #vol *
		`;
	} else if (name==="hihat") {
		DemoInst.createdrumhihat(1).play();
	} else if (name==="kick") {
		DemoInst.createdrumkick(2).play();
	} else if (name==="marble") {
		str=`
			#vol : 2
			#freq: 7000
			#time: .02
			#noi : NOISE
			#bpf1: BPF F #freq B 2 I #noi
			#bpf2: BPF F #freq B 2 I #bpf1
			#sig : #bpf2 #del
			#del : DEL T 0.003 I #bpf2 0.9 *
			#out : ENV R #time I #sig #vol *
		`;
	} else if (name==="knock") {
		str=`
			#sig  : NOISE H 16
			#bpf1 : BPF F 100 B 2 I #sig
			#bpf2 : BPF F 100 B 2 I #bpf1
			#knock: ENV A 0.001 R 0.199 I #bpf2
			#del  : DEL T 0.3 I #knock #del
			#alive: NOISE H 0.001
			#out  : ENV A 0 S 0.9 R 0 I #alive #knock #del
		`;
	} else if (name==="laser") {
		str=`
			#vol : 2
			#freq: 10000
			#time: .25
			#t   : SAW F 1 #time / L 0 H #time
			#del1: DEL T #t .01 * M .5 I #sig -.35 *
			#del2: DEL T #t .10 * M .5 I #sig -.28 *
			#del3: DEL T #t .20 * M .5 I #sig -.21 *
			#del4: DEL T #t .60 * M .5 I #sig -.13 *
			#osc : SIN F #freq H 0.7
			#sig : #osc #del1 #del2 #del3 #del4
			#out : ENV A 0.01 R #time .01 - I #sig #vol *
		`;
	} else if (name==="electric") {
		str=`
			#freq: 159
			#saw0: SAW F #freq
			#saw1: SAW F #freq 1.002 *
			#sig: LPF F 3000 I #saw0 #saw1 + 0.5 < -0.5 >
			#out : ENV S 2 I #sig 0.5 *
		`;
	} else if (name==="beep") {
		str=`
			#vol : .5
			#freq: 1500
			#time: 0.1
			#osc1: NOISE H .4
			#osc2: TRI F #freq
			#bpf : BPF F #freq B .0012 #freq * I #osc1 #osc2
			#sig : ENV A .01 S #time .01 - .5 * R #time .01 - .5 * I #bpf #vol *
			#del  : DEL T 0.3 I #sig #del
			#alive: NOISE H 0.001
			#out  : ENV A 0 S 0.9 R 0 I #alive #sig #del
		`;
	}
	if (str!=="") {
		let sfx=new Audio.SFX(str);
		sfx.tosound(5,0.1).play();
	}
	return false;
}


export function PlayWaveguide() {
	let sndfreq=44100,sndtime=3,sndlen=Math.floor(sndfreq*sndtime);
	let snd=new Audio.Sound(sndfreq,sndlen);
	let pluckheight=1.0,pluckpos=0.25;
	let freq=200;
	let wavelen=Math.round(0.5*sndfreq/freq),wavepos=0;
	let wave=new Float64Array(wavelen);
	let wavemul=-0.995;
	for (let i=0;i<wavelen;i++) {
		let u=i/(wavelen-1);
		let v=u<pluckpos?u/pluckpos:(1-u)/(1-pluckpos);
		// let v=u<0.5?1:0;
		wave[i]=v*pluckheight;
	}
	let data=snd.data;
	let inharm=0.00006;
	let bands=Math.floor(sndfreq/(4*freq));
	let bandarr=new Array(bands);
	let nbands=0;
	let mnorm=0;
	for (let b=0;b<bands;b++) {
		let n=b+1,n2=n*n;
		let harmfreq=n*Math.sqrt(1+(n2-1)*inharm)*freq/sndfreq;
		let harmmul=1/n2;
		let len=Math.round(1/harmfreq);
		if (len<2) {break;}
		mnorm+=harmmul;
		bandarr[nbands++]={
			filter:new Audio.Biquad(Audio.Biquad.BANDPASS,harmfreq,1),
			len:len,
			pos:0,
			data:new Float64Array(len),
			mul:harmmul
		};
	}
	bands=nbands;
	let volume=1;
	mnorm=(mnorm>1?1/mnorm:1)*volume;
	for (let b=0;b<bands;b++) {
		let band=bandarr[b];
		band.mul*=mnorm;
	}
	let insum=0;
	for (let i=0;i<sndlen;i++) {
		// let t=i/sndfreq;
		let w=wave[wavepos];
		wave[wavepos]=w*wavemul;
		if (++wavepos>=wavelen) {wavepos=0;}
		w=(w+insum);// /(bands+1);
		insum=0;
		let outsum=0;
		for (let b=0;b<bands;b++) {
			let band=bandarr[b];
			let x=band.data[band.pos];
			insum+=x*band.mul;
			outsum+=x*band.mul;
			band.data[band.pos]=band.filter.process(w);
			if (++band.pos>=band.len) {band.pos=0;}
		}
		data[i]=outsum;
	}
	snd.scalevol(1,true);
	// snd.savefile("wve.wav");
	snd.play();
}


export class Bebop {

	// Music box notes are all at the same volume.
	// time, freq
	static notes=[
		[ 0.188, 1158],
		[ 0.941,  337],
		[ 1.099,  464],
		[ 1.099,  618],
		[ 1.148, 1382],
		[ 2.722, 1158],
		[ 3.465,  611],
		[ 3.465,  678],
		[ 3.490,  425],
		[ 5.355, 1158],
		[ 6.058,  337],
		[ 6.198,  612],
		[ 6.239,  765],
		[ 6.307, 1382],
		[ 7.893, 1158],
		[ 8.779,  425],
		[ 8.779,  614],
		[ 8.779,  765],
		[ 8.779, 1158],
		[ 8.779, 1382],
		[ 9.221, 1657],
		[ 9.592, 1381],
		[11.096, 1106],
		[12.031,  464],
		[12.088,  544],
		[12.212,  678],
		[12.212, 1158],
		[14.059,  725],
		[15.504,  464],
		[15.592,  544],
		[15.623,  765],
		[16.108, 1030],
		[16.596, 1030],
		[17.036,  930],
		[17.606,  813],
		[17.616, 1030],
		[18.006, 1158],
		[18.440, 1030],
		[19.223,  930],
		[20.359,  297],
		[20.441,  365],
		[20.478,  678],
		[20.519,  550],
		[21.622,  550],
		[21.984,  606],
		[22.761,  205],
		[22.825,  368],
		[22.964,  414],
		[23.008,  507],
		[23.008,  678],
		[25.307,  368],
		[25.360,  205],
		[25.360,  480],
		[26.038,  678],
		[26.610,  814],
		[27.006,  931],
		[27.716,  205],
		[27.782,  414],
		[27.782,  629],
		[28.149, 1106],
		[28.639,  678],
		[28.660,  930],
		[30.224,  931],
		[31.028,  295],
		[31.065,  550],
		[31.065,  683],
		[31.080, 1106],
		[32.159,  380],
		[32.728,  931],
		[33.461,  368],
		[33.461,  461],
		[33.461,  548],
		[34.732,  205],
		[34.732,  380],
		[34.732,  508],
		[34.732,  643],
		[35.116,  614],
		[36.145,  335],
		[36.145,  461],
		[36.145,  550]
	];
	static volume=0.1;
	static notepos=100000;
	static time=0;
	static img=null;
	static imgset=false;
	static imgorig="";
	static imgstop="";


	constructor() {
	}


	static toggle(linkobj) {
		let len=Bebop.notes.length;
		if (Bebop.notepos<len) {
			Bebop.notepos=len;
		} else {
			Bebop.notepos=0;
			Bebop.time=performance.now();
		}
		if (linkobj && Bebop.img===null) {
			let img=linkobj.firstChild;
			if (img && img.localName==="img") {
				Bebop.img=img;
				Bebop.imgorig=img.src;
				let canv=document.createElement("canvas");
				let w=img.naturalWidth,h=img.naturalHeight;
				canv.width=w;
				canv.height=h;
				let ctx=canv.getContext("2d");
				ctx.drawImage(img,0,0,w,h);
				ctx.fillStyle="#000000";
				let ratioh=0.7,ratiow=0.25;
				let rh=h*ratioh,rw=rh*ratiow;
				if (rw*2.5>w) {rw=w*ratioh/2.5;rh=rw/ratiow;}
				let offx=(w-rw*2.5)*0.5,offy=(h-rh)*0.5;
				ctx.fillRect(offx       ,offy,rw,rh);
				ctx.fillRect(offx+1.5*rw,offy,rw,rh);
				Bebop.imgstop=canv.toDataURL();
				canv.remove();
			}
		}
		Bebop.update();
		return false;
	}


	static update() {
		let time=(performance.now()-Bebop.time)/1000;
		let notes=Bebop.notes;
		let notelen=notes.length;
		let notepos=Bebop.notepos;
		while (notepos<notelen && notes[notepos][0]<=time) {
			let note=notes[notepos++];
			DemoInst.createmusicbox(Bebop.volume,note[1]).play();
			// Audio.SFX.defplay("bell",Bebop.volume,note[1]);
		}
		Bebop.notepos=notepos;
		let playing=notepos<notelen;
		if (playing) {setTimeout(Bebop.update,1);}
		if (Bebop.img!==null && Bebop.imgset!==playing) {
			Bebop.imgset=playing;
			Bebop.img.src=playing?Bebop.imgstop:Bebop.imgorig;
		}
	}

}


//---------------------------------------------------------------------------------
// Biquad Filters


function CompressPoints(ret,points,len,maxpoints) {
	// Reduces number of points to render for a SVG.
	if (len<=maxpoints) {
		for (let i=0;i<len;i++) {ret[i]=points[i];}
		for (let i=len;i<maxpoints;i++) {ret[i]=0;}
		return;
	}
	let sum=0,rem=0,val=0,j=0;
	for (let i=0;i<len;i++) {
		val=points[i];
		sum+=val*maxpoints;
		rem+=maxpoints;
		if (rem>=len) {
			rem-=len;
			val*=rem;
			ret[j++]=(sum-val)/len;
			sum=val;
		}
	}
}


function Spectrogram(real,imag,arr,len) {
	// Copy the array. If len isn't a power of 2, pad it with 0's.
	let bits=0;
	while (len>(1<<bits)) {bits++;}
	// Swap the array elements to reproduce the recursion of the standard algorithm.
	for (let i=0;i<len;i++) {
		let rev=0;
		for (let b=0;b<bits;b++) {rev+=rev+((i>>>b)&1);}
		real[i]=arr[rev];
		imag[i]=0;
	}
	// Butterfly transform.
	for (let part=2;part<=len;part+=part) {
		let hpart=part>>>1,ang=Math.PI/hpart;
		let pr=Math.cos(ang),pi=Math.sin(ang);
		let wr=1,wi=0;
		for (let h=0;h<hpart;h++) {
			for (let i=h;i<len;i+=part) {
				// w*v
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
			// w*p
			let tr=wr,ti=wi;
			wr=pr*tr-pi*ti;
			wi=pi*tr+pr*ti;
		}
	}
	for (let i=0;i<len;i++) {
		let x=real[i],y=imag[i];
		real[i]=Math.sqrt(x*x+y*y);
	}
}


export function FilterDiagrams() {
	// Draw pass-filter diagrams.
	Audio.initdef();
	let freq=44100,len=1<<16;
	let bqparams=[
		{id:"bq_none"     ,str:"#out: #noi"},
		{id:"bq_lowpass"  ,str:"#out: LPF I #noi F 440 B 1 G 1"},
		{id:"bq_highpass" ,str:"#out: HPF I #noi F 440 B 1 G 1"},
		{id:"bq_bandpass" ,str:"#out: BPF I #noi F 440 B 1 G 1"},
		{id:"bq_notch"    ,str:"#out: NPF I #noi F 440 B 5 G 1"},
		{id:"bq_allpass"  ,str:"#out: APF I #noi F 440 B 1 G 1"},
		{id:"bq_peak"     ,str:"#out: PKF I #noi F 440 B 5 G 40"},
		{id:"bq_lowshelf" ,str:"#out: LSF I #noi F 440 B 1 G 40"},
		{id:"bq_highshelf",str:"#out: HSF I #noi F 440 B 1 G 40"}
	];
	let sfxpref="#noi: NOISE ";
	let svgwidth=1020,svgheight=120,svgpad=20,svgpoints=svgwidth-svgpad*2;
	let real=new Array(len),imag=new Array(len);
	for (let i=0;i<bqparams.length;i++) {
		let param=bqparams[i];
		let tr=document.getElementById(param.id);
		if (!tr) {continue;}
		let snd=(new Audio.SFX(sfxpref+param.str)).tosound(len/freq,NaN,freq);
		let data=snd.data;
		Spectrogram(real,imag,data,len);
		CompressPoints(real,real,len>>2,svgpoints);
		let svg=`<svg width="100%" viewBox='0 0 ${svgwidth} ${svgheight}' style='background:#000000;'>`;
		let offx=svgpad,offy=svgheight-svgpad;
		svg+=`<path fill='#202040' stroke='#8080ff' stroke-width='1' d='M ${offx} ${offy}`;
		let max=0,min=0;
		for (let j=0;j<svgpoints;j++) {
			let x=real[j];
			max=max>x?max:x;
			min=min<x?min:x;
		}
		let time=Math.floor(0.01*freq);
		if (time>len) {time=len;}
		let vol=0.4/snd.getvol();
		for (let j=0;j<time;j++) {
			let vmul=vol*j/time;
			data[j]*=vmul;
			data[len-1-j]*=vmul;
		}
		for (let j=time;j<len;j++) {data[j]*=vol;}
		let normx=(svgwidth-svgpad*2)/svgpoints;
		let normy=(svgheight-svgpad*2)/(max-min);
		offy+=normy*min;
		for (let j=0;j<svgpoints;j++) {
			let x=offx+normx*j;
			let y=offy-normy*real[j];
			svg+=` ${x} ${y}`;
		}
		svg+=` ${svgwidth-svgpad} ${svgheight-svgpad} Z'></svg>`;
		let tdl=tr.childNodes[0],tdr=tr.childNodes[1];
		tdr.innerHTML=svg;
		tdr.width="100%";
		tdr.style.background="#000000";
		tdl.width="1%";
		tdl.style.verticalAlign="middle";
		tdl.childNodes[0].onclick=function(){snd.play();return false;};
	}
}


//---------------------------------------------------------------------------------
// Music Maker


export class MusicMaker {

	static init(mode,inputid,playid,outputid,displayid,compileid) {
		this.mode=mode;
		this.sfx=null;
		this.snd=new Audio.Sound(44100,0);
		this.str="";
		this.cachesnd=this.snd.copy();
		this.cachestr=this.str;
		this.sfx=null;
		this.audio=Audio.initdef();
		this.mainedit=document.getElementById(inputid);
		this.mainout =document.getElementById(outputid);
		this.maindisp=document.getElementById(displayid);
		let st=this;
		let play=document.getElementById(playid);
		let edit=this.mainedit;
		play.onclick=function() {st.play(play,edit);};
		let comp=document.getElementById(compileid);
		comp.onclick=function() {st.compile();};
		// Remake the SVG on window resize.
		window.addEventListener("resize",()=>{st.render();});
		this.fromurl();
		this.compile();
	}


	static initsub(idplay,ideditor) {
		// Sets up the non-main play/edit combos.
		let edit=document.getElementById(ideditor);
		if (edit.clientHeight<edit.scrollHeight+4) {
			edit.style.height=edit.scrollHeight+4+"px";
		}
		let play=document.getElementById(idplay);
		let st=this;
		play.onclick=function() {st.play(play,edit);};
	}


	static clear() {if (this.mainout) {this.mainout.value="";}}


	static log(str) {
		let out=this.mainout;
		if (out) {
			out.value+=(out.value?"\n":"")+str;
			out.scrollTop=out.scrollHeight;
		}
	}


	static compile(str) {
		if (str===undefined) {str=this.mainedit.value;}
		this.clear();
		if (str===this.cachestr) {
			this.log("already compiled");
			this.log("length: "+this.snd.time.toFixed(3)+"s");
			return true;
		}
		let time=performance.now();
		try {
			let snd=null;
			if (this.mode==="music") {
				snd=DemoInst.sequencer(str);
				this.log("compile: "+((performance.now()-time)/1000).toFixed(3)+"s");
			} else {
				// Generate 5 seconds of audio, or until there's 0.1s of silence.
				let sfx=new Audio.SFX(str);
				this.log("compile: "+((performance.now()-time)/1000).toFixed(3)+"s");
				time=performance.now();
				snd=sfx.tosound(5,0.1);
				this.log("fill   : "+((performance.now()-time)/1000).toFixed(3)+"s");
				this.sfx=sfx;
			}
			this.log("length : "+snd.time.toFixed(3)+"s");
			this.snd=snd;
			this.cachestr=str;
			this.cachesnd=snd.copy();
			this.render();
			return true;
		} catch(error) {
			this.log(error);
			return false;
		}
	}


	static render() {
		// Render the sound as an SVG path for best clarity.
		let svgobj=this.maindisp;
		let snd=this.cachesnd;
		let sh=svgobj.viewBox.baseVal.height,smid=sh*0.5;
		let sw=Math.round(sh*svgobj.clientWidth/svgobj.clientHeight);
		svgobj.viewBox.baseVal.width=sw;
		let sndlen=snd.len;
		let snddata=snd.data;
		let path="";
		if (sndlen<=sw) {
			let xmul=(sw-1)/(sndlen-1),ymul=0.5*sh;
			for (let i=0;i<sndlen;i++) {
				let x=i*xmul,y=smid-snddata[i]*ymul;
				path+=`${i?"L":"M"} ${x.toFixed(3)} ${y.toFixed(3)} `;
			}
			path=`<path class="highstroke" fill="none" d="${path}" />`;
		} else {
			// Shrink by summing and averaging.
			let xmul=(sndlen-1)/sw,ymul=0.5*sh;
			let top=`M 0 ${smid} `,bot="Z";
			for (let x=0;x<sw;x++) {
				let x0=x*xmul,x1=x0+xmul;
				x1=x1<=sndlen-1?x1:(sndlen-1);
				let min=Infinity,max=-Infinity;
				while (true) {
					let lx=Math.floor(x0),rx=lx+1;
					rx=rx<sndlen-1?rx:(sndlen-1);
					let u=x0-lx;
					let y=snddata[lx]*(1-u)+snddata[rx]*u;
					min=min<y?min:y;
					max=max>y?max:y;
					if (x0===x1) {break;}
					x0=rx<x1?rx:x1;
				}
				min=smid-min*ymul+0.5;
				max=smid-max*ymul-0.5;
				top=top+`V ${max.toFixed(3)} h 1 `;
				bot=`V ${min.toFixed(3)} h -1 `+bot;
			}
			path=`<path class="highfill" stroke="none" d="${top+bot}" />`;
		}
		svgobj.innerHTML=`<line class="forestroke" style="stroke-width:1px"
		                  x1=0 y1=${smid} x2=${sw} y2=${smid} />\n${path}`;
	}


	static download() {
		this.log("saving to MusicMaker.wav");
		let snd=this.cachesnd;
		snd.savefile("MusicMaker.wav");
	}


	static async tourl() {
		this.clear();
		let str   =this.mainedit.value;
		let stream=new Blob([str]).stream();
		let comp  =stream.pipeThrough(new CompressionStream("gzip"));
		let chunks=[];for await (let c of comp) {chunks.push(c);}
		let bytes =new Uint8Array(await new Blob(chunks).arrayBuffer());
		let str64 =btoa(String.fromCharCode.apply(null,bytes));
		let loc   =window.location;
		let url   =loc.origin+loc.pathname.split("?")[0]+"?"+str64;
		this.log(url+"\n");
		navigator.clipboard.writeText(url);
		this.log("copied to clipboard");
	}


	static async fromurl() {
		let split=decodeURI(window.location.href).split("?");
		if (split.length!==2) {return;}
		this.clear();
		this.log("found beat in URL");
		try {
			let bytes=Uint8Array.from(atob(split[1]),(c)=>c.charCodeAt(0));
			let stream=new Blob([bytes]).stream();
			let decomp=stream.pipeThrough(new DecompressionStream("gzip"));
			let deblob=await new Response(decomp).blob();
			let destr =await deblob.text();
			this.mainedit.value=destr;
			this.log("parsed");
		} catch(error) {
			this.log("failed to parse: "+error);
		}
	}


	static stop() {
		// Stop the current sound and reset the play button.
		let play=this.lastplay;
		if (play) {
			let inst=this.inst;
			if (inst && inst.playing) {
				this.log("stopping");
				inst.remove();
			} else {
				this.log("finished");
			}
			this.inst=null;
			this.lastplay=null;
			play.innerHTML="&#9658; Play";
			let edit=this.lastedit;
			let st=this;
			play.onclick=function() {st.play(play,edit);};
		}
	}


	static play(play,edit) {
		this.stop();
		if (!this.compile(edit.value)) {
			this.log("unable to create effect");
			return;
		}
		this.inst=this.snd.play();
		if (this.inst) {
			this.lastplay=play;
			this.lastedit=edit;
			let st=this;
			play.innerHTML="&#9632; Stop";
			play.onclick=function() {st.stop();};
			this.log("playing");
			function update() {
				if (st.update()) {requestAnimationFrame(update);}
			}
			update();
		} else {
			this.inst=null;
			this.log("unable to play effect");
		}
	}


	static update() {
		if (!this.inst || !this.inst.playing) {
			this.stop();
			return false;
		}
		return true;
	}

}
