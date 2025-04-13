"""
BlackBoxOptimizer.py - v2.00

Copyright 2020 Alec Dee - MIT license - SPDX: MIT
2dee.net - akdee144@gmail.com
"""

import random,math,time


def BBPSON(F,x,iters,params=(200,200,.99)):
	# Bare bones particle swarms with neighbors.
	dim=len(x)
	particles,lifespan,lifeinc=params
	devmax,nbrmax=math.log(1e+30),(particles+4)//3
	gpart,gerr,gpos,pos=None,F(x),x,x[:]
	class Particle(object):
		def __init__(self):
			self.pos=x[:]
			self.err=gerr
			self.life=0
	partarr=[Particle() for i in range(particles)]
	for iter in range(iters-1):
		# Find the best neighbor. Look at +-2^n.
		idx,off=iter%particles,1
		p=partarr[idx]
		n=None if p.life<=0 else p
		while off<nbrmax:
			t=partarr[(idx+off)%particles]
			if n is None or n.err>t.err: n=t
			off=-off<<(off<0)
		npos,ppos=n.pos,p.pos
		if p.life<=0: p.life,p.err,ppos=lifespan,None,npos
		p.life-=1
		# Find a new position between the particle and its best neighbor.
		# If best=self, jitter with an exponential distribution.
		u,dx=random.random(),0
		if ppos is npos:
			u,v=u,random.random()
			dx=math.exp(min((2*v-1)/(v*(1-v)),devmax))
			p.life+=lifeinc
		for i in range(dim):
			px,nx=ppos[i],npos[i]
			pos[i]=random.gauss((px+nx)*0.5,abs(px-nx*u)+dx)
		err=F(pos)
		# Update the particle and global best positions.
		if p.err is None or p.err>err:
			if gerr>err: gpart,gerr=p,err
			elif gpart is p: gpart,gpos,p.pos=None,p.pos,gpos
			p.err,p.pos,pos=err,pos,p.pos
	x[:]=gpart.pos if gpart else gpos
	return gerr


if __name__=="__main__":
	def Rastrigin(x):
		cos,pi,s=math.cos,math.pi*2,0
		for y in x: s+=10*(1-cos(pi*y))+y*y
		return s
	t0=time.time()
	x=[0]*10
	BBPSON(Rastrigin,x,100000)
	print("time: {0:.6f}".format(time.time()-t0))
	print("x   : {0}".format(x))
	print("err : {0}".format(Rastrigin(x)))

