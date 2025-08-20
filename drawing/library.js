/*------------------------------------------------------------------------------


library.js - v14.57

Copyright 2025 Alec Dee - MIT license - SPDX: MIT
2dee.net - akdee144@gmail.com


--------------------------------------------------------------------------------
Versions


Random  - v1.09
Vector  - v3.02
Input   - v1.16


*/
/* npx eslint library.js -c ../../standards/eslint.js */
/* global */


//---------------------------------------------------------------------------------
// Random - v1.09


class Random {

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


	modu32(mod) {
		// rand%mod is not converted to a signed int.
		let rand,rem,nmod=(-mod)>>>0;
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


	getnorm() {
		// Box-Muller transform.
		let r=this.getf();
		r=Math.sqrt(-2*Math.log(r>1e-99?r:1e-99));
		return Math.cos(6.283185307*this.getf())*r;
	}

}


//---------------------------------------------------------------------------------
// Vector - v3.02


class Vector extends Array {

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
		let u=this,len=this.length,sum=0,x;
		for (let i=0;i<len;i++) {x=u[i]-v[i];sum+=x*x;}
		return sum;
	}


	dist(v) {return Math.sqrt(this.dist2(v));}


	sqr() {
		// u*u
		let u=this,len=this.length,sum=0,x;
		for (let i=0;i<len;i++) {x=u[i];sum+=x*x;}
		return sum;
	}


	mag() {return Math.sqrt(this.sqr());}


	normalize() {
		let u=this,len=this.length,mag=0,i,x;
		for (i=0;i<len;i++) {
			x=u[i];
			mag+=x*x;
		}
		mag=mag>1e-10?1.0/Math.sqrt(mag):NaN;
		for (i=0;i<len;i++) {u[i]*=mag;}
		return this;
	}


	norm() {return this.copy().normalize();}


	randomize() {
		let u=this,len=this.length;
		if (!len) {return this;}
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


	static random(dim) {return (new Vector(dim)).randomize();}

}


class Matrix extends Array {

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
			let dval=i*cols,sval=dval,j;
			let inv=NaN;
			for (j=i;j<rows;j++) {
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
			let dval=i*cols,sval=dval,j;
			let inv=NaN;
			for (j=i;j<rows;j++) {
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


class Transform {

	// mat*point+vec


	constructor(params) {
		// Accepts: transform, mat, vec, dim, {mat,vec,dim,scale,ang}
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
			vec=params.vec??null;
			dim=params.dim??NaN;
			scale=params.scale??null;
			ang=params.ang??null;
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


	shift(vec) {
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
// Input - v1.16


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
		this.mousepos=[0,0];
		this.mouseraw=[0,0];
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
			state.clickpos=state.mousepos.slice();
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

