/*------------------------------------------------------------------------------


library.js - v16.90

Copyright 2025 Alec Dee - MIT license - SPDX: MIT
2dee.net - akdee144@gmail.com


--------------------------------------------------------------------------------
Versions


Debug   - v1.01
Random  - v1.11
Vector  - v3.06
Input   - v1.19
Drawing - v3.29
UI      - v1.02
Audio   - v3.09
Physics - v3.13


--------------------------------------------------------------------------------
Notes


import {Debug,Random,Vector,Matrix,Transform,
Input,UI,Draw,Audio,Phy} from "./library.js";


*/
/* npx eslint library.js -c ../../standards/eslint.js */


//---------------------------------------------------------------------------------
// Debug - v1.01


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


const Debug={
	IsVisible:IsVisible
};
export {Debug};


//---------------------------------------------------------------------------------
// Random - v1.11


export class Random {

	constructor(seed) {
		this.acc=0;
		this.inc=1;
		this.seed(seed);
	}


	seed(seed) {
		if (seed===undefined || seed===null) {
			seed=performance.timeOrigin+performance.now();
		}
		if (seed.length===2) {
			this.acc=seed[0];
			this.inc=seed[1];
		} else if (seed.acc!==undefined) {
			this.acc=seed.acc;
			this.inc=seed.inc;
		} else {
			this.acc=(seed/4294967296)>>>0;
			this.inc=seed>>>0;
			this.acc=this.getu32();
			this.inc=(this.getu32()|1)>>>0;
		}
	}


	getstate() {
		return [this.acc,this.inc];
	}


	static hashu32(val) {
		val+=0x66daacfd;
		val=Math.imul(val^(val>>>16),0xf8b7629f);
		val=Math.imul(val^(val>>> 8),0xcbc5c2b5);
		val=Math.imul(val^(val>>>24),0xf5a5bda5);
		return val>>>0;
	}


	getu32() {
		let val=(this.acc+this.inc)>>>0;
		this.acc=val;
		val+=0x66daacfd;
		val=Math.imul(val^(val>>>16),0xf8b7629f);
		val=Math.imul(val^(val>>> 8),0xcbc5c2b5);
		val=Math.imul(val^(val>>>24),0xf5a5bda5);
		return val>>>0;
	}


	mod(mod) {
		if (!(mod>0 && (mod>>>0)===mod)) {
			throw "mod out of range: "+mod;
		}
		let rand=0,rem=0,nmod=(-mod)>>>0;
		do {
			rand=this.getu32();
			rem=rand%mod;
		} while (rand-rem>nmod);
		return rem;
	}


	getf() {
		// Returns a float in [0,1).
		return this.getu32()*(1.0/4294967296.0);
	}


	gets() {
		// Returns a float in [-1,1).
		return (this.getu32()-2147483648)*(1.0/2147483648.0);
	}


	getnorm() {
		// Box-Muller transform.
		let r=this.getf();
		r=Math.sqrt(-2*Math.log(r>1e-99?r:1e-99));
		return Math.cos(6.283185307*this.getf())*r;
	}

}


//---------------------------------------------------------------------------------
// Vector - v3.06


export class Vector extends Array {

	static rnd=new Random();


	constructor(elem) {
		let arr=elem.length!==undefined;
		super(arr?elem.length:elem);
		this.set(arr?elem:0);
	}


	tostring() {return "["+this.join(", ")+"]";}
	toString() {return this.tostring();}


	sanitize(v) {
		// Converts v to a vector or throws an error.
		let len=this.length,vlen=v.length;
		if (vlen!==undefined) {
			if (vlen!==len) {throw `Incompatible lengths: ${len}, ${vlen}`;}
			return v;
		} else if (!isNaN(v)) {
			return (new Vector(len)).set(v);
		}
		throw `Unrecognized vector type: ${typeof v}`;
	}


	set(v=0) {
		let len=this.length,vlen=v.length;
		if (vlen!==undefined) {
			len=len<vlen?len:vlen;
			for (let i=0;i<len;i++) {this[i]=v[i];}
		} else if (!isNaN(v)) {
			for (let i=0;i<len;i++) {this[i]=v;}
		} else {
			throw `Unrecognized vector type: ${typeof v}`;
		}
		return this;
	}


	copy() {return new Vector(this);}


	// ----------------------------------------
	// Comparison


	static cmp(u,v) {
		// return -1, 0, 1
		let ulen=u.length,vlen=v.length;
		let len=ulen<vlen?ulen:vlen;
		for (let i=0;i<len;i++) {
			let x=u[i],y=v[i];
			if (x!==y) {return x<y?-1:1;}
		}
		if (ulen===vlen) {return 0;}
		return ulen<vlen?-1:1;
	}


	static lt(u,v) {return u.cmp(v)<0;}
	static le(u,v) {return u.cmp(v)<=0;}


	imin(v) {
		v=this.sanitize(v);
		let u=this,len=this.length;
		for (let i=0;i<len;i++) {let x=u[i],y=v[i];u[i]=x<y?x:y;}
		return this;
	}


	min(v) {return this.copy().imin(v);}


	imax(v) {
		v=this.sanitize(v);
		let u=this,len=this.length;
		for (let i=0;i<len;i++) {let x=u[i],y=v[i];u[i]=x>y?x:y;}
		return this;
	}


	max(v) {return this.copy().imax(v);}


	// ----------------------------------------
	// Algebra


	ineg() {
		let u=this,len=this.length;
		for (let i=0;i<len;i++) {u[i]=-u[i];}
		return this;
	}


	neg() {return this.copy().ineg();}


	iadd(v) {
		// u+=v
		v=this.sanitize(v);
		let u=this,len=this.length;
		for (let i=0;i<len;i++) {u[i]+=v[i];}
		return this;
	}


	add(v) {return this.copy().iadd(v);}


	isub(v) {
		// u-=v
		v=this.sanitize(v);
		let u=this,len=this.length;
		for (let i=0;i<len;i++) {u[i]-=v[i];}
		return this;
	}


	sub(v) {return this.copy().isub(v);}


	imul(s) {
		// u*=s
		let u=this,len=this.length;
		for (let i=0;i<len;i++) {u[i]*=s;}
		return this;
	}


	mul(v) {
		// dot or scalar product
		let u=this,len=this.length,vlen=v.length;
		if (vlen!==undefined) {
			if (vlen!==len) {throw `Incompatible lengths: ${len}, ${vlen}`;}
			let sum=0;
			for (let i=0;i<len;i++) {sum+=u[i]*v[i];}
			return sum;
		}
		let r=new Vector(len);
		for (let i=0;i<len;i++) {r[i]=u[i]*v;}
		return r;
	}


	// ----------------------------------------
	// Geometry


	dist2(v) {
		// (u-v)^2
		v=this.sanitize(v);
		let u=this,len=this.length,sum=0;
		for (let i=0;i<len;i++) {let x=u[i]-v[i];sum+=x*x;}
		return sum;
	}


	dist(v) {return Math.sqrt(this.dist2(v));}


	sqr() {
		// u*u
		let u=this,len=this.length,sum=0;
		for (let i=0;i<len;i++) {let x=u[i];sum+=x*x;}
		return sum;
	}


	mag() {return Math.sqrt(this.sqr());}


	normalize() {
		let u=this,len=this.length,mag=0;
		for (let i=0;i<len;i++) {
			let x=u[i];
			mag+=x*x;
		}
		if (mag>1e-10) {
			mag=1/Math.sqrt(mag);
			for (let i=0;i<len;i++) {u[i]*=mag;}
		} else {
			this.randomize();
		}
		return this;
	}


	norm() {return this.copy().normalize();}


	randomize() {
		let u=this,len=this.length;
		if (!len) {return this;}
		let mag=0,rnd=Vector.rnd;
		do {
			mag=0;
			for (let i=0;i<len;i++) {
				let x=rnd.getnorm();
				u[i]=x;
				mag+=x*x;
			}
		} while (mag<1e-10);
		mag=1.0/Math.sqrt(mag);
		for (let i=0;i<len;i++) {u[i]*=mag;}
		return this;
	}


	static random(dim) {return (new Vector(dim)).randomize();}

}


export class Matrix extends Array {

	constructor(rows,cols) {
		// Expected: (dim), (rows,cols), (Matrix), or (array,[rows,cols])
		let val=0;
		if (rows instanceof Matrix) {val=rows;rows=val.rows;cols=val.cols;}
		else if (rows.length!==undefined) {val=rows;rows=cols[0];cols=cols[1];}
		else if (cols===undefined) {cols=rows;}
		super(rows*cols);
		this.rows=rows;
		this.cols=cols;
		this.set(val);
	}


	one() {
		this.set(0);
		let elem=this;
		let cols=this.cols,rows=this.rows;
		rows=rows<cols?rows:cols;
		for (let i=0;i<rows;i++) {elem[i*cols+i]=1;}
		return this;
	}


	set(val=0) {
		let elem=this;
		let elems=elem.length,vlen=val.length;
		if (vlen===undefined) {
			for (let i=0;i<elems;i++) {elem[i]=val;}
		} else {
			if (vlen!==elems) {throw `set length: ${elems}!=${vlen}`;}
			for (let i=0;i<elems;i++) {elem[i]=val[i];}
		}
		return this;
	}


	mul(b) {
		let aelem=this;
		let arows=this.rows,acols=this.cols;
		let aelems=this.length,belems=b.length;
		if (b.length===undefined) {
			// scalar
			let m=new Matrix(this);
			for (let i=0;i<aelems;i++) {m[i]*=b;}
			return m;
		} else if (!(b instanceof Matrix)) {
			// vector
			if (belems!==acols) {throw `mat*vec dimensions: ${acols}!=${belems}`;}
			let v=new Vector(arows),i=0;
			for (let r=0;r<arows;r++) {
				let sum=0;
				for (let c=0;c<acols;c++) {sum+=aelem[i++]*b[c];}
				v[r]=sum;
			}
			return v;
		}
		// matrix
		let brows=b.rows,bcols=b.cols,melems=arows*bcols;belems--;
		if (acols!==brows) {throw `A*B needs cols(A)=rows(B): ${acols}, ${brows}`;}
		let m=new Matrix(arows,bcols);
		let belem=b,melem=m;
		let aval=0,bval=0;
		for (let i=0;i<melems;i++) {
			// Multiply row r of A with column c of B.
			let sum=melem[i];
			while (bval<=belems) {
				sum+=aelem[aval]*belem[bval];
				aval++;
				bval+=bcols;
			}
			melem[i]=sum;
			bval-=belems;
			if (bval===bcols) {bval=0;}
			else {aval-=brows;}
		}
		return m;
	}


	det() {
		let rows=this.rows,cols=this.cols;
		if (rows!==cols) {return 0;}
		if (rows===0) {return 1;}
		// Copy the matrix. Use the upper triangular form to compute the determinant.
		let elem=new Matrix(this);
		let sign=0;
		for (let i=0;i<cols-1;i++) {
			// Find a row with an invertible element in column i.
			let dval=i*cols,sval=dval,j=i;
			let inv=NaN;
			for (;j<rows;j++) {
				inv=1/elem[sval+i];
				if (inv>-Infinity && inv<Infinity) {break;}
				sval+=cols;
			}
			if (j===rows) {return 0;}
			if (sval!==dval) {
				sign^=1;
				for (let c=i;c<cols;c++) {
					let tmp=elem[sval+c];
					elem[sval+c]=elem[dval+c];
					elem[dval+c]=tmp;
				}
			}
			for (let c=i+1;c<cols;c++) {
				elem[dval+c]*=inv;
			}
			for (let r=i+1;r<cols;r++) {
				sval=r*cols;
				let mul=elem[sval+i];
				for (let c=i+1;c<cols;c++) {
					elem[sval+c]-=elem[dval+c]*mul;
				}
			}
		}
		// We have the matrix in upper triangular form. Multiply the diagonals to get the
		// determinant.
		let det=elem[0];
		for (let i=1;i<cols;i++) {
			det=det*elem[i*cols+i];
		}
		return sign?-det:det;
	}


	inv() {
		// Returns the multiplicative inverse of A.
		let rows=this.rows,cols=this.cols;
		if (rows!==cols) {throw `Can only invert square matrices: ${rows}, ${cols}`;}
		let ret=new Matrix(this);
		let elem=ret;
		let perm=new Array(cols);
		for (let i=0;i<cols;i++) {perm[i]=i;}
		for (let i=0;i<rows;i++) {
			// Find a row with an invertible element in column i.
			let dval=i*cols,sval=dval,j=i;
			let inv=NaN;
			for (;j<rows;j++) {
				inv=1/elem[sval+i];
				if (inv>-Infinity && inv<Infinity) {break;}
				sval+=cols;
			}
			if (j===rows) {throw `Unable to find an invertible element.`;}
			// Swap the desired row with row i. Then put row i in reduced echelon form.
			if (sval!==dval) {
				for (let c=0;c<cols;c++) {
					let tmp=elem[sval+c];
					elem[sval+c]=elem[dval+c];
					elem[dval+c]=tmp;
				}
			}
			let tmp=perm[i];perm[i]=perm[j];perm[j]=tmp;
			// Put the row into reduced echelon form. Since entry (i,i)=1 and (i,i')=1*inv,
			// set (i,i)=inv.
			for (let c=0;c<cols;c++) {
				if (c!==i) {elem[dval+c]*=inv;}
			}
			elem[dval+i]=inv;
			// Perform row operations with row i to clear column i for all other rows in A.
			// Entry (j,i') will be 0 in the augmented matrix, and (i,i') will be inv, hence
			// (j,i')=(j,i')-(j,i)*(i,i')=-(j,i)*inv.
			for (let r=0;r<rows;r++) {
				if (r===i) {continue;}
				sval=r*cols;
				let mul=elem[sval+i];
				for (let c=0;c<cols;c++) {
					if (c!==i) {elem[sval+c]-=elem[dval+c]*mul;}
				}
				elem[sval+i]=-elem[dval+i]*mul;
			}
		}
		// Re-order columns due to swapped rows.
		let tmp=new Array(cols);
		for (let r=0;r<rows;r++) {
			let dval=r*cols;
			for (let i=0;i<cols;i++) {tmp[i]=elem[dval+i];}
			for (let i=0;i<cols;i++) {elem[dval+perm[i]]=tmp[i];}
		}
		return ret;
	}


	static fromangles(angs) {
		let dim=0,ang2=(angs.length??1)*2;
		while (dim*(dim-1)<ang2) {dim++;}
		return (new Matrix(dim,dim)).one().rotate(angs);
	}


	rotate(angs) {
		// Perform a counter-clockwise, right-hand rotation given n*(n-1)/2 angles. In 3D,
		// angles are expected in XYZ order.
		//
		// Rotation is about a plane, not along an axis. For a 2D space, we may only rotate
		// about the XY plane, thus there is 1 axis of rotation.
		if (angs.length===undefined) {angs=[angs];}
		let dim=this.rows,a=(dim*(dim-1))>>>1;
		if (dim!==this.cols || a!==angs.length) {
			throw `invalid dimensions: ${dim}, ${this.cols}, ${a}, ${angs.length}`;
		}
		let elem=this;
		for (let j=1;j<dim;j++) {
			for (let i=0;i<j;i++) {
				// We have
				// (i,i)=cos   (i,j)=-sin
				// (j,i)=sin   (j,j)=cos
				let cs=Math.cos(angs[--a]);
				let sn=Math.sin(angs[  a]);
				// For each row r:
				// (r,i)=(r,i)*cos+(r,j)*sin
				// (r,j)=(r,j)*cos-(r,i)*sin
				// (r,c)=(r,c) otherwise
				let i0=i,j0=j;
				for (let r=0;r<dim;r++) {
					let t0=elem[i0],t1=elem[j0];
					elem[i0]=t0*cs+t1*sn;
					elem[j0]=t1*cs-t0*sn;
					i0+=dim;
					j0+=dim;
				}
			}
		}
		return this;
	}

}


export class Transform {

	// mat*point+vec


	constructor(params) {
		// Accepts: transform, mat, vec, dim, {mat,vec,dim,scale,ang}
		// Aliases: vec=pos, ang=angle
		// Parse what we're given.
		let mat=null,vec=null,dim=NaN;
		let scale=null,ang=null;
		if (params instanceof Transform) {
			mat=new Matrix(params.mat);
			vec=new Vector(params.vec);
		} else if (params instanceof Matrix) {
			mat=new Matrix(params);
		} else if ((params instanceof Vector) || params.length!==undefined) {
			vec=new Vector(params);
		} else if (!isNaN(params)) {
			dim=params;
		} else {
			mat=params.mat??null;
			vec=(params.vec??params.pos)??null;
			dim=params.dim??NaN;
			scale=params.scale??null;
			ang=(params.ang??params.angle)??null;
		}
		// Reconstruct what we're missing.
		if (isNaN(dim)) {
			if (vec!==null) {dim=vec.length;}
			else if (mat!==null) {dim=mat.rows;}
		}
		if (isNaN(dim)) {throw "no dimension";}
		if (vec===null) {vec=new Vector(dim);}
		if (mat===null) {mat=(new Matrix(dim)).one();}
		if (vec.length!==dim) {throw `vec dimension: ${vec.length}, ${dim}`;}
		if (mat.rows!==dim || mat.cols!==dim) {throw `mat dimensions: (${mat.rows},${mat.cols}), ${dim}`;}
		this.mat=mat;
		this.vec=vec;
		if (scale!==null) {this.scalemat(scale);}
		if (ang!==null) {this.rotatemat(ang);}
	}


	set(b) {
		if (!(b instanceof Transform)) {b=new Transform(b);}
		this.mat.set(b.mat);
		this.vec.set(b.vec);
		return this;
	}


	apply(point) {
		// (A.apply(B)).apply(P) = A.apply(B.apply(P))
		let mat=this.mat,vec=this.vec;
		if (!(point instanceof Transform)) {return mat.mul(point).iadd(vec);}
		return new Transform({mat:mat.mul(point.mat),vec:mat.mul(point.vec).iadd(vec)});
	}


	inv() {
		let inv=this.mat.inv();
		return new Transform({mat:inv,vec:inv.mul(this.vec).ineg()});
	}


	reset() {
		this.mat.one();
		this.vec.set(0);
		return this;
	}


	shift(vec,apply=false) {
		if (apply) {vec=this.mat.mul(vec);}
		this.vec.iadd(vec);
		return this;
	}


	scalevec(muls) {
		let vec=this.vec,dim=vec.length;
		if (muls.length===undefined) {muls=(new Array(dim)).fill(muls);}
		if (muls.length!==dim) {throw `Invalid dimensions: ${muls.length}, ${dim}`;}
		for (let i=0;i<dim;i++) {vec[i]*=muls[i];}
		return this;
	}


	scalemat(muls) {
		let mat=this.mat,dim=this.vec.length,dim2=dim*dim;
		if (muls.length===undefined) {muls=(new Array(dim)).fill(muls);}
		if (muls.length!==dim) {throw `Invalid dimensions: ${muls.length}, ${dim}`;}
		for (let i=0;i<dim2;i++) {mat[i]*=muls[(i/dim)|0];}
		return this;
	}


	scale(muls) {
		return this.scalevec(muls).scalemat(muls);
	}


	rotatevec(angs) {
		let rot=Matrix.fromangles(angs);
		this.vec.set(rot.mul(this.vec));
		return this;
	}


	rotatemat(angs) {
		let rot=Matrix.fromangles(angs);
		this.mat.set(rot.mul(this.mat));
		return this;
	}


	rotate(angs) {
		return this.rotatevec(angs).rotatemat(angs);
	}


	lookat() {
		// https://math.stackexchange.com/questions/180418
		throw "not implemented";
	}

}


//---------------------------------------------------------------------------------
// Input - v1.19


export class Input {

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
		this.mousepos=[0,0];
		this.mouseraw=[0,0];
		this.mousez=0;
		this.touchfocus=0;
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
			state.next=0;
			state.down=0;
			state.last=0;
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
		while (state!==null) {
			let next=state.active;
			state.last=state.down;
			let down=focus?state.next:0;
			state.down=down;
			if (down>0) {
				let repeat=Math.floor((delay-state.time)*rate);
				state.repeat=(repeat>0 && (repeat&1)===0)?state.repeat+1:0;
			} else {
				state.repeat=0;
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
			state.setmousepos(evt.pageX,evt.pageY);
		}
		function mousedown(evt) {
			if (evt.button===0) {state.setkeydown(state.MOUSE.LEFT);}
			state.setmousepos(evt.pageX,evt.pageY);
		}
		function mouseup(evt) {
			if (evt.button===0) {state.setkeyup(state.MOUSE.LEFT);}
			state.setmousepos(evt.pageX,evt.pageY);
		}
		function onscroll() {
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
		}
		function touchend() {
			state.touchfocus=0;
			state.setkeyup(state.MOUSE.LEFT);
		}
		function touchcancel() {
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
		if (isNaN(x) || isNaN(y)) {return;}
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
			if (state.next===0) {
				state.next=1;
				state.repeat=0;
				state.time=performance.now()/1000.0;
			}
		}
	}


	setkeyup(code) {
		let state=this.makeactive(code);
		if (state!==null) {
			state.next=0;
			state.repeat=0;
			state.time=null;
		}
	}


	getkeydown(code) {
		// Returns 1 if held down.
		if (code===null || code===undefined) {return 0;}
		let state=this.keystate[code];
		return state!==undefined?state.down:0;
	}


	getkeychange(code) {
		// Returns value if key state has changed.
		// -1 = release
		//  0 = no change
		//  1 = pressed
		if (code===null || code===undefined) {return 0;}
		let state=this.keystate[code];
		return state!==undefined?state.down-state.last:0;
	}


	keyclear(code) {
		// Clears any state change.
		if (code===null || code===undefined) {return;}
		let state=this.keystate[code];
		if (state!==undefined) {state.last=state.down;}
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
// Drawing - v3.29


class DrawPoly {

	static MOVE =0;
	static CLOSE=1;
	static LINE =2;
	static CURVE=3;


	constructor(str,trans) {
		// Copy static variables.
		this.vertarr=new Array();
		this.begin();
		if (str) {
			if (trans) {trans=new Transform(trans);}
			if (str instanceof DrawPoly) {this.addpoly(str,trans);}
			else {this.fromstring(str);}
		}
	}


	begin() {
		this.vertidx=0;
		this.moveidx=-2;
		this.minx=Infinity;
		this.maxx=-Infinity;
		this.miny=Infinity;
		this.maxy=-Infinity;
		return this;
	}


	aabbupdate() {
		// Recompute the bounding box.
		let minx=Infinity,miny=Infinity,maxx=-Infinity,maxy=-Infinity;
		let varr=this.vertarr,vidx=this.vertidx;
		for (let i=0;i<vidx;i++) {
			let x=varr[i].x,y=varr[i].y;
			minx=minx<x?minx:x;
			maxx=maxx>x?maxx:x;
			miny=miny<y?minx:y;
			maxy=maxy>y?maxx:y;
		}
		this.minx=minx;this.maxx=maxx;
		this.miny=miny;this.maxy=maxy;
	}


	addvert(type,x,y) {
		let idx=this.vertidx++;
		let arr=this.vertarr;
		if (idx>=arr.length) {
			let len=16;
			while (len<=idx) {len+=len;}
			while (arr.length<len) {arr.push({type:-1,i:-1,x:0,y:0});}
		}
		let v=arr[idx];
		v.type=type;
		v.i=this.moveidx;
		v.x=x;
		v.y=y;
		if (this.minx>x) {this.minx=x;}
		if (this.maxx<x) {this.maxx=x;}
		if (this.miny>y) {this.miny=y;}
		if (this.maxy<y) {this.maxy=y;}
		return v;
	}


	moveto(x,y) {
		// Move the pen to [x,y].
		if (this.moveidx===this.vertidx-1) {this.vertidx--;}
		else {this.moveidx=this.vertidx;}
		this.addvert(DrawPoly.MOVE,x,y);
		return this;
	}


	lineto(x,y) {
		// Draw a line from the last vertex to [x,y].
		// If no moveto() was ever called, behave as moveto().
		if (this.moveidx<0) {return this.moveto(x,y);}
		this.addvert(DrawPoly.LINE,x,y);
		return this;
	}


	curveto(x0,y0,x1,y1,x2,y2) {
		// Draw a cubic bezier curve.
		if (this.moveidx<0) {this.moveto(0,0);}
		this.addvert(DrawPoly.CURVE,x0,y0);
		this.addvert(DrawPoly.CURVE,x1,y1);
		this.addvert(DrawPoly.CURVE,x2,y2);
		return this;
	}


	close() {
		// Draw a line from the current vertex to our last moveto() call.
		let move=this.moveidx;
		if (move<0) {return this;}
		this.moveidx=-2;
		if (move===this.vertidx-1) {
			this.vertidx--;
			return this;
		}
		let m=this.vertarr[move];
		m.i=this.vertidx;
		this.addvert(DrawPoly.CLOSE,m.x,m.y);
		return this;
	}


	tostring(precision=6) {
		// Converts the path to an SVG string.
		let p=precision;
		function tostring(x) {
			let s=x.toFixed(p);
			if (p>0) {
				let i=s.length;
				while (i>0 && s.charCodeAt(i-1)===48) {i--;}
				if (s.charCodeAt(i-1)===46) {i--;}
				s=s.substring(0,i);
			}
			return s;
		}
		let name=["M ","Z","L ","C "];
		let ret="";
		for (let i=0;i<this.vertidx;i++) {
			let v=this.vertarr[i],t=v.type;
			ret+=(i?" ":"")+name[t];
			if (t!==DrawPoly.CLOSE) {
				ret+=tostring(v.x)+" "+tostring(v.y);
			}
			if (t===DrawPoly.CURVE) {
				v=this.vertarr[++i];
				ret+=" "+tostring(v.x)+" "+tostring(v.y);
				v=this.vertarr[++i];
				ret+=" "+tostring(v.x)+" "+tostring(v.y);
			}
		}
		return ret;
	}


	fromstring(str) {
		// Parses an SVG path. Supports Z M L H V C.
		this.begin();
		let type=2,rel=0,len=str.length,i=0,c=0;
		let params=[0,3,3,1,2,63],v=[0,0,0,0,0,0],off=[0,0];
		function gc() {c=i<len?str.charCodeAt(i++):-1;}
		gc();
		while (c>=0) {
			// If it's a number, repeat last type. Otherwise, determine if Zz Mm Ll Hh Vv Cc.
			if (c<45 || c>57 || c===47) {
				let l=c&32,h=c-l;
				gc();
				if      (h===90) {type=0;}
				else if (h===77) {type=1;}
				else if (h===76) {type=2;}
				else if (h===72) {type=3;}
				else if (h===86) {type=4;}
				else if (h===67) {type=5;}
				else {continue;}
				rel=l;
			}
			// Relative offset.
			if (this.vertidx) {
				let l=this.vertarr[this.vertidx-1];
				off[0]=l.x;off[1]=l.y;
			}
			let p=params[type];
			for (let j=0;j<6;j++) {
				// Only parse floats if they're needed for this type. Format: \s*-?\d*(\.\d*)?
				let sign=1,mul=1,base=off[j&1],num=0;
				if ((p>>>j)&1) {
					base=rel?base:0;
					while (c<33) {gc();}
					if (c===45) {gc();sign=-1;}
					while (c>47 && c<58) {num=c-48+num*10;gc();}
					if (c===46) {gc();}
					while (c>47 && c<58) {mul/=10;num+=(c-48)*mul;gc();}
				}
				v[j]=sign*num+base;
			}
			if      (type<1) {this.close();type=1;}
			else if (type<2) {this.moveto(v[0],v[1]);type=2;}
			else if (type<5) {this.lineto(v[0],v[1]);}
			else {this.curveto(v[0],v[1],v[2],v[3],v[4],v[5]);}
		}
	}


	addpoly(poly,trans) {
		let varr=poly.vertarr,vidx=poly.vertidx;
		for (let i=0;i<vidx;i++) {
			let v=varr[i],x=v.x,y=v.y,t=v.type;
			if (trans) {[x,y]=trans.apply([x,y]);}
			if (t===DrawPoly.MOVE) {this.moveto(x,y);}
			else if (t===DrawPoly.CLOSE) {this.close();}
			else {this.addvert(t,x,y);}
		}
		return this;
	}


	addrect(x,y,w,h) {
		return this.moveto(x,y).lineto(x+w,y).lineto(x+w,y+h).lineto(x,y+h).close();
	}


	addoval(x,y,xrad,yrad) {
		// Circle approximation. Max error: 0.000196
		const c=0.551915024;
		let dx=xrad,dy=(yrad??xrad),cx=c*dx,cy=c*dy;
		this.moveto(x,y+dy);
		this.curveto(x-cx,y+dy,x-dx,y+cy,x-dx,y   );
		this.curveto(x-dx,y-cy,x-cx,y-dy,x   ,y-dy);
		this.curveto(x+cx,y-dy,x+dx,y-cy,x+dx,y   );
		this.curveto(x+dx,y+cy,x+cx,y+dy,x   ,y+dy);
		return this;
	}


	addline(x0,y0,x1,y1,rad) {
		// Line with circular ends.
		let dx=x1-x0,dy=y1-y0;
		let dist=dx*dx+dy*dy;
		if (dist<1e-20) {
			x1=x0;
			y1=y0;
			dx=rad;
			dy=0.0;
		} else {
			dist=rad/Math.sqrt(dist);
			dx*=dist;
			dy*=dist;
		}
		const c=0.551915024;
		let cx=c*dx,c0=cx-dy,c3=cx+dy;
		let cy=c*dy,c1=dx+cy,c2=dx-cy;
		this.moveto(x1+dy,y1-dx);
		this.curveto(x1+c3,y1-c2,x1+c1,y1-c0,x1+dx,y1+dy);
		this.curveto(x1+c2,y1+c3,x1+c0,y1+c1,x1-dy,y1+dx);
		this.lineto(x0-dy,y0+dx);
		this.curveto(x0-c3,y0+c2,x0-c1,y0+c0,x0-dx,y0-dy);
		this.curveto(x0-c2,y0-c3,x0-c0,y0-c1,x0+dy,y0-dx);
		this.close();
		return this;
	}


	trace(rad) {
		throw "not implemented "+rad;
		// Curve offseting. Project out based on tangent.
	}

}


class DrawImage {
	// Pixel data is in R, G, B, A, R, G, B, A,... format.

	constructor(width,height) {
		let srcdata=null;
		if (height===undefined) {
			let img=width;
			if (width===undefined) {
				width=0;
				height=0;
			} else if (img instanceof DrawImage) {
				width=img.width;
				height=img.height;
				srcdata=img.data8;
			} else if (img instanceof HTMLCanvasElement) {
				width=img.width;
				height=img.height;
				srcdata=img.getContext("2d").createImageData(width,height).data;
			} else if (img instanceof ImageData) {
				width=img.width;
				height=img.height;
				srcdata=img.data;
			}
		}
		this.resize(width,height);
		if (srcdata!==null) {this.data8.set(srcdata);}
	}


	resize(width,height) {
		this.width=width;
		this.height=height;
		this.data8 =new Uint8Array(width*height*4);
		this.data32=new Uint32Array(this.data8.buffer);
	}


	savefile(name) {
		// Save the image to a TGA file.
		let blob=new Blob([this.totga()]);
		let link=document.createElement("a");
		link.href=window.URL.createObjectURL(blob);
		link.download=name;
		link.click();
	}


	fromtga(src) {
		// Load a TGA image from an array.
		let len=src.length;
		if (len<18) {
			throw "TGA too short";
		}
		let w=src[12]+(src[13]<<8);
		let h=src[14]+(src[15]<<8);
		let bits=src[16],bytes=bits>>>3;
		if (w*h*bytes+18!==len || src[2]!==2 || (bits!==24 && bits!==32)) {
			throw "TGA corrupt";
		}
		// Load the image data.
		this.resize(w,h);
		let dst=this.data8;
		let didx=0,dinc=0,sidx=18,a=255;
		if (src[17]&32) {didx=(h-1)*w*4;dinc=-w*8;}
		for (let y=0;y<h;y++) {
			for (let x=0;x<w;x++) {
				dst[didx+2]=src[sidx++];
				dst[didx+1]=src[sidx++];
				dst[didx+0]=src[sidx++];
				if (bytes===4) {a=src[sidx++];}
				dst[didx+3]=a;
				didx+=4;
			}
			didx+=dinc;
		}
	}


	totga() {
		// Returns a Uint8Array with TGA image data.
		let w=this.width,h=this.height;
		if (w>0xffff || h>0xffff) {throw "Size too big: "+w+", "+h;}
		let didx=18,sidx=0;
		let dst=new Uint8Array(w*h*4+didx),src=this.data8;
		dst.set([0,0,2,0,0,0,0,0,0,0,0,0,w&255,w>>>8,h&255,h>>>8,32,40],0,didx);
		for (let y=0;y<h;y++) {
			for (let x=0;x<w;x++) {
				dst[didx++]=src[sidx+2];
				dst[didx++]=src[sidx+1];
				dst[didx++]=src[sidx+0];
				dst[didx++]=src[sidx+3];
				sidx+=4;
			}
		}
		return dst;
	}


	todataurl() {
		// Returns a data string for use in <img src="..."> objects.
		let canv=document.createElement("canvas");
		let width=this.width,height=this.height;
		canv.width=width;
		canv.height=height;
		let imgdata=new ImageData(new Uint8ClampedArray(this.data8.buffer),width,height);
		canv.getContext("2d").putImageData(imgdata);
		let strdata=canv.toDataURL("image/png");
		canv.remove();
		return strdata;
	}


	getpixel(x,y) {
		if (x<0 || x>=this.width || y<0 || y>=this.height) {
			throw `invalid pixel: ${x}, ${y}`;
		}
		return this.data32[y*this.height+x];
	}


	setpixel(x,y,rgba) {
		if (x<0 || x>=this.width || y<0 || y>=this.height) {
			throw `invalid pixel: ${x}, ${y}`;
		}
		this.data32[y*this.height+x]=rgba;
	}

}


class DrawFont {

	static deffont=`monospace
		none
		1000
		SPC 553
		█ 553 M0 0H553V1000H0Z
		! 553 M224 54H327L314 560H238ZM340 692c0 86-130 86-130 0 0-86 130-86 130 0Z
		" 553 M127 54H235L221 284H141Zm191 0H426L412 284H332Z
		# 553 M173 106h71L228 268H354l17-162h72L426 268H532v64H420L403 504H506v64H396L378 748H306l18-180H198L180 748H108l18-180H21V504H132l18-172H46V268H156Zm49 226-17 172H331l17-172Z
		$ 553 M291 14h71l-13 95c35 4 72 9 99 16v75c-29-7-72-16-108-18L312 392c96 37 181 80 181 177 0 122-107 171-229 178L248 864H177l16-117c-44-4-90-9-138-21V645c47 15 97 25 149 26l28-221C150 420 59 378 59 277c0-87 80-164 220-170ZM269 181c-81 6-118 39-118 89 0 49 37 72 93 95Zm6 490c83-4 126-39 126-95 0-63-59-80-101-99Z
		% 553 M462 54h81L90 748H10ZM404 755c-80 0-133-47-133-149 0-74 51-145 133-145 87 0 132 57 132 145 0 80-52 149-132 149Zm-1-62c34 0 60-31 60-87 0-47-17-83-59-83-39 0-60 37-60 83 0 65 26 87 59 87ZM150 341C70 341 18 294 18 192 18 118 68 47 150 47c87 0 132 57 132 145 0 80-52 149-132 149Zm-1-62c34 0 60-31 60-87 0-47-17-83-59-83-38 0-60 39-60 83 0 65 26 87 59 87Z
		& 553 M396 553c11-32 23-81 21-140h86c0 68-8 135-49 211l99 124H440l-43-54c-43 35-95 61-171 61-125 0-198-72-198-181 0-94 53-150 121-190-35-46-65-88-65-153C84 117 165 68 256 68c91 0 160 52 160 143 0 85-58 134-146 183ZM227 341c40-25 102-54 102-123 0-49-29-78-76-78-54 0-81 37-81 83 0 54 32 89 55 118Zm-34 98c-34 23-76 59-76 126 0 72 49 117 119 117 45 0 80-16 113-48Z
		' 553 M221 54H333L319 284H234Z
		( 553 M426 68C313 176 235 317 235 484c0 164 75 304 190 417l-52 53C254 841 147 692 147 484c0-207 119-367 229-467Z
		) 553 M180 17C294 124 406 276 406 481c0 194-94 349-229 472l-49-50C236 794 318 667 318 481c0-162-83-309-190-411Z
		* 553 M241 54h71L299 222l140-94 34 60-152 75 151 73-33 58-139-92 12 169H241l12-169-141 92-31-57 151-75L81 186l33-57 140 93Z
		+ 553 M234 244h85V443H512v75H319V718H234V518H41V443H234Z
		, 553 M117 849c39 1 129-13 129-84 0-53-46-59-46-112 0-32 25-63 66-63 45 0 88 35 88 117 0 117-87 209-237 209Z
		- 553 M130 441H423v80H130Z
		. 553 M273 757c-45 0-82-37-82-82 0-45 37-82 82-82 45 0 82 37 82 82 0 45-37 82-82 82Z
		/ 553 M393 54h82L138 854H56Z
		0 553 M281 97c146 0 229 115 229 321 0 234-96 339-239 339C126 757 43 647 43 418 43 235 122 97 281 97ZM403 283c-12-50-52-113-126-113-110 0-159 126-145 314ZM148 567c24 86 75 117 129 117 107 0 161-128 143-321Z
		1 553 M271 103h75V668H490v80H86V668H252V199L98 283 66 210Z
		2 553 M75 181c44-40 90-84 195-84 121 0 191 81 191 185 0 131-85 195-278 385H495v81H72V672C307 432 368 401 368 290c0-137-147-155-246-53Z
		3 553 M98 122c49-16 96-25 145-25 108 0 209 39 209 157 0 73-34 120-106 154 55 8 137 55 137 146 0 126-110 203-282 203-46 0-85-4-120-8V672c39 5 76 11 127 11 116 0 186-36 186-122 0-84-89-109-144-109H159V382h86c46 0 117-29 117-114 0-76-64-133-264-71Z
		4 553 M295 106H418V531H527v75H418V748H330V606H21V531Zm35 425V188L106 531Z
		5 553 M99 106H444v74H179V361h65c163 0 235 75 235 182 0 131-124 214-269 214-44 0-81-4-123-9V671c43 9 83 12 128 12 133 0 172-75 172-135 0-84-70-114-163-114H99Z
		6 553 M453 181H381c-133 0-227 63-232 212 57-32 115-40 155-40 130 0 199 78 199 189 0 104-71 215-226 215-138 0-217-87-217-287 0-245 116-364 320-364h73ZM149 464c0 169 48 223 136 223 76 0 129-52 129-139 0-75-38-126-122-126-44 0-89 13-143 43Z
		7 553 M57 106H491v80L222 748H125L404 185H57Z
		8 553 M281 97c137 0 200 62 200 154 0 87-62 129-120 161 89 46 134 94 134 175 0 108-94 170-222 170-116 0-215-49-215-160 0-93 62-139 135-178C90 365 72 306 72 257c0-86 72-160 209-160Zm3 278c70-34 109-67 109-121 0-58-42-86-115-86-69 0-118 24-118 83 0 66 64 94 124 124Zm-14 81c-77 37-119 74-119 133 0 58 46 95 126 95 82 0 125-37 125-92 0-64-57-103-132-136Z
		9 553 M89 748V673h57c175 0 250-71 257-212-42 21-86 40-161 40-113 0-193-69-193-192C49 184 146 97 272 97c167 0 220 136 220 293 0 280-153 358-351 358ZM403 389c0-120-23-222-135-222-89 0-129 63-129 137 0 92 52 128 119 128 59 0 110-20 145-43Z
		: 553 M277 757c-42 0-75-33-75-75 0-42 33-75 75-75 42 0 75 33 75 75 0 42-33 75-75 75Zm0-361c-42 0-75-33-75-75 0-42 33-75 75-75 42 0 75 33 75 75 0 42-33 75-75 75Z
		; 553 M277 396c-42 0-75-33-75-75 0-42 33-75 75-75 42 0 75 33 75 75 0 42-33 75-75 75ZM123 849c39 1 129-13 129-84 0-53-46-59-46-112 0-32 25-63 66-63 45 0 88 35 88 117 0 117-87 209-237 209Z
		< 553 M398 205l53 54L184 480 451 701l-53 54L68 480Z
		= 553 M65 359H488v72H65Zm0 171H488v72H65Z
		> 553 M156 204 485 480 156 756l-53-54L370 481 103 260Z
		? 553 M149 54c191-5 304 104 304 220 0 84-42 158-173 165l-3 121H203l-6-188h58c34 0 105-4 105-92 0-109-106-152-211-149Zm90 703c-36 0-65-29-65-65 0-36 29-65 65-65 36 0 65 29 65 65 0 36-29 65-65 65Z
		@ 553 M423 292 384 544c-13 84-4 109 22 109 46 0 71-97 71-248 0-190-49-297-160-297C182 108 74 320 74 580c0 249 99 311 175 311 73 0 108-13 167-39v63c-53 22-91 37-167 37C55 952 5 771 5 579 5 258 145 48 321 48c121 0 225 80 225 357 0 182-43 312-147 312-42 0-76-18-76-73-29 57-57 73-92 73-67 0-93-51-93-145 0-139 52-278 161-278 31 0 43 5 60 13Zm-90 81c-13-13-22-16-35-16-60 0-82 132-82 202 0 62 4 94 28 94 19 0 32-16 47-46l10-20Z
		A 553 M338 106 548 748H453L408 607H141L95 748H5L218 106ZM166 530H383L275 186Z
		B 553 M261 106c108 0 215 28 215 156 0 71-32 121-106 145 87 18 129 76 129 149 0 127-107 192-246 192H78V106ZM165 380h94c71 0 126-35 126-105 0-76-58-95-128-95H165Zm0 294h97c93 0 144-36 144-112 0-74-67-109-144-109H165Z
		C 553 M489 214c-51-25-96-39-152-39-144 0-199 125-199 248 0 183 80 255 198 255 68 0 97-13 153-36v83c-45 16-88 31-161 31C122 756 45 622 45 423 45 251 136 98 337 98c64 0 108 13 152 30Z
		D 553 M223 106c252 0 294 171 294 311 0 259-154 331-320 331H54V106ZM208 672c136 0 217-70 217-255 0-162-61-237-209-237H141V672Z
		E 553 M464 106v74H186V378H453v74H186V673H464v75H99V106Z
		F 553 M463 106v75H190V389H449v73H190V748H101V106Z
		G 553 M494 215c-38-19-85-40-156-40-137 0-214 104-214 251 0 154 57 253 202 253 31 0 57-3 85-13V462H279V390H497V718c-48 22-108 39-180 39C121 757 32 625 32 426 32 229 152 97 338 97c64 0 115 13 156 31Z
		H 553 M412 106h87V748H412V453H142V748H55V106h87V377H412Z
		I 553 M84 106H469v74H321V673H469v75H84V673H232V180H84Z
		J 553 M98 106H431V546c0 132-80 209-199 209-66 0-120-21-142-36V631c23 18 81 48 139 48 77 0 113-51 113-127V182H98Z
		K 553 M77 106h87V404L399 106H503L249 411 514 748H404L164 433V748H77Z
		L 553 M114 106h89V673H484v75H114Z
		M 553 M55 106H159L274 429l27-83 91-240H498l31 642H444L425 196l-29 85-95 258H240L149 291l-29-95-2 157-11 395H24Z
		N 553 M58 106H171L346 479l68 154V106h81V748H381L193 345 140 218V748H58Z
		O 553 M281 97c170 0 245 131 245 323 0 223-105 337-254 337C76 757 28 592 28 423 28 250 107 97 281 97Zm-4 77c-104 0-158 103-158 246 0 179 58 261 155 261 113 0 161-112 161-251 0-161-49-256-158-256Z
		P 553 M259 106c144 0 240 68 240 193 0 124-94 219-250 219H165V748H78V106ZM244 443c108 0 164-45 164-138 0-91-70-126-151-126H165V443Z
		Q 553 M553 876c-37 28-75 49-138 49-116 0-180-73-185-171C83 732 28 601 28 432 28 251 107 97 281 97c202 0 245 180 245 321 0 152-52 307-215 336 11 64 51 96 109 96 41 0 63-12 94-34ZM275 680c115 0 160-115 160-253 0-153-46-253-159-253-98 0-157 95-157 246 0 189 65 260 156 260Z
		R 553 M257 106c153 0 211 73 211 168 0 95-64 150-138 168 39 12 66 56 90 106l96 200H418L322 544c-24-51-46-82-110-82H171V748H83V106ZM243 392c84 0 133-41 133-110 0-63-39-102-120-102H171V392Z
		S 553 M448 194c-42-11-90-21-153-21-54 0-141 13-141 90 0 45 32 76 92 101l96 40c108 45 148 99 148 171 0 119-101 182-258 182-59 0-117-8-178-22V650c46 17 110 30 182 30 121 0 162-37 162-102 0-42-34-72-91-96l-95-40C136 410 62 369 62 273 62 158 174 97 299 97c66 0 101 10 149 18Z
		T 553 M42 106H511v75H321V748H232V181H42Z
		U 553 M141 106V532c0 108 45 152 136 152 96 0 136-63 136-152V106h87V532c0 133-83 225-225 225-129 0-221-52-221-225V106Z
		V 553 M101 106 278 666 458 106h93L333 748H215L2 106Z
		W 553 M105 106l32 556 35-115 73-224h61L425 662l3-98 25-458h78L488 748H374L295 521l-22-74-24 79-73 222H66L22 106Z
		X 553 M130 106 277 348 424 106H524L328 416 541 748H431L275 488 118 748H9L223 420 26 106Z
		Y 553 M106 106 231 337l50 99 41-83L453 106H553L321 518V748H232V517L0 106Z
		Z 553 M64 106H492v69L164 667H498v81H55V682L385 185H64Z
		[ 553 M169 37H412v69H251V880H412v69H169Z
		\\ 553 M79 54h81L497 854H416Z
		] 553 M141 37H384V949H141V880H301V106H141Z
		^ 553 M239 106h70L498 420H412L271 174 137 420H60Z
		_ 553 M0 878H553v71H0Z
		\` 553 M86 54H209L328 173H242Z
		a 553 M107 277c49-17 105-31 172-31 130 0 193 61 193 160V748H395l-1-66c-31 28-82 75-170 75-105 0-159-56-159-141 0-99 81-157 206-157H386V412c0-45-28-93-112-93-46 0-98 7-167 36ZM274 524c-65 0-118 24-118 89 0 46 30 73 80 73 47 0 106-33 150-75V524Z
		b 553 M79 54h85V246l-4 91c42-59 97-91 170-91 110 0 170 96 170 242 0 191-111 266-244 266-72 0-130-16-177-35Zm85 610c31 10 61 21 101 21 115 0 148-95 148-190 0-81-22-174-99-174-60 0-96 38-150 102Z
		c 553 M462 353c-37-19-77-33-132-33-84 0-163 61-163 186 0 123 69 176 164 176 62 0 100-17 131-31v79c-42 16-88 25-143 25-127 0-241-60-241-247 0-158 99-260 250-260 62 0 96 9 134 23Z
		d 553 M386 54h86V748H395l-2-94c-36 50-85 103-170 103C105 757 53 646 53 508c0-113 55-259 242-259 43 0 65 6 91 12Zm0 286c-28-11-52-20-93-20-91 0-152 48-152 188 0 114 35 176 99 176 55 0 103-56 146-115Z
		e 553 M147 529c0 93 48 157 165 157 56 0 107-9 157-21v70c-54 13-98 22-174 22-164 0-238-98-238-253 0-183 122-258 224-258 214 0 223 198 212 283Zm259-66c3-61-22-149-128-149-72 0-124 56-131 149Z
		f 553 M516 133c-154-34-231-8-231 103v91H501v71H285V748H198V398H39V327H198V243c0-130 70-231 318-183Z
		g 553 M513 255v70H434c69 91 16 261-160 261-46 0-74-7-105-23-58 79 12 97 41 98l145 5c87 3 156 49 156 123 0 101-92 165-243 165-119 0-222-33-222-128 0-58 35-90 68-114-50-24-80-101 2-188-97-106-16-324 217-269ZM269 522c143 0 143-212 0-212-141 0-141 212 0 212ZM191 735c-23 16-54 39-54 82 0 51 53 69 139 69 104 0 143-40 143-87 0-45-46-57-98-59Z
		h 553 M79 54h85V254l-3 79c36-42 80-87 160-87 102 0 154 68 154 174V748H390V432c0-62-21-112-84-112-69 0-111 72-142 100V748H79Z
		i 553 M276 183c-37 0-67-30-67-67 0-37 30-67 67-67 37 0 67 30 67 67 0 37-30 67-67 67ZM101 255H333V677H480v71H85V677H247V326H101Z
		j 553 M361 183c-37 0-67-30-67-67 0-37 30-67 67-67 37 0 67 30 67 67 0 37-30 67-67 67ZM85 255H413V737c0 221-200 249-348 192V848c172 74 261 19 261-99V326H85Z
		k 553 M89 54h86V480L397 255H509L278 482 522 748H405L175 484V748H89Z
		l 553 M101 54H333V677H480v71H85V677H247V124H101Z
		m 553 M110 255l3 94c25-54 51-103 110-103 58 0 80 40 81 107 39-90 71-107 113-107 54 0 92 41 92 136V748H430V391c0-30 2-74-31-74-28 0-48 43-84 115V748H237V393c0-50-6-76-31-76-20 0-40 20-83 114V748H44V255Z
		n 553 M155 255l3 80c47-53 86-89 162-89 108 0 155 71 155 170V748H390V429c0-65-25-109-86-109-37 0-68 12-140 101V748H79V255Z
		o 553 M281 246c183 0 227 142 227 251 0 162-98 260-236 260-160 0-227-112-227-254 0-144 83-257 236-257Zm-4 73c-66 0-144 41-144 182 0 138 69 184 144 184 96 0 143-78 143-184 0-94-36-182-143-182Z
		p 553 M154 255l6 83c32-43 79-92 170-92 90 0 170 68 170 249 0 172-105 259-242 259-32 0-64-4-94-11V949H79V255Zm10 409c31 12 66 21 97 21 106 0 152-75 152-188 0-108-33-176-101-176-46 0-89 27-148 103Z
		q 553 M472 246V949H386V763l4-105c-35 49-87 99-167 99-104 0-170-88-170-246 0-131 66-262 242-262 31 0 59 3 101 16Zm-86 93c-27-10-55-20-97-20-109 0-148 81-148 187 0 136 49 178 99 178 47 0 86-34 146-116Z
		r 553 m177 255 2 91c52-66 115-100 173-100 126 0 155 102 152 197H418c0-48-5-123-79-123-47 0-85 27-154 111V748H99V255Z
		s 553 M437 337c-155-38-254-20-254 43 0 35 14 52 129 87 115 35 157 72 157 144 0 134-172 175-380 127v-78c182 46 292 27 292-40 0-34-13-51-128-86-115-35-157-77-157-148 0-81 82-178 341-126Z
		t 553 M254 97V255H476v72H254V579c0 107 94 121 222 89v74c-220 41-307-16-307-162V327H31V255H169V119Z
		u 553 M390 255h85V748H398l-2-80c-39 42-80 89-165 89-102 0-152-63-152-176V255h85V581c0 62 30 103 85 103 62 0 99-54 141-102Z
		v 553 M423 255h94L324 748H225L32 255h98L249 576l28 84 25-77Z
		w 553 M451 255h85L464 748H360L289 543l-14-52-17 56-68 201H90L18 255h84l50 410 92-287h62l78 221 21 63Z
		x 553 M153 255 282 444 410 255H515L330 503 523 748H410L277 559 145 748H34L226 500 43 255Z
		y 553 M130 255 253 577l27 81L423 255h94L349 696C253 948 149 957 29 950V872c99 15 147-10 200-124L33 255Z
		z 553 M87 255H462v66L188 676H478v72H81V686L359 327H87Z
		{ 553 M441 106H404c-49 0-106 24-106 105V339c0 51-23 115-104 126 79 6 105 68 105 130V772c0 73 43 108 107 108h35v69H397c-141 0-180-86-180-177v-178c0-60-34-95-109-95H80V431h28c75 0 109-26 109-95V211c0-142 93-174 187-174h37Z
		| 553 M236 0h81V949H236Z
		} 553 M112 37h37c94 0 187 33 187 174V337c0 56 34 94 109 94h29v68H445c-75 0-109 26-109 95V772c0 91-39 177-180 177H112V880h35c61 0 108-31 108-108V594c0-53 19-118 104-129-85-8-104-75-104-126V212c0-78-55-106-106-106H112Z
		~ 553 M521 406v11c0 97-53 162-139 162-40 0-80-19-117-56l-28-28c-17-17-42-40-69-40-42 0-57 45-57 82v14H32V537c0-83 45-159 140-159 49 0 89 29 116 56l28 28c29 29 49 40 68 40 39 0 58-28 58-85V406Z
	`;
	// `


	constructor(scale=17,lineheight=1.4) {
		this.defscale=scale;
		this.lineheight=lineheight;
		this.loadfont(DrawFont.deffont);
	}


	loadfont(fontdef) {
		// Font format:
		//      name
		//      info
		//      scale
		//      char, width, path
		//
		// Assume height=scale.
		this.glyphs={};
		this.unknown=undefined;
		let idx=0,len=fontdef.length;
		function token(eol) {
			let c=0;
			while (idx<len && (c=fontdef.charCodeAt(idx))<=32 && c!==10) {idx++;}
			let i=idx;
			while (idx<len && fontdef.charCodeAt(idx)>eol) {idx++;}
			return fontdef.substring(i,idx);
		}
		token(10); idx++; // name
		token(10); idx++; // info
		let scale=parseFloat(token(10));
		let special={"SPC":32};
		while (idx<len) {
			idx++;
			let chr=token(32);
			if (chr.length<=0) {continue;}
			chr=special[chr]??chr.charCodeAt(0);
			let g={};
			g.width=parseInt(token(32))/scale;
			g.poly=new DrawPoly(token(10));
			let varr=g.poly.vertarr,vidx=g.poly.vertidx;
			for (let i=0;i<vidx;i++) {
				let v=varr[i];
				v.x/=scale;
				v.y/=scale;
			}
			g.poly.aabbupdate();
			this.glyphs[chr]=g;
			if (this.unknown===undefined || chr===63) {
				this.unknown=g;
			}
		}
	}


	textrect(str,scale) {
		// Returns the rectangle bounding the text.
		if (scale===undefined) {scale=this.defscale;}
		let len=str.length;
		let xpos=0,xmax=0;
		let ypos=0,lh=this.lineheight;
		let glyphs=this.glyphs;
		for (let i=0;i<len;i++) {
			let c=str.charCodeAt(i);
			let g=glyphs[c];
			if (g===undefined) {
				if (c===8) {
					// backspace
					throw "missing backspace";
				} else if (c===9) {
					// tab
					throw "missing tab";
				} else if (c===10) {
					ypos+=lh;
					xmax=xmax>xpos?xmax:xpos;
					xpos=0;
				} else if (c===13) {
					xmax=xmax>xpos?xmax:xpos;
					xpos=0;
				} else {
					g=this.unknown;
				}
				if (g===undefined) {
					continue;
				}
			}
			xpos+=g.width;
		}
		if (len>0) {
			xmax=xmax>xpos?xmax:xpos;
			ypos+=lh;
		}
		return {x:0,y:0,w:xmax*scale,h:ypos*scale};
	}

}


export class Draw {

	static Poly=DrawPoly;
	static Image=DrawImage;
	static Font=DrawFont;
	// The default context used for drawing functions.
	static def=null;


	constructor(width,height) {
		if (Draw.def===null) {Draw.def=this;}
		this.canvas   =null;
		this.ctx      =null;
		// Image info
		this.img      =new DrawImage(width,height);
		this.rgba     =new Uint8ClampedArray([0,1,2,3]);
		this.rgba32   =new Uint32Array(this.rgba.buffer);
		this.rgbashift=[0,0,0,0];
		let col=this.rgba32[0];
		for (let i=0;i<32;i+=8) {this.rgbashift[(col>>>i)&255]=i;}
		this.rgba32[0]=0xffffffff;
		// State
		this.deffont  =new DrawFont();
		this.deftrans =new Transform(2);
		this.defpoly  =new DrawPoly();
		this.stack    =[];
		this.stackidx =0;
		// Rendering variables
		this.linewidth=1.0;
		this.tmptrans =new Transform(2);
		this.tmppoly  =new DrawPoly();
		this.tmpline  =[];
	}


	screencanvas(canvas) {
		if (Object.is(this.canvas,canvas)) {return;}
		this.canvas=canvas;
		this.ctx=canvas.getContext("2d");
	}


	screenflip() {
		let img=this.img;
		let imgw=img.width,imgh=img.height;
		let cdata=new Uint8ClampedArray(img.data8.buffer);
		let idata=new ImageData(cdata,imgw,imgh);
		this.ctx.putImageData(idata,0,0);
	}


	// ----------------------------------------
	// Image Information


	setimage(img) {
		if (!(img instanceof DrawImage)) {
			img=new DrawImage(img);
		}
		this.img=img;
	}


	setcolor(r,g,b,a) {
		// Accepts: int, [r,g,b,a], {r,g,b,a}
		this.rgba32[0]=this.rgbatoint(r,g,b,a);
	}


	rgbatoint(r,g,b,a) {
		// Convert an RGBA array to a int regardless of endianness.
		if (g===undefined) {
			if (r instanceof Array) {
				a=r[3]??255;b=r[2]??255;g=r[1]??255;r=r[0]??255;
			} else if (r instanceof Object) {
				a=r.a??255;b=r.b??255;g=r.g??255;r=r.r??255;
			} else {
				a=(r>>>0)&255;b=(r>>>8)&255;g=(r>>>16)&255;r>>>=24;
			}
		}
		let tmp=this.rgba32[0];
		let rgba=this.rgba;
		rgba[0]=r>0?(r<255?(r|0):255):0;
		rgba[1]=g>0?(g<255?(g|0):255):0;
		rgba[2]=b>0?(b<255?(b|0):255):0;
		rgba[3]=a>0?(a<255?(a|0):255):0;
		rgba=this.rgba32[0];
		this.rgba32[0]=tmp;
		return rgba;
	}


	inttorgba(i) {
		let rgba32=this.rgba32;
		let tmp=rgba32[0];
		rgba32[0]=i;
		let rgba=this.rgba.slice();
		rgba32[0]=tmp;
		return rgba;
	}


	// ----------------------------------------
	// State


	resetstate() {
		this.rgba32[0]=0xffffffff;
		this.deftrans.reset();
	}


	pushstate() {
		let mem=this.stack[this.stackidx++];
		if (mem===undefined) {
			mem={
				img  :null,
				rgba :null,
				trans:new Transform(2),
				poly :null,
				font :null
			};
			this.stack[this.stackidx-1]=mem;
		}
		mem.img =this.img;
		mem.rgba=this.rgba32[0];
		mem.trans.set(this.deftrans);
		mem.poly=this.defpoly;
		mem.font=this.deffont;
	}


	popstate() {
		if (this.stackidx<=0) {throw "loading null stack";}
		let mem=this.stack[--this.stackidx];
		this.img=mem.img;
		this.rgba32[0]=mem.rgba;
		this.deftrans.set(mem.trans);
		this.defpoly=mem.poly;
		this.deffont=mem.font;
	}


	settransform(trans) {return this.deftrans.set(trans);}
	gettransform() {return this.deftrans;}


	// ----------------------------------------
	// Images


	fill(r,g,b,a) {
		// Fills the current image with a solid color.
		// data32.fill(rgba) was ~25% slower during testing.
		let rgba=this.rgbatoint(r,g,b,a);
		let data32=this.img.data32;
		let i=this.img.width*this.img.height;
		while (i>7) {
			data32[--i]=rgba;
			data32[--i]=rgba;
			data32[--i]=rgba;
			data32[--i]=rgba;
			data32[--i]=rgba;
			data32[--i]=rgba;
			data32[--i]=rgba;
			data32[--i]=rgba;
		}
		while (i>0) {
			data32[--i]=rgba;
		}
	}


	drawimage(src,dx,dy,dw,dh) {
		// Draw an image with alpha blending.
		// Note << and imul() implicitly cast floor().
		let dst=this.img;
		dx=dx??0;
		let ix=Math.floor(dx),fx0=dx-ix,fx1=1-fx0;
		dy=dy??0;
		let iy=Math.floor(dy),fy0=dy-iy,fy1=1-fy0;
		let iw=(dw===undefined || dw>src.width )?src.width :ix;
		let ih=(dh===undefined || dh>src.height)?src.height:iy;
		let sx=0,sy=0;
		iw+=ix;
		if (ix<0) {sx=-ix;ix=0;}
		iw=(iw>dst.width?dst.width:iw)-ix;
		ih+=iy;
		if (iy<0) {sy=-iy;iy=0;}
		ih=(ih>dst.height?dst.height:ih)-iy;
		if (iw<=0 || ih<=0) {return;}
		let m00=Math.round(fx0*fy0*256),m01=Math.round(fx0*fy1*256);
		let m10=Math.round(fx1*fy0*256),m11=256-m00-m01-m10;
		let dstdata=dst.data32,drow=iy*dst.width+ix,dinc=dst.width-iw;
		let srcdata=src.data32,srow=sy*src.width+sx,sinc=src.width-iw;
		let ystop=drow+dst.width*ih,xstop=drow+iw;
		let amul=this.rgba[3];
		let ashift=this.rgbashift[3],namask=(~(255<<ashift))>>>0;
		let maskl=0x00ff00ff&namask,maskh=0xff00ff00&namask;
		let sw=src.width,sh=src.height;
		iw=dst.width;
		const imul=Math.imul;
		while (drow<ystop) {
			let stop0=srow+sw-sx,stop1=++sy<sh?stop0:0;
			let s10=srcdata[srow];
			let s11=srow<stop1?srcdata[srow+sw]:0;
			while (drow<xstop) {
				// Interpolate 2x2 source pixels.
				srow++;
				let s00=s10,s01=s11;
				s10=srow<stop0?srcdata[srow]:0;
				s11=srow<stop1?srcdata[srow+sw]:0;
				const m=0x00ff00ff;
				let cl=imul(s00&m,m00)+imul(s01&m,m01)+imul(s10&m,m10)+imul(s11&m,m11);
				let ch=imul((s00>>>8)&m,m00)+imul((s01>>>8)&m,m01)+imul((s10>>>8)&m,m10)+imul((s11>>>8)&m,m11);
				src=(ch&0xff00ff00)|((cl>>>8)&m);
				let sa=(src>>>ashift)&255;
				if (sa<=0) {drow++;continue;}
				// a = sa + da*(1-sa)
				// c = (sc*sa + dc*da*(1-sa)) / a
				// Approximate blending by expanding sa from [0,255] to [0,256].
				src&=namask;
				let tmp=dstdata[drow];
				let da=(tmp>>>ashift)&255;
				sa*=amul;
				da=sa*255+da*(65025-sa);
				sa=(sa*65280+(da>>>1))/da;
				da=((da+32512)/65025)<<ashift;
				let l=tmp&0x00ff00ff;
				let h=tmp&0xff00ff00;
				dstdata[drow++]=da|
					(((imul((src&m)-l,sa)>>>8)+l)&maskl)|
					((imul(((src>>>8)&m)-(h>>>8),sa)+h)&maskh);
			}
			xstop+=iw;
			drow+=dinc;
			srow+=sinc;
		}
	}


	// ----------------------------------------
	// Paths


	beginpath() {return this.defpoly.begin(...arguments);}
	closepath() {return this.defpoly.close(...arguments);}
	moveto() {return this.defpoly.moveto(...arguments);}
	lineto() {return this.defpoly.lineto(...arguments);}
	curveto() {return this.defpoly.curveto(...arguments);}


	// ----------------------------------------
	// Primitives


	drawline(x0,y0,x1,y1) {
		let poly=this.tmppoly,trans=this.deftrans;
		poly.begin();
		poly.addline(x0,y0,x1,y1,this.linewidth*0.5);
		this.fillpoly(poly,trans);
	}


	fillrect(x,y,w,h) {
		let trans=this.tmptrans.set(this.deftrans).shift([x,y]);
		let poly=this.tmppoly;
		poly.begin();
		poly.addrect(0,0,w,h);
		this.fillpoly(poly,trans);
	}


	fillcircle(x,y,rad) {
		this.filloval(x,y,rad,rad);
	}


	filloval(x,y,xrad,yrad) {
		yrad=yrad??xrad;
		let trans=this.tmptrans.set(this.deftrans).shift([x,y]);
		let poly=this.tmppoly;
		poly.begin();
		poly.addoval(0,0,xrad,yrad);
		this.fillpoly(poly,trans);
	}


	// ----------------------------------------
	// Text


	setfont(font) {this.deffont=font;}


	filltext(x,y,str,scale) {
		let font=this.deffont,glyphs=font.glyphs;
		if (scale===undefined) {scale=font.defscale;}
		let len=str.length;
		let xpos=0,ypos=0,lh=font.lineheight;
		let trans=this.tmptrans;
		trans.set(this.deftrans).scale(scale);
		for (let i=0;i<len;i++) {
			let c=str.charCodeAt(i);
			let g=glyphs[c];
			if (g===undefined) {
				if (c===8) {
					// backspace
					throw "missing backspace";
				} else if (c===9) {
					// tab
					throw "missing tab";
				} else if (c===10) {
					// EOL
					ypos+=lh;
					xpos=0;
				} else if (c===13) {
					// linefeed
					xpos=0;
				} else {
					g=font.unknown;
				}
				if (g===undefined) {
					continue;
				}
			}
			trans.vec.set(trans.mat.mul([xpos,ypos])).iadd([x,y]);
			this.fillpoly(g.poly,trans);
			xpos+=g.width;
		}
	}


	textrect(str,scale) {
		return this.deffont.textrect(str,scale);
	}


	// ----------------------------------------
	// Polygon Filling


	fillresize(size) {
		// Declaring line objects this way allows engines to optimize their structs.
		let len=this.tmpline.length;
		while (len<size) {len+=len+1;}
		while (this.tmpline.length<len) {
			this.tmpline.push({
				sort:0,
				end:0,
				x0:0,y0:0,
				x1:0,y1:0,
				x2:0,y2:0,
				x3:0,y3:0
			});
		}
		return this.tmpline;
	}


	fillpoly(poly,trans) {
		// Fills the current path.
		//
		// Preprocess the lines and curves. Use a binary heap to dynamically sort lines.
		// Keep JS as simple as possible to be efficient. Keep micro optimization in WASM.
		// ~~x = fast floor(x)
		if (poly===undefined) {poly=this.defpoly;}
		if (trans===undefined) {trans=this.deftrans;}
		else if (!(trans instanceof Transform)) {trans=new Transform(trans);}
		const curvemaxdist2=0.02;
		let iw=this.img.width,ih=this.img.height;
		let alpha=this.rgba[3]/255.0;
		if (poly.vertidx<3 || iw<1 || ih<1 || alpha<1e-4) {return;}
		// Screenspace transformation.
		let matxx=trans.mat[0],matxy=trans.mat[1],matx=trans.vec[0];
		let matyx=trans.mat[2],matyy=trans.mat[3],maty=trans.vec[1];
		// Perform a quick AABB-OBB overlap test.
		// Define the transformed bounding box.
		let bx=poly.minx,by=poly.miny;
		let bndx=bx*matxx+by*matxy+matx;
		let bndy=bx*matyx+by*matyy+maty;
		bx=poly.maxx-bx;by=poly.maxy-by;
		let bndxx=bx*matxx,bndxy=bx*matyx;
		let bndyx=by*matxy,bndyy=by*matyy;
		// Test if the image AABB has a separating axis.
		let minx=bndx-iw,maxx=bndx;
		if (bndxx<0) {minx+=bndxx;} else {maxx+=bndxx;}
		if (bndyx<0) {minx+=bndyx;} else {maxx+=bndyx;}
		if (!(minx<0 && 0<maxx)) {return;}
		let miny=bndy-ih,maxy=bndy;
		if (bndxy<0) {miny+=bndxy;} else {maxy+=bndxy;}
		if (bndyy<0) {miny+=bndyy;} else {maxy+=bndyy;}
		if (!(miny<0 && 0<maxy)) {return;}
		// Test if the poly OBB has a separating axis.
		let cross=bndxx*bndyy-bndxy*bndyx;
		minx=bndy*bndxx-bndx*bndxy;maxx=minx;
		bndxx*=ih;bndxy*=iw;
		if (cross<0) {minx+=cross;} else {maxx+=cross;}
		if (bndxx<0) {maxx-=bndxx;} else {minx-=bndxx;}
		if (bndxy<0) {minx+=bndxy;} else {maxx+=bndxy;}
		if (!(minx<0 && 0<maxx)) {return;}
		miny=bndy*bndyx-bndx*bndyy;maxy=miny;
		bndyx*=ih;bndyy*=iw;
		if (cross<0) {maxy-=cross;} else {miny-=cross;}
		if (bndyx<0) {maxy-=bndyx;} else {miny-=bndyx;}
		if (bndyy<0) {miny+=bndyy;} else {maxy+=bndyy;}
		if (!(miny<0 && 0<maxy)) {return;}
		// Loop through the path nodes.
		let lr=this.tmpline,lrcnt=lr.length,lcnt=0;
		let movex=0,movey=0,area=0;
		let p0x=0,p0y=0,p1x=0,p1y=0;
		let varr=poly.vertarr;
		let vidx=poly.vertidx;
		for (let i=0;i<=vidx;i++) {
			let v=varr[i<vidx?i:0];
			if (v.type===DrawPoly.CURVE) {v=varr[i+2];}
			p0x=p1x;p1x=v.x*matxx+v.y*matxy+matx;
			p0y=p1y;p1y=v.x*matyx+v.y*matyy+maty;
			// Add a basic line.
			let m1x=p1x,m1y=p1y;
			if (v.type===DrawPoly.MOVE) {
				// Close any unclosed subpaths.
				m1x=movex;movex=p1x;
				m1y=movey;movey=p1y;
				if (!i || (m1x===p0x && m1y===p0y)) {continue;}
			}
			if (lrcnt<=lcnt) {
				lr=this.fillresize(lcnt+1);
				lrcnt=lr.length;
			}
			let l=lr[lcnt++];
			l.sort=0;l.end=-1;
			area+=p0x*m1y-m1x*p0y;
			l.x0=p0x;
			l.y0=p0y;
			l.x1=m1x;
			l.y1=m1y;
			if (v.type!==DrawPoly.CURVE) {continue;}
			// Linear decomposition of curves.
			v=varr[i++];let n1x=v.x*matxx+v.y*matxy+matx,n1y=v.x*matyx+v.y*matyy+maty;
			v=varr[i++];let n2x=v.x*matxx+v.y*matxy+matx,n2y=v.x*matyx+v.y*matyy+maty;
			l.x2=n1x;l.x3=n2x;
			l.y2=n1y;l.y3=n2y;
			area-=((n1x-p0x)*(2*p0y-n2y-p1y)+(n2x-p0x)*(p0y+n1y-2*p1y)
				 +(p1x-p0x)*(2*n2y+n1y-3*p0y))*0.3;
			for (let j=lcnt-1;j<lcnt;j++) {
				// The curve will stay inside the bounding box of [c0,c1,c2,c3].
				// If the subcurve is outside the image, stop subdividing.
				l=lr[j];
				let c3x=l.x1,c2x=l.x3,c1x=l.x2,c0x=l.x0;
				let c3y=l.y1,c2y=l.y3,c1y=l.y2,c0y=l.y0;
				if ((c0x<=0 && c1x<=0 && c2x<=0 && c3x<=0) || (c0x>=iw && c1x>=iw && c2x>=iw && c3x>=iw) ||
				    (c0y<=0 && c1y<=0 && c2y<=0 && c3y<=0) || (c0y>=ih && c1y>=ih && c2y>=ih && c3y>=ih)) {
					continue;
				}
				let dx=c3x-c0x,dy=c3y-c0y,den=dx*dx+dy*dy;
				// Test if both control points are close to the line c0->c3.
				// Clamp to ends and filter degenerates.
				let lx=c1x-c0x,ly=c1y-c0y;
				let u=dx*lx+dy*ly;
				u=u>0?(u<den?u/den:1):0;
				lx-=dx*u;ly-=dy*u;
				let d1=lx*lx+ly*ly;
				lx=c2x-c0x;ly=c2y-c0y;
				u=dx*lx+dy*ly;
				u=u>0?(u<den?u/den:1):0;
				lx-=dx*u;ly-=dy*u;
				let d2=lx*lx+ly*ly;
				d1=(d1>d2 || !(d1===d1))?d1:d2;
				if (!(d1>curvemaxdist2 && d1<Infinity)) {continue;}
				// Split the curve in half. [c0,c1,c2,c3] = [c0,l1,l2,ph] + [ph,r1,r2,c3]
				if (lrcnt<=lcnt) {
					lr=this.fillresize(lcnt+1);
					lrcnt=lr.length;
				}
				let l1x=(c0x+c1x)*0.5,l1y=(c0y+c1y)*0.5;
				let t1x=(c1x+c2x)*0.5,t1y=(c1y+c2y)*0.5;
				let r2x=(c2x+c3x)*0.5,r2y=(c2y+c3y)*0.5;
				let l2x=(l1x+t1x)*0.5,l2y=(l1y+t1y)*0.5;
				let r1x=(t1x+r2x)*0.5,r1y=(t1y+r2y)*0.5;
				let phx=(l2x+r1x)*0.5,phy=(l2y+r1y)*0.5;
				l.x1=phx;l.x3=l2x;l.x2=l1x;
				l.y1=phy;l.y3=l2y;l.y2=l1y;
				l=lr[lcnt++];
				l.sort=0;l.end=-1;
				l.x1=c3x;l.x3=r2x;l.x2=r1x;l.x0=phx;
				l.y1=c3y;l.y3=r2y;l.y2=r1y;l.y0=phy;
				j--;
			}
		}
		// Init blending.
		let amul=area<0?-alpha:alpha;
		let ashift=this.rgbashift[3],amask=(255<<ashift)>>>0;
		let maskl=(0x00ff00ff&~amask)>>>0,maskh=(0xff00ff00&~amask)>>>0;
		let colrgb=(this.rgba32[0]|amask)>>>0;
		let coll=(colrgb&maskl)>>>0,colh=(colrgb&maskh)>>>0,colh8=colh>>>8;
		// Process the lines row by row.
		let p=0,y=0,pixels=iw*ih;
		let pnext=0,prow=0;
		let areadx1=0;
		let imgdata=this.img.data32;
		while (true) {
			if (p>=prow) {
				p=pnext;
				if (p>=pixels || lcnt<1) {break;}
				y=~~(p/iw);
				prow=y*iw+iw;
				area=0;
				areadx1=0;
			}
			let areadx2=0;
			while (p>=pnext) {
				// fx0  fx0+1                          fx1  fx1+1
				//  +-----+-----+-----+-----+-----+-----+-----+
				//  |                              .....----  |
				//  |               .....-----'''''           |
				//  | ....-----'''''                          |
				//  +-----+-----+-----+-----+-----+-----+-----+
				//   first  dyx   dyx   dyx   dyx   dyx  last   tail
				//
				// Orient upwards, then clip y to [0,1].
				let l=lr[0];
				let x0=l.x0,y0=l.y0;
				let x1=l.x1,y1=l.y1;
				let sign=amul,tmp=0;
				let end=l.end,sort=prow-iw,x=p-sort;
				l.end=-1;
				if (y0>y1) {
					sign=-sign;
					tmp=x0;x0=x1;x1=tmp;
					tmp=y0;y0=y1;y1=tmp;
				}
				let fy=y0<ih?y0:ih;
				fy=fy>y?~~fy:y;
				let dx=x1-x0,dy=y1-y0,dxy=dx/dy;
				// Use y0x for large coordinate stability.
				let y0x=x0-y0*dxy+fy*dxy;
				y0-=fy;y1-=fy;
				let nx=y1>2?y0x+2*dxy:x1;
				if (y1>1) {y1=1;x1=y0x+dxy;}
				if (y0<0) {y0=0;x0=y0x;}
				// Subtract x after normalizing to row.
				x0-=x;x1-=x;nx-=x;
				nx=nx<x1?nx:x1;
				if (x0>x1) {dx=-dx;tmp=x0;x0=x1;x1=tmp;}
				dy*=sign;let dyx=dy/dx;dy*=0.5;
				if (!(y1>0 && dyx!==0)) {
					// Above or degenerate.
					sort=pixels;
				} else if (x0>=1 || fy>y) {
					// Below or to the left.
					nx=x0;
					sort=fy*iw;
				} else if (x1<=1) {
					// Vertical line or last pixel.
					tmp=x1>0?-(x1*x1/dx)*dy:0;
					if (end<p && end>=sort) {
						areadx1+=dyx;
						area+=((x1>0?(1-x1)*(1-x1):(1-2*x1))/dx)*dy;
					} else {
						dy=(y0-y1)*sign;
						tmp=x0>=0?0.5*(x0+x1)*dy:tmp;
						area+=dy-tmp;
					}
					areadx2+=tmp;
					sort+=y1<1?pixels:iw;
				} else {
					// Spanning 2+ pixels.
					tmp=((x0>0?(1-x0)*(1-x0):(1-2*x0))/dx)*dy;
					area-=tmp;
					if (x1>=2) {
						areadx1-=dyx;
						tmp=x0>0?(x0*x0/dx)*dy:0;
						l.end=p;
					}
					areadx2+=tmp;
					nx=x1;
				}
				nx+=x;
				nx=nx<0?0:nx;
				sort+=nx<iw?~~nx:iw;
				sort=sort>p?sort:pixels;
				l.sort=sort;
				// Heap sort down.
				if (sort>=pixels) {
					let t=lr[--lcnt];
					lr[lcnt]=l;l=t;
					sort=l.sort;
				}
				let i=0,j=0;
				while ((j+=j+1)<lcnt) {
					let j1=j+1<lcnt?j+1:j;
					let l0=lr[j],l1=lr[j1];
					let s0=l0.sort,s1=l1.sort;
					if (s0>s1) {s0=s1;l0=l1;j=j1;}
					if (s0>=sort) {break;}
					lr[i]=l0;
					i=j;
				}
				lr[i]=l;
				pnext=lr[0].sort;
			}
			// Calculate how much we can draw or skip.
			const cutoff=0.00390625;
			let astop=area+areadx1+areadx2;
			let pstop=p+1,pdif=(pnext<prow?pnext:prow)-pstop;
			if (pdif>0 && (area>=cutoff)===(astop>=cutoff)) {
				let adif=(cutoff-astop)/areadx1+1;
				pdif=(adif>=1 && adif<pdif)?~~adif:pdif;
				astop+=pdif*areadx1;
				pstop+=pdif;
			}
			// Blend the pixel based on how much we're covering.
			if (area>=cutoff) {
				do {
					// a = sa + da*(1-sa)
					// c = (sc - dc)*sa/a + dc
					let sa=area<alpha?area:alpha;
					area+=areadx1+areadx2;
					areadx2=0;
					let dst=imgdata[p];
					let da=(dst>>>ashift)&255;
					if (da===255) {
						sa=256.49-sa*256;
					} else {
						let tmp=sa*255+(1-sa)*da;
						sa=256.49-(sa/tmp)*65280;
						da=tmp+0.49;
					}
					// imul() implicitly casts floor(sa).
					imgdata[p]=(da<<ashift)
						|(((Math.imul((dst&0x00ff00ff)-coll,sa)>>>8)+coll)&maskl)
						|((Math.imul(((dst>>>8)&0x00ff00ff)-colh8,sa)+colh)&maskh);
				} while (++p<pstop);
			}
			p=pstop;
			area=astop;
		}
	}


	tracepoly(poly,rad,trans) {
		return this.fillpoly(poly.trace(rad),trans);
	}

}


//---------------------------------------------------------------------------------
// UI - v1.02


export class UI {

	static VOLUME_POLY=new Draw.Poly(`
		M-.111-.722V.722l-.5-.416H-1V-.306h.389ZM.209-.584C.671-.33.671.33.209.584L.102
		.39C.41.217.41-.217.102-.39Zm.213-.39c.77.424.77 1.524 0 1.948L.316.78C.932.428
		.932-.428.316-.78Z
	`);


	constructor(draw,input) {
		this.draw=draw;
		this.input=input;
		this.nodes=[];
		this.grabbing=false;
		this.focus=null;
	}


	addnode(type,x,y,w,h) {
		// x,y,w,h,z,img,onchange,type,parent,children
		let node={
			type:type,
			onchange:null,
			x:x,
			y:y,
			w:w,
			h:h,
			value:null
		};
		this.nodes.push(node);
		return node;
	}


	update() {
		// If we're rendering, ignore inputs.
		let typemap={"text":0,"poly":1,"slider":2};
		let input=this.input;
		let draw=this.draw,img=draw.img;
		let dw=img.width,dh=img.height;
		let [mx,my]=input.getmousepos();
		let grabbing=this.grabbing;
		let focus=this.focus;
		// If we're not grabbing something, check if we're focused on anything.
		if (!grabbing) {
			focus=null;
			for (let node of this.nodes) {
				let type=typemap[node.type];
				let nx=node.x,ny=node.y,nw=node.w,nh=node.h;
				// if (nw<0) {nx+=nw;nw=-nw;}
				// if (nh<0) {ny+=nh;nh=-nh;}
				if (nx>=dw || ny>=dh || nx+nw<=0 || ny+nh<=0) {
					continue;
				}
				if (type<2) {continue;}
				if (mx>=nx && my>=ny && mx<nx+nw && my<ny+nh) {
					focus=node;
				}
			}
		}
		// Check if we've starting clicking on something. Eat the input if we have focus.
		let key=input.MOUSE.LEFT;
		if (!input.getkeydown(key)) {
			grabbing=false;
		} else if (focus!==null) {
			let hit=input.getkeychange(key);
			grabbing=(grabbing || hit>0)?true:false;
		}
		if (grabbing || this.grabbing) {input.keyclear(key);}
		this.grabbing=grabbing;
		this.focus=focus;
		// If we're grabbing something, update its value.
		if (grabbing) {
			let node=focus;
			let type=typemap[node.type];
			let nx=node.x,ny=node.y,nw=node.w,nh=node.h;
			if (type===2) {
				let rad=(nw<nh?nw:nh)*0.5;
				let x0=nx+rad,y0=ny+rad;
				let dx=nx+nw-rad-x0,dy=ny+nh-rad-y0;
				let u=((mx-x0)*dx+(my-y0)*dy)/(dx*dx+dy*dy);
				u=u>0?(u<1?u:1):0;
				if (node.value!==u) {
					node.value=u;
					let call=node.onchange;
					if (call!==null) {call(node);}
				}
			}
		}
	}


	render() {
		let typemap={"text":0,"poly":1,"slider":2};
		let draw=this.draw,img=draw.img;
		let dw=img.width,dh=img.height;
		let focus=this.focus;
		draw.pushstate();
		draw.resetstate();
		for (let node of this.nodes) {
			let type=typemap[node.type];
			let nx=node.x,ny=node.y,nw=node.w,nh=node.h;
			// if (nw<0) {nx+=nw;nw=-nw;}
			// if (nh<0) {ny+=nh;nh=-nh;}
			if (nx>=dw || ny>=dh || nx+nw<=0 || ny+nh<=0) {
				continue;
			}
			let onmouse=Object.is(focus,node);
			draw.setcolor(255,255,255,255);
			if (type===0) {
				draw.filltext(nx,ny,node.value,node.size);
			} else if (type===1) {
				draw.fillpoly(node.poly,node.trans);
			} else if (type===2) {
				let rad=(nw<nh?nw:nh)*0.5;
				let x0=nx+rad,y0=ny+rad;
				let x1=nx+nw-rad,y1=ny+nh-rad;
				if (onmouse) {draw.setcolor(64,64,255,255);}
				let lw=draw.linewidth;
				draw.linewidth=rad*0.5;
				draw.drawline(x0,y0,x1,y1);
				let u=node.value;
				let sx=u*(x1-x0)+x0;
				let sy=u*(y1-y0)+y0;
				draw.filloval(sx,sy,rad);
				draw.linewidth=lw;
			}
		}
		draw.popstate();
	}


	addtext(x,y,text,size) {
		let rect=this.draw.textrect(text,size);
		let node=this.addnode("text",x,y,rect.w,rect.h);
		node.value=text;
		node.size=size;
		return node;
	}


	addpoly(poly,trans) {
		let node=this.addnode("poly",-Infinity,-Infinity,Infinity,Infinity);
		node.poly=poly;
		node.trans=new Transform(trans);
		return node;
	}


	addslider(x,y,w,h,value=0,min=0,max=1) {
		let node=this.addnode("slider",x,y,w,h);
		value=value>min?value:min;
		value=value<max?value:max;
		node.value=value;
		return node;
	}

}


//---------------------------------------------------------------------------------
// Audio - v3.09


class AudioSound {

	constructor(freq=44100,len=0) {
		// accepts len/path and frequency
		this.audio=Audio.initdef();
		this.freq=freq;
		this.queue=null;
		let type=typeof len;
		if (type==="number") {
			this.resizelen(len);
		} else if (type==="string") {
			this.loadfile(len);
		} else {
			this.resizelen(0);
		}
	}


	get(i) {
		let len=this.len;
		let data=this.data;
		if (len<2) {return len?data[0]:0;}
		if (i<0) {i=(i%len)+len;}
		else if (i>=len) {i%=len;}
		let j0=Math.floor(i);
		i-=j0;
		let j1=j0+1<len?j0+1:0;
		return data[j0]*(1-i)+data[j1]*i;
	}


	slicelen(start=0,len=Infinity) {
		start=Math.floor(start);
		if (start<0) {
			len+=start;
			start=0;
		}
		if (start>this.len) {start=this.len;}
		if (len>this.len-start) {len=this.len-start;}
		len=Math.floor(len);
		let newsnd=new AudioSound(this.freq,len);
		let newdata=newsnd.data;
		let data=this.data;
		for (let i=0;i<len;i++) {newdata[i]=data[start+i];}
		return newsnd;
	}


	slicetime(start=0,len=Infinity) {
		return this.slicelen(start*this.freq,len*this.freq);
	}


	copy() {return this.slicelen();}


	trim(eps=1e-4) {
		return this.trimend(eps).trimstart(eps);
	}


	trimstart(eps=1e-4) {
		let data=this.data;
		let len=this.len,pos=0;
		while (pos<len && Math.abs(data[pos])<=eps) {pos++;}
		for (let i=pos;i<len;i++) {data[i-pos]=data[i];}
		return this.resizelen(len-pos);
	}


	trimend(eps=1e-4) {
		let data=this.data;
		let len=this.len;
		while (len>0 && Math.abs(data[len-1])<=eps) {len--;}
		return this.resizelen(len);
	}


	resizelen(len) {
		// Over-allocate in case we keep modifying the sound.
		len=isNaN(len) || len<0?0:(len|0);
		this.loaded=true;
		let olddata=this.data;
		let oldlen=olddata?olddata.length:-1;
		let newlen=(len>oldlen || 3*len<oldlen)?len*2:oldlen;
		let data=this.data;
		if (newlen!==oldlen) {
			if (newlen>0) {
				this.ctxbuf=this.audio.ctx.createBuffer(1,newlen,this.freq);
				data=this.ctxbuf.getChannelData(0);
			} else {
				this.ctxbuf=null;
				data=new Float32Array(0);
			}
			let copylen=oldlen<newlen?oldlen:newlen;
			for (let i=0;i<copylen;i++) {data[i]=olddata[i];}
		}
		let clearlen=this.len<newlen?this.len:newlen;
		this.data=data;
		for (let i=len;i<clearlen;i++) {data[i]=0;}
		this.len=len;
		this.time=len/this.freq;
		return this;
	}


	resizetime(time) {return this.resizelen(Math.round(time*this.freq));}


	loadfile(path) {
		// Load and replace the sound with a WAV file.
		this.resizelen(0);
		this.loaded=false;
		let req=new XMLHttpRequest();
		req.open("GET",path,true);
		req.responseType="arraybuffer";
		req.onload=(()=>{
			if (req.response) {
				let data=new Uint8Array(req.response);
				this.fromwav(data);
			}
		});
		req.send(null);
	}


	savefile(name) {
		// Save the sound to a WAV file.
		let blob=new Blob([this.towav()]);
		let link=document.createElement("a");
		link.href=window.URL.createObjectURL(blob);
		link.download=name;
		link.click();
	}


	fromwav(data,dataidx=0) {
		// Load a sound from WAV data. Can handle PCM or floating point samples.
		// Converts multi-channel to mono-channel.
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
				throw "corrupt block";
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
			throw "could not find format or data blocks";
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
		this.resizelen(samples);
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


	play(volume,pan,time,freq) {
		return this.audio.play(this,volume,pan,time,freq);
	}


	addindex(snd,dstoff=0,vol=1.0) {
		// Add sound samples to the current sound.
		dstoff=Math.floor(dstoff);
		let srcoff=0,srclen=snd.len;
		if (dstoff<0) {
			srcoff=-dstoff;
			srclen+=dstoff;
		}
		if (srclen<=0) {return this;}
		if (dstoff+srclen>this.len) {
			this.resizelen(dstoff+srclen);
		}
		let dstdata=this.data;
		let srcdata=snd.data;
		// If we're adding the sound to itself, we may need to go back-to-front.
		if (dstoff<srcoff) {
			for (let i=0;i<srclen;i++) {
				dstdata[dstoff++]+=srcdata[srcoff++]*vol;
			}
		} else {
			dstoff+=srclen;
			srcoff+=srclen;
			for (let i=0;i<srclen;i++) {
				dstdata[--dstoff]+=srcdata[--srcoff]*vol;
			}
		}
		return this;
	}


	add(snd,time=0,vol=1.0) {
		return this.addindex(snd,Math.round(time*this.freq),vol);
	}


	getvol() {
		let data=this.data,len=data.length;
		let v=0;
		for (let i=0;i<len;i++) {
			let x=Math.abs(data[i]);
			v=v<x?x:v;
		}
		return v;
	}


	scalevol(mul,normalize=false) {
		let data=this.data,len=data.length;
		if (normalize) {
			let norm=this.getvol();
			mul=norm>1e-10?mul/norm:0;
		}
		for (let i=0;i<len;i++) {data[i]*=mul;}
		return this;
	}

}


class AudioSFX {

	// Array Format
	//  Offset | Data
	// --------+--------------
	//         | Header data
	//       0 | [u32 next]
	//       4 | [u32 in stop]
	//       8 |      [u32 src stop 1] [u32 src 1] [u32 src 2] ... [dst 1]
	//   stop1 |      [u32 src stop 2] [u32 src 1] [u32 src 2] ... [dst 2]
	//   stop2 |      ...
	//         |      VAR/OP format: [8: OP,24: addr]
	//         |      CON    format: [8: OP,24: addr] [f32 con]
	//  instop | Node data
	//       0 | [u32 type]
	//       4 | [f32 output]
	//       8 | [f32 field 1]
	//      12 | [f32 field 2]
	//      16 | ...
	//    next | Next node header

	// Rules
	// Node names begin with a # symbol. The last node is used as output.
	// Node outputs can be used as inputs for most parameters.
	// Ex, a square wave modulated by a sine wave: #osc: SIN F 200 #out: SQR F #osc
	// Combine inputs with reverse polish notation. Leftover terms are summed.
	// Ex, (#osca*2)+(#oscb-1): #out: SQR F #osca 2 * #oscb 1 -


	constructor(str) {
		this.parse(str);
	}


	reset() {
		this.di32.set(this.orig);
	}


	tosound(time=10,silence=0.1,freq=44100) {
		// Plays the effect until a max time or span of silence.
		if (isNaN(time) || time<0) {time=Infinity;}
		if (isNaN(silence) || silence<0) {silence=Infinity;}
		let snd=null;
		let maxlen=Math.floor(freq*time);
		if (silence>=Infinity) {
			// Fill the whole time.
			if (time>=Infinity) {throw "infinite sound";}
			snd=new AudioSound(freq,maxlen);
			this.fill(snd);
		} else {
			// Fill until max time or silence.
			const thres=1e-5;
			let sillen=Math.floor(freq*silence);
			let genlen=Math.floor(freq*0.2)+1;
			snd=new AudioSound(freq,0);
			let len=snd.len,silpos=0;
			let data=snd.data;
			for (let dst=0;dst<maxlen && dst-silpos<sillen;) {
				let newlen=dst+genlen;
				if (newlen>len) {
					if (newlen>maxlen) {newlen=maxlen;}
					len=newlen;
					snd.resizelen(len);
					data=snd.data;
				}
				this.fill(snd,dst,newlen-dst);
				while (dst<newlen) {
					if (Math.abs(data[dst++])>thres) {silpos=dst;}
				}
			}
			while (len>silpos) {data[--len]=0;}
			snd.len=len;
			snd.time=len/freq;
		}
		this.reset();
		return snd;
	}


	addr(name) {
		// Gets the address of #node.attr. Ex: #osc1.f
		let addr=this.namemap[name];
		if (addr===undefined) {throw name+" not found";}
		return addr;
	}


	geti(name) {return this.di32[this.addr(name)];}
	getf(name) {return this.df32[this.addr(name)];}
	seti(name,val) {this.di32[this.addr(name)]=val;return this;}
	setf(name,val) {this.df32[this.addr(name)]=val;return this;}


	// ----------------------------------------
	// Parser


	parse(seqstr) {
		// Last node is used as output. Node names must start with #.
		// Translating addresses: (node_num+1)<<8+param_num
		const EXPR=0,ENV=1,TBL=2,NOI=8,DEL=9,OSC0=2,OSC1=7,FIL0=10,FIL1=17;
		const CON=0,VAR=1,OP=2,VBITS=24,VMASK=(1<<VBITS)-1,PBITS=8,PMASK=(1<<PBITS)-1;
		this.namemap={};
		let nodetypes=[
			{str:"expr" ,type: 0,params:" "},
			{str:"env"  ,type: 1,params:"asri "},
			{str:"tbl"  ,type: 2,params:"fphl t"},
			{str:"tri"  ,type: 3,params:"fphl "},
			{str:"pulse",type: 4,params:"fphl w"},
			{str:"saw"  ,type: 5,params:"fphl "},
			{str:"sin"  ,type: 6,params:"fphl "},
			{str:"sqr"  ,type: 7,params:"fphl "},
			{str:"noise",type: 8,params:"hl  "},
			{str:"del"  ,type: 9,params:"tmi "},
			{str:"lpf"  ,type:10,params:"fbgi"},
			{str:"hpf"  ,type:11,params:"fbgi"},
			{str:"bpf"  ,type:12,params:"fbgi"},
			{str:"npf"  ,type:13,params:"fbgi"},
			{str:"apf"  ,type:14,params:"fbgi"},
			{str:"pkf"  ,type:15,params:"fbgi"},
			{str:"lsf"  ,type:16,params:"fbgi"},
			{str:"hsf"  ,type:17,params:"fbgi"}
		];
		seqstr=seqstr.toLowerCase();
		let s=0,seqlen=seqstr.length;
		let sndfreq=44100;
		let ndecl=new Int32Array(seqlen>>1);
		let naddr=new Int32Array(seqlen>>1);
		let node=null,nparam=0,nodes=0,nid=0;
		let name="";
		let paramarr=new Array(10);
		let paramcon=new Array(10);
		let dpos=0;
		let di32=new Int32Array(0);
		let df32=new Float32Array(di32.buffer);
		function error(msg,s0,s1) {
			let line=1,start=0;
			for (let i=0;i<s0;i++) {if (seqstr.charCodeAt(i)===10) {start=i+1;line++;}}
			if (s1===undefined) {s1=s0+1;s0=start;}
			let argsum=seqstr.substring(s0,s1);
			throw "Sequencer error:\n\tError: "+msg+"\n\tLine : "+line+"\n\targs : "+argsum;
		}
		function getc() {return s<seqlen?seqstr.charCodeAt(s):0;}
		function findc(str,c) {
			let i=str.length;while (--i>=0 && str.charCodeAt(i)!==c) {}
			return i;
		}
		while (s<seqlen || node) {
			// Read through whitespace and comments.
			let c=0;
			while ((c=getc())<33 && c>0) {s++;}
			if (c===39 || c===34) {
				// If " stop at ". If ' stop at \n.
				let eoc=c===34?34:10;
				do {s++;} while ((c=getc())!==eoc && c>0);
				s++;
				continue;
			}
			// Stop at :'"
			let c0=getc(),s0=s++;
			while ((c=getc())>32 && c!==34 && c!==39 && c!==58) {s++;}
			// Types: 0 const, 1 node, 2 op, 3 process
			let tval=nodes,tid=3,s1=s;
			while ((c=getc())<33 && c>0) {s++;}
			if (!node && c!==58) {
				// Node type. If we can't identify it, default to EXPR.
				let n=nodetypes.length,str=seqstr.substring(s0,s1);
				while (--n>=0 && str!==nodetypes[n].str) {}
				node=nodetypes[n>0?n:0];
				let params=node.params.length;
				for (let i=0;i<params;i++) {paramarr[i]=new Array();}
				nparam=0;
				if (n>=0) {continue;}
			}
			if (c0===35) {
				// Find the node's ID.
				while (--tval>=0) {
					let i=ndecl[tval],j=s1-1;
					while (j>=s0 && seqstr[i]===seqstr[j]) {i--;j--;}
					if (j<s0) {break;}
				}
				// If we have a new node name or a definition.
				if (tval<0) {tval=nodes++;naddr[tval]=-s0-1;ndecl[tval]=s1-1;}
				if (c!==58) {tid=VAR;tval=((tval+1)<<PBITS)|1;}
				else {s++;if (naddr[tval]>=0) {error("node already defined",s0,s1);}}
			} else if (s1-s0<2 && c0>96 && c0<123) {
				// Parameter.
				nparam=findc(node.params,c0);
				if (nparam<0) {error("invalid parameter",s0,s1);}
				continue;
			} else if (s1-s0<2 && c0 && (c0<48 || c0>57)) {
				// Operator.
				tval=findc(" ~_+-*%/^<>",c0);
				if (tval<0) {error("invalid operator",s0,s1);}
				tid=OP;
			} else if (c0) {
				// Parse numbers in format: [+-]\d*(\.\d*)?
				let i=s0,d=0;
				c=i<s1?seqstr.charCodeAt(i):0;
				let neg=c===45?-1:1;
				if (c===45 || c===43) {i++;}
				let num=0,den=1;
				while (i<s1 && (c=seqstr.charCodeAt(i)-48)>=0 && c<=9) {d=1;i++;num=num*10+c;}
				if (c===-2) {i++;}
				while (i<s1 && (c=seqstr.charCodeAt(i)-48)>=0 && c<=9) {d=1;i++;den*=0.1;num+=c*den;}
				if (i<s1 || !d) {error("invalid token",s0,s1);}
				tval=neg*num;
				tid=CON;
			}
			// Process the token.
			if (tid<3) {
				if (!node) {error("node type undefined",s0,s);}
				paramarr[nparam].push({type:tid,val:tval});
				continue;
			}
			if (node) {
				// Make sure expressions are valid and preprocess constant expressions.
				let params=node.params.length;
				let type=node.type;
				for (let i=0;i<params;i++) {
					// Don't evaluate osc.p.
					let stack=paramarr[i];
					if (type===TBL && i===5) {continue;}
					let h=0;
					for (let p of stack) {
						h+=p.type!==OP?1:(p.val<3?0:-1);
						if (h<=0) {error("not enough operands in expression: "+node.str,s0-1);}
					}
					// Sum everything left in the stack.
					while (h-->1) {
						let p={type:OP,val:3},l=stack.length;
						stack.push(p);
						while (l>2 && stack[l-2].type!==OP) {stack[l]=stack[l-1];l--;}
						stack[l]=p;
					}
					h=0;
					for (let j=0;j<stack.length;j++) {
						let p=stack[j];
						if (p.type===OP) {
							let min=p.val<3?1:2;
							let p1=stack[h-min],p2=stack[h-1];
							if (p1.type===CON && p2.type===CON) {
								let v1=p1.val,v2=p2.val;
								switch (p.val) {
									case 0 : break;
									case 1 : v1=-v1;break;
									case 2 : v1=Math.floor(v1);break;
									case 3 : v1+=v2;break;
									case 4 : v1-=v2;break;
									case 5 : v1*=v2;break;
									case 6 : v1%=v2;break;
									case 7 : v1/=v2;break;
									case 8 : v1=Math.pow(v1,v2);break;
									case 9 : v1=v1<v2?v1:v2;break;
									case 10: v1=v1>v2?v1:v2;break;
								}
								h-=min;
								p.type=CON;
								p.val=v1;
							}
						}
						stack[h++]=p;
					}
					paramarr[i]=stack.slice(0,h);
				}
				let param=paramarr;
				let iscon=paramcon;
				for (let i=0;i<params;i++) {
					iscon[i]=1;
					for (let p of param[i]) {iscon[i]&=p.type===CON;}
				}
				// Default arguments.
				let noff=(nid+1)<<PBITS;
				let size=params;
				let def=[],negp=-1;
				if (type===EXPR) {
					size=0;
					def=[0];
				} else if (type===ENV) {
					def=[0,0,0,1,0];
				} else if (type>=OSC0 && type<=OSC1) {
					def=[NaN,0,1,-1,0,0.5];
					negp=3;
					if (type===TBL) {
						if (!iscon[5]) {error("table points must be constants",s0-1);}
						let p=param[5],len=p.length;
						if (len<4) {error("table must have at least 2 points",s0-1);}
						if (len&1) {error("table must have an even number of values: "+len,s0-1);}
						for (let i=2;i<len;i+=2) {
							let j=i,x=p[j],y=p[j+1];
							while (j>0 && p[j-2].val>x.val) {p[j]=p[j-2];p[j+1]=p[j-1];j-=2;}
							p[j]=x;p[j+1]=y;
						}
						if (p[0].val!==0) {error("table must start at x=0",s0-1);}
						for (let i=1;i<len;i+=2) {p[i].val=p[i].val*0.5+0.5;}
						size+=len-1;
					}
				} else if (type===NOI) {
					// noise
					let rand=dpos+params;
					def=[1,-1,Math.imul(rand,0x7eccc553),Math.imul(rand,0x49e15d71)|1];
					negp=1;
				} else if (type===DEL) {
					// delay
					if (!param[0].length) {error("delay must have a time",s0-1);}
					if (!param[1].length && iscon[0]) {param[1].push({type:CON,val:param[0][0].val});}
					let max=(param[1].length===1 && iscon[1])?param[1][0].val:NaN;
					let len=Math.floor(sndfreq*max)+2;
					if (isNaN(len)) {error("max delay must be constant",s0-1);}
					def=[NaN,NaN,0,0];
					size+=len;
				} else if (type>=FIL0 && type<=FIL1) {
					size+=10;
					def=[NaN,1,1,NaN];
				} else {
					error("unknown known type: "+type,s0-1);
				}
				if (negp>0 && !param[negp].length && param[negp-1].length) {
					// set to -[h]
					let h=negp-1;
					if (iscon[h]) {param[negp].push({type:CON,val:-param[h][0].val});}
					else {param[negp].push({type:VAR,val:noff+2+h},{type:OP,val:1});}
					iscon[negp]=iscon[h];
				}
				for (let p=0;p<params;p++) {
					if (!param[p].length) {
						if (isNaN(def[p])) {error(node.params[p]+" must have a value",s0-1);}
						param[p].push({type:CON,val:def[p]});
					}
				}
				// Overallocate to fit our data.
				let resize=dpos+4+size;
				for (let p=0;p<params;p++) {resize+=!iscon[p]?param[p].length*2+2:0;}
				if (resize>resize || resize>VMASK) {
					error("not enough memory: "+resize,s0-1);
				}
				if (resize>di32.length) {
					let newlen=resize*2;
					let tmp=new Int32Array(newlen);
					for (let i=di32.length;i<newlen;i++) {tmp[i]=0;}
					tmp.set(di32);
					di32=tmp;
					df32=new Float32Array(di32.buffer);
				}
				// Fill inputs and fields.
				let dpos0=dpos++; // next
				dpos++; // in stop
				// Pack inputs if they're non contants.
				for (let p=0;p<params;p++) {
					if (iscon[p]) {continue;}
					let in0=dpos++,ppos=-1;
					for (let prm of param[p]) {
						let pt=prm.type;
						if (pt===OP) {
							let val=prm.val<<VBITS;
							if (ppos>=0) {di32[ppos]|=val;}
							else {di32[dpos++]=val;}
							ppos=-1;
						} else if (pt===CON) {
							ppos=dpos;
							di32[dpos++]=1;
							df32[dpos++]=prm.val;
						} else {
							ppos=dpos;
							di32[dpos++]=prm.val;
						}
					}
					di32[in0]=dpos; // src stop
					di32[dpos++]=p+1+(type!==EXPR); // dst
				}
				di32[dpos0+1]=dpos; // in stop
				di32[dpos++]=type; // type
				// Allocate state values and fill in constants.
				let dpos1=dpos+size+1;
				if (dpos1>resize || dpos1>VMASK) {
					error("out of bounds: "+dpos1+" > "+resize,s0-1);
				}
				for (let p=0;p<params;p++) {
					if (!iscon[p]) {continue;}
					let prm=param[p];
					let off=dpos+p+(type!==EXPR),len=prm.length;
					if (type===TBL && p===5) {
						for (let i=0;i<len;i++) {df32[off+i]=prm[i].val;}
					} else if ((type===DEL && p>2) || (type===NOI && p>2)) {
						di32[off]=prm[0].val;
					} else {
						df32[off]=prm[0].val;
					}
				}
				// Map names to addresses for ease of use.
				this.namemap[name]=dpos0;
				this.namemap[name+".type"]=dpos-1;
				this.namemap[name+".out"]=dpos;
				for (let p=0;p<params;p++) {
					let pstr=node.params[p];
					let off=dpos+p+(type!==EXPR);
					if (off===dpos) {pstr="out";}
					if (type>=OSC0 && type<=OSC1 && p===4) {pstr="acc";}
					if (type===ENV && p===4) {pstr="time";}
					if (type===NOI && p>1) {pstr=["acc","inc"][p-2];}
					if (type===DEL && p>2) {pstr=["pos","len"][p-3];}
					if (!pstr.trim()) {pstr="p"+p;}
					this.namemap[name+"."+pstr]=off;
				}
				dpos=dpos1;
				di32[dpos0]=dpos; // next
				node=null;
			}
			naddr[tval]=dpos;
			nid=tval;
			name=seqstr.substring(s0,s1);
		}
		// Find any undefined nodes.
		for (let i=0;i<nodes;i++) {
			let a=-naddr[i];
			if (a>0) {error("undefined node",a-1,ndecl[i]+1);}
		}
		// Convert node numbers to output addresses.
		let maxh=0;
		for (let d=0;d<dpos;) {
			let next=di32[d++],istop=di32[d++];
			while (d<istop) {
				let sstop=di32[d++];
				if (maxh<sstop-d) {maxh=sstop-d;}
				while (d<sstop) {
					let d0=d++,tmp=di32[d0];
					let op=tmp&~VMASK,src=(tmp&VMASK)>>>0;
					if (src>PMASK) {
						tmp=naddr[(src>>>PBITS)-1];
						src=(src&PMASK)+di32[tmp+1];
					} else if (src===1) {
						src=d++;
					}
					di32[d0]=op|src;
				}
				di32[d++]+=istop;
			}
			d=next;
		}
		// Resize to dpos + stack.
		di32=di32.slice(0,dpos);
		this.stack=new Float64Array(maxh);
		this.di32=di32;
		this.df32=new Float32Array(di32.buffer);
		this.orig=di32.slice();
	}


	// ----------------------------------------
	// Generator


	biquadcoefs(n,type,rate,bw,gain) {
		const LPF=10,HPF=11,BPF=12,NPF=13,APF=14,PKF=15,LSF=16,HSF=17;
		let b0=1,b1=0,b2=0;
		let a0=1,a1=0,a2=0;
		let v  =gain;
		let ang=2*Math.PI*rate;
		let sn =Math.sin(ang);
		let cs =Math.cos(ang);
		let q  =0.5/Math.sinh(Math.log(2)*0.5*bw*ang/sn);
		let a  =sn/(2*q);
		let vr =2*Math.sqrt(v)*a;
		if (type===LPF) {
			b1=(1-cs)*v;
			b2=0.5*b1;
			b0=b2;
			a0=1+a;
			a1=-2*cs;
			a2=1-a;
		} else if (type===HPF) {
			b1=(-1-cs)*v;
			b2=-0.5*b1;
			b0=b2;
			a0=1+a;
			a1=-2*cs;
			a2=1-a;
		} else if (type===BPF) {
			b1=0;
			b2=-a*v;
			b0=-b2;
			a0=1+a;
			a1=-2*cs;
			a2=1-a;
		} else if (type===NPF) {
			b1=-2*cs*v;
			b2=v;
			b0=v;
			a0=1+a;
			a1=-2*cs;
			a2=1-a;
		} else if (type===APF) {
			b1=-2*cs*v;
			b2=(1+a)*v;
			b0=(1-a)*v;
			a0=b2;
			a1=b1;
			a2=1-a;
		} else if (type===PKF) {
			b0=1+a*v;
			b1=-2*cs;
			b2=1-a*v;
			a0=1+a/v;
			a1=-2*cs;
			a2=1-a/v;
		} else if (type===LSF) {
			b0=v*((v+1)-(v-1)*cs+vr);
			b1=2*v*((v-1)-(v+1)*cs);
			b2=v*((v+1)-(v-1)*cs-vr);
			a0=(v+1)+(v-1)*cs+vr;
			a1=-2*((v-1)+(v+1)*cs);
			a2=(v+1)+(v-1)*cs-vr;
		} else if (type===HSF) {
			b0=v*((v+1)+(v-1)*cs+vr);
			b1=-2*v*((v-1)+(v+1)*cs);
			b2=v*((v+1)+(v-1)*cs-vr);
			a0=(v+1)-(v-1)*cs+vr;
			a1=2*((v-1)-(v+1)*cs);
			a2=(v+1)-(v-1)*cs-vr;
		} else {
			throw "Biquad type not recognized: "+type;
		}
		let df32=this.df32;
		df32[n+10]=b0/a0;
		df32[n+11]=b1/a0;
		df32[n+12]=b2/a0;
		df32[n+13]=a1/a0;
		df32[n+14]=a2/a0;
	}


	next() {
		let dst=[0];
		this.fill(dst);
		return dst[0];
	}


	fill(snd,fstart,flen) {
		// Fills a sound or array with the effect's output.
		let snddata=snd;
		let sndlen =snd.length;
		let sndfreq=44100;
		if (sndlen===undefined) {
			snddata=snd.data;
			sndlen =snd.len;
			sndfreq=snd.freq;
		}
		if (fstart===undefined) {fstart=0;}
		if (flen===undefined) {flen=sndlen;}
		if (fstart+flen<sndlen) {sndlen=fstart+flen;}
		let sndrate=1/sndfreq;
		const EXPR=0,ENV=1,TBL=2,TRI=3,PLS=4,SAW=5,SIN=6,SQR=7,NOI=8,DEL=9;
		const OSC0=2,OSC1=7,FIL0=10,FIL1=17;
		const VBITS=24,VMASK=(1<<VBITS)-1;
		for (let sndpos=fstart;sndpos<sndlen;sndpos++) {
			let di32=this.di32,df32=this.df32;
			let stack=this.stack;
			let n=0,nstop=di32.length;
			let out=0;
			// Loop through each node.
			while (n<nstop) {
				let next=di32[n++],istop=di32[n++];
				// Loop through each input.
				while (n<istop) {
					let sstop=di32[n++],s=0;
					// Loop through each source.
					// Process the RPN expression. Memory IO is expensive so try to minimize it.
					// The first element will always be [x], ~[x], or floor([x]).
					let tmp=di32[n++],op=tmp>>>VBITS,src=(tmp&VMASK)>>>0;
					n+=n===src;
					let val=df32[src];
					switch (op) {
						case 1: val=-val;break;
						case 2: val=Math.floor(val);break;
					}
					while (n<sstop) {
						tmp=di32[n++];op=tmp>>>VBITS;src=(tmp&VMASK)>>>0;
						let x=val;
						if (src) {n+=n===src;x=df32[src];if (op<3) {stack[s++]=val;}}
						else if (op>2) {val=stack[--s];}
						switch (op) {
							case 0 : val= x;break;
							case 1 : val=-x;break;
							case 2 : val=Math.floor(x);break;
							case 3 : val+=x;break;
							case 4 : val-=x;break;
							case 5 : val*=x;break;
							case 6 : val%=x;break;
							case 7 : val/=x;break;
							case 8 : val=Math.pow(val,x);break;
							case 9 : val=val<x?val:x;break;
							case 10: val=val>x?val:x;break;
						}
					}
					// Set a value in the node.
					df32[di32[n++]]=val;
				}
				let type=di32[n++];
				if (type===EXPR) {
					out=df32[n];
				} else if (type===ENV) {
					// Attack, sustain, release.
					let atk=df32[n+1];
					let sus=df32[n+2],s1=atk+sus;
					let rel=df32[n+3],r1=rel+s1;
					let t  =df32[n+5];
					out=df32[n+4];
					df32[n+5]=t+sndrate;
					// Want: e^decay=eps, a+b*e^(decay*0)=1, a+b*e^(decay*1)=0
					// eps=0.01, decay=ln(eps), b=1/(1-eps), a=1-b
					const decay=-4.605170186,b=1.010101010,a=-0.010101010;
					if      (t>=r1) {out=0;}
					else if (t>=s1) {out*=a+b*Math.exp(decay*(t-s1)/rel);}
					else if (t<atk) {out*=t/atk;}
				} else if (type>=OSC0 && type<=OSC1) {
					// Oscillators.
					let freq =df32[n+1];
					let phase=df32[n+2];
					let hi   =df32[n+3];
					let lo   =df32[n+4];
					let acc  =df32[n+5];
					let mod  =type!==TBL?1:df32[next-2];
					let u=(acc+phase)%mod;
					if (u<0) {u+=mod;}
					df32[n+5]=(acc+freq*sndrate)%mod;
					if      (type===TRI) {out=(u<0.5?u:1-u)*2;}
					else if (type===PLS) {out=u<df32[n+6]?0:1;}
					else if (type===SAW) {out=u;}
					else if (type===SIN) {out=Math.sin(u*(Math.PI*2))*0.5+0.5;}
					else if (type===SQR) {out=u<0.5?0:1;}
					else if (type===TBL) {
						// Binary search to find what points we're between.
						let l=n+6,h=next-4;
						while (l<h) {let m=l+(((h-l+2)>>>2)<<1);if (df32[m]>u) {h=m-2;} else {l=m;}}
						// Interpolate between the points.
						let x=df32[l],y=df32[l+1];
						out=y+(df32[l+3]-y)*((u-x)/(df32[l+2]-x));
					}
					out=out*(hi-lo)+lo;
				} else if (type===NOI) {
					// Noise.
					let hi =df32[n+1];
					let lo =df32[n+2];
					let inc=di32[n+4];
					let val=di32[n+3]+inc;
					di32[n+3]=val;
					val=Math.imul(val^(val>>>16),0xf8b7629f);
					val=Math.imul(val^(val>>> 8),0xcbc5c2b5);
					val=Math.imul(val^(val>>>24),0xf5a5bda5);
					out=((val>>>0)/4294967295)*(hi-lo)+lo;
				} else if (type===DEL) {
					// Delay.
					let del=df32[n+1];
					let max=df32[n+2];
					let sig=df32[n+3];
					let pos=di32[n+4];
					let len=next-n-5;
					if (++pos>=len) {pos=0;}
					// Allpass the delayed output.
					del=del<max?del:max;
					del=del>0?del*sndfreq:0;
					/*let i=del>>>0;
					let f=del-i;
					let ap=(1-f)/(1+f);
					i=pos-i;i=i<0?i+len:i;
					out=ap*(sig-df32[n])+df32[n+5+i];*/
					// Interpolate the delayed output.
					let i=del>>>0;
					let f=del-i;
					i=pos-i;i=i<0?i+len:i;
					let j=i-1+(i<1?len:0);
					out=df32[n+5+i]*(1-f)+df32[n+5+j]*f;
					// Add the latest input.
					di32[n+4]=pos;
					df32[n+5+pos]=sig;
				} else if (type>=FIL0 && type<=FIL1) {
					// Biquad filters.
					let freq=df32[n+1],bw=df32[n+2],gain=df32[n+3];
					if (df32[n+5]!==freq || df32[n+6]!==bw || df32[n+7]!==gain) {
						df32[n+5]=freq;df32[n+6]=bw;df32[n+7]=gain;
						this.biquadcoefs(n,type,freq/sndfreq,bw,gain);
					}
					// Process the input. Direct form 2 transposed.
					let x=df32[n+4];
					out=df32[n+10]*x+df32[n+8];
					df32[n+8]=df32[n+11]*x-df32[n+13]*out+df32[n+9];
					df32[n+9]=df32[n+12]*x-df32[n+14]*out;
				}
				out=isNaN(out)?0:out;
				df32[n]=out;
				n=next;
			}
			snddata[sndpos]=out;
		}
	}


	// ----------------------------------------
	// Default Sounds


	static deflib={
		"uiinc":"#vol: .05 #freq: 1500 #time: 0.1 #osc1: NOISE H .4 #osc2: TRI F #freq #bpf: BPF F #freq B .0012 #freq * I #osc1 #osc2 #out: ENV A .01 S #time .01 - .5 * R #time .01 - .5 * I #bpf #vol *",
		"uidec":"#vol: .05 #freq: 1000 #time: 0.1 #osc1: NOISE H .4 #osc2: TRI F #freq #bpf: BPF F #freq B .0012 #freq * I #osc1 #osc2 #out: ENV A .01 S #time .01 - .5 * R #time .01 - .5 * I #bpf #vol *",
		"uiconf":"#vol: .05 #freq: 4000 #time: 1.0 #osc1: NOISE H .4 #osc2: TRI F #freq #bpf: BPF F #freq B .0012 #freq * I #osc1 #osc2 #out: ENV A .01 R #time .01 - I #bpf #vol *",
		"uierr":"#vol: .1 #freq: 400 #time: 0.5 #osc1: NOISE H .4 #osc2: TRI F #freq #bpf: BPF F #freq B .0012 #freq * I #osc1 #osc2 #out: ENV A .01 R #time .01 - I #bpf #vol *",
		"uiclick":"#vol: .1 #freq: 180 #time: 0.1 #osc1: NOISE H .4 #osc2: TRI F #freq #bpf: BPF F #freq B .0012 #freq * I #osc1 #osc2 #out: ENV A .01 R #time .01 - I #bpf #vol *",
		"explosion1":"#vol: 5 #freq: 300 #time: 2 #u: #freq #freq 1000 + / #noi: NOISE #lpf: LPF F #freq B 1 G 1 #u - I #noi #bpf: BPF F #freq B 2 G #u I #noi #del: DEL T 0.15 #u * 0.75 + M 0.9 I 0.5 #u * 0.9 - #sig * #sig: #del #lpf #bpf #out: ENV A 0.01 R #time 0.01 - I #sig #vol *",
		"explosion2":"#vol: 9 #freq: 100 #time: 2 #u: #freq #freq 1000 + / #noi: NOISE #lpf: LPF F #freq B 1 G 1 #u - I #noi #bpf: BPF F #freq B 2 G #u I #noi #del: DEL T 0.15 #u * 0.75 + M 0.9 I 0.5 #u * 0.9 - #sig * #sig: #del #lpf #bpf #out: ENV A 0.01 R #time 0.01 - I #sig #vol *",
		"gunshot1":"#vol: 5 #freq: 500 #time: .25 #u: #freq #freq 1000 + / #noi: NOISE #lpf: LPF F #freq B 1 G 1 #u - I #noi #bpf: BPF F #freq B 2 G #u I #noi #del: DEL T 0.15 #u * 0.75 + M 0.9 I 0.5 #u * 0.9 - #sig * #sig: #del #lpf #bpf #out: ENV A 0.01 R #time 0.01 - I #sig #vol *",
		"gunshot2":"#vol: 1 #freq: 1000 #time: .25 #u: #freq #freq 1000 + / #noi: NOISE #lpf: LPF F #freq B 1 G 1 #u - I #noi #bpf: BPF F #freq B 2 G #u I #noi #del: DEL T 0.15 #u * 0.75 + M 0.9 I 0.5 #u * 0.9 - #sig * #sig: #del #lpf #bpf #out: ENV A 0.01 R #time 0.01 - I #sig #vol *",
		"missile1":"#noi1: NOISE H 1000 #noi2: #noi1 1 < -1 > #freq: TRI F 20 H 1000 L 100 #sigl: LPF F #freq I #noi2 B 1 #sigb: BPF F #freq I #noi2 B 2 #out: ENV A .015 R .985 I #sigl #sigb",
		"electricity":"#freq: 159 #saw0: SAW F #freq #saw1: SAW F #freq 1.002 * #sig: LPF F 3000 I #saw0 #saw1 + 0.5 < -0.5 > #out : ENV S 2 I #sig",
		"laser":"#vol: 1 #freq: 10000 #time: .25 #t: SAW F 1 #time / L 0 H #time #del1: DEL T #t .01 * M .5 I #sig -.35 * #del2: DEL T #t .10 * M .5 I #sig -.28 * #del3: DEL T #t .20 * M .5 I #sig -.21 * #del4: DEL T #t .60 * M .5 I #sig -.13 * #osc: SIN F #freq H 0.7 #sig: #osc #del1 #del2 #del3 #del4 #out: ENV A 0.01 R #time .01 - I #sig #vol *",
		"thud":"#vol: 10 #freq: 80 #time: .2 #noi: NOISE #bpf1: BPF F #freq B 2 I #noi #bpf2: BPF F #freq B 2 I #bpf1 #sig: #bpf2 #del #del: DEL T 0.003 I #bpf2 0.9 * #out: ENV R #time I #sig #vol *",
		"marble":"#vol: .05 #freq: 7000 #time: .02 #noi: NOISE #bpf1: BPF F #freq B 2 I #noi #bpf2: BPF F #freq B 2 I #bpf1 #sig: #bpf2 #del #del: DEL T 0.003 I #bpf2 0.9 * #out: ENV R #time I #sig #vol *"
	};


	static defload(name,vol,freq,time) {
		let str=AudioSFX.deflib[name];
		if (str===undefined) {throw "unknown effect: "+name;}
		let sfx=new AudioSFX(str);
		if (vol !==undefined) {sfx.setf("#vol.out" ,vol );}
		if (freq!==undefined) {sfx.setf("#freq.out",freq);}
		if (time!==undefined) {sfx.setf("#time.out",time);}
		return sfx;
	}


	static defsnd(name,vol,freq,time) {
		let sfx=AudioSFX.defload(name,vol,freq,time);
		let silence=Infinity;
		if (isNaN(time) || time<0) {time=NaN;silence=0.1;}
		return sfx.tosound(time,silence);
	}


	static defplay(name,vol,freq,time) {
		AudioSFX.defsnd(name,vol,freq,time).play();
	}

}


class AudioInstance {

	// We can only call start/stop once. In order to pause a buffer node, we need to
	// destroy and recreate the node.
	// src -> gain -> pan -> output


	constructor(snd,vol=1.0,pan=0.0,time=0,freq) {
		let audio=snd.audio;
		// Audio player link
		this.audio  =audio;
		this.audprev=null;
		let next=audio.queue;
		this.audnext=next;
		if (next!==null) {next.audprev=this;}
		audio.queue =this;
		// Sound link
		this.snd    =snd;
		this.sndprev=null;
		next=snd.queue;
		this.sndnext=next;
		if (next!==null) {next.sndprev=this;}
		snd.queue   =this;
		// Misc
		this.time   =time;
		this.volume =vol;
		this.pan    =pan;
		this.rate   =(freq??audio.freq)/audio.freq;
		this.playing=false;
		this.done   =false;
		this.muted  =audio.muted;
		// Nodes
		this.ctxgain=null;
		this.ctxpan=null;
		this.ctxsrc=null;
		this.start();
	}


	remove() {
		this.stop();
		if (this.done) {return;}
		this.done=true;
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
	}


	stop() {
		// Disconnect and record our time.
		if (this.done || !this.playing) {return;}
		this.playing=false;
		this.muted=this.audio.muted;
		let src=this.ctxsrc;
		if (src) {
			src.onended=undefined;
			try {src.stop();} catch {}
			src.disconnect();
			this.ctxsrc=null;
			this.ctxgain.disconnect();
			this.ctxgain=null;
			this.ctxpan.disconnect();
			this.ctxpan=null;
		}
		this.time+=performance.now()*0.001;
	}


	start() {
		// Audio nodes can't restart, so recreate the node.
		if (this.done || this.playing) {return;}
		this.muted=this.audio.muted;
		let rem=this.snd.time-this.time;
		if (rem<=0) {
			this.remove();
			return;
		}
		this.playing=true;
		if (!this.muted) {
			let ctx=this.audio.ctx;
			this.ctxpan=ctx.createStereoPanner();
			this.ctxpan.connect(ctx.destination);
			this.ctxgain=ctx.createGain();
			this.ctxgain.connect(this.ctxpan);
			this.setpan();
			this.setvolume();
			let src=ctx.createBufferSource();
			let st=this;
			src.onended=function(){st.remove();};
			src.buffer=this.snd.ctxbuf;
			src.connect(this.ctxgain);
			src.start(0,this.time,rem);
			this.ctxsrc=src;
		}
		this.time-=performance.now()*0.001;
	}


	setpan(pan) {
		// -1: 100% left channel
		//  0: 100% both channels
		// +1: 100% right channel
		if (pan<-1) {pan=-1;}
		else if (pan>1) {pan=1;}
		else if (isNaN(pan)) {pan=this.pan;}
		this.pan=pan;
		if (this.ctxpan) {
			this.ctxpan.pan.value=pan;
		}
	}


	setvolume(vol) {
		vol=isNaN(vol)?this.volume:vol;
		this.volume=vol;
		if (this.ctxgain) {
			vol*=this.audio.volume;
			this.ctxgain.gain.value=vol;
		}
	}


	gettime() {
		return this.time+(this.playing?performance.now()*0.001:0);
	}

}


export class Audio {

	static Sound=AudioSound;
	static SFX=AudioSFX;
	static Instance=AudioInstance;
	// The default context used for audio functions.
	static def=null;


	constructor(mute=0,volume=1,autoupdate=true,freq=44100) {
		this.freq=freq;
		this.queue=null;
		this.volume=volume;
		let ctx=new AudioContext({latencyHint:"interactive",sampleRate:freq});
		this.ctx=ctx;
		// 2 = Audio mute, 1 = browser mute
		this.muted=mute?2:0;
		this.mutefunc=function(){ctx.resume();};
		this.updatetime=NaN;
		if (!Audio.def) {Audio.initdef(this);}
		if (autoupdate) {
			let st=this;
			function update() {if (st.update()) {requestAnimationFrame(update);}}
			update();
		}
	}


	static initdef(def) {
		if (!def) {def=Audio.def;}
		if (!def) {def=new Audio();}
		Audio.def=def;
		return def;
	}


	setvolume(vol) {
		// Update the volume of all instances.
		if (this.volume===vol) {return;}
		this.volume=vol;
		let inst=this.queue;
		while (inst!==null) {
			inst.setvolume();
			inst=inst.audnext;
		}
	}


	play(snd,volume,pan,time,freq) {
		return new AudioInstance(snd,volume,pan,time,freq);
	}


	mute(val) {
		if (val!==undefined) {this.muted=(val?2:0)|(this.muted&1);}
		return (this.muted&2)?true:false;
	}


	update() {
		// Audio is silenced until a sound is played after user interaction.
		// https://html.spec.whatwg.org/#activation-triggering-input-event
		let muted=(this.muted&2)|(this.ctx.state!=="running");
		if ((muted^this.muted)&1) {
			let events=["keydown","mousedown","pointerdown","pointerup","touchend"];
			for (let evt of events) {
				if (muted&1) {document.addEventListener(evt,this.mutefunc);}
				else {document.removeEventListener(evt,this.mutefunc);}
			}
			this.muted=muted;
		}
		// Track time played while audio is suspended. Restart or remove sounds if needed.
		let inst=this.queue;
		while (inst!==null) {
			let next=inst.audnext;
			if ((muted || inst.muted) && inst.playing) {
				let time=inst.time;
				if (!inst.muted) {
					inst.stop();
					inst.time=time;
					inst.playing=true;
				}
				time+=performance.now()*0.001;
				if (time>inst.snd.time || !muted) {
					inst.playing=false;
					inst.time=time;
					inst.start();
				}
			}
			inst=next;
		}
		return true;
	}


	// ----------------------------------------
	// Sequencer


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
				nextsnd=new AudioSound(sndfreq);
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
				if      (type===0) {snd=Audio.createguitar(1,freq,0.2,ntime);}
				else if (type===1) {snd=Audio.createxylophone(1,freq,0.5,ntime);}
				else if (type===2) {snd=Audio.createmarimba(1,freq,0.5,ntime);}
				else if (type===3) {snd=Audio.createglockenspiel(1,freq,0.5,ntime);}
				else if (type===4) {snd=Audio.createmusicbox(1,freq,ntime);}
				else if (type===5) {snd=Audio.createdrumhihat(1,freq,ntime);}
				else if (type===6) {snd=Audio.createdrumkick(1,freq,ntime);}
				else if (type===7) {snd=Audio.createdrumsnare(1,freq,ntime);}
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
		let snd=new AudioSound(sndfreq,sndlen);
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
		return Audio.generatestring(volume,freq,pluck,0.000050,time,sndfreq);
	}


	static createxylophone(volume=1.0,freq=250,pos=0.5,time=2.2,sndfreq=44100) {
		// freq = constant / length^2
		return Audio.generatestring(volume,freq,pos,0.374520,time,sndfreq);
	}


	static createmarimba(volume=1.0,freq=250,pos=0.5,time=2.2,sndfreq=44100) {
		return Audio.generatestring(volume,freq,pos,0.947200,time,sndfreq);
	}


	static createglockenspiel(volume=0.2,freq=1867,pos=0.5,time=5.3,sndfreq=44100) {
		return Audio.generatestring(volume,freq,pos,0.090000,time,sndfreq);
	}


	static createmusicbox(volume=0.1,freq=877,time=3.0,sndfreq=44100) {
		return Audio.generatestring(volume,freq,0.40,0.050000,time,sndfreq);
	}


	// ----------------------------------------
	// Percussion Instruments


	static createdrumhihat(volume=0.2,freq=7000,time=0.1) {
		return (new AudioSFX(`
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
		return (new AudioSFX(`
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
		return (new AudioSFX(`
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
		return (new AudioSFX(`
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
		return (new AudioSFX(`
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
// Physics - v3.13


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


class PhyAtomInteraction {

	constructor(a,b) {
		this.world=a.world;
		this.worldlink=new PhyLink(this);
		this.world.intrlist.add(this.worldlink);
		this.a=a;
		this.b=b;
		this.pmul=0;
		this.vmul=0;
		this.vpmul=0;
		this.dt=NaN;
		this.push0=0;
		this.statictension=0;
		this.staticdist=0;
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


class PhyAtomType {

	constructor(world,id,damp,density,elasticity=1,push=1,statictension=50) {
		this.world=world;
		this.worldlink=new PhyLink(this);
		this.atomlist=new PhyList();
		this.id=id;
		this.intarr=[];
		this.damp=damp;
		this.density=density;
		this.pmul=push;
		this.vmul=elasticity;
		this.vpmul=1.0;
		this.statictension=statictension;
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
		let link=this.world.typelist.head;
		while (link!==null) {
			link.obj.intarr[id]=null;
			link=link.next;
		}
		this.atomlist.clear();
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
		let damp=this.damp,idamp=1.0-damp;
		let dt0=0,dt1=0,dt2=0;
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
		this.world.atomlist.addbefore(this.worldlink);
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
		if (this.deleted) {return;}
		this.deleted=true;
		let link=null;
		while ((link=this.bondlist.head)!==null) {
			link.obj.release();
		}
		this.typelink.remove();
		this.worldlink.remove();
	}


	bonditer() {return this.bondlist.iter();}


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


	update() {
		// Move the particle and apply damping to the velocity.
		// acc+=gravity
		// pos+=vel*dt1+acc*dt2
		// vel =vel*dt0+acc*dt1
		let world=this.world;
		let bndmin=world.bndmin;
		let bndmax=world.bndmax;
		let pe=this.pos,ve=this.vel;
		let dim=pe.length,type=this.type;
		let bound=type.bound;
		let ge=type.gravity;
		ge=(ge===null?this.world.gravity:ge);
		let dt0=type.dt0,dt1=type.dt1,dt2=type.dt2;
		let rad=this.rad,energy=0;
		for (let i=0;i<dim;i++) {
			let vel=ve[i],acc=ge[i];
			let pos=vel*dt1+acc*dt2+pe[i];
			vel=vel*dt0+acc*dt1;
			let b=bound?bndmin[i]+rad:-Infinity;
			if (pos<b) {pos=b;vel=vel<0?-vel:vel;}
			b=bound?bndmax[i]-rad:Infinity;
			if (pos>b) {pos=b;vel=vel>0?-vel:vel;}
			pe[i]=pos;
			ve[i]=vel;
			energy+=vel*vel;
		}
		this.sleeping=energy<1e-10;
	}


	static collide(a,b) {
		// Collides two atoms. Vector operations are unrolled to use constant memory.
		if (a===b || a.deleted || b.deleted) {return;}
		// Determine if the atoms are overlapping.
		let apos=a.pos,bpos=b.pos;
		let dim=apos.length;
		let dist=0.0,norm=a.world.tmpvec;
		for (let i=0;i<dim;i++) {
			let dif=bpos[i]-apos[i];
			norm[i]=dif;
			dist+=dif*dif;
		}
		let rad=a.rad+b.rad;
		if (dist>=rad*rad) {return;}
		// Bonds can limit the distance between the atoms.
		let b0=a,b1=b;
		if (a.bondlist.count>b.bondlist.count) {b0=b;b1=a;}
		let link=b0.bondlist.head;
		let bonded=null;
		while (link!==null) {
			let bond=link.obj;
			link=link.next;
			if (bond.a===b1 || bond.b===b1) {
				rad=rad<bond.dist?rad:bond.dist;
				bonded=bond;
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
		for (let i=0;i<dim;i++) {
			norm[i]*=den;
			veldif+=(avel[i]-bvel[i])*norm[i];
		}
		let posdif=rad-dist;
		// If we have a callback, allow it to handle the collision.
		let intr=a.type.intarr[b.type.id];
		let callback=a.world.collcallback;
		if (callback!==null && !callback(intr,a,b,norm,veldif,posdif,bonded)) {return;}
		posdif*=intr.push0;
		veldif=veldif>0?veldif:0;
		veldif=veldif*intr.vmul+posdif*intr.vpmul;
		// Create an electrostatic bond between the atoms.
		if (bonded===null && intr.statictension>0) {
			let bond=a.world.createbond(a,b,rad,intr.statictension);
			bond.breakdist=rad+(a.rad<b.rad?a.rad:b.rad)*intr.staticdist;
		}
		// Push the atoms apart.
		let aposmul=posdif*bmass,avelmul=veldif*bmass;
		let bposmul=posdif*amass,bvelmul=veldif*amass;
		for (let i=0;i<dim;i++) {
			let dif=norm[i];
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
		if (this.deleted) {return;}
		this.deleted=true;
		this.alink.remove();
		this.blink.remove();
		this.worldlink.remove();
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
		let dim=apos.length;
		let norm=a.world.tmpvec;
		let dist=0.0;
		for (let i=0;i<dim;i++) {
			let dif=bpos[i]-apos[i];
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
		for (let i=0;i<dim;i++) {
			let dif=norm[i];
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
		this.memi32=[];
		this.memf32=null;
	}


	release() {
		this.atomarr=null;
		this.atomcnt=0;
		this.memi32=[];
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
		let sortstart=nodesize*(atomcnt*2-1);
		let treesize=sortstart*2;
		let memi=this.memi32;
		if (memi.length<treesize) {
			memi=new Int32Array(treesize*2);
			this.memi32=memi;
			this.memf32=new Float32Array(memi.buffer);
			this.atomarr=new Array(atomcnt*2);
		}
		let memf=this.memf32;
		// Store atoms and their bounds. atom_id*2+sleeping.
		let leafstart=sortstart+atomcnt;
		let slack=1+this.slack;
		let leafidx=leafstart;
		let atomarr=this.atomarr;
		let atomlink=world.atomlist.head;
		for (let i=0;i<atomcnt;i++) {
			let atom=atomlink.obj;
			atomlink=atomlink.next;
			atomarr[i]=atom;
			memi[leafidx++]=(i<<1)|(atom.sleeping?1:0);
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

	constructor(dim) {
		this.dim=dim;
		this.maxsteptime=1/180;
		this.rnd=new Random();
		this.gravity=new Vector(dim);
		this.gravity[dim-1]=0.2;
		this.bndmin=(new Vector(dim)).set(-Infinity);
		this.bndmax=(new Vector(dim)).set( Infinity);
		this.typelist=new PhyList();
		this.intrlist=new PhyList();
		this.atomlist=new PhyList();
		this.bondlist=new PhyList();
		this.tmpmem=[];
		this.tmpvec=new Vector(dim);
		this.broad=new PhyBroadphase(this);
		this.stepcallback=null;
		this.collcallback=null;
		this.data={};
	}


	release() {
		this.atomlist.release();
		this.typelist.release();
		this.intrlist.release();
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


	createatomtype(damp,density,elasticity=1,push=1,statictension=50) {
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
		let type=new PhyAtomType(this,id,damp,density,elasticity,push,statictension);
		this.typelist.addbefore(type.worldlink,link);
		link=this.typelist.head;
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
		// Unrolled ops are 5x as fast.
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
		let dif=new Vector(dim);
		while (true) {
			// Get the distance to the nearest edge and determine if we're inside.
			let mindist=Infinity;
			let parity=0;
			for (let face of newface) {
				// dif=b-a, u=(pos-a)*dif/dif^2
				let a=face[0],b=face[1];
				let u=0,den=0,dist=0;
				for (let i=0;i<dim;i++) {
					let x=a[i],d=b[i]-x;
					dif[i]=d;
					den+=d*d;
					u+=(cellpos[i]-x)*d;
				}
				u=u>0?u:0;
				u=u<den?u/den:1;
				let eps=1e-10;
				let cy=cellpos[1]-a[1];
				if ((cy>=eps && cy<=dif[1]-eps) || (cy<=-eps && cy>=dif[1]+eps)) {
					let x=a[0]+cy*dif[0]/dif[1];
					parity^=x<cellpos[0]?1:0;
				}
				// dif=dif*u+a, dist=(dif-cellpos)^2
				for (let i=0;i<dim;i++) {
					let d=dif[i];
					dif[i]=d=d*u+a[i];
					d-=cellpos[i];
					dist+=d*d;
				}
				if (mindist>dist) {
					mindist=dist;
					let tmp=minpos;
					minpos=dif;
					dif=tmp;
					minbary[0]=u;
					minbary[1]=1-u;
				}
			}
			// If we're outside, clamp to the edge. Sort edges based on
			// barycenter to give vertices and edges better definition.
			mindist=Math.sqrt(mindist)*(parity && fill?-1:1);
			if (mindist<spacing) {
				if (mindist<0) {minpos.set(cellpos);}
				else {mindist=Math.max(1-minbary.sqr(),0);}
				cellarr.push({dist:mindist,pos:minpos.copy()});
			}
			// Advance to next cell. Skip gaps if we're far from a face.
			let skip=(fill===2 && mindist<0?-mindist:mindist)-spacing*2-iter;
			if (skip>0) {cellpos[0]+=(skip/iter|0)*iter;}
			let i=0;
			for (;i<dim;i++) {
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
		let cells=cellarr.length,atoms=0;
		let mincheck=-1;
		let atomarr=[];
		for (let c=0;c<cells;c++) {
			let cell=cellarr[c];
			cellpos=cell.pos;
			let celldist=cell.dist<0?cell.dist:0;
			let cellrad=fill===2 && celldist<0?spacing-celldist:minrad;
			// Find the largest radius we can fill.
			let atom=null;
			if (mincheck<0 && celldist>=0) {mincheck=atoms;fill=0;}
			let i=mincheck>0?mincheck:0,i0=i;
			for (;i<atoms;i++) {
				atom=atomarr[i];
				let rad=0,a=atom.pos;
				for (let j=0;j<dim;j++) {
					let d=cellpos[j]-a[j];
					rad+=d*d;
				}
				rad=Math.sqrt(rad);
				let cutoff=fill===2?subspace+atom.rad:spacing;
				if (rad<minrad || rad<cutoff) {break;}
				cellrad=cellrad<rad?cellrad:rad;
			}
			if (i>=atoms) {
				atom=this.createatom(cellpos,cellrad,mat);
				atom.data._filldist=celldist;
				// Bond before transforming.
				if (bonddist>0) {
					let bondmin=cellrad+bonddist;
					for (let b of atomarr) {
						let dist=b.pos.dist(cellpos);
						if (dist<bondmin+b.rad) {
							bondarr.push(this.createbond(atom,b,dist,bondtension));
						}
					}
				}
				atomarr.push(atom);
				atoms++;
			}
			// Move the rejection atom nearer to the front.
			i0+=(i-i0)>>1;
			atomarr[i ]=atomarr[i0];
			atomarr[i0]=atom;
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
			// Update types and interactions.
			let link=this.typelist.head;
			while (link!==null) {
				link.obj.updateconstants(dt);
				link=link.next;
			}
			link=this.intrlist.head;
			while (link!==null) {
				link.obj.calcdt(dt);
				link=link.next;
			}
			// Integrate atoms.
			let next=this.atomlist.head;
			while ((link=next)!==null) {
				next=next.next;
				link.obj.update();
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


const Phy={
	Intr:PhyAtomInteraction,
	AtomType:PhyAtomType,
	Atom:PhyAtom,
	Bond:PhyBond,
	Broadphase:PhyBroadphase,
	World:PhyWorld
};
export {Phy};


