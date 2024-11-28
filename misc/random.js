/*------------------------------------------------------------------------------


random.js - v1.08

Copyright 2024 Alec Dee - MIT license - SPDX: MIT
deegen1.github.io - akdee144@gmail.com


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


--------------------------------------------------------------------------------
TODO


Only use primitive operations in getnorm().
Use https://github.com/stdlib-js/math-base-special-erfinv/blob/main/src/main.c


*/
/* jshint esversion: 11  */
/* jshint bitwise: false */
/* jshint eqeqeq: true   */
/* jshint curly: true    */


//---------------------------------------------------------------------------------
// Random - v1.08


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
		// Transform a uniform distribution to a normal one via sqrt(2)*erfinv(2*u-1).
		// erfinv credit: njuffa, https://stackoverflow.com/a/49743348
		let u=(this.getu32()-2147483647.5)*(1/2147483648);
		let t=Math.log(1-u*u),p;
		if (t<-6.125) {
			p=    4.294932181e-10;
			p=p*t+4.147083705e-8;
			p=p*t+1.727466590e-6;
			p=p*t+4.017907374e-5;
			p=p*t+5.565679449e-4;
			p=p*t+4.280807652e-3;
			p=p*t+6.833279087e-3;
			p=p*t-3.742661647e-1;
			p=p*t+1.187962704e+0;
		} else {
			p=    7.691594063e-9;
			p=p*t+2.026362239e-7;
			p=p*t+1.736297774e-6;
			p=p*t+1.597546919e-7;
			p=p*t-7.941244165e-5;
			p=p*t-2.088759943e-4;
			p=p*t+3.273461437e-3;
			p=p*t+1.631897530e-2;
			p=p*t-3.281194328e-1;
			p=p*t+1.253314090e+0;
		}
		return p*u;
	}

}
