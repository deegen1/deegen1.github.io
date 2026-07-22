/*


data.js - v2.02

Copyright 2026 Alec Dee - MIT license - SPDX: MIT
2dee.net - akdee144@gmail.com


--------------------------------------------------------------------------------
History


1.00
     Added weight balanced tree.
2.00
     Added linked list.
     Improved tree balancing invariant from L*5+2<R*2 to L*17+{7,4}<R*7.
     Simplified Tree.find() branching.
     Node attributes are now nullified on removal.
     Added checks for re-adding or re-removing nodes.
     Replaced Object.is(a,b) with a===b since it's slightly faster.
     Using explicit null comparisons if(node!==null) is 7% faster.
     Unrolling rotations in Tree.rebalance() is 8% faster.
     A zero-weight node is used to avoid null checks and point to the tree.
2.02
     Fix zero check in Tree.release().


--------------------------------------------------------------------------------
Notes


Tree balancing is performed by keeping child weights within a ratio of 2.428.

Weight balancing allows indexing nodes. Ex: tree[0] returns the smallest node.

Adding and removing values are stable with respect to sorting.

weight(null) = 0

Tree height <= 2.01 * log2(nodes+1)


--------------------------------------------------------------------------------
TODO


Optimize Tree.iter(), prev(), next(), and release().

clear vs release? remove vs release?

For duplicate tree values, allow adding before or after.

For a randomly generated tree, how many rebalance operations does it take to
make the tree balanced?

Double check invariants.
Article: Easy, Near-Optimal Weight Balanced Trees
Try balancing by floor(log(weight)).
A new weight balanced binary search tree - Seonghun Cho

Tree.release() {
	for (let node of this.iter()) {
		node.parent=null;
		node.left=null;
		node.right=null;
		node.weight=0;
	}
	this.length=0;
	this.root=this.zero;
}

Tree.release() {
	let node=this.root,last=node;
	while (node!==zero) {
		let l=node.left,r=node.right;
		if (l!==zero) {last.parent=l;last=l;}
		if (r!==zero) {last.parent=r;last=r;}
		node.parent=null;
		node.left=null;
		node.right=null;
		node.weight=0;
	}
	this.length=0;
	this.root=this.zero;
}


*/
/* npx eslint data.js -c ../../standards/eslint.js */


//---------------------------------------------------------------------------------
// Data - v2.02


class ListLink {

	constructor(obj) {
		this.prev=null;
		this.next=null;
		this.list=null;
		this.obj=obj??null;
		this.idx=null;
	}


	release() {this.remove();}


	add(list) {list.add(this);}


	remove(clear=false) {
		let list=this.list;
		if (list!==null) {list.remove(this,clear);}
		return list;
	}

}


export class List {

	static Link=ListLink;


	constructor(ptr=null) {
		this.head=null;
		this.tail=null;
		this.ptr=ptr;
		this.count=0;
	}


	release(clear=false) {
		let link=this.head;
		while (link!==null) {
			let next=link.next;
			link.prev=null;
			link.next=null;
			link.list=null;
			if (clear) {link.obj=null;}
			link=next;
		}
		this.count=0;
	}


	first() {return this.head;}


	last() {return this.tail;}


	*iter() {
		let link=null,next=this.head;
		while ((link=next)!==null) {
			next=link.next;
			yield link.obj;
		}
	}


	add(value) {
		let link=new ListLink(value);
		this.addafter(link,this.tail);
		return link;
	}


	addafter(link,prev=null) {
		// Inserts the link after prev.
		if (link.list!==null) {throw "link already in list";}
		let next=null;
		if (prev!==null) {
			next=prev.next;
			prev.next=link;
		} else {
			next=this.head;
			this.head=link;
		}
		link.prev=prev;
		link.next=next;
		link.list=this;
		if (next!==null) {
			next.prev=link;
		} else {
			this.tail=link;
		}
		this.count++;
	}


	addbefore(link,next=null) {
		// Inserts the link before next.
		if (link.list!==null) {throw "link already in list";}
		let prev=null;
		if (next!==null) {
			prev=next.prev;
			next.prev=link;
		} else {
			prev=this.tail;
			this.tail=link;
		}
		link.prev=prev;
		link.next=next;
		link.list=this;
		if (prev!==null) {
			prev.next=link;
		} else {
			this.head=link;
		}
		this.count++;
	}


	remove(link,clear) {
		if (link===null) {return;}
		let list=link.list;
		if (list===null) {return;}
		if (list!==this) {throw "removing from wrong list";}
		let prev=link.prev;
		let next=link.next;
		if (prev!==null) {
			prev.next=next;
		} else {
			this.head=next;
		}
		if (next!==null) {
			next.prev=prev;
		} else {
			this.tail=prev;
		}
		this.count--;
		link.prev=null;
		link.next=null;
		link.list=null;
		if (clear) {link.obj=null;}
	}

}


class TreeNode {

	constructor(value) {
		this.weight=0;
		this.parent=null;
		this.left=null;
		this.right=null;
		this.value=value;
	}


	remove() {
		let tree=this.tree();
		if (tree!==null) {tree.removenode(this);}
		return tree;
	}


	tree() {
		// zero.value=tree. Searching up is ~(h-1)/2, searching down is ~1.
		if (!this.weight) {return null;}
		let zero=this,node=this.left;
		while (node!==null) {zero=node;node=node.left;}
		return zero.value;
	}


	next() {
		// Given a node N, find the next ordered node. Ex: next(3)=4.
		//
		//            4
		//           / \
		//          /   \
		//         2     6
		//        / \   / \
		//       1   3 5   7
		//
		// If N has a right child, R, the left-most child of R is the next node.
		// Otherwise, the nearest parent of N with N on the left is the next node.
		let n0=this,n1=n0.right,n2=n1.left;
		if (n2!==null) {
			do {n0=n1;n1=n2;n2=n2.left;} while (n2!==null);
		} else {
			do {n1=n0;n0=n0.parent;} while (n0.right===n1);
		}
		return n0.weight?n0:null;
	}


	prev() {
		// Given a node N, find the previous ordered node. Ex: prev(5)=4.
		//
		//            4
		//           / \
		//          /   \
		//         2     6
		//        / \   / \
		//       1   3 5   7
		//
		// If N has a left child, L, the right-most child of L is the next node.
		// Otherwise, the nearest parent of N with N on the right is the next node.
		let n0=this,n1=n0.left,n2=n1.right;
		if (n2!==null) {
			do {n0=n1;n1=n2;n2=n2.right;} while (n2!==null);
		} else {
			do {n1=n0;n0=n0.parent;} while (n0.left===n1);
		}
		return n0.weight?n0:null;
	}


	index() {
		// Returns the node's index within the tree. Ex: tree[node.index()]=node
		let idx=-1;
		let node=this,prev=this.right;
		while (true) {
			let l=node.left;
			if (node.right===prev) {idx+=l.weight+1;}
			else if (l!==prev) {return idx;}
			prev=node;
			node=node.parent;
		}
	}

}


export class Tree {

	static Node=TreeNode;

	// Searching constants.
	static EQ=0;
	static EQG=1;
	static LT=2;
	static LE=3;
	static GT=4;
	static GE=5;

	// Duplicate behavior.
	static ADD    =0;
	static REPLACE=1;
	static DISCARD=2;


	static defcmp(l,r) {
		if (l<r) {return -1;}
		return r<l?1:0;
	}


	constructor(cmp=null,duplicate=Tree.ADD) {
		// cmp(l,r) is expected to be a function where
		//
		//      cmp(l,r)<0 if l<r
		//      cmp(l,r)=0 if l=r
		//      cmp(l,r)>0 if l>r
		//
		this.cmp=cmp??Tree.defcmp;
		this.duplicate=duplicate;
		this.zero=new TreeNode(this);
		this.root=this.zero;
		this.length=0;
	}


	release() {
		let node=null,zero=this.zero;
		while ((node=this.root)!==zero) {
			this.removenode(node);
		}
	}


	first() {
		// Return the smallest node in the tree.
		let node=this.root,ret=null,zero=this.zero;
		while (node!==zero) {ret=node;node=node.left;}
		return ret;
	}


	last() {
		// Return the greatest node in the tree.
		let node=this.root,ret=null,zero=this.zero;
		while (node!==zero) {ret=node;node=node.right;}
		return ret;
	}


	*iter() {
		// Iterate over all nodes in ascending order.
		let node=this.first();
		while (node!==null) {
			let next=node.next();
			yield node;
			node=next;
		}
	}


	get(i) {
		// Index nodes like an array.
		let node=this.root;
		let weight=node.weight;
		if (i<0) {i+=weight;}
		if (i<0 || i>=weight) {return null;}
		while (true) {
			let l=node.left;
			let lw=l.weight;
			if (i>=lw) {
				i-=lw+1;
				if (i<0) {break;}
				node=node.right;
			} else {
				node=l;
			}
		}
		return node;
	}


	find(value,mode=Tree.EQ) {
		// Search for a specific value or inequality.
		//
		//      EQ : Return the least    node=value.
		//      EQG: Return the greatest node=value.
		//      LT : Return the greatest node<value.
		//      LE : Return the greatest node<=value.
		//      GT : Return the least    node>value.
		//      GE : Return the least    node>=value.
		//
		let node=this.root,ret=null,zero=this.zero;
		let cmp=this.cmp;
		let set=0x34652>>>(mode*3);
		let right=1|((0x34>>>mode)&2);
		while (node!==zero) {
			let c=cmp(node.value,value);
			let bit=1<<(1+(c>0)-(c<0));
			ret=(set&bit)?node:ret;
			node=(right&bit)?node.right:node.left;
		}
		return ret;
	}


	add(value) {
		return this.addnode(new TreeNode(value));
	}


	remove(value) {
		// Remove a node given a value.
		let node=this.find(value);
		if (node!==null) {this.removenode(node);}
		return node;
	}


	addnode(node) {
		// Find a leaf node to add the new value to. Then rebalance from the new node on
		// up. By traversing right when cmp<=0, this algorithm is stable.
		if (node.weight) {throw "node already in tree";}
		let value=node.value;
		let trav=this.root,zero=this.zero,prev=zero;
		let cmp=this.cmp;
		let dup=this.duplicate,c=0;
		while (trav!==zero) {
			c=cmp(trav.value,value);
			if (c===0 && dup) {
				if (dup===Tree.DISCARD) {return null;}
				trav.value=value;
				return trav;
			}
			prev=trav;
			trav=c>0?trav.left:trav.right;
		}
		this.length++;
		node.weight=1;
		node.left=zero;
		node.right=zero;
		node.parent=prev;
		if (prev===zero) {
			this.root=node;
		} else {
			if (c>0) {prev.left=node;}
			else     {prev.right=node;}
			this.rebalance(prev);
		}
		return node;
	}


	removenode(node) {
		// Remove a specific node. We can remove a node by swapping it with its successor
		// to maintain order and stability sorting-wise. Then, rebalance from the successor
		// on up.
		//
		//           Case 1          |          Case 2           |          Case 3
		//                           |                           |
		//   N is the right-most     |  X is a distant child of  |  X is the right child of
		//   child in the tree.      |  N. Balance from C up.    |  N. Balance from X up.
		//   Balance from D up.      |                           |
		//                           |                           |
		//     B              B      |    N              X       |     N              X
		//    / \            / \     |   / \            / \      |    / \            / \
		//   A   D     ->   A   D    |  A   C          A   C     |   A   X     ->   A   B
		//      / \            / \   |     / \    ->      / \    |      / \
		//     C   N          C   X  |    X   D          B   D   |     *   B
		//        / \                |   / \                     |
		//       X   *               |  *   B                    |
		//
		if (!node.weight) {throw "double removal";}
		let p=node.parent,l=node.left,r=node.right;
		let zero=this.zero,next=r,bal=p;
		node.weight=0;
		node.parent=null;
		node.left=null;
		node.right=null;
		if (r===zero) {
			// Case 1
			next=l;l=zero;
		} else if (r.left!==zero) {
			// Case 2
			let c=next.left;
			do {bal=next;next=c;c=next.left;} while (c!==zero);
			c=next.right;
			bal.left=c;
			c.parent=bal;
		} else {
			// Case 3
			bal=r;r=zero;
		}
		// Replace node with next.
		if (p===zero) {this.root=next;}
		else if (p.left===node) {p.left=next;}
		else {p.right=next;}
		this.length--;
		next.parent=p;
		if (l!==zero) {
			next.left=l;
			l.parent=next;
		}
		if (r!==zero) {
			next.right=r;
			r.parent=next;
		}
		this.rebalance(bal);
	}


	rebalance(next) {
		// Rebalance from next upward.
		let zero=this.zero;
		while (next!==zero) {
			let n=next,orig=next;
			next=n.parent;
			let l=n.left,r=n.right;
			let lw=l.weight,rw=r.weight;
			// Primary invariant: L*17+7<R*7, secondary invariant: L.L*17+4<L*7.
			// con=4 has fewest rebalances and lowest height. 17/7>1+sqrt(2).
			let rem=(rw+lw+7)>>>3;
			if (rw+rw<lw-rem) {
				// Leaning to the left.
				r=l.right;
				let a=l.left;
				let aw=a.weight;
				if (aw+aw<lw-((aw+lw+4)>>>3)) {
					// Left rotate L, then right rotate N.
					//
					//          N                N               R
					//         / \              / \             / \
					//        L   d            R   d           /   \
					//       / \      ->      / \      ->     L     N
					//      a   R            L   c           / \   / \
					//         / \          / \             a   b c   d
					//        b   c        a   b
					//
					let b=r.left;
					l.parent=r;
					l.right=b;
					b.parent=l;
					l.weight=b.weight+aw+1;
					r.left=l;l=r;
					r=r.right;
				}
				// Right rotate N.
				//
				//          N            L
				//         / \          / \
				//        L   c   ->   a   N
				//       / \              / \
				//      a   b            b   c
				//
				n.parent=l;
				n.left=r;
				r.parent=n;
				n.weight=r.weight+rw+1;
				l.parent=next;
				l.right=n;
				n=l;
			} else if (lw+lw<rw-rem) {
				// Leaning to the right.
				l=r.left;
				let d=r.right;
				let dw=d.weight;
				if (dw+dw<rw-((dw+rw+4)>>>3)) {
					// Right rotate R, then left rotate N.
					let c=l.right;
					r.parent=l;
					r.left=c;
					c.parent=r;
					r.weight=c.weight+dw+1;
					l.right=r;r=l;
					l=l.left;
				}
				// Left rotate N.
				n.parent=r;
				n.right=l;
				l.parent=n;
				n.weight=l.weight+lw+1;
				r.parent=next;
				r.left=n;
				n=r;
			}
			n.weight=lw+rw+1;
			if (n===orig) {continue;}
			if (next===zero) {this.root=n;}
			else if (next.left===orig) {next.left=n;}
			else {next.right=n;}
		}
	}

}

