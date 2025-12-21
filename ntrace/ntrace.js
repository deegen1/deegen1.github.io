/*


BVH

Node types:
	0 parent
	1 simplex
	2 instance

Vertex
	coord
	texture coord
	color

Simplex
	n vertices
	normal
	bary vec

Mesh
	BVH
	Texture
	Simplices
	Instances
	Shapes

Instance
	Mesh
	Transform
	Texture


*/


class D3DVertex {

	constructor(coord,texcoord) {
		if (!coord) {throw "no coord";}
		if (texcoord===undefined) {texcoord=0xffffffff;}
		if (texcoord.length) {}
	}

}