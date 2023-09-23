/*------------------------------------------------------------------------------


Signed Integer Tests - v1.00

Copyright 2022 Alec Dee - MIT license - SPDX: MIT
deegen1.github.io - akdee144@gmail.com


--------------------------------------------------------------------------------
About


Tests all combinations of signed integer functions for specific mods.

We use C++ instead of C to allow multiline comments: R"()".


--------------------------------------------------------------------------------
Notes


Compiling on linux:

rm int_test ; g++ -fsanitize=address -fsanitize=undefined int_test.cpp -o\
int_test -lm ; ./int_test

rm int_test ; g++ -O3 int_test.cpp -o int_test -lm ; ./int_test


*/


#include "sico_mod.cpp"


//---------------------------------------------------------------------------------
// int.write


void SicoTestWrite(u64* str,u64 strlen,u64 stridx,u64* retidx,u64 num,u64 base,u64 sign,u64 mod) {
	#define addchar(c) if (stridx<strlen) {str[stridx]=c;} stridx++;
	if (base>16) {
		*retidx=stridx%mod;
		return;
	}
	const char* hex="0123456789abcdef";
	if (str==0) {strlen=0;}
	if (base) {
		if (SicoIsNeg(num,mod)) {
			num=mod-num;
			addchar('-');
		} else if (sign) {
			addchar('+');
		}
	}
	if (base==0) {
		addchar(num);
	} else if (base==1) {
		while (num--) {
			addchar('1');
		}
	} else {
		u64 den=1;
		while (num/den>=base) {
			den*=base;
		}
		do {
			addchar((u64)hex[num/den]);
			num%=den;
			den/=base;
		} while (den);
	}
	*retidx=stridx%mod;
	#undef addchar
}

void IntWriteStringTest(void) {
	printf("Testing int.write\n");
	const char* header=R"(
		main:
			0 ? int.write .arg0 .arg1 .arg2 .arg3 .arg4 .arg5 .arg6
			0-1 0 ?-2
			0 0 0 0 0
			.arg0: .str
			.arg1: 0
			.arg2: 0
			.arg3: 0
			.arg4: 0
			.arg5: 0
			.arg6: 0
			.argn:
			.str:
				0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0
				0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0
				0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0
				0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0
			.strend:

	)";
	char* source=SicoLoadFunction("../library/int.sico","int.write",header);
	SicoState* st=SicoCreate();
	for (u64 mod=690;mod<1050;mod++) {
		st->mod=mod;
		// Load the st source with the current mod.
		SicoParseAssembly(st,source);
		if (st->state!=SICO_RUNNING) {
			printf("%s",st->statestr);
			exit(0);
		}
		u64 main=SicoFindLabel(st,"main");
		u64 func=SicoGetMem(st,main+2);
		u64 arg0=SicoFindLabel(st,"main.arg0");
		u64 args=SicoFindLabel(st,"main.argn")-arg0;
		u64 startrand=arg0-main-args-5;
		const u64 str0=SicoFindLabel(st,"main.str");
		const u64 maxlen=SicoFindLabel(st,"main.strend")-str0;
		u64* calcstr=(u64*)malloc(maxlen*sizeof(u64));
		memset(calcstr,0,maxlen*sizeof(u64));
		// Randomize the parameter order.
		u64 params=mod*18*2*10;
		u64* param=(u64*)malloc(params*sizeof(u64));
		SicoRandShuffle(param,params,1);
		u64* argarr=(u64*)malloc(args*sizeof(u64));
		u64* argval=(u64*)malloc(args*sizeof(u64));
		u64 maxinst[18]={0};
		f64 instlimit[18]={0};
		instlimit[0]=83;
		instlimit[1]=92.0+9.0*((f64)mod);
		instlimit[17]=78;
		for (u32 base=2;base<17;base++) {
			f64 digits=ceil(log(mod)/log(base));
			instlimit[base]=77.0+(23.0+6.0*base)*digits;
		}
		for (u64 p0=0;p0<params;p0++) {
			// Calculate the expected return value.
			u64 p=param[p0];
			u64 num=p%mod,base=(p/mod)%18,sign=(p/(mod*18))%2,rand=p/(mod*18*2);
			// Randomize the argument order.
			u64 start=(SicoRandu64()%startrand)+main;
			SicoRandShuffle(argarr,args,1);
			// See if duplicate argument addresses will cause errors.
			for (u64 i=0;i<args;i++) {
				argarr[i]+=arg0;
				SicoSetMem(st,start+3+i,argarr[i]);
				argval[i]=SicoRandu64()%mod;
			}
			// Define the string's boundaries.
			u64 strptr=(SicoRandu64()&1)?(str0+SicoRandu64()%(maxlen/2)):0;
			u64 strlen=0;
			u64 stridx=SicoRandu64()%(maxlen/2);
			if (rand==0) {
				strptr=str0;
				strlen=maxlen;
				stridx=0;
			} else {
				if (strptr==0) {strlen=maxlen*2;}
				else if (strptr+stridx>=str0+maxlen) {strlen=1;}
				else {strlen=str0+maxlen-strptr-stridx+1;}
				strlen=SicoRandu64()%strlen;
			}
			u64* calcstrptr=strptr?calcstr+(strptr-str0):0;
			u64 calcidx=0;
			SicoTestWrite(calcstrptr,strlen,stridx,&calcidx,num,base,sign,mod);
			instlimit[1]=92.0+9.0*((f64)(calcidx-stridx));
			// Setup the function and abort instructions.
			SicoSetMem(st,start+0,0);
			SicoSetMem(st,start+1,start+1);
			SicoSetMem(st,start+2,func);
			SicoSetMem(st,start+3+args,mod-1);
			SicoSetMem(st,start+5+args,start+3+args);
			// Reset SICO state and write parameters to memory.
			st->ip=start;
			st->state=SICO_RUNNING;
			st->insts=(u64)-1;
			argval[0]=strptr;
			argval[1]=strlen;
			argval[2]=stridx;
			argval[4]=num;
			argval[5]=base;
			argval[6]=sign;
			for (u64 i=0;i<args;i++) {
				SicoSetMem(st,argarr[i],argval[i]);
			}
			SicoRun(st,(u32)-1);
			if (maxinst[base]<st->insts) {
				maxinst[base]=st->insts;
			}
			u32 error=0;
			if (((f64)st->insts)>instlimit[base]) {
				printf("\ntoo many instructions: %" PRIu64 " > %f",st->insts,instlimit[base]);
				error=1;
			}
			// Make sure the function cleaned up correctly.
			if (SicoGetMem(st,0)) {
				printf("\n0 address not zero");
				error=1;
			}
			if (st->ip!=start+3+args) {
				printf("\ndidn't return: %" PRIu64 ", %" PRIu64,st->ip,start+3+args);
				error=1;
			}
			// Check the return value.
			u64 retidx=SicoGetMem(st,argarr[3]);
			if (retidx!=calcidx) {
				printf("\nreturn: %" PRIu64 "\nexpect: %" PRIu64,retidx,calcidx);
				error=1;
			}
			for (u64 i=0;i<maxlen;i++) {
				u64 c=SicoGetMem(st,str0+i);
				if (calcstr[i]!=c) {error|=2;}
			}
			if (error&2) {
				printf("\nstrings mismatch");
			}
			if (error) {
				printf("\nmod : %" PRIu64 "\n",mod);
				printf("args: ");
				for (u64 i=0;i<args;i++) {
					printf("%" PRIu64 ", ",argval[i]);
				}
				printf("\n");
				exit(0);
			}
		}
		u64 base=SicoRandu64()%18;
		printf("\rmod: %" PRIu64 ", instructions (%" PRIu64 "): %" PRIu64 ", %f    ",mod,base,maxinst[base],instlimit[base]);
		fflush(0);
		free(argval);
		free(argarr);
		free(param);
		free(calcstr);
	}
	SicoFree(st);
	free(source);
	printf("\npassed\n\n");
}


//---------------------------------------------------------------------------------
// int.read


u64 SicoTestWrite36(u64* str,u64 strlen,u64 stridx,u64 num,u64 base,u64 sign,u64 padding,u64 padchar,u64 mod) {
	#define addchar(c) if (stridx<strlen) {str[stridx]=c;} stridx++;
	if (base>36) {
		return stridx;
	}
	if (str==0) {strlen=0;}
	while (padding--) {
		addchar(padchar);
	}
	if (base) {
		if (SicoIsNeg(num,mod)) {
			num=mod-num;
			addchar('-');
		} else if (sign) {
			addchar('+');
		}
	}
	if (base==0) {
		addchar(num);
	} else if (base==1) {
		while (num) {
			u32 val=SicoRandu64()&1;
			num-=val;
			val+='0';
			addchar(val);
		}
	} else {
		u64 den=1;
		while (num/den>=base) {
			den*=base;
		}
		do {
			u64 d=num/den;
			if (d>9) {d+=(SicoRandu64()&1)?('a'-10):('A'-10);}
			else {d+='0';}
			addchar(d);
			num%=den;
			den/=base;
		} while (den);
	}
	#undef addchar
	return stridx;
}

void SicoTestRead36(u64* str,u64 strlen,u64 stridx,u64* calcidx,u64* calcnum,u64 base,u64 mod) {
	u64 num=0;
	if (str==0) {strlen=0;}
	u64 isneg=0;
	if (base==0) {
		if (stridx<strlen) {
			num=str[stridx++];
		}
	} else if (base<37) {
		while (stridx<strlen && str[stridx]<=32) {
			stridx++;
		}
		if (stridx<strlen) {
			isneg=str[stridx]=='-';
			if (isneg || str[stridx]=='+') {stridx++;}
		}
		u64 max=base>1?base-1:base;
		while (stridx<strlen) {
			u64 c=str[stridx];
			if (c>='0' && c<='9') {
				c-='0';
			} else if (c>='a' && c<='z') {
				c-='a'-10;
			} else if (c>='A' && c<='Z') {
				c-='A'-10;
			} else {
				break;
			}
			if (c>max) {
				break;
			}
			stridx++;
			u64 num0=num;
			for (u64 i=1;i<base;i++) {
				num=SicoAdd(num,num0,mod);
			}
			num=SicoAdd(num,c,mod);
		}
	}
	*calcnum=isneg?SicoNeg(num,mod):num;
	*calcidx=stridx;
}

void IntReadStringTest(void) {
	printf("Testing int.read\n");
	const char* header=R"(
		main:
			0 ? int.read .arg0 .arg1 .arg2 .arg3 .arg4 .arg5
			0-1 0 ?-2
			0 0 0 0 0
			.arg0: .str
			.arg1: 0
			.arg2: 0
			.arg3: 0
			.arg4: 0
			.arg5: 0
			.argn:
			.str:
				0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0
				0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0
				0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0
				0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0
			.strend:

	)";
	char* source=SicoLoadFunction("../library/int.sico","int.read",header);
	SicoState* st=SicoCreate();
	for (u64 mod=590;mod<900;mod++) {
		st->mod=mod;
		// Load the st source with the current mod.
		SicoParseAssembly(st,source);
		if (st->state!=SICO_RUNNING) {
			printf("%s",st->statestr);
			exit(0);
		}
		u64 main=SicoFindLabel(st,"main");
		u64 func=SicoGetMem(st,main+2);
		u64 arg0=SicoFindLabel(st,"main.arg0");
		u64 args=SicoFindLabel(st,"main.argn")-arg0;
		u64 startrand=arg0-main-args-5;
		const u64 str0=SicoFindLabel(st,"main.str");
		const u64 maxlen=SicoFindLabel(st,"main.strend")-str0;
		u64* calcstr=(u64*)malloc(maxlen*sizeof(u64));
		memset(calcstr,0,maxlen*sizeof(u64));
		// Randomize the parameter order.
		u64 params=mod*38*2*10;
		u64* param=(u64*)malloc(params*sizeof(u64));
		SicoRandShuffle(param,params,1);
		u64* argarr=(u64*)malloc(args*sizeof(u64));
		u64* argval=(u64*)malloc(args*sizeof(u64));
		u64 maxinst[38]={0};
		f64 instlimit[38]={0};
		instlimit[0]=83.0;
		instlimit[1]=110.0+19.0*((f64)mod);
		for (u32 base=2;base<37;base++) {
			f64 digits=ceil(log(mod)/log(base));
			instlimit[base]=128+(17.0+2.0*base)*digits;
		}
		instlimit[37]=83.0;
		for (u64 p0=0;p0<params;p0++) {
			// Calculate the expected return value.
			u64 p=param[p0];
			u64 num=p%mod,base=(p/mod)%38,sign=(p/(mod*38))%2,rand=p/(mod*76);
			// Randomize the argument order.
			u64 start=(SicoRandu64()%startrand)+main;
			SicoRandShuffle(argarr,args,1);
			// See if duplicate argument addresses will cause errors.
			for (u64 i=0;i<args;i++) {
				argarr[i]+=arg0;
				SicoSetMem(st,start+3+i,argarr[i]);
				argval[i]=SicoRandu64()%mod;
			}
			// Define the string's boundaries.
			u64 strptr=(SicoRandu64()&1)?(str0+SicoRandu64()%(maxlen/2)):0;
			u64 strlen=0;
			u64 stridx=SicoRandu64()%(maxlen/2);
			u64 padding=SicoRandu64()%(maxlen/2);
			u64 padchar=(SicoRandu64()&1)?' ':'0';
			if (rand==0) {
				strptr=str0;
				strlen=maxlen;
				stridx=0;
				padding=0;
			} else {
				if (strptr==0) {strlen=maxlen*2;}
				else if (strptr+stridx>=str0+maxlen) {strlen=1;}
				else {strlen=str0+maxlen-strptr-stridx+1;}
				strlen=SicoRandu64()%strlen;
			}
			u64* calcstrptr=strptr?calcstr+(strptr-str0):0;
			u64 calcidx=SicoTestWrite36(calcstrptr,strlen,stridx,num,base,sign,padding,padchar,mod);
			if (rand) {
				calcstr[SicoRandu64()%maxlen]=SicoRandu64()%mod;
			} else if (calcidx<strlen) {
				u64 val;
				do {
					val=SicoRandu64()%mod;
				} while ((val>='0' && val<='9') || (val>='a' && val<='z') || (val>='A' && val<='Z'));
				calcstr[calcidx]=val;
			}
			// Simply copy our reference string to memory.
			for (u64 i=0;i<maxlen;i++) {
				SicoSetMem(st,str0+i,calcstr[i]);
			}
			u64 calcnum=0;
			SicoTestRead36(calcstrptr,strlen,stridx,&calcidx,&calcnum,base,mod);
			instlimit[1]=110.0+19.0*((f64)(calcidx-stridx));
			// Setup the function and abort instructions.
			SicoSetMem(st,start+0,0);
			SicoSetMem(st,start+1,start+1);
			SicoSetMem(st,start+2,func);
			SicoSetMem(st,start+3+args,mod-1);
			SicoSetMem(st,start+5+args,start+3+args);
			// Reset SICO state and write parameters to memory.
			st->ip=start;
			st->state=SICO_RUNNING;
			st->insts=(u64)-1;
			argval[0]=strptr;
			argval[1]=strlen;
			argval[2]=stridx;
			argval[5]=base;
			for (u64 i=0;i<args;i++) {
				SicoSetMem(st,argarr[i],argval[i]);
			}
			SicoRun(st,(u32)-1);
			if (rand==0 && maxinst[base]<st->insts) {
				maxinst[base]=st->insts;
			}
			u32 error=0;
			if (rand==0 && ((f64)st->insts)>instlimit[base]) {
				printf("\ntoo many instructions: %" PRIu64 " > %f",st->insts,instlimit[base]);
				error=1;
			}
			// Make sure the function cleaned up correctly.
			if (SicoGetMem(st,0)) {
				printf("\n0 address not zero");
				error=1;
			}
			if (st->ip!=start+3+args) {
				printf("\ndidn't return: %" PRIu64 ", %" PRIu64,st->ip,start+3+args);
				error=1;
			}
			for (u64 i=0;i<maxlen;i++) {
				u64 c=SicoGetMem(st,str0+i);
				if (calcstr[i]!=c) {
					printf("\nstring modified during reading");
					error=1;
				}
			}
			// Check the return value.
			u64 retidx=SicoGetMem(st,argarr[3]);
			u64 retnum=SicoGetMem(st,argarr[4]);
			if (retidx!=calcidx || retnum!=calcnum) {
				printf("\nreturn: %" PRIu64 ", %" PRIu64 "\nexpect: %" PRIu64 ", %" PRIu64,retidx,retnum,calcidx,calcnum);
				error=1;
			}
			if (error) {
				printf("\nmod   : %" PRIu64 "\n",mod);
				printf("args  : ");
				for (u64 i=0;i<args;i++) {
					printf("%" PRIu64 ", ",argval[i]);
				}
				printf("\n");
				exit(0);
			}
		}
		u64 base=SicoRandu64()%3;// 8;
		printf("\rmod: %" PRIu64 ", instructions (%" PRIu64 "): %" PRIu64 ", %f    ",mod,base,maxinst[base],instlimit[base]);
		fflush(0);
		free(argval);
		free(argarr);
		free(param);
		free(calcstr);
	}
	SicoFree(st);
	free(source);
	printf("\npassed\n\n");
}


//---------------------------------------------------------------------------------
// int.cmp


void IntCmpTest(void) {
	printf("Testing int.cmp\n");
	const char* header=R"(
		main:
			0 ? int.cmp .arg0 .arg1 .arg2 .arg3 .arg4
			0-1 0 ?-2
			0 0 0 0 0
			.arg0: 0-1 0 ?-2
			.arg1: 0-1 0 ?-2
			.arg2: 0-1 0 ?-2
			.arg3: 0-1 0 ?-2
			.arg4: 0-1 0 ?-2

	)";
	char* source=SicoLoadFunction("../library/int.sico","int.cmp",header);
	SicoState* st=SicoCreate();
	for (u64 mod=180;mod<330;mod++) {
		st->mod=mod;
		// Load the st source with the current mod.
		SicoParseAssembly(st,source);
		if (st->state!=SICO_RUNNING) {
			printf("%s",st->statestr);
			exit(0);
		}
		u64 main=SicoFindLabel(st,"main");
		u64 func=SicoGetMem(st,main+2);
		u64 arg0=SicoFindLabel(st,"main.arg0");
		u64 args=5;
		u64 startrand=arg0-main-args-5;
		// Randomize the parameter order.
		u64 params=mod*mod*2;
		u64* param=(u64*)malloc(params*sizeof(u64));
		SicoRandShuffle(param,params,1);
		u64* argarr=(u64*)malloc(args*sizeof(u64));
		u64* argval=(u64*)malloc(args*sizeof(u64));
		u64 maxinst=0;
		const u64 instlimit=37;
		for (u64 p0=0;p0<params;p0++) {
			// Calculate the expected return value.
			u64 p=param[p0];
			u64 a=p%mod,b=(p/mod)%mod;
			u64 copy=p>=mod*mod?SicoRandu64()&1:0;
			// Randomize the argument order.
			u64 start=(SicoRandu64()%startrand)+main;
			SicoRandShuffle(argarr,args,1);
			// See if duplicate argument addresses will cause errors.
			if (copy&1) {argarr[0]=argarr[1];}
			for (u64 i=0;i<args;i++) {
				argarr[i]=argarr[i]*3+arg0;
				SicoSetMem(st,start+3+i,argarr[i]);
				argval[i]=mod-1;
			}
			u64 calcret=argarr[2];
			if (a==b || argarr[0]==argarr[1]) {
				calcret=argarr[3];
			} else if (SicoToInt(a,mod)>SicoToInt(b,mod)) {
				calcret=argarr[4];
			}
			// Setup the function and abort instructions.
			SicoSetMem(st,start+0,0);
			SicoSetMem(st,start+1,start+1);
			SicoSetMem(st,start+2,func);
			SicoSetMem(st,start+3+args,mod-1);
			SicoSetMem(st,start+5+args,start+3+args);
			// Reset SICO state and write parameters to memory.
			st->ip=start;
			st->state=SICO_RUNNING;
			st->insts=(u64)-1;
			argval[0]=a;
			argval[1]=b;
			for (u64 i=0;i<args;i++) {
				SicoSetMem(st,argarr[i],argval[i]);
			}
			SicoRun(st,(u32)-1);
			if (maxinst<st->insts) {
				maxinst=st->insts;
			}
			u32 error=0;
			if (st->insts>instlimit) {
				printf("\ntoo many instructions: %" PRIu64 " > %" PRIu64,st->insts,instlimit);
				error=1;
			}
			// Make sure the function cleaned up correctly.
			if (SicoGetMem(st,0)) {
				printf("\n0 address not zero");
				error=1;
			}
			if (copy&1) {argval[0]=b;}
			for (u64 i=0;i<args;i++) {
				if (SicoGetMem(st,argarr[i])!=argval[i]) {
					printf("\nargument modified");
					error=1;
				}
			}
			// Check the return value.
			if (st->ip!=calcret) {
				printf("\ndidn't return: %" PRIu64 ", %" PRIu64,st->ip,calcret);
				error=1;
			}
			if (error) {
				printf("\nmod : %" PRIu64 "\n",mod);
				printf("args: ");
				for (u64 i=0;i<args;i++) {
					printf("%" PRIu64 ", ",argval[i]);
				}
				printf("\n");
				exit(0);
			}
		}
		printf("\rmod: %" PRIu64 ", instructions: %" PRIu64 ", %" PRIu64,mod,maxinst,instlimit);
		fflush(0);
		free(argval);
		free(argarr);
		free(param);
	}
	SicoFree(st);
	free(source);
	printf("\npassed\n\n");
}


//---------------------------------------------------------------------------------
// int.min


void IntMinTest(void) {
	printf("Testing int.min\n");
	const char* header=R"(
		main:
			0 ? int.min .arg0 .arg1 .arg2
			0-1 0 ?-2
			0 0 0 0 0
			.arg0: 0
			.arg1: 0
			.arg2: 0
			.argn:

	)";
	char* source=SicoLoadFunction("../library/int.sico","int.min",header);
	SicoState* st=SicoCreate();
	for (u64 mod=190;mod<330;mod++) {
		st->mod=mod;
		// Load the st source with the current mod.
		SicoParseAssembly(st,source);
		if (st->state!=SICO_RUNNING) {
			printf("%s",st->statestr);
			exit(0);
		}
		u64 main=SicoFindLabel(st,"main");
		u64 func=SicoGetMem(st,main+2);
		u64 arg0=SicoFindLabel(st,"main.arg0");
		u64 args=SicoFindLabel(st,"main.argn")-arg0;
		u64 startrand=arg0-main-args-5;
		// Randomize the parameter order.
		u64 params=mod*mod;
		u64* param=(u64*)malloc(params*sizeof(u64));
		SicoRandShuffle(param,params,1);
		u64* argarr=(u64*)malloc(args*sizeof(u64));
		u64* argval=(u64*)malloc(args*sizeof(u64));
		u64 maxinst=0;
		const u64 instlimit=43;
		for (u64 p0=0;p0<params;p0++) {
			// Calculate the expected return value.
			u64 p=param[p0];
			u64 a=p%mod,b=(p/mod)%mod;
			u64 calcret=SicoToInt(a,mod)<SicoToInt(b,mod)?a:b;
			// Randomize the argument order.
			u64 start=(SicoRandu64()%startrand)+main;
			SicoRandShuffle(argarr,args,1);
			// See if duplicate argument addresses will cause errors.
			argarr[0]=argarr[SicoRandu32()%3];
			for (u64 i=0;i<args;i++) {
				argarr[i]+=arg0;
				SicoSetMem(st,start+3+i,argarr[i]);
				argval[i]=SicoRandu64()%mod;
			}
			// Setup the function and abort instructions.
			SicoSetMem(st,start+0,0);
			SicoSetMem(st,start+1,start+1);
			SicoSetMem(st,start+2,func);
			SicoSetMem(st,start+3+args,mod-1);
			SicoSetMem(st,start+5+args,start+3+args);
			// Reset SICO state and write parameters to memory.
			st->ip=start;
			st->state=SICO_RUNNING;
			st->insts=(u64)-1;
			argval[1]=a;
			argval[2]=b;
			for (u64 i=0;i<args;i++) {
				SicoSetMem(st,argarr[i],argval[i]);
			}
			SicoRun(st,(u32)-1);
			if (maxinst<st->insts) {
				maxinst=st->insts;
			}
			u32 error=0;
			if (st->insts>instlimit) {
				printf("\ntoo many instructions: %" PRIu64 " > %" PRIu64,st->insts,instlimit);
				error=1;
			}
			// Make sure the function cleaned up correctly.
			if (SicoGetMem(st,0)) {
				printf("\n0 address not zero");
				error=1;
			}
			if (st->ip!=start+3+args) {
				printf("\ndidn't return: %" PRIu64 ", %" PRIu64,st->ip,start+3+args);
				error=1;
			}
			// Check the return value.
			u64 retmin=SicoGetMem(st,argarr[0]);
			if (retmin!=calcret) {
				printf("\nreturn: %" PRIu64 "\nexpect: %" PRIu64,retmin,calcret);
				error=1;
			}
			if (error) {
				printf("\nmod : %" PRIu64 "\n",mod);
				printf("args: ");
				for (u64 i=0;i<args;i++) {
					printf("%" PRIu64 ", ",argval[i]);
				}
				printf("\n");
				exit(0);
			}
		}
		printf("\rmod: %" PRIu64 ", instructions: %" PRIu64 ", %" PRIu64,mod,maxinst,instlimit);
		fflush(0);
		free(argval);
		free(argarr);
		free(param);
	}
	SicoFree(st);
	free(source);
	printf("\npassed\n\n");
}


//---------------------------------------------------------------------------------
// int.max


void IntMaxTest(void) {
	printf("Testing int.max\n");
	const char* header=R"(
		main:
			0 ? int.max .arg0 .arg1 .arg2
			0-1 0 ?-2
			0 0 0 0 0
			.arg0: 0
			.arg1: 0
			.arg2: 0
			.argn:

	)";
	char* source=SicoLoadFunction("../library/int.sico","int.max",header);
	SicoState* st=SicoCreate();
	for (u64 mod=190;mod<330;mod++) {
		st->mod=mod;
		// Load the st source with the current mod.
		SicoParseAssembly(st,source);
		if (st->state!=SICO_RUNNING) {
			printf("%s",st->statestr);
			exit(0);
		}
		u64 main=SicoFindLabel(st,"main");
		u64 func=SicoGetMem(st,main+2);
		u64 arg0=SicoFindLabel(st,"main.arg0");
		u64 args=SicoFindLabel(st,"main.argn")-arg0;
		u64 startrand=arg0-main-args-5;
		// Randomize the parameter order.
		u64 params=mod*mod;
		u64* param=(u64*)malloc(params*sizeof(u64));
		SicoRandShuffle(param,params,1);
		u64* argarr=(u64*)malloc(args*sizeof(u64));
		u64* argval=(u64*)malloc(args*sizeof(u64));
		u64 maxinst=0;
		const u64 instlimit=43;
		for (u64 p0=0;p0<params;p0++) {
			// Calculate the expected return value.
			u64 p=param[p0];
			u64 a=p%mod,b=(p/mod)%mod;
			u64 calcret=SicoToInt(a,mod)>SicoToInt(b,mod)?a:b;
			// Randomize the argument order.
			u64 start=(SicoRandu64()%startrand)+main;
			SicoRandShuffle(argarr,args,1);
			// See if duplicate argument addresses will cause errors.
			argarr[0]=argarr[SicoRandu32()%3];
			for (u64 i=0;i<args;i++) {
				argarr[i]+=arg0;
				SicoSetMem(st,start+3+i,argarr[i]);
				argval[i]=SicoRandu64()%mod;
			}
			// Setup the function and abort instructions.
			SicoSetMem(st,start+0,0);
			SicoSetMem(st,start+1,start+1);
			SicoSetMem(st,start+2,func);
			SicoSetMem(st,start+3+args,mod-1);
			SicoSetMem(st,start+5+args,start+3+args);
			// Reset SICO state and write parameters to memory.
			st->ip=start;
			st->state=SICO_RUNNING;
			st->insts=(u64)-1;
			argval[1]=a;
			argval[2]=b;
			for (u64 i=0;i<args;i++) {
				SicoSetMem(st,argarr[i],argval[i]);
			}
			SicoRun(st,(u32)-1);
			if (maxinst<st->insts) {
				maxinst=st->insts;
			}
			u32 error=0;
			if (st->insts>instlimit) {
				printf("\ntoo many instructions: %" PRIu64 " > %" PRIu64,st->insts,instlimit);
				error=1;
			}
			// Make sure the function cleaned up correctly.
			if (SicoGetMem(st,0)) {
				printf("\n0 address not zero");
				error=1;
			}
			if (st->ip!=start+3+args) {
				printf("\ndidn't return: %" PRIu64 ", %" PRIu64,st->ip,start+3+args);
				error=1;
			}
			// Check the return value.
			u64 retmin=SicoGetMem(st,argarr[0]);
			if (retmin!=calcret) {
				printf("\nreturn: %" PRIu64 "\nexpect: %" PRIu64,retmin,calcret);
				error=1;
			}
			if (error) {
				printf("\nmod : %" PRIu64 "\n",mod);
				printf("args: ");
				for (u64 i=0;i<args;i++) {
					printf("%" PRIu64 ", ",argval[i]);
				}
				printf("\n");
				exit(0);
			}
		}
		printf("\rmod: %" PRIu64 ", instructions: %" PRIu64 ", %" PRIu64,mod,maxinst,instlimit);
		fflush(0);
		free(argval);
		free(argarr);
		free(param);
	}
	SicoFree(st);
	free(source);
	printf("\npassed\n\n");
}


//---------------------------------------------------------------------------------
// int.abs


void IntAbsTest(void) {
	printf("Testing int.abs\n");
	const char* header=R"(
		main:
			0 ? int.abs .arg0 .arg1
			0-1 0 ?-2
			0 0 0 0 0
			.arg0: 0
			.arg1: 0
			.argn:

	)";
	char* source=SicoLoadFunction("../library/int.sico","int.abs",header);
	SicoState* st=SicoCreate();
	for (u64 mod=130;mod<330;mod++) {
		st->mod=mod;
		// Load the st source with the current mod.
		SicoParseAssembly(st,source);
		if (st->state!=SICO_RUNNING) {
			printf("%s",st->statestr);
			exit(0);
		}
		u64 main=SicoFindLabel(st,"main");
		u64 func=SicoGetMem(st,main+2);
		u64 arg0=SicoFindLabel(st,"main.arg0");
		u64 args=SicoFindLabel(st,"main.argn")-arg0;
		u64 startrand=arg0-main-args-5;
		// Randomize the parameter order.
		u64 params=mod;
		u64* param=(u64*)malloc(params*sizeof(u64));
		SicoRandShuffle(param,params,1);
		u64* argarr=(u64*)malloc(args*sizeof(u64));
		u64* argval=(u64*)malloc(args*sizeof(u64));
		u64 maxinst=0;
		const u64 instlimit=30;
		for (u64 p0=0;p0<params;p0++) {
			// Calculate the expected return value.
			u64 p=param[p0];
			u64 a=p%mod;
			u64 calcret=SicoAbs(a,mod);
			// Randomize the argument order.
			u64 start=(SicoRandu64()%startrand)+main;
			SicoRandShuffle(argarr,args,1);
			// See if duplicate argument addresses will cause errors.
			argarr[0]=argarr[SicoRandu32()%2];
			for (u64 i=0;i<args;i++) {
				argarr[i]+=arg0;
				SicoSetMem(st,start+3+i,argarr[i]);
				argval[i]=SicoRandu64()%mod;
			}
			// Setup the function and abort instructions.
			SicoSetMem(st,start+0,0);
			SicoSetMem(st,start+1,start+1);
			SicoSetMem(st,start+2,func);
			SicoSetMem(st,start+3+args,mod-1);
			SicoSetMem(st,start+5+args,start+3+args);
			// Reset SICO state and write parameters to memory.
			st->ip=start;
			st->state=SICO_RUNNING;
			st->insts=(u64)-1;
			argval[1]=a;
			for (u64 i=0;i<args;i++) {
				SicoSetMem(st,argarr[i],argval[i]);
			}
			SicoRun(st,(u32)-1);
			if (maxinst<st->insts) {
				maxinst=st->insts;
			}
			u32 error=0;
			if (st->insts>instlimit) {
				printf("\ntoo many instructions: %" PRIu64 " > %" PRIu64,st->insts,instlimit);
				error=1;
			}
			// Make sure the function cleaned up correctly.
			if (SicoGetMem(st,0)) {
				printf("\n0 address not zero");
				error=1;
			}
			if (st->ip!=start+3+args) {
				printf("\ndidn't return: %" PRIu64 ", %" PRIu64,st->ip,start+3+args);
				error=1;
			}
			// Check the return value.
			u64 retmin=SicoGetMem(st,argarr[0]);
			if (retmin!=calcret) {
				printf("\nreturn: %" PRIu64 "\nexpect: %" PRIu64,retmin,calcret);
				error=1;
			}
			if (error) {
				printf("\nmod : %" PRIu64 "\n",mod);
				printf("args: ");
				for (u64 i=0;i<args;i++) {
					printf("%" PRIu64 ", ",argval[i]);
				}
				printf("\n");
				exit(0);
			}
		}
		printf("\rmod: %" PRIu64 ", instructions: %" PRIu64 ", %" PRIu64,mod,maxinst,instlimit);
		fflush(0);
		free(argval);
		free(argarr);
		free(param);
	}
	SicoFree(st);
	free(source);
	printf("\npassed\n\n");
}


//---------------------------------------------------------------------------------
// int.mul


void IntMulTest(void) {
	printf("Testing int.mul\n");
	const char* header=R"(
		main:
			0 ? int.mul .arg0 .arg1 .arg2 .arg3
			0-1 0 ?-2
			0 0 0 0 0
			.arg0: 0
			.arg1: 0
			.arg2: 0
			.arg3: 0
			.argn:

	)";
	char* source=SicoLoadFunction("../library/int.sico","int.mul",header);
	SicoState* st=SicoCreate();
	for (u64 mod=450;mod<800;mod++) {
		st->mod=mod;
		// Load the st source with the current mod.
		SicoParseAssembly(st,source);
		if (st->state!=SICO_RUNNING) {
			printf("%s",st->statestr);
			exit(0);
		}
		SicoRun(st,(u32)-1);
		u64 main=SicoFindLabel(st,"main");
		u64 func=SicoGetMem(st,main+2);
		u64 arg0=SicoFindLabel(st,"main.arg0");
		u64 args=SicoFindLabel(st,"main.argn")-arg0;
		u64 startrand=arg0-main-args-5;
		// Randomize the parameter order.
		u64 params=mod*mod*2;
		u64* param=(u64*)malloc(params*sizeof(u64));
		SicoRandShuffle(param,params,1);
		u64* argarr=(u64*)malloc(args*sizeof(u64));
		u64* argval=(u64*)malloc(args*sizeof(u64));
		u64 maxinst[2]={0,0};
		f64 bits=log(mod)/log(2.0);
		f64 instlimit[2]={47.0+7.21*bits,63.0+12.97*bits};
		for (u64 p0=0;p0<params;p0++) {
			// Calculate the expected return value.
			u64 p=param[p0];
			u64 a=p%mod,b=(p/mod)%mod;
			u64 high=p>=mod*mod;
			u64 aabs=SicoAbs(a,mod),babs=SicoAbs(b,mod);
			u64 calchigh=(aabs*babs)/mod;
			u64 calclow=(aabs*babs)%mod;
			if (SicoIsNeg(a,mod)!=SicoIsNeg(b,mod)) {
				calclow=SicoNeg(calclow,mod);
				calchigh=mod-1-calchigh;
				if (calclow==0) {calchigh=SicoAdd(calchigh,1,mod);}
			}
			// Randomize the argument order.
			u64 start=(SicoRandu64()%startrand)+main;
			SicoRandShuffle(argarr,args,1);
			// See if duplicate argument addresses will cause errors.
			for (u64 i=0;i<args;i++) {
				argarr[i]+=arg0;
				SicoSetMem(st,start+3+i,argarr[i]);
				argval[i]=SicoRandu64()%mod;
			}
			// Setup the function and abort instructions.
			SicoSetMem(st,start+0,0);
			SicoSetMem(st,start+1,start+1);
			SicoSetMem(st,start+2,func);
			SicoSetMem(st,start+3+args,mod-1);
			SicoSetMem(st,start+5+args,start+3+args);
			// Reset SICO state and write parameters to memory.
			st->ip=start;
			st->state=SICO_RUNNING;
			st->insts=(u64)-1;
			if (high==0) {
				SicoSetMem(st,start+3,0);
				calchigh=argval[0];
			}
			argval[2]=a;
			argval[3]=b;
			for (u64 i=0;i<args;i++) {
				SicoSetMem(st,argarr[i],argval[i]);
			}
			SicoRun(st,(u32)-1);
			if (maxinst[high]<st->insts) {
				maxinst[high]=st->insts;
			}
			u32 error=0;
			if (((f64)st->insts)>instlimit[high]) {
				printf("\ntoo many instructions: %" PRIu64 ", %f",st->insts,instlimit[high]);
				error=1;
			}
			// Make sure the function cleaned up correctly.
			if (SicoGetMem(st,0)) {
				printf("\n0 address not zero");
				error=1;
			}
			if (st->ip!=start+3+args) {
				printf("\ndidn't return: %" PRIu64 ", %" PRIu64,st->ip,start+3+args);
				error=1;
			}
			// Check the return value.
			u64 rethigh=SicoGetMem(st,argarr[0]);
			u64 retlow=SicoGetMem(st,argarr[1]);
			if (calchigh!=rethigh || retlow!=calclow) {
				printf("\nreturn: %" PRIu64 ", %" PRIu64 "\nexpect: %" PRIu64 ", %" PRIu64,rethigh,retlow,calchigh,calclow);
				error=1;
			}
			if (error) {
				printf("\nmod : %" PRIu64 "\n",mod);
				printf("args: ");
				for (u64 i=0;i<args;i++) {
					printf("%" PRIu64 ", ",argval[i]);
				}
				printf("\n");
				exit(0);
			}
		}
		printf("\rmod: %" PRIu64 ", instructions: low %" PRIu64 ", %f / high %" PRIu64 ", %f",mod,maxinst[0],instlimit[0],maxinst[1],instlimit[1]);
		fflush(0);
		free(argval);
		free(argarr);
		free(param);
	}
	SicoFree(st);
	free(source);
	printf("\npassed\n\n");
}


//---------------------------------------------------------------------------------
// int.div


void IntDivTest(void) {
	printf("Testing int.div\n");
	const char* header=R"(
		main:
			0 ? int.div .arg0 .arg1 .arg2 .arg3
			0-1 0 ?-2
			0 0 0 0 0
			.arg0: 0
			.arg1: 0
			.arg2: 0
			.arg3: 0
			.argn:

	)";
	char* source=SicoLoadFunction("../library/int.sico","int.div",header);
	SicoState* st=SicoCreate();
	for (u64 mod=450;mod<800;mod++) {
		st->mod=mod;
		// Load the st source with the current mod.
		SicoParseAssembly(st,source);
		if (st->state!=SICO_RUNNING) {
			printf("%s",st->statestr);
			exit(0);
		}
		u64 main=SicoFindLabel(st,"main");
		u64 func=SicoGetMem(st,main+2);
		u64 arg0=SicoFindLabel(st,"main.arg0");
		u64 args=SicoFindLabel(st,"main.argn")-arg0;
		u64 divz=SicoFindLabel(st,"int.div.divz");
		u64 startrand=arg0-main-args-5;
		// Randomize the parameter order.
		u64 params=mod*mod*2;
		u64* param=(u64*)malloc(params*sizeof(u64));
		SicoRandShuffle(param,params,1);
		u64* argarr=(u64*)malloc(args*sizeof(u64));
		u64* argval=(u64*)malloc(args*sizeof(u64));
		u64 maxinst[2]={0,0};
		f64 bits=log(mod)/log(2.0);
		f64 instlimit[2]={72.0+7.21*bits,87.0+8.65*bits};
		for (u64 p0=0;p0<params;p0++) {
			// Calculate the expected return value.
			u64 p=param[p0];
			u64 a=p%mod,b=(p/mod)%mod;
			u64 high=p>=mod*mod;
			// Randomize the argument order.
			u64 start=(SicoRandu64()%startrand)+main;
			SicoRandShuffle(argarr,args,1);
			// See if duplicate argument addresses will cause errors.
			for (u64 i=0;i<args;i++) {
				argarr[i]+=arg0;
				SicoSetMem(st,start+3+i,argarr[i]);
				argval[i]=SicoRandu64()%mod;
			}
			// Setup the function and abort instructions.
			SicoSetMem(st,start+0,0);
			SicoSetMem(st,start+1,start+1);
			SicoSetMem(st,start+2,func);
			SicoSetMem(st,start+3+args,mod-1);
			SicoSetMem(st,start+5+args,start+3+args);
			// Reset SICO state and write parameters to memory.
			st->ip=start;
			st->state=SICO_RUNNING;
			st->insts=(u64)-1;
			u64 calcquot=argval[0];
			u64 calcrem=argval[1];
			if (b) {
				calcquot=SicoAbs(a,mod)/SicoAbs(b,mod);
				if (SicoIsNeg(a,mod)!=SicoIsNeg(b,mod)) {
					calcquot=SicoNeg(calcquot,mod);
				}
				calcrem=SicoSub(a,SicoMul(calcquot,b,mod),mod);
			}
			if (high==0) {
				calcquot=argval[0];
				SicoSetMem(st,start+3,0);
			}
			argval[2]=a;
			argval[3]=b;
			for (u64 i=0;i<args;i++) {
				SicoSetMem(st,argarr[i],argval[i]);
			}
			SicoRun(st,(u32)-1);
			if (maxinst[high]<st->insts) {
				maxinst[high]=st->insts;
			}
			u32 error=0;
			if (((f64)st->insts)>instlimit[high]) {
				printf("\ntoo many instructions: %" PRIu64 ", %f",st->insts,instlimit[high]);
				error=1;
			}
			// Make sure the function cleaned up correctly.
			if (b) {
				if (SicoGetMem(st,0)) {
					printf("\n0 address not zero");
					error=1;
				}
			} else {
				SicoSetMem(st,0,0);
			}
			u64 retip=b?(start+3+args):divz;
			if (st->ip!=retip) {
				printf("\ndidn't return: %" PRIu64 ", %" PRIu64,st->ip,retip);
				error=1;
			}
			// Check the return value.
			u64 retquot=SicoGetMem(st,argarr[0]);
			u64 retrem=SicoGetMem(st,argarr[1]);
			if (calcquot!=retquot || retrem!=calcrem) {
				printf("\nreturn: %" PRIu64 ", %" PRIu64 "\nexpect: %" PRIu64 ", %" PRIu64,retquot,retrem,calcquot,calcrem);
				error=1;
			}
			if (error) {
				printf("\nmod : %" PRIu64 "\n",mod);
				printf("args: ");
				for (u64 i=0;i<args;i++) {
					printf("%" PRIu64 ", ",argval[i]);
				}
				printf("\n");
				exit(0);
			}
		}
		printf("\rmod: %" PRIu64 ", instructions: low %" PRIu64 ", %f / high %" PRIu64 ", %f",mod,maxinst[0],instlimit[0],maxinst[1],instlimit[1]);
		fflush(0);
		free(argval);
		free(argarr);
		free(param);
	}
	SicoFree(st);
	free(source);
	printf("\npassed\n\n");
}


//---------------------------------------------------------------------------------
// int.shr


void IntShrTest(void) {
	printf("Testing int.shr\n");
	const char* header=R"(
		main:
			0 ? int.shr .arg0 .arg1 .arg2
			0-1 0 ?-2
			0 0 0 0 0
			.arg0: 0
			.arg1: 0
			.arg2: 0
			.argn:

	)";
	char* source=SicoLoadFunction("../library/int.sico","int.shr",header);
	SicoState* st=SicoCreate();
	for (u64 bits=8;bits<12;bits++) {
		u64 mod=1<<bits;
		st->mod=mod;
		// Load the st source with the current mod.
		SicoParseAssembly(st,source);
		if (st->state!=SICO_RUNNING) {
			printf("%s",st->statestr);
			exit(0);
		}
		SicoRun(st,(u32)-1);
		u64 main=SicoFindLabel(st,"main");
		u64 func=SicoGetMem(st,main+2);
		u64 arg0=SicoFindLabel(st,"main.arg0");
		u64 args=SicoFindLabel(st,"main.argn")-arg0;
		u64 startrand=arg0-main-args-5;
		// Randomize the parameter order.
		u64 params=mod*bits*2;
		u64* param=(u64*)malloc(params*sizeof(u64));
		SicoRandShuffle(param,params,1);
		u64* argarr=(u64*)malloc(args*sizeof(u64));
		u64* argval=(u64*)malloc(args*sizeof(u64));
		u64 maxinst=0;
		u64 instlimit=43+8*bits;
		for (u64 p0=0;p0<params;p0++) {
			// Calculate the expected return value.
			u64 p=param[p0];
			u64 a=p%mod,s=p/mod;
			u64 calcshr=a;
			u64 half=SicoIsNeg(a,mod)?mod/2:0;
			for (u64 i=0;i<s && i<bits;i++) {calcshr=half|(calcshr>>1);}
			// Randomize the argument order.
			u64 start=(SicoRandu64()%startrand)+main;
			SicoRandShuffle(argarr,args,1);
			// See if duplicate argument addresses will cause errors.
			argarr[0]=argarr[SicoRandu32()%3];
			for (u64 i=0;i<args;i++) {
				argarr[i]+=arg0;
				SicoSetMem(st,start+3+i,argarr[i]);
				argval[i]=SicoRandu64()%mod;
			}
			// Setup the function and abort instructions.
			SicoSetMem(st,start+0,0);
			SicoSetMem(st,start+1,start+1);
			SicoSetMem(st,start+2,func);
			SicoSetMem(st,start+3+args,mod-1);
			SicoSetMem(st,start+5+args,start+3+args);
			// Reset SICO state and write parameters to memory.
			st->ip=start;
			st->state=SICO_RUNNING;
			st->insts=(u64)-1;
			argval[1]=a;
			argval[2]=s;
			for (u64 i=0;i<args;i++) {
				SicoSetMem(st,argarr[i],argval[i]);
			}
			SicoRun(st,(u32)-1);
			if (maxinst<st->insts) {
				maxinst=st->insts;
			}
			u32 error=0;
			if (st->insts>instlimit) {
				printf("\ntoo many instructions: %" PRIu64 ", %" PRIu64,st->insts,instlimit);
				error=1;
			}
			// Make sure the function cleaned up correctly.
			if (SicoGetMem(st,0)) {
				printf("\n0 address not zero");
				error=1;
			}
			if (st->ip!=start+3+args) {
				printf("\ndidn't return: %" PRIu64 ", %" PRIu64,st->ip,start+3+args);
				error=1;
			}
			// Check the return value.
			u64 retshr=SicoGetMem(st,argarr[0]);
			if (calcshr!=retshr) {
				printf("\nreturn: %" PRIu64 "\nexpect: %" PRIu64,retshr,calcshr);
				error=1;
			}
			if (error) {
				printf("\nmod : %" PRIu64 "\n",mod);
				printf("args: ");
				for (u64 i=0;i<args;i++) {
					printf("%" PRIu64 ", ",argval[i]);
				}
				printf("\n");
				exit(0);
			}
		}
		printf("\rmod: %" PRIu64 ", instructions: %" PRIu64 ", %" PRIu64,mod,maxinst,instlimit);
		fflush(0);
		free(argval);
		free(argarr);
		free(param);
	}
	SicoFree(st);
	free(source);
	printf("\npassed\n\n");
}


//---------------------------------------------------------------------------------
// main


int main(void) {
	IntWriteStringTest();
	IntReadStringTest();
	IntCmpTest();
	IntMinTest();
	IntMaxTest();
	IntAbsTest();
	IntMulTest();
	IntDivTest();
	IntShrTest();
	return 0;
}
