/*------------------------------------------------------------------------------


tetris.js - v2.08

Copyright 2020 Alec Dee - MIT license - SPDX: MIT
2dee.net - akdee144@gmail.com


--------------------------------------------------------------------------------
TODO


Integrate with library.
Performance testing. Speed up frames where AI computes path.
Clean up UI creation.


*/
/* npx eslint tetris.js -c ../../standards/eslint.js */


//---------------------------------------------------------------------------------
// Tetris Engine


class Tetris {

	static STATE_EASY    =1<<0;
	static STATE_MEDIUM  =1<<1;
	static STATE_HARD    =1<<2;
	static STATE_GAMEOVER=1<<3;
	static STATE_SPAWNING=1<<4;
	static STATE_SPAWNED =1<<5;
	static STATE_DROPPING=1<<6;
	static STATE_CLEARING=1<<7;
	static STATE_SCANNED =1<<8;
	static STATE_CLEARED =1<<9;
	static STATE_MOVING  =1<<10;

	static MOVE_COUNT   =8;
	static MOVE_NONE    =0;
	static MOVE_LEFT    =1;
	static MOVE_RIGHT   =2;
	static MOVE_DOWN    =3;
	static MOVE_ROTL    =4;
	static MOVE_ROTR    =5;
	static MOVE_SOFTDROP=6;
	static MOVE_HARDDROP=7;

	// This holds the rotated forms of the various tetris pieces. Rotations are listed
	// clockwise. For the I piece, the blocks are ordered to be reused for kick values.
	// For all pieces, the blocks are ordered to align spawning positions.
	static PIECE_I=0;
	static PIECE_O=1;
	static PIECE_T=2;
	static PIECE_L=3;
	static PIECE_J=4;
	static PIECE_S=5;
	static PIECE_Z=6;
	static PIECE_LAYOUT=[
		// I
		[ 0, 0, 1, 0, 2, 0,-1, 0],
		[ 0, 0, 0, 1, 0,-1, 0,-2],
		[ 0, 0, 1, 0,-1, 0,-2, 0],
		[ 0, 0, 0, 1, 0, 2, 0,-1],
		// O
		[ 0,-1, 1, 0, 1,-1, 0, 0],
		[ 0,-1, 1, 0, 1,-1, 0, 0],
		[ 0,-1, 1, 0, 1,-1, 0, 0],
		[ 0,-1, 1, 0, 1,-1, 0, 0],
		// T
		[ 0,-1, 0, 0, 1, 0,-1, 0],
		[ 0,-1, 0, 1,-1, 0, 0, 0],
		[-1, 0, 0, 0, 0, 1, 1, 0],
		[ 0, 1, 0, 0, 1, 0, 0,-1],
		// L
		[-1,-1, 0, 0, 1, 0,-1, 0],
		[ 0, 0, 0, 1, 0,-1,-1, 1],
		[-1, 0, 0, 0, 1, 0, 1, 1],
		[ 0, 1, 0, 0, 0,-1, 1,-1],
		// J
		[ 0, 0, 1, 0, 1,-1,-1, 0],
		[ 0, 0, 0, 1, 0,-1,-1,-1],
		[-1, 1,-1, 0, 0, 0, 1, 0],
		[ 0, 0, 1, 1, 0,-1, 0, 1],
		// S
		[ 0,-1, 0, 0, 1, 0,-1,-1],
		[ 0, 0,-1, 1, 0,-1,-1, 0],
		[ 0,-1, 0, 0, 1, 0,-1,-1],
		[ 0, 0,-1, 1, 0,-1,-1, 0],
		// Z
		[ 0,-1, 0, 0, 1,-1,-1, 0],
		[-1, 0, 0, 1,-1,-1, 0, 0],
		[ 0,-1, 0, 0, 1,-1,-1, 0],
		[-1, 0, 0, 1,-1,-1, 0, 0]
	];


	constructor(width,height,flags) {
		if (flags===undefined) {
			flags=Tetris.STATE_HARD;
		}
		// state
		this.state=flags&(Tetris.STATE_EASY|Tetris.STATE_MEDIUM|Tetris.STATE_HARD);
		this.stateframe=0;
		this.frameunit=60;
		this.spawnframes=0;
		this.lockframes=0;
		this.clearframes=0;
		this.gravityden=256;
		this.gravity=0;
		this.level=0;
		this.cleared=0;
		// playing grid
		this.width=width;
		this.height=height;
		this.grid=new Array(height);
		for (let i=0;i<height;i++) {
			this.grid[i]=new Array(width);
		}
		this.linecount=new Array(height);
		// piece randomizer
		this.randseed=0;
		this.randinc=0;
		this.bagsum=0;
		this.bagcnt=new Array(7);
		this.next=0;
		// current piece
		this.drop=0;
		this.dropx=0;
		this.dropy=0;
		this.droprem=0;
		// AI player. The grid holds all possible piece states for the AI.
		// ailagframes is the simulated reaction time of the AI. 0=instant.
		this.ailagframes=Math.floor(this.frameunit/4);
		this.aigrid=null;
		this.aitmp=null;
		this.aiheap=0;
		this.ailink=null;
		this.aicopy=null;
		this.reset();
	}


	reset() {
		// Reset to an empty grid with level=0. Set the first piece to not be S or Z.
		this.state=(this.state&(Tetris.STATE_EASY|Tetris.STATE_MEDIUM|Tetris.STATE_HARD))|Tetris.STATE_SPAWNING;
		this.stateframe=0;
		for (let y=0;y<this.height;y++) {
			let row=this.grid[y];
			for (let x=0;x<this.width;x++) {row[x]=0;}
			this.linecount[y]=0;
		}
		this.level=0;
		this.cleared=0;
		this.levelconstants();
		// Don't let S or Z be the first spawn.
		for (let i=0;i<7;i++) {this.bagcnt[i]=0;}
		this.bagsum=0;
		let next=Tetris.PIECE_S*4;
		while (next===Tetris.PIECE_S*4 || next===Tetris.PIECE_Z*4) {
			next=this.gennext();
		}
		this.next=next;
		this.drop=0;
		this.dropx=0;
		this.dropy=0;
		this.droprem=0;
	}


	levelconstants() {
		// Set the state frames and gravity based on the level and difficulty of the game.
		// As the level increases, scale the state frames to their minimum values and scale
		// the gravity to its maximum value. All numerators are over 256.
		let num=[128,128,256,480];
		if (this.state&Tetris.STATE_MEDIUM) {num=[85,85,128,640];}
		if (this.state&Tetris.STATE_HARD) {num=[64,64,85,960];}
		let max=999;
		let unit=this.frameunit;
		let level=this.level;
		if (level>max) {level=max;}
		let den=256*max;
		let inv=max-level;
		this.level=level;
		this.spawnframes=Math.floor((unit*(128*inv+num[0]*level))/den);
		this.lockframes=Math.floor((unit*(128*inv+num[1]*level))/den);
		this.clearframes=Math.floor((unit*(256*inv+num[2]*level))/den);
		this.gravity=Math.floor((this.gravityden*(240*inv+num[3]*level))/(den*unit));
	}


	gennext() {
		// Pick the next tetris piece from a bag of pieces. The bag has a count of how many
		// of each piece are in the bag. When a piece is picked, decrease its count.
		// bagcnt=-1=infinity.
		let bagsum=this.bagsum;
		let bagcnt=this.bagcnt;
		// If we have emptied the bag, refill it.
		if (bagsum===0) {
			for (let i=0;i<7;i++) {
				bagcnt[i]=3;
				bagsum+=bagcnt[i];
			}
		}
		let rand=Math.floor(Math.random()*bagsum);
		let next=0;
		while (bagcnt[next]<=rand) {
			rand-=bagcnt[next];
			next+=1;
		}
		// If there's a finite number of this piece, decrement its count.
		if (bagcnt[next]!==-1) {
			bagcnt[next]-=1;
			bagsum-=1;
		}
		this.bagsum=bagsum;
		// If the grid has width 1, only the I piece can possibly spawn.
		if (this.width<=1) {next=Tetris.PIECE_I;}
		// Format the piece for the piece array.
		return next*4;
	}


	advance(frames) {
		if (frames===undefined) {frames=1;}
		// Advance the state of the game by the number of frames given.
		let state=this.state;
		let stateframe=this.stateframe;
		while ((state&Tetris.STATE_GAMEOVER)===0) {
			if ((state&Tetris.STATE_SPAWNING)!==0) {
				// If this is the beginning of the spawn state, initialize a new piece.
				if ((state&Tetris.STATE_SPAWNED)===0) {
					this.drop=this.next;
					this.next=this.gennext();
					this.droprem=0;
					// If the grid is too small, the piece may need to be rotated and shifted to be
					// spawnable.
					let piece=Tetris.PIECE_LAYOUT[this.drop];
					this.drop+=this.width<=piece[4]-piece[6];
					piece=Tetris.PIECE_LAYOUT[this.drop];
					this.dropx=Math.floor((this.width-1-piece[4]-piece[6])/2);
					this.dropy=this.height-1-piece[3];
					// Since we have a piece to control, allow movement. We need to set the tetris
					// state's actual state so move() knows we can move.
					state|=Tetris.STATE_SPAWNED|Tetris.STATE_MOVING;
					this.state=state;
					// Use a null move to test if any of the cells we are spawning on are already
					// filled. If any are filled, its game over.
					if (this.canmove(Tetris.MOVE_NONE)===0) {
						state^=Tetris.STATE_GAMEOVER^Tetris.STATE_MOVING;
						break;
					}
				}
				if (stateframe>=this.spawnframes) {
					// We have finished spawning, so move on to dropping.
					state^=Tetris.STATE_SPAWNING^Tetris.STATE_SPAWNED^Tetris.STATE_DROPPING;
					stateframe=0;
				} else if (frames>=1) {
					// Otherwise, advance by 1 frame.
					frames-=1;
					stateframe+=1;
				} else {
					break;
				}
			} else if ((state&Tetris.STATE_DROPPING)!==0) {
				// Check if we can lock immediately. Specifically, if lockframes=0.
				let shift=this.canmove(Tetris.MOVE_DOWN);
				if (shift===0 && stateframe>=this.lockframes) {
					state^=Tetris.STATE_DROPPING^Tetris.STATE_CLEARING^Tetris.STATE_MOVING;
					stateframe=0;
					continue;
				}
				// To actually fall, we need at least 1 frame.
				if (frames<1) {break;}
				frames-=1;
				stateframe+=1;
				// If the piece can fall.
				if (shift!==0) {
					// Add gravity to the fractional remainder we are falling by. If we have fallen,
					// move the piece down. Also, reset stateframe to prevent the piece from locking.
					this.droprem+=this.gravity;
					let fall=Math.floor(this.droprem/this.gravityden);
					this.droprem%=this.gravityden;
					while (fall>=1 && this.move(Tetris.MOVE_DOWN)!==0) {fall-=1;}
					stateframe=0;
				}
				// If we cannot fall, the fractional remainder we are falling by should be 0.
				this.droprem=this.canmove(Tetris.MOVE_DOWN)!==0?this.droprem:0;
			} else if ((state&Tetris.STATE_CLEARING)!==0) {
				// Set the piece and check for cleared lines. If any lines were cleared, set the
				// cleared flag.
				let width=this.width;
				let grid=this.grid;
				let linecount=this.linecount;
				if ((state&Tetris.STATE_SCANNED)===0) {
					state|=Tetris.STATE_SCANNED;
					let piece=Tetris.PIECE_LAYOUT[this.drop];
					let color=Math.floor(this.drop/4)+1;
					let dropx=this.dropx;
					let dropy=this.dropy;
					for (let i=0;i<8;i+=2) {
						// Set the blocks of the piece.
						let y=piece[i+1]+dropy;
						let line=grid[y];
						line[piece[i]+dropx]=color;
						linecount[y]+=1;
						// If we have cleared a line, clear it, but don't shift the lines above it yet.
						if (linecount[y]===width) {
							state|=Tetris.STATE_CLEARED;
							for (let x=0;x<width;x++) {line[x]=0;}
						}
					}
				}
				if ((state&Tetris.STATE_CLEARED)===0 || stateframe>=this.clearframes) {
					// If we are done pausing for the cleared lines, move to spawning.
					state^=Tetris.STATE_CLEARING^Tetris.STATE_SCANNED^Tetris.STATE_SPAWNING;
					stateframe=0;
					// If we have cleared lines, shift all non-empty lines down. Cleared lines are
					// marked by linecount=width.
					let cleared=0;
					if ((state&Tetris.STATE_CLEARED)!==0) {
						state^=Tetris.STATE_CLEARED;
						let height=this.height;
						for (let y=0;y<height;y++) {
							let count=linecount[y];
							if (count!==width) {
								let dst=y-cleared;
								let line=grid[y];
								grid[y]=grid[dst];
								grid[dst]=line;
								linecount[y]=linecount[dst];
								linecount[dst]=count;
							} else {
								linecount[y]=0;
								cleared+=1;
							}
						}
					}
					// Advance the level by {0,1,2,4,6} for each line cleared, and +1 for the piece
					// that's about to spawn. Then recalculate level values.
					this.cleared+=cleared;
					this.level+=[1,2,3,5,7][cleared];
					this.levelconstants();
				} else if (frames>=1) {
					// We are paused for the cleared lines.
					frames-=1;
					stateframe+=1;
				} else {
					break;
				}
			} else {
				break;
			}
		}
		this.stateframe=stateframe;
		this.state=state;
	}


	// ----------------------------------------
	// Movement


	canmove(move) {
		// Test if we can move the piece by moving the piece and discarding any changes.
		return this.move(move,true);
	}


	move(move,testing) {
		if (testing===undefined) {testing=false;}
		// Unified move command. Returns 1 if the move was successful, otherwise returns 0.
		// If testing=true, then only test if the move is possible.
		let state=this.state;
		if ((state&Tetris.STATE_MOVING)===0) {
			return 0;
		}
		let overlap=function() {
			for (let j=0;j<8;j+=2) {
				let x=piece[j+0]+dropx;
				let y=piece[j+1]+dropy;
				if (x<0 || x>=width || y<0 || y>=height || grid[y][x]!==0) {
					return 1;
				}
			}
			return 0;
		};
		let i;
		let width=this.width;
		let height=this.height;
		let grid=this.grid;
		let drop=this.drop;
		let dropx=this.dropx;
		let dropy=this.dropy;
		let piece=Tetris.PIECE_LAYOUT[drop];
		if (move<=Tetris.MOVE_DOWN) {
			// Test if the piece can shift in a specific direction.
			dropx+=[0,-1,1,0][move];
			dropy+=[0,0,0,-1][move];
			if (overlap()!==0) {return 0;}
		} else if (move<=Tetris.MOVE_ROTR) {
			// Rotate the piece.
			let dir=(move===Tetris.MOVE_ROTR)*2-1;
			drop=(drop&0x1c)|((drop+dir)&0x3);
			piece=Tetris.PIECE_LAYOUT[drop];
			// If we are kicking the I piece, pull the kick values from the block coordinates.
			let kick=[0,0,-1,0,1,0,0,-1,0,1];
			if (drop<4) {
				for (i=0;i<8;i++) {
					kick[i+2]=-piece[i];
				}
			}
			// Try kicking. If we can kick, set the piece's orientation.
			for (i=0;i<10;i+=2) {
				dropx=this.dropx+kick[i+0];
				dropy=this.dropy+kick[i+1];
				if (overlap()===0) {break;}
				if (i===8) {return 0;}
			}
		} else if (move<=Tetris.MOVE_HARDDROP) {
			// Drop the piece.
			dropy-=1;
			while (overlap()===0) {dropy-=1;}
			dropy+=1;
			if (move===Tetris.MOVE_SOFTDROP) {
				// If it can drop, advance to the beginning of the dropping state.
				if (dropy===this.dropy) {return 0;}
				state=(state&~(Tetris.STATE_SPAWNING|Tetris.STATE_SPAWNED))|Tetris.STATE_DROPPING;
			} else {
				// Advance to the clearing state.
				state=(state&~(Tetris.STATE_SPAWNING|Tetris.STATE_SPAWNED|Tetris.STATE_DROPPING|Tetris.STATE_MOVING))|Tetris.STATE_CLEARING;
			}
		}
		if (testing===false) {
			this.drop=drop;
			this.dropx=dropx;
			this.dropy=dropy;
			if (move===Tetris.MOVE_SOFTDROP || move===Tetris.MOVE_HARDDROP) {
				this.state=state;
				this.stateframe=0;
				this.droprem=0;
			}
		}
		return 1;
	}


	// ----------------------------------------
	// AI
	//
	// An AI player to suggest the next move given a valid board state.
	//
	// We use fitness instead of entropy to grade the grid. The next move we want may
	// not be to increase the "order" of the grid. For instance, we may want to perform
	// a 4-line clear or to build up a pattern.
	//
	// When using order-1 or higher moves, limit the initial moves as much as possible,
	// as the number of states will multiply.


	makecell(pos,width) {
		let cell={};
		cell.drop=(pos>>1)&3;
		cell.dropx=(pos>>3)%width;
		cell.dropy=Math.floor((pos>>3)/width);
		cell.next=null;
		cell.nextmove=0;
		cell.state=0;
		cell.stateframe=0;
		cell.droprem=0;
		cell.link=null;
		cell.sort=0;
		return cell;
	}


	makelink() {
		let link={};
		link.link=null;
		link.prev=null;
		link.move=Tetris.MOVE_NONE;
		return link;
	}


	// A binary heap to sort potential moves.
	aiheappush(val) {
		let heap=this.aitmp;
		let i=this.aiheap;
		this.aiheap+=1;
		let j,next;
		// Heap up
		while (i!==0) {
			j=(i-1)>>1;
			next=heap[j];
			if (next.sort<val.sort) {break;}
			heap[i]=next;
			i=j;
		}
		heap[i]=val;
	}


	aiheappop() {
		this.aiheap-=1;
		let heap=this.aitmp;
		let count=this.aiheap;
		let ret=heap[0];
		let bot=heap[count];
		// Heap down.
		let i=0,j;
		while (true) {
			// Find the smallest child.
			j=i*2+1;
			if (j+1<count && heap[j+1].sort<heap[j].sort) {
				j+=1;
			}
			if (j>=count || bot.sort<heap[j].sort) {
				break;
			}
			// Shift and continue the heap down.
			heap[i]=heap[j];
			i=j;
		}
		heap[i]=bot;
		return ret;
	}


	aimakecopy() {
		// Allocate the AI and determine if any changes have been made that require
		// remapping the optimal move path.
		let width=this.width;
		let aicopy=this.aicopy;
		if (aicopy===null || aicopy.width!==width || aicopy.height!==this.height) {
			aicopy=new Tetris(width,this.height);
			let aicells=width*this.height*8;
			let aigrid=new Array(aicells);
			for (let i=0;i<aicells;i++) {aigrid[i]=aicopy.makecell(i,width);}
			aicopy.aigrid=aigrid;
			aicopy.aitmp=new Array(aicells);
			aicopy.aiheap=0;
			let ailinks=aicells*Tetris.MOVE_COUNT;
			let ailink=new Array(ailinks);
			for (let i=0;i<ailinks;i++) {ailink[i]=aicopy.makelink();}
			aicopy.ailink=ailink;
		}
		this.aicopy=aicopy;
		// Check state value changes.
		let vallist=[
			["state",0],["stateframe",0],["frameunit",1],["spawnframes",1],["lockframes",1],
			["clearframes",1],["gravityden",1],["gravity",1],["level",0],["cleared",0],
			["width",1],["height",1],["bagsum",0],["next",1],["drop",0],["dropx",0],
			["dropy",0],["droprem",0],["ailagframes",1]
		];
		let remap=0;
		if ((aicopy.drop^this.drop)&0x1c) {remap=1;}
		let len=vallist.length;
		for (let i=0;i<len;i++) {
			let name=vallist[i][0];
			if (aicopy[name]!==this[name]) {
				aicopy[name]=this[name];
				remap|=vallist[i][1];
			}
		}
		// Check grid changes.
		let aicount=aicopy.linecount;
		let scount=this.linecount;
		let height=this.height;
		for (let y=0;y<height;y++) {
			let cnt=scount[y];
			if (aicount[y]===cnt && (cnt===0 || cnt===width)) {continue;}
			aicount[y]=cnt;
			let airow=aicopy.grid[y];
			let srow=this.grid[y];
			for (let x=0;x<width;x++) {
				if (airow[x]!==srow[x]) {
					airow[x]=srow[x];
					remap=1;
				}
			}
		}
		for (let i=0;i<7;i++) {
			aicopy.bagcnt[i]=this.bagcnt[i];
		}
		return remap;
	}


	aimapmoves(remap) {
		// Given a valid tetris state, find all possible moves. Will use a cached copy of
		// the grid unless changes are detected or remap=true.
		//
		// We differentiate every potential state of the current piece by x/y coordinates,
		// rotation, and if it is locked. Given the original state as a seed, we determine
		// the next state by shifting, rotating, and dropping the piece and letting the
		// state advance aiframes number of times. If this next state has not been arrived
		// at yet, add it to the list of potential states, marking the current state as its
		// prior state, and continue to the next state in the list. If a state is locked,
		// skip it, since we cannot move it. Continue in this way until all potential
		// states have been listed.
		//
		// Determine if we can use the current cached moves or if we need to remap them.
		if (remap===undefined) {remap=0;}
		remap|=this.aimakecopy();
		let aicopy=this.aicopy;
		let aigrid=aicopy.aigrid;
		let width=aicopy.width;
		let pos=((aicopy.dropy*width+aicopy.dropx)<<3)+((aicopy.drop&3)<<1)+((aicopy.state&Tetris.STATE_MOVING)===0);
		let startcell=aigrid[pos];
		if (remap===0 && startcell.state!==0) {
			return startcell;
		}
		let aicells=width*aicopy.height*8;
		// Mark all of the states as unused.
		let drop=(aicopy.drop^aigrid[0].drop)&0x1c;
		for (let i=0;i<aicells;i++) {
			let cell=aigrid[i];
			cell.state=0;
			cell.next=null;
			cell.link=null;
			cell.drop^=drop;
		}
		// Add the original state to the list of potential states.
		startcell.state=aicopy.state;
		startcell.stateframe=aicopy.stateframe;
		startcell.droprem=aicopy.droprem;
		let ailink=aicopy.ailink;
		let ailinkpos=0;
		let aitmppos=0;
		let aitmplen=1;
		let aitmp=aicopy.aitmp;
		aitmp[0]=startcell;
		// Process all potential states.
		while (aitmppos<aitmplen) {
			let cell=aitmp[aitmppos];
			aitmppos+=1;
			if ((cell.state&Tetris.STATE_MOVING)===0) {
				continue;
			}
			// Loop over all allowed moves.
			for (let move=0;move<Tetris.MOVE_COUNT;move++) {
				// Reset the tetris and piece state to the currently processing state, and shift,
				// rotate, or drop the piece.
				aicopy.state=cell.state;
				aicopy.stateframe=cell.stateframe;
				aicopy.drop=cell.drop;
				aicopy.dropx=cell.dropx;
				aicopy.dropy=cell.dropy;
				aicopy.droprem=cell.droprem;
				if (aicopy.move(move)===0) {
					continue;
				}
				// Because the AI has to wait in between movements, simulate how the main
				// loop will modify the tetris state and piece state while the AI is waiting.
				let state=aicopy.state;
				let stateframe=aicopy.stateframe;
				let droprem=aicopy.droprem;
				let frames=aicopy.ailagframes;
				while (true) {
					if ((state&Tetris.STATE_SPAWNING)!==0) {
						if (stateframe>=aicopy.spawnframes) {
							state^=Tetris.STATE_SPAWNING^Tetris.STATE_SPAWNED^Tetris.STATE_DROPPING;
							stateframe=0;
						} else if (frames>=1) {
							frames-=1;
							stateframe+=1;
						} else {
							break;
						}
					} else if ((state&Tetris.STATE_DROPPING)!==0) {
						let shift=aicopy.canmove(Tetris.MOVE_NONE);
						if (shift===0 && stateframe>=aicopy.lockframes) {
							state^=Tetris.STATE_DROPPING^Tetris.STATE_CLEARING^Tetris.STATE_MOVING;
							stateframe=0;
							break;
						}
						if (frames<1) {
							break;
						}
						frames-=1;
						stateframe+=1;
						if (shift!==0) {
							droprem+=aicopy.gravity;
							let fall=Math.floor(droprem/aicopy.gravityden);
							droprem%=aicopy.gravityden;
							while (fall>=1 && aicopy.move(Tetris.MOVE_DOWN)!==0) {fall-=1;}
							stateframe=0;
						}
						droprem=aicopy.canmove(Tetris.MOVE_DOWN)!==0?droprem:0;
					} else {
						break;
					}
				}
				// Quantify the new state. If it is unused, add it as a potential state.
				pos=((aicopy.dropy*width+aicopy.dropx)<<3)+((aicopy.drop&3)<<1)+((state&Tetris.STATE_MOVING)===0);
				let next=aigrid[pos];
				// if next is not cell or stateframe>cell.stateframe or droprem>cell.droprem:
				let link=ailink[ailinkpos];
				ailinkpos+=1;
				link.link=next.link;
				next.link=link;
				link.prev=cell;
				link.move=move;
				if (next.state===0) {
					aitmp[aitmplen]=next;
					aitmplen+=1;
					next.state=state;
					next.stateframe=stateframe;
					next.droprem=droprem;
				}
			}
		}
		// Sort all locked positions by their fitness.
		for (let i=0;i<aitmplen;i++) {
			let cell=aitmp[i];
			if ((cell.state&Tetris.STATE_MOVING)===0) {
				aicopy.drop=cell.drop;
				aicopy.dropx=cell.dropx;
				aicopy.dropy=cell.dropy;
				cell.sort=aicopy.aifitness();
				aicopy.aiheappush(cell);
			}
		}
		let fit=aicells;
		while (aicopy.aiheap) {
			fit-=1;
			aitmp[fit]=aicopy.aiheappop();
		}
		// Map duplicate floating point fitness values to ordinal values. Processing all
		// positions at once prevents a particular orientation from overwriting equivalent
		// orientations.
		let height=aicopy.height;
		let maxdist=(width+height)*2;
		let sort=Infinity;
		let level=0;
		for (let f=fit;f<aicells;f++) {
			let cell=aitmp[f];
			if (sort-cell.sort>1e-6) {
				sort=cell.sort;
				level+=1;
			}
			cell.sort=(level*maxdist+0)*height-cell.dropy;
			aicopy.aiheappush(cell);
		}
		// Process positions by their estimated sorting value.
		while (aicopy.aiheap) {
			let cell=aicopy.aiheappop();
			sort=cell.sort+cell.dropy;
			// Process all predecessors. Add them to the heap if they haven't been added yet.
			let link=cell.link;
			while (link!==null) {
				let prev=link.prev;
				if (prev.next===null) {
					// prev.sort=(cell.ordinal*maxdist+prev.dist)*height-prev.dropy
					prev.sort=sort+height-prev.dropy;
					prev.next=cell;
					prev.nextmove=link.move;
					aicopy.aiheappush(prev);
				}
				link=link.link;
			}
		}
		return startcell;
	}


	aifitness() {
		// Determine the fitness of the grid including the current piece. The higher the
		// fitness, the better the state. Variables are scaled so they are in units of
		// height. The variables we use are:
		//
		// sumholes: The count of all holes on the grid. A cell is a hole is it is empty
		// and a filled cell is above it. Needs to be scaled by width.
		//
		// sumheight: The sum of the column heights. Needs to be scaled by width.
		//
		// rowflip: The number of times neighboring cells flip between empty and filled
		// along a row. Needs to be scaled by width.
		//
		// colflip: The number of times neighboring cells flip between empty and filled
		// along a column. Needs to be scaled by width.
		//
		// pieceheight: The height of the top block of the most recently placed piece. Do
		// not take into account line clears. Do no scale.
		//
		// sumwell2: The sum of squared well heights. A well is an opening 1 cell wide,
		// which happens to function as a chokepoint. Needs to be scaled by width.
		let width=this.width;
		let height=this.height;
		let grid=this.grid;
		let linecount=this.linecount;
		// First lock in the piece.
		let dropx=this.dropx;
		let dropy=this.dropy;
		let piece=Tetris.PIECE_LAYOUT[this.drop];
		let pieceheight=0;
		let i,y;
		for (i=0;i<8;i+=2) {
			y=piece[i+1]+dropy;
			grid[y][piece[i]+dropx]+=1;
			linecount[y]+=1;
			// Set the height the piece was placed at.
			pieceheight=pieceheight>y?pieceheight:y;
		}
		pieceheight+=1;
		// We can limit ourselves to only rows with filled cells, so find the highest
		// position with a filled cell.
		let cleared=0;
		let ymax=0;
		for (y=0;y<height;y++) {
			if (linecount[y]===width) {cleared+=1;}
			else if (linecount[y]!==0) {ymax=y+1;}
		}
		// Find the stats of each column.
		// Since the left and right walls are considered filled cells, any empty lines will
		// have a row flip when the left-most and right-most cells are compared against
		// their respective walls.
		let sumholes=0;
		let sumheight=0;
		let rowflip=(height-ymax)*2;
		let colflip=0;
		let sumwell2=0;
		for (let x=0;x<width;x++) {
			let colheight=0;
			let wellheight=0;
			let covered=0;
			// When determining column flips, we compare the current row with the row above it.
			// If the grid is filled, but a line is going to be cleared, we know that the top
			// row should be 0 instead of whatever is there currently.
			let topcell=cleared===0?grid[height-1][x]!==0:0;
			for (y=ymax-1;y>=0;y--) {
				// If the line is filled, ignore it.
				let c=0;
				if (linecount[y]!==width) {
					let line=grid[y];
					c=line[x]!==0;
					// If the cell is empty and there is a filled cell above, we have a hole.
					sumholes+=(c^1)&covered;
					// If the cell above is different, we have a column flip. Don't directly use
					// grid[y-1].
					colflip+=c^topcell;
					// If the cell to the left is different, we have a row flip. Ignore the cell when
					// x=0; it will be compared against the left wall later.
					rowflip+=c^(line[x-(x>0)]!==0);
					topcell=c;
					covered|=c;
					colheight+=covered;
					// If the cell is empty and we are already in a well, or the left and right
					// neighboring cells are filled, we are in a well.
					if (c===0 && (wellheight!==0 || ((x<=0 || line[x-1]!==0) && (x+1>=width || line[x+1]!==0)))) {
						wellheight+=1;
					}
				}
				// If we have reached the bottom row or a filled cell, the well has ended. Don't
				// directly use grid[y-1] to compare, as it may be a filled line.
				if (y<=0 || c!==0) {
					// Weight the well by the height squared. Testing with variable weights for each
					// height revealed values that converged around the square of the height.
					sumwell2+=wellheight*wellheight;
					wellheight=0;
				}
				// Compare the left-most and right-most cells with the left and right walls.
				rowflip+=(x===0 || x+1===width)?c^1:0;
			}
			// The bottom row needs to be compared against the bottom wall.
			colflip+=topcell^1;
			sumheight+=colheight;
		}
		// Remove the piece from the grid.
		for (i=0;i<8;i+=2) {
			y=piece[i+1]+dropy;
			grid[y][piece[i]+dropx]-=1;
			linecount[y]-=1;
		}
		// Given coefficients, determine the fitness of the grid. Normalize by the absolute
		// sum of the coefficients and the width of the grid. This will allow the fitnesses
		// of different grids to be compared. Do not scale by height.
		let w=width>1?1.0/width:1.0,fitness;
		fitness =-0.2585706097*sumholes*w-0.0160887591*sumheight*w-0.1365051577*rowflip*w;
		fitness+=-0.4461359486*colflip*w -0.0232974547*pieceheight-0.1194020699*sumwell2*w;
		return fitness;
	}


	suggestmove() {
		// Return the optimal move to make.
		let cell=this.aimapmoves();
		return cell.nextmove;
	}


	suggestposition() {
		// Return the optimal position to place the piece.
		let cell=this.aimapmoves();
		while (cell.next!==null) {
			cell=cell.next;
		}
		return [cell.drop,cell.dropx,cell.dropy];
	}

}


//---------------------------------------------------------------------------------
// Input - v1.15


class Input {

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
		this.mousepos=[NaN,NaN];
		this.mouseraw=[NaN,NaN];
		this.mousez=0;
		this.touchfocus=0;
		this.clickpos=[0,0];
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
			state.down=0;
			state.hit=0;
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
		let down,next;
		while (state!==null) {
			next=state.active;
			down=focus?state.down:0;
			state.down=down;
			if (down>0) {
				let repeat=Math.floor((delay-state.time)*rate);
				state.repeat=(repeat>0 && (repeat&1)===0)?state.repeat+1:0;
			} else {
				state.repeat=0;
				state.hit=0;
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
		}
		function mousedown(evt) {
			if (evt.button===0) {
				state.setkeydown(state.MOUSE.LEFT);
				state.clickpos=state.mousepos.slice();
			}
		}
		function mouseup(evt) {
			if (evt.button===0) {
				state.setkeyup(state.MOUSE.LEFT);
			}
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
			state.clickpos=state.mousepos.slice();
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


	getclickpos() {
		return this.clickpos.slice();
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
			if (state.down===0) {
				state.down=1;
				state.hit=1;
				state.repeat=0;
				state.time=performance.now()/1000.0;
			}
		}
	}


	setkeyup(code) {
		let state=this.makeactive(code);
		if (state!==null) {
			state.down=0;
			state.hit=0;
			state.repeat=0;
			state.time=null;
		}
	}


	getkeydown(code) {
		// code can be an array of key codes.
		if (code===null || code===undefined) {return 0;}
		if (code.length===undefined) {code=[code];}
		let keystate=this.keystate;
		for (let i=0;i<code.length;i++) {
			let state=keystate[code[i]];
			if (state!==null && state!==undefined && state.down>0) {
				return 1;
			}
		}
		return 0;
	}


	getkeyhit(code) {
		// code can be an array of key codes.
		if (code===null || code===undefined) {return 0;}
		if (code.length===undefined) {code=[code];}
		let keystate=this.keystate;
		for (let i=0;i<code.length;i++) {
			let state=keystate[code[i]];
			if (state!==null && state!==undefined && state.hit>0) {
				state.hit=0;
				return 1;
			}
		}
		return 0;
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
// Tetris GUI


class TetrisGUI {

	constructor(divid) {
		// Swap the <div> with <canvas>
		let elem=document.getElementById(divid);
		this.parentelem=elem.parentNode;
		let canvas=document.createElement("canvas");
		canvas.style.width="60%";
		elem.replaceWith(canvas);
		// Setup the UI.
		this.canvas=canvas;
		this.ctx=this.canvas.getContext("2d");
		this.game=new Tetris(10,20,Tetris.STATE_EASY);
		this.gameresettime=Infinity;
		this.playertime=-Infinity;
		this.playermax =5.0;
		this.aimovetime=-Infinity;
		this.aimoverate=0.08;
		this.colormap=[
			"#00c0c0","#c0c000","#900090","#c0d050",
			"#5050c0","#00c000","#c00000"
		];
		this.input=new Input(canvas);
		this.input.disablenav();
		let state=this;
		function updategame() {
			setTimeout(updategame,1000/60);
			state.update();
			state.draw();
		}
		this.draw();
		updategame();
	}


	update() {
		let time=performance.now()/1000.0;
		let input=this.input;
		input.update();
		let mpos=input.getmousepos();
		let mx=mpos[0],my=mpos[1];
		for (let i=0;i<this.buttons.length;i++) {
			let button=this.buttons[i];
			let x=mx-button.x;
			let y=my-button.y;
			if (x>=0 && y>=0 && x<button.w && y<button.h) {
				button.state=1;
			} else {
				button.state=0;
			}
			let move=Tetris.MOVE_NONE;
			if (button.state && (input.getkeyhit(input.MOUSE.LEFT) || input.getkeyrepeat(input.MOUSE.LEFT))) {
				move=button.move;
			}
			if ((button.state>0 && input.getkeydown(input.MOUSE.LEFT)) || input.getkeydown(button.keys)) {
				button.state=2;
			}
			if (input.getkeyhit(button.keys) || input.getkeyrepeat(button.keys)) {
				move=button.move;
			}
			if (move!==Tetris.MOVE_NONE) {
				this.playertime=time+this.playermax;
				this.aimovetime=-Infinity;
				this.game.move(move);
			}
		}
		if (this.playertime<time && this.aimovetime<time) {
			this.aimovetime=time+this.aimoverate;
			let move=this.game.suggestmove();
			if (move===Tetris.MOVE_HARDDROP || move===Tetris.MOVE_SOFTDROP) {
				move=Tetris.MOVE_DOWN;
			}
			this.game.move(move);
		}
		this.game.advance();
		if (this.game.state&Tetris.STATE_GAMEOVER) {
			if (this.gameresettime<time) {
				this.game.reset();
			}
		} else {
			this.gameresettime=time+5.0;
		}
	}


	draw() {
		// Based on parent width, rescale all UI elements.
		//
		//     1211                   1121             121
		//
		//     +-----------------------------------------+
		//     |                                         |
		//     | +---------------------+ +-------------+ |
		//     | |        Game         | |    Next     | |
		//     | |                     | |             | |
		//     | |                     | |             | |
		//     | |                     | |             | |
		//     | |                     | +-------------+ |
		//     | |                     |                 |
		//     | |                     | +-------------+ |
		//     | |                     | |    State    | |
		//     | |                     | |             | |
		//     | |                     | |             | |
		//     | |                     | +-------------+ |
		//     | |                     |                 |
		//     | |                     | +-------------+ |
		//     | |                     | |   Controls  | |
		//     | |                     | |             | |
		//     | |                     | | RotL  RotR  | |
		//     | |                     | |             | |
		//     | |                     | | Left  Right | |
		//     | |                     | |             | |
		//     | |                     | |    Drop     | |
		//     | |                     | |             | |
		//     | |                     | +-------------+ |
		//     | |                     |                 |
		//     | |                     |                 |
		//     | +---------------------+                 |
		//     |                                         |
		//     +-----------------------------------------+
		//
		let canvas=this.canvas;
		let floor=Math.floor;
		let drawwidth=floor(this.parentelem.clientWidth*0.6);
		drawwidth=drawwidth>300?drawwidth:300;
		let t1=floor((drawwidth+399)/400);
		let t2=floor((drawwidth+ 59)/ 60);
		let blocksize=floor(drawwidth*0.60/this.game.width);
		if (canvas.width!==drawwidth || this.imgback===undefined) {
			// Calculate game and panel sizes. We want the game area to be 60% of the
			// drawable area.
			let t3=t1*2+t2;
			let areagame={title:"",x:t3,y:t3,w:blocksize*this.game.width+t1-(t1&1),h:blocksize*this.game.height+t1-(t1&1)};
			let panelx=areagame.x+areagame.w+t3;
			let panelw=drawwidth-panelx-t3;
			// Calculate font sizes
			let ctx=canvas.getContext("2d");
			let titlefont="bold 10px Monospace";
			let textfont="10px Monospace";
			for (let i=1;;i++) {
				ctx.font=i.toString()+"px Monospace";
				if (ctx.measureText("M").width*20<panelw) {textfont=ctx.font;}
				ctx.font="bold "+i.toString()+"px Monospace";
				if (ctx.measureText("M").width*12>=panelw) {break;}
				titlefont=ctx.font;
			}
			// Recalculate panel sizes based on font.
			ctx.font=textfont;
			let textRect=ctx.measureText("MMMMM: ");
			let textheight=Math.ceil((textRect.actualBoundingBoxAscent+textRect.actualBoundingBoxDescent)*1.1);
			ctx.font=titlefont;
			let rect=ctx.measureText("M");
			let titleheight=Math.ceil((rect.actualBoundingBoxAscent+rect.actualBoundingBoxDescent)*1.1);
			let areanext ={title:"NEXT"    ,x:panelx,y: areagame.y               ,w:panelw,h:floor((titleheight+blocksize*2)*1.5+t1*3)};
			let areastate={title:"STATE"   ,x:panelx,y: areanext.y+ areanext.h+t3,w:panelw,h:floor(titleheight*5+t1*3)};
			let areacont ={title:"CONTROLS",x:panelx,y:areastate.y+areastate.h+t3,w:panelw,h:null};
			areanext.drawx=areanext.x+areanext.w*0.5+t1;
			areanext.drawy=areanext.y+titleheight*1.5+blocksize*1.5+t1;
			areagame.drawx=floor(areagame.x+t1*1.5);
			areagame.drawy=floor(areagame.y+t1*1.5+blocksize*(this.game.height-1));
			areastate.drawx=[floor(areastate.x+textRect.width+t1*6),floor(areastate.x+textRect.width+t1*6)];
			areastate.drawy=[floor(areastate.y+titleheight+textheight*2+t1*7),floor(areastate.y+titleheight+textheight*3.5+t1*11)];
			this.areagame=areagame;
			this.areastate=areastate;
			this.areanext=areanext;
			this.textFont=textfont;
			// Calculate button positions.
			let buttonsize=floor((panelw-t1*3)*0.40);
			let space=floor((panelw-buttonsize*2)/3);
			let lx=panelx+space;
			let rx=lx+buttonsize+space;
			let mx=panelx+floor((panelw-buttonsize)/2);
			let by=areacont.y+titleheight+t1*10+space+textheight;
			let buttons=[
				{name:"rotl" ,img:[null,null,null],x:lx,y:by,w:buttonsize,h:buttonsize,move:Tetris.MOVE_ROTL,keys:[]},
				{name:"rotr" ,img:[null,null,null],x:rx,y:by,w:buttonsize,h:buttonsize,move:Tetris.MOVE_ROTR,keys:[Input.KEY.W,Input.KEY.UP]},
				{name:"left" ,img:[null,null,null],x:lx,y:by+(space+buttonsize)*1,w:buttonsize,h:buttonsize,move:Tetris.MOVE_LEFT,keys:[Input.KEY.A,Input.KEY.LEFT]},
				{name:"right",img:[null,null,null],x:rx,y:by+(space+buttonsize)*1,w:buttonsize,h:buttonsize,move:Tetris.MOVE_RIGHT,keys:[Input.KEY.D,Input.KEY.RIGHT]},
				{name:"down" ,img:[null,null,null],x:mx,y:by+(space+buttonsize)*2,w:buttonsize,h:buttonsize,move:Tetris.MOVE_DOWN,keys:[Input.KEY.S,Input.KEY.DOWN]}
			];
			this.buttons=buttons;
			areacont.h=buttons[4].y+buttons[4].h+space-areacont.y;
			// Resize the canvas.
			let drawheight=Math.max(areagame.y+areagame.h,areacont.y+areacont.h)+t3;
			canvas.width=drawwidth;
			canvas.height=drawheight;
			// Draw the main background, game area, and panels.
			let imgback=new OffscreenCanvas(drawwidth,drawheight);
			this.imgback=imgback;
			ctx=imgback.getContext("2d");
			ctx.fillStyle="#4040aa";
			ctx.fillRect(0,0,drawwidth,drawheight);
			ctx.fillStyle="#6060ff";
			ctx.fillRect(t1,t1,drawwidth-t1*2,drawheight-t1*2);
			let areas=[areagame,areanext,areastate,areacont];
			for (let i=0;i<areas.length;i++) {
				let area=areas[i];
				ctx.fillStyle="#4040aa";
				ctx.fillRect(area.x-t1,area.y-t1,area.w+t1*2,area.h+t1*2);
				ctx.fillStyle="#000000";
				ctx.fillRect(area.x,area.y,area.w,area.h);
				ctx.font=titlefont;
				rect=ctx.measureText(area.title);
				let x=area.x+(area.w-rect.width)/2;
				let y=area.y+titleheight+t1*3;
				ctx.fillStyle="#ffffff";
				ctx.fillText(area.title,x,y);
			}
			ctx.font=textfont;
			ctx.fillText("   AI:",areastate.x+t1*6,areastate.y+titleheight+textheight*2.0+t1*7 );
			ctx.fillText("lines:",areastate.x+t1*6,areastate.y+titleheight+textheight*3.5+t1*11);
			rect=ctx.measureText("Use at any time");
			ctx.fillText("Use at any time",areacont.x+floor((panelw-rect.width)/2),areacont.y+titleheight+textheight+t1*9);
			// Draw the buttons.
			for (let b=0;b<buttons.length;b++) {
				let button=buttons[b];
				let rad=buttonsize*0.25;
				let half=buttonsize*0.5;
				for (let c=0;c<3;c++) {
					let img=new OffscreenCanvas(button.w,button.h);
					button.img[c]=img;
					ctx=img.getContext("2d");
					ctx.fillStyle=["#a0a0ff","#c0c0ff","#606080"][c];
					ctx.fillRect(0,0,button.w,button.h);
					ctx.fillStyle=["#4040aa","#6060cc","#303066"][c];
					ctx.fillRect(t1,t1,button.w-t1*2,button.h-t1*2);
					ctx.strokeStyle=["#a0a0ff","#c0c0ff","#606080"][c];
					ctx.fillStyle=ctx.strokeStyle;
					ctx.lineWidth=t1*2;
					let ang=Math.PI*[-0.75,-0.25,1.0,0.0,0.5][b];
					ctx.beginPath();
					if (b===0) {ctx.arc(half,half,rad, ang,-Math.PI*1.3);}
					if (b===1) {ctx.arc(half,half,rad,-ang,-Math.PI*0.3);}
					ctx.stroke();
					let rad0=rad*[1.0,1.0,0.75,0.75,0.75][b];
					let ax=half+Math.cos(ang)*rad0;
					let ay=half+Math.sin(ang)*rad0;
					let rad1=rad*[0.65,0.65,1.50,1.50,1.50][b];
					ang+=Math.PI*[0.33,1.17,0.75,0.75,0.75][b];
					let ox=Math.cos(ang)*rad1;
					let oy=Math.sin(ang)*rad1;
					ctx.beginPath();
					ctx.moveTo(ax+ox,ay+oy);
					ctx.lineTo(ax,ay);
					ctx.lineTo(ax-oy,ay+ox);
					ctx.closePath();
					ctx.fill();
					ctx.stroke();
				}
				imgback.getContext("2d").drawImage(button.img[0],button.x,button.y);
			}
		}
		let colormap=this.colormap;
		let game=this.game;
		let ctx=this.ctx;
		ctx.drawImage(this.imgback,0,0);
		// Draw the next piece.
		ctx.fillStyle=colormap[floor(game.next/4)];
		let piece=Tetris.PIECE_LAYOUT[game.next];
		let drawx=floor(this.areanext.drawx+(game.next<8?-1.0:-0.5)*blocksize);
		let drawy=floor(this.areanext.drawy+(game.next<4?-0.5:-1.0)*blocksize);
		let cellx,celly;
		for (let i=0;i<8;i+=2) {
			cellx=drawx+blocksize*piece[i+0];
			celly=drawy-blocksize*piece[i+1];
			ctx.fillRect(cellx,celly,blocksize-t1*2,blocksize-t1*2);
		}
		// Draw the current piece.
		if ((game.state&Tetris.STATE_MOVING)!==0) {
			ctx.fillStyle=colormap[floor(game.drop/4)];
			piece=Tetris.PIECE_LAYOUT[game.drop];
			drawx=this.areagame.drawx+blocksize*game.dropx;
			drawy=this.areagame.drawy-blocksize*game.dropy;
			for (let i=0;i<8;i+=2) {
				cellx=drawx+blocksize*piece[i+0];
				celly=drawy-blocksize*piece[i+1];
				ctx.fillRect(cellx,celly,blocksize-t1*2,blocksize-t1*2);
			}
		}
		// Draw the grid.
		for (let y=0;y<game.height;y++) {
			let row=game.grid[y];
			celly=this.areagame.drawy-blocksize*y;
			cellx=this.areagame.drawx;
			for (let x=0;x<game.width;x++) {
				let cell=row[x];
				if (cell>0) {
					ctx.fillStyle=colormap[cell-1];
					ctx.fillRect(cellx,celly,blocksize-t1*2,blocksize-t1*2);
				}
				cellx+=blocksize;
			}
		}
		// Draw the controls.
		for (let i=0;i<this.buttons.length;i++) {
			let button=this.buttons[i];
			if (button.state) {
				ctx.drawImage(button.img[button.state],button.x,button.y);
			}
		}
		// Draw the state text.
		ctx.fillStyle="#ffffff";
		ctx.font=this.textFont;
		let time=floor(((this.playertime-performance.now()/1000.0)*10+this.playermax-1)/this.playermax);
		if (time>0) {
			let str="";
			while (time-->0) {str+="=";}
			ctx.fillText(str,this.areastate.drawx[0],this.areastate.drawy[0]);
		}
		ctx.fillText(game.cleared.toString(),this.areastate.drawx[1],this.areastate.drawy[1]);
	}

}

