/*------------------------------------------------------------------------------


sico_test.c - v1.15

Copyright 2020 Alec Dee - MIT license - SPDX: MIT
deegen1.github.io - akdee144@gmail.com


--------------------------------------------------------------------------------
Testing


We have a list of test cases which include

     SICO source code
     Expected console output
     Expected state value
     Expected state message

Tests make sure that the interpreter catches expected syntax errors, reports
errors correctly, and processes SICO programs correctly.


--------------------------------------------------------------------------------
Compiling


Run "./sico_test" for default tests, or "./sico_test file.sico" for files.

Linux C:
rm sico_test;gcc -fsanitize=address -fsanitize=undefined sico_test.c -o\
sico_test;./sico_test

Linux C++:
rm sico_test;g++ -fsanitize=address -fsanitize=undefined sico_test.c -o\
sico_test;./sico_test

Windows:
From MSVC console
cl /W4 /WX sico_test.c
.\sico_test.exe


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

// Replace putchar() with SicoPutChar() to capture stdout.
// Replace main() with sicomain() to avoid having two main's.
#define _CRT_SECURE_NO_WARNINGS
#include <stdio.h>
#include <time.h>
void SicoPutChar(char c);
int  SicoGetChar(void);
#define putchar SicoPutChar
#define getchar SicoGetChar
#define main sicomain
#include "../../sico.c"
#undef main
#undef getchar
#undef putchar


//---------------------------------------------------------------------------------
// Test Cases


typedef struct SicoTest {
	const char* code;
	const char* out;
	u32 state;
	const char* statestr;
} SicoTest;

SicoTest sicotests[]={
	// Make sure that the tester won't run forever.
	{"","",SICO_RUNNING,""},
	{0,"",SICO_RUNNING,""},
	// Invalid character ranges.
	{"\x01","",SICO_ERROR_PARSER,"Parser: Unexpected token\nLine  : 1\n\n\t\n\t\n\n"},
	{"\x08","",SICO_ERROR_PARSER,"Parser: Unexpected token\nLine  : 1\n\n\t\n\t\n\n"},
	{"\x0b","",SICO_ERROR_PARSER,"Parser: Unexpected token\nLine  : 1\n\n\t\n\t\n\n"},
	{"\x0c","",SICO_ERROR_PARSER,"Parser: Unexpected token\nLine  : 1\n\n\t\n\t\n\n"},
	{"\x0e","",SICO_ERROR_PARSER,"Parser: Unexpected token\nLine  : 1\n\n\t\n\t\n\n"},
	{"\x1f","",SICO_ERROR_PARSER,"Parser: Unexpected token\nLine  : 1\n\n\t\n\t\n\n"},
	{"\x21","",SICO_ERROR_PARSER,"Parser: Unexpected token\nLine  : 1\n\n\t!\n\t^\n\n"},
	{"\x22","",SICO_ERROR_PARSER,"Parser: Unexpected token\nLine  : 1\n\n\t\"\n\t^\n\n"},
	{"\x24","",SICO_ERROR_PARSER,"Parser: Unexpected token\nLine  : 1\n\n\t$\n\t^\n\n"},
	{"\x2a","",SICO_ERROR_PARSER,"Parser: Unexpected token\nLine  : 1\n\n\t*\n\t^\n\n"},
	{"\x2c","",SICO_ERROR_PARSER,"Parser: Unexpected token\nLine  : 1\n\n\t,\n\t^\n\n"},
	{"\x2f","",SICO_ERROR_PARSER,"Parser: Unexpected token\nLine  : 1\n\n\t/\n\t^\n\n"},
	{"\x3b","",SICO_ERROR_PARSER,"Parser: Unexpected token\nLine  : 1\n\n\t;\n\t^\n\n"},
	{"\x3e","",SICO_ERROR_PARSER,"Parser: Unexpected token\nLine  : 1\n\n\t>\n\t^\n\n"},
	{"\x40","",SICO_ERROR_PARSER,"Parser: Unexpected token\nLine  : 1\n\n\t@\n\t^\n\n"},
	{"\x5b","",SICO_ERROR_PARSER,"Parser: Unexpected token\nLine  : 1\n\n\t[\n\t^\n\n"},
	{"\x5e","",SICO_ERROR_PARSER,"Parser: Unexpected token\nLine  : 1\n\n\t^\n\t^\n\n"},
	{"\x60","",SICO_ERROR_PARSER,"Parser: Unexpected token\nLine  : 1\n\n\t`\n\t^\n\n"},
	{"\x7b","",SICO_ERROR_PARSER,"Parser: Unexpected token\nLine  : 1\n\n\t{\n\t^\n\n"},
	{"\x7f","",SICO_ERROR_PARSER,"Parser: Unexpected token\nLine  : 1\n\n\t\x7f\n\t^\n\n"},
	// Numbers
	{"18446744073709551615 0x8000 0","",SICO_COMPLETE,""},
	{"0xffffffffffffffff 8000 0","",SICO_COMPLETE,""},
	// Arithmetic
	{"0-1 1-2+0x21 0","",SICO_COMPLETE,""},
	{"0-1 1+2 0","",SICO_COMPLETE,""},
	{"+","",SICO_ERROR_PARSER,"Parser: Leading operator\nLine  : 1\n\n\t+\n\t^\n\n"},
	{"+1","",SICO_ERROR_PARSER,"Parser: Leading operator\nLine  : 1\n\n\t+1\n\t^ \n\n"},
	{"1+","",SICO_ERROR_PARSER,"Parser: Trailing operator\nLine  : 1\n\n\t1+\n\t ^\n\n"},
	{"1+ ","",SICO_ERROR_PARSER,"Parser: Trailing operator\nLine  : 1\n\n\t1+\n\t ^\n\n"},
	{"1 + ","",SICO_ERROR_PARSER,"Parser: Trailing operator\nLine  : 1\n\n\t1 +\n\t  ^\n\n"},
	{"1 - #comment\n","",SICO_ERROR_PARSER,"Parser: Trailing operator\nLine  : 1\n\n\t1 - #comment\n\t  ^^^^^^^^^^\n\n"},
	{"1 - #comment\n2","",SICO_COMPLETE,""},
	{"1 - #comment\n+ 2","",SICO_ERROR_PARSER,"Parser: Double operator\nLine  : 2\n\n\t+ 2\n\t^  \n\n"},
	{"1 - #||#2","",SICO_COMPLETE,""},
	// "0x"="0x0"
	{"6 7 0\n0-1 0 0\n1 0x","",SICO_COMPLETE,""},
	{"7 6 0\n0-1 0 0\n0x 1","",SICO_COMPLETE,""},
	// Test if writing to 1 will print to stdout.
	{"0-2 15 ?+1 0-2 16 ?+1 0-2 17 ?+1 0-2 15 ?+1 0-1 0 0 65 66 67","ABCA",SICO_COMPLETE,""},
	// Test hex lower and upper case.
	{
		"30 31  3 37 30 27 0-2 34 ?+1\n"
		"31 32 12 37 31 27 0-2 35 ?+1\n"
		"32 33 21 37 32 27 0-2 36 ?+1\n"
		"0-1 0 0\n"
		"0xabcdef 0xAbCdEf 0Xabcdef 0XAbCdEf\n"
		"48 49 50 1",
		"012",SICO_COMPLETE,""
	},
	{"0xefg","",SICO_ERROR_PARSER,"Parser: Unseparated tokens\nLine  : 1\n\n\t0xefg\n\t^^^^ \n\n"},
	// ASCII Literals
	{"0-2 char ?+1 0-1 0 0 char:'x","x",SICO_COMPLETE,""},
	{"'A'b","",SICO_ERROR_PARSER,"Parser: Unseparated tokens\nLine  : 1\n\n\t'A'b\n\t^^  \n\n"},
	// Labels
	{"lbl","",SICO_ERROR_PARSER,"Parser: Unable to find label\nLine  : 1\n\n\tlbl\n\t^^^\n\n"},
	{"lbl: 0-1 0 0","",SICO_COMPLETE,""},
	{"lbl:lbl2: 0-1 0 0","",SICO_COMPLETE,""},
	{"lbl: lbl-1 0 lbl","",SICO_COMPLETE,""},
	{":","",SICO_ERROR_PARSER,"Parser: Unexpected token\nLine  : 1\n\n\t:\n\t^\n\n"},
	{"0+lbl:0","",SICO_ERROR_PARSER,"Parser: Operating on declaration\nLine  : 1\n\n\t0+lbl:0\n\t  ^^^^ \n\n"},
	{"0 lbl:+0","",SICO_ERROR_PARSER,"Parser: Operating on declaration\nLine  : 1\n\n\t0 lbl:+0\n\t      ^ \n\n"},
	{"?-1 0 0","",SICO_COMPLETE,""},
	{"?-1 ?-1 0","",SICO_COMPLETE,""},
	{"0-1+? 0 ?-2","",SICO_COMPLETE,""},
	{"0?","",SICO_ERROR_PARSER,"Parser: Unseparated tokens\nLine  : 1\n\n\t0?\n\t^ \n\n"},
	{"?0","",SICO_ERROR_PARSER,"Parser: Unseparated tokens\nLine  : 1\n\n\t?0\n\t^ \n\n"},
	{"lbl?","",SICO_ERROR_PARSER,"Parser: Unseparated tokens\nLine  : 1\n\n\tlbl?\n\t^^^ \n\n"},
	{"?lbl","",SICO_ERROR_PARSER,"Parser: Unseparated tokens\nLine  : 1\n\n\t?lbl\n\t^   \n\n"},
	{"?:","",SICO_ERROR_PARSER,"Parser: Unexpected token\nLine  : 1\n\n\t?:\n\t ^\n\n"},
	{"lbl: :","",SICO_ERROR_PARSER,"Parser: Unexpected token\nLine  : 1\n\n\tlbl: :\n\t     ^\n\n"},
	{"zero:zero-one one:one-one zero","",SICO_COMPLETE,""},
	{"lbl: lbl: 0-1 0 0","",SICO_ERROR_PARSER,"Parser: Duplicate label declaration\nLine  : 1\n\n\tlbl: lbl: 0-1 0 0\n\t     ^^^^        \n\n"},
	{"lbl: LBL: 0-1 0 0","",SICO_COMPLETE,""},
	// Sublabels
	{".x","",SICO_ERROR_PARSER,"Parser: Unable to find label\nLine  : 1\n\n\t.x\n\t^^\n\n"},
	{".","",SICO_ERROR_PARSER,"Parser: Unable to find label\nLine  : 1\n\n\t.\n\t^\n\n"},
	{"lbl: .","",SICO_ERROR_PARSER,"Parser: Unable to find label\nLine  : 1\n\n\tlbl: .\n\t     ^\n\n"},
	{"lbl: .: 0-1 0 0","",SICO_COMPLETE,""},
	{"lbl: ..: 0-1 0 0","",SICO_COMPLETE,""},
	{"lbl:..x: 0-1 0 0","",SICO_COMPLETE,""},
	{"lbl:...x: 0-1 0 0","",SICO_COMPLETE,""},
	{".: 0-1 0 0","",SICO_COMPLETE,""},
	{"..: 0-1 0 0","",SICO_COMPLETE,""},
	{"lbl.x:0-1 0 0","",SICO_COMPLETE,""},
	{"lbl: .1:0-1 1 lbl.1","",SICO_COMPLETE,""},
	{"lbl: .x-2 lbl.x:0 0","",SICO_COMPLETE,""},
	{"lbl.tmp: .x-2 lbl.tmp.x:0 0","",SICO_COMPLETE,""},
	{"lbl: .x:0-1 lbl.x:0 0","",SICO_ERROR_PARSER,"Parser: Duplicate label declaration\nLine  : 1\n\n\tlbl: .x:0-1 lbl.x:0 0\n\t            ^^^^^^   \n\n"},
	{"lbl.x:0-1 lbl: .x:0 0","",SICO_ERROR_PARSER,"Parser: Duplicate label declaration\nLine  : 1\n\n\tlbl.x:0-1 lbl: .x:0 0\n\t               ^^^   \n\n"},
	{"lbl0: .x:0-1 lbl1: .y:0 0","",SICO_COMPLETE,""},
	// {"lbl: .x:.x.y-2 ..y:0 0 lbl.x.y","",SICO_COMPLETE,""},
	// Comments
	{"#","",SICO_RUNNING,""},
	{"#\n0-2 4 ?+1 0-1 65 0","A",SICO_COMPLETE,""},
	{"#Hello\n0-1 0 0","",SICO_COMPLETE,""},
	{"#||#0-1 0 0","",SICO_COMPLETE,""},
	{"##|\n0-1 0 0","",SICO_COMPLETE,""},
	{"|#0-1 0 0","",SICO_ERROR_PARSER,"Parser: Unexpected token\nLine  : 1\n\n\t|#0-1 0 0\n\t^        \n\n"},
	{"0-2 6 ?+1 0-1 0 0 65\n#","A",SICO_COMPLETE,""},
	{"0-2 6 ?+1 0-1 0 0 65\n#abc","A",SICO_COMPLETE,""},
	{"#|\ncomment\n|#\n0-1 0 0","",SICO_COMPLETE,""},
	{"lbl1: 0-1 lbl2: lbl1#|comment|#lbl1 0","",SICO_COMPLETE,""},
	{"#|","",SICO_ERROR_PARSER,"Parser: Unterminated block quote\nLine  : 1\n\n\t#|\n\t^^\n\n"},
	{"# |#\n0-2 6 ?+1 0-1 0 0 66","B",SICO_COMPLETE,""},
	{"#|#0-1 0 0","",SICO_ERROR_PARSER,"Parser: Unterminated block quote\nLine  : 1\n\n\t#|#0-1 0 0\n\t^^^^^^^^^^\n\n"},
	// Self modification test. Make sure that we can modify A, B, and C as expected.
	// Tests if an instruction can modify its jump operand without affecting its jump.
	{
		"?+2 neg+0  ?+1\n"
		"0-2 char+0 ?+1\n"
		"?+2 neg+1  ?+1\n"
		"0-2 char+1 ?+1\n"
		"?+2 neg+2  ?+1\n"
		"0-2 char+2 ?+1\n"
		"?+2 neg+3  ?+1\n"
		"0-2 char+3 ?+1\n"
		"0-1 0 0\n"
		" neg:4 10 16 22\n"
		"char:65 'B 67 10",
		"ABC\n",SICO_COMPLETE,""
	},
	// Prints "Hello, World!". Also tests UTF-8 support.
	{
		"m\xc3\xa5in:\n"
		"       .len  one neg #if len=0, abort\n"
		"       0-2   .data ?+1 #print a letter \xc2\xaf\\_(\xe3\x83\x84)_/\xc2\xaf\n"
		"       0-2+? neg m\xc3\xa5in   #increment pointer and loop\n"
		".data: 'H 'e 108 108 111 44 0x20  #Hello,\n"
		"       87 111 114 108 100 '! 10   #World!\n"
		"m\xc3\xa5in.len: m\xc3\xa5in.len-m\xc3\xa5in.data+1\n"
		"neg:0-1 one:1 0",
		"Hello, World!\n",SICO_COMPLETE,""
	},
	// Memory
	// Writing 0 to a high memory cell should do nothing.
	{"0x7fffffffffffffff val 3 0-1 0 val:0","",SICO_COMPLETE,""},
	// The memory allocation in sico.c should safely fail if we write to a high
	// address.
	{"0x7fffffffffffffff val 3 0-1 0 val:1","",SICO_ERROR_MEMORY,"Failed to allocate memory.\nIndex: 9223372036854775807\n"},
	// Parser whitespace trimming.
	{
		"   \r \t  \n"
		"   aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa  \n"
		"   #end",
		"",SICO_ERROR_PARSER,
		"Parser: Unable to find label\nLine  : 2\n\n\taaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\n\t^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^\n\n"
	},
	{
		"   \r \t  \n"
		"   b aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa  \n"
		"   b: #end",
		"",SICO_ERROR_PARSER,
		"Parser: Unable to find label\nLine  : 2\n\n\tb aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\n\t  ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^\n\n"
	},
	{
		"   \r \t  \n"
		"   aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa b  \n"
		"   b: #end",
		"",SICO_ERROR_PARSER,
		"Parser: Unable to find label\nLine  : 2\n\n\taaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\n\t^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^\n\n"
	},
	{
		"   \r \t  \n"
		"   aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa b  \n"
		"   aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa: #end\n",
		"",SICO_ERROR_PARSER,
		"Parser: Unable to find label\nLine  : 2\n\n\taaaaaaaaaaaaaaaaaaaaaaaaaaaaa b\n\t                              ^\n\n"
	}
};


//---------------------------------------------------------------------------------
// Testing


// A helper function used to capture stdout.
char sicobufstr[512]={0};
u32  sicobufpos=0;
void SicoPutChar(char c) {
	if (c==0) {return;}
	if (sicobufpos+1<sizeof(sicobufstr)) {
		sicobufstr[sicobufpos++]=c;
	}
}

int SicoGetChar(void) {
	printf("Failed: called stdin\n");
	exit(1);
}

void SicoPrint(const char* src) {
	// Print a string and show escaped characters.
	if (src==0) {return;}
	char esc[256];
	memset(esc,0,sizeof(esc));
	esc['\n']='n';
	esc['\r']='r';
	esc['\t']='t';
	esc['\b']='b';
	esc['\"']='"';
	esc['\\']='\\';
	while (*src) {
		unsigned char c=(unsigned char)*src++;
		if (c>127) {
			printf("\\x%x%x",c>>4,c&15);
		} else if (esc[c]) {
			printf("\\%c",esc[c]);
		} else {
			printf("%c",c);
		}
	}
}

u64 SicoRand(void) {
	// Generate a random, uniformly distributed 64 bit integer.
	static u64 state=0,inc=0;
	if (inc==0) {
		inc=((u64)&inc)^((u64)clock());
		inc=SicoRand()|1;
		state=((u64)&state)^((u64)clock());
		printf("PRNG seed: %" PRIu64 ", %" PRIu64 "\n",state,inc);
	}
	u64 hash=state+=inc;
	hash+=hash<<21;hash^=hash>>44;
	hash+=hash<<18;hash^=hash>>30;
	hash+=hash<<25;hash^=hash>>33;
	hash+=hash<<40;hash^=hash>> 5;
	hash+=hash<<10;hash^=hash>>16;
	return hash;
}

int main(int argc,char** argv) {
	printf("Testing SICO interpreter\n");
	if (argc>1) {
		// Load a file and run it.
		printf("Loading %s\n\n",argv[1]);
		SicoState* st=SicoCreate();
		SicoParseFile(st,argv[1]);
		while (st->state==SICO_RUNNING) {
			SicoRun(st,SicoRand()&127);
		}
		sicobufstr[sicobufpos]=0;
		printf("%s",sicobufstr);
		sicobufpos=0;
		SicoPrintState(st);
		SicoFree(st);
	} else {
		// Run syntax tests.
		u32 tests=sizeof(sicotests)/sizeof(SicoTest);
		printf("Tests: %u\n\n",tests);
		for (u32 i=0;i<tests;i++) {
			// Load our next test.
			SicoTest* test=sicotests+i;
			printf("Test %u\nsource  : ",i+1);
			SicoPrint(test->code);
			printf("\n");
			// Run the test code.
			SicoState* st=SicoCreate();
			SicoParseAssembly(st,test->code);
			for (u32 j=0;j<1024 && st->state==SICO_RUNNING;) {
				u32 insts=((u32)SicoRand())&15;
				SicoRun(st,insts);
				j+=insts;
			}
			// Print what we expect.
			printf("expected: ");
			SicoPrint(test->out);
			printf(", %d, ",test->state);
			SicoPrint(test->statestr);
			printf("\n");
			// Print what we actually got.
			printf("returned: ");
			sicobufstr[sicobufpos]=0;
			SicoPrint(sicobufstr);
			sicobufpos=0;
			printf(", %d, ",st->state);
			SicoPrint(st->statestr);
			printf("\n\n");
			// Compare the two.
			if (strcmp(test->out,sicobufstr) || test->state!=st->state || strcmp(test->statestr,st->statestr)) {
				printf("Failed\n");
				printf("%s\n",st->statestr);
				return 1;
			}
			SicoFree(st);
		}
	}
	printf("Passed\n");
	return 0;
}
