/*------------------------------------------------------------------------------


physics.js - v1.03

Copyright 2026 Alec Dee - MIT license - SPDX: MIT
2dee.net - akdee144@gmail.com


--------------------------------------------------------------------------------
Notes


Two bodies will only collide once per step.

en.wikipedia.org/wiki/Collision_response#Impulse-Based_Reaction_Model


--------------------------------------------------------------------------------
History


1.00
     Initial version. Spun off of atom engine.
1.02
     Bonds apply force before breaking.
1.03
     Added bonditer().
	Added Body.release().
     Fixed bodylist.release() in bond.release().


--------------------------------------------------------------------------------
TODO


Simplify bond normal calc.
Allow body.trans.vec = body.pos. Sync if different.

Minkowski wrapping.

Inertia shouldn't change if more verts are added on a face.
o-----------o vs o---o---o---o

Allow creating body from template.

BVH
	Omit if disabled or verts=0.
	See what sorting method works best for long polygons.
	Instead of just using min bounds, average (min+max)/2 and split min<mid.
	Fix inf's.

Hull Calc
	pick D closest points
	orient so no points are on one side
	add D-1 sides
	To build seed:
	1. Calc norm from [x,0,0,0] and find max.
	2. Calc norm from [x,y,0,0] and find max.
	3. Calc norm from [x,y,z,0] and find max.
	Once seed face is found, use edge to make other faces.
	Remove points too close.
	Remove points colinear.

Impulse
	N-D inertia tensor.
	N-D impulse calculation.

Collision
	Fix overlap detection sometimes returning wrong separating vector.
	Usually happens when parallel boxes.
	return [overlapping, a_point, b_point]
	Return closest points even on failure.
	Use hull points for collision.


*/
/* npx eslint physics.js -c ../../../standards/eslint.js */


import {Random,Vector,Matrix,Transform} from "./library.js";


//---------------------------------------------------------------------------------
// Physics - v1.03


class PhyLink {

	constructor(obj) {
		this.prev=null;
		this.next=null;
		this.list=null;
		this.obj=obj??null;
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

	constructor(ptr=null) {
		this.head=null;
		this.tail=null;
		this.ptr=ptr;
		this.count=0;
	}


	release(clear) {
		let link=this.head;
		while (link!==null) {
			let next=link.next;
			link.prev=null;
			link.next=null;
			link.list=null;
			if (clear) {link.obj=null;}
			link=next;
		}
		this.count=0;
	}


	*iter() {
		let link=null,next=this.head;
		while ((link=next)!==null) {
			next=link.next;
			yield link.obj;
		}
	}


	add(link) {
		this.addafter(link);
	}


	addafter(link,prev=null) {
		// Inserts the link after prev.
		link.remove();
		let next=null;
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


	addbefore(link,next=null) {
		// Inserts the link before next.
		link.remove();
		let prev=null;
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


class PhyInteraction {

	constructor(a,b) {
		this.world=a.world;
		this.worldlink=new PhyLink(this);
		this.world.intrlist.add(this.worldlink);
		this.a=a;
		this.b=b;
		this.pmul=0;
		this.vmul=0;
		this.vpmul=0;
		this.statictension=0;
		this.staticdist=0;
		this.dt=NaN;
		this.push0=0;
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


	calcdt(dt) {
		if (this.dt===dt) {return;}
		this.dt=dt;
		let ipush=1-this.pmul;
		this.push0=ipush>0?1-Math.pow(ipush,dt):1;
	}


	static get(a,b) {
		if (a.type!==undefined) {a=a.type;}
		if (b.type!==undefined) {b=b.type;}
		return a.intarr[b.id];
	}

}


class PhyBodyType {

	constructor(world,id,damp,density,elasticity,push,statictension,staticdist) {
		this.world=world;
		this.worldlink=new PhyLink(this);
		this.bodylist=new PhyList();
		this.id=id;
		this.intarr=[];
		this.damp=damp;
		this.density=density;
		this.pmul=push;
		this.vmul=elasticity;
		this.vpmul=0.95;
		this.statictension=statictension;
		this.staticdist=staticdist;
		this.dt =NaN;
		this.dt0=0;
		this.dt1=0;
		this.dt2=0;
		this.gravity=null;
		this.data={};
	}


	release() {
		let id=this.id;
		let link=this.world.typelist.head;
		while (link!==null) {
			link.obj.intarr[id]=null;
			link=link.next;
		}
		this.bodylist.release(true);
		this.worldlink.remove();
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
		let damp=this.damp,idamp=1-damp;
		let dt0=0,dt1=0,dt2=0;
		if (damp<=1e-10) {
			// Special case damping=0: just integrate.
			dt0=1;
			dt1=dt;
			dt2=dt*dt*0.5;
		} else if (idamp<=1e-10) {
			// Special case damping=1: all velocity=0.
			// If dt=0 then time isn't passing, so maintain velocity.
			dt0=(dt>=-1e-20 && dt<=1e-20)?1:0;
			dt1=0;
			dt2=0;
		} else {
			// Normal case.
			let lnd=Math.log(idamp);
			dt0=Math.exp(dt*lnd);
			dt1=(dt0-1 )/lnd;
			dt2=(dt1-dt)/lnd;
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
		let inter=new PhyInteraction(a,b);
		while (a.intarr.length<=b.id) {a.intarr.push(null);}
		while (b.intarr.length<=a.id) {b.intarr.push(null);}
		a.intarr[b.id]=inter;
		b.intarr[a.id]=inter;
	}

}


class PhyBody {

	constructor(world,verts,pos,angle,type) {
		type=type??world.deftype;
		this.world=world;
		this.worldlink=new PhyLink(this);
		this.world.bodylist.addbefore(this.worldlink);
		this.deleted=false;
		this.sleeping=false;
		this.bondlist=new PhyList();
		this.typelink=new PhyLink(this);
		this.type=type;
		type.bodylist.add(this.typelink);
		this.data={};
		//
		let vertarr=[];
		this.volume=0;
		if (verts instanceof PhyBody) {
			let body=verts;
			verts=body.vertarr;
			this.volume=body.volume;
			type=type??body.type;
			// trans=trans??body.trans;
		}
		let dim=world.dim,dim2=(dim*(dim-1))>>>1;
		for (let v of verts) {vertarr.push(new Vector(v));}
		this.vertarr=vertarr;
		this.facearr=[];
		this.type=type;
		this.vel=new Vector(dim);
		this.spin=(new Float64Array(dim2)).fill(0);
		this.angle=(new Float64Array(dim2)).fill(0);
		if (angle) {for (let i=0;i<dim2;i++) {this.angle[i]=angle[i];}}
		this.trans=new Transform({vec:pos,ang:this.angle});
		this.inv=this.trans.mat.inv();
		this.updateconstants();
	}


	release() {
		if (this.deleted) {return;}
		this.deleted=true;
		let link=null;
		while ((link=this.bondlist.head)!==null) {
			link.obj.release();
		}
		this.typelink.remove();
		this.worldlink.remove();
	}


	relpos(v) {return this.trans.apply(v);}


	invpos(v) {return this.trans.inv().apply(v);}


	relvel(p) {
		let vel=this.vel,spin=this.spin[0];
		let x=vel[0]-p[1]*spin;
		let y=vel[1]+p[0]*spin;
		return new Vector([x,y]);
	}


	bonditer() {return this.bondlist.iter();}


	updateconstants() {
		// Calculate mass and inertia.
		let dim=this.world.dim,dim2=(dim*(dim-1))>>>1;
		let dist=0;
		for (let v of this.vertarr) {
			dist+=v.sqr();
		}
		this.inertia=new Matrix(dim2,dim2);
		if (this.vertarr.length===0) {
			this.volume=0;
		} else if (dim!==2) {
			this.volume=1;
			for (let i=0;i<dim2;i++) {
				this.inertia[i*dim2+i]=dist;
			}
		} else {
			let vertarr=this.vertarr;
			let verts=vertarr.length;
			// Find the left-most vertex.
			let minv=vertarr[0];
			let mini=0;
			for (let i=1;i<verts;i++) {
				let u=vertarr[i];
				for (let d=0;d<dim;d++) {
					let vx=minv[d],ux=u[d];
					if (vx!==ux) {
						if (vx>ux) {minv=u;mini=i;}
						break;
					}
				}
			}
			// Wrap around to find the hull.
			vertarr[mini]=vertarr[0];
			vertarr[0]=minv;
			let hverts=1;
			while (hverts<verts) {
				mini=hverts;
				minv=vertarr[mini];
				let v0=vertarr[mini-1];
				for (let i=0;i<verts;i++) {
					let u=vertarr[i];
					let dx0=minv[0]-v0[0],dy0=minv[1]-v0[1];
					let dx1=u[0]-v0[0],dy1=u[1]-v0[1];
					if (dx0*dy1-dy0*dx1<0) {
						minv=u;
						mini=i;
					}
				}
				if (mini===0) {break;}
				// if (mini<hverts) {throw "loop";}
				vertarr[mini]=vertarr[hverts];
				vertarr[hverts++]=minv;
			}
			vertarr=vertarr.slice(0,hverts);
			this.vertarr=vertarr;
			// Calculate geometry.
			let facearr=[];
			let volume=0;
			let v0=null,v1=vertarr[hverts-1],cen=new Vector(dim);
			for (let i=0;i<hverts;i++) {
				v0=v1;
				v1=vertarr[i];
				facearr.push([(i?i:hverts)-1,i]);
				let cross=v0[0]*v1[1]-v1[0]*v0[1];
				volume+=cross;
				cen.iadd(v0.add(v1).imul(cross));
			}
			this.facearr=facearr;
			volume*=0.5;
			// Zero on center of mass.
			cen.imul(1/(volume*6));
			for (let v of vertarr) {
				v.isub(cen);
			}
			this.trans.vec.iadd(cen);
			// Inertia.
			let inertia=0;
			for (let face of facearr) {
				v0=vertarr[face[0]];
				v1=vertarr[face[1]];
				inertia+=v0.mul(v0)+v0.mul(v1)+v1.mul(v1);
			}
			inertia/=6;
			this.inertia[0]=inertia;
			this.volume=volume;
		}
		this.mass=this.type.density*this.volume;
		try {this.inertiainv=this.inertia.inv();}
		catch {this.inertiainv=new Matrix(dim2,dim2);}
	}


	closestpoint(point) {
		// Returns [overlapping, point] with a point on the border.
		let world=this.world;
		let trans=new Transform({dim:world.dim});
		point=new Vector(point);
		let col=world.closestpoint(this.vertarr,this.trans,[point],trans);
		return [col[0],col[1]];
	}


	update() {
		// Move the body and apply damping to the velocity.
		// acc+=gravity
		// pos+=vel*dt1+acc*dt2
		// vel =vel*dt0+acc*dt1
		let world=this.world;
		let trans=this.trans;
		let pe=trans.vec,ve=this.vel;
		let dim=world.dim,type=this.type;
		let ge=type.gravity;
		ge=(ge===null?world.gravity:ge);
		let dt0=type.dt0,dt1=type.dt1,dt2=type.dt2;
		for (let i=0;i<dim;i++) {
			let vel=ve[i],acc=ge[i];
			pe[i]+=vel*dt1+acc*dt2;
			ve[i] =vel*dt0+acc*dt1;
		}
		// Spin.
		const PI2=Math.PI*2;
		let se=this.spin,ae=this.angle;
		let dim2=(dim*(dim-1))>>>1;
		for (let i=0;i<dim2;i++) {
			let spin=se[i];
			let ang=ae[i]+spin*dt1;
			if (ang<0 || ang>PI2) {ang=(ang%PI2)+(ang<0?PI2:0);}
			se[i]=spin*dt0;
			ae[i]=ang;
		}
		trans.mat.one().rotate(ae);
		this.inv=trans.mat.inv();
	}


	static collide(a,b) {
		if (a===b || a.deleted || b.deleted) {return;}
		let world=a.world;
		let dim=world.dim;
		let amass=b.mass,bmass=a.mass;
		let mass=amass+bmass;
		if ((amass>=Infinity && bmass>=Infinity) || mass<=1e-10 || dim===0) {
			return;
		}
		amass=amass>=Infinity?1.0:amass/mass;
		bmass=bmass>=Infinity?1.0:bmass/mass;
		// Get the collision normal and contact points.
		let col=world.closestpoint(a.vertarr,a.trans,b.vertarr,b.trans);
		if (!col[0]) {return;}
		let acon=col[1],bcon=col[2];
		let norm=world.tmpvec[0];
		let push=0;
		for (let i=0;i<dim;i++) {
			let x=acon[i]-bcon[i];
			norm[i]=x;
			push+=x*x;
		}
		if (push<1e-10) {return;}
		push=Math.sqrt(push);
		let apos=a.trans.vec,bpos=b.trans.vec;
		// norm=|norm|, acon-=apos, bcon-=bpos
		for (let i=0;i<dim;i++) {
			norm[i]/=push;
			acon[i]-=apos[i];
			bcon[i]-=bpos[i];
		}
		// Calculate normal and perpendicular collision forces.
		// If they're moving away, don't apply any force.
		let intr=a.type.intarr[b.type.id];
		let vel=world.tmpvec[1];
		let avel=a.vel,bvel=b.vel;
		vel[0] =avel[0]-acon[1]*a.spin[0];
		vel[1] =avel[1]+acon[0]*a.spin[0];
		vel[0]-=bvel[0]-bcon[1]*b.spin[0];
		vel[1]-=bvel[1]+bcon[0]*b.spin[0];
		let ndot=0;
		for (let i=0;i<dim;i++) {
			ndot+=vel[i]*norm[i];
		}
		let nmag=ndot>0?ndot:0;
		nmag=nmag*intr.vmul+push*intr.vpmul;
		push*=intr.push0;
		// Add static friction bonds.
		let staticdist=intr.staticdist;
		let bonded=null,staticbond=false;
		// Get inverse contact points.
		let ainv=world.tmpvec[2],binv=world.tmpvec[3];
		let amat=a.inv,bmat=b.inv;
		let ai=0,bi=0;
		for (let d=0;d<dim;d++) {
			let ax=0,bx=0;
			for (let i=0;i<dim;i++) {
				ax+=amat[ai++]*acon[i];
				bx+=bmat[bi++]*bcon[i];
			}
			ainv[d]=ax;
			binv[d]=bx;
		}
		if (staticdist>0 && intr.statictension>0) {
			// Find any bonds close to the contact points.
			let dist2=staticdist*staticdist;
			let al=a.bondlist,bl=b.bondlist;
			let link=(al.count<bl.count?al:bl).head;
			while (link!==null) {
				let bond=link.obj;
				link=link.next;
				let u=bond.a,v=bond.b;
				let ucon=bond.apos,vcon=bond.bpos;
				if (v===a) {
					v=u;u=bond.b;
					vcon=ucon;ucon=bond.bpos;
				}
				if (u===a && v===b) {
					bonded=bond;
					// if (bond.breakdist<Infinity) {
					let d0=0,d1=0;
					for (let i=0;i<dim;i++) {
						let a=ucon[i]-ainv[i];d0+=a*a;
						let b=vcon[i]-binv[i];d1+=b*b;
					}
					if (d0<dist2 || d1<dist2) {
						staticbond=true;
						break;
					}
				}
			}
		}
		// If we have a callback, allow it to handle the collision.
		let callback=world.collcallback;
		if (callback!==null && !callback(intr,a,acon,b,bcon,norm,nmag,push,bonded)) {return;}
		if (!staticbond && intr.statictension>0 && intr.staticdist>0) {
			let bond=world.createbond(a,ainv,b,binv,0,intr.statictension);
			bond.breakdist=intr.staticdist;
		}
		// Apply forces and separate.
		let ainertia=amass*a.inertiainv[0],binertia=bmass*b.inertiainv[0];
		let ancross=acon[0]*norm[1]-acon[1]*norm[0];
		let bncross=bcon[0]*norm[1]-bcon[1]*norm[0];
		let nden=amass+bmass+ainertia*ancross*ancross+binertia*bncross*bncross;
		nmag/=nden;
		for (let i=0;i<dim;i++) {
			let n=norm[i];
			apos[i]-=amass*n*push;
			avel[i]-=amass*n*nmag;
			bpos[i]+=bmass*n*push;
			bvel[i]+=bmass*n*nmag;
		}
		a.spin[0]-=ainertia*ancross*nmag;
		b.spin[0]+=binertia*bncross*nmag;
	}

}


class PhyBond {

	constructor(world,a,apos,b,bpos,dist,tension) {
		this.world=world;
		this.worldlink=new PhyLink(this);
		this.world.bondlist.add(this.worldlink);
		this.deleted=false;
		this.a=a;
		this.apos=new Vector(apos);
		this.b=b;
		this.bpos=new Vector(bpos);
		if (!(dist>=0)) {dist=this.relapos().dist(this.relbpos());}
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
		if (this.deleted) {return;}
		this.deleted=true;
		this.alink.remove();
		this.blink.remove();
		this.worldlink.remove();
	}


	relapos() {return this.a.trans.apply(this.apos);}
	relbpos() {return this.b.trans.apply(this.bpos);}


	update() {
		// Pull two bodies toward eachother based on the distance and bond strength.
		// Vector operations are unrolled to use constant memory.
		let a=this.a,b=this.b;
		if (this.deleted || (a.sleeping && b.sleeping)) {return;}
		let amass=b.mass,bmass=a.mass;
		let mass=amass+bmass;
		let world=a.world;
		let dim=world.dim;
		if ((amass>=Infinity && bmass>=Infinity) || mass<=1e-10 || dim===0) {
			return;
		}
		amass=amass>=Infinity?1.0:amass/mass;
		bmass=bmass>=Infinity?1.0:bmass/mass;
		// Get the distance and direction between the bodies.
		let tmpvec=world.tmpvec;
		let apos=a.trans.vec,bpos=b.trans.vec;
		let acon=tmpvec[1],bcon=tmpvec[2];
		for (let side=0;side<2;side++) {
			let mat=(side?b:a).trans.mat;
			let scon=side?this.bpos:this.apos;
			let dcon=side?bcon:acon;
			let midx=0;
			for (let i=0;i<dim;i++) {
				let x=0;
				for (let j=0;j<dim;j++) {
					x+=mat[midx++]*scon[j];
				}
				dcon[i]=x;
			}
		}
		let norm=tmpvec[0];
		let dist=0.0;
		for (let i=0;i<dim;i++) {
			let x=bcon[i]-acon[i]+bpos[i]-apos[i];
			norm[i]=x;
			dist+=x*x;
		}
		dist=Math.sqrt(dist);
		// If the points are too far, break the bond.
		if (!(dist<this.breakdist)) {
			this.release();
			return;
		}
		// If the points are too close together, randomize the direction.
		let tension=this.tension;
		if (dist>1e-10) {
			// tension/=dist;
			for (let i=0;i<dim;i++) {norm[i]/=dist;}
		} else {
			norm.randomize();
		}
		// let ainertia=0,binertia=0;
		let ainertia=amass*a.inertiainv[0],binertia=bmass*b.inertiainv[0];
		let ancross=acon[0]*norm[1]-acon[1]*norm[0];
		let bncross=bcon[0]*norm[1]-bcon[1]*norm[0];
		let nden=amass+bmass+ainertia*ancross*ancross+binertia*bncross*bncross;
		tension/=nden;
		// Apply equal and opposite acceleration. Updating pos and vel in this
		// function, instead of waiting for body.update(), increases stability.
		let at=a.type,bt=b.type;
		let acc=(this.dist-dist)*tension;
		let aacc=acc*amass,aposmul=aacc*at.dt2,avelmul=aacc*at.dt1;
		let bacc=acc*bmass,bposmul=bacc*bt.dt2,bvelmul=bacc*bt.dt1;
		let avel=a.vel,bvel=b.vel;
		for (let i=0;i<dim;i++) {
			let dif=norm[i];
			apos[i]-=dif*aposmul;
			avel[i]-=dif*avelmul;
			bpos[i]+=dif*bposmul;
			bvel[i]+=dif*bvelmul;
		}
		// Apply rotation.
		ainertia*=ancross*acc;
		a.angle[0]-=ainertia*at.dt2;
		a.spin[0] -=ainertia*at.dt1;
		a.trans.mat.one().rotate(a.angle);
		binertia*=bncross*acc;
		b.angle[0]+=binertia*bt.dt2;
		b.spin[0] +=binertia*bt.dt1;
		b.trans.mat.one().rotate(b.angle);
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
	// If flags&1: body_id=right
	// If flags&2: sleeping
	//
	// Center splitting.
	// Flat construction.


	constructor(world) {
		this.world=world;
		this.slack=0.05;
		this.bodycnt=0;
		this.bodyarr=null;
		this.memi32=[];
		this.memf32=null;
	}


	release() {
		this.bodyarr=null;
		this.bodycnt=0;
		this.memi32=[];
		this.memf32=null;
	}


	build() {
		// Build a bounding volume hierarchy for the bodies.
		//
		// During each step, find the axis with the largest range (x_max-x_min).
		// Sort the bodies by whether they're above or below the center of this range.
		let world=this.world;
		let dim=world.dim;
		let bodycnt=world.bodylist.count;
		this.bodycnt=bodycnt;
		if (bodycnt===0) {return;}
		// Allocate working arrays.
		let dim2=2*dim,nodesize=3+dim2;
		let sortstart=nodesize*(bodycnt*2-1);
		let treesize=sortstart*2;
		let memi=this.memi32;
		if (memi.length<treesize) {
			memi=new Int32Array(treesize*2);
			this.memi32=memi;
			this.memf32=new Float32Array(memi.buffer);
			this.bodyarr=new Array(bodycnt*2);
		}
		let memf=this.memf32;
		// Store bodies and their bounds. body_id*2+sleeping.
		let leafstart=sortstart+bodycnt;
		let slack=(1+this.slack)*0.5;
		let leafidx=leafstart;
		let bodyarr=this.bodyarr;
		let bodylink=world.bodylist.head;
		let tmpbnd=new Float32Array(dim*2);
		for (let i=0;i<bodycnt;i++) {
			let body=bodylink.obj;
			bodylink=bodylink.next;
			bodyarr[i]=body;
			memi[leafidx++]=(i<<1)|(body.sleeping?1:0);
			memi[sortstart+i]=leafidx;
			// Find the bounding box of the transformed body.
			let trans=body.trans;
			let pos=trans.vec,mat=trans.mat;
			for (let d=0;d<dim;d++) {
				tmpbnd[d*2  ]= Infinity;
				tmpbnd[d*2+1]=-Infinity;
			}
			for (let v of body.vertarr) {
				let midx=0;
				for (let d=0;d<dim;d++) {
					let d2=d+d;
					let x=pos[d];
					for (let j=0;j<dim;j++) {
						x+=mat[midx++]*v[j];
					}
					let y=tmpbnd[d2];
					tmpbnd[d2]=x<y?x:y;
					y=tmpbnd[++d2];
					tmpbnd[d2]=x>y?x:y;
				}
			}
			for (let d=0;d<dim2;d+=2) {
				let min=tmpbnd[d],max=tmpbnd[d+1];
				let cen=(max+min)*0.5,dev=(max-min)*slack;
				memf[leafidx++]=cen-dev;
				memf[leafidx++]=cen+dev;
			}
		}
		memi[1]=-1;
		memi[2]=sortstart+bodycnt;
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
			for (let i=n+3;i<ndim;i+=2) {
				let x=memf[l++],y=memf[r++];
				memf[i  ]=x<y?x:y;
				x=memf[l++];y=memf[r++];
				memf[i+1]=x>y?x:y;
			}
		}
	}


	collide() {
		// Check for collisions among leaves. Randomly reorder the tree to randomize
		// collision order.
		let bodycnt=this.bodycnt;
		if (bodycnt<=1) {return;}
		let nodesize=3+this.world.dim*2;
		let treeend=nodesize*(bodycnt*2-1);
		let memi=this.memi32;
		let memf=this.memf32;
		let bodyarr=this.bodyarr;
		let collide=PhyBody.collide;
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
			let body=bodyarr[memi[n+2]];
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
						else {collide(body,bodyarr[memi[node+2]]);}
					}
				}
				node=next>>>2;
			}
		}
	}

}


class PhyWorld {

	constructor(dim,gravity=0.2,statictension=50.0,staticdist=0.005) {
		this.dim=dim;
		this.maxsteptime=1/180;
		this.rnd=new Random();
		this.tmpvec=[];
		for (let i=0;i<4;i++) {this.tmpvec.push(new Vector(dim));}
		this.gravity=new Vector(dim);
		this.gravity[dim-1]=gravity;
		this.typelist=new PhyList();
		this.intrlist=new PhyList();
		this.bodylist=new PhyList();
		this.bondlist=new PhyList();
		this.bondarr =[];
		this.broad=new PhyBroadphase(this);
		this.stepcallback=null;
		this.collcallback=null;
		this.data={};
		this.epainit();
		// Default type
		this.deftension=statictension;
		this.defdist=staticdist;
		this.deftype=this.createbodytype();
	}


	release() {
		this.bodylist.release();
		this.typelist.release();
		this.intrlist.release();
		this.bodylist.release();
		this.broad.release();
	}


	bodyiter() {return this.bodylist.iter();}
	bonditer() {return this.bondlist.iter();}


	createbodytype(damp=0.02,density=1,elasticity=0.95,push=1,statictension,staticdist) {
		// Assume types are sorted from smallest to largest.
		// Find if there's any missing ID or add to the end.
		let link=this.typelist.head;
		let id=0;
		while (link!==null) {
			let nextid=link.obj.id;
			if (id<nextid) {break;}
			id=nextid+1;
			link=link.next;
		}
		statictension=statictension??this.deftension;
		staticdist=staticdist??this.defdist;
		let type=new PhyBodyType(this,id,damp,density,elasticity,push,statictension,staticdist);
		this.typelist.addbefore(type.worldlink,link);
		link=this.typelist.head;
		while (link!==null) {
			PhyBodyType.initinteraction(link.obj,type);
			link=link.next;
		}
		return type;
	}


	createbody(verts,pos,angle,type) {
		return new PhyBody(this,verts,pos,angle,type);
	}


	createbox(sides,pos,angle,type) {
		let vertarr=[];
		let dim=this.dim,verts=1<<dim;
		for (let i=0;i<verts;i++) {
			let v=new Vector(dim);
			for (let j=0;j<dim;j++) {v[j]=(((i>>>j)&1)*2-1)*sides[j];}
			vertarr.push(v);
		}
		return this.createbody(vertarr,pos,angle,type);
	}


	createsphere(sides,detail,pos,angle,type) {
		if (isNaN(detail) || detail<3) {throw "no detail";}
		let vertarr=[];
		for (let i=0;i<detail;i++) {
			let ang=Math.PI*2*i/detail;
			let v=new Vector([Math.cos(ang)*sides[0],Math.sin(ang)*sides[1]]);
			vertarr.push(v);
		}
		return this.createbody(vertarr,pos,angle,type);
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


	createbond(a,apos,b,bpos,dist,tension) {
		// Create a bond. If dist<0, use the current distance between the bodies.
		let bond=new PhyBond(this,a,apos,b,bpos,dist,tension);
		return bond;
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
			// Update types and interactions.
			let typelink=this.typelist.head;
			while (typelink!==null) {
				typelink.obj.updateconstants(dt);
				typelink=typelink.next;
			}
			let intrlink=this.intrlist.head;
			while (intrlink!==null) {
				intrlink.obj.calcdt(dt);
				intrlink=intrlink.next;
			}
			// Integrate bodies.
			let bodylink=this.bodylist.head;
			while (bodylink!==null) {
				bodylink.obj.update();
				bodylink=bodylink.next;
			}
			// Integrate bonds after bodies or vel will be counted twice.
			// Randomize the evaluation order to reduce oscillations.
			let bondcnt=this.bondlist.count;
			let bondarr=this.bondarr;
			if (bondarr.length<bondcnt) {
				bondarr=new Array(bondcnt*2);
				this.bondarr=bondarr;
			}
			let bondlink=this.bondlist.head;
			for (let i=0;i<bondcnt;i++) {
				let j=rnd.getu32()%(i+1);
				bondarr[i]=bondarr[j];
				bondarr[j]=bondlink.obj;
				bondlink=bondlink.next;
			}
			for (let i=0;i<bondcnt;i++) {
				bondarr[i].update();
			}
			// Collide bodies.
			this.broad.build();
			this.broad.collide();
		}
	}


	// ----------------------------------------
	// Collisions


	epainit() {
		let dim=this.dim,dim1=(dim+1)*dim;
		this.colepaarr=[];
		this.coltmpvertarr=[new Float64Array(0),new Float64Array(0)];
		this.coldif=new Float64Array(dim1);
		this.colmat=new Float64Array(dim1);
		this.colvertarr=new Float64Array(dim1);
		this.colvertid=new Int32Array(dim+1);
		this.colprevid=new Int32Array(dim+1);
		this.colweight=new Float64Array(dim);
		this.colepacmp=function epacmp(a,b) {
			// If distances are the same, sort by vertices to detect duplicates.
			let ad=a.dist,bd=b.dist;
			// if (d<-1e-10 || d>1e-10) {return d<0?-1:1;}
			if (ad!==bd) {return ad<bd?-1:1;}
			let as=a.vertid,bs=b.vertid;
			for (let i=0;i<dim;i++) {
				let av=as[i],bv=bs[i];
				if (av!==bv) {return av<bv?-1:1;}
			}
			return 0;
		};
		this.epaalloc(dim+1);
	}


	epaalloc(len) {
		let epaarr=this.colepaarr;
		if (len>epaarr.length) {
			let dim=this.dim;
			while (len&(len+1)) {len|=len>>>1;}
			while (epaarr.length<=len) {
				epaarr.push({
					vertid:new Int32Array(dim),
					weight:new Float64Array(dim),
					norm:new Float64Array(dim),
					dist:0
				});
			}
			this.colepaarr=epaarr;
		}
		return epaarr;
	}


	closestpoint(_avertarr,atrans,_bvertarr,btrans) {
		// GJK
		// Determines if bodies are colliding.
		// Doesn't use constant memory.
		// Finds minimum separating vector.
		// Inline everything for performance.
		// EPA
		//      vert IDs [D]
		//      weights  [D]
		//      normal   [D]
		//      dist
		let dim=this.dim;
		let averts=_avertarr.length,bverts=_bvertarr.length;
		if (!dim) {return [(averts>0 && bverts>0),new Vector(0),new Vector(0)];}
		// Pick an initial direction. Any will work, but B.pos-A.pos works best.
		let dif=this.coldif;
		let normsum=0;
		for (let i=0;i<dim;i++) {
			let x=btrans.vec[i]-atrans.vec[i];
			dif[i]=x;
			normsum+=x*x;
		}
		// Pretransform the vertices. Flatten arrays to [x0,y0,z0,x1,y1,z1,...].
		for (let side=0;side<2;side++) {
			let srcarr=side?_bvertarr:_avertarr;
			let dstarr=this.coltmpvertarr[side];
			let verts=srcarr.length,vertlen=verts*dim;
			if (dstarr.length<vertlen) {
				dstarr=new Float64Array(vertlen*2);
				this.coltmpvertarr[side]=dstarr;
			}
			let mat=(side?btrans:atrans).mat;
			// mat*v+vec
			for (let s=0,d=0;s<verts;s++) {
				let v=srcarr[s];
				for (let i=0,m=0;i<dim;i++) {
					let x=side?dif[i]:0;
					for (let j=0;j<dim;j++) {x+=mat[m++]*v[j];}
					dstarr[d++]=x;
				}
			}
		}
		let avertlen=averts*dim,bvertlen=bverts*dim;
		let avertarr=this.coltmpvertarr[0],bvertarr=this.coltmpvertarr[1];
		if (normsum<1e-10) {dif[0]=1;}
		let mat=this.colmat;
		let vertarr=this.colvertarr;
		let vertid=this.colvertid;
		let previd=this.colprevid;
		let weight=this.colweight;
		previd.fill(-1);
		// Setup EPA memory.
		let epaarr=this.colepaarr;
		let epaalloc=epaarr.length;
		let epacmp=this.colepacmp;
		let epalen=-1,epachild=0;
		let epaprev=null;
		// Stop searching for a separating vector at (a.verts+b.verts+1)^2.
		let verts=1,reject=-1;
		let test=0,tests=(averts+bverts+1)*(averts+bverts+1);
		for (test=0;test<tests || epalen>=0;test++) {
			let norm=dif;
			let mask=1<<verts;
			let dist=0;
			if (epalen>=0) {
				// If we've added child EPA faces, sort them.
				if (epachild) {
					for (let child=0;child<verts;child++) {
						let i=epalen++;
						let epa=epaarr[i];
						while (i>0) {
							let j=(i-1)>>>1;
							let p=epaarr[j];
							if (epacmp(p,epa)<0) {break;}
							epaarr[i]=p;
							i=j;
						}
						epaarr[i]=epa;
					}
					epachild=0;
				}
				// Find the next closest simplex.
				let epa=epaarr[0];
				let last=epaarr[--epalen];
				let idx=0;
				while (true) {
					let i0=idx*2+1,i1=i0+1;
					if (i0>=epalen) {break;}
					if (i1>=epalen) {i1=i0;}
					let e0=epaarr[i0],e1=epaarr[i1];
					if (epacmp(e0,e1)>0) {i0=i1;e0=e1;}
					if (epacmp(e0,last)>=0) {break;}
					epaarr[idx]=e0;
					idx=i0;
				}
				epaarr[idx]=last;
				epaarr[epalen]=epa;
				// Prevent backtracking and duplicates.
				if (epaprev!==null && epacmp(epaprev,epa)>=0) {continue;}
				if (epalen+verts+1>epaalloc) {
					epaarr=this.epaalloc(epalen+verts+1);
					epaalloc=epaarr.length;
				}
				// Move the current EPA to the end so it isn't overwritten.
				epaprev=epa;
				epaarr[epalen]=epaarr[epaalloc-1];
				epaarr[epaalloc-1]=epaprev;
				for (let i=0;i<dim;i++) {vertid[i]=epa.vertid[i];}
				norm=epa.norm;
				dist=epa.dist;
				mask--;
			}
			// Find new supports. Direction is stored in dif[0...dim].
			if (reject<0) {
				let max=-Infinity,min=Infinity;
				let a=0,b=0;
				// Find max(A.verts*norm);
				for (let i=0;i<avertlen;i+=dim) {
					let p=0;
					for (let j=0;j<dim;j++) {p+=avertarr[i+j]*norm[j];}
					if (max<p) {max=p;a=i;}
				}
				// Find min(B.verts*bnorm)
				for (let i=0;i<bvertlen;i+=dim) {
					let p=0;
					for (let j=0;j<dim;j++) {p+=bvertarr[i+j]*norm[j];}
					if (min>p) {min=p;b=i;}
				}
				// If we have a separating vector or can't expand the EPA.
				if (max-min-dist<1e-10) {break;}
				let id=a*bvertlen+b,i=verts-1;
				while (i>0 && vertid[i-1]>id) {
					vertid[i]=vertid[i-1];
					i--;
				}
				vertid[i]=id;
			}
			// Calculate the current set of minkowski vertices A.vert(i)-B.vert(j).
			for (let i=0;i<verts;i++) {
				let id=vertid[i];
				if (previd[i]!==id) {
					previd[i]=id;
					let a=~~(id/bvertlen),b=id%bvertlen,d=i*dim;
					for (let j=0;j<dim;j++) {vertarr[d+j]=avertarr[a+j]-bvertarr[b+j];}
				}
			}
			// Find the closest point in a set of vertices to another point.
			// Use linear algebra to compute the barycenter coordinates of the set.
			while (--mask>0) {
				// di = vi - v0
				// dP =  P - v0, put in row 0
				let vidx=dim,cols=0,v0=0;
				for (let i=0;i<verts;i++) {
					if (!(mask&(1<<i))) {continue;}
					let r=i*dim;
					if (!cols++) {v0=r;continue;}
					for (let j=0;j<dim;j++) {dif[vidx++]=vertarr[r+j]-vertarr[v0+j];}
				}
				for (let j=0;j<dim;j++) {dif[j]=-vertarr[v0+j];}
				// Create matrix. Note the solution column is on the left for efficiency.
				// [ d1*dP | d1*d1 d1*d2 d1*d3 ... ]
				// [ d2*dP | d2*d1 d2*d2 d2*d3 ... ]
				let rows=cols-1,elems=rows*cols;
				for (let i=1;i<cols;i++) {
					let rvec=i*dim;vidx=0;
					for (let j=0;j<=i;j++) {
						let dot=0;
						for (let k=0;k<dim;k++) {
							dot-=dif[rvec+k]*dif[vidx++];
						}
						mat[(i-1)*cols+j]=dot;
						if (j) {mat[(j-1)*cols+i]=dot;}
					}
				}
				// Row reduce the matrix.
				// [ u3 | 0 0 1 ]
				// [ u2 | 0 1 0 ]
				// [ u1 | 1 0 0 ]
				for (let i=0;i<rows;i++) {
					// Find the largest element in column i.
					let row=i*cols,off=rows-i,last=row+off;
					let src=0,dst=last;
					let max=0;
					for (let r=last;r<elems;r+=cols) {
						let x=mat[r],a=x>0?x:-x;
						if (max<a) {max=a;src=r;}
					}
					// Normalize and move picked row.
					max=max>1e-10?1/mat[src]:0;
					while (dst>=row) {
						let a=mat[dst],b=mat[src];
						mat[src--]=a;
						mat[dst--]=b*max;
					}
					// Reduce other rows.
					for (let r=off;r<elems;r+=cols) {
						if (r===last) {continue;}
						dst=r;src=last;
						let mul=mat[dst];
						while (src>row) {
							mat[--dst]-=mul*mat[--src];
						}
					}
				}
				// The first column of mat holds the barycenter coordinates.
				// Find a new direction. Store in dif[0...dim].
				reject=-1;
				vidx=dim;
				let u0=1,min=0;
				for (let i=1;i<=rows;i++) {
					let u=mat[elems-i*cols];
					for (let j=0;j<dim;j++) {
						dif[j]-=u*dif[vidx++];
					}
					if (min>u) {min=u;reject=i;}
					weight[i]=u;
					u0-=u;
				}
				if (min>u0) {min=u0;reject=0;}
				weight[0]=u0;
				if (epalen>=0) {
					// Check all combinations for the closest point.
					if (reject>=0) {continue;}
					dist=0;
					for (let i=0;i<dim;i++) {
						let x=dif[i];
						dist+=x*x;
					}
					for (let child=0;child<verts;child++) {
						// Record the new EPA face. NaN distances can occur.
						let bit=1<<child;
						let epa=epaarr[epalen+child];
						let edist=(epachild&bit)?epa.dist:Infinity;
						if (edist>dist && !(mask&bit)) {
							epa.dist=dist;
							epachild|=bit;
							let wpos=0;
							let enorm=epa.norm,eweight=epa.weight,evertid=epa.vertid;
							for (let i=0;i<dim;i++) {
								let j=i+(i>=child);
								enorm[i]=-dif[i];
								eweight[i]=((mask>>>j)&1)?weight[wpos++]:0;
								evertid[i]=vertid[j];
							}
						}
					}
				} else if (verts<=dim) {
					verts++;
					reject=-1;
					break;
				} else if (reject>=0) {
					verts--;
					for (let i=reject;i<verts;i++) {vertid[i]=vertid[i+1];}
					break;
				} else {
					// The polygons are colliding so build the EPA.
					epalen=0;
				}
			}
		}
		if (epaprev!==null) {
			// Calculate contact points based on weights.
			let apos=atrans.vec;
			let ap=new Vector(apos),bp=new Vector(apos);
			for (let i=0;i<dim;i++) {
				let w =epaprev.weight[i];
				let id=epaprev.vertid[i];
				let av=~~(id/bvertlen);
				let bv=id%bvertlen;
				for (let j=0;j<dim;j++) {
					ap[j]+=w*avertarr[av+j];
					bp[j]+=w*bvertarr[bv+j];
				}
			}
			// Recalculate norm and magnitude based on contacts.
			// let norm=bp.sub(ap);
			// let mag=norm.mag();
			// norm.imul(1/mag);
			return [true,ap,bp];
		}
		// If we're rejecting.
		return [false,null,null];
	}

}


const Phy={
	Intr:PhyInteraction,
	BodyType:PhyBodyType,
	Body:PhyBody,
	World:PhyWorld
};
export {Phy};

