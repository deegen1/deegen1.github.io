/*------------------------------------------------------------------------------


vector.js - v1.05

Copyright 2024 Alec Dee - MIT license - SPDX: MIT
2dee.net - akdee144@gmail.com


--------------------------------------------------------------------------------
Notes


Array() is faster than Float64Array().


--------------------------------------------------------------------------------
TODO


*/
/* npx eslint vector.js -c ../../standards/eslint.js */


//---------------------------------------------------------------------------------
// Vector - v1.05


class Vector extends Array {

	static rnd=new Random();


	constructor(elem) {
		let l=elem.length;
		if (l!==undefined) {
			super(l);
			for (let i=0;i<l;i++) {this[i]=elem[i];}
		} else {
			super(elem);
			this.fill(0);
		}
	}


	tostring() {
		return "["+this.join(", ")+"]";
	}


	set(val) {
		let l=this.length,vl=val.length,i;
		if (vl!==undefined) {
			l=l<vl?l:vl;
			for (i=0;i<l;i++) {this[i]=val[i];}
		} else {
			for (i=0;i<l;i++) {this[i]=val;}
		}
		return this;
	}


	// ----------------------------------------
	// Algebra


	neg() {
		let u=this,len=this.length,r=new Vector(len);
		for (let i=0;i<len;i++) {r[i]=-u[i];}
		return r;
	}


	iadd(v) {
		// u+=v
		let u=this,len=this.length;
		for (let i=0;i<len;i++) {u[i]+=v[i];}
		return this;
	}


	add(v) {
		// u+v
		let u=this,len=this.length,r=new Vector(len);
		for (let i=0;i<len;i++) {r[i]=u[i]+v[i];}
		return r;
	}


	isub(v) {
		// u-=v
		let u=this,len=this.length;
		for (let i=0;i<len;i++) {u[i]-=v[i];}
		return this;
	}


	sub(v) {
		// u-v
		let u=this,len=this.length,r=new Vector(len);
		for (let i=0;i<len;i++) {r[i]=u[i]-v[i];}
		return r;
	}


	imul(s) {
		// u*=s
		let u=this,len=this.length;
		for (let i=0;i<len;i++) {u[i]*=s;}
		return this;
	}


	mul(s) {
		// u*s
		let u=this,len=this.length,r=new Vector(len);
		for (let i=0;i<len;i++) {r[i]=u[i]*s;}
		return r;
	}


	dot(v) {
		// u*v
		let u=this,len=this.length,sum=0;
		for (let i=0;i<len;i++) {sum+=u[i]*v[i];}
		return sum;
	}


	// ----------------------------------------
	// Geometry


	dist(v) {
		// |u-v|
		let u=this,len=this.length,sum=0,x;
		for (let i=0;i<len;i++) {x=u[i]-v[i];sum+=x*x;}
		return Math.sqrt(sum);
	}


	sqr() {
		// u*u
		let u=this,len=this.length,sum=0,x;
		for (let i=0;i<len;i++) {x=u[i];sum+=x*x;}
		return sum;
	}


	mag() {
		// sqrt(u*u)
		let u=this,len=this.length,sum=0,x;
		for (let i=0;i<len;i++) {x=u[i];sum+=x*x;}
		return Math.sqrt(sum);
	}

	randomize() {
		let u=this,len=this.length;
		let mag,i,x,rnd=Vector.rnd;
		do {
			mag=0;
			for (i=0;i<len;i++) {
				x=rnd.getnorm();
				u[i]=x;
				mag+=x*x;
			}
		} while (mag<1e-10);
		mag=1.0/Math.sqrt(mag);
		for (i=0;i<len;i++) {u[i]*=mag;}
		return this;
	}


	static random(dim) {
		return (new Vector(dim)).randomize();
	}


	normalize() {
		let u=this,len=this.length,mag=0,i,x;
		for (i=0;i<len;i++) {
			x=u[i];
			mag+=x*x;
		}
		if (mag<1e-10) {
			this.randomize();
		} else {
			mag=1.0/Math.sqrt(mag);
			for (i=0;i<len;i++) {u[i]*=mag;}
		}
		return this;
	}


	norm() {
		return (new Vector(this)).normalize();
	}

}
