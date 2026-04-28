/*


data.js - v1.00

Copyright 2026 Alec Dee - MIT license - SPDX: MIT
2dee.net - akdee144@gmail.com


--------------------------------------------------------------------------------
History


1.00
     Added weight balanced tree.


--------------------------------------------------------------------------------
Notes


A weight balanced search tree implementation.

Balancing is performed by keeping the weights of children within a ratio of 2.5.

Because weights are used, we can lexicographically index nodes. Ex: tree[0] will
return the smallest node in the tree.

Adding and removing values are stable with respect to sorting.

weight(null) = 0

Tree height < 2.07 * log2(nodes+1)


--------------------------------------------------------------------------------
TODO


Unit tests.
Object.is() vs ===
Performance test. Unroll rebalance()?
Remake as AVL tree but track height and weight.
Debug
	Use weight=0 to mark if node is in a tree.
	Add sanity checks when adding or removing nodes.
	tree.clear() sets weight=0 for all nodes.

let tree=new Tree((l,r)=>l[0]-r[0]);
tree.add([5,"Friday"]);
tree.add([5,"Friday2"]);
tree.add([3,"Wednesday"]);
tree.add([1,"Monday"]);
tree.add([6,"Saturday"]);
tree.add([2,"Tuesday"]);
tree.add([4,"Thursday"]);
tree.remove([6,"Saturday"]);
console.log("iter:");
for (let node of tree.iter()) {
	console.log(node.value);
}
console.log("index:");
for (let i=0;i<tree.length();i++) {
	console.log(tree.get(i).value);
}


*/
/* npx eslint data.js -c ../../standards/eslint.js */


//---------------------------------------------------------------------------------
// Data - v1.00


class TreeNode {

	constructor(value) {
		this.weight=1;
		this.parent=null;
		this.left=null;
		this.right=null;
		this.value=value;
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
		let node=this,child=this.right;
		if (child) {
			while (child) {node=child;child=child.left;}
		} else {
			while (node && Object.is(node.right,child)) {
				child=node;node=node.parent;
			}
		}
		return node;
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
		let node=this,child=this.left;
		if (child) {
			while (child) {node=child;child=child.right;}
		} else {
			while (node && Object.is(node.left,child)) {
				child=node;node=node.parent;
			}
		}
		return node;
	}


	rotleft() {
		// Raise z, lower x, and maintain the sorted order of the nodes.
		//
		//        A                B
		//       / \              / \
		//      x   B     ->     A   z
		//         / \          / \
		//        y   z        x   y
		//
		let a=this;
		let b=a.right;
		let r=b.left;
		b.parent=a.parent;
		b.left=a;
		a.parent=b;
		a.right=r;
		if (r) {r.parent=a;}
		a.calcweight();
		b.calcweight();
		return b;
	}


	rotright() {
		// Raise x, lower z, and maintain the sorted order of the nodes.
		//
		//          A            B
		//         / \          / \
		//        B   z   ->   x   A
		//       / \              / \
		//      x   y            y   z
		//
		let a=this;
		let b=a.left;
		let l=b.right;
		b.parent=a.parent;
		b.right=a;
		a.parent=b;
		a.left=l;
		if (l) {l.parent=a;}
		a.calcweight();
		b.calcweight();
		return b;
	}


	calcweight() {
		let l=this.left,r=this.right,weight=1;
		if (l) {weight+=l.weight;}
		if (r) {weight+=r.weight;}
		this.weight=weight;
	}


	index() {
		// Returns the node's index within the tree. Ex: tree[node.index()]=node
		let idx=-1;
		let node=this,prev=this.right;
		while (node) {
			if (Object.is(node.right,prev)) {
				idx+=node.left?node.left.weight+1:1;
			}
			prev=node;
			node=node.parent;
		}
		return idx;
	}

}


class Tree {

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
		if (l>r) {return  1;}
		return 0;
	}


	constructor(cmp=Tree.defcmp,duplicate=Tree.ADD) {
		// cmp(l,r) is expected to be a function where
		//
		//      cmp(l,r)<0 if l<r
		//      cmp(l,r)=0 if l=r
		//      cmp(l,r)>0 if l>r
		//
		this.cmp=cmp;
		this.duplicate=duplicate;
		this.root=null;
	}


	clear() {this.root=null;}


	length() {
		// Return the number of nodes in the tree.
		return this.root?this.root.weight:0;
	}


	get(i) {
		// Index nodes like an array.
		let node=this.root;
		let weight=node?node.weight:0;
		if (i<0) {i+=weight;}
		if (i<0 || i>=weight) {return null;}
		while (true) {
			let left=node.left;
			let lw=left?left.weight:0;
			if (i>lw) {
				i-=lw+1;
				node=node.right;
			} else if (i===lw) {
				break;
			} else {
				node=left;
			}
		}
		return node;
	}


	*iter() {
		// Iterate over all nodes in ascending order.
		let node=this.first();
		while (node) {
			yield node;
			node=node.next();
		}
	}


	first() {
		// Return the smallest node in the tree.
		let node=this.root,ret=null;
		while (node) {ret=node;node=node.left;}
		return ret;
	}


	last() {
		// Return the greatest node in the tree.
		let node=this.root,ret=null;
		while (node) {ret=node;node=node.right;}
		return ret;
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
		let node=this.root,ret=null;
		let cmp=this.cmp;
		let dup=this.duplicate;
		let lset  =[false,false,true ,true ,false,false][mode];
		let rset  =[false,false,false,false,true ,true ][mode];
		let eset  =[true ,true ,false,true ,false,true ][mode];
		let eright=[false,true ,false,true ,true ,false][mode];
		while (node) {
			let c=cmp(node.value,value);
			if (c<0) {
				if (lset) {ret=node;}
				node=node.right;
			} else if (c>0) {
				if (rset) {ret=node;}
				node=node.left;
			} else {
				if (eset) {
					ret=node;
					if (dup) {break;}
				}
				node=eright?node.right:node.left;
			}
		}
		return ret;
	}


	addnode(orig) {
		// Find a leaf node to add the new value to. Then rebalance from the new node on
		// up. By traversing right when cmp<=0, this algorithm is stable.
		let value=orig.value;
		let node=this.root,prev=null;
		let cmp=this.cmp;
		let dup=this.duplicate,c=0;
		while (node) {
			c=cmp(node.value,value);
			if (c===0 && dup) {
				if (dup===Tree.DISCARD) {return null;}
				node.value=value;
				return node;
			}
			prev=node;
			node=c>0?node.left:node.right;
		}
		orig.weight=1;
		orig.left=null;
		orig.right=null;
		orig.parent=prev;
		if (prev===null) {
			this.root=orig;
		} else {
			if (c>0) {prev.left=orig;}
			else     {prev.right=orig;}
			this.rebalance(prev);
		}
		return orig;
	}


	add(value) {
		return this.addnode(new TreeNode(value));
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
		let p=node.parent;
		let l=node.left,r=node.right;
		let next=null,bal=null;
		if (r===null) {
			// Case 1
			bal=p;next=l;l=null;
		} else if (r.left) {
			// Case 2
			next=r;
			while (next.left) {bal=next;next=next.left;}
			let c=next.right;
			bal.left=c;
			if (c) {c.parent=bal;}
		} else {
			// Case 3
			bal=r;next=r;r=null;
		}
		// Replace node with next.
		if (p===null) {this.root=next;}
		else if (Object.is(p.left,node)) {p.left=next;}
		else {p.right=next;}
		if (next) {
			next.parent=p;
			if (l) {next.left=l;l.parent=next;}
			if (r) {next.right=r;r.parent=next;}
		}
		this.rebalance(bal);
	}


	remove(value) {
		// Remove a node given a value.
		let node=this.find(value);
		if (node) {this.removenode(node);}
		return node;
	}


	rebalance(next) {
		// Rebalance from next upward. If 2 children differ in weight by a ratio of 2.5 or
		// more, we can rotate to rebalance.
		function Weight(n) {return n?n.weight:0;}
		while (next) {
			let node=next,orig=next;
			next=node.parent;
			let l=node.left,r=node.right;
			let lw=Weight(l),rw=Weight(r);
			if (rw*5+2<lw*2) {
				// Leaning to the left.
				if (Weight(l.left)*5<lw*2) {node.left=l.rotleft();}
				node=node.rotright();
			} else if (lw*5+2<rw*2) {
				// Leaning to the right.
				if (Weight(r.right)*5<rw*2) {node.right=r.rotright();}
				node=node.rotleft();
			} else {
				// Balanced.
				node.weight=lw+rw+1;
				continue;
			}
			if (next===null) {this.root=node;}
			else if (Object.is(next.left,orig)) {next.left=node;}
			else {next.right=node;}
		}
	}

}


const Data={
	Tree:Tree,
};
export {Data};

