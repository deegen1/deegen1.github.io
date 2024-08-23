/*------------------------------------------------------------------------------


demo.js - v1.00

Copyright 2024 Alec Dee - MIT license - SPDX: MIT
deegen1.github.io - akdee144@gmail.com


--------------------------------------------------------------------------------
TODO

Acoustic Guitar
E2 82.41
A2 110.00
D3 146.83
G3 196.00
B3 246.94
E4 329.63

Bass Guitar
E1 41.00
A1 55.00
D2 73.00
G2 98.00


*/
/* jshint esversion: 11  */
/* jshint bitwise: false */
/* jshint eqeqeq: true   */
/* jshint curly: true    */


function playsound() {
	var audio=Audio.def||(new Audio());
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
// ringing
/*
	let voldecay=Math.log(1e-4)/3;
	let len=snd.len,data=snd.data,freq=snd.freq;
	let filter=new Audio.Biquad("highpass",100/freq,0.7071);
	let filterl=new Audio.Biquad("lowpass",4000/freq,0.7071);
	let f=0;
	let delay=Math.floor(0.5*freq),delaygain=0.00;
	for (let i=0;i<len;i++) {
		let t=i/freq;
		let mul=Math.exp(voldecay*t);
		let x=(Audio.tri(t*400)+Audio.tri(t*250)+Audio.tri(t*200))/3;
		data[i]+=filterl.process(filter.process(x))*mul*2;
		if (i>=delay) {data[i]+=data[i-delay]*delaygain;}
		// if (inc<1.0) {inc=1.0;}
		// if (Math.random()<0.5) {inc=-inc;}
		// f+=(tone/freq)*(0.1/(t+0.1));
		// let s0=(Math.sin(f*Math.PI*2));
		// data[i]+=s0*inc1*mul;
	}
*/
	/*var inst=snd.play();
	function update() {
		if (inst.done) {return;}
		setTimeout(update,16);
		var t=1-4*Math.abs(((performance.now()/1000.0)%1)-0.5);
		inst.setpan(t);
	}
	update();*/
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
		let canv=document.getElementById(canvid);
		let thick=50;
		let strings=[
			{name:"E",freq:329.63},
			{name:"B",freq:246.94},
			{name:"G",freq:196.00},
			{name:"D",freq:146.83},
			{name:"A",freq:110.00},
			{name:"E",freq:82.41}
		];
		let width=canv.width;
		let height=thick*strings.length+thick*0.5;
		canv.height=height;
		let ctx=canv.getContext("2d");
		this.ctx=ctx;
		ctx.textAlign="center";
		ctx.textBaseline="middle";
		ctx.font=(thick/2)+"px serif";
		ctx.fillStyle="#000000";
		ctx.fillRect(0,0,width,height);
		ctx.fillStyle="#ffffff";
		ctx.strokeStyle="#ffffff";
		for (let i=0;i<strings.length;i++) {
			let str=strings[i];
			let y=i*thick+thick*0.25;
			let yh=y+thick*0.5;
			//ctx.fillStyle="#800000";
			//ctx.fillRect(0,y,width,thick);
			//ctx.fillStyle="#ffffff";
			ctx.fillText(str.name,thick*0.5,yh);
			ctx.moveTo(thick,yh);
			ctx.lineTo(width-thick,yh);
			ctx.stroke();
			str.x=thick;
			str.y=y;
			str.w=width-thick-str.x;
			str.h=thick;
		}
		this.strings=strings;
		this.canv=canv;
		let st=this;
		canv.onclick=function (evt){return st.click(evt);}
		if (!Audio.def) {new Audio();}
		function update() {
			setTimeout(update,16);
		}
		//update();
	}


	click(evt) {
		let elem=this.canv;
		let offleft=elem.clientLeft;
		let offtop =elem.clientTop;
		while (elem) {
			offleft+=elem.offsetLeft;
			offtop +=elem.offsetTop;
			elem=elem.offsetParent;
		}
		let x=evt.x-offleft;
		let y=evt.y-offtop;
		let strings=this.strings;
		let ctx=this.ctx;
		ctx.fillStyle="#ffffff";
		ctx.fillRect(x-10,y-10,20,20);
		for (let i=0;i<strings.length;i++) {
			let str=strings[i];
			let sx=x-str.x,sy=y-str.y;
			if (sx>=0 && sy>=0 && sx<str.w && sy<str.h) {
				let p=sx/str.w;
				p=p>0.00001?p:0.00001;
				p=p<0.99999?p:0.99999;
				//Audio.createstring(44100,str.freq,1.0,p,0.0092,1.0,1.7).play();
				break;
			}
		}
	}


	update() {
		let canv=this.canv;
		let ctx=canv.getContext("2d");
		let width=canv.width;
		let height=canv.height;
		ctx.fillStyle="#000000";
		ctx.fillRect(0,0,width,height);
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
	if (!Audio.def) {new Audio();}
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

