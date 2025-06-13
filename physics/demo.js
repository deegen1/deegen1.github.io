/*------------------------------------------------------------------------------


demo.js - v1.07

Copyright 2024 Alec Dee - MIT license - SPDX: MIT
2dee.net - akdee144@gmail.com


--------------------------------------------------------------------------------
Notes


Demo for physics.js


--------------------------------------------------------------------------------
TODO


*/
/* npx eslint demo.js -c ../../standards/eslint.js */
/* global Vector, Random, Input, Draw, PhyWorld */


function IsVisible(elem) {
	// If the window is minimized, or the tab isn't primary.
	if (document.visibilityState==="hidden") {return false;}
	// If the element rect isn't on screen.
	let rect=elem.getBoundingClientRect();
	let doc=document.documentElement;
	if (rect.bottom<=0 || rect.top >=(window.innerHeight || doc.clientHeight)) {return false;}
	if (rect.right <=0 || rect.left>=(window.innerWidth  || doc.clientWidth )) {return false;}
	return true;
}


//---------------------------------------------------------------------------------
// Main Physics Demo


class PhyScene {

	constructor(divid,bannerid) {
		this.banner=document.getElementById(bannerid);
		// Setup the canvas
		this.drawratio=9/16;
		let drawheight=1000;
		let drawwidth=Math.floor(drawheight*this.drawratio);
		let canvas=document.getElementById(divid);
		canvas.width=drawwidth;
		canvas.height=drawheight;
		this.canvas=canvas;
		this.ctx=this.canvas.getContext("2d");
		this.draw=new Draw(drawwidth,drawheight);
		this.input=new Input(canvas);
		this.input.disablenav();
		this.mouse=new Vector(2);
		this.distmap=new Float32Array(0);
		this.frames=0;
		this.framesum=0;
		this.framestr="0.0 ms";
		this.frametime=1/60;
		this.frameprev=0;
		this.initworld();
		let state=this;
		function resize() {state.resize();}
		window.addEventListener("resize",resize);
		resize();
		function update(time) {
			if (state.update(time)) {
				requestAnimationFrame(update);
			}
		}
		update(0);
	}


	resize() {
		// Properly resize the canvas
		let canvas =this.canvas;
		let elem   =canvas;
		let offleft=elem.clientLeft;
		let offtop =elem.clientTop;
		while (elem) {
			offleft+=elem.offsetLeft;
			offtop +=elem.offsetTop;
			elem=elem.offsetParent;
		}
		let pscale=1; // window.devicePixelRatio;
		let width =Math.floor(pscale*(window.innerWidth-offleft));
		let height=Math.floor(pscale*(window.innerHeight-offtop));
		let ratio =this.drawratio;
		if (width<height*ratio) {
			height=Math.floor(width/ratio);
		} else {
			width =Math.floor(height*ratio);
		}
		canvas.style.width =width +"px";
		canvas.style.height=height+"px";
		canvas.width =width;
		canvas.height=height;
		this.banner.style.width=width+"px";
		this.draw.img.resize(width,height);
		this.distmap=new Float32Array(width*height);
	}


	initworld() {
		this.world=new PhyWorld(2);
		let world=this.world;
		world.maxsteptime=1/180;
		world.gravity.set([0,0.1]);
		let viewh=1.0,vieww=this.drawratio;
		let normtype=world.createatomtype(0.01,1.0,0.98);
		let boxtype=world.createatomtype(0.02,0.8,0.98);
		let rnd=new Random(2);
		let pos=new Vector(world.dim);
		for (let p=0;p<3000;p++) {
			pos[0]=rnd.getf()*vieww;
			pos[1]=rnd.getf()*viewh;
			let atom=world.createatom(pos,0.004,normtype);
			atom.userdata={isparticle:true};
		}
		for (let k=0;k<3;k++) {
			// world.createbox(6,0.007,0.007*.70,boxtype);
			let cen=new Vector([(0.3+k*0.2)*vieww,0.3]);
			let side=6,rad=0.007,dist=0.007*.70;
			pos=new Vector(cen);
			let atomcombos=1;
			let dim=world.dim;
			for (let i=0;i<dim;i++) {atomcombos*=side;}
			let atomarr=new Array(atomcombos);
			for (let atomcombo=0;atomcombo<atomcombos;atomcombo++) {
				// Find the coordinates of the atom.
				let atomtmp=atomcombo;
				let edge=false;
				for (let i=0;i<dim;i++) {
					let x=atomtmp%side;
					if (x===0 || x===side-1) {edge=true;}
					atomtmp=Math.floor(atomtmp/side);
					pos[i]=cen[i]+(x*2-side+1)*dist;
				}
				let atom=world.createatom(pos,rad,boxtype);
				atomarr[atomcombo]=atom;
				let r=32,g=128,b=0;
				if (edge) {r=64;g=200;b=0;}
				atom.userdata={isparticle:false,iscore:!edge,r:r,g:g,b:b};
			}
			world.autobond(atomarr,6000);
		}
		world.bndmin=new Vector([0,0]);
		world.bndmax=new Vector([vieww,1]);
		let playertype=world.createatomtype(0.0,Infinity,.3);
		playertype.bound=false;
		playertype.gravity=new Vector([0,0]);
		pos.set([vieww*0.5,viewh*0.33]);
		this.playeratom=world.createatom(pos,0.035,playertype);
		this.playeratom.userdata={isparticle:false};
		this.mouse.set(pos);
		// populate userdata
		for (let atom of world.atomiter()) {
			atom.userdata.velcolor=0;
		}
	}


	update(time) {
		// Restrict our FPS to [fps/2,fps].
		let delta=(time-this.frameprev)/1000;
		if (delta>this.frametime || !(delta>0)) {delta=this.frametime;}
		else if (delta<0.5*this.frametime) {return true;}
		this.frameprev=time;
		let starttime=performance.now();
		let world=this.world;
		let draw=this.draw;
		let input=this.input;
		let viewscale=draw.img.height;
		// let vieww=draw.img.width/viewscale,viewh=draw.img.height/viewscale;
		input.update();
		world.update(delta);
		draw.fill(0,0,0,255);
		draw.setscale(viewscale,viewscale);
		this.distmap.fill(Infinity);
		// Move the player. Pulse the player atom until moved.
		let mpos=input.getmousepos();
		this.mouse[0]=mpos[0]/viewscale;
		this.mouse[1]=mpos[1]/viewscale;
		let player=this.playeratom;
		let pdata=player.userdata;
		let dir=this.mouse.sub(player.pos);
		let mag=dir.sqr();
		if (mag<Infinity) {
			pdata.isparticle=true;
			player.vel=dir.mul(mag>1e-6?0.2/delta:0);
		} else if (!pdata.isparticle) {
			let pframe=((performance.now()/1000)*0.5)%1;
			let u=Math.floor((Math.sin(pframe*Math.PI*2)+1.0)*0.5*255.0);
			pdata.r=u;pdata.g=u;pdata.b=255;
		}
		// Update atoms.
		for (let atom of world.atomiter()) {
			let data=atom.userdata;
			// Update the appearance.
			let vel=atom.vel.mag();
			data.velcolor=Math.max(data.velcolor*0.99,vel);
			if (data.isparticle) {
				let u=data.velcolor*(256*4);
				u=Math.floor(u<255?u:255);
				data.r=u;
				data.g=0;
				data.b=255-u;
			} else if (data.iscore) {
				let u=Math.min(data.velcolor*3,1);
				data.r=(32+128*u)|0;
				data.g=(128+64*u)|0;
				data.b=(0+64*u)|0;
			}
			this.drawatom(atom);
			if (atom.delete!==undefined) {
				atom.release();
			}
		}
		// Draw the HUD.
		draw.setcolor(255,255,255,255);
		draw.filltext(.005,.005,"time : "+this.framestr+"\ncount: "+world.atomlist.count,.019);
		this.ctx.putImageData(draw.img.imgdata,0,0);
		// Calculate the frame time.
		this.framesum+=performance.now()-starttime;
		if (++this.frames>=60) {
			let avg=this.framesum/this.frames;
			this.framestr=avg.toFixed(1)+" ms";
			this.frames=0;
			this.framesum=0;
		}
		return true;
	}


	drawatom(atom) {
		// If two atoms overlap, prefer the one that's closer.
		// Overlap is judged by the center of the pixel (.5,.5).
		let draw=this.draw,img=draw.img;
		// Check if it's on the screen.
		let dw=img.width,dh=img.height,scale=dh;
		let x=atom.pos[0]*scale,y=atom.pos[1]*scale;
		let dx=(x>1?(x<dw?x:dw):1)-0.5-x;
		let dy=(y>1?(y<dh?y:dh):1)-0.5-y;
		let rad=atom.rad*scale+0.5,rad2=rad*rad;
		if (dx*dx+dy*dy>=rad2) {return;}
		let rad21=rad>1?(rad-1)*(rad-1):0;
		// Fill in the circle at (x,y) with radius 'rad'.
		let data=atom.userdata;
		let colrgba=draw.rgbatoint(data.r,data.g,data.b,255);
		let coll=(colrgba&0x00ff00ff)>>>0;
		let colh=(colrgba&0xff00ff00)>>>0;
		let colh2=colh>>>8;
		let miny=Math.floor(y-rad+0.5),maxy=Math.ceil(y+rad-0.5);
		miny=miny> 0?miny: 0;
		maxy=maxy<dh?maxy:dh;
		// PhyAssert(miny<maxy);
		let imgdata32=img.data32;
		let distmap=this.distmap;
		for (;miny<maxy;miny++) {
			// Find the boundaries of the row we're on. Clip to center of pixel.
			dy=miny-y+0.5;
			let d2=dy*dy;
			dx=Math.sqrt(rad2-d2)-0.5;
			let minx=Math.floor(x-dx),maxx=Math.ceil(x+dx);
			minx=minx> 0?minx: 0;
			maxx=maxx<dw?maxx:dw;
			dx=minx-x+0.5;
			d2+=dx*dx;
			minx+=dw*miny;
			maxx+=dw*miny;
			// Normal version. Time FF: 2.582620, time CR: 2.692565
			for (;minx<maxx;minx++) {
				// Check if we can overwrite another atom's pixel, or if we need to blend them.
				// PhyAssert(d2>=0 && d2<=rad2,[d2,rad2]);
				let m2=distmap[minx];
				let u=(m2-d2)*0.5,u1=u+0.5,u2=u-0.5;
				// sqrt(m2)-sqrt(d2)>-1
				if (u1>0 || m2>u1*u1) {
					distmap[minx]=d2<m2?d2:m2;
					// rad-dist>1 and sqrt(m2)-sqrt(d2)>1
					if (d2<=rad21 && u2>0 && d2<u2*u2) {
						imgdata32[minx]=colrgba;
					} else {
						// Blend if we're on the edge or bordering another atom.
						let dst=imgdata32[minx];
						let dist=Math.sqrt(d2);
						let bord=Math.sqrt(m2)-dist;
						let edge=rad-dist;
						let a=(256-(bord<1?(bord+1)*128:256)*(edge<1?edge:1))|0;
						imgdata32[minx]=
							(((Math.imul((dst&0x00ff00ff)-coll,a)>>>8)+coll)&0x00ff00ff)+
							((Math.imul(((dst&0xff00ff00)>>>8)-colh2,a)+colh)&0xff00ff00);
					}
				}
				d2+=2*dx+1;
				dx++;
			}
			// PhyAssert(maxx>=dw*miny+dw || d2>=rad2,[d2,rad2]);
		}
	}

}


//---------------------------------------------------------------------------------
// Stacking Demo
//
// This shows how velocity and position affect stacks of atoms.
//
// The simulation is computed in the background at a fixed step and recorded. When
// the frame needs to get updated, it uses the precomputed data. A global clock is
// used so different demos can remain in sync.


class StackScene {

	constructor(divids,mode) {
		// Setup the canvas.
		this.drawratio=0.75;
		this.scenearr=[];
		for (let divid of divids) {
			let scene={};
			let canvas=document.getElementById(divid);
			canvas.style.width ="100%";
			canvas.style.height="200px";
			scene.canvas=canvas;
			scene.ctx=canvas.getContext("2d");
			scene.draw=new Draw(canvas);
			scene.distmap=new Float32Array(0);
			scene.drawn=false;
			this.scenearr.push(scene);
		}
		// Atom position per frame.
		this.looptime=10;
		this.framerate=60;
		this.framemax=Math.floor(this.looptime*this.framerate);
		this.frameidx=-1;
		this.framedata=new Array(this.framemax+1);
		this.atomrad=0.006;
		// Set up stack.
		let viewh=1.0,vieww=0.5;
		let world=new PhyWorld(2);
		this.world=world;
		world._testmode=mode;
		world.maxsteptime=Infinity;
		world.gravity.set([0,0.1]);
		world.bndmin=new Vector([0,0]);
		world.bndmax=new Vector([vieww,viewh]);
		let normtype=world.createatomtype(0.01,1.0,0.98);
		let rnd=new Random();
		for (let p=0;p<2000;p++) {
			let pos=new Vector([rnd.getf()*vieww,rnd.getf()*viewh]);
			let atom=world.createatom(pos,this.atomrad,normtype);
			atom.velsum=0;
			atom.id=p;
		}
		// Launch.
		let state=this;
		function update() {
			state.update();
			requestAnimationFrame(update);
		}
		update();
	}


	static collideatom(a,b) {
		// Collides two atoms. Vector operations are unrolled to use constant memory.
		if (Object.is(a,b)) {return;}
		// Determine if the atoms are overlapping.
		const amass=0.5,bmass=0.5,vmul=0.98*2,vpmul=1,pmul=1;
		let apos=a.pos,bpos=b.pos;
		let dim=apos.length,i;
		let dist=0.0,dif,norm=a.world.tmpvec;
		for (i=0;i<dim;i++) {
			dif=bpos[i]-apos[i];
			norm[i]=dif;
			dist+=dif*dif;
		}
		let rad=a.rad+b.rad;
		if (dist>=rad*rad) {return;}
		// If the atoms are too close together, randomize the direction.
		if (dist>1e-10) {
			dist=Math.sqrt(dist);
			dif=1.0/dist;
		} else {
			dist=0;
			dif=1.0;
			norm.randomize();
		}
		// Check the relative velocity. We can have situations where two atoms increase
		// eachother's velocity because they've been pushed past eachother.
		let avel=a.vel,bvel=b.vel;
		let veldif=0.0;
		for (i=0;i<dim;i++) {
			norm[i]*=dif;
			veldif+=(avel[i]-bvel[i])*norm[i];
		}
		let posdif=rad-dist;
		let mode=a.world._testmode;
		if (mode===0) {
			veldif=veldif*vmul;
		} else if (mode===1) {
			veldif=veldif>0?veldif:0;
			veldif=veldif*vmul;
		} else {
			veldif=veldif>0?veldif:0;
			veldif=veldif*vmul+posdif*vpmul;
		}
		posdif*=pmul;
		a.velsum+=Math.abs(veldif*bmass);
		b.velsum+=Math.abs(veldif*amass);
		// Push the atoms apart.
		let avelmul=veldif*bmass,bvelmul=veldif*amass;
		let aposmul=posdif*bmass,bposmul=posdif*amass;
		for (i=0;i<dim;i++) {
			dif=norm[i];
			apos[i]-=dif*aposmul;
			avel[i]-=dif*avelmul;
			bpos[i]+=dif*bposmul;
			bvel[i]+=dif*bvelmul;
		}
	}


	update() {
		// Compute the atom positions and colors in the background.
		if (this.frameidx<this.framemax) {
			let world=this.world;
			let collideorig=PhyWorld.Atom.collide;
			PhyWorld.Atom.collide=StackScene.collideatom;
			world.update(1/60);
			PhyWorld.Atom.collide=collideorig;
			let count=world.atomlist.count*3,p=0;
			let posdata=new Float32Array(count);
			for (let atom of world.atomiter()) {
				posdata[p++]=atom.pos[0];
				posdata[p++]=atom.pos[1];
				let u=atom.velsum*.25;
				posdata[p++]=u>0?(u<1?u:1):0;
				atom.velsum*=0.98;
			}
			this.framedata[++this.frameidx]=posdata;
		}
		for (let scene of this.scenearr) {
			// Resize based on the parent width.
			let canvas=scene.canvas;
			let draw=scene.draw;
			if (!scene.drawn || draw.img.width!==canvas.clientWidth) {
				scene.drawn=false;
				let draww=canvas.clientWidth;
				let drawh=Math.floor(draww/this.drawratio);
				canvas.style.height=drawh+"px";
				canvas.width=draww;
				canvas.height=drawh;
				draw.img.resize(draww,drawh);
				scene.distmap=new Float32Array(draww*drawh);
			} else if (!IsVisible(canvas)) {
				// If we've drawn a frame and nothing's visible, skip drawing.
				continue;
			}
			// Depending on the time, render the atoms based on our precomputed data.
			draw.fill(0,0,0,255);
			scene.distmap.fill(Infinity);
			let drawtime=((performance.now()/1000)%this.looptime)*this.framerate;
			let f0=Math.floor(drawtime);
			f0=f0<this.frameidx?f0:this.frameidx;
			let f1=f0<this.frameidx?f0+1:f0;
			let v=drawtime-f0,u=1-v;
			let scale=draw.img.width/this.world.bndmax[0];
			let offy=(1/this.drawratio-1)*this.world.bndmax[1];
			let count=this.world.atomlist.count*3;
			let pos0=this.framedata[f0];
			let pos1=this.framedata[f1];
			let rad=this.atomrad*scale;
			for (let p=0;p<count;p+=3) {
				let x=pos0[p+0]*u+pos1[p+0]*v;
				let y=pos0[p+1]*u+pos1[p+1]*v-offy;
				let c=pos0[p+2]*u+pos1[p+2]*v;
				this.drawatom(scene,x*scale,y*scale,rad,c);
			}
			scene.ctx.putImageData(draw.img.imgdata,0,0);
			scene.drawn=true;
		}
	}


	drawatom(scene,x,y,rad,col) {
		// If two atoms overlap, prefer the one that's closer.
		// Overlap is judged by the center of the pixel (.5,.5).
		let draw=scene.draw,img=draw.img;
		// Check if it's on the screen.
		let dw=img.width,dh=img.height;
		let dx=(x>1?(x<dw?x:dw):1)-0.5-x;
		let dy=(y>1?(y<dh?y:dh):1)-0.5-y;
		let rad2=rad*rad;
		if (dx*dx+dy*dy>=rad2) {return;}
		let rad21=rad>1?(rad-1)*(rad-1):0;
		// Fill in the circle at (x,y) with radius 'rad'.
		let colrgba=draw.rgbatoint(255*col,0,255*(1-col),255);
		let coll=(colrgba&0x00ff00ff)>>>0;
		let colh=(colrgba&0xff00ff00)>>>0;
		let colh2=colh>>>8;
		let miny=Math.floor(y-rad+0.5),maxy=Math.ceil(y+rad-0.5);
		miny=miny> 0?miny: 0;
		maxy=maxy<dh?maxy:dh;
		// PhyAssert(miny<maxy);
		let imgdata32=img.data32;
		let distmap=scene.distmap;
		for (;miny<maxy;miny++) {
			// Find the boundaries of the row we're on. Clip to center of pixel.
			dy=miny-y+0.5;
			let d2=dy*dy;
			dx=Math.sqrt(rad2-d2)-0.5;
			let minx=Math.floor(x-dx),maxx=Math.ceil(x+dx);
			minx=minx> 0?minx: 0;
			maxx=maxx<dw?maxx:dw;
			dx=minx-x+0.5;
			d2+=dx*dx;
			minx+=dw*miny;
			maxx+=dw*miny;
			// Normal version. Time FF: 2.582620, time CR: 2.692565
			for (;minx<maxx;minx++) {
				// Check if we can overwrite another atom's pixel, or if we need to blend them.
				// PhyAssert(d2>=0 && d2<=rad2,[d2,rad2]);
				let m2=distmap[minx];
				let u=(m2-d2)*0.5,u1=u+0.5,u2=u-0.5;
				// sqrt(m2)-sqrt(d2)>-1
				if (u1>0 || m2>u1*u1) {
					distmap[minx]=d2<m2?d2:m2;
					// rad-dist>1 and sqrt(m2)-sqrt(d2)>1
					if (d2<=rad21 && u2>0 && d2<u2*u2) {
						imgdata32[minx]=colrgba;
					} else {
						// Blend if we're on the edge or bordering another atom.
						let dst=imgdata32[minx];
						let dist=Math.sqrt(d2);
						let bord=Math.sqrt(m2)-dist;
						let edge=rad-dist;
						let a=(256-(bord<1?(bord+1)*128:256)*(edge<1?edge:1))|0;
						imgdata32[minx]=
							(((Math.imul((dst&0x00ff00ff)-coll,a)>>>8)+coll)&0x00ff00ff)+
							((Math.imul(((dst&0xff00ff00)>>>8)-colh2,a)+colh)&0xff00ff00);
					}
				}
				d2+=2*dx+1;
				dx++;
			}
			// PhyAssert(maxx>=dw*miny+dw || d2>=rad2,[d2,rad2]);
		}
	}

}


//---------------------------------------------------------------------------------
// Oscillation Demo


class OscillationScene {

	static OSC_STATIC=0;
	static OSC_RANDOM=1;
	static INTEGRATE_ACC=2;
	static INTEGRATE_POS=3;


	constructor(divids,mode) {
		// Setup the canvas.
		this.drawratio=1.0;
		this.scenearr=[];
		for (let divid of divids) {
			let scene={};
			let canvas=document.getElementById(divid);
			canvas.style.width ="100%";
			canvas.style.height="200px";
			scene.canvas=canvas;
			scene.ctx=canvas.getContext("2d");
			scene.draw=new Draw(canvas);
			scene.drawn=false;
			this.scenearr.push(scene);
		}
		// Atom position per frame.
		this.rnd=new Random(1);
		this.looptime=5;
		this.framerate=60;
		this.framemax=Math.floor(this.looptime*this.framerate);
		this.frameidx=-1;
		this.framedata=new Array(this.framemax+1);
		// Set up atoms.
		let dim=mode<2?20:5;
		let atoms=dim*dim;
		let atomarr=new Array(atoms);
		let norm=1/(dim-1),off=0.5;
		for (let i=0;i<atoms;i++) {
			let x=i%dim,y=Math.floor(i/dim);
			let pos=new Vector([x*norm-off,y*norm-off]);
			let vel=new Vector([-pos[1],pos[0]]);
			let acc=new Vector([0,0]);
			atomarr[i]={pos:pos,vel:vel,acc:acc};
		}
		// Create bonds in an order that will cause oscillations.
		// The diagonals are all longer than they need to be and will update first. This
		// causes the mesh to expand. The cardinals will all update next and pull
		// everything together, generating energy.
		let bondarr=new Array();
		this.ordermode=mode;
		let diag=norm*Math.sqrt(2)*(mode<2?1.1:1);
		this.tension=mode<2?1900:10;
		let d=dim-1;
		for (let y=0;y<dim;y++) {
			for (let x=0;x<dim;x++) {
				let c=y*dim+x;
				if (x>0 && y>0) {bondarr.push({a:c,b:c-dim-1,dist:diag});}
				if (x<d && y>0) {bondarr.push({a:c,b:c-dim+1,dist:diag});}
				if (x>0       ) {bondarr.push({a:c,b:c    -1,dist:norm});}
				if (       y>0) {bondarr.push({a:c,b:c-dim  ,dist:norm});}
			}
		}
		this.atomarr=atomarr;
		this.bondarr=bondarr;
		// Launch.
		let state=this;
		function update() {
			state.update();
			requestAnimationFrame(update);
		}
		update();
	}


	update() {
		// Compute the atom positions and colors in the background.
		let bondarr=this.bondarr;
		if (this.frameidx<this.framemax) {
			let atomarr=this.atomarr;
			let atoms=atomarr.length;
			let posdata=new Float32Array(atoms*2);
			for (let i=0;i<atoms;i++) {
				let pos=atomarr[i].pos;
				posdata[i*2+0]=pos[0]*0.70+0.5;
				posdata[i*2+1]=pos[1]*0.70+0.5;
			}
			this.framedata[++this.frameidx]=posdata;
			// Update the world.
			let dt=1/this.framerate;
			let tension=this.tension;
			for (let i=0;i<atoms;i++) {
				let atom=atomarr[i];
				let pos=atom.pos,vel=atom.vel,acc=atom.acc;
				pos.iadd(vel.mul(dt)).iadd(acc.mul(dt*dt*0.5));
				vel.iadd(acc.mul(dt));
			}
			let mode=this.ordermode;
			if (mode>=1) {
				let rnd=this.rnd;
				let bonds=bondarr.length;
				for (let i=0;i<bonds;i++) {
					let j=rnd.modu32(i+1);
					let bond=bondarr[i];
					bondarr[i]=bondarr[j];
					bondarr[j]=bond;
				}
			}
			for (let bond of bondarr) {
				let a=atomarr[bond.a];
				let b=atomarr[bond.b];
				let dif=b.pos.sub(a.pos);
				let dist=dif.mag();
				let acc =dif.mul(tension*(bond.dist-dist)/dist);
				if (mode!==2) {
					let vacc=acc.mul(dt);
					let pacc=acc.mul(dt*dt*0.5);
					a.pos.isub(pacc);
					a.vel.isub(vacc);
					b.pos.iadd(pacc);
					b.vel.iadd(vacc);
				} else {
					a.acc.isub(acc);
					b.acc.iadd(acc);
				}
			}
		}
		for (let scene of this.scenearr) {
			// Resize based on the parent width.
			let canvas=scene.canvas;
			let draw=scene.draw;
			if (!scene.drawn || draw.img.width!==canvas.clientWidth) {
				scene.drawn=false;
				let draww=canvas.clientWidth;
				let drawh=Math.floor(draww/this.drawratio);
				canvas.style.height=drawh+"px";
				canvas.width=draww;
				canvas.height=drawh;
				draw.img.resize(draww,drawh);
				draw.linewidth=draww/300;
			} else if (!IsVisible(canvas)) {
				// If we've drawn a frame and nothing's visible, skip drawing.
				continue;
			}
			// Depending on the time, render the atoms based on our precomputed data.
			draw.fill(0,0,0,255);
			let drawtime=((performance.now()/1000)%this.looptime)*this.framerate;
			let f0=Math.floor(drawtime);
			f0=f0<this.frameidx?f0:this.frameidx;
			let f1=f0<this.frameidx?f0+1:f0;
			let v=drawtime-f0,u=1-v;
			let scale=draw.img.width;
			u*=scale;v*=scale;
			let pos0=this.framedata[f0];
			let pos1=this.framedata[f1];
			draw.setcolor(255,255,255,255);
			for (let bond of bondarr) {
				let a=bond.a*2,b=bond.b*2;
				let x0=pos0[a+0]*u+pos1[a+0]*v;
				let y0=pos0[a+1]*u+pos1[a+1]*v;
				let x1=pos0[b+0]*u+pos1[b+0]*v;
				let y1=pos0[b+1]*u+pos1[b+1]*v;
				draw.drawline(x0,y0,x1,y1);
			}
			scene.ctx.putImageData(draw.img.imgdata,0,0);
			scene.drawn=true;
		}
	}

}


//---------------------------------------------------------------------------------
// BVH Demo


class BVHScene {

	constructor(divid) {
		// Setup the canvas.
		this.drawratio=2.5;
		let canvas=document.getElementById(divid);
		canvas.style.width ="100%";
		canvas.style.height="200px";
		this.canvas=canvas;
		this.ctx=canvas.getContext("2d");
		this.draw=new Draw(canvas);
		this.drawn=false;
		this.frameprev=0;
		// Set up stack.
		let vieww=1.0,viewh=vieww/this.drawratio;
		let world=new PhyWorld(2);
		this.world=world;
		world.maxsteptime=Infinity;
		world.gravity.set(0);
		world.bndmin=new Vector([0,0]);
		world.bndmax=new Vector([vieww,viewh]);
		this.normenergy=0.06;
		let normtype=world.createatomtype(0.0,1.0,1.0);
		let rnd=new Random();
		for (let p=0;p<20;p++) {
			let pos=new Vector([rnd.getf()*vieww,rnd.getf()*viewh]);
			let atom=world.createatom(pos,0.016,normtype);
			atom.vel.randomize().imul(this.normenergy);
		}
		// Launch.
		let state=this;
		function update(time) {
			state.update(time);
			requestAnimationFrame(update);
		}
		update();
	}


	update(time) {
		// Restrict our FPS to [fps/2,fps].
		let delta=(time-this.frameprev)/1000;
		delta=delta>0?delta:0;
		delta=delta<0.03?delta:0.03;
		this.frameprev=time;
		// Resize based on the parent width.
		let canvas=this.canvas;
		let draw=this.draw;
		if (!this.drawn || draw.img.width!==canvas.clientWidth) {
			this.drawn=false;
			let draww=canvas.clientWidth;
			let drawh=Math.floor(draww/this.drawratio);
			canvas.style.height=drawh+"px";
			canvas.width=draww;
			canvas.height=drawh;
			draw.img.resize(draww,drawh);
		} else if (!IsVisible(canvas)) {
			// If we've drawn a frame and nothing's visible, skip drawing.
			return;
		}
		let scale=draw.img.width;
		let world=this.world;
		world.update(delta);
		draw.fill(0,0,0,255);
		// Draw the BVH
		world.broad.build();
		draw.linewidth=0.0015*scale;
		draw.setcolor(255,255,255,255);
		let bvhi=world.broad.memi32;
		let bvhf=world.broad.memf32;
		let nodelen=1,nodemax=8;
		let nodearr=new Array(nodemax);
		nodearr[0]=0;
		while (nodelen<nodemax) {
			let stop=nodelen;
			for (let i=0;i<stop && nodelen<nodemax;i++) {
				let n=nodearr[i],leaf=bvhi[n+2];
				if (leaf>=0) {
					nodearr[i]=bvhi[n+1];
					nodearr[nodelen++]=leaf;
				}
			}
		}
		for (let i=0;i<nodemax;i++) {
			let n=nodearr[i];
			let x0=bvhf[n+3]*scale,x1=bvhf[n+4]*scale;
			let y0=bvhf[n+5]*scale,y1=bvhf[n+6]*scale;
			draw.drawline(x0,y0,x1,y0);
			draw.drawline(x1,y0,x1,y1);
			draw.drawline(x1,y1,x0,y1);
			draw.drawline(x0,y1,x0,y0);
		}
		// Get the energy of the system.
		let energy=0;
		for (let atom of world.atomiter()) {
			energy+=atom.vel.mag();
		}
		energy/=world.atomlist.count;
		let normenergy=this.normenergy;
		if (energy<1e-5) {
			energy=0;
			normenergy/=world.atomlist.count;
		} else {
			normenergy/=energy;
		}
		draw.setcolor(32,32,255,255);
		for (let atom of world.atomiter()) {
			let x=atom.pos[0]*scale;
			let y=atom.pos[1]*scale;
			let r=atom.rad*scale;
			draw.filloval(x,y,r,r);
			if (energy===0) {atom.vel.randomize();}
			atom.vel.imul(normenergy);
		}
		this.ctx.putImageData(draw.img.imgdata,0,0);
		this.drawn=true;
	}

}

