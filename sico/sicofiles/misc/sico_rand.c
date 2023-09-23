/*------------------------------------------------------------------------------


sico_rand.c - v1.00

Copyright 2022 Alec Dee - MIT license - SPDX: MIT
deegen1.github.io - akdee144@gmail.com


--------------------------------------------------------------------------------
Notes


C implementation of random.sico.


*/

#if defined(__GNUC__)
	#pragma GCC diagnostic error "-Wall"
	#pragma GCC diagnostic error "-Wextra"
	#pragma GCC diagnostic error "-Wpedantic"
	#pragma GCC diagnostic error "-Wformat=1"
	#pragma GCC diagnostic error "-Wconversion"
	#pragma GCC diagnostic error "-Wshadow"
	#pragma GCC diagnostic error "-Wundef"
	#pragma GCC diagnostic error "-Winit-self"
#elif defined(_MSC_VER)
	#pragma warning(push,4)
#endif

#define _CRT_SECURE_NO_WARNINGS
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <inttypes.h>

typedef uint32_t u32;
typedef uint64_t u64;
typedef unsigned char uchar;


//---------------------------------------------------------------------------------
// Declarations


struct SicoRand {
	u64 mod;
	u64 iters;
	u64 state;
	u64 inc;
	u64 con0;
	u64 con1;
	u64 con2;
	u64 con3;
};
typedef struct SicoRand SicoRand;


SicoRand* SicoRandCreate(u64 mod);
void     SicoRandFree(SicoRand* rnd);
void     SicoRandInit(SicoRand* rnd);
void     SicoRandSeed(SicoRand* rnd,u64 seed);
void     SicoRandJump(SicoRand* rnd,u64 num);
u64      SicoRandGet(SicoRand* rnd);
u64      SicoRandMod(SicoRand* rnd,u64 mod);
void     SicoRandShuffle(SicoRand* rnd,u64* arr,u64 len);


//---------------------------------------------------------------------------------
// Helper Functions


u32 SicoRandOp(u64* a,u64 b,u64 mod) {
	u64 v=*a;
	u32 gt=v>b;
	*a=v<b?(v-b+mod):(v-b);
	return gt;
}

u64 SicoRandAdd(u64 a,u64 b,u64 mod) {
	return (b==0 || a<mod-b)?(a+b):(a+b-mod);
}

u64 SicoRandNeg(u64 a,u64 mod) {
	return a?mod-a:0;
}


//---------------------------------------------------------------------------------
// PRNG


SicoRand* SicoRandCreate(u64 mod) {
	SicoRand* rnd=(SicoRand*)malloc(sizeof(SicoRand));
	rnd->mod=mod;
	SicoRandInit(rnd);
	return rnd;
}

void SicoRandFree(SicoRand* rnd) {
	if (rnd) {
		free(rnd);
	}
}

void SicoRandInit(SicoRand* rnd) {
	u64 mod=rnd->mod;
	u64 iters=0;
	while ((1ULL<<(iters*2))<mod) {
		iters++;
	}
	if (mod==0 || mod>=0x8000000000000000ULL) {
		iters=32;
	}
	rnd->iters=iters;
	rnd->state=0;
	rnd->inc=mod-1;
	rnd->con0=1;
	rnd->con1=0;
	rnd->con2=mod-1;
	rnd->con3=mod-2;
	u64 rem=mod%4;
	u64 tmp0,tmp1,tmp2,tmp3;
	for (u64 i=0;i<iters;i++) {
		if (rem==0) {
			tmp0=SicoRandGet(rnd);
			tmp0=SicoRandAdd(tmp0,tmp0,mod)  ;
			tmp0=SicoRandAdd(tmp0,tmp0,mod)+0;
			tmp1=SicoRandGet(rnd);
			tmp1=SicoRandAdd(tmp1,tmp1,mod)  ;
			tmp1=SicoRandAdd(tmp1,tmp1,mod)+2;
			tmp2=SicoRandGet(rnd);
			tmp2=SicoRandAdd(tmp2,tmp2,mod)  ;
			tmp2=SicoRandAdd(tmp2,tmp2,mod)+1;
			tmp3=SicoRandGet(rnd);
			tmp3=SicoRandAdd(tmp3,tmp3,mod)  ;
			tmp3=SicoRandAdd(tmp3,tmp3,mod)+3;
		} else if (rem==1) {
			tmp0=SicoRandGet(rnd);
			tmp1=SicoRandAdd(tmp0,mod-2,mod);
			tmp2=SicoRandAdd(tmp0,    3,mod);
			tmp3=SicoRandAdd(tmp0,mod-1,mod);
		} else if (rem==2) {
			tmp0=SicoRandGet(rnd);
			tmp0=SicoRandAdd(tmp0,tmp0,mod)+0;
			tmp3=tmp0;
			tmp1=SicoRandGet(rnd);
			tmp1=SicoRandAdd(tmp1,tmp1,mod)+1;
			tmp2=tmp1;
		} else {
			tmp0=SicoRandGet(rnd);
			tmp1=SicoRandAdd(tmp0,mod-2,mod);
			tmp2=SicoRandAdd(tmp0,    1,mod);
			tmp3=SicoRandAdd(tmp0,mod-3,mod);
		}
		rnd->con0=tmp0;
		rnd->con1=tmp1;
		rnd->con2=tmp2;
		rnd->con3=tmp3;
	}
}

void SicoRandSeed(SicoRand* rnd,u64 seed) {
	u64 mod=rnd->mod;
	rnd->state=seed;
	rnd->inc=mod-1;
	// Generate a random increment relatively prime to the modulus.
	// If gcd(num,-num)=1, then it's relatively prime.
	u64 inc;
	while (1) {
		inc=SicoRandGet(rnd);
		u64 a=inc,b=SicoRandNeg(inc,mod);
		while (b) {
			u64 tmp=a%b;
			a=b;
			b=tmp;
		}
		if (a==1) {break;}
	}
	rnd->inc=SicoRandNeg(inc,mod);
}

void SicoRandJump(SicoRand* rnd,u64 num) {
	rnd->state+=num*rnd->inc;
}

u64 SicoRandGet(SicoRand* rnd) {
	u64 mod=rnd->mod;
	SicoRandOp(&rnd->state,rnd->inc,mod);
	u64 hash=SicoRandNeg(rnd->state,mod);
	// Hash the state.
	for (u64 i=0;i<rnd->iters;i++) {
		u64 tmp=mod-1-hash;
		if (SicoRandOp(&hash,tmp,mod)) {
			tmp=SicoRandNeg(hash,mod);
			if (SicoRandOp(&hash,tmp,mod)) {
				SicoRandOp(&hash,rnd->con3,mod);
			} else {
				SicoRandOp(&hash,rnd->con2,mod);
			}
		} else {
			tmp=SicoRandNeg(hash,mod);
			if (SicoRandOp(&hash,tmp,mod)) {
				SicoRandOp(&hash,rnd->con1,mod);
			} else {
				SicoRandOp(&hash,rnd->con0,mod);
			}
		}
	}
	return SicoRandNeg(hash,mod);
}

u64 SicoRandMod(SicoRand* rnd,u64 mod) {
	// Rejection sampling. Accept if rand-rem<=-mod.
	u64 rand,rem,limit=rnd->mod-mod;
	do {
		rand=SicoRandGet(rnd);
		rem=rand%mod;
	} while (rand-rem>limit);
	return rem;
}

void SicoRandShuffle(SicoRand* rnd,u64* arr,u64 len) {
	// Fisher-Yates shuffling.
	for (u64 i=1;i<len;i++) {
		u64 j=SicoRandMod(rnd,i+1);
		u64 tmp=arr[i];
		arr[i]=arr[j];
		arr[j]=tmp;
	}
}


//---------------------------------------------------------------------------------
// Testing


u64 SicoRandTestHash(u64 hash,u64 num) {
	const u64 inc0=0x30d1f2bd3a4cc8aeULL;
	const u64 inc1=0xa377912103273f8bULL;
	hash-=num;
	if (hash&0x8000000000000000ULL) {
		hash=(hash<<1)-inc0+1;
	} else {
		hash=(hash<<1)-inc1+1;
	}
	return hash;
}

void SicoRandTests(void) {
	SicoRand* rnd=SicoRandCreate(0);
	u64 hash;
	// random.output.test
	SicoRandSeed(rnd,99);
	hash=0;
	for (u32 i=0;i<1000000;i++) {
		hash=SicoRandTestHash(hash,SicoRandGet(rnd));
	}
	printf("random.output.test: 0x%016llx\n",(unsigned long long)hash);
	// random.jump.test
	SicoRandSeed(rnd,100);
	hash=0;
	for (u32 i=0;i<10000;i++) {
		u64 seed=SicoRandGet(rnd);
		u64 jump=SicoRandGet(rnd);
		SicoRandSeed(rnd,seed);
		SicoRandJump(rnd,jump);
		hash=SicoRandTestHash(hash,SicoRandGet(rnd));
	}
	printf("random.jump.test: 0x%016llx\n",(unsigned long long)hash);
	// random.mod.test
	SicoRandSeed(rnd,101);
	hash=0;
	u64 mod=0;
	for (u32 i=0;i<100000;i++) {
		if (mod==0) {mod--;}
		mod=SicoRandMod(rnd,mod);
		hash=SicoRandTestHash(hash,mod);
	}
	printf("random.mod.test: 0x%016llx\n",(unsigned long long)hash);
	// random.shuffle.test
	SicoRandSeed(rnd,102);
	u64 arr[66]={0};
	u64 arrlen=(u64)(sizeof(arr)/sizeof(*arr));
	for (u64 i=0;i<arrlen;i++) {
		for (u64 j=0;j<64;j++) {
			arr[i]=SicoRandTestHash(arr[i],i);
		}
		// printf("0x%016llx ",(unsigned long long)arr[i]);
	}
	hash=0;
	for (u32 i=0;i<10000;i++) {
		u64 len=SicoRandMod(rnd,arrlen-1);
		u64 pos=SicoRandMod(rnd,arrlen-1-len);
		SicoRandShuffle(rnd,arr+pos+1,len);
		for (u32 j=0;j<arrlen;j++) {
			hash=SicoRandTestHash(hash,arr[j]);
		}
	}
	printf("random.shuffle.test: 0x%016llx\n",(unsigned long long)hash);
	SicoRandFree(rnd);
}

int main(void) {
	SicoRandTests();
	return 0;
}
