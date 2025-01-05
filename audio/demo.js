/*------------------------------------------------------------------------------


demo.js - v1.04

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


//---------------------------------------------------------------------------------
// Bebop Music Box


class Bebop {

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
	}


	static update() {
		let time=(performance.now()-Bebop.time)/1000;
		let notes=Bebop.notes;
		let notelen=notes.length;
		let notepos=Bebop.notepos;
		while (notepos<notelen && notes[notepos][0]<=time) {
			let note=notes[notepos++];
			Audio.createmusicbox(Bebop.volume,note[1]).play();
		}
		Bebop.notepos=notepos;
		let playing=notepos<notelen;
		if (playing) {setTimeout(Bebop.update,1);}
		if (Bebop.img!==null && Bebop.imgset!==playing) {
			Bebop.imgset=playing;
			Bebop.img.src=playing?Bebop.imgstop:Bebop.imgorig;
		}
	}


	static download() {
		let notes=Bebop.notes;
		let sndfreq=44100;
		let snddata=new Float64Array(0);
		for (let i=notes.length-1;i>=0;i--) {
			let note=notes[i];
			let idx=Math.floor(note[0]*sndfreq);
			let sub=Audio.createmusicbox(Bebop.volume,note[1]);
			let sublen=sub.len;
			if (idx+sublen>snddata.length) {
				let newdata=new Float64Array(idx+sublen);
				newdata.set(snddata,0);
				snddata=newdata;
			}
			let subdata=sub.data;
			for (let i=0;i<sublen;i++) {
				snddata[idx++]+=subdata[i];
			}
		}
		let snd=new Audio.Sound(sndfreq,snddata.length);
		snd.data.set(snddata);
		snd.savefile("bebop_memory.wav");
	}

}


//---------------------------------------------------------------------------------
// Guitar Strings


class StringSim {

	constructor(canvid,autotext,autoplay) {
		// Lengths are in cm.
		Audio.initdef();
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
		Audio.createguitar(str.vol,str.freq*len/fret,pluck).play();
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


class XylophoneSim {

	constructor(canvid) {
		// Lengths are in cm.
		Audio.initdef();
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
				Audio.createxylophone(0.5,bar.freq,fret).play();
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


function FilterDiagrams() {
	// Draw pass-filter diagrams.
	Audio.initdef();
	let freq=44100,len=1<<16;
	let bqparams=[
		{id:"bq_none"     ,type:Audio.Biquad.NONE     ,freq:440,bw:1,gain:0 },
		{id:"bq_lowpass"  ,type:Audio.Biquad.LOWPASS  ,freq:440,bw:1,gain:0 },
		{id:"bq_highpass" ,type:Audio.Biquad.HIGHPASS ,freq:440,bw:1,gain:0 },
		{id:"bq_bandpass" ,type:Audio.Biquad.BANDPASS ,freq:440,bw:1,gain:0 },
		{id:"bq_notch"    ,type:Audio.Biquad.NOTCH    ,freq:440,bw:5,gain:0 },
		{id:"bq_allpass"  ,type:Audio.Biquad.ALLPASS  ,freq:440,bw:1,gain:0 },
		{id:"bq_peak"     ,type:Audio.Biquad.PEAK     ,freq:440,bw:5,gain:40},
		{id:"bq_lowshelf" ,type:Audio.Biquad.LOWSHELF ,freq:440,bw:1,gain:40},
		{id:"bq_highshelf",type:Audio.Biquad.HIGHSHELF,freq:440,bw:1,gain:40}
	];
	let svgwidth=1020,svgheight=120,svgpad=20,svgpoints=svgwidth-svgpad*2;
	let real=new Array(len),imag=new Array(len);
	for (let i=0;i<bqparams.length;i++) {
		let param=bqparams[i];
		let tr=document.getElementById(param.id);
		if (!tr) {continue;}
		let snd=new Audio.Sound(freq,len);
		let bq=new Audio.Biquad(param.type,param.freq/freq,param.bw,param.gain);
		let data=snd.data;
		for (let j=0;j<len;j++) {data[j]=bq.process(Audio.noise(j));}
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
// Misc Sounds


function PlayPhone() {
	let freq=44100,len=Math.floor(freq*1.0);
	let snd=new Audio.Sound(freq,len*2);
	let data=snd.data;
	// Dial tone.
	let bp2 =new Audio.Biquad(Audio.Biquad.BANDPASS,2000/freq,12);
	let bp4 =new Audio.Biquad(Audio.Biquad.BANDPASS, 400/freq,3);
	let hp90=new Audio.Biquad(Audio.Biquad.HIGHPASS,  90/freq);
	let hp91=new Audio.Biquad(Audio.Biquad.HIGHPASS,  90/freq);
	for (let i=0;i<len;i++) {
		let t=i/freq;
		let n0 =Audio.sin(t*350)+Audio.sin(t*440);
		let n1 =Audio.clip(n0,-0.9,0.9);
		let n2 =bp2.process(n1);
		let n30=bp4.process(n2*0.5);
		let n31=Audio.clip(n2,-0.4,0.4)*0.15;
		let n4 =hp90.process(n30+n31);
		let n5 =hp91.process(n4);
		data[i]+=n5;
	}
	// Ring tone.
	bp2 =new Audio.Biquad(Audio.Biquad.BANDPASS,2000/freq,12);
	bp4 =new Audio.Biquad(Audio.Biquad.BANDPASS, 400/freq,3);
	hp90=new Audio.Biquad(Audio.Biquad.HIGHPASS,  90/freq);
	hp91=new Audio.Biquad(Audio.Biquad.HIGHPASS,  90/freq);
	for (let i=0;i<len;i++) {
		let t=i/freq;
		let n0 =Audio.sin(t*440)+Audio.sin(t*480);
		let n1 =Audio.clip(n0,-0.9,0.9);
		let n2 =bp2.process(n1);
		let n30=bp4.process(n2*0.5);
		let n31=Audio.clip(n2,-0.4,0.4)*0.15;
		let n4 =hp90.process(n30+n31);
		let n5 =hp91.process(n4);
		data[i+len]+=n5;
	}
	snd.scalevol(0.18,true);
	snd.play();
}


function PlayKnock() {
	let snd=new Audio.Sound(44100,0);
	let knock=Audio.createthud();
	snd.add(knock,0.0);
	snd.add(knock,0.3);
	snd.add(knock,0.6);
	snd.play();
}


function PlayUI() {
	let snd=new Audio.Sound(44100,0);
	let t=0,vol=0.5;
	snd.add(Audio.createuiincrease(vol),t); t+=0.3;
	snd.add(Audio.createuiincrease(vol),t); t+=0.3;
	snd.add(Audio.createuiincrease(vol),t); t+=0.5;
	snd.add(Audio.createuidecrease(vol),t); t+=0.3;
	snd.add(Audio.createuidecrease(vol),t); t+=0.3;
	snd.add(Audio.createuidecrease(vol),t); t+=0.5;
	snd.add(Audio.createuiclick(vol),t); t+=0.2;
	snd.add(Audio.createuiclick(vol),t); t+=0.2;
	snd.add(Audio.createuiclick(vol),t); t+=0.5;
	// snd.add(Audio.createuiconfirm(vol),t); t+=1.2;
	// snd.add(Audio.createuierror(vol),t); t+=1.2;
	snd.play();
}


function PlayWaveguide() {
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


//---------------------------------------------------------------------------------
// Music Maker


class MusicMaker {

	constructor(inputid,playid,outputid,downid,urlid) {
		function getid(id) {
			let elem=id?document.getElementById(id):null;
			return (elem?elem:null);
		}
		let st=this;
		this.uiinput=getid(inputid);
		this.uioutput=getid(outputid);
		this.uiplay=getid(playid);
		if (!this.uiinput) {throw "could not find "+inputid;}
		if (!this.uiplay ) {throw "could not find "+playid;}
		let input=this.uiinput;
		if (input.clientHeight<input.scrollHeight+2) {
			input.style.height=input.scrollHeight+2+"px";
		}
		this.uiplay.onclick=function() {st.play();return false;};
		let down=getid(downid);
		if (down) {down.onclick=function(){st.download();};}
		let url=getid(urlid);
		if (url) {url.onclick=function(){st.tourl();};}
		this.audio=Audio.initdef();
		this.snd=null;
		this.inst=null;
	}


	clear() {if (this.uioutput) {this.uioutput.value="";}}


	log(str) {
		let out=this.uioutput;
		if (out) {
			out.value+=str+"\n";
			out.scrollTop=out.scrollHeight;
		}
	}


	download() {
		this.clear();
		this.log("processing sequence");
		let snd=Audio.sequencer(this.uiinput.value);
		this.log("saving to musicmaker.wav");
		snd.savefile("musicmaker.wav");
	}


	async tourl() {
		this.clear();
		let str   =this.uiinput.value;
		let stream=new Blob([str]).stream();
		let comp  =stream.pipeThrough(new CompressionStream("gzip"));
		let chunks=[];for await (let c of comp) {chunks.push(c);}
		let bytes =new Uint8Array(await new Blob(chunks).arrayBuffer());
		let str64 =btoa(String.fromCharCode.apply(null,bytes));
		let loc   =window.location;
		let url   =loc.origin+loc.pathname.split("?")[0]+"?beat="+str64;
		this.log(url+"\n");
		navigator.clipboard.writeText(url);
		this.log("copied to clipboard");
	}


	async fromurl() {
		let split=decodeURI(window.location.href).split("?beat=");
		if (split.length!==2) {return;}
		this.clear();
		this.log("found beat in URL");
		try {
			let bytes=Uint8Array.from(atob(split[1]),(c)=>c.charCodeAt(0));
			let stream=new Blob([bytes]).stream();
			let decomp=stream.pipeThrough(new DecompressionStream("gzip"));
			let deblob=await new Response(decomp).blob();
			let destr =await deblob.text();
			this.uiinput.value=destr;
			this.log("parsed");
		} catch(error) {
			this.log("failed to parse: "+error);
		}
	}


	play() {
		if (this.inst && this.inst.playing) {
			this.log("stopping");
			this.inst.remove();
			this.inst=null;
			this.uiplay.innerHTML="&#9658; play";
			return;
		}
		this.clear();
		try {
			this.snd=Audio.sequencer(this.uiinput.value);
		} catch(error) {
			this.snd=null;
			this.log(error);
		}
		if (!this.snd) {
			this.log("unable to create song");
			return;
		}
		this.log("created song "+this.snd.time.toFixed(2)+" seconds long");
		this.inst=this.snd.play();
		if (this.inst) {
			this.uiplay.innerHTML="&#9632; stop";
			this.log("playing");
			let st=this;
			function update() {
				if (st.update()) {requestAnimationFrame(update);}
			}
			update();
		} else {
			this.inst=null;
			this.log("unable to play song");
		}
	}


	update() {
		if (!this.inst) {return false;}
		if (!this.inst.playing) {
			this.log("finished");
			this.inst=null;
			this.uiplay.innerHTML="&#9658; play";
			return false;
		}
		this.audio.update();
		return true;
	}

}
