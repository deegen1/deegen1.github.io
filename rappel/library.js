/*------------------------------------------------------------------------------


library.js - v17.60

Copyright 2026 Alec Dee - MIT license - SPDX: MIT
2dee.net - akdee144@gmail.com


--------------------------------------------------------------------------------
Versions


Env     - v1.02
Random  - v1.11
Data    - v1.00
Vector  - v3.09
Input   - v1.19
Drawing - v5.03
UI      - v1.02
Audio   - v3.11
Physics - v1.03


--------------------------------------------------------------------------------
Notes


import {Env,Random,Data,Vector,Matrix,Transform,
Input,UI,Draw,Audio,Phy} from "./library.js";


*/
/* npx eslint library.js -c ../../standards/eslint.js */


//---------------------------------------------------------------------------------
// Env - v1.02


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


function GetCSSRGBA(name) {
	// Ex: GetCSSRGBA("--code-comment")
	let style=getComputedStyle(document.body);
	let val=style.getPropertyValue(name);
	let arr=val.match(/\d+/g).map(Number);
	if (arr===null || arr.length!==4) {
		throw name+' = "'+val+'" not an RGBA value';
	}
	return arr;
}


const Env={
	IsVisible:IsVisible,
	GetCSSRGBA:GetCSSRGBA
};
export {Env};


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
		let hash=val^0xaaaaaaab;
		hash+=hash<<16;hash^=hash>>>12;
		hash+=hash<< 2;hash^=hash>>>11;
		hash+=hash<< 3;hash^=hash>>>10;
		hash+=hash<< 5;hash^=hash>>> 8;
		hash+=hash<<14;hash^=hash>>>11;
		return hash>>>0;
	}


	/*static hashu64(val) {
		let hash=val^0xaaaaaaaaaaaaaaab;
		hash+=hash<<27;hash^=hash>>>17;
		hash+=hash<<10;hash^=hash>>>19;
		hash+=hash<<12;hash^=hash>>> 6;
		hash+=hash<<10;hash^=hash>>>26;
		hash+=hash<<10;hash^=hash>>>13;
		hash+=hash<<19;hash^=hash>>>29;
		return hash>>>0;
	}*/


	getu32() {
		let hash=(this.acc+this.inc)>>>0;
		this.acc=hash;
		hash^=0xaaaaaaab;
		hash+=hash<<16;hash^=hash>>>12;
		hash+=hash<< 2;hash^=hash>>>11;
		hash+=hash<< 3;hash^=hash>>>10;
		hash+=hash<< 5;hash^=hash>>> 8;
		hash+=hash<<14;hash^=hash>>>11;
		return hash>>>0;
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
		// Returns a float in [-1,1].
		return (this.getu32()-2147483647.5)*(1.0/2147483647.5);
	}


	getnorm() {
		// Box-Muller transform.
		let r=this.getf();
		r=Math.sqrt(-2*Math.log(r>1e-99?r:1e-99));
		return Math.cos(6.283185307*this.getf())*r;
	}

}


//---------------------------------------------------------------------------------
// Data - v1.00


class TreeNode {

	constructor(value) {
		this.weight=1;
		this.parent=null;
		this.left=null;
		this.right=null;
		this.value=value;
	}


	next() {
		// Given a node N, find the next ordered node. Ex: next(3)=4.
		//
		//            4
		//           / \
		//          /   \
		//         2     6
		//        / \   / \
		//       1   3 5   7
		//
		// If N has a right child, R, the left-most child of R is the next node.
		// Otherwise, the nearest parent of N with N on the left is the next node.
		let node=this,child=this.right;
		if (child) {
			while (child) {node=child;child=child.left;}
		} else {
			while (node && Object.is(node.right,child)) {
				child=node;node=node.parent;
			}
		}
		return node;
	}


	prev() {
		// Given a node N, find the previous ordered node. Ex: prev(5)=4.
		//
		//            4
		//           / \
		//          /   \
		//         2     6
		//        / \   / \
		//       1   3 5   7
		//
		// If N has a left child, L, the right-most child of L is the next node.
		// Otherwise, the nearest parent of N with N on the right is the next node.
		let node=this,child=this.left;
		if (child) {
			while (child) {node=child;child=child.right;}
		} else {
			while (node && Object.is(node.left,child)) {
				child=node;node=node.parent;
			}
		}
		return node;
	}


	rotleft() {
		// Raise z, lower x, and maintain the sorted order of the nodes.
		//
		//        A                B
		//       / \              / \
		//      x   B     ->     A   z
		//         / \          / \
		//        y   z        x   y
		//
		let a=this;
		let b=a.right;
		let r=b.left;
		b.parent=a.parent;
		b.left=a;
		a.parent=b;
		a.right=r;
		if (r) {r.parent=a;}
		a.calcweight();
		b.calcweight();
		return b;
	}


	rotright() {
		// Raise x, lower z, and maintain the sorted order of the nodes.
		//
		//          A            B
		//         / \          / \
		//        B   z   ->   x   A
		//       / \              / \
		//      x   y            y   z
		//
		let a=this;
		let b=a.left;
		let l=b.right;
		b.parent=a.parent;
		b.right=a;
		a.parent=b;
		a.left=l;
		if (l) {l.parent=a;}
		a.calcweight();
		b.calcweight();
		return b;
	}


	calcweight() {
		let l=this.left,r=this.right,weight=1;
		if (l) {weight+=l.weight;}
		if (r) {weight+=r.weight;}
		this.weight=weight;
	}


	index() {
		// Returns the node's index within the tree. Ex: tree[node.index()]=node
		let idx=-1;
		let node=this,prev=this.right;
		while (node) {
			if (Object.is(node.right,prev)) {
				idx+=node.left?node.left.weight+1:1;
			}
			prev=node;
			node=node.parent;
		}
		return idx;
	}

}


class Tree {

	static Node=TreeNode;

	// Searching constants.
	static EQ=0;
	static EQG=1;
	static LT=2;
	static LE=3;
	static GT=4;
	static GE=5;

	// Duplicate behavior.
	static ADD    =0;
	static REPLACE=1;
	static DISCARD=2;


	static defcmp(l,r) {
		if (l<r) {return -1;}
		if (l>r) {return  1;}
		return 0;
	}


	constructor(cmp=Tree.defcmp,duplicate=Tree.ADD) {
		// cmp(l,r) is expected to be a function where
		//
		//      cmp(l,r)<0 if l<r
		//      cmp(l,r)=0 if l=r
		//      cmp(l,r)>0 if l>r
		//
		this.cmp=cmp;
		this.duplicate=duplicate;
		this.root=null;
	}


	clear() {this.root=null;}


	length() {
		// Return the number of nodes in the tree.
		return this.root?this.root.weight:0;
	}


	get(i) {
		// Index nodes like an array.
		let node=this.root;
		let weight=node?node.weight:0;
		if (i<0) {i+=weight;}
		if (i<0 || i>=weight) {return null;}
		while (true) {
			let left=node.left;
			let lw=left?left.weight:0;
			if (i>lw) {
				i-=lw+1;
				node=node.right;
			} else if (i===lw) {
				break;
			} else {
				node=left;
			}
		}
		return node;
	}


	*iter() {
		// Iterate over all nodes in ascending order.
		let node=this.first();
		while (node) {
			yield node;
			node=node.next();
		}
	}


	first() {
		// Return the smallest node in the tree.
		let node=this.root,ret=null;
		while (node) {ret=node;node=node.left;}
		return ret;
	}


	last() {
		// Return the greatest node in the tree.
		let node=this.root,ret=null;
		while (node) {ret=node;node=node.right;}
		return ret;
	}


	find(value,mode=Tree.EQ) {
		// Search for a specific value or inequality.
		//
		//      EQ : Return the least    node=value.
		//      EQG: Return the greatest node=value.
		//      LT : Return the greatest node<value.
		//      LE : Return the greatest node<=value.
		//      GT : Return the least    node>value.
		//      GE : Return the least    node>=value.
		//
		let node=this.root,ret=null;
		let cmp=this.cmp;
		let dup=this.duplicate;
		let lset  =[false,false,true ,true ,false,false][mode];
		let rset  =[false,false,false,false,true ,true ][mode];
		let eset  =[true ,true ,false,true ,false,true ][mode];
		let eright=[false,true ,false,true ,true ,false][mode];
		while (node) {
			let c=cmp(node.value,value);
			if (c<0) {
				if (lset) {ret=node;}
				node=node.right;
			} else if (c>0) {
				if (rset) {ret=node;}
				node=node.left;
			} else {
				if (eset) {
					ret=node;
					if (dup) {break;}
				}
				node=eright?node.right:node.left;
			}
		}
		return ret;
	}


	addnode(orig) {
		// Find a leaf node to add the new value to. Then rebalance from the new node on
		// up. By traversing right when cmp<=0, this algorithm is stable.
		let value=orig.value;
		let node=this.root,prev=null;
		let cmp=this.cmp;
		let dup=this.duplicate,c=0;
		while (node) {
			c=cmp(node.value,value);
			if (c===0 && dup) {
				if (dup===Tree.DISCARD) {return null;}
				node.value=value;
				return node;
			}
			prev=node;
			node=c>0?node.left:node.right;
		}
		orig.weight=1;
		orig.left=null;
		orig.right=null;
		orig.parent=prev;
		if (prev===null) {
			this.root=orig;
		} else {
			if (c>0) {prev.left=orig;}
			else     {prev.right=orig;}
			this.rebalance(prev);
		}
		return orig;
	}


	add(value) {
		return this.addnode(new TreeNode(value));
	}


	removenode(node) {
		// Remove a specific node. We can remove a node by swapping it with its successor
		// to maintain order and stability sorting-wise. Then, rebalance from the successor
		// on up.
		//
		//           Case 1          |          Case 2           |          Case 3
		//                           |                           |
		//   N is the right-most     |  X is a distant child of  |  X is the right child of
		//   child in the tree.      |  N. Balance from C up.    |  N. Balance from X up.
		//   Balance from D up.      |                           |
		//                           |                           |
		//     B              B      |    N              X       |     N              X
		//    / \            / \     |   / \            / \      |    / \            / \
		//   A   D     ->   A   D    |  A   C          A   C     |   A   X     ->   A   B
		//      / \            / \   |     / \    ->      / \    |      / \
		//     C   N          C   X  |    X   D          B   D   |     *   B
		//        / \                |   / \                     |
		//       X   *               |  *   B                    |
		//
		let p=node.parent;
		let l=node.left,r=node.right;
		let next=null,bal=null;
		if (r===null) {
			// Case 1
			bal=p;next=l;l=null;
		} else if (r.left) {
			// Case 2
			next=r;
			while (next.left) {bal=next;next=next.left;}
			let c=next.right;
			bal.left=c;
			if (c) {c.parent=bal;}
		} else {
			// Case 3
			bal=r;next=r;r=null;
		}
		// Replace node with next.
		if (p===null) {this.root=next;}
		else if (Object.is(p.left,node)) {p.left=next;}
		else {p.right=next;}
		if (next) {
			next.parent=p;
			if (l) {next.left=l;l.parent=next;}
			if (r) {next.right=r;r.parent=next;}
		}
		this.rebalance(bal);
	}


	remove(value) {
		// Remove a node given a value.
		let node=this.find(value);
		if (node) {this.removenode(node);}
		return node;
	}


	rebalance(next) {
		// Rebalance from next upward. If 2 children differ in weight by a ratio of 2.5 or
		// more, we can rotate to rebalance.
		function Weight(n) {return n?n.weight:0;}
		while (next) {
			let node=next,orig=next;
			next=node.parent;
			let l=node.left,r=node.right;
			let lw=Weight(l),rw=Weight(r);
			if (rw*5+2<lw*2) {
				// Leaning to the left.
				if (Weight(l.left)*5<lw*2) {node.left=l.rotleft();}
				node=node.rotright();
			} else if (lw*5+2<rw*2) {
				// Leaning to the right.
				if (Weight(r.right)*5<rw*2) {node.right=r.rotright();}
				node=node.rotleft();
			} else {
				// Balanced.
				node.weight=lw+rw+1;
				continue;
			}
			if (next===null) {this.root=node;}
			else if (Object.is(next.left,orig)) {next.left=node;}
			else {next.right=node;}
		}
	}

}


const Data={
	Tree:Tree,
};
export {Data};


//---------------------------------------------------------------------------------
// Vector - v3.09


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


	trans() {
		let rows=this.rows,cols=this.cols,elems=rows*cols;
		let ret=new Matrix(cols,rows);
		for (let i=0;i<elems;i++) {ret[i]=this[(i%rows)*cols+(~~(i/rows))];}
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
		// Accepts: Vector, Matrix, Transform, dim, {ang,dim,mat,scale,vec}
		// Parse what we're given.
		let mat=null,vec=null,dim=NaN;
		let scale=null,ang=null;
		if (params instanceof Transform) {
			mat=params.mat;
			vec=params.vec;
		} else if (params instanceof Matrix) {
			mat=params;
		} else if ((params instanceof Vector) || params.length!==undefined) {
			vec=params;
		} else if (!isNaN(params)) {
			dim=params;
		} else {
			// Pull attributes from a dict.
			const allow={"ang":1,"dim":1,"mat":1,"scale":1,"vec":1};
			for (let attr in params) {if (!allow[attr]) {throw "Unknown attr: "+attr;}}
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
			else if (scale!==null && scale.length) {dim=scale.length;}
		}
		if (isNaN(dim)) {throw "no dimension";}
		if (vec===null) {vec=new Vector(dim);}
		if (mat===null) {mat=(new Matrix(dim)).one();}
		if (vec.length!==dim) {throw `vec dimension: ${vec.length}, ${dim}`;}
		if (mat.rows!==dim || mat.cols!==dim) {throw `mat dimensions: (${mat.rows},${mat.cols}), ${dim}`;}
		this.mat=new Matrix(mat);
		this.vec=new Vector(vec);
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
// Drawing - v5.03


class DrawPath {

	static MOVE =0;
	static CLOSE=1;
	static LINE =2;
	static CURVE=3;
	static _traceline =new Float64Array(2);
	static _tracecurve=new Float64Array(6);


	constructor(str,trans) {
		// Copy static variables.
		this.vertarr=new Array();
		this.begin();
		if (str) {
			if (str instanceof DrawPath) {this.addpath(str,trans);}
			else {this.fromstring(str,trans);}
		}
	}


	begin() {
		this.vertidx=0;
		this.area=0;
		this.area0=0;
		this.curve=3;
		this.move=null;
		this.minx= Infinity;
		this.maxx=-Infinity;
		this.miny= Infinity;
		this.maxy=-Infinity;
		return this;
	}


	update() {
		// Recompute the bounding box.
		let varr=this.vertarr,vidx=this.vertidx;
		this.begin();
		for (let i=0;i<vidx;i++) {
			let v=varr[i];
			this.addvert(v.type,v.x,v.y);
		}
	}


	apply(trans) {
		if (!trans) {return;}
		trans=new Transform(trans);
		let varr=this.vertarr,vidx=this.vertidx;
		this.begin();
		for (let i=0;i<vidx;i++) {
			let v=varr[i];
			let w=trans.apply([v.x,v.y]);
			this.addvert(v.type,w);
		}
	}


	addvert(type,x,y) {
		let m=this.move;
		if (!m && type) {throw "first vert not move: "+type;}
		if (type===1) {x=m.x;y=m.y;this.move=null;}
		else if (y===undefined) {y=x[1];x=x[0];}
		// Add to array.
		let idx=this.vertidx++;
		let arr=this.vertarr;
		if (idx>=arr.length) {
			arr.push({type:0,x:0,y:0});
		}
		let v=arr[idx];
		v.type=type;
		v.x=x;
		v.y=y;
		// Update AABB.
		if (this.minx>x) {this.minx=x;}
		if (this.maxx<x) {this.maxx=x;}
		if (this.miny>y) {this.miny=y;}
		if (this.maxy<y) {this.maxy=y;}
		// Update area.
		let w=null;
		let area=this.area0;
		if (type<1) {
			area=this.area;
			this.move=v;
		} else if (type<3) {
			w=arr[idx-1];
		} else if (!--this.curve) {
			this.curve=3;
			w=arr[idx-1];let p2x=w.x-x,p2y=w.y-y;
			w=arr[idx-2];let p1x=w.x-x,p1y=w.y-y;
			w=arr[idx-3];let p0x=w.x-x,p0y=w.y-y;
			area+=(p0x*(2*p1y+p2y)+p1x*(p2y-2*p0y)-p2x*(p1y+p0y))*0.3;
		}
		if (w!==null) {
			area+=w.x*y-w.y*x;
			// Pretend to close the subpath.
			this.area=x*m.y-y*m.x+area;
		}
		this.area0=area;
		return v;
	}


	moveto(x,y) {
		// Move the pen to [x,y].
		this.addvert(DrawPath.MOVE,x,y);
		return this;
	}


	lineto(x,y) {
		// Draw a line from the last vertex to [x,y].
		// If no moveto() was ever called, behave as moveto().
		this.addvert(this.move?DrawPath.LINE:DrawPath.MOVE,x,y);
		return this;
	}


	curveto(x0,y0,x1,y1,x2,y2) {
		// Draw a cubic bezier curve.
		if (!this.move) {this.moveto(0,0);}
		this.addvert(DrawPath.CURVE,x0,y0);
		this.addvert(DrawPath.CURVE,x1,y1);
		this.addvert(DrawPath.CURVE,x2,y2);
		return this;
	}


	close() {
		// Draw a line from the current vertex to our last moveto() call.
		if (this.move) {this.addvert(DrawPath.CLOSE);}
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
		let varr=this.vertarr;
		for (let i=0;i<this.vertidx;i++) {
			let v=varr[i],t=v.type;
			ret+=(i?" ":"")+name[t];
			if (t!==DrawPath.CLOSE) {
				ret+=tostring(v.x)+" "+tostring(v.y);
			}
			if (t===DrawPath.CURVE) {
				v=varr[++i];
				ret+=" "+tostring(v.x)+" "+tostring(v.y);
				v=varr[++i];
				ret+=" "+tostring(v.x)+" "+tostring(v.y);
			}
		}
		return ret;
	}


	fromstring(str,trans) {
		// Parses an SVG path. Supports Z M L H V C.
		this.begin();
		let type=2,rel=0,len=str.length,i=0,c=0,move=0;
		let params=[0,48,48,16,32,63],v=[0,0,0,0,0,0,0,0];
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
			let p=params[type];
			for (let j=0;j<6;j++) {
				// Only parse floats if they're needed for this type. Format: \s*-?\d*(\.\d*)?
				let sign=1,mul=1,base=v[4+(j&1)],num=0;
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
			move=move?4:2;
			if      (type<1) {this.close();type=1;move=0;}
			else if (type<2) {this.moveto(v[4],v[5]);type=2;move=2;}
			else if (type<5) {this.lineto(v[4],v[5]);}
			else {this.curveto(v[0],v[1],v[2],v[3],v[4],v[5]);}
			v[4^move]=v[6^move];v[5^move]=v[7^move];
		}
		this.apply(trans);
	}


	addpath(path,trans) {
		trans=new Transform(trans?trans:{dim:2});
		let varr=path.vertarr,vidx=path.vertidx;
		for (let i=0;i<vidx;i++) {
			let v=varr[i];
			let w=trans.apply([v.x,v.y]);
			this.addvert(v.type,w);
		}
		return this;
	}


	addrect(x,y,w,h) {
		return this.moveto(x,y).lineto(x+w,y).lineto(x+w,y+h).lineto(x,y+h).close();
	}


	addarc(x,y,ang0,ang1,xrad,yrad,lineto=false) {
		// Circular arc approximation.
		yrad=yrad??xrad;
		let turn=ang1-ang0;
		turn=turn<0?-turn:turn;
		turn=turn<Math.PI*2?turn:Math.PI*2;
		// Control point length.
		let segs=~~(turn/(Math.PI/2));
		segs=segs<3?segs+1:4;
		turn=(ang1<ang0?-turn:turn)/segs;
		let ang2=turn*turn;
		let proj=turn*(0.333338514+ang2*(0.006927896+ang2*0.000152242));
		let px=proj*xrad,py=proj*yrad;
		let c1=Math.cos(ang0),x1=c1*xrad+x;c1*=py;
		let s1=Math.sin(ang0),y1=s1*yrad+y;s1*=px;
		if (lineto) {this.lineto(x1,y1);}
		for (let s=0;s<segs;s++) {
			ang0+=turn;
			let c0=c1;c1=Math.cos(ang0);
			let s0=s1;s1=Math.sin(ang0);
			let x0=x1;x1=c1*xrad+x;c1*=py;
			let y0=y1;y1=s1*yrad+y;s1*=px;
			this.curveto(x0-s0,y0+c0,x1+s1,y1-c1,x1,y1);
		}
		return this;
	}


	addoval(x,y,xrad,yrad) {
		return this.addarc(x,y,0,Math.PI*2,xrad,yrad,true).close();
	}


	tracerect(x,y,w,h,outrad,inrad) {
		let or=outrad??1;
		let ir=inrad??-outrad;
		this.addrect(x-or,y-or,w+or*2,h+or*2);
		return this.addrect(x+w+ir,y-ir,-w-ir*2,h+ir*2);
	}


	traceoval(x,y,xrad,yrad,outrad,inrad) {
		let or=outrad??1;
		let ir=inrad??-outrad;
		this.addoval(x,y,xrad+or,yrad+or);
		return this.addoval(x,y,-xrad-ir,yrad+ir);
	}


	addline(x0,y0,x1,y1,rad) {
		// Line with round ends.
		let dx=x1-x0,dy=y1-y0;
		let dist=dx*dx+dy*dy;
		if (dist<1e-10) {
			x1=x0;
			y1=y0;
			dx=rad;
			dy=0;
		} else {
			rad/=Math.sqrt(dist);
			dx*=rad;
			dy*=rad;
		}
		let c=1.315739738,cx=c*dx,cy=c*dy;
		this.moveto(x1+dy,y1-dx);
		this.curveto(x1+dy+cx,y1-dx+cy,x1-dy+cx,y1+dx+cy,x1-dy,y1+dx);
		this.lineto(x0-dy,y0+dx);
		this.curveto(x0-dy-cx,y0+dx-cy,x0+dy-cx,y0-dx-cy,x0+dy,y0-dx);
		return this.close();
	}


	trace(outrad,inrad) {
		// Path tracing.
		outrad=outrad??0.5;
		inrad=inrad??-outrad;
		let out=new Draw.Path();
		let scale=(this.maxx-this.minx+this.maxy-this.miny)/1000;
		if (!(scale>1e-10)) {return out;}
		let curvemaxdist2=0.03*scale*scale;
		let maxext=Math.abs(outrad-inrad)+1e-10;
		let lv=DrawPath._traceline,cv=DrawPath._tracecurve;
		let li=0;
		function AddSeg(x,y) {
			if (li>=lv.length) {
				let nv=new Float64Array(li*2);
				nv.set(lv);
				lv=nv;
				DrawPath._traceline=lv;
			}
			lv[li++]=x;
			lv[li++]=y;
		}
		let varr=this.vertarr;
		let vidx=this.vertidx;
		let area=this.area;
		inrad=-inrad;
		let p3x=0,p3y=0,closed=0;
		for (let i=0;i<=vidx;i++) {
			let v=varr[i<vidx?i:0];
			let type=v.type;
			if (type===DrawPath.CURVE) {v=varr[i+2];}
			let p0x=p3x;p3x=v.x;
			let p0y=p3y;p3y=v.y;
			if (type===DrawPath.MOVE) {
				// Remove overlapping points.
				if (li>2) {
					let x0=lv[0],y0=lv[1];
					let ni=2;
					for (let j=2;j<li;j+=2) {
						let x1=lv[j  ],dx=x1-x0;
						let y1=lv[j+1],dy=y1-y0;
						if (dx*dx+dy*dy>1e-10) {
							lv[ni++]=x1;x0=x1;
							lv[ni++]=y1;y0=y1;
						}
					}
					li=ni;
					if (closed) {
						x0=lv[0];y0=lv[1];
						while (li>2) {
							let dx=lv[li-2]-x0;
							let dy=lv[li-1]-y0;
							if (dx*dx+dy*dy>1e-10) {break;}
							li-=2;
						}
					}
				}
				if (li===2) {
					// Single point.
					out.addoval(lv[0],lv[1],outrad,area<0?-outrad:outrad);
				} else if (li>2) {
					// Trace around line segments.
					for (let side=0;side<2;side++) {
						let rad=(side>0)===(area<0)?inrad:outrad;
						let i0=2,i1=0;
						if (side!==closed) {i1=li-2;i0=i1-2;}
						let x0=lv[i0],y0=lv[i0+1];
						let x1=lv[i1],y1=lv[i1+1];
						let dx1=x1-x0,dy1=y1-y0;
						let mag=Math.sqrt(dx1*dx1+dy1*dy1);
						dx1/=mag;dy1/=mag;
						for (let j=closed?0:2;j<li;j+=2) {
							let k=side?li-2-j:j;
							let dx0=dx1,dy0=dy1;
							x0=x1;x1=lv[k  ];dx1=x1-x0;
							y0=y1;y1=lv[k+1];dy1=y1-y0;
							mag=Math.sqrt(dx1*dx1+dy1*dy1);
							dx1/=mag;dy1/=mag;
							// Calculate projection.
							let dot=dx0*dx1+dy0*dy1;
							let den=dx0*dy1-dy0*dx1;
							let u=dot>0?0:maxext;
							if (den<-1e-5 || den>1e-5) {u=(dot-1)*rad/den;}
							// Miter if we need to.
							if (u<=-maxext || u>=maxext) {
								u=u<0?-maxext:maxext;
								out.lineto(x0-dy0*rad+dx0*u,y0+dx0*rad+dy0*u);
							}
							out.lineto(x0-dy1*rad-dx1*u,y0+dx1*rad-dy1*u);
						}
						if (side || closed) {out.close();}
					}
				}
				closed=0;
				li=0;
			} else if (type===DrawPath.CURVE) {
				// Segment the curve.
				v=varr[i++];let p1x=v.x,p1y=v.y;
				v=varr[i++];let p2x=v.x,p2y=v.y;
				let ci=0;
				while (true) {
					// Test if both control points are close to the line p0->p3.
					// Clamp to ends and filter degenerates.
					let dx=p3x-p0x,dy=p3y-p0y,den=dx*dx+dy*dy;
					let lx=p1x-p0x,ly=p1y-p0y;
					let u=dx*lx+dy*ly;
					u=u>0?(u<den?u/den:1):0;
					lx-=dx*u;ly-=dy*u;
					let d1=lx*lx+ly*ly;
					lx=p2x-p0x;ly=p2y-p0y;
					u=dx*lx+dy*ly;
					u=u>0?(u<den?u/den:1):0;
					lx-=dx*u;ly-=dy*u;
					let d2=lx*lx+ly*ly;
					d1=(d1>d2 || !(d1===d1))?d1:d2;
					if (!(d1>curvemaxdist2 && d1<Infinity)) {
						// Commit the current segment.
						if (!ci) {break;}
						AddSeg(p3x,p3y);
						p0x=p3x;p1x=cv[--ci];p2x=cv[--ci];p3x=cv[--ci];
						p0y=p3y;p1y=cv[--ci];p2y=cv[--ci];p3y=cv[--ci];
						continue;
					}
					// Split the curve in half. [p0,p1,p2,p3] = [p0,l1,l2,ph] + [ph,r1,r2,p3]
					let t1x=(p1x+p2x)*0.5,t1y=(p1y+p2y)*0.5;
					let r2x=(p2x+p3x)*0.5,r2y=(p2y+p3y)*0.5;
					let r1x=(t1x+r2x)*0.5,r1y=(t1y+r2y)*0.5;
					if (ci>=cv.length) {
						let nv=new Float64Array(ci*2);
						nv.set(cv);
						cv=nv;
						DrawPath._tracecurve=cv;
					}
					cv[ci++]=p3y;cv[ci++]=r2y;cv[ci++]=r1y;
					cv[ci++]=p3x;cv[ci++]=r2x;cv[ci++]=r1x;
					p1x=(p0x+p1x)*0.5;p1y=(p0y+p1y)*0.5;
					p2x=(p1x+t1x)*0.5;p2y=(p1y+t1y)*0.5;
					p3x=(p2x+r1x)*0.5;p3y=(p2y+r1y)*0.5;
				}
			} else if (type===DrawPath.CLOSE) {
				closed=1;
			}
			AddSeg(p3x,p3y);
		}
		return out;
	}


	pointinside(point,trans) {
		// Test if a point is in a path.
		let vidx=this.vertidx;
		if (!vidx) {return false;}
		// Put the point in path-space.
		let [px,py]=point;
		if (trans) {
			if (!(trans instanceof Transform)) {trans=new Transform(trans);}
			let mat=trans.mat,vec=trans.vec;
			let det=mat[0]*mat[3]-mat[1]*mat[2];
			if (!(det<-1e-10 || det>1e-10)) {return false;}
			let tx=px-vec[0],ty=py-vec[1];
			px=(tx*mat[3]-ty*mat[1])/det;
			py=(ty*mat[0]-tx*mat[2])/det;
		}
		if (px<this.minx || px>this.maxx || py<this.miny || py>this.maxy) {return false;}
		let p3x=0,p3y=0,movex=0,movey=0;
		let parity=0;
		let varr=this.vertarr;
		let intr=[0,0,0];
		for (let i=0;i<=vidx;i++) {
			let v=varr[i<vidx?i:0];
			let p0x=p3x,p0y=p3y;
			p3x=v.x-px;
			p3y=v.y-py;
			let p1x=p3x,p1y=p3y;
			if (v.type!==DrawPath.CURVE) {
				if (v.type===DrawPath.MOVE) {
					// Close any unclosed subpaths.
					p1x=movex;movex=p3x;
					p1y=movey;movey=p3y;
				}
				// Line test.
				if ((p0y<0)!==(p1y<0)) {parity+=(p0y>p1y)-(p0x*p1y<p1x*p0y);}
				continue;
			}
			// Find all u where y(u)=py.
			v=varr[++i];let p2x=v.x-px,p2y=v.y-py;
			v=varr[++i];p3x=v.x-px;p3y=v.y-py;
			if (!(((p0y<0)+(p1y<0)+(p2y<0)+(p3y<0))&3)) {continue;}
			let q1x=3*(p1x-p0x),q2x=3*(p0x+p2x-2*p1x),q3x=p3x-p0x+3*(p1x-p2x);
			let q1y=3*(p1y-p0y),q2y=3*(p0y+p2y-2*p1y),q3y=p3y-p0y+3*(p1y-p2y);
			// 3 possible solutions between [0,1] and dy(u)=0.
			let r=1;
			let u0=1,y0=p3y,tmp=0;
			let disc=q2y*q2y-3*q3y*q1y;
			if (disc>=0) {
				disc=Math.sqrt(disc);
				let a=(-q2y-disc)/(3*q3y);
				let b=(-q2y+disc)/(3*q3y);
				if (a>b) {tmp=a;a=b;b=tmp;}
				if (a>0 && a<1) {intr[r++]=a;}
				if (b>0 && b<1) {intr[r++]=b;}
			}
			// Binary search for y(u)=py.
			while (r>0) {
				let h=u0,l=u0=intr[--r];
				let y1=y0;y0=p0y+u0*(q1y+u0*(q2y+u0*q3y));
				if ((y0<0)===(y1<0)) {continue;}
				if (y0>y1) {l=h;h=u0;}
				for (let j=0;j<32;j++) {
					let u=(l+h)*0.5,y=p0y+u*(q1y+u*(q2y+u*q3y));
					if (y<0) {l=u;} else {h=u;}
				}
				let x=p0x+l*(q1x+l*(q2x+l*q3x));
				if (x<0) {parity+=y0>y1?1:-1;}
			}
		}
		return parity && ((parity>0)===(this.area>0));
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
			} else if ((typeof img)==="string") {
				this.loadfile(img);
				width=height=0;
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


	loadfile(name) {
		let xml=new XMLHttpRequest();
		xml.open("GET",name,true);
		xml.responseType="arraybuffer";
		xml.onload=()=>{
			let buf=xml.response;
			if (buf) {this.fromtga(new Uint8Array(buf));}
			else {throw "can't open "+name;}
		};
		xml.send(null);
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
		if (w*h*bytes+18>len || src[2]!==2 || (bits!==24 && bits!==32)) {
			throw "TGA corrupt";
		}
		// Load the image data.
		this.resize(w,h);
		let dst=this.data8;
		let didx=0,dinc=0,sidx=18,a=255;
		if (!(src[17]&32)) {didx=(h-1)*w*4;dinc=-w*8;}
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
				dst[didx++]=src[sidx  ];
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
		! 553 M339 692c0-86-128-86-128 1 0 84 128 86 128-1ZM238 560h76L327 54H224Z
		" 553 M332 284h81L426 54H318Zm-191 0h81L235 54H127Z
		# 553 M173 106h72L228 268H354l17-162h73L426 268H532v64H420L403 504H506v64H397L378 748H305l19-180H199L180 748H107l19-180H21V504H132l18-172H46V268H156Zm49 226-17 172H330l18-172Z
		$ 553 M291 14h71l-13 95c41 4 70 9 100 16l-1 76c-33-9-57-13-108-20L312 395c281 74 217 350-47 351L248 864H177l16-117c-44-3-98-11-139-21l1-82c46 17 92 23 148 28l30-225C-44 375 37 107 278 109ZM268 184c-130-6-173 133-24 180Zm7 486c153 1 177-155 24-190Z
		% 553 M461 55l83-2L91 747l-81 1ZM18 198C18-2 282-5 282 189c0 199-264 207-264 9Zm72-2c0 112 119 112 119-2C209 76 90 82 90 196ZM271 614c0-203 265-205 265-12 0 202-265 205-265 12Zm72-4c-1 116 122 109 121-4-1-113-120-112-121 4Z
		& 553 M396 553c11-24 23-83 20-140h87c0 59-8 138-49 211l99 124H440l-44-54C309 786 28 796 28 573c0-121 90-168 122-190C35 263 69 68 257 68c194 0 226 240 12 325ZM227 340c149-64 116-200 29-200-103 0-110 122-29 200Zm-34 99C23 548 162 784 349 634Z
		' 553 M234 284h85L333 54H221Z
		( 553 M376 17C71 293 70 682 374 953l52-52C167 652 174 308 426 68Z
		) 553 M127 903c253-239 257-586 1-833l50-53c305 272 304 661-1 937Z
		* 553 M242 54h70L299 222l140-94 33 61-150 74 150 73-33 58-138-91 11 168H242l10-168-141 91-30-58 151-74L81 187l33-58 139 92Z
		+ 553 M235 244h84V443H512v75H319V718H234l1-200H41V443H234Z
		, 553 M117 916c286 1 284-326 151-326-51 0-68 40-68 65 0 50 46 57 46 110 0 68-85 86-129 84Z
		- 553 M130 441H423v80H130Z
		. 553 M354 677c0 103-162 109-162-1 0-110 162-109 162 1Z
		/ 553 M393 54h82L138 854H57Z
		0 553 M420 364c37 412-245 365-271 202ZM132 484C101 73 379 132 402 284ZM281 97C72 97 6 334 62 586c52 234 380 230 430-16 50-246-6-473-211-473Z
		1 553 M66 210l32 73 154-84V668H86v80H490V668H346V103H271Z
		2 553 M122 238c90-99 246-89 246 50 0 111-59 144-296 384v76H495V667H186L352 501c83-83 158-210 72-333-86-123-290-66-349 14Z
		3 553 M98 198C444 80 406 382 248 382H159v70h96c201 0 224 302-175 217v78c473 83 486-312 263-339C525 345 506 4 98 121Z
		4 553 M106 531 330 189V531Zm-85 0v75H330V748h88V606H527V531H418V106H295Z
		5 553 M99 106H445v75H179V361h77c357 0 282 479-169 387V670c364 90 373-236 163-236H99Z
		6 553 M151 464c97-58 263-78 263 89 0 178-290 214-263-89ZM453 106H388C173 106 60 225 60 471c0 211 89 286 218 286 337 0 300-552-128-367 5-158 111-209 230-209h73Z
		7 553 M57 106H491v80L223 748H125L404 185H57Z
		8 553 M280 97c272 0 239 257 77 315 203 77 191 345-86 345C-6 757 5 489 198 419 9 349 30 97 280 97Zm5 276c145-55 151-205-9-205-153 0-163 147 9 205Zm-15 85c-161 60-161 226 8 226 161 0 176-160-8-226Z
		9 553 M89 673h64c146 0 245-57 249-209C-30 648-58 97 272 97c155 0 220 120 220 292 0 258-128 359-350 359H88ZM400 392c31-300-261-273-261-91 0 174 174 141 261 91Z
		: 553 M351 322c0 99-150 99-150-1 0-97 150-101 150 1Zm0 360c0 100-150 99-149-1 1-100 149-98 149 1Z
		; 553 M351 321c0-98-149-100-149 1 0 98 149 100 149-1ZM123 916c286 1 283-326 152-326-55 0-69 43-69 65 0 51 46 56 46 112 0 69-97 86-129 81Z
		< 553 M398 205l53 55L183 479 451 702l-54 54L67 480Z
		= 553 M65 359H488v72H65Zm0 171H488v72H65Z
		> 553 M103 260 370 481 103 702l53 54L486 480 155 205Z
		? 553 M303 692c0-87-128-84-128 0 0 85 128 87 128 0ZM149 131c265-8 246 241 133 241H197l6 188h73l5-122C544 438 513 41 149 55Z
		@ 553 M421 291 379 585c-15 105 98 129 98-173 0-194-45-304-161-304C175 108 74 334 74 577c0 289 124 376 343 275v66C117 1025 5 871 5 574 5 271 140 48 318 48c141 0 228 103 228 353 0 445-243 310-227 248-28 86-181 119-181-67 0-207 89-330 223-275Zm-88 82C197 250 171 845 300 592Z
		A 553 M275 186 383 530H166Zm-57-80L5 748H96l45-141H408l45 141h95L338 106Z
		B 553 M165 453h94c210 0 178 221 27 221H165Zm0-273H277c152 0 144 200-12 200H165ZM78 106V748H250c321 0 302-321 117-341 135-19 189-301-90-301Z
		C 553 M489 128C288 47 45 118 45 438c0 260 162 374 443 291l1-82C167 760 138 534 138 426c0-117 52-335 351-216Z
		D 553 M141 672V180h79c171 0 205 107 205 249 0 161-73 243-217 243ZM54 106V748H192c153 0 325-57 325-327 0-152-46-315-298-315Z
		E 553 M464 106v74H186V378H453v74H186V673H464v75H99V106Z
		F 553 M463 106v75H190V389H449v73H190V748H101V106Z
		G 553 M494 215C248 103 124 246 124 424c0 73 5 311 287 243V462H280V390H497V719C178 836 31 664 31 433 31 247 159 12 494 128Z
		H 553 M412 106h87V748H412V453H142V748H55V106h87V377H412Z
		I 553 M84 106H469v74H321V673H469v75H84V673H232V180H84Z
		J 553 M98 182H342V552c0 164-159 144-252 80v88c120 67 341 53 341-174V106H98Z
		K 553 M77 106h87V405L399 106H503L250 411 514 748H404L164 433V748H77Z
		L 553 M114 106h89V673H484v75H114Z
		M 553 M24 748h83l14-534L240 539h61L426 200l18 548h85L498 106H391L273 424 159 106H56Z
		N 553 M58 106H171L414 624V106h81V748H381L140 230V748H58Z
		O 553 M277 174c165 0 179 233 141 385-39 156-238 164-278 16-50-185-13-401 137-401Zm9-77C52 97-2 349 42 569c50 250 408 260 470-19C548 388 530 97 286 97Z
		P 553 M165 443V179H268c193 0 186 264-2 264ZM78 106V748h87V518h89c311 0 340-412 17-412Z
		Q 553 M553 876c-89 82-314 75-323-123C32 734-9 465 57 259c66-206 383-234 449 8 54 198 7 457-194 486 19 136 172 101 201 61ZM276 680c159 0 180-232 145-379-40-168-251-178-290 17-24 120-24 362 145 362Z
		R 553 M171 392V180h97c148 0 150 212-18 212ZM83 106V748h88V462h34c106 0 97 51 213 286h98C399 506 389 464 328 441c179-24 217-335-61-335Z
		S 553 M448 117C182 51 62 160 62 273c0 204 336 165 336 309 0 146-274 93-344 68v86c330 69 436-44 436-161 0-206-336-171-336-309 0-104 147-110 294-72Z
		T 553 M42 106H511v75H321V748H232V181H42Z
		U 553 M54 106V561c0 275 446 259 446-16V106H413V542c0 199-272 176-272 24V106Z
		V 553 M101 106 279 663 458 106h93L333 748H215L2 106Z
		W 553 M104 106l33 554L245 323h61L423 657l30-551h78L488 748H374L273 454 176 748H66L22 106Z
		X 553 M130 106 276 347 425 106H525L328 416 541 748H430L275 488 118 748H9L222 420 26 106Z
		Y 553 M0 106 232 516V748h89V519L553 106H453L281 431 106 106Z
		Z 553 M64 106H492v68L164 667H498v81H55V682L384 185H64Z
		[ 553 M169 37H412v69H251V880H412v69H169Z
		\\ 553 M79 54h81L497 854H415Z
		] 553 M141 106H301V880H141v69H384V37H141Z
		^ 553 M60 420h77L271 173 412 420h86L309 106H239Z
		_ 553 M0 878H553v71H0Z
		\` 553 M243 173h85L209 54H85Z
		a 553 M386 524v88C151 820 66 524 268 524ZM107 354c202-75 279-21 279 60v45H267C-78 459 51 930 394 691l1 57h77V408c0-190-216-182-365-131Z
		b 553 M164 425c286-382 382 410 0 236ZM78 720c252 91 422-3 422-229 0-320-264-276-338-156l3-281H78Z
		c 553 M462 353C78 166 53 835 462 651v79C-73 912-37 95 462 272Z
		d 553 M386 568C112 974 2 172 386 342Zm0-309C134 207 53 369 53 509c0 317 258 290 339 144l4 95h76V54H386Z
		e 553 M147 529c2 222 257 147 322 137v69C126 817 57 661 57 500c0-350 494-341 433 29Zm259-66c13-191-249-208-258 0Z
		f 553 M516 60C271 13 198 110 198 244v83H39v71H198V748h87V398H501V327H285V242c0-125 83-141 231-108Z
		g 553 M513 255v70H437c90 166-70 318-271 240C49 764 511 552 511 798c0 52-43 156-244 156-303 0-233-204-151-241-45-18-88-97 1-189-94-97-29-325 225-269ZM269 522c142 0 144-212 1-212-142 0-143 212-1 212ZM191 735c-42 20-134 151 87 151 175 0 187-141 50-146Z
		h 553 M79 748h85V424c109-157 226-123 226 3V748h85V417c0-217-232-208-311-85V54H79Z
		i 553 M344 116c0 89-135 89-135 1 0-91 135-91 135-1ZM101 255H333V677H480v71H85V677H247V326H101Z
		j 553 M85 326H326V745c0 119-81 178-261 104v81c137 50 348 39 348-196V255H85ZM428 116c0-90-134-90-134 0 0 89 134 89 134 0Z
		k 553 M89 54h86V480L397 255H510L278 482 522 748H405L175 484V748H89Z
		l 553 M101 54H333V677H480v71H85V677H247V124H101Z
		m 553 M109 255l5 97c50-157 202-130 189 6 50-160 206-147 206 16V748H430V371c0-56-41-113-115 64V748H237V375c0-62-42-116-114 58V748H44V255Z
		n 553 M79 255V748h85V424c105-159 226-120 226-1V748h85V415c0-214-230-209-317-78l-3-82Z
		o 553 M275 319c157 0 165 188 127 283-46 115-211 107-252 1-41-106-18-284 125-284Zm8-73C40 246 6 515 77 652c71 137 309 146 393-1 72-126 61-405-187-405Z
		p 553 M155 255l5 85c70-126 340-170 340 149 0 277-234 284-336 253V949H78V255Zm9 406c382 174 286-618 0-236Z
		q 553 M386 568C111 975 4 170 386 341Zm11-303C244 218 53 265 53 521c0 283 241 290 335 138l-3 290h87V246Z
		r 553 M99 255V748h86V433c127-178 246-126 231 10h87c17-238-218-250-324-94l-2-94Z
		s 553 M437 261C175 206 96 309 96 386c0 176 285 128 285 233 0 75-125 82-292 41v78c214 49 380 5 380-128 0-170-286-122-286-229 0-61 88-83 254-44Z
		t 553 M254 97V255H476v72H254V574c0 114 89 125 222 94v75c-218 39-307-16-307-160V327H31V255H169V119Z
		u 553 M390 255h85V748H399l-4-83C318 792 79 808 79 590V255h85V581c0 118 119 158 226-2Z
		v 553 M423 255h94L324 748H226L32 255h98L277 653Z
		w 553 M451 255h84L464 748H360L274 498 190 748H90L18 255h84l50 410 92-287h62l99 281Z
		x 553 M153 255 282 445 410 255H516L330 502 523 748H410L276 560 145 748H34L226 501 43 255Z
		y 553 M32 255 230 749C174 861 131 888 29 872v79c121 5 224-3 320-255L517 255H424L281 653 130 255Z
		z 553 M87 255H462v66L188 676H478v72H81V686L359 327H87Z
		{ 553 M441 37H411C58 37 339 430 131 430H79v70h42c233 0-74 449 285 449h35V880H407c-234 0 16-394-215-415 224-34-16-359 220-359h29Z
		| 553 M236 0h81V949H236Z
		} 553 M112 37h29c357 0 66 393 292 393h41v70H422c-216 0 81 449-273 449H112V880h33c239 0-15-381 214-415-221-29 16-359-218-359H112Z
		~ 553 M442 406c5 98-55 139-145 37C192 324 26 372 33 551h79c-6-106 63-131 144-38 108 124 274 66 264-107Z
		█ 553 M0 0H553V1000H0Z
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
		let trans=new Transform({dim:2,scale:1/scale});
		while (idx<len) {
			idx++;
			let chr=token(32);
			if (chr.length<=0) {continue;}
			chr=special[chr]??chr.charCodeAt(0);
			let g={
				width:parseFloat(token(32))/scale,
				path :new DrawPath(token(10),trans)
			};
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
		let space=glyphs[32].width;
		for (let i=0;i<len;i++) {
			let c=str.charCodeAt(i);
			let g=glyphs[c];
			if (g===undefined) {
				xmax=xmax>xpos?xmax:xpos;
				if (c===8) {
					// backspace
					xpos-=space;
					xpos=xpos>0?xpos:0;
				} else if (c===9) {
					// tab
					let tab=space*5;
					xpos=((~~(xpos/tab))+1)*tab;
				} else if (c===10) {
					ypos+=lh;
					xpos=0;
				} else if (c===13) {
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
		// Use 1 instead of lineheight.
		if (len>0) {
			xmax=xmax>xpos?xmax:xpos;
			ypos+=1;
		}
		return {x:0,y:0,w:xmax*scale,h:ypos*scale};
	}

}


export class Draw {

	static Path=DrawPath;
	static Image=DrawImage;
	static Font=DrawFont;
	// The default context used for drawing functions.
	static def=null;


	constructor(imgw,imgh) {
		if (Draw.def===null) {Draw.def=this;}
		this.canvas   =null;
		this.ctx      =null;
		if (imgw instanceof HTMLCanvasElement) {
			let canv=imgw;
			imgw=canv.width;
			imgh=canv.height;
			this.screencanvas(canv);
		}
		// Image info
		this.img      =new DrawImage(imgw,imgh);
		this.rgba     =new Uint8ClampedArray([0,1,2,3]);
		this.rgba32   =new Uint32Array(this.rgba.buffer);
		this.rgbashift=[0,0,0,0];
		let col=this.rgba32[0];
		for (let i=0;i<32;i+=8) {this.rgbashift[(col>>>i)&255]=i;}
		this.rgba32[0]=0xffffffff;
		// State
		this.deffont  =new DrawFont();
		this.deftrans =new Transform(2);
		this.defpath  =new DrawPath();
		this.stack    =[];
		this.stackidx =0;
		// Rendering variables
		this.linewidth=1.0;
		this.tmptrans =new Transform(2);
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


	rgbatoint(r,g,b,a=255) {
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
				path :null,
				font :null
			};
			this.stack[this.stackidx-1]=mem;
		}
		mem.img =this.img;
		mem.rgba=this.rgba32[0];
		mem.trans.set(this.deftrans);
		mem.path=this.defpath;
		mem.font=this.deffont;
	}


	popstate() {
		if (this.stackidx<=0) {throw "loading null stack";}
		let mem=this.stack[--this.stackidx];
		this.img=mem.img;
		this.rgba32[0]=mem.rgba;
		this.deftrans.set(mem.trans);
		this.defpath=mem.path;
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


	drawimage(srcimg,offx,offy,trans) {
		// For a given destination pixel, use trans^-1 to project it onto the source and
		// use area calculations to average the color.
		// det(trans) = pixel area
		//
		//                 .
		//               .' '.
		//             .'     '.
		//  +--+      '.        '.
		//  |  |  ->    '.        '.
		//  +--+          '.       .'
		//                  '.   .'
		//                    '.'
		//
		if (trans===undefined) {trans=this.deftrans;}
		else if (!(trans instanceof Transform)) {trans=new Transform(trans);}
		let dstimg=this.img;
		let dstw=dstimg.width,dsth=dstimg.height;
		let srcw=srcimg.width,srch=srcimg.height;
		const rnd0=1e-6,rnd1=1-rnd0;
		// src->dst transformation.
		let matxx=trans.mat[0],matxy=trans.mat[1],matx=trans.vec[0]+offx;
		let matyx=trans.mat[2],matyy=trans.mat[3],maty=trans.vec[1]+offy;
		let det=matxx*matyy-matxy*matyx;
		let alpha=det*0.5*this.rgba[3]/(255*255);
		if (!(srcw*srch*(alpha>0?alpha:-alpha)>1e-8 && dstw && dsth)) {return;}
		// dst->src transformation.
		let invxx= matyy/det,invxy=-matxy/det,invx=-matx*invxx-maty*invxy;
		let invyx=-matyx/det,invyy= matxx/det,invy=-matx*invyx-maty*invyy;
		// Check if trans(src) and dst AABB overlap. Calculate y intercepts.
		matxx*=srcw;matxy*=srch;
		matyx*=srcw;matyy*=srch;
		let min=Infinity,max=-Infinity;
		let vx=matx,vy=maty;
		for (let i=1;i<16;i+=i) {
			let x0=vx,y0=vy;
			vx=((3&i)?matxx:0)+((6&i)?matxy:0)+matx;
			vy=((3&i)?matyx:0)+((6&i)?matyy:0)+maty;
			let x1=vx,y1=vy;
			if (x0>x1) {x1=x0;x0=vx;y1=y0;y0=vy;}
			if (!(x0<dstw && x1>=0)) {continue;}
			let dx=x1-x0,dy=y1-y0;
			y0+=x0<0?-(x0/dx)*dy:0;
			y1+=x1>dstw?((dstw-x1)/dx)*dy:0;
			if (y0>y1) {x0=y0;y0=y1;y1=x0;}
			min=min<y0?min:y0;
			max=max>y1?max:y1;
		}
		min+=rnd0;max+=rnd1;
		if (!(min<dsth && max>=1)) {return;}
		let dstminy=min>0?~~min:0;
		let dstmaxy=max<dsth?~~max:dsth;
		// Precompute pixel AABB offsets.
		let pixminx=(invxx<0?invxx:0)+(invxy<0?invxy:0);
		let pixminy=(invyx<0?invyx:0)+(invyy<0?invyy:0);
		let pixmaxy=(invyx>0?invyx:0)+(invyy>0?invyy:0);
		// Iterate over dst rows.
		let [rshift,gshift,bshift,ashift]=this.rgbashift;
		let dstdata=dstimg.data32;
		let srcdata=srcimg.data32;
		for (let dsty=dstminy;dsty<dstmaxy;dsty++) {
			// Calculate dst x bounds for the row.
			min=Infinity;max=-Infinity;
			vx=matx;vy=maty-dsty;
			for (let i=1;i<16;i+=i) {
				let x0=vx,y0=vy;
				vx=((3&i)?matxx:0)+((6&i)?matxy:0)+matx;
				vy=((3&i)?matyx:0)+((6&i)?matyy:0)+maty-dsty;
				let x1=vx,y1=vy;
				if (y0>y1) {x1=x0;x0=vx;y1=y0;y0=vy;}
				if (y0>=1 || y1<=0) {continue;}
				let dx=x1-x0,dy=y1-y0,dxy=dx/dy;
				let y0x=x0-y0*dxy,y1x=y0x+dxy;
				x0=y0>0?x0:y0x;
				x1=y1<1?x1:y1x;
				if (x0>x1) {y0=x0;x0=x1;x1=y0;}
				min=min<x0?min:x0;
				max=max>x1?max:x1;
			}
			min+=rnd0;max+=rnd1;
			let dstminx=min>0?~~min:0;
			let dstmaxx=max<dstw?~~max:dstw;
			let dstrow=dsty*dstw;
			for (let dstx=dstminx;dstx<dstmaxx;dstx++) {
				// Project the dst pixel to src and calculate AABB.
				let srcx0=dstx*invxx+dsty*invxy+invx;
				let srcy0=dstx*invyx+dsty*invyy+invy;
				min=srcx0+pixminx;let srcminx=min>0?~~min:0;
				min=srcy0+pixminy;let srcminy=min>0?~~min:0;
				max=srcy0+pixmaxy;let srcmaxy=max<srch?Math.ceil(max):srch;
				// Iterate over src rows.
				let sa=0,sr=0,sg=0,sb=0;
				let xr=invxx,xi=invxy;
				let yr=invyx,yi=invyy;
				for (let srcy=srcminy;srcy<srcmaxy;srcy++) {
					// Sum the src pixels.
					let srcrow=srcy*srcw;
					for (let srcx=srcminx;srcx<srcw;srcx++) {
						let sx=srcx0-srcx,sy=srcy0-srcy,area=0;
						min=srcw;max=-1;
						for (let i=0;i<4;i++) {
							// Calculate transformed pixel vertices.
							let sign=alpha;
							let dx=xr,dy=yr;
							let x0=sx,y0=sy;
							sx+=dx;xr=xi;xi=-dx;
							sy+=dy;yr=yi;yi=-dy;
							let x1=sx,y1=sy;
							if (y0>y1) {sign=-sign;x1=x0;x0=sx;y1=y0;y0=sy;}
							if (y0>=1 || y1<=0) {continue;}
							// Clip to unit row.
							let dxy=dx/dy;
							let y0x=x0-y0*dxy;
							if (y0<0) {y0=0;x0=y0x;}
							if (y1>1) {y1=1;x1=y0x+dxy;}
							if (x0>x1) {let tmp=x0;x0=x1;x1=tmp;dx=-dx;}
							min=min<x0?min:x0;
							max=max>x1?max:x1;
							// Calculate area to the right.
							if (x1<1) {
								// Vertical line or last pixel.
								let tmp=x1>0?-(x1*x1/dx)*dy*sign:0;
								let h=(y0-y1)*sign;
								tmp=x0>=0?(x0+x1)*h:tmp;
								area+=h+h-tmp;
							} else if (x0<1) {
								area-=((x0>0?(1-x0)*(1-x0):(1-2*x0))/dx)*dy*sign;
							}
						}
						// Skip pixels if we are too far left or right.
						if (max<=0) {break;}
						if (min>=1) {srcx+=(~~min)-1;continue;}
						// Scale pixel color by the area and premultiply alpha.
						let col=srcdata[srcrow+srcx];
						let smul=area*((col>>>ashift)&255);
						sr+=smul*((col>>>rshift)&255);
						sg+=smul*((col>>>gshift)&255);
						sb+=smul*((col>>>bshift)&255);
						sa+=smul;
						if (max<=1) {break;}
					}
				}
				// Blend with dst. Note alpha*det already averages the src colors.
				if (sa>1e-5) {
					// a = sa + da*(1-sa)
					// c = (sc*sa + dc*da*(1-sa)) / a
					sa=sa<1?sa:1;
					let pix=dstrow+dstx;
					let col=dstdata[pix];
					let dmul=(((col>>>ashift)&255)*0.003921569)*(1-sa);
					let a=sa+dmul,adiv=1.001/a;
					let da=a*255.255;
					let dr=(sr+dmul*((col>>>rshift)&255))*adiv;
					let dg=(sg+dmul*((col>>>gshift)&255))*adiv;
					let db=(sb+dmul*((col>>>bshift)&255))*adiv;
					dstdata[pix]=(da<<ashift)|(dr<<rshift)|(dg<<gshift)|(db<<bshift);
				}
			}
		}
	}


	// ----------------------------------------
	// Primitives


	begin() {return this.defpath.begin();}


	drawline(x0,y0,x1,y1,rad) {
		let w=rad??this.linewidth*0.5;
		this.begin().addline(x0,y0,x1,y1,w);
		this.fillpath();
	}


	fillrect(x,y,w,h) {
		this.begin().addrect(x,y,w,h);
		this.fillpath();
	}


	filloval(x,y,xrad,yrad) {
		yrad=yrad??xrad;
		this.begin().addoval(x,y,xrad,yrad);
		this.fillpath();
	}


	tracerect(x,y,w,h,outrad,inrad) {
		outrad=outrad??this.linewidth*0.5;
		this.begin().tracerect(x,y,w,h,outrad,inrad);
		this.fillpath();
	}


	traceoval(x,y,xrad,yrad,outrad,inrad) {
		outrad=outrad??this.linewidth*0.5;
		yrad=yrad??xrad;
		this.begin().traceoval(x,y,xrad,yrad,outrad,inrad);
		this.fillpath();
	}


	// ----------------------------------------
	// Text


	setfont(font) {this.deffont=font;}


	filltext(x,y,str,scale,halign=0,valign=0) {
		// Alignment: 0=left, 0.5=center, 1=right.
		let len=str.length;
		if (!len) {return;}
		let font=this.deffont,glyphs=font.glyphs;
		if (scale===undefined) {scale=font.defscale;}
		let xpos=0,ypos=0,lh=font.lineheight;
		let space=glyphs[32].width;
		let trans=this.tmptrans;
		trans.set(this.deftrans);
		if (halign!==0 || valign!==0) {
			let rect=font.textrect(str,1);
			halign=-rect.x-rect.w*halign;
			valign=-rect.y-rect.h*valign;
		}
		trans.scale(scale);
		for (let i=0;i<len;i++) {
			let c=str.charCodeAt(i);
			let g=glyphs[c];
			if (g===undefined) {
				if (c===8) {
					// backspace
					xpos-=space;
					xpos=xpos>0?xpos:0;
				} else if (c===9) {
					// tab
					let tab=space*5;
					xpos=((~~(xpos/tab))+1)*tab;
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
			trans.vec.set(trans.mat.mul([xpos+halign,ypos+valign])).iadd([x,y]);
			this.fillpath(g.path,trans);
			xpos+=g.width;
		}
	}


	textrect(str,scale) {
		return this.deffont.textrect(str,scale);
	}


	// ----------------------------------------
	// Path Filling


	fillextend() {
		// Declaring line objects this way allows engines to optimize their structs.
		this.tmpline.push({
			sort:0,
			x0:0,y0:0,
			x1:0,y1:0,
			x2:0,y2:0
		});
	}


	fillpath(path,trans) {
		// Fills the current path.
		//
		// Preprocess the lines and curves. Use a binary heap to dynamically sort lines.
		// Keep JS as simple as possible to be efficient. Keep micro optimization in WASM.
		// ~~x = fast floor(x)
		if (path===undefined) {path=this.defpath;}
		if (trans===undefined) {trans=this.deftrans;}
		else if (!(trans instanceof Transform)) {trans=new Transform(trans);}
		// Screenspace transformation.
		let matxx=trans.mat[0],matxy=trans.mat[1],matx=trans.vec[0];
		let matyx=trans.mat[2],matyy=trans.mat[3],maty=trans.vec[1];
		let det=(matxx*matyy-matxy*matyx)*path.area;
		const curvemaxdist2=0.02;
		let iw=this.img.width,ih=this.img.height;
		let alpha=this.rgba[3]/255.0;
		let amul=det<0?-alpha:alpha;
		if (path.vertidx<3 || iw<1 || ih<1 || det*amul<1e-6) {return;}
		// Check if trans(path) and image AABB overlap. Calculate y intercepts.
		let min=Infinity,max=-Infinity;
		let vx=0,vy=0;
		for (let i=0;i<5;i++) {
			let w=((i+1)&2)?path.maxx:path.minx;
			let h=((i  )&2)?path.maxy:path.miny;
			let x0=vx,y0=vy;
			vx=w*matxx+h*matxy+matx;
			vy=w*matyx+h*matyy+maty;
			let x1=vx,y1=vy;
			if (x0>x1) {x1=x0;x0=vx;y1=y0;y0=vy;}
			let dx=x1-x0,dy=y1-y0;
			if (!(dx>=0 && dy===dy)) {return;}
			if (!i || x0>=iw || x1<0) {continue;}
			y0+=x0<0?-(x0/dx)*dy:0;
			y1+=x1>iw?((iw-x1)/dx)*dy:0;
			if (y0>y1) {x0=y0;y0=y1;y1=x0;}
			min=min<y0?min:y0;
			max=max>y1?max:y1;
		}
		if (!(min<ih && max>0)) {return;}
		let pminy=min>0?~~min:0;
		let pmaxy=max<ih?Math.ceil(max):ih;
		// Loop through the path nodes.
		let lr=this.tmpline,lrcnt=lr.length,lcnt=0;
		let movex=0,movey=0;
		let p2x=0,p2y=0,p3x=0,p3y=0;
		let varr=path.vertarr;
		let vidx=path.vertidx;
		for (let i=0;i<=vidx;i++) {
			let v=varr[i<vidx?i:0];
			let type=v.type;
			let p0x=p3x,p0y=p3y;
			p3x=v.x*matxx+v.y*matxy+matx;
			p3y=v.x*matyx+v.y*matyy+maty;
			let p1x=p3x,p1y=p3y;
			// Add a basic line.
			if (lrcnt<=lcnt) {
				this.fillextend();
				lrcnt=lr.length;
			}
			let l=lr[lcnt++];
			if (type!==DrawPath.CURVE) {
				if (type===DrawPath.MOVE) {
					// Close any unclosed subpaths.
					p1x=movex;movex=p3x;
					p1y=movey;movey=p3y;
				}
				l.sort=0;
				l.x0=p0x;l.y0=p0y;
				l.x1=p1x;l.y1=p1y;
				if (p1y===p0y) {lcnt--;}
				continue;
			}
			// Linear decomposition of curves.
			v=varr[++i];p2x=v.x*matxx+v.y*matxy+matx;p2y=v.x*matyx+v.y*matyy+maty;
			v=varr[++i];p3x=v.x*matxx+v.y*matxy+matx;p3y=v.x*matyx+v.y*matyy+maty;
			let next=-1,next0=0;
			while (true) {
				// The curve will stay inside the bounding box of [p0,p1,p2,p3].
				// If the subcurve is outside the image, stop subdividing.
				if (next===next0) {
					l.sort=0;
					l.x0=p0x;l.y0=p0y;
					l.x1=p3x;l.y1=p3y;
					if (next<0) {break;}
					l=lr[next];
					next=l.sort;
					p0x=p3x;p1x=l.x0;p2x=l.x1;p3x=l.x2;
					p0y=p3y;p1y=l.y0;p2y=l.y1;p3y=l.y2;
				}
				next0=next;
				if ((p0x<=0 && p1x<=0 && p2x<=0 && p3x<=0) || (p0x>=iw && p1x>=iw && p2x>=iw && p3x>=iw) ||
				    (p0y<=0 && p1y<=0 && p2y<=0 && p3y<=0) || (p0y>=ih && p1y>=ih && p2y>=ih && p3y>=ih)) {
					continue;
				}
				// Test if both control points are close to the line p0->p3.
				// Clamp to ends and filter degenerates.
				let dx=p3x-p0x,dy=p3y-p0y,den=dx*dx+dy*dy;
				let lx=p1x-p0x,ly=p1y-p0y;
				let u=dx*lx+dy*ly;
				u=u>0?(u<den?u/den:1):0;
				lx-=dx*u;ly-=dy*u;
				let d1=lx*lx+ly*ly;
				lx=p2x-p0x;ly=p2y-p0y;
				u=dx*lx+dy*ly;
				u=u>0?(u<den?u/den:1):0;
				lx-=dx*u;ly-=dy*u;
				let d2=lx*lx+ly*ly;
				d1=(d1>d2 || !(d1===d1))?d1:d2;
				if (!(d1>curvemaxdist2 && d1<Infinity)) {continue;}
				// Split the curve in half. [p0,p1,p2,p3] = [p0,l1,l2,ph] + [ph,r1,r2,p3]
				if (lrcnt<=lcnt) {
					this.fillextend();
					lrcnt=lr.length;
				}
				let t1x=(p1x+p2x)*0.5,t1y=(p1y+p2y)*0.5;
				let r2x=(p2x+p3x)*0.5,r2y=(p2y+p3y)*0.5;
				let r1x=(t1x+r2x)*0.5,r1y=(t1y+r2y)*0.5;
				let n=lr[lcnt];
				n.sort=next;
				n.x0=r1x;n.x1=r2x;n.x2=p3x;
				n.y0=r1y;n.y1=r2y;n.y2=p3y;
				p1x=(p0x+p1x)*0.5;p1y=(p0y+p1y)*0.5;
				p2x=(p1x+t1x)*0.5;p2y=(p1y+t1y)*0.5;
				p3x=(p2x+r1x)*0.5;p3y=(p2y+r1y)*0.5;
				next=lcnt++;
			}
		}
		// Init blending.
		let ashift=this.rgbashift[3],amask=(255<<ashift)>>>0;
		let maskl=(0x00ff00ff&~amask)>>>0,maskh=(0xff00ff00&~amask)>>>0;
		let colrgb=(this.rgba32[0]|amask)>>>0;
		let coll=(colrgb&maskl)>>>0,colh=(colrgb&maskh)>>>0,colh8=colh>>>8;
		// Process the lines row by row.
		let p=0,pmax=pmaxy*iw,y=0;
		let pnext=pminy*iw,prow=0;
		let area=0,areadx1=0;
		let imgdata=this.img.data32;
		while (true) {
			if (p>=prow) {
				p=pnext;
				if (p>=pmax || lcnt<1) {break;}
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
				if (y0>y1) {
					sign=-sign;
					tmp=x0;x0=x1;x1=tmp;
					tmp=y0;y0=y1;y1=tmp;
				}
				// Calculate row and col.
				let sort=prow-iw,c0=p-sort,c1=c0+1;
				let r0=y0<ih?~~y0:ih;
				r0=y0>y?r0:y;
				let r1=r0+1,r2=r0+2;
				// Clamp y to row. Ensure consecutive rows use the same calculations.
				let dx=x1-x0,dy=y1-y0,nx=x1;
				if (dy>1) {
					// Large numbers.
					let dxy=dx/dy,y0x=x0-y0*dxy;
					if (y1>r2) {nx=y0x+r2*dxy;}
					if (y1>r1) {x1=y0x+r1*dxy;y1=r1;}
					if (y0<r0) {x0=y0x+r0*dxy;y0=r0;}
				} else {
					// Small numbers.
					if (y1>r2) {nx=x0-((y0-r2)/dy)*dx;}
					if (y1>r1) {x1=x0-((y0-r1)/dy)*dx;y1=r1;}
					if (y0<r0) {x0=x0-((y0-r0)/dy)*dx;y0=r0;}
				}
				nx=nx<x1?nx:x1;
				if (x0>x1) {dx=-dx;tmp=x0;x0=x1;x1=tmp;}
				dy*=sign;let dyx=dy/dx;dy*=0.5;
				if (!(y1>r0 && dyx!==0)) {
					// Above or degenerate.
					sort=pmax;
				} else if (x0>=c1 || r0>y) {
					// Below or to the left.
					nx=x0;
					sort=r0*iw;
				} else if (x1<=c1) {
					// Vertical line or last pixel.
					let t0=x1-c0,t1=x1-c1;
					tmp=x1>c0?-(t0*t0/dx)*dy:0;
					if (c0>1 && x0<c0-1) {
						areadx1+=dyx;
						area+=((x1>c0?t1*t1:-t0-t1)/dx)*dy;
					} else {
						dy=(y0-y1)*sign;
						tmp=x0>=c0?0.5*(x0-c0+t0)*dy:tmp;
						area+=dy-tmp;
					}
					areadx2+=tmp;
					sort+=y1<r1?pmax:iw;
				} else {
					// Spanning 2+ pixels.
					let t0=x0-c0,t1=x0-c1;
					tmp=((x0>c0?t1*t1:-t0-t1)/dx)*dy;
					area-=tmp;
					if (x1>=c0+2) {
						areadx1-=dyx;
						tmp=x0>c0?(t0*t0/dx)*dy:0;
					}
					areadx2+=tmp;
					nx=x1;
				}
				nx=nx<0?0:nx;
				sort+=nx<iw?~~nx:iw;
				sort=sort>p?sort:pmax;
				l.sort=sort;
				// Heap sort down.
				if (sort>=pmax) {
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
					// a = da + ( 1-da)*sa
					// c = dc + (sc-dc)*sa/a
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


	tracepath(path,trans,outrad,inrad) {
		outrad=outrad??this.linewidth*0.5;
		return this.fillpath(path.trace(outrad,inrad),trans);
	}

}


//---------------------------------------------------------------------------------
// UI - v1.02


export class UI {

	static VOLUME_PATH=new Draw.Path(`
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
		let typemap={"text":0,"path":1,"slider":2};
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
		let typemap={"text":0,"path":1,"slider":2};
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
				draw.fillpath(node.path,node.trans);
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


	addpath(path,trans) {
		let node=this.addnode("path",-Infinity,-Infinity,Infinity,Infinity);
		node.path=path;
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
// Audio - v3.11


class AudioSound {

	constructor(freq=44100,len=0) {
		// accepts len/path and frequency
		this.audio=Audio.initdef();
		this.freq=freq;
		this.loopstart=Infinity;
		this.loopend=0;
		this.looptime=Infinity;
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
		let j0=~~i;
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
		this.looptime=this.loopstart<this.time?Infinity:this.time;
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


	setloop(start=0,end) {
		this.loopstart=start;
		this.loopend=end??this.time;
		this.looptime=start<this.time?Infinity:this.time;
	}


	/*calctime(time) {
		// Returns the corrected time if the sound is looped.
		let start=this.loopstart;
		if (time>start) {
			let end=this.loopend;
			time=(time-start)%(end-start);
			time+=time<0?end:start;
			time=time>start?time:start;
			time=time<end?time:end;
		}
		return time;
	}*/


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
		time*=freq;
		silence*=freq;
		if (!(time>=0)) {throw `invalid time: ${time}`;}
		if (!(silence>=0)) {silence=time;}
		if (time>=Infinity && silence>=Infinity) {throw `infinite sfx`;}
		let snd=new AudioSound(freq,0);
		let genlen=Math.floor(0.1*freq)+1;
		let maxlen=time<0x3fffffff?Math.round(time):0x3fffffff;
		let sillen=silence<maxlen?Math.round(silence):maxlen;
		// Fill until max time or silence.
		const thres=1e-5;
		let sndlen=0,silpos=0;
		while (sndlen<maxlen && sndlen<silpos+sillen) {
			let pos=sndlen;
			sndlen+=genlen;
			if (sndlen>maxlen) {sndlen=maxlen;}
			snd.resizelen(sndlen);
			this.fill(snd,pos,sndlen-pos);
			let data=snd.data;
			while (pos<sndlen) {
				let x=data[pos++];
				if (x<-thres || x>thres) {silpos=pos;}
			}
		}
		snd.resizelen(silpos);
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
		let hash=1;
		function addhash(val) {
			hash+=val;
			hash=Math.imul(hash^(hash>>>17),0x7eccc553)>>>0;
			return hash;
		}
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
		// Hash the string to vary our noise.
		for (let i=0;i<seqlen;i++) {addhash(seqstr.charCodeAt(i));}
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
					def=[1,-1,addhash(3),addhash(5)|1];
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
		function fmod(x,mod) {
			x=(x<0 || x>=mod)?x%mod:x;
			return x<0?x+mod:x;
		}
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
					let u=fmod(acc+phase,mod);
					df32[n+5]=fmod(acc+freq*sndrate,mod);
					if      (type===TRI) {out=(u<0.5?u:1-u)*2;}
					else if (type===PLS) {out=u<df32[n+6]?0:1;}
					else if (type===SAW) {out=u;}
					else if (type===SIN) {out=Math.sin(u*6.283185307)*0.5+0.5;}
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
					val+=val<<16;val^=val>>>12;
					val+=val<< 2;val^=val>>>11;
					val+=val<< 3;val^=val>>>10;
					val+=val<< 5;val^=val>>> 8;
					val+=val<<14;val^=val>>>11;
					out=((val>>>0)/4294967295)*(hi-lo)+lo;
				} else if (type===DEL) {
					// Delay.
					let del=df32[n+1];
					let max=df32[n+2];
					let sig=df32[n+3];
					let pos=di32[n+4];
					let len=next-n-5;
					if (++pos>=len) {pos=0;}
					del=del<max?del:max;
					del=del>0?del*sndfreq:0;
					// Allpass the delayed output.
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
		"explosion1":"#vol: 5 #freq: 300 #time: 2 #u: #freq #freq 1000 + / #noi: NOISE #lpf: LPF F #freq B 1 G 1 #u - I #noi #bpf: BPF F #freq B 2 G #u I #noi #del: DEL T 0.15 #u * 0.75 + M 0.9 I 0.5 #u * 0.9 - #sig * #sig: #del #lpf #bpf #out: ENV A 0.01 R #time 0.01 - I #sig #vol *",
		"explosion2":"#vol: 9 #freq: 100 #time: 2 #u: #freq #freq 1000 + / #noi: NOISE #lpf: LPF F #freq B 1 G 1 #u - I #noi #bpf: BPF F #freq B 2 G #u I #noi #del: DEL T 0.15 #u * 0.75 + M 0.9 I 0.5 #u * 0.9 - #sig * #sig: #del #lpf #bpf #out: ENV A 0.01 R #time 0.01 - I #sig #vol *",
		"gunshot1":"#vol: 5 #freq: 500 #time: .25 #u: #freq #freq 1000 + / #noi: NOISE #lpf: LPF F #freq B 1 G 1 #u - I #noi #bpf: BPF F #freq B 2 G #u I #noi #del: DEL T 0.15 #u * 0.75 + M 0.9 I 0.5 #u * 0.9 - #sig * #sig: #del #lpf #bpf #out: ENV A 0.01 R #time 0.01 - I #sig #vol *",
		"gunshot2":"#vol: 1 #freq: 1000 #time: .25 #u: #freq #freq 1000 + / #noi: NOISE #lpf: LPF F #freq B 1 G 1 #u - I #noi #bpf: BPF F #freq B 2 G #u I #noi #del: DEL T 0.15 #u * 0.75 + M 0.9 I 0.5 #u * 0.9 - #sig * #sig: #del #lpf #bpf #out: ENV A 0.01 R #time 0.01 - I #sig #vol *",
		"missile1":"#noi1: NOISE H 1000 #noi2: #noi1 1 < -1 > #freq: TRI F 20 H 1000 L 100 #sigl: LPF F #freq I #noi2 B 1 #sigb: BPF F #freq I #noi2 B 2 #out: ENV A .015 R .985 I #sigl #sigb",
		"electricity":"#freq: 159 #saw0: SAW F #freq #saw1: SAW F #freq 1.002 * #sig: LPF F 3000 I #saw0 #saw1 + 0.5 < -0.5 > #out: ENV S 2 I #sig",
		"laser":"#vol: 1 #freq: 10000 #time: .25 #t: SAW F 1 #time / L 0 H #time #del1: DEL T #t .01 * M .5 I #sig -.35 * #del2: DEL T #t .10 * M .5 I #sig -.28 * #del3: DEL T #t .20 * M .5 I #sig -.21 * #del4: DEL T #t .60 * M .5 I #sig -.13 * #osc: SIN F #freq H 0.7 #sig: #osc #del1 #del2 #del3 #del4 #out: ENV A 0.01 R #time .01 - I #sig #vol *",
		"thud":"#vol: 10 #freq: 80 #time: .2 #noi: NOISE #bpf1: BPF F #freq B 2 I #noi #bpf2: BPF F #freq B 2 I #bpf1 #sig: #bpf2 #del #del: DEL T 0.003 I #bpf2 0.9 * #out: ENV R #time I #sig #vol *",
		"marble":"#vol: .05 #freq: 7000 #time: .02 #noi: NOISE #bpf1: BPF F #freq B 2 I #noi #bpf2: BPF F #freq B 2 I #bpf1 #sig: #bpf2 #del #del: DEL T 0.003 I #bpf2 0.9 * #out: ENV R #time I #sig #vol *",
		// UI
		"uiinc":"#vol: .05 #freq: 1500 #time: 0.1 #osc1: NOISE H .4 #osc2: TRI F #freq #bpf: BPF F #freq B .0012 #freq * I #osc1 #osc2 #out: ENV A .01 S #time .01 - .5 * R #time .01 - .5 * I #bpf #vol *",
		"uidec":"#vol: .05 #freq: 1000 #time: 0.1 #osc1: NOISE H .4 #osc2: TRI F #freq #bpf: BPF F #freq B .0012 #freq * I #osc1 #osc2 #out: ENV A .01 S #time .01 - .5 * R #time .01 - .5 * I #bpf #vol *",
		"uiconf":"#vol: .05 #freq: 4000 #time: 1.0 #osc1: NOISE H .4 #osc2: TRI F #freq #bpf: BPF F #freq B .0012 #freq * I #osc1 #osc2 #out: ENV A .01 R #time .01 - I #bpf #vol *",
		"uierr":"#vol: .1 #freq: 400 #time: 0.5 #osc1: NOISE H .4 #osc2: TRI F #freq #bpf: BPF F #freq B .0012 #freq * I #osc1 #osc2 #out: ENV A .01 R #time .01 - I #bpf #vol *",
		"uiclick":"#vol: .1 #freq: 180 #time: 0.1 #osc1: NOISE H .4 #osc2: TRI F #freq #bpf: BPF F #freq B .0012 #freq * I #osc1 #osc2 #out: ENV A .01 R #time .01 - I #bpf #vol *",
		// String
		"string":"#vol: 1 #freq: 82 #time: 3 #slide: 0.5 #rate: 1 #freq / #dec: 0.01 #rate #time / ^ #sig1: NOISE 3 #sig: ENV A 0 S #rate R 0 I #sig1 #val: #sig #del + #val - #slide * #val + #del: DEL M 0.1 T #rate I #val #dec * #out: ENV A 0.01 S #time 0.11 - R 0.1 I #val -1 > 1 < #vol *",
		"bell":"#vol: 1 #freq: 120 #time: 3 #sin1: SIN F #freq 1.00 * H 0.500 #env1: ENV R #time 1 / I #sin1 #sin2: SIN F #freq 2.25 * H 0.250 #env2: ENV R #time 2 / I #sin2 #sin3: SIN F #freq 3.93 * H 0.125 #env3: ENV R #time 3 / I #sin3 #sin4: SIN F #freq 8.89 * H 0.125 #env4: ENV R #time 4 / I #sin4 #out: #env1 #env2 + #env3 + #env4 + #vol *",
		// Percussion
		"hihat":"#vol: 0.2 #freq: 7000 #time: 0.1 #sig: NOISE H 0.7 #vol * #hpf: HPF F #freq I #sig #bpf: BPF F #freq 1.4 * I #sig #out: ENV A 0.005 R #time 0.005 - I #hpf #bpf",
		"kick" :"#vol: 0.3 #freq: 80 #time: 0.2 #f: SAW F 1 #time / L #freq H #freq .25 * #sig1: NOISE H 8 #sig2: TRI F #f H 1.8 #lpf: LPF F #f B 1.75 I #sig1 #sig2 #out: ENV A 0.005 R #time 0.005 - I #lpf #vol *",
		"snare":"#vol: 0.1 #freq: 200 #time: 0.2 #f: SAW F 1 #time / L #freq H #freq .5 * #sig1: NOISE H 1 #sig2: TRI F #f .5 * H 1 #hpf: HPF F #f I #sig1 #sig2 #lpf: LPF F 10000 I #hpf #out: ENV A 0.005 R #time 0.005 - I #lpf #vol *",
		// Wind
		"flute":"#vol: 1 #freq: 200 #time: 2.0 #noi: NOISE #nenv: ENV S #time .5 * I #noi #lpf: LPF F #freq B 2 I #nenv #sig: #del -.95 * #lpf #del: DEL T .5 #freq / M .2 I #sig #out: #sig",
		"tuba" :"#vol: 1 #freq: 300 #time: 2.0 #noi: NOISE #nenv: ENV R #time I #noi #lpf: LPF F #freq I #nenv #sig: #del .95 * #lpf #del: DEL T .02 M .2 I #sig #out: #sig"
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
		let silence=time??Infinity;
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


	constructor(snd,vol=1,pan=0,time=0) {
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
		let snd=this.snd;
		let time=this.time;
		let rem=snd.looptime-time;
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
			this.setvolume();
			this.setpan();
			let src=ctx.createBufferSource();
			let st=this;
			src.onended=function(){st.remove();};
			src.buffer=snd.ctxbuf;
			src.connect(this.ctxgain);
			if (rem<Infinity) {
				src.start(0,time,rem);
			} else {
				// loop the sound
				src.loopStart=snd.loopstart;
				src.loopEnd=snd.loopend;
				src.loop=true;
				src.start(0,time);
			}
			this.ctxsrc=src;
		}
		this.time-=performance.now()*0.001;
	}


	setvolume(vol) {
		vol=isNaN(vol)?this.volume:vol;
		this.volume=vol;
		if (this.ctxgain) {
			vol*=this.audio.volume;
			this.ctxgain.gain.value=vol;
		}
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
		let state=this;
		if (autoupdate) {
			function update() {if (state.update()) {requestAnimationFrame(update);}}
			update();
		}
		// Stop all sounds when exiting the page.
		// window.addEventListener("beforeUnload",()=>{state.release();});
	}


	static initdef(def) {
		if (!def) {def=Audio.def;}
		if (!def) {def=new Audio();}
		Audio.def=def;
		return def;
	}


	release() {
		// Stop and release all audio.
		this.mute(true);
		while (this.queue) {this.queue.remove();}
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


	play(snd,volume,pan,time) {
		return new AudioInstance(snd,volume,pan,time);
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
				if (time>inst.snd.looptime || !muted) {
					inst.playing=false;
					inst.time=time;
					inst.start();
				}
			}
			inst=next;
		}
		return true;
	}

}


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


