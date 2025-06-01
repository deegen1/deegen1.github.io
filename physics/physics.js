/*------------------------------------------------------------------------------


physics.js - v2.01

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


--------------------------------------------------------------------------------
TODO


Testing
	narrowphase speed test
		generate an array of atoms
		time collision of every 2 atoms
		add back collision callback
		add a read-only callback and read-write callback
	ballistic test
	rotation test
	multiple dimensions for all tests
	rewrite everthing to use multiply add
	if (!(dist<rad*rad)) {return;}
	let den=1;
	if (dist>=1e-10) {
		dist=Math.sqrt(dist);
		den=1/dist;
	} else {
		// The atoms are too close, so guess a direction to separate them.
		// This should be a random unit vector, but all we care about is speed.
		let rand=Math.imul(world.seed++,0xf8b7629f);
		norm[rand%dim]=((rand>>>30)&2)-1;
	}
	for (i=0;i<dim;i++) {
		let x=(norm[i]*=den);
		veldif+=(avel[i]-bvel[i])*x;
	}

Why aren't boxes spinning properly?
	veldif=veldif>0?veldif:0;
	more steps?
Collisions and bonds should use the same equations.
Skip collision step and only update during bond step?

get rid of need to define material types
	add [density,damp,elasticity] option instead of type
divide pvmul by timestep, since it's acceleration
Bonds that break when stretched
How to layer atoms so a particle will always be pushed out?
	1 dimension? 2 dimensions?
How many bonds are needed for a cube to be stable?
Find better sorting criteria for broadphase.


*/
/* npx eslint physics.js -c ../../standards/eslint.js */
/* global Vector, Random */


function PhyAssert(condition,data) {
	// To toggle debug, replace "\tPhyAssert" with "\t// PhyAssert".
	if (!condition) {
		console.log("assert failed:",data);
		throw new Error("Assert Failed");
	}
}


//---------------------------------------------------------------------------------
// Physics - v2.01


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
		// PhyAssert(link.list===this);
		// PhyAssert(this.count>0);
		let prev=link.prev;
		let next=link.next;
		if (prev!==null) {
			prev.next=next;
		} else {
			// PhyAssert(this.head===link);
			this.head=next;
		}
		if (next!==null) {
			next.prev=prev;
		} else {
			// PhyAssert(this.tail===link);
			this.tail=prev;
		}
		this.count--;
		// PhyAssert((this.count===0)===(this.head===null));
		// PhyAssert((this.head===null)===(this.tail===null));
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
		this.collide=false;
		this.pmul=0;
		this.vmul=0;
		this.vpmul=0;
		this.callback=null;
		this.updateconstants();
	}


	updateconstants() {
		let a=this.a,b=this.b;
		this.collide=a.collide && b.collide;
		this.pmul=(a.pmul+b.pmul)*0.5;
		this.vmul=a.vmul+b.vmul;
		this.vpmul=(a.vpmul+b.vpmul)*0.5;
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
		this.collide=true;
		this.damp=damp;
		this.density=density;
		this.pmul=1.0;
		this.vmul=elasticity;
		this.vpmul=1.0;
		this.bound=true;
		this.callback=null;
		this.dt =NaN;
		this.dt0=0;
		this.dt1=0;
		this.dt2=0;
		this.gravity=null;
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
		pos=new Vector(pos);
		this.pos=pos;
		this.vel=new Vector(pos.length);
		this.acc=new Vector(pos.length);
		this.rad=rad;
		this.bondlist=new PhyList();
		this.typelink=new PhyLink(this);
		this.type=type;
		type.atomlist.add(this.typelink);
		this.userdata=null;
		this.updateconstants();
	}


	release() {
		this.worldlink.remove();
		this.typelink.remove();
		let link;
		while ((link=this.bondlist.head)!==null) {
			link.release();
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
		/*let pe=this.pos,ve=this.vel;
		let dim=pe.length,type=this.type,v,a;
		let ae=this.acc,ge=type.gravity;
		ge=(ge===null?this.world.gravity:ge);
		let dt0=type.dt0,dt1=type.dt1,dt2=type.dt2;
		for (let i=0;i<dim;i++) {
			v=ve[i];
			a=ae[i]+ge[i];
			pe[i]+=v*dt1+a*dt2;
			ve[i] =v*dt0+a*dt1;
			ae[i] =0;
		}*/
		let world=this.world;
		let bndmin=world.bndmin;
		let bndmax=world.bndmax;
		let pe=this.pos,ve=this.vel;
		let dim=pe.length,type=this.type;
		if (type.dt!==dt) {type.updateconstants(dt);}
		let bound=type.bound;
		let ae=this.acc,ge=type.gravity;
		ge=(ge===null?this.world.gravity:ge);
		let dt0=type.dt0,dt1=type.dt1,dt2=type.dt2;
		let pos,rad=this.rad;
		for (let i=0;i<dim;i++) {
			let vel=ve[i],acc=ae[i]+ge[i];
			pos=vel*dt1+acc*dt2+pe[i];
			vel=vel*dt0+acc*dt1;
			if (bound && pos<bndmin[i]+rad) {
				pos=bndmin[i]+rad;
				vel=vel<0?-vel:vel;
			}
			if (bound && pos>bndmax[i]-rad) {
				pos=bndmax[i]-rad;
				vel=vel>0?-vel:vel;
			}
			pe[i]=pos;
			ve[i]=vel;
			ae[i]=0;
		}
	}


	static collide(a,b) {// ,callback) {
		// Collides two atoms. Vector operations are unrolled to use constant memory.
		if (Object.is(a,b)) {return;}
		let intr=a.type.intarr[b.type.id];
		if (!intr.collide) {return;}
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
		while (link!==null) {
			let bond=link.obj;
			link=link.next;
			if (Object.is(bond.a,b1) || Object.is(bond.b,b1)) {
				if (rad>bond.dist) {rad=bond.dist;}
				break;
			}
		}
		if (dist>=rad*rad) {return;}
		// If we have a callback, allow it to handle the collision.
		// if (callback===undefined && intr.callback!==null) {
		// 	if (intr.callback(a,b)) {PhyAtom.collide(a,b,true);}
		// 	return;
		// }
		let amass=a.mass,bmass=b.mass;
		let mass=amass+bmass;
		if ((amass>=Infinity && bmass>=Infinity) || mass<=1e-10 || dim===0) {
			return;
		}
		amass=amass>=Infinity?1.0:(amass/mass);
		bmass=bmass>=Infinity?1.0:(bmass/mass);
		// If the atoms are too close together, randomize the direction.
		if (dist>1e-10) {
			dist=Math.sqrt(dist);
			dif=1.0/dist;
		} else {
			dist=0;
			dif=1.0;
			a.world.tmpvec.randomize();
		}
		// Check the relative velocity. We can have situations where two atoms increase
		// eachother's velocity because they've been pushed past eachother.
		let avel=a.vel,bvel=b.vel;
		let veldif=0.0;
		for (i=0;i<dim;i++) {
			norm[i]*=dif;
			veldif-=(bvel[i]-avel[i])*norm[i];
		}
		let posdif=rad-dist;
		// if (link===null) {veldif=veldif>0?veldif:0;}
		veldif=veldif>0?veldif:0;
		veldif=veldif*intr.vmul+posdif*intr.vpmul;
		// veldif=veldif>0?veldif:0;
		posdif*=intr.pmul;
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

}


class PhyBond {

	constructor(world,a,b,dist,tension) {
		// PhyAssert(!Object.is(a,b));
		this.world=world;
		this.worldlink=new PhyLink(this);
		this.world.bondlist.add(this.worldlink);
		this.a=a;
		this.b=b;
		this.dist=dist;
		this.tension=tension;
		this.alink=new PhyLink(this);
		this.blink=new PhyLink(this);
		this.a.bondlist.add(this.alink);
		this.b.bondlist.add(this.blink);
		this.userdata=null;
	}


	release () {
		this.worldlink.remove();
		this.alink.remove();
		this.blink.remove();
	}


	update(dt) {
		// Pull two atoms toward eachother based on the distance and bond strength.
		// Vector operations are unrolled to use constant memory.
		let a=this.a,b=this.b;
		let amass=a.mass,bmass=b.mass;
		let mass=amass+bmass;
		if ((amass>=Infinity && bmass>=Infinity) || mass<=1e-10) {
			return;
		}
		amass=amass>=Infinity?1.0:(amass/mass);
		bmass=bmass>=Infinity?1.0:(bmass/mass);
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
		if (dist>1e-10) {
			dist=Math.sqrt(dist);
			dif=1.0/dist;
		} else {
			dist=0;
			dif=1.0;
			a.world.tmpvec.randomize();
		}
		// Apply equal and opposite forces.
		let tension=dt*this.tension;
		let force=(this.dist-dist)*(tension<1?tension:1)*dif;
		let amul=force*bmass,bmul=force*amass;
		let avel=a.vel,bvel=b.vel;
		for (i=0;i<dim;i++) {
			dif=norm[i];
			apos[i]-=dif*amul;
			avel[i]-=dif*amul;
			bpos[i]+=dif*bmul;
			bvel[i]+=dif*bmul;
		}
	}

}


class PhyBroadphase {

	// BVH tree structure, S = 3+2*dim:
	//
	//      N*S-S  parent nodes
	//      N*S    leaf nodes
	//      N      sorting
	//
	// Node structure:
	//
	//      0 parent
	//      1 left
	//      2 right
	//      3 x min
	//      4 x max
	//      5 y min
	//        ...
	//
	// If left<0, atom_id=-1-left.


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
		// Sort the atoms by their minimum bounds on that axis and split the range in half.
		// Continue subdividing each half.
		//
		let world=this.world;
		let dim=world.dim;
		let atomcnt=world.atomlist.count;
		this.atomcnt=atomcnt;
		if (atomcnt===0) {return;}
		// Allocate working arrays.
		let nodesize=3+2*dim;
		let treesize=atomcnt*(nodesize*2+1)-nodesize;
		let memi=this.memi32;
		if (memi===null || memi.length<treesize) {
			memi=new Int32Array(treesize*2);
			this.memi32=memi;
			this.memf32=new Float32Array(memi.buffer);
			this.atomarr=new Array(atomcnt*2);
		}
		let memf=this.memf32;
		let leafstart=nodesize*(atomcnt-1);
		let sortstart=leafstart+nodesize*atomcnt;
		// Store atoms and their bounds.
		let slack=1+this.slack;
		let leafidx=leafstart;
		let atomlink=world.atomlist.head;
		let atomarr=this.atomarr;
		for (let i=0;i<atomcnt;i++) {
			let atom=atomlink.obj;
			atomlink=atomlink.next;
			atomarr[i]=atom;
			memi[sortstart+i]=leafidx;
			memi[leafidx+1]=~i;
			leafidx+=3;
			let pos=atom.pos,rad=Math.abs(atom.rad*slack);
			for (let axis=0;axis<dim;axis++) {
				let x=pos[axis],x0=x-rad,x1=x+rad;
				if (isNaN(x0) || isNaN(x1)) {x0=x1=-Infinity;}
				memf[leafidx++]=x0;
				memf[leafidx++]=x1;
			}
		}
		memi[0]=-1;
		if (atomcnt<=1) {return;}
		memi[1]=sortstart;
		memi[2]=sortstart+atomcnt;
		let treeidx=nodesize;
		for (let work=0;work<leafstart;work+=nodesize) {
			// Pop the top working range off the stack.
			let worklo=memi[work+1];
			let workhi=memi[work+2];
			let workmid=worklo+((workhi-worklo)>>>1);
			// Find the axis with the greatest range.
			let sortoff=-1,sortmax=-Infinity;
			for (let axis=3;axis<nodesize;axis+=2) {
				let min=Infinity,max=-Infinity;
				for (let i=worklo;i<workhi;i++) {
					let node=memi[i]+axis;
					let x=memf[node];
					min=min<x?min:x;
					x=memf[node+1];
					max=max>x?max:x;
				}
				max-=min;
				max=max>=0?max:Infinity;
				if (sortmax<max) {
					sortmax=max;
					sortoff=axis;
				}
			}
			// Heapsort the largest axis. We only need to sort half.
			let sortend=sortoff>=0?workhi:worklo;
			let sortheap=workmid;
			let nodeoff=1-worklo;
			while (sortend>workmid) {
				let node,child,nidx;
				if (sortheap>worklo) {
					// Build the heap.
					node=--sortheap;
					nidx=memi[node];
				} else {
					// Pop the greatest element to the end of the array.
					node=sortheap;
					nidx=memi[--sortend];
					memi[sortend]=memi[sortheap];
				}
				let nval=memf[nidx+sortoff];
				// Heap sort the top element down.
				// 2*(node-worklo)+worklo+1 = 2*node-worklo+1
				while ((child=(node<<1)+nodeoff)<sortend) {
					let cidx=memi[child];
					let cval=memf[cidx+sortoff];
					let right=child+1;
					if (right<sortend) {
						let ridx=memi[right];
						let rval=memf[ridx+sortoff];
						if (cval<rval) {
							cidx=ridx;
							cval=rval;
							child=right;
						}
					}
					if (nval>=cval) {break;}
					memi[node]=cidx;
					node=child;
				}
				memi[node]=nidx;
			}
			// Split the sorted nodes in half. If we only have 1 node on a side, stop
			// dividing. Otherwise, add the range to the working stack.
			let leaf;
			if (worklo+1===workmid) {
				leaf=memi[worklo];
			} else {
				leaf=treeidx;
				treeidx+=nodesize;
				memi[leaf+1]=worklo;
				memi[leaf+2]=workmid;
			}
			memi[work+1]=leaf;
			if (workhi-1===workmid) {
				leaf=memi[workmid];
			} else {
				leaf=treeidx;
				treeidx+=nodesize;
				memi[leaf+1]=workmid;
				memi[leaf+2]=workhi;
			}
			memi[work+2]=leaf;
		}
		// Set parents and bounding boxes.
		for (let n=leafstart-nodesize;n>=0;n-=nodesize) {
			let l=memi[n+1],r=memi[n+2],ndim=n+nodesize;
			memi[l]=n;l+=3;
			memi[r]=n;r+=3;
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
		// Look at all leaf nodes and check for collision with all leafs to their right
		// in the tree.
		let atomcnt=this.atomcnt;
		if (atomcnt<=1) {return;}
		let nodesize=3+this.world.dim*2;
		let leafidx=nodesize*(atomcnt-1);
		let leafend=nodesize*(atomcnt*2-1);
		let memi=this.memi32;
		let memf=this.memf32;
		let atomarr=this.atomarr;
		let collide=PhyAtom.collide;
		// Randomize the order we process leafs.
		let rnd=this.world.rnd;
		for (let i=0;i<atomcnt;i++) {
			let j=leafend+(rnd.getu32()%(i+1));
			memi[leafend+i]=memi[j];
			memi[j]=leafidx+i*nodesize;
		}
		for (let i=0;i<atomcnt;i++) {
			let n=memi[leafend+i],prev=n,node=memi[n];
			let atom=atomarr[~memi[n+1]];
			let nbnd=n+3,ndim=n+nodesize;
			while (node>=0) {
				let next=memi[node  ];
				let left=memi[node+1];
				if (prev===next) {
					// Down - check for overlap.
					let u=nbnd,v=node+3;
					while (u<ndim && memf[u]<=memf[v+1] && memf[v]<=memf[u+1]) {u+=2;v+=2;}
					if (u===ndim) {
						if (left>=0) {next=left;}
						else {collide(atom,atomarr[~left]);}
					}
				} else if (prev===left) {
					// Up - go right or up again.
					next=memi[node+2];
				}
				prev=node;
				node=next;
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


	findbond(a,b) {
		// Return any bond that exists between A and B.
		if (a.bondlist.count>b.bondlist.count) {
			let tmp=a;
			a=b;
			b=tmp;
		}
		let link=a.bondlist.head;
		while (link!==null) {
			let bond=link.obj;
			if (Object.is(bond.a,a)) {
				if (Object.is(bond.b,b)) {
					return bond;
				}
			} else if (Object.is(bond.a,b)) {
				// PhyAssert(Object.is(bond.b,a));
				return bond;
			}
			link=link.next;
		}
		return null;
	}


	createbond(a,b,dist,tension) {
		// Create a bond. If a bond between A and B already exists, replace it.
		// If dist<0, use the current distance between the atoms.
		if (dist<0.0) {
			dist=a.pos.dist(b.pos);
		}
		let bond=this.findbond(a,b);
		if (bond!==null) {
			bond.dist=dist;
			bond.tension=tension;
		} else {
			bond=new PhyBond(this,a,b,dist,tension);
		}
		return bond;
	}


	autobond(atomarr,tension) {
		// Balance distance, mass, # of bonds, direction.
		let count=atomarr.length;
		if (count===0) {return;}
		let infoarr=new Array(count);
		for (let i=0;i<count;i++) {
			let info={
				atom:atomarr[i]
			};
			infoarr[i]=info;
		}
		for (let i=0;i<count;i++) {
			let mainatom=infoarr[i].atom;
			let rad=mainatom.rad*5.1;
			for (let j=0;j<count;j++) {
				let atom=infoarr[j].atom;
				if (Object.is(atom,mainatom)) {continue;}
				let dist=atom.pos.dist(mainatom.pos);
				if (dist<rad) {
					this.createbond(atom,mainatom,-1.0,tension);
				}
			}
		}
	}


	createbox(cen,side,rad,dist,type) {
		// O O O O
		//  O O O
		// O O O O
		let pos=new Vector(cen);
		let atomcombos=1;
		let dim=this.dim;
		for (let i=0;i<dim;i++) {atomcombos*=side;}
		let atomarr=new Array(atomcombos);
		for (let atomcombo=0;atomcombo<atomcombos;atomcombo++) {
			// Find the coordinates of the atom.
			let atomtmp=atomcombo;
			for (let i=0;i<dim;i++) {
				let x=atomtmp%side;
				atomtmp=Math.floor(atomtmp/side);
				pos[i]=cen[i]+(x*2-side+1)*dist;
			}
			atomarr[atomcombo]=this.createatom(pos,rad,type);
		}
		this.autobond(atomarr,Infinity);
	}


	update(time) {
		// Process the simulation in multiple steps if time is too large.
		if (time<1e-9 || isNaN(time)) {return;}
		let dt=this.maxsteptime;
		let steps=time<=dt?1:Math.ceil(time/dt);
		if (steps<Infinity) {dt=time/steps;}
		let rnd=this.rnd;
		for (let step=0;step<steps;step++) {
			// Integrate atoms.
			let next=this.atomlist.head,link;
			while ((link=next)!==null) {
				next=next.next;
				link.obj.update(dt);
			}
			// Integrate bonds. Randomizing the order minimizes oscillations.
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
				bondarr[i].obj.update(dt);
			}
			// Collide atoms.
			this.broad.build();
			this.broad.collide();
		}
	}

}

