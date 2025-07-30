/*------------------------------------------------------------------------------


physics.js - v3.06

Copyright 2023 Alec Dee - MIT license - SPDX: MIT
2dee.net - akdee144@gmail.com


--------------------------------------------------------------------------------
Notes


With enough atoms and bonds, anything can be simulated.
Atoms can overlap if they're bonded.
Two atoms will only collide once a step.


--------------------------------------------------------------------------------
History


1.00
     Initial version. Copied from C engine.
1.21
     Tweaks for performance improvement in javascript.
1.22
     The simulation can now use a variable timestep.
2.00
     Rewrote broadphase to use recursive subdivision instead of cells.
     Broadphase will no longer collide 2 atoms multiple times a step.
2.01
     Broadphase now uses a BVH instead of subdivided regions.
3.00
     Bonds now apply acceleration but modify pos and vel directly for stability.
     Added iterators.
3.01
     Atoms can now go to sleep. The BVH will ignore sleeping nodes.
3.02
     Removed collide flag in favor of callbacks.
     Allowed multiple bonds between 2 atoms. This effectively allows multiple
     iterations per bond per timestep.
3.03
     Electrostatic bonds can form during atom collisions.
     Bonds can break if they're too far apart.
     Added .data fields to atoms, bonds, and atomtypes.
     Added stepcallback() to allow manual tweaks before each timestep.
3.04
     Fixed autobond creating multiple bonds.
3.05
     Added createshape() to dynamically fill shapes.
3.06
     In createshape, used barycentric magnitude to emphasize vertices and
     edges. Fixed bond distance calculations for greedy filling.


--------------------------------------------------------------------------------
TODO


createshape
	Inside/outside test for dim>2.
	Simplex distance calculation for dim>2.
	Instead of checking each cell for overlap with atoms, remove cells every
	time an atom is created.

Switch list to array
	arr=new PhyArray("_atomidx"); // indexname="_atomidx"
	arr.add(atom);                // obj[indexname]=...
	arr.remove(atom);             // obj[indexname]=-1
	remove tmpmem and bvh.atomarr
	Keep objects allocated in the array, since we'll add and remove them a lot.

Better sleeping
	sleeptime+=dt
	if vel>1e-10: sleeptime=0
	if sleeptime>grav.mag(): sleeping=true
	What to do if gravity is changed after sleeping?
	If bonded with a sleeping atom, consider sleeping.
	If a bond is released, wake up both atoms.

BVH
	AABB isn't properly separating [-inf,-inf].
	Change AABB structure from [x0,y0,x1,y1] to [x0,y0] [x1,y1].
	Add generic functions
	AddLeaf(min,max,obj)
	TestRay(colfunc)
	TestBox(colfunc)

Remove world bounds. Add to timestep in demo.
Add static bonds to article.
New article: friction with springs.
Remove static bonds if another bond is formed afterwards?
Use module to put everything under Phy namespace.
Motors: linear, angular, range. Add acceleration?
Reduce to 20kb.
Scale pvmul like calcdt.


*/
/* npx eslint physics.js -c ../../standards/eslint.js */
/* global Vector, Random */


//---------------------------------------------------------------------------------
// Physics - v3.06


class PhyLink {

	constructor(obj) {
		this.prev=null;
		this.next=null;
		this.list=null;
		this.obj=obj||null;
		this.idx=null;
	}


	release() {
		this.remove();
	}


	add(list) {
		if (this.list!==list) {list.add(this);}
	}


	remove(clear) {
		if (this.list!==null) {this.list.remove(this,clear);}
	}

}


class PhyList {

	constructor(ptr) {
		this.head=null;
		this.tail=null;
		this.ptr=ptr||null;
		this.count=0;
	}


	release(clear) {
		let link=this.head,next;
		while (link!==null) {
			next=link.next;
			link.prev=null;
			link.next=null;
			link.list=null;
			if (clear) {link.obj=null;}
			link=next;
		}
		this.count=0;
	}


	*iter() {
		let link,next=this.head;
		while ((link=next)!==null) {
			next=link.next;
			yield link.obj;
		}
	}


	add(link) {
		this.addafter(link,null);
	}


	addafter(link,prev) {
		// Inserts the link after prev.
		link.remove();
		let next;
		if (prev!==null) {
			next=prev.next;
			prev.next=link;
		} else {
			next=this.head;
			this.head=link;
		}
		link.prev=prev;
		link.next=next;
		link.list=this;
		if (next!==null) {
			next.prev=link;
		} else {
			this.tail=link;
		}
		this.count++;
	}


	addbefore(link,next) {
		// Inserts the link before next.
		link.remove();
		let prev;
		if (next!==null) {
			prev=next.prev;
			next.prev=link;
		} else {
			prev=this.tail;
			this.tail=link;
		}
		link.prev=prev;
		link.next=next;
		link.list=this;
		if (prev!==null) {
			prev.next=link;
		} else {
			this.head=link;
		}
		this.count++;
	}


	remove(link,clear) {
		if (link===null) {
			return;
		}
		let prev=link.prev;
		let next=link.next;
		if (prev!==null) {
			prev.next=next;
		} else {
			this.head=next;
		}
		if (next!==null) {
			next.prev=prev;
		} else {
			this.tail=prev;
		}
		this.count--;
		link.prev=null;
		link.next=null;
		link.list=null;
		if (clear) {link.obj=null;}
	}

}


class PhyAtomInteraction {

	constructor(a,b) {
		this.a=a;
		this.b=b;
		this.pmul=0;
		this.vmul=0;
		this.vpmul=0;
		this.statictension=0;
		this.staticdist=0;
		this.callback=null;
		this.updateconstants();
	}


	updateconstants() {
		let a=this.a,b=this.b;
		this.pmul=(a.pmul+b.pmul)*0.5;
		this.vmul=a.vmul+b.vmul;
		this.vpmul=(a.vpmul+b.vpmul)*0.5;
		this.statictension=(a.statictension+b.statictension)*0.5;
		this.staticdist=(a.staticdist+b.staticdist)*0.5;
	}


	static get(a,b) {
		if (a.type!==undefined) {a=a.type;}
		if (b.type!==undefined) {b=b.type;}
		return a.intarr[b.id];
	}

}


class PhyAtomType {

	constructor(world,id,damp,density,elasticity) {
		this.world=world;
		this.worldlink=new PhyLink(this);
		this.atomlist=new PhyList();
		this.id=id;
		this.intarr=[];
		this.damp=damp;
		this.density=density;
		this.pmul=1.0;
		this.vmul=elasticity;
		this.vpmul=1.0;
		this.statictension=50;
		this.staticdist=1.0;
		this.bound=true;
		this.dt =NaN;
		this.dt0=0;
		this.dt1=0;
		this.dt2=0;
		this.gravity=null;
		this.data={};
	}


	release() {
		let id=this.id;
		let link=this.world.atomtypelist.head;
		while (link!==null) {
			link.obj.intarr[id]=null;
			link=link.next;
		}
		this.worldlink.remove();
		this.atomlist.clear();
	}


	updateconstants(dt) {
		// We want to solve for dt0, dt1, dt2, and dt3 in our integration equations.
		//
		//      pos+=vel*dt2+accel*dt3
		//      vel =vel*dt0+accel*dt1
		//
		// ----------------------------------------
		//
		// It's easiest to ignore acceleration and solve for dt0 first. If we continuously
		// apply damping over time t to vel, we get
		//
		//      vel(t)=vel(0)*(1-damp)^t
		//
		// Applying dt0 every step gets us
		//
		//      vel(s)=vel(0)*dt0^s
		//
		// We define dt=t/steps, hence we want to find dt0 when s=t/dt.
		//
		//      vel(s)=vel(0)*dt0^(t/dt)
		//
		// Solving
		//
		//      vel(0)*dt0^(t/dt)=vel(0)*(1-damp)^t
		//      dt0^(t/dt)=(1-damp)^t
		//      ln(dt0^(t/dt))=ln((1-damp)^t)
		//      (t/dt)*ln(dt0)=t*ln(1-damp)
		//      dt0=e^(dt*ln(1-damp))
		//
		// ----------------------------------------
		//
		// To calculate dt1, integrate the derivative for the velocity
		//
		//      v'(t)=ln(1-damp)*v(t)+accel0
		//      v(0)=vel0
		//
		// We will have
		//
		//      d=1-damp
		//      v(t)=vel0*d^t+accel0*(d^t-1)/ln(d)
		//      v(t)=vel0*dt0+accel0*(dt0-1)/ln(d)
		//      dt1=(dt0-1)/ln(1-damp)
		//
		// ----------------------------------------
		//
		// To calculate dt2 and dt3, integrate the derivate for the position
		//
		//      p'(t)=v(t)
		//      p(0)=pos0
		//
		// We will have
		//
		//      d=1-damp
		//      p'(t)=vel0*d^t+accel0*(d^t-1)/ln(d)
		//      p(t)=pos0+vel0*(d^t-1)/ln(d)+accel0*((d^t-1)/ln(d)-t)/ln(d)
		//      p(t)=pos0+vel0*dt1+accel0*(dt1-t)/ln(d)
		//      dt2=dt1
		//      dt3=(dt1-dt)/ln(1-damp)
		//
		this.dt=dt;
		let damp=this.damp,idamp=1.0-damp,dt0,dt1,dt2;
		if (damp<=1e-10) {
			// Special case damping=0: just integrate.
			dt0=1.0;
			dt1=dt;
			dt2=dt*dt*0.5;
		} else if (idamp<=1e-10) {
			// Special case damping=1: all velocity=0.
			// If dt=0 then time isn't passing, so maintain velocity.
			dt0=(dt>=-1e-20 && dt<=1e-20)?1.0:0.0;
			dt1=0.0;
			dt2=0.0;
		} else {
			// Normal case.
			let lnd=Math.log(idamp);
			dt0=Math.exp(dt*lnd);
			dt1=(dt0-1.0)/lnd;
			dt2=(dt1-dt )/lnd;
		}
		this.dt0=dt0;
		this.dt1=dt1;
		this.dt2=dt2;
	}


	updateinteractions() {
		let intarr=this.intarr;
		for (let i=intarr.length-1;i>=0;i--) {
			intarr[i].updateconstants();
		}
	}


	static initinteraction(a,b) {
		let inter=new PhyAtomInteraction(a,b);
		while (a.intarr.length<=b.id) {a.intarr.push(null);}
		while (b.intarr.length<=a.id) {b.intarr.push(null);}
		a.intarr[b.id]=inter;
		b.intarr[a.id]=inter;
	}

}


class PhyAtom {

	constructor(pos,rad,type) {
		this.worldlink=new PhyLink(this);
		this.world=type.world;
		this.world.atomlist.add(this.worldlink);
		this.deleted=false;
		this.sleeping=false;
		pos=new Vector(pos);
		this.pos=pos;
		this.vel=new Vector(pos.length);
		this.rad=rad;
		this.bondlist=new PhyList();
		this.typelink=new PhyLink(this);
		this.type=type;
		type.atomlist.add(this.typelink);
		this.data={};
		this.updateconstants();
	}


	release() {
		this.deleted=true;
		this.worldlink.remove();
		this.typelink.remove();
		let link;
		while ((link=this.bondlist.head)!==null) {
			link.obj.release();
		}
	}


	updateconstants() {
		// Calculate the mass of the atom, where mass=volume*density.
		let dim=this.pos.length;
		let mass=this.type.density;
		if (dim>0) {
			let vol0=mass,rad=this.rad;
			let volmul=rad*rad*6.283185307;
			mass*=2.0*rad;
			for (let i=2;i<=dim;i++) {
				let vol1=vol0*volmul/i;
				vol0=mass;
				mass=vol1;
			}
		}
		this.mass=mass;
	}


	update(dt) {
		// Move the particle and apply damping to the velocity.
		// acc+=gravity
		// pos+=vel*dt1+acc*dt2
		// vel =vel*dt0+acc*dt1
		let world=this.world;
		let bndmin=world.bndmin;
		let bndmax=world.bndmax;
		let pe=this.pos,ve=this.vel,b;
		let dim=pe.length,type=this.type;
		if (type.dt!==dt) {type.updateconstants(dt);}
		let bound=type.bound;
		let ge=type.gravity;
		ge=(ge===null?this.world.gravity:ge);
		let dt0=type.dt0,dt1=type.dt1,dt2=type.dt2;
		let pos,rad=this.rad,energy=0;
		for (let i=0;i<dim;i++) {
			let vel=ve[i],acc=ge[i];
			pos=vel*dt1+acc*dt2+pe[i];
			vel=vel*dt0+acc*dt1;
			b=bound?bndmin[i]+rad:-Infinity;
			if (pos<b) {pos=b;vel=vel<0?-vel:vel;}
			b=bound?bndmax[i]-rad: Infinity;
			if (pos>b) {pos=b;vel=vel>0?-vel:vel;}
			pe[i]=pos;
			ve[i]=vel;
			energy+=vel*vel;
		}
		this.sleeping=energy<1e-10;
	}


	static collide(a,b) {
		// Collides two atoms. Vector operations are unrolled to use constant memory.
		if (Object.is(a,b) || a.deleted || b.deleted) {return;}
		// Determine if the atoms are overlapping.
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
		// Bonds can limit the distance between the atoms.
		let b0=a,b1=b;
		if (a.bondlist.count>b.bondlist.count) {b0=b;b1=a;}
		let link=b0.bondlist.head;
		let bonded=0;
		while (link!==null) {
			let bond=link.obj;
			link=link.next;
			if (Object.is(bond.a,b1) || Object.is(bond.b,b1)) {
				rad=rad<bond.dist?rad:bond.dist;
				bonded=1;
			}
		}
		if (dist>=rad*rad) {return;}
		let amass=a.mass,bmass=b.mass;
		let mass=amass+bmass;
		if ((amass>=Infinity && bmass>=Infinity) || mass<=1e-10 || dim===0) {
			return;
		}
		amass=amass>=Infinity? 1.0: amass/mass;
		bmass=bmass>=Infinity?-1.0:-bmass/mass;
		// If the atoms are too close together, randomize the direction.
		let den=1;
		if (dist>1e-10) {
			dist=Math.sqrt(dist);
			den=1.0/dist;
		} else {
			norm.randomize();
		}
		// Check the relative velocity. We can have situations where two atoms increase
		// eachother's velocity because they've been pushed past eachother.
		let avel=a.vel,bvel=b.vel;
		let veldif=0.0;
		for (i=0;i<dim;i++) {
			norm[i]*=den;
			veldif+=(avel[i]-bvel[i])*norm[i];
		}
		let intr=a.type.intarr[b.type.id];
		let posdif=rad-dist;
		veldif=veldif>0?veldif:0;
		veldif=veldif*intr.vmul+posdif*intr.vpmul;
		posdif*=intr.pmul;
		// If we have a callback, allow it to handle the collision.
		let callback=intr.callback;
		if (callback!==null && !callback(a,b,norm,veldif,posdif)) {return;}
		// Create an electrostatic bond between the atoms.
		if (bonded===0 && intr.statictension>0) {
			let bond=a.world.createbond(a,b,rad,intr.statictension);
			bond.breakdist=rad+(a.rad<b.rad?a.rad:b.rad)*intr.staticdist;
		}
		// Push the atoms apart.
		let aposmul=posdif*bmass,avelmul=veldif*bmass;
		let bposmul=posdif*amass,bvelmul=veldif*amass;
		for (i=0;i<dim;i++) {
			dif=norm[i];
			apos[i]+=dif*aposmul;
			avel[i]+=dif*avelmul;
			bpos[i]+=dif*bposmul;
			bvel[i]+=dif*bvelmul;
		}
	}

}


class PhyBond {

	constructor(world,a,b,dist,tension) {
		this.world=world;
		this.worldlink=new PhyLink(this);
		this.world.bondlist.add(this.worldlink);
		this.deleted=false;
		this.a=a;
		this.b=b;
		this.dist=dist;
		this.breakdist=Infinity;
		this.tension=tension;
		this.alink=new PhyLink(this);
		this.blink=new PhyLink(this);
		this.a.bondlist.add(this.alink);
		this.b.bondlist.add(this.blink);
		this.data={};
	}


	release () {
		this.deleted=true;
		this.worldlink.remove();
		this.alink.remove();
		this.blink.remove();
	}


	update() {
		// Pull two atoms toward eachother based on the distance and bond strength.
		// Vector operations are unrolled to use constant memory.
		let a=this.a,b=this.b;
		if (this.deleted || (a.sleeping && b.sleeping)) {return;}
		let amass=a.mass,bmass=b.mass;
		let mass=amass+bmass;
		if ((amass>=Infinity && bmass>=Infinity) || mass<=1e-10) {
			return;
		}
		amass=amass>=Infinity? 1.0: amass/mass;
		bmass=bmass>=Infinity?-1.0:-bmass/mass;
		// Get the distance and direction between the atoms.
		let apos=a.pos,bpos=b.pos;
		let dim=apos.length,i,dif;
		let norm=a.world.tmpvec;
		let dist=0.0;
		for (i=0;i<dim;i++) {
			dif=bpos[i]-apos[i];
			norm[i]=dif;
			dist+=dif*dif;
		}
		// If the atoms are too close together, randomize the direction.
		let tension=this.tension;
		if (dist>1e-10) {
			dist=Math.sqrt(dist);
			tension/=dist;
		} else {
			norm.randomize();
		}
		if (dist>this.breakdist) {
			this.release();
			return;
		}
		// Apply equal and opposite acceleration. Updating pos and vel in this
		// function, instead of waiting for atom.update(), increases stability.
		let at=a.type,bt=b.type;
		let acc=(this.dist-dist)*tension;
		let aacc=acc*bmass,aposmul=aacc*at.dt2,avelmul=aacc*at.dt1;
		let bacc=acc*amass,bposmul=bacc*bt.dt2,bvelmul=bacc*bt.dt1;
		let avel=a.vel,bvel=b.vel;
		for (i=0;i<dim;i++) {
			dif=norm[i];
			apos[i]+=dif*aposmul;
			avel[i]+=dif*avelmul;
			bpos[i]+=dif*bposmul;
			bvel[i]+=dif*bvelmul;
		}
	}

}


class PhyBroadphase {

	// BVH tree structure, S = 3+2*dim:
	//
	//      (2N-1)S  tree
	//      N        sorting
	//      (2D+1)N  leaf bounds
	//      N        rand tree
	//
	// Node structure:
	//
	//      0 flags
	//      1 parent
	//      2 right
	//      3 x min
	//      4 x max
	//      5 y min
	//        ...
	//
	// If flags&1: atom_id=right
	// If flags&2: sleeping
	//
	// Center splitting.
	// Flat construction.


	constructor(world) {
		this.world=world;
		this.slack=0.05;
		this.atomcnt=0;
		this.atomarr=null;
		this.memi32=null;
		this.memf32=null;
	}


	release() {
		this.atomarr=null;
		this.atomcnt=0;
		this.memi32=null;
		this.memf32=null;
	}


	build() {
		// Build a bounding volume hierarchy for the atoms.
		//
		// During each step, find the axis with the largest range (x_max-x_min).
		// Sort the atoms by whether they're above or below the center of this range.
		let world=this.world;
		let dim=world.dim;
		let atomcnt=world.atomlist.count;
		this.atomcnt=atomcnt;
		if (atomcnt===0) {return;}
		// Allocate working arrays.
		let dim2=2*dim,nodesize=3+dim2;
		let treesize=atomcnt*(nodesize*3)-nodesize;
		let memi=this.memi32;
		if (memi===null || memi.length<treesize) {
			memi=new Int32Array(treesize*2);
			this.memi32=memi;
			this.memf32=new Float32Array(memi.buffer);
			this.atomarr=new Array(atomcnt*2);
		}
		let memf=this.memf32;
		let sortstart=nodesize*(atomcnt*2-1);
		let leafstart=sortstart+atomcnt;
		// Store atoms and their bounds. atom_id*2+sleeping.
		let slack=1+this.slack;
		let leafidx=leafstart;
		let atomlink=world.atomlist.head;
		let atomarr=this.atomarr;
		for (let i=0;i<atomcnt;i++) {
			let atom=atomlink.obj;
			atomlink=atomlink.next;
			atomarr[i]=atom;
			memi[leafidx++]=(i<<1)|atom.sleeping;
			memi[sortstart+i]=leafidx;
			let pos=atom.pos,rad=atom.rad*slack;
			rad=rad>0?rad:-rad;
			for (let axis=0;axis<dim;axis++) {
				let x=pos[axis],x0=x-rad,x1=x+rad;
				x0=x0>-Infinity?x0:-Infinity;
				x1=x1>=x0?x1:x0;
				memf[leafidx++]=x0;
				memf[leafidx++]=x1;
			}
		}
		memi[1]=-1;
		memi[2]=sortstart+atomcnt;
		let worklo=sortstart;
		for (let work=0;work<sortstart;work+=nodesize) {
			// Pop the top working range off the stack.
			let workhi=memi[work+2],workcnt=workhi-worklo;
			if (workcnt===1) {worklo++;continue;}
			// Find the axis with the greatest range.
			let sortaxis=-1;
			let sortmin=-Infinity,sortval=-Infinity;
			for (let axis=0;axis<dim2;axis+=2) {
				let min=Infinity,max=-Infinity;
				for (let i=worklo;i<workhi;i++) {
					let node=memi[i]+axis;
					let x=memf[node];
					min=min<x?min:x;
					max=max>x?max:x;
				}
				// Handle min=max=inf.
				let val=max>min?max-min:0;
				val=val>=0?val:Infinity;
				if (sortval<val) {
					sortval=val;
					sortmin=min;
					sortaxis=axis;
				}
			}
			// Divide the nodes depending on if they're above or below the center.
			sortmin+=sortval*0.5;
			sortval=sortmin<Infinity?sortmin:3.40282347e+38;
			let sortdiv=worklo;
			for (let i=dim2?worklo:workhi;i<workhi;i++) {
				let node=memi[i];
				if (memf[node+sortaxis]<=sortval) {
					memi[i]=memi[sortdiv];
					memi[sortdiv++]=node;
				}
			}
			if (sortdiv<=worklo || sortdiv>=workhi) {sortdiv=worklo+(workcnt>>>1);}
			// Queue the divided nodes for additional processing.
			// Left follows immediately, right needs to be padded.
			let l=work+nodesize;
			let r=work+(sortdiv-worklo)*nodesize*2;
			memi[l+2]=sortdiv;
			memi[r+2]=workhi;
			memi[work+2]=r;
		}
		// Set parents and bounding boxes.
		for (let n=sortstart-nodesize;n>=0;n-=nodesize) {
			let l=n+nodesize,r=memi[n+2],ndim=n+nodesize;
			if (r>=sortstart) {
				l=memi[r-1];r=l;
				let a=memi[l-1];
				memi[n+2]=a>>>1;
				memi[n  ]=((a&1)<<1)|1;
			} else {
				memi[n  ]=memi[l]&memi[r]&2;
				memi[l+1]=n;l+=3;
				memi[r+1]=n;r+=3;
			}
			let x,y;
			for (let i=n+3;i<ndim;i+=2) {
				x=memf[l++];y=memf[r++];
				memf[i  ]=x<y?x:y;
				x=memf[l++];y=memf[r++];
				memf[i+1]=x>y?x:y;
			}
		}
	}


	collide() {
		// Check for collisions among leaves. Randomly reorder the tree to randomize
		// collision order.
		let atomcnt=this.atomcnt;
		if (atomcnt<=1) {return;}
		let nodesize=3+this.world.dim*2;
		let treeend=nodesize*(atomcnt*2-1);
		let memi=this.memi32;
		let memf=this.memf32;
		let atomarr=this.atomarr;
		let collide=PhyAtom.collide;
		// Randomly flip the left and right children and repack them.
		// Also find the next node to skip AABB's we've already checked.
		let randstart=treeend;
		let randend=randstart+treeend;
		let rnd=this.world.rnd;
		let swap=0;
		memi[randstart  ]=0;
		memi[randstart+1]=randend;
		memi[randstart+2]=treeend;
		for (let n=randstart;n<randend;n+=nodesize) {
			let orig=memi[n  ];
			let next=memi[n+1];
			let cnt =memi[n+2]-nodesize;
			// Copy original right child and AABB.
			let u=n+2,v=orig+2,stop=n+nodesize;
			while (u<stop) {memi[u++]=memi[v++];}
			// Set the flags on .next.
			let f=memi[orig];
			memi[n+1]=(next<<2)|f;
			if (f&1) {continue;}
			// Randomly swap the children.
			let r=memi[orig+2];
			let l=orig+nodesize;
			if (swap<=1) {swap=rnd.getu32()|0x80000000;}
			if (swap&1) {let tmp=l;l=r;r=tmp;}
			swap>>>=1;
			let lcnt=(l<r?0:cnt)+r-l,rcnt=cnt-lcnt;
			let lidx=n+nodesize,ridx=lidx+lcnt;
			memi[lidx  ]=l;
			memi[lidx+1]=ridx;
			memi[lidx+2]=lcnt;
			memi[ridx  ]=r;
			memi[ridx+1]=next;
			memi[ridx+2]=rcnt;
		}
		// Process leaves left to right.
		for (let n=randstart;n<randend;n+=nodesize) {
			let node=memi[n+1];
			if (!(node&1)) {continue;}
			let sleeping=node&2;
			let atom=atomarr[memi[n+2]];
			let nbnd=n+3,ndim=n+nodesize;
			node>>>=2;
			while (node<randend) {
				let next=memi[node+1];
				if (!(sleeping&next)) {
					// Down - check for overlap.
					let u=nbnd,v=node+3;
					while (u<ndim && memf[u]<=memf[v+1] && memf[v]<=memf[u+1]) {u+=2;v+=2;}
					if (u===ndim) {
						if (!(next&1)) {node+=nodesize;continue;}
						else {collide(atom,atomarr[memi[node+2]]);}
					}
				}
				node=next>>>2;
			}
		}
	}

}


class PhyWorld {

	static Atom=PhyAtom;
	static Bond=PhyBond;


	constructor(dim) {
		this.dim=dim;
		this.maxsteptime=1/180;
		this.rnd=new Random();
		this.gravity=new Vector(dim);
		this.gravity[dim-1]=0.2;
		this.bndmin=(new Vector(dim)).set(-Infinity);
		this.bndmax=(new Vector(dim)).set( Infinity);
		this.atomtypelist=new PhyList();
		this.atomlist=new PhyList();
		this.bondlist=new PhyList();
		this.tmpmem=[];
		this.tmpvec=new Vector(dim);
		this.broad=new PhyBroadphase(this);
		this.stepcallback=null;
	}


	release() {
		this.atomlist.release();
		this.atomtypelist.release();
		this.bondlist.release();
		this.broad.release();
	}


	gettmpmem(size) {
		// Use a common pool of temporary memory to avoid constant allocations.
		let tmp=this.tmpmem;
		while (tmp.length<size) {
			tmp=tmp.concat(Array(tmp.length+1));
			this.tmpmem=tmp;
		}
		return tmp;
	}


	atomiter() {return this.atomlist.iter();}
	bonditer() {return this.bondlist.iter();}


	createatomtype(damp,density,elasticity) {
		// Assume types are sorted from smallest to largest.
		// Find if there's any missing ID or add to the end.
		let link=this.atomtypelist.head;
		let id=0;
		while (link!==null) {
			let nextid=link.obj.id;
			if (id<nextid) {break;}
			id=nextid+1;
			link=link.next;
		}
		let type=new PhyAtomType(this,id,damp,density,elasticity);
		this.atomtypelist.addbefore(type.worldlink,link);
		link=this.atomtypelist.head;
		while (link!==null) {
			PhyAtomType.initinteraction(link.obj,type);
			link=link.next;
		}
		return type;
	}


	createatom(pos,rad,type) {
		return new PhyAtom(pos,rad,type);
	}


	findbonds(a,b) {
		// Return any bonds that exists between A and B.
		if (a.bondlist.count>b.bondlist.count) {
			let tmp=a;
			a=b;
			b=tmp;
		}
		let ret=[];
		let link=a.bondlist.head;
		while (link!==null) {
			let bond=link.obj;
			if (Object.is(bond.a,b) || Object.is(bond.b,b)) {
				ret+=[bond];
			}
			link=link.next;
		}
		return ret;
	}


	createbond(a,b,dist,tension) {
		// Create a bond. If dist<0, use the current distance between the atoms.
		if (dist<0.0) {dist=a.pos.dist(b.pos);}
		let bond=new PhyBond(this,a,b,dist,tension);
		return bond;
	}


	autobond(atomarr,tension) {
		// Balance distance, mass, # of bonds, direction.
		let count=atomarr.length;
		if (count===0 || isNaN(tension)) {return;}
		let infoarr=new Array(count);
		for (let i=0;i<count;i++) {
			let info={
				atom:atomarr[i]
			};
			infoarr[i]=info;
		}
		for (let i=0;i<count;i++) {
			let mainatom=infoarr[i].atom;
			let rad=mainatom.rad*4.1;
			for (let j=0;j<i;j++) {
				let atom=infoarr[j].atom;
				if (Object.is(atom,mainatom)) {continue;}
				let dist=atom.pos.dist(mainatom.pos);
				if (dist<rad) {
					this.createbond(atom,mainatom,-1.0,tension);
				}
			}
		}
	}


	createbox(cen,side,rad,dist,type,tension=NaN) {
		// O O O O
		//  O O O
		// O O O O
		let pos=new Vector(cen);
		let atomcombos=1;
		let dim=this.dim;
		if (side.length===undefined) {side=(new Array(dim)).fill(side);}
		for (let i=0;i<dim;i++) {atomcombos*=side[i];}
		let atomarr=new Array(atomcombos);
		for (let atomcombo=0;atomcombo<atomcombos;atomcombo++) {
			// Find the coordinates of the atom.
			let atomtmp=atomcombo;
			for (let i=0;i<dim;i++) {
				let s=side[i],x=atomtmp%s;
				atomtmp=Math.floor(atomtmp/s);
				pos[i]=cen[i]+(x*2-s+1)*dist;
			}
			atomarr[atomcombo]=this.createatom(pos,rad,type);
		}
		this.autobond(atomarr,tension);
		return atomarr;
	}


	createshape(fill,mat,minrad,spacing,vertarr,facearr,transform=null,bonddist=NaN,bondtension=NaN,bondbreak=Infinity) {
		// Fill types: 0 Outline, 1 Uniform, 2 Greedy.
		//
		// Atoms and bonds are placed *before* applying transform.
		// Radii and bond lengths will be rescaled if needed.
		let dim=this.dim;
		if (dim!==2) {throw `Only implemented for 2 dimensions: ${dim}`;}
		if (!(spacing>1e-10 && minrad>1e-10)) {throw `Invalid spacing: ${spacing}, ${minrad}`;}
		let iter=spacing*0.25;
		let subspace=spacing*0.5;
		// Find the bounds of our shape.
		let bndmin=(new Vector(dim)).set(Infinity);
		let bndmax=(new Vector(dim)).set(-Infinity);
		for (let vert of vertarr) {
			bndmin.imin(vert);
			bndmax.imax(vert);
		}
		bndmin.isub(spacing);
		bndmax.iadd(spacing);
		let newface=[];
		for (let face of facearr) {
			if (face.length!==dim) {throw `invalid face: ${face}`;}
			let vert=new Array(dim);
			for (let i=0;i<dim;i++) {vert[i]=new Vector(vertarr[face[i]]);}
			newface.push(vert);
		}
		// Loop through each cell.
		let cellarr=[];
		let cellpos=new Vector(bndmin);
		let minpos=new Vector(dim),minbary=new Vector(dim);
		while (true) {
			// Get the distance to the nearest edge and determine if we're inside.
			let mindist=Infinity;
			let parity=0;
			for (let face of newface) {
				let a=face[0],b=face[1];
				let dif=b.sub(a);
				let u=cellpos.sub(a).mul(dif)/dif.sqr();
				u=u>0?u:0;
				u=u<1?u:1;
				let pos=a.add(dif.mul(u));
				let dist=pos.dist2(cellpos);
				if (mindist>dist) {
					mindist=dist;
					minpos.set(pos);
					minbary[0]=u;
					minbary[1]=1-u;
				}
				let eps=1e-10;
				let cy=cellpos[1]-a[1];
				if ((cy>=eps && cy<=dif[1]-eps) || (cy<=-eps && cy>=dif[1]+eps)) {
					let x=a[0]+cy*dif[0]/dif[1];
					parity^=x<cellpos[0]?1:0;
				}
			}
			// If we're outside, clamp to the edge. Sort edges based on
			// barycenter to give vertices and edges better definition.
			mindist=Math.sqrt(mindist)*(parity && fill?-1:1);
			if (mindist<spacing) {
				if (mindist<0) {minpos.set(cellpos);}
				else {mindist=Math.max(1-minbary.sqr(),0);}
				cellarr.push({pos:minpos.copy(),dist:mindist});
			}
			// Advance to next cell. Skip gaps if we're far from a face.
			let skip=(fill===2?Math.abs(mindist):mindist)-spacing*2-iter;
			if (skip>0) {cellpos[0]+=(skip/iter|0)*iter;}
			let i;
			for (i=0;i<dim;i++) {
				cellpos[i]+=iter;
				if (cellpos[i]<bndmax[i]) {break;}
				cellpos[i]=bndmin[i];
			}
			if (i>=dim) {break;}
		}
		// Prep bonds.
		if (!(bondtension>0 && bondbreak>0 && bonddist>0)) {bonddist=NaN;}
		bonddist-=minrad*2;
		let bondarr=[];
		// Fill from the center outward.
		cellarr.sort((l,r)=>l.dist-r.dist);
		let cells=cellarr.length;
		let mincheck=-1;
		let atomarr=[];
		for (let c=0;c<cells;c++) {
			let cell=cellarr[c];
			cellpos=cell.pos;
			let celldist=cell.dist<0?cell.dist:0;
			let cellrad=fill===2 && celldist<0?spacing-celldist:minrad;
			let atoms=atomarr.length,atom;
			if (mincheck<0 && celldist>=0) {mincheck=atoms;fill=0;}
			let i=mincheck>0?mincheck:0,j=i;
			for (;i<atoms;i++) {
				atom=atomarr[i];
				let dist=atom.pos.dist(cellpos);
				let rad;
				if (fill===2) {rad=dist-atom.rad<subspace?0:dist;}
				else {rad=dist<spacing?0:minrad;}
				cellrad=cellrad<rad?cellrad:rad;
				if (cellrad<minrad) {break;}
			}
			if (i>=atoms) {
				atom=this.createatom(cellpos,cellrad,mat);
				atom.data._filldist=celldist;
				// Bond before transforming.
				for (let b of atomarr) {
					let dist=b.pos.dist(cellpos);
					if (dist<atom.rad+b.rad+bonddist) {
						bondarr.push(this.createbond(atom,b,dist,bondtension));
					}
				}
				atomarr.push(atom);
			}
			// Move the rejection atom nearer to the front.
			j+=(i-j)>>1;
			atomarr[i]=atomarr[j];
			atomarr[j]=atom;
		}
		// Transform and rescale everything.
		transform=new Transform(transform??{dim:dim});
		let scale=Math.pow(transform.mat.det(),1/dim);
		for (let atom of atomarr) {
			atom.pos=transform.apply(atom.pos);
			atom.rad*=scale;
			atom.updateconstants();
		}
		for (let bond of bondarr) {
			bond.dist=bond.a.pos.dist(bond.b.pos);
			bond.breakdist=bondbreak*scale;
		}
		return atomarr;
	}


	update(time) {
		// Process the simulation in multiple steps if time is too large.
		if (time<1e-9 || isNaN(time)) {return;}
		let dt=this.maxsteptime;
		let steps=time<=dt?1:Math.ceil(time/dt);
		if (steps<Infinity) {dt=time/steps;}
		let rnd=this.rnd;
		for (let step=0;step<steps;step++) {
			if (this.stepcallback!==null) {this.stepcallback(dt);}
			// Integrate atoms.
			let link,next;
			next=this.atomlist.head;
			while ((link=next)!==null) {
				next=next.next;
				link.obj.update(dt);
			}
			// Integrate bonds after atoms or vel will be counted twice.
			// Randomize the evaluation order to reduce oscillations.
			let bondcount=this.bondlist.count;
			let bondarr=this.gettmpmem(bondcount);
			link=this.bondlist.head;
			for (let i=0;i<bondcount;i++) {
				let j=rnd.getu32()%(i+1);
				bondarr[i]=bondarr[j];
				bondarr[j]=link;
				link=link.next;
			}
			for (let i=0;i<bondcount;i++) {
				bondarr[i].obj.update();
			}
			// Collide atoms.
			this.broad.build();
			this.broad.collide();
		}
	}

}

