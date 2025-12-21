/*------------------------------------------------------------------------------


random.js - v1.11

Copyright 2024 Alec Dee - MIT license - SPDX: MIT
2dee.net - akdee144@gmail.com


--------------------------------------------------------------------------------
Notes


--------------------------------------------------------------------------------
History


1.04
     Added getstate().
1.06
     Moved setstate() to seed().
1.08
     Replaced erfinv table in getnorm() with equation.
1.09
     Went back to Box-Muller transform in getnorm().
1.10
     Renamed modu32() to mod.
     Added gets(), index section, and module export.
1.11
     Changed gets() range from [-1,1) to [-1,1].
     hashu32() and getu32() now only use ADD and XOR.


--------------------------------------------------------------------------------
TODO


Only use primitive operations in getnorm().
https://www.reddit.com/r/algorithms/comments/yyz59u/


*/
/* npx eslint random.js -c ../../standards/eslint.js */


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
