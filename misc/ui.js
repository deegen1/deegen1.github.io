/*------------------------------------------------------------------------------


ui.js - v1.00

Copyright 2025 Alec Dee - MIT license - SPDX: MIT
2dee.net - akdee144@gmail.com


--------------------------------------------------------------------------------
Notes


--------------------------------------------------------------------------------
History


1.00
     Created for Rappel's Tower.
     Added text, poly, and sliders.


--------------------------------------------------------------------------------
TODO


Add GEAR_POLY.
Fix poly bounding box calculation.


*/
/* npx eslint ui.js -c ../../standards/eslint.js */
/* global */


//---------------------------------------------------------------------------------
// UI - v1.00


class UI {

	static VOLUME_POLY=new Draw.Poly(`
		M-.111-.722V.722l-.5-.416H-1V-.306h.389ZM.209-.584C.671-.33.671.33.209.584L.102
		.39C.41.217.41-.217.102-.39Zm.213-.39c.77.424.77 1.524 0 1.948L.316.78C.932.428
		.932-.428.316-.78Z
	`);


	constructor(draw,input) {
		this.draw=draw;
		this.input=input;
		this.nodes=[];
		this.grabbing=null;
		this.focus=null;
	}


	addnode(type,x,y,w,h) {
		// x,y,w,h,z,img,onchange,type,parent,children
		let node={
			type:type,
			onchange:null,
			x:x,
			y:y,
			w:w,
			h:h,
			value:null
		};
		this.nodes.push(node);
		return node;
	}


	render() {this.update(true);}


	update(render=false) {
		// If we're rendering, ignore inputs.
		let typemap={"text":0,"poly":1,"slider":2};
		let input=this.input;
		let draw=this.draw,img=draw.img;
		let dw=img.width,dh=img.height;
		let [mx,my]=input.getmousepos();
		let focus=render?this.focus:null;
		draw.pushstate();
		draw.resetstate();
		for (let node of this.nodes) {
			let type=typemap[node.type];
			let nx=node.x,ny=node.y,nw=node.w,nh=node.h;
			// if (nw<0) {nx+=nw;nw=-nw;}
			// if (nh<0) {ny+=nh;nh=-nh;}
			if (nx>=dw || ny>=dh || nx+nw<=0 || ny+nh<=0) {
				continue;
			}
			if (!render && mx>=nx && my>=ny && mx<nx+nw && my<ny+nh) {
				focus=node;
			}
			let onmouse=focus===node;
			draw.setcolor(255,255,255,255);
			if (type===0) {
				draw.filltext(nx,ny,node.value,node.size);
			} else if (type===1) {
				draw.fillpoly(node.poly,node.trans);
			} else if (type===2) {
				let rad=(nw<nh?nw:nh)*0.5;
				let x0=nx+rad,y0=ny+rad;
				let x1=nx+nw-rad,y1=ny+nh-rad;
				if (onmouse) {draw.setcolor(64,64,255,255);}
				let lw=draw.linewidth;
				draw.linewidth=rad*0.5;
				draw.drawline(x0,y0,x1,y1);
				let u=node.value;
				let sx=u*(x1-x0)+x0;
				let sy=u*(y1-y0)+y0;
				draw.filloval(sx,sy,rad);
				draw.linewidth=lw;
			}
		}
		this.focus=focus;
		draw.popstate();
	}


	addtext(x,y,text,size) {
		let rect=this.draw.textrect(text,size);
		let node=this.addnode("text",x,y,rect.w,rect.h);
		node.value=text;
		node.size=size;
		return node;
	}


	addpoly(poly,trans) {
		let node=this.addnode("poly",-Infinity,-Infinity,Infinity,Infinity);
		node.poly=poly;
		node.trans=new Transform(trans);
		return node;
	}


	addslider(x,y,w,h) {
		let node=this.addnode("slider",x,y,w,h);
		node.value=0;
		return node;
	}

}
