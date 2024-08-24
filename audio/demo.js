/*------------------------------------------------------------------------------


demo.js - v1.01

Copyright 2024 Alec Dee - MIT license - SPDX: MIT
deegen1.github.io - akdee144@gmail.com


--------------------------------------------------------------------------------
TODO


*/
/* jshint esversion: 11  */
/* jshint bitwise: false */
/* jshint eqeqeq: true   */
/* jshint curly: true    */


//---------------------------------------------------------------------------------
// Input - v1.13


class Input {

	static KEY={
		A: 65, B: 66, C: 67, D: 68, E: 69, F: 70, G: 71, H: 72, I: 73, J: 74,
		K: 75, L: 76, M: 77, N: 78, O: 79, P: 80, Q: 81, R: 82, S: 83, T: 84,
		U: 85, V: 86, W: 87, X: 88, Y: 89, Z: 90,
		0: 48, 1: 49, 2: 50, 3: 51, 4: 52, 5: 53, 6: 54, 7: 55, 8: 56, 9: 57,
		SPACE: 32,
		LEFT: 37, UP: 38, RIGHT: 39, DOWN: 40
	};


	static MOUSE={
		LEFT: 256, MID: 257, RIGHT: 258
	};


	constructor(focus) {
		this.focus=null;
		this.focustab=null;
		this.focustouch=null;
		if (focus!==undefined && focus!==null) {
			this.focus=focus;
			// An element needs to have a tabIndex to be focusable.
			this.focustab=focus.tabIndex;
			this.focustouch=focus.style.touchAction;
			if (focus.tabIndex<0) {
				focus.tabIndex=1;
			}
		}
		this.active=null;
		this.scrollupdate=false;
		this.scroll=[window.scrollX,window.scrollY];
		this.mousepos=[-Infinity,-Infinity];
		this.mouseraw=[-Infinity,-Infinity];
		this.mousez=0;
		this.touchfocus=0;
		this.clickpos=[0,0];
		this.repeatdelay=0.5;
		this.repeatrate=0.05;
		this.navkeys={32:1,37:1,38:1,39:1,40:1};
		this.stopnav=0;
		this.stopnavfocus=0;
		this.keystate={};
		this.listeners=[];
		this.initmouse();
		this.initkeyboard();
		this.reset();
		for (let i=0;i<this.listeners.length;i++) {
			let list=this.listeners[i];
			document.addEventListener(list[0],list[1],list[2]);
		}
	}


	release() {
		if (this.focus!==null) {
			this.focus.tabIndex=this.focustab;
		}
		this.enablenav();
		for (let i=0;i<this.listeners.length;i++) {
			let list=this.listeners[i];
			document.removeEventListener(list[0],list[1],list[2]);
		}
		this.listeners=[];
		this.reset();
	}


	reset() {
		this.mousez=0;
		let statearr=Object.values(this.keystate);
		let statelen=statearr.length;
		for (let i=0;i<statelen;i++) {
			let state=statearr[i];
			state.down=0;
			state.hit=0;
			state.repeat=0;
			state.time=null;
			state.active=null;
			state.isactive=0;
		}
		this.active=null;
	}


	update() {
		// Process keys that are active.
		let focus=this.focus===null?document.hasFocus():Object.is(document.activeElement,this.focus);
		if (this.touchfocus!==0) {focus=true;}
		this.stopnavfocus=focus?this.stopnav:0;
		let time=performance.now()/1000.0;
		let delay=time-this.repeatdelay;
		let rate=1.0/this.repeatrate;
		let state=this.active;
		let active=null;
		let down,next;
		while (state!==null) {
			next=state.active;
			down=focus?state.down:0;
			state.down=down;
			if (down>0) {
				let repeat=Math.floor((delay-state.time)*rate);
				state.repeat=(repeat>0 && (repeat&1)===0)?state.repeat+1:0;
			} else {
				state.repeat=0;
				state.hit=0;
			}
			state.isactive=down?1:0;
			if (state.isactive!==0) {
				state.active=active;
				active=state;
			}
			state=next;
		}
		this.active=active;
	}


	disablenav() {
		this.stopnav=1;
		if (this.focus!==null) {
			this.focus.style.touchAction="pinch-zoom";
		}
	}


	enablenav() {
		this.stopnav=0;
		if (this.focus!==null) {
			this.focus.style.touchAction=this.focustouch;
		}
	}


	makeactive(code) {
		let state=this.keystate[code];
		if (state===null || state===undefined) {
			state=null;
		} else if (state.isactive===0) {
			state.isactive=1;
			state.active=this.active;
			this.active=state;
		}
		return state;
	}


	// ----------------------------------------
	// Mouse


	initmouse() {
		let state=this;
		this.MOUSE=this.constructor.MOUSE;
		let keys=Object.keys(this.MOUSE);
		for (let i=0;i<keys.length;i++) {
			let code=this.MOUSE[keys[i]];
			this.keystate[code]={
				name: "MOUSE."+keys[i],
				code: code
			};
		}
		// Mouse controls.
		function mousemove(evt) {
			state.setmousepos(evt.pageX,evt.pageY);
		}
		function mousewheel(evt) {
			state.addmousez(evt.deltaY<0?-1:1);
		}
		function mousedown(evt) {
			if (evt.button===0) {
				state.setkeydown(state.MOUSE.LEFT);
				state.clickpos=state.mousepos.slice();
			}
		}
		function mouseup(evt) {
			if (evt.button===0) {
				state.setkeyup(state.MOUSE.LEFT);
			}
		}
		function onscroll(evt) {
			// Update relative position on scroll.
			if (state.scrollupdate) {
				let difx=window.scrollX-state.scroll[0];
				let dify=window.scrollY-state.scroll[1];
				state.setmousepos(state.mouseraw[0]+difx,state.mouseraw[1]+dify);
			}
		}
		// Touch controls.
		function touchmove(evt) {
			let touch=evt.touches;
			if (touch.length===1) {
				touch=touch.item(0);
				state.setkeydown(state.MOUSE.LEFT);
				state.setmousepos(touch.pageX,touch.pageY);
			} else {
				// This is probably a gesture.
				state.setkeyup(state.MOUSE.LEFT);
			}
		}
		function touchstart(evt) {
			// We need to manually determine if the user has touched our focused object.
			state.touchfocus=1;
			let focus=state.focus;
			if (focus!==null) {
				let touch=evt.touches.item(0);
				let rect=state.getrect(focus);
				let x=touch.pageX-rect.x;
				let y=touch.pageY-rect.y;
				if (x<0 || x>=rect.w || y<0 || y>=rect.h) {
					state.touchfocus=0;
				}
			}
			// touchstart doesn't generate a separate mousemove event.
			touchmove(evt);
			state.clickpos=state.mousepos.slice();
		}
		function touchend(evt) {
			state.touchfocus=0;
			state.setkeyup(state.MOUSE.LEFT);
		}
		function touchcancel(evt) {
			state.touchfocus=0;
			state.setkeyup(state.MOUSE.LEFT);
		}
		this.listeners=this.listeners.concat([
			["mousemove"  ,mousemove  ,false],
			["mousewheel" ,mousewheel ,false],
			["mousedown"  ,mousedown  ,false],
			["mouseup"    ,mouseup    ,false],
			["scroll"     ,onscroll   ,false],
			["touchstart" ,touchstart ,false],
			["touchmove"  ,touchmove  ,false],
			["touchend"   ,touchend   ,false],
			["touchcancel",touchcancel,false]
		]);
	}


	getrect(elem) {
		let width  =elem.scrollWidth;
		let height =elem.scrollHeight;
		let offleft=elem.clientLeft;
		let offtop =elem.clientTop;
		while (elem) {
			offleft+=elem.offsetLeft;
			offtop +=elem.offsetTop;
			elem=elem.offsetParent;
		}
		return {x:offleft,y:offtop,w:width,h:height};
	}


	setmousepos(x,y) {
		this.mouseraw[0]=x;
		this.mouseraw[1]=y;
		this.scroll[0]=window.scrollX;
		this.scroll[1]=window.scrollY;
		let focus=this.focus;
		if (focus!==null) {
			let rect=this.getrect(focus);
			// If the focus is a canvas, scroll size can differ from pixel size.
			x=(x-rect.x)*((focus.width||focus.scrollWidth)/rect.w);
			y=(y-rect.y)*((focus.height||focus.scrollHeight)/rect.h);
		}
		this.mousepos[0]=x;
		this.mousepos[1]=y;
	}


	getmousepos() {
		return this.mousepos.slice();
	}


	getclickpos() {
		return this.clickpos.slice();
	}


	addmousez(dif) {
		this.mousez+=dif;
	}


	getmousez() {
		let z=this.mousez;
		this.mousez=0;
		return z;
	}


	// ----------------------------------------
	// Keyboard


	initkeyboard() {
		let state=this;
		this.KEY=this.constructor.KEY;
		let keys=Object.keys(this.KEY);
		for (let i=0;i<keys.length;i++) {
			let code=this.KEY[keys[i]];
			this.keystate[code]={
				name: "KEY."+keys[i],
				code: code
			};
		}
		function keydown(evt) {
			state.setkeydown(evt.keyCode);
			if (state.stopnavfocus!==0 && state.navkeys[evt.keyCode]) {evt.preventDefault();}
		}
		function keyup(evt) {
			state.setkeyup(evt.keyCode);
		}
		this.listeners=this.listeners.concat([
			["keydown",keydown,false],
			["keyup"  ,keyup  ,false]
		]);
	}


	setkeydown(code) {
		let state=this.makeactive(code);
		if (state!==null) {
			if (state.down===0) {
				state.down=1;
				state.hit=1;
				state.repeat=0;
				state.time=performance.now()/1000.0;
			}
		}
	}


	setkeyup(code) {
		let state=this.makeactive(code);
		if (state!==null) {
			state.down=0;
			state.hit=0;
			state.repeat=0;
			state.time=null;
		}
	}


	getkeydown(code) {
		// code can be an array of key codes.
		if (code===null || code===undefined) {return 0;}
		if (code.length===undefined) {code=[code];}
		let keystate=this.keystate;
		for (let i=0;i<code.length;i++) {
			let state=keystate[code[i]];
			if (state!==null && state!==undefined && state.down>0) {
				return 1;
			}
		}
		return 0;
	}


	getkeyhit(code) {
		// code can be an array of key codes.
		if (code===null || code===undefined) {return 0;}
		if (code.length===undefined) {code=[code];}
		let keystate=this.keystate;
		for (let i=0;i<code.length;i++) {
			let state=keystate[code[i]];
			if (state!==null && state!==undefined && state.hit>0) {
				state.hit=0;
				return 1;
			}
		}
		return 0;
	}


	getkeyrepeat(code) {
		// code can be an array of key codes.
		if (code===null || code===undefined) {return 0;}
		if (code.length===undefined) {code=[code];}
		let keystate=this.keystate;
		for (let i=0;i<code.length;i++) {
			let state=keystate[code[i]];
			if (state!==null && state!==undefined && state.repeat===1) {
				return 1;
			}
		}
		return 0;
	}

}


function playsound() {
	Audio.initdef();
	// kick
	// let tones=[1000,800,600,400,200,100,50];
/*
	let tones=[256,120];
	//for (let i=0;i<tones.length;i++) {
	let norm=1.0;///tones.length;
	let fc=0.02,vc=0.1;
	//let voldecay=Math.log(1e-3)/time;
	//let fdecay=Math.log(1e-3)/time;
	let len=snd.len,data=snd.data,freq=snd.freq;
	let f=(new Array(tones.length)).fill(0);
	for (let i=0;i<len;i++) {
		let t=i/freq;
		let mul=vc/(t+vc);
		for (let j=0;j<tones.length;j++) {
			f[j]+=(fc/(t+fc))*tones[j]*(1/freq);
			data[i]+=Math.sin(f[j]*Math.PI*2)*mul*norm;
		}
	}
*/
	/*let tones=256;
	let voldecay=Math.log(1e-4)/1;
	let len=snd.len,data=snd.data,freq=snd.freq;
	let f=0;
	for (let i=0;i<len;i++) {
		let t=i/freq;
		let mul=math.exp(voldecay*t);
		let inc=Math.random()*2-1
		for (let j=0;j<tones.length;j++) {
			f[j]+=(fc/(t+fc))*tones[j]*(1/freq);
			data[i]+=Math.sin(f[j]*Math.PI*2)*mul*norm;
		}
	}*/
}


function PlayPhoneDial1() {
	let freq=44100,len=freq*2;
	let snd=new Audio.Sound(len,freq);
	let data=snd.data;
	for (let i=0;i<len;i++) {
		let t=i/freq;
		let note=Audio.sin(t*350)+Audio.sin(t*440);
		data[i]+=note;
	}
	snd.scale(0.2/snd.getvolume());
	snd.play();
}


function PlayPhoneDial2() {
	let freq=44100,len=freq*2;
	let snd=new Audio.Sound(len,freq);
	let data=snd.data;
	let bp2 =new Audio.Biquad("bandpass",2000/freq,12);
	let bp4 =new Audio.Biquad("bandpass", 400/freq,3);
	let hp90=new Audio.Biquad("highpass",  90/freq);
	let hp91=new Audio.Biquad("highpass",  90/freq);
	for (let i=0;i<len;i++) {
		let t=i/freq;
		let n0 =Audio.sin(t*350)+Audio.sin(t*440);
		let n1 =Audio.clamp(n0,-0.9,0.9);
		let n2 =bp2.process(n1);
		let n30=bp4.process(n2*0.5);
		let n31=Audio.clamp(n2,-0.4,0.4)*0.15;
		let n4 =hp90.process(n30+n31);
		let n5 =hp91.process(n4);
		data[i]+=n5;
	}
	snd.scale(0.2/snd.getvolume());
	snd.play();
}


function PlayPhoneRing1() {
	let freq=44100,len=freq*2;
	let snd=new Audio.Sound(len,freq);
	let data=snd.data;
	for (let i=0;i<len;i++) {
		let t=i/freq;
		let note=Audio.sin(t*440)+Audio.sin(t*480);
		data[i]+=note;
	}
	snd.scale(0.2/snd.getvolume());
	snd.play();
}


function PlayPhoneRing2() {
	let freq=44100,len=freq*2;
	let snd=new Audio.Sound(len,freq);
	let data=snd.data;
	let bp2 =new Audio.Biquad("bandpass",2000/freq,12);
	let bp4 =new Audio.Biquad("bandpass", 400/freq,3);
	let hp90=new Audio.Biquad("highpass",  90/freq);
	let hp91=new Audio.Biquad("highpass",  90/freq);
	for (let i=0;i<len;i++) {
		let t=i/freq;
		let n0 =Audio.sin(t*440)+Audio.sin(t*480);
		let n1 =Audio.clamp(n0,-0.9,0.9);
		let n2 =bp2.process(n1);
		let n30=bp4.process(n2*0.5);
		let n31=Audio.clamp(n2,-0.4,0.4)*0.15;
		let n4 =hp90.process(n30+n31);
		let n5 =hp91.process(n4);
		data[i]+=n5;
	}
	snd.scale(0.2/snd.getvolume());
	snd.play();
}


function PlayAlarm2() {
	let freq=44100,len=freq*3;
	let snd=new Audio.Sound(len,freq);
	let data=snd.data;
	let lp7=new Audio.Biquad("lowpass",70/freq);
	for (let i=0;i<len;i++) {
		let t=i/freq;
		let n0 =(Audio.sqr(t)+1)*0.5;
		let n1 =lp7.process(n0);
		let n20=Audio.sin(t*600)*(1-n1);
		let n21=Audio.sin(t*800)*n1;
		data[i]+=(n20+n21)*0.2;
	}
	// snd.scale(0.2/snd.getvolume());
	snd.play();
}


function PlayTuba() {
	let freq=44100,len=freq*3;
	let snd=new Audio.Sound(len,freq);
	let voldecay=Math.log(1e-4)/3;
	let data=snd.data;
	let filter=new Audio.Biquad("lowpass",300/freq,1);
	let f=0;
	let delay=Math.floor(0.02*freq),delaygain=0.95;
	for (let i=0;i<len;i++) {
		let t=i/freq;
		let mul=Math.exp(voldecay*t);
		let x=Math.random()*2-1;
		data[i]+=filter.process(x)*mul*2;
		if (i>=delay) {data[i]+=data[i-delay]*delaygain;}
	}
	snd.scale(1/snd.getvolume());
	snd.play();
}


function PlayDrumKick() {
	// https://output.com/blog/get-perfect-kick-drum
	let freq=44100,len=freq*3;
	let snd=new Audio.Sound(len,freq);
	let tones=[256,80];//,200,2000];
	let maxtime=0.2;
	let data=snd.data;
	let f=0,f0=tones[1]/freq,f1=(tones[0]-tones[1])/freq;
	for (let i=0;i<len;i++) {
		let u=i/freq;
		let v=u<maxtime?1-u/maxtime:0;
		f+=f0+v*f1;
		data[i]+=Math.sin(f*Math.PI*2)*v;
	}
	snd.scale(1/snd.getvolume());
	snd.play();
}


function PlayHiHat1() {
	let freq=44100,len=freq*3;
	let snd=new Audio.Sound(len,freq);
	let hp=new Audio.Biquad("highpass",7000/freq);
	let voldecay=Math.log(1e-4)/1;
	let data=snd.data;
	let f=0;
	for (let i=0;i<len;i++) {
		let t=i/freq;
		let mul=Math.exp(voldecay*t);
		let note=Audio.noise(i);
		data[i]+=hp.process(note)*mul;
	}
	snd.scale(0.3/snd.getvolume());
	snd.play();
}


function PlayHiHat2() {
	let freq=44100,len=freq*3;
	let snd=new Audio.Sound(len,freq);
	let rate=40;
	let ratio=[2,3,4.16,5.43,6.79,8.21];
	let ratios=ratio.length;
	let bp=new Audio.Biquad("bandpass",10000/freq);
	let hp=new Audio.Biquad("highpass",7000/freq);
	let voldecay=Math.log(1e-4)/0.3;
	let data=snd.data;
	for (let i=0;i<len;i++) {
		let t=i/freq;
		let note=0;
		for (let j=0;j<ratios;j++) {
			note+=Audio.sqr(t*rate*ratio[j]);
		}
		note=bp.process(note);
		note=hp.process(note);
		let mul=Math.exp(voldecay*t);
		data[i]+=Audio.clamp(note,-1,1)*mul;
	}
	//snd.scale(1/snd.getvolume());
	snd.play();
}


function PlayTones1() {
	let freq=44100,len=freq*3;
	let snd=new Audio.Sound(len,freq);
	let tones=[200,311,4100]; // xylophone
	// let tones=[200,3011,4100]; // long glass
	// let tones=[50,3011,4100]; // glass
	// let tones=[50,70,90,110,131,444];
	// let tones=[80,160];//,200,2000];
	// let tones=[200,400,800,1600,3200,6400,213];
	let data=snd.data;
	for (let t=0;t<tones.length;t++) {
		let tone=tones[t];
		for (let i=0;i<len;i++) {
			let t=i/freq;
			data[i]+=Audio.sin(tone*t)*Math.exp(-0.02*tone*t);
		}
	}
	snd.scale(1/snd.getvolume());
	snd.play();
}


function PlayTones2() {
	let freq=44100,len=freq*3;
	let snd=new Audio.Sound(len,freq);
	let tones=[200,3011,4100]; // long glass
	// let tones=[50,3011,4100]; // glass
	// let tones=[50,70,90,110,131,444];
	// let tones=[80,160];//,200,2000];
	// let tones=[200,400,800,1600,3200,6400,213];
	let data=snd.data;
	for (let t=0;t<tones.length;t++) {
		let tone=tones[t];
		for (let i=0;i<len;i++) {
			let t=i/freq;
			data[i]+=Audio.sin(tone*t)*Math.exp(-0.02*tone*t);
		}
	}
	snd.scale(1/snd.getvolume());
	snd.play();
}


function PlayTones3() {
	let freq=44100,len=freq*3;
	let snd=new Audio.Sound(len,freq);
	let voldecay=Math.log(1e-4)/400;
	let fund=80;
	//let ratio=[1.00,3.00,6.16,10.29,14.01,19.66,24.02];
	let ratio=[1.00,3.92,9.24,16.27,24.22,33.54,42.97];
	let data=snd.data;
	for (let r=0;r<ratio.length;r++) {
		let tone=fund*ratio[r];
		for (let i=0;i<len;i++) {
			let t=i/freq;
			let mul=Math.exp(voldecay*tone*t);
			data[i]+=Audio.sin(tone*t)*mul;
		}
	}
	snd.scale(1/snd.getvolume());
	snd.play();
}


function PlayTones4() {
	let freq=44100,len=freq*3;
	let snd=new Audio.Sound(len,freq);
	let voldecay=Math.log(1e-4)/400;
	let fund=200;
	//let ratio=[1.00,3.00,6.16,10.29,14.01,19.66,24.02];
	let ratio=[1.00,3.92,9.24,16.27,24.22,33.54,42.97];
	let lp=new Audio.Biquad("lowpass",200/freq,1);
	let data=snd.data;
	for (let r=0;r<ratio.length;r++) {
		let tone=fund*ratio[r];
		for (let i=0;i<len;i++) {
			let t=i/freq;
			let mul=Math.exp(voldecay*tone*t);
			data[i]+=Audio.tri(tone*t)*mul;
		}
	}
	for (let i=0;i<len;i++) {
		data[i]=lp.process(data[i]);
	}
	snd.scale(1/snd.getvolume());
	snd.play();
}


function PlayTones5() {
	let freq=44100,len=freq*3;
	let snd=new Audio.Sound(len,freq);
	let voldecay=Math.log(1e-4)/400;
	let fund=200;
	let a=1.1,d=10.1,w0=1.0,x=0.3;
	//let ratio=[1.00,3.00,6.16,10.29,14.01,19.66,24.02];
	//let ratio=[1.00,3.92,9.24,16.27,24.22,33.54,42.97];
	let d2=d*d,d4=d2*d2,di=1/d2;
	let x2=x*x,xd=x2*d2;
	let data=snd.data;
	for (let i=0;i<len;i++) {
		let t=i/freq;
		let at=a*t,at2=at*at,ad=at*di;
		let den=0.25/(d4+at2);
		let mul0=w0/Math.sqrt(Math.sqrt(1+ad*ad));
		let mul1=Math.exp(-xd*den);
		let mul2=Math.cos(at*x2*den-0.5*Math.atan(ad));
		data[i]+=mul0*mul1*mul2;
	}
	snd.scale(1/snd.getvolume());
	snd.play();
}


function PlayTones6() {
	let freq=44100,len=freq*3;
	let snd=new Audio.Sound(len,freq);
	let voldecay=Math.log(1e-4)/400;
	let fund=200;
	//let ratio=[1.00,3.00,6.16,10.29,14.01,19.66,24.02];
	let ratio=[1.00,3.92,9.24,16.27,24.22,33.54,42.97];
	let data=snd.data;
	for (let r=0;r<ratio.length;r++) {
		let tone=fund*ratio[r];
		let mul=1;///(ratio[r]*ratio[r]);
		for (let i=0;i<len;i++) {
			let t=i/freq;
			let m=mul*Math.exp(voldecay*tone*t);
			data[i]+=Audio.sin(tone*t)*m;
		}
	}
	snd.scale(1/snd.getvolume());
	snd.play();
}


function PlayMaraca() {
	let freq=44100,len=freq*3;
	let snd=new Audio.Sound(len,freq);
	let beadlen=Math.floor(0.02*freq),beadfreq=5000,beaddec=Math.log(1e-5)/0.02;
	let beadsnd=new Array(beadlen);
	for (let i=0;i<beadlen;i++) {
		let t=i/freq;
		beadsnd[i]=Math.sin(t*beadfreq*Math.PI*2)*Math.exp(t*beaddec);
	}
	let data=snd.data;
	let volmul=Math.log(1e-4)/5;
	let next=Math.random()*0.04;
	for (let i=0;i<len;i++) {
		let t=i/freq;
		if (t>=next) {
			let mul=Math.exp(t*volmul);
			next=t+Math.random()*0.03*t;
			for (let j=0;j<beadlen;j++) {
				data[i+j]+=beadsnd[j]*mul;
			}
		}
	}
	snd.scale(1/snd.getvolume());
	snd.play();
}


function AddKey(snd,addtime,tone,ramp) {
	// ramp: [[time,type],...]
	// type: con, lin, exp
}


//---------------------------------------------------------------------------------
// Guitar Strings


class StringSim {

	constructor(canvid) {
		Audio.initdef();
		let can=document.getElementById(canvid);
		let strings=[
			{name:"E",freq:329.63},
			{name:"B",freq:246.94},
			{name:"G",freq:196.00},
			{name:"D",freq:146.83},
			{name:"A",freq:110.00},
			{name:"E",freq:82.41}
		];
		let width=can.width;
		let pad=Math.round(width/20);
		can.height=pad*strings.length+pad*0.5;
		for (let i=0;i<strings.length;i++) {
			let str=strings[i];
			let y=i*pad+pad*0.25;
			str.clickx0=pad*0.75;
			str.clickx1=width-pad*0.75;
			str.clicky0=y+pad*0.1;
			str.clicky1=y+pad*0.9;
			str.liney=y+pad*0.5;
			str.linex0=pad;
			str.linex1=width-pad;
			let u=i/(strings.length-1),v=1-u,n=255.99/Math.sqrt(u*u+v*v);
			str.color="rgb("+Math.floor(v*n)+",0,"+Math.floor(u*n)+",";
		}
		let ctx=can.getContext("2d");
		ctx.textAlign="center";
		ctx.textBaseline="middle";
		ctx.font=(pad/2)+"px monospace";
		ctx.strokeStyle="#ffffff";
		this.input=new Input(can);
		this.input.disablenav();
		this.pad=pad;
		this.strings=strings;
		this.canvas=can;
		this.ctx=ctx;
		this.wait=200;
		this.pluckarr=[{life:0}];
		this.plucks=1;
		this.laststring=-1;
		let st=this;
		function update() {
			setTimeout(update,st.update());
		}
		update();
	}


	update() {
		let can=this.canvas;
		let ctx=this.ctx;
		let width=can.width;
		let height=can.height;
		let input=this.input;
		let [mx,my]=input.getmousepos();
		if (mx>=0 && my>=0 && mx<width && my<height) {
			this.wait=0;
		}
		// See if we've clicked on a string.
		let click=-1;
		let plucks=this.plucks;
		let pluckarr=this.pluckarr;
		if (input.getkeydown(input.MOUSE.LEFT)) {
			let strings=this.strings;
			for (let i=0;i<strings.length;i++) {
				let str=strings[i];
				if (mx>=str.clickx0 && my>=str.clicky0 && mx<str.clickx1 && my<str.clicky1) {
					click=i;
					break;
				}
			}
			if (this.laststring!==click && click>=0) {
				let str=strings[click];
				let p=(mx-str.clickx0)/(str.clickx1-str.clickx0);
				p=p>0.00001?p:0.00001;
				p=p<0.99999?p:0.99999;
				Audio.createstring(44100,str.freq,0.5,p,0.0092,1.0,1.7).play();
				pluckarr[plucks++]={life:1,x:mx,str:str};
			}
		}
		this.laststring=click;
		// Redraw strings and plucks.
		if (plucks>0) {
			this.wait=0;
			ctx.fillStyle="#000000";
			ctx.fillRect(0,0,width,height);
			for (let i=plucks-1;i>=0;i--) {
				let p=pluckarr[i];
				if (p.life>=0.01) {
					ctx.fillStyle=p.str.color+p.life.toFixed(6)+")";
					ctx.beginPath();
					ctx.arc(p.x,p.str.liney,this.pad*0.45,0,Math.PI*2);
					ctx.fill();
					p.life*=0.98;
					//p.life-=0.01;
				} else {
					pluckarr[i]=pluckarr[--plucks];
					pluckarr[plucks]=p;
				}
			}
			this.plucks=plucks;
			ctx.fillStyle="#ffffff";
			let pad=this.pad;
			let strings=this.strings;
			for (let i=0;i<strings.length;i++) {
				let str=strings[i];
				ctx.fillText(str.name,pad*0.5,str.liney);
				ctx.beginPath();
				ctx.moveTo(str.linex0,str.liney);
				ctx.lineTo(str.linex1,str.liney);
				ctx.stroke();
			}
		}
		let wait=this.wait;
		wait=wait>16?wait:16;
		let next=wait*1.03;
		next=next<200?next:200;
		this.wait=next;
		return wait;
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
	let sum=0,rem=0,val,j=0;
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


function Spectrogram(real,imag,arr) {
	// Copy the array. If len isn't a power of 2, pad it with 0's.
	let bits=0,len=arr.length;
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


function FilterDiagrams() {
	// Draw pass-filter diagrams.
	Audio.initdef();
	let freq=44100,len=1<<16;
	let bqparams=[
		{id:"bq_none"     ,type:"none"     ,freq:440,bw:1,gain:0 },
		{id:"bq_lowpass"  ,type:"lowpass"  ,freq:440,bw:1,gain:0 },
		{id:"bq_highpass" ,type:"highpass" ,freq:440,bw:1,gain:0 },
		{id:"bq_bandpass" ,type:"bandpass" ,freq:440,bw:1,gain:0 },
		{id:"bq_notch"    ,type:"notch"    ,freq:440,bw:5,gain:0 },
		{id:"bq_allpass"  ,type:"allpass"  ,freq:440,bw:1,gain:0 },
		{id:"bq_peak"     ,type:"peak"     ,freq:440,bw:5,gain:40},
		{id:"bq_lowshelf" ,type:"lowshelf" ,freq:440,bw:1,gain:40},
		{id:"bq_highshelf",type:"highshelf",freq:440,bw:1,gain:40}
	];
	let svgwidth=1020,svgheight=120,svgpad=20,svgpoints=svgwidth-svgpad*2;
	let real=new Array(len),imag=new Array(len);
	for (let i=0;i<bqparams.length;i++) {
		let param=bqparams[i];
		let tr=document.getElementById(param.id);
		if (!tr) {continue;}
		let snd=new Audio.Sound(len,freq);
		let bq=new Audio.Biquad(param.type,param.freq/freq,param.bw,param.gain);
		let data=snd.data;
		for (let j=0;j<len;j++) {data[j]=bq.process(Audio.noise(j));}
		Spectrogram(real,imag,data);
		CompressPoints(real,real,real.length>>2,svgpoints);
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
		let vol=0.4/snd.getvolume();
		for (let j=0;j<time;j++) {data[j]*=vol*j/time;}
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
window.addEventListener("load",FilterDiagrams,true);

