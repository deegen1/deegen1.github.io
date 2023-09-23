/*------------------------------------------------------------------------------


Multiplication Optimizer Experiments - v1.00

Copyright 2022 Alec Dee - MIT license - SPDX: MIT
deegen1.github.io - akdee144@gmail.com


--------------------------------------------------------------------------------
About


Tests all combinations of unsigned integer functions for specific mods.

We use C++ instead of C to allow multiline comments: R"()".


--------------------------------------------------------------------------------
Notes


TODO:
Get uint.mul to the same speed as uint.div.
Unroll branches to see if additions to hval cancel eachother out

if (!SicoOp(&fib1,fib0,mod)) {break;}
if (SicoOp(&lval0,lval1,mod)) {
	if (SicoOp(&nb,fib0,mod)) {
		if (SicoOp(&lval0,na,mod)) {
			// hval
		} else {
			// hval
		}
		SicoOp(&nfib0,nfib1,mod);
	} else {
		// hval
		SicoOp(&nb   ,nfib0,mod);
		SicoOp(&nfib0,nfib1,mod);
	}
} else {
	if (SicoOp(&nb,fib0,mod)) {
		if (SicoOp(&lval0,na,mod)) {
			// hval
		} else {
			// hval
		}
		SicoOp(&nfib0,nfib1,mod);
	} else {
		// hval
		SicoOp(&nb   ,nfib0,mod);
		SicoOp(&nfib0,nfib1,mod);
	}
}


Compiling:
rm mul_opt ; gcc -O3 mul_opt.c -o mul_opt -lm -lpthread ; ./mul_opt
-fsanitize=address -fsanitize=undefined


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
#include <time.h>
#include <math.h>
#include <assert.h>
#ifdef _MSC_VER
	#include <windows.h>
	#define nanosleep(req,rem)\
		Sleep((DWORD)((req)->tv_sec*1000+(req)->tv_nsec/1000000))
	#define thread_local __declspec(thread)
	#define thrd_t       DWORD
	#define thrd_yield   SwitchToThread
	#define thrd_current GetCurrentThreadId
	void thrd_create(thrd_t* id,int (*func)(void*),void* arg) {
		CreateThread(0,0,(LPTHREAD_START_ROUTINE)func,arg,0,id);
	}
	uint64_t atomic_fetch_add(volatile uint64_t* mem,uint64_t add) {
		return InterlockedExchangeAdd64((volatile LONG64*)mem,(LONG64)add);
	}
#else
	#include <threads.h>
	#include <stdatomic.h>
#endif

typedef unsigned char u8;
typedef uint32_t u32;
typedef  int32_t s32;
typedef uint64_t u64;
typedef  int64_t s64;
typedef   double f64;


//---------------------------------------------------------------------------------
// PRNG


u64 rngstate=1;

u64 SicoHashu64(u64 hash) {
	hash^=0x0add415f39769dbfULL;
	hash+=hash<<21;hash^=hash>>44;
	hash+=hash<<18;hash^=hash>>30;
	hash+=hash<<25;hash^=hash>>33;
	hash+=hash<<40;hash^=hash>> 5;
	hash+=hash<<10;hash^=hash>>16;
	return hash;
}

u64 SicoRandu64(void) {
	rngstate+=0x9464b849fa901cd9ULL;
	return SicoHashu64(rngstate);
}

u32 SicoRandu32(void) {
	return (u32)SicoRandu64();
}

void SicoRandShuffle(u64* arr,u64 len,u32 fill) {
	for (u64 i=0;i<len;i++) {
		u64 j=SicoRandu64()%(i+1);
		u64 val=fill?i:arr[i];
		arr[i]=arr[j];
		arr[j]=val;
	}
}


//---------------------------------------------------------------------------------
// Modulo Functions


#define SICO(A,B,JMP) {      \
	int CZ=A<=B;           \
	A=A<B?(A-B+mod):(A-B); \
	if (CZ) {JMP;}         \
}

u32 SicoOp(u64* a,u64 b,u64 mod) {
	u64 av=*a;
	assert(mod==0 || (av<mod && b<mod));
	if (av>b) {
		*a=av-b;
		return 1;
	} else if (av==b) {
		*a=0;
	} else {
		*a=av-b+mod;
	}
	return 0;
}

u64 SicoNeg(u64 a,u64 mod) {
	assert(mod==0 || a<mod);
	return a?mod-a:0;
}

u64 SicoAdd(u64 a,u64 b,u64 mod) {
	assert(mod==0 || (a<mod && b<mod));
	return (b && a>=mod-b)?(a+b-mod):(a+b);
}

u64 SicoSub(u64 a,u64 b,u64 mod) {
	assert(mod==0 || (a<mod && b<mod));
	return (a<b)?(a-b+mod):(a-b);
}

u64 SicoIsNeg(u64 n,u64 mod) {
	assert(mod==0 || n<mod);
	return n>=((mod+1)/2);
}

u64 SicoAbs(u64 n,u64 mod) {
	assert(mod==0 || n<mod);
	return n>=((mod+1)/2)?(mod-n):n;
}

s64 SicoToInt(u64 n,u64 mod) {
	assert(mod==0 || n<mod);
	return (s64)(n>=((mod+1)/2)?(n-mod):n);
}

u64 SicoMul(u64 a,u64 b,u64 mod) {
	assert(mod==0 || (a<mod && b<mod));
	u64 ret=0;
	for (u32 i=0;i<64;i++) {
		ret=(ret && ret>=mod-ret)?(ret+ret-mod):(ret+ret);
		if (b&(1ULL<<63)) {
			ret=(ret && a>=mod-ret)?(a+ret-mod):(a+ret);
		}
		b+=b;
	}
	return ret;
}


//---------------------------------------------------------------------------------


volatile u64 mul_finished=0;


int MulTest(void* arg) {
	((void)arg);
	static volatile u64 block=0;
	u64 blocksize=1<<10;
	u64 maxflags=1;
	maxflags*=3*3*3*3;
	maxflags*=17*5;
	maxflags*=17*5*5;
	maxflags*=17*5;
	maxflags*=17*5*5;
	const char* outpath="flags.txt";
	static volatile u64 writing=0;
	while (1) {
		u64 blockstart=atomic_fetch_add(&block,blocksize);
		if (blockstart>=maxflags) {break;}
		u64 blockend=blockstart+blocksize;
		if (blockend>maxflags) {blockend=maxflags;}
		for (u64 flags=blockstart;flags<blockend;flags++) {
			u64 ftmp=flags;
			//
			u64 off0=ftmp%3-1;ftmp/=3;
			u64 off1=ftmp%3-1;ftmp/=3;
			u64 off2=ftmp%3-1;ftmp/=3;
			u64 off3=ftmp%3-1;ftmp/=3;
			//
			u64 fib00=ftmp%17;ftmp/=17;
			u64 inc00=ftmp%5;ftmp/=5;
			//
			u64 fib10=ftmp%17;ftmp/=17;
			u64 inc10=ftmp%5;ftmp/=5;
			u64 inc11=ftmp%5;ftmp/=5;
			//
			u64 fib20=ftmp%17;ftmp/=17;
			u64 inc20=ftmp%5;ftmp/=5;
			//
			u64 fib30=ftmp%17;ftmp/=17;
			u64 inc30=ftmp%5;ftmp/=5;
			u64 inc31=ftmp%5;ftmp/=5;
			if ((flags&0xffffff)==0) {
				printf("flag: %" PRIu64 " / %" PRIu64 " -- (%d, %d, %d, %d), (%u, %u), (%u, %u, %u), (%u, %u), (%u, %u, %u)\n",
					flags,maxflags,
					(s32)off0,(s32)off1,(s32)off2,(s32)off3,
					(u32)fib00,(u32)inc00,
					(u32)fib10,(u32)inc10,(u32)inc11,
					(u32)fib20,(u32)inc20,
					(u32)fib30,(u32)inc30,(u32)inc31
				);
			}
			for (u64 mod=89;mod<256;mod++) {
				// printf("mod: %u\n",(u32)mod);
				u64 fib0i=0,fib1i=1;
				while (1) {
					u64 tmp=fib0i+fib1i;
					if (tmp>=mod) {break;}
					fib0i=tmp;
					tmp=fib0i+fib1i;
					if (tmp>=mod) {break;}
					fib1i=tmp;
				}
				u64 start=fib0i<fib1i;
				u64 nfib0i=SicoNeg(fib0i,mod);
				u64 nfib1i=SicoNeg(fib1i,mod);
				for (u64 ab=mod*mod-1;ab!=((u64)-1);ab--) {
					const u64 a0=ab/mod,b0=ab%mod;
					if (a0==0 || b0==0) {continue;}
					const u64 modinc[2]={mod-1,1};
					const u64 calchigh=(a0*b0)/mod;
					const u64 calclow =(a0*b0)%mod;
					u64 a=a0,na=SicoNeg(a,mod);
					u64 b=b0,nb=SicoNeg(b,mod);
					u64 fib0=0,nfib0=0;
					u64 fib1=0,nfib1=0;
					u64 lmem[3]={0,0,0}; // {(mod+off0)%mod,(mod+off1)%mod,0};
					// u64 hval0=0,hval1=0;
					u64 hmem[2]={0,0};
					a =( a+mod-1)%mod;
					na=(na+mod-1)%mod;
					// ------- Calculate [lval] and [hval] --------
					// SICO(hval0  ,hval0  , )
					// SICO(hval1  ,hval1  , )
					// SICO(nb     ,z      ,highzero)
					// SICO(na     ,z      ,highzero)
					SICO(nfib0  ,fib0i  , )
					SICO(fib0   ,nfib0i , )
					SICO(nfib1  ,fib1i  , )
					SICO(fib1   ,nfib1i , )
					u64 fmem[4]={fib0,nfib0,fib1,nfib1};
					if (start) {
						lmem[0]=(mod+off2)%mod;
						lmem[1]=(mod+off3)%mod;
						goto start1;
					} else {
						lmem[0]=(mod+off0)%mod;
						lmem[1]=(mod+off1)%mod;
						goto start0;
					}
					// During each loop, fibonacci decrement the [nb]. If [nb]>[fib], reduce [nb]
					// and add [a] to the return value. Then fibonacci increment the return value.
					while (1) {
						// assert(fmem[0]==fib0 && fmem[1]==nfib0 && fmem[2]==fib1 && fmem[3]==nfib1);
						if (!SicoOp(&fib1,fib0,mod)) {break;}
						fmem[2]=fib1;
						if (SicoOp(&lmem[0],lmem[1],mod)==(fib00>>3)) {
							SicoOp(&hmem[(fib00>>2)&1],fmem[fib00&3],mod);
						}
						SicoOp(&lmem[inc00>>1],modinc[inc00&1],mod);
						start0:;
						// If [nb]>[fib0], add [a] to [lval0].
						if (SicoOp(&nb,fib0,mod)) {
							if (SicoOp(&lmem[0],na,mod)==(fib10>>3)) {
								SicoOp(&hmem[(fib10>>2)&1],fmem[fib10&3],mod);
							}
							SicoOp(&nfib0,nfib1,mod);
						} else {
							SicoOp(&lmem[inc11>>1],modinc[inc11&1],mod);
							SicoOp(&nb   ,nfib0,mod);
							SicoOp(&nfib0,nfib1,mod);
						}
						SicoOp(&lmem[inc10>>1],modinc[inc10&1],mod);
						fmem[1]=nfib0;
						if (!SicoOp(&fib0,fib1,mod)) {break;}
						fmem[0]=fib0;
						if (SicoOp(&lmem[1],lmem[0],mod)==(fib20>>3)) {
							SicoOp(&hmem[(fib20>>2)&1],fmem[fib20&3],mod);
						}
						SicoOp(&lmem[inc20>>1],modinc[inc20&1],mod);
						start1:;
						// If [nb]>[fib1], subtract [a] from [lval1].
						if (SicoOp(&nb,fib1,mod)) {
							if (SicoOp(&lmem[1],a,mod)==(fib30>>3)) {
								SicoOp(&hmem[(fib30>>2)&1],fmem[fib30&3],mod);
							}
							SicoOp(&nfib1,nfib0,mod);
						} else {
							SicoOp(&lmem[inc31>>1],modinc[inc31&1],mod);
							SicoOp(&nb   ,nfib1,mod);
							SicoOp(&nfib1,nfib0,mod);
						}
						SicoOp(&lmem[inc30>>1],modinc[inc30&1],mod);
						fmem[3]=nfib1;
					}
					// SicoOp(&na,mod-1,mod);
					// Set [low]
					// SicoOp(&lval0,na,mod);
					u64 lval0=lmem[0];
					u64 lval1=lmem[1];
					SicoOp(&lval0,lval1,mod);
					u64 ldifp=(mod+lval0+mod-calclow+8)%mod;
					u64 ldifn=(mod-lval0+mod-calclow+8)%mod;
					// lval0=SicoNeg(lval0,mod);
					/*u64 off=start?fib0i:nfib1i;
					SicoOp(&lval0,off,mod);
					if (lval0!=calclow) {
						printf("no low: %u, %u\n",(u32)lval0,(u32)calclow);
						exit(0);
					}*/
					// SicoOp(&hval1,off,mod);
					u64 hval0=hmem[0],hval1=hmem[1];
					SicoOp(&hval0,hval1,mod);
					u64 hdifp=(mod+hval0+mod-calchigh+8)%mod;
					u64 hdifn=(mod-hval0+mod-calchigh+8)%mod;
					// SicoOp(&hval0,na,mod);
					/*u64 dif=hval0+2+mod-calchigh;
					printf("(%u, %u) ",(u32)(dif%mod),(u32)off);
					if ((dif%mod)>4) {
						printf("no high\n");
						exit(0);
					}*/
					a=a0;
					na=SicoNeg(a0,mod);
					u64 offarr[14]={
						a,na,
						fib0i,nfib0i,
						fib1i,nfib1i,
						(fib0i+ a)%mod,(nfib0i+ a)%mod,
						(fib1i+ a)%mod,(nfib1i+ a)%mod,
						(fib0i+na)%mod,(nfib0i+na)%mod,
						(fib1i+na)%mod,(nfib1i+na)%mod,
					};
					u32 pass=0;
					for (u32 i=0;i<14 && pass!=3;i++) {
						u64 off=offarr[i];
						if ((ldifp+off)%mod<=16 || (ldifn+off)%mod<=16) {pass|=1;}
						if ((hdifp+off)%mod<=16 || (hdifn+off)%mod<=16) {pass|=2;}
					}
					if (pass!=3) {
						goto highfail;
					}
				}
			}
			while (writing!=0 || atomic_fetch_add(&writing,1)!=0);
			FILE* out=fopen(outpath,"ab");
			fprintf(out,"success: %" PRIu64 " / %" PRIu64 " -- (%d, %d, %d, %d), (%u, %u), (%u, %u, %u), (%u, %u), (%u, %u, %u)\n",
				flags,maxflags,
				(s32)off0,(s32)off1,(s32)off2,(s32)off3,
				(u32)fib00,(u32)inc00,
				(u32)fib10,(u32)inc10,(u32)inc11,
				(u32)fib20,(u32)inc20,
				(u32)fib30,(u32)inc30,(u32)inc31
			);
			fclose(out);
			writing=0;
			// printf("success: %" PRIu64 " / %" PRIu64 "\n",flags,maxflags);
			// exit(0);
			highfail:;
		}
	}
	// fclose(out);
	atomic_fetch_add(&mul_finished,1);
	return 0;
}


void MulTest1(void) {
	for (u64 mod=9;mod<128;mod++) {
		printf("mod: %u\n",(u32)mod);
		u64 fib0i=0,fib1i=1;
		while (1) {
			u64 tmp=fib0i+fib1i;
			if (tmp>=mod) {break;}
			fib0i=tmp;
			tmp=fib0i+fib1i;
			if (tmp>=mod) {break;}
			fib1i=tmp;
		}
		u64 start=fib0i<fib1i;
		u64 nfib0i=SicoNeg(fib0i,mod);
		u64 nfib1i=SicoNeg(fib1i,mod);
		for (u64 ab=mod*mod-1;ab!=((u64)-1);ab--) {
			const u64 a0=ab/mod,b0=ab%mod;
			if (a0==0 || b0==0) {continue;}
			// const u64 calchigh=(a0*b0)/mod;
			const u64 calclow =(a0*b0)%mod;
			u64 a=a0,na=SicoNeg(a,mod);
			u64 b=b0,nb=SicoNeg(b,mod);
			u64 fib0=0,nfib0=0;
			u64 fib1=0,nfib1=0;
			u64 lval0=0,lval1=0;
			u64 hval0=0,hval1=0;
			SicoOp(&a ,1,mod);
			SicoOp(&na,1,mod);
			// ------- Calculate [lval] and [hval] --------
			// SICO(hval0  ,hval0  , )
			// SICO(hval1  ,hval1  , )
			// SICO(nb     ,z      ,highzero)
			// SICO(na     ,z      ,highzero)
			SICO(nfib0  ,fib0i  , )
			SICO(fib0   ,nfib0i , )
			SICO(nfib1  ,fib1i  , )
			SICO(fib1   ,nfib1i , )
			if (start) {
				goto start1;
			} else {
				goto start0;
			}
			// During each loop, fibonacci decrement the [nb]. If [nb]>[fib], reduce [nb]
			// and add [a] to the return value. Then fibonacci increment the return value.
			while (1) {
				if (!SicoOp(&fib1,fib0,mod)) {break;}
				if (lval0<lval1) {
					SicoOp(&hval0,nfib0,mod);
				}
				SicoOp(&lval0,lval1,mod);
				start0:;
				// If [nb]>[fib0], add [a] to [lval0].
				if (SicoOp(&nb,fib0,mod)) {
					if (lval0>na) {
						SicoOp(&hval0,fib0,mod);
					}
					SicoOp(&lval0,na   ,mod);
					SicoOp(&nfib0,nfib1,mod);
				} else {
					SicoOp(&lval0,mod-1,mod);
					SicoOp(&nb   ,nfib0,mod);
					SicoOp(&nfib0,nfib1,mod);
				}
				if (!SicoOp(&fib0,fib1,mod)) {break;}
				if (lval1<lval0) {
					SicoOp(&hval0,fib1,mod);
				}
				SicoOp(&lval1,lval0,mod);
				start1:;
				// If [nb]>[fib1], subtract [a] from [lval1].
				if (SicoOp(&nb,fib1,mod)) {
					if (lval1<=a) {
						SicoOp(&hval0,fib1,mod);
					}
					SicoOp(&lval1,a    ,mod);
					SicoOp(&nfib1,nfib0,mod);
				} else {
					SicoOp(&lval1,mod-1,mod);
					SicoOp(&nb   ,nfib1,mod);
					SicoOp(&nfib1,nfib0,mod);
				}
			}
			SicoOp(&na,mod-1,mod);
			// Set [low]
			SicoOp(&lval0,na,mod);
			SicoOp(&lval0,lval1,mod);
			lval0=SicoNeg(lval0,mod);
			u64 off=start?fib0i:nfib1i;
			SicoOp(&lval0,off,mod);
			if (lval0!=calclow) {
				printf("no low: %u, %u\n",(u32)lval0,(u32)calclow);
				exit(0);
			}
			// SicoOp(&hval1,off,mod);
			SicoOp(&hval0,hval1,mod);
			SicoOp(&hval0,na,mod);
			/*u64 dif=hval0+2+mod-calchigh;
			printf("(%u, %u) ",(u32)(dif%mod),(u32)off);
			if ((dif%mod)>4) {
				printf("no high\n");
				exit(0);
			}*/
		}
	}
}


void MulTest2(void) {
	for (u64 mod=9;mod<128;mod++) {
		printf("mod: %u\n",(u32)mod);
		u64 fib0i=0,fib1i=1;
		while (1) {
			u64 tmp=fib0i+fib1i;
			if (tmp>=mod) {break;}
			fib0i=tmp;
			tmp=fib0i+fib1i;
			if (tmp>=mod) {break;}
			fib1i=tmp;
		}
		u64 start=fib0i<fib1i;
		u64 nfib0i=SicoNeg(fib0i,mod);
		u64 nfib1i=SicoNeg(fib1i,mod);
		for (u64 ab=mod*mod-1;ab!=((u64)-1);ab--) {
			const u64 a0=ab/mod,b0=ab%mod;
			if (a0==0 || b0==0) {continue;}
			const u64 calchigh=(a0*b0)/mod;
			const u64 calclow =(a0*b0)%mod;
			u64 a=a0,na=SicoNeg(a,mod);
			u64 b=b0,nb=SicoNeg(b,mod);
			u64 fib0=0,nfib0=0;
			u64 fib1=0,nfib1=0;
			u64 lval0=0,lval1=0;
			u64 hval0=0,hval1=0;
			SicoOp(&a ,1,mod);
			SicoOp(&na,1,mod);
			// ------- Calculate [lval] and [hval] --------
			// SICO(hval0  ,hval0  , )
			// SICO(hval1  ,hval1  , )
			// SICO(nb     ,z      ,highzero)
			// SICO(na     ,z      ,highzero)
			SICO(nfib0  ,fib0i  , )
			SICO(fib0   ,nfib0i , )
			SICO(nfib1  ,fib1i  , )
			SICO(fib1   ,nfib1i , )
			if (start) {
				goto start1;
			} else {
				goto start0;
			}
			// During each loop, fibonacci decrement the [nb]. If [nb]>[fib], reduce [nb]
			// and add [a] to the return value. Then fibonacci increment the return value.
			while (1) {
				if (!SicoOp(&fib1,fib0,mod)) {break;}
				if (lval0<lval1) {
					SicoOp(&hval0,nfib0,mod);
				}
				SicoOp(&lval0,lval1,mod);
				start0:;
				// If [nb]>[fib0], add [a] to [lval0].
				if (SicoOp(&nb,fib0,mod)) {
					if (lval0>na) {
						SicoOp(&hval0,fib0,mod);
					}
					SicoOp(&lval0,na   ,mod);
					SicoOp(&lval0,1    ,mod);
					SicoOp(&nfib0,nfib1,mod);
				} else {
					SicoOp(&nb   ,nfib0,mod);
					SicoOp(&nfib0,nfib1,mod);
				}
				if (!SicoOp(&fib0,fib1,mod)) {break;}
				if (lval1<lval0) {
					SicoOp(&hval0,fib1,mod);
				}
				SicoOp(&lval1,lval0,mod);
				start1:;
				// If [nb]>[fib1], subtract [a] from [lval1].
				if (SicoOp(&nb,fib1,mod)) {
					if (lval1<=a) {
						SicoOp(&hval0,fib1,mod);
					}
					SicoOp(&lval1,a    ,mod);
					SicoOp(&lval1,1    ,mod);
					SicoOp(&nfib1,nfib0,mod);
				} else {
					SicoOp(&nb   ,nfib1,mod);
					SicoOp(&nfib1,nfib0,mod);
				}
			}
			SicoOp(&na,mod-1,mod);
			// Set [low]
			SicoOp(&lval0,na,mod);
			SicoOp(&lval0,lval1,mod);
			lval0=SicoNeg(lval0,mod);
			if (lval0!=calclow) {
				printf("no low: %u, %u\n",(u32)lval0,(u32)calclow);
				exit(0);
			}
			// SicoOp(&hval1,off,mod);
			SicoOp(&hval0,hval1,mod);
			SicoOp(&hval0,na,mod);
			u64 dif=hval0+2+mod-calchigh;
			if ((dif%mod)>4) {
				printf("no high\n");
				exit(0);
			}
		}
	}
}


int main(void) {
	// MulTest();
	u32 threads=10;
	for (u32 i=0;i<threads;i++) {
		thrd_t id;
		thrd_create(&id,MulTest,0);
	}
	while (mul_finished<threads) {
		struct timespec t={10,0};
		nanosleep(&t,0);
	}
	return 0;
}
