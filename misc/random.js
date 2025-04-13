/*------------------------------------------------------------------------------


random.js - v1.09

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


--------------------------------------------------------------------------------
TODO


Only use primitive operations in getnorm().
https://www.reddit.com/r/algorithms/comments/yyz59u/


*/
/* npx eslint random.js -c ../../standards/eslint.js */


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
