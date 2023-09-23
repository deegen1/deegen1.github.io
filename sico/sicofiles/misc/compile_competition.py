#!/usr/bin/python3
"""
Create sico_competition.cpp for use in programming competitions.
Slightly modifies sico.c to allow for multiline string literals.
Automatically includes the master library.
"""


import os,re,sys,shutil


#---------------------------------------------------------------------------------
# Global Variables


# Directory helpers
pydir=os.path.dirname(os.path.abspath(__file__))
webdir=os.path.realpath(os.path.join(pydir,"../../libraries"))
cmpdir=os.path.realpath(os.path.join(pydir,"../compiled"))
libdir=os.path.realpath(os.path.join(pydir,"../library"))
mscdir=os.path.realpath(os.path.join(pydir,"../misc"))

def webjoin(path): return os.path.join(webdir,path)
def cmpjoin(path): return os.path.join(cmpdir,path)
def libjoin(path): return os.path.join(libdir,path)
def mscjoin(path): return os.path.join(mscdir,path)

def loadfile(path):
	with open(path,"r") as f:
		return "".join(f.readlines())
	raise "failed to load file"


#---------------------------------------------------------------------------------
# Library Compression


def RCBWTSort(data):
	# tmparr>=(len*2+257)*sizeof(u32)
	# The maximum number of bits it takes to encode len. Used for radix sort.
	datalen=len(data)
	bits=0
	while (1<<bits)<datalen: bits+=8
	suf=[None]*datalen
	rank=[None]*datalen
	group=[None]*(datalen+1)
	count=[0]*256
	# perform order 1 sort, split into groups based on char value
	for d in data: count[d]+=1
	prev=datalen
	start=0
	for i in range(256):
		if count[i]>1:
			group[prev]=start
			prev=start
			group[prev+1]=start+count[i]
		tmp=count[i]
		count[i]=start
		start+=tmp
	group[prev]=datalen
	for i in range(datalen):
		rank[i]=count[data[i]]
	for i in range(datalen):
		suf[count[data[i]]]=i
		count[data[i]]+=1
	# the array is 'step' sorted, now sort by 2*step
	step=1
	while group[datalen]<datalen and step<datalen:
		prev=datalen
		start=group[prev]
		while start<datalen:
			next=group[start]
			stop=group[start+1]
			size=stop-start
			if size<72:
				# Insertion sort.
				for i in range(start+1,stop):
					t=i
					pos=suf[t]
					val=rank[(pos+step)%datalen]
					while t>start and val<rank[(suf[t-1]+step)%datalen]:
						suf[t]=suf[t-1]
						t-=1
					suf[t]=pos
			else:
				# Radix sort.
				src=suf
				dst=group
				for shift in range(0,bits,8):
					count=[0]*256
					for i in range(start,stop):
						byte=(rank[(src[i]+step)%datalen]>>shift)&255
						count[byte]+=1
					sum=start
					for i in range(256):
						tmp=count[i]
						count[i]=sum
						sum+=tmp
					for i in range(start,stop):
						byte=(rank[(src[i]+step)%datalen]>>shift)&255
						dst[count[byte]]=src[i]
						count[byte]+=1
					src,dst=dst,src
				for i in range(start,start+size):
					suf[i]=src[i]
			# find new ranks based on 2*step-sorted suffixes
			r=start
			group[start]=r
			for i in range(start+1,stop):
				if rank[(suf[i-1]+step)%datalen]<rank[(suf[i]+step)%datalen]:
					r=i
				group[i]=r
			for i in range(start+1,stop):
				rank[suf[i]]=group[i]
			# break up into subgroups
			# i==stop is necessary since group[i] might accidentally equal
			# group[start] depending on how the group array is initialized.
			# Initialize with: group[i]=rand(datalen).
			for i in range(start+1,stop+1):
				if group[i]!=group[start] or i==stop:
					if i-start>1:
						group[prev]=start
						prev=start
						group[prev+1]=i
					start=i
			group[prev]=next
			start=next
		step+=step
	return suf

def RCBWTEnc(indata):
	tmpdata=indata[:]
	inlen=len(indata)
	rank=RCBWTSort(tmpdata)
	index=0
	for i in range(inlen):
		val=rank[i]
		if val==0: val,index=inlen,i
		indata[i]=tmpdata[val-1]
	return index

def RCMTFEnc(indata):
	inlen=len(indata)
	mtf=list(range(256))
	for i in range(inlen):
		val=indata[i]
		pos=0
		last=mtf[0]
		while mtf[pos]!=val:
			tmp=mtf[pos]
			mtf[pos]=last
			last=tmp
			pos+=1
		mtf[0]=mtf[pos]
		mtf[pos]=last
		indata[i]=pos

class RangeEncoder(object):
	base64enc="0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz._"

	def __init__(self,encoding,bits=32):
		"""If encoding=True, intialize and support encoding operations. Otherwise,
		support decoding operations. More state bits will give better encoding
		accuracy at the cost of speed."""
		assert(encoding==False or encoding==True)
		assert(bits>0)
		self.outdata=[]
		self.outpos=0
		self.encoding=encoding
		self.finished=False
		# Range state.
		self.bits=bits
		self.norm=1<<bits
		self.half=self.norm>>1
		self.low=0
		self.range=self.norm if encoding else 1
		# Bit queue for data we're ready to input or output.
		qmask=(bits*4-1)|8
		while qmask&(qmask+1): qmask|=qmask>>1
		self.qmask=qmask
		self.qcount=[0]*(qmask+1)
		self.qlen=0
		self.qpos=0

	def encode(self,intlow,inthigh,intden):
		"""Encode an interval into the range."""
		assert(self.encoding and self.finished==False)
		assert(0<=intlow and intlow<inthigh and inthigh<=intden and intden<=self.half+1)
		assert(self.qlen<=(self.qmask>>1))
		qmask=self.qmask
		qcount=self.qcount
		qpos=self.qpos
		qlen=self.qlen
		# Shift the range.
		half=self.half
		low=self.low
		range=self.range
		while range<=half:
			# Push a settled state bit the to queue.
			dif=qpos^((low&half)!=0)
			qpos=(qpos+(dif&1))&qmask
			qlen+=qcount[qpos]==0
			qcount[qpos]+=1
			low+=low
			range+=range
		norm=self.norm
		low&=norm-1
		# Scale the range to fit in the interval.
		off=(range*intlow)//intden
		low+=off
		range=(range*inthigh)//intden-off
		# If we need to carry.
		if low>=norm:
			# Propagate a carry up our queue. If the previous bits were 0's, flip one to 1.
			# Otherwise, flip all 1's to 0's.
			low-=norm
			# If we're on an odd parity, align us with an even parity.
			odd=qpos&1
			ones=qcount[qpos]&-odd
			qcount[qpos]-=ones
			qpos-=odd
			# Even parity carry operation.
			qcount[qpos]-=1
			inc=1 if qcount[qpos] else -1
			qpos=(qpos+inc)&qmask
			qcount[qpos]+=1
			# Length correction.
			qlen+=inc
			qlen+=qlen<=odd
			# If we were on an odd parity, add in the 1's-turned-0's.
			qpos=(qpos+odd)&qmask
			qcount[qpos]+=ones
		self.low=low
		self.range=range
		self.qpos=qpos
		self.qlen=qlen
		self.adddata()

	def finish(self):
		"""Flush the remaining data from the range."""
		if self.finished: return
		self.finished=True
		if self.encoding==False:
			# We have no more data to decode. Pad the queue with 1's from now on.
			return
		assert(self.qlen<=(self.qmask>>1))
		# We have no more data to encode. Flush out the minimum number of bits necessary
		# to satisfy low<=flush+1's<low+range. Then pad with 1's till we're byte aligned.
		qmask=self.qmask
		qcount=self.qcount
		qpos=self.qpos
		qlen=self.qlen
		low=self.low
		norm=self.norm
		dif=low^(low+self.range)
		while dif<norm:
			low+=low
			dif+=dif
			flip=qpos^((low&norm)!=0)
			qpos=(qpos+(flip&1))&qmask
			qlen+=qcount[qpos]==0
			qcount[qpos]+=1
		# Calculate how many bits need to be appended to be byte aligned.
		pad=0
		for i in range(qlen):
			pad+=qcount[(qpos-i)&qmask]
		pad%=6
		# If we're not byte aligned.
		if pad!=0:
			# Align us with an odd parity and add the pad. Add 1 to qlen if qpos&1=0.
			qlen-=qpos
			qpos|=1
			qlen+=qpos
			qcount[qpos]+=6-pad
		self.qpos=qpos
		self.qlen=qlen
		self.adddata()

	def adddata(self):
		"""If data is ready to be output, write to our array"""
		assert(self.encoding)
		while True:
			qlen=self.qlen
			if qlen<6+2 and (self.finished==False or qlen==0):
				break
			# Go back from the end of the queue and shift bits into ret. If we use all bits at
			# a position, advance the position.
			qmask=self.qmask
			orig=self.qpos+1
			qpos=orig-qlen
			qcount=self.qcount
			ret=0
			for i in range(6):
				ret+=ret+(qpos&1)
				pos=qpos&qmask
				qcount[pos]-=1
				qpos+=qcount[pos]==0
			self.qlen=orig-qpos
			# Add the data
			pos=self.outpos
			data=self.outdata
			if pos+2>=len(data):
				data+=[0]*(pos+2)
			if pos%80==79:
				data[pos]="\n"
				pos+=1
			data[pos]=self.base64enc[ret]
			pos+=1
			self.outpos=pos

def RCCompress(instr):
	data=[ord(c) for c in instr]
	datalen=len(data)
	bwtindex=RCBWTEnc(data)
	RCMTFEnc(data)
	rc=RangeEncoder(True)
	rc.encode(datalen,datalen+1,0x7fffffff)
	rc.encode(bwtindex,bwtindex+1,datalen)
	prob=[0]*256
	for d in data: prob[d]+=1
	remlen=datalen+1
	for p in prob:
		rc.encode(p,p+1,remlen)
		remlen-=p
	prob=[0]+prob
	for i in range(1,257):
		prob[i]+=prob[i-1]
	for d in data:
		rc.encode(prob[d],prob[d+1],datalen)
	rc.finish()
	ret="".join(rc.outdata[:rc.outpos])
	return ret


#---------------------------------------------------------------------------------
# Source Definition


sico=loadfile(os.path.join(pydir,"../../sico.c"))
sicoMaster=loadfile(cmpjoin("master.sico"))
sicoHeader="""
0 0 main

main:
	# mem.debug mem.debug ?+1
	# 0 ? string.print 's 't 'a 'r 't 10 0

	0 ? string.create .input
	0 ? string.input .input

	0 ? mem.getidx .strlen .input string.struct.len
	0 ? mem.getidx .strptr .input string.struct.ptr
	0 ? uint.read .strptr .strlen 0 .tmp .cases .base

.caseloop:
	0 ? uint.cmp .case .cases ?+3 ?+2 .casedone
	0 ? string.print 'C 'a 's 'e '  '# string.uint .case ': 10 0
	.case .z-1 .caseloop
.casedone:

	# 0 ? string.print 'd 'o 'n 'e 10 0

	0 ? string.free .input
	0 ? mem.alloc.verifyfree

	0-1 0 ?-2

	# Variables
	0-1 .z:0 1
	.tmp: 0
	.base: 10
	.input: 0
	.case: 1
	.cases: 0
	.strptr: 0
	.strlen: 0
"""

replaceFull=(
(" -o sico"," -o sico ; ./sico < input.txt"),
("sico.c","sico_comp_full.cpp"),
("#define _CRT_SECURE_NO_WARNINGS",
"""#if defined(__GNUC__)
	#pragma GCC diagnostic error "-Wall"
	#pragma GCC diagnostic error "-Wextra"
	#pragma GCC diagnostic error "-Wpedantic"
	#pragma GCC diagnostic error "-Wformat=1"
	#pragma GCC diagnostic error "-Wconversion"
	#pragma GCC diagnostic error "-Wshadow"
	#pragma GCC diagnostic error "-Wundef"
	#pragma GCC diagnostic error "-Winit-self"
	#pragma GCC diagnostic ignored "-Woverlength-strings"
#elif defined(_MSC_VER)
	#pragma warning(push,4)
#endif\n
#define _CRT_SECURE_NO_WARNINGS"""),
("int main([\\s\\S]*?)\\n\\}",
"""int main(void) {
	SicoState* st=SicoCreate();
	SicoParseAssembly(st,SicoSource);
	// Main loop.
	SicoRun(st,(u32)-1);
	// Exit and print the status if there was an error.
	u32 ret=st->state;
	if (ret!=SICO_COMPLETE) {SicoPrintState(st);}
	SicoFree(st);
	// Always return 0 or codejam will delete the output.
	return 0;
}"""),
("// The SICO interpreter state.",
"""// Competition Source Code\n\n
const char* SicoSource=R"(\n\n"""+sicoHeader+"\n\n"+sicoMaster+"""\n)";\n\n
//---------------------------------------------------------------------------------
// The SICO interpreter state.""")
)


replaceCompressed=(
(" -o sico"," -o sico ; ./sico < input.txt"),
("sico.c","sico_comp_min.cpp"),
("#define _CRT_SECURE_NO_WARNINGS",
"""#if defined(__GNUC__)
	#pragma GCC diagnostic ignored "-Woverlength-strings"
#endif\n
#define _CRT_SECURE_NO_WARNINGS"""),
("int main([\\s\\S]*?)\\n\\}",
"""int main(void) {
	SicoDecompress();
	// printf("%s",SicoSource);
	SicoState* st=SicoCreate();
	SicoParseAssembly(st,SicoSource);
	// Main loop.
	SicoRun(st,(u32)-1);
	// Exit and print the status if there was an error.
	u32 ret=st->state;
	if (ret!=SICO_COMPLETE) {SicoPrintState(st);}
	SicoFree(st);
	free(SicoSource);
	// Always return 0 or codejam will delete the output.
	return 0;
}"""),
("// The SICO interpreter state.",
"""// Competition Source Code
// To see the uncompressed source, uncomment printf() in main().


char* SicoSource=0;

const char* SicoMain=R"(\n\n"""+sicoHeader+"""\n\n)";

// A compressed version of the SICO library to keep the program under 100kb.
// To see the uncompressed source, uncomment printf() in main().
const char* SicoLibrary=R"(\n"""+RCCompress(sicoMaster)+"""\n)";

const u8 RCBase64Dec[123]={
	255,  0,  0,  0,  0,  0,  0,  0,  0,  0,
	  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,
	  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,
	  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,
	  0,  0,  0,  0,  0,  0, 95,  0, 64, 96,
	 80,112, 72,104, 88,120, 68,100,  0,  0,
	  0,  0,  0,  0,  0, 84,116, 76,108, 92,
	124, 66, 98, 82,114, 74,106, 90,122, 70,
	102, 86,118, 78,110, 94,126, 65, 97, 81,
	113,  0,  0,  0,  0,127,  0, 73,105, 89,
	121, 69,101, 85,117, 77,109, 93,125, 67,
	 99, 83,115, 75,107, 91,123, 71,103, 87,
	119, 79,111
};

typedef struct RangeEncoder RangeEncoder;

struct RangeEncoder {
	const char* data;
	u32 buf;
	// Range state.
	u64 norm;
	u64 half;
	u64 low;
	u64 range;
};

void RCInit(RangeEncoder* rc,const char* data) {
	u32 bits=32;
	rc->data=data;
	rc->norm=1ULL<<bits;
	rc->half=rc->norm/2;
	rc->low=0;
	rc->range=1;
	rc->buf=0;
}

u32 RCDecode(RangeEncoder* rc,u32 intden) {
	// Given an interval denominator, find a value in [0,intden) that will fall in to
	// some interval.
	u32 buf=rc->buf;
	// Shift the range.
	u64 half=rc->half;
	u64 low=rc->low;
	u64 range=rc->range;
	while (range<=half) {
		while (buf<=1) {
			buf=(u32)*rc->data;
			// If we are reading from a finished stream, pad the entire queue with 1's.
			if (buf) {rc->data++;}
			buf=RCBase64Dec[buf];
		}
		low+=low+(buf&1);
		range+=range;
		buf>>=1;
	}
	rc->low=low;
	rc->range=range;
	rc->buf=buf;
	// Scale low to yield our desired code value.
	return (u32)((low*intden+intden-1)/range);
}

void RCScale(RangeEncoder* rc,u32 intlow,u32 inthigh,u32 intden) {
	// Given an interval, scale the range to fit in the interval.
	u64 range=rc->range;
	u64 off=(range*intlow)/intden;
	rc->low-=off;
	rc->range=(range*inthigh)/intden-off;
}

void RCBWTDec(u8* data,u32 len,u32 index,u32* tmparr) {
	// tmparr>=(len+257)*(u32)+len*(u8)
	u32* next=tmparr;
	u32* count=next+len;
	u8* tmp=(u8*)(count+257);
	memcpy(tmp,data,len*sizeof(u8));
	memset(count,0,257*sizeof(u32));
	count++;
	for (u32 i=0;i<len;i++) {
		count[tmp[i]]++;
	}
	count--;
	for (u32 i=1;i<256;i++) {
		count[i]+=count[i-1];
	}
	for (u32 i=0;i<len;i++) {
		next[count[tmp[i]]++]=i;
	}
	for (u32 i=0;i<len;i++) {
		index=next[index];
		data[i]=tmp[index];
	}
}

void RCMTFDec(u8* data,u32 len) {
	u8 mtf[256];
	for (u32 i=0;i<256;i++) {
		mtf[i]=(u8)i;
	}
	for (u32 i=0;i<len;i++) {
		u8 pos=data[i];
		data[i]=mtf[pos];
		while (pos) {
			mtf[pos]=mtf[pos-1];
			pos--;
		}
		mtf[0]=data[i];
	}
}

void SicoDecompress(void) {
	// Decompress the library and combine it with SicoMain.
	RangeEncoder dec0,*dec=&dec0;
	RCInit(dec,SicoLibrary);
	u32 outlen=RCDecode(dec,0x7fffffff);
	RCScale(dec,outlen,outlen+1,0x7fffffff);
	u32 mainlen=(u32)strlen(SicoMain);
	SicoSource=(char*)malloc((mainlen+outlen+1)*sizeof(char));
	memcpy(SicoSource,SicoMain,mainlen*sizeof(char));
	u8* usource=((u8*)SicoSource)+mainlen;
	u32* tmparr=(u32*)malloc((outlen+257)*sizeof(u32)+outlen*sizeof(u8));
	u32 bwtindex=RCDecode(dec,outlen);
	RCScale(dec,bwtindex,bwtindex+1,outlen);
	// Get the symbol probabilities.
	u32* prob=tmparr;
	prob[0]=0;
	u32 outrem=outlen+1;
	for (u32 i=1;i<257;i++) {
		u32 p=RCDecode(dec,outrem);
		RCScale(dec,p,p+1,outrem);
		prob[i]=p+prob[i-1];
		outrem-=p;
	}
	// Decode symbols.
	for (u32 i=0;i<outlen;i++) {
		u32 decode=RCDecode(dec,outlen);
		u32 sym=1;
		while (prob[sym]<=decode) {sym++;}
		RCScale(dec,prob[sym-1],prob[sym],outlen);
		usource[i]=(u8)(sym-1);
	}
	RCMTFDec(usource,outlen);
	RCBWTDec(usource,outlen,bwtindex,tmparr);
	usource[outlen]=0;
	free(tmparr);
}


//---------------------------------------------------------------------------------
// The SICO interpreter state.""")
)


#---------------------------------------------------------------------------------
# Write Files


if not os.path.isdir(cmpdir): os.mkdir(cmpdir)

tmp=sico+""
for fr in replaceFull: tmp=re.sub(fr[0],fr[1],tmp)
with open(cmpjoin("sico_comp_full.cpp"),"w") as f: f.write(tmp)

tmp=sico+""
for fr in replaceCompressed: tmp=re.sub(fr[0],fr[1],tmp)
with open(cmpjoin("sico_comp_min.cpp"),"w") as f: f.write(tmp)

