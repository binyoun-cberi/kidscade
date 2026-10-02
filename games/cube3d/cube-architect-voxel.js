/* Chunk voxel renderer for Cube Architect.
 * Keeps world state independent from Three.js objects and batches ordinary voxel faces per chunk.
 */
(()=>{
'use strict';

const FACE_DEFS=[
  {dir:[ 1, 0, 0],materialIndex:0,corners:[[ .5,0,-.5],[ .5,1,-.5],[ .5,1, .5],[ .5,0, .5]]},
  {dir:[-1, 0, 0],materialIndex:1,corners:[[-.5,0, .5],[-.5,1, .5],[-.5,1,-.5],[-.5,0,-.5]]},
  {dir:[ 0, 1, 0],materialIndex:2,corners:[[-.5,1,-.5],[-.5,1, .5],[ .5,1, .5],[ .5,1,-.5]]},
  {dir:[ 0,-1, 0],materialIndex:3,corners:[[-.5,0, .5],[-.5,0,-.5],[ .5,0,-.5],[ .5,0, .5]]},
  {dir:[ 0, 0, 1],materialIndex:4,corners:[[ .5,0, .5],[ .5,1, .5],[-.5,1, .5],[-.5,0, .5]]},
  {dir:[ 0, 0,-1],materialIndex:5,corners:[[-.5,0,-.5],[-.5,1,-.5],[ .5,1,-.5],[ .5,0,-.5]]}
];
const UVS=[[0,0],[0,1],[1,1],[1,0]];

function chunkKey(cx,cz){return cx+','+cz}

function addFace(bucket,x,y,z,face,cell){
  const base=bucket.positions.length/3;
  for(let i=0;i<4;i++){
    const c=face.corners[i];
    bucket.positions.push(x+c[0],y+c[1],z+c[2]);
    bucket.normals.push(face.dir[0],face.dir[1],face.dir[2]);
    bucket.uvs.push(UVS[i][0],UVS[i][1]);
  }
  bucket.indices.push(base,base+1,base+2,base,base+2,base+3);
  bucket.faceMap.push(cell,cell);
}

function buildChunkMeshes({
  THREE,cx,cz,size=16,records=[],getBlock,isRenderable,isFaceOccluded,materialForFace
}={}){
  if(!THREE||typeof materialForFace!=='function')return [];
  const buckets=new Map();
  for(const rec of records){
    const {x,y,z,data}=rec||{};
    if(!data||!isRenderable?.(data,x,y,z))continue;
    for(const face of FACE_DEFS){
      const [dx,dy,dz]=face.dir,neighbor=getBlock?.(x+dx,y+dy,z+dz)||null;
      if(isFaceOccluded?.(data,neighbor,face,x,y,z))continue;
      const material=materialForFace(data,x,z,face.materialIndex);
      if(!material)continue;
      let bucket=buckets.get(material);
      if(!bucket){
        bucket={positions:[],normals:[],uvs:[],indices:[],faceMap:[]};
        buckets.set(material,bucket);
      }
      const cell={worldBlock:true,worldKey:x+','+y+','+z,gx:x,gy:y,gz:z,type:data.type,
        shapeKind:'cuboid',dims:[1,1,1],faceIndex:face.materialIndex};
      addFace(bucket,x,y,z,face,cell);
    }
  }
  const key=chunkKey(cx,cz),meshes=[];
  for(const [material,bucket] of buckets){
    if(!bucket.indices.length)continue;
    const geo=new THREE.BufferGeometry();
    geo.setAttribute('position',new THREE.Float32BufferAttribute(bucket.positions,3));
    geo.setAttribute('normal',new THREE.Float32BufferAttribute(bucket.normals,3));
    geo.setAttribute('uv',new THREE.Float32BufferAttribute(bucket.uvs,2));
    geo.setIndex(bucket.indices);
    geo.computeBoundingBox();geo.computeBoundingSphere();
    const mesh=new THREE.Mesh(geo,material);
    mesh.name='VoxelChunk:'+key;
    mesh.castShadow=!material.transparent;mesh.receiveShadow=true;
    mesh.userData={
      worldChunkMesh:true,worldChunkKey:key,cx,cz,
      minX:cx*size-.5,maxX:(cx+1)*size-.5,
      minZ:cz*size-.5,maxZ:(cz+1)*size-.5,
      faceMap:bucket.faceMap
    };
    meshes.push(mesh);
  }
  return meshes;
}

function resolveHit(hit){
  if(!hit?.object?.userData?.worldChunkMesh)return hit;
  const cell=hit.object.userData.faceMap?.[hit.faceIndex];
  if(!cell)return hit;
  const originalObject=hit.object;
  const proxy={
    userData:{...cell},
    matrixWorld:originalObject.matrixWorld
  };
  const face=hit.face?{...hit.face,materialIndex:cell.faceIndex}:hit.face;
  return {...hit,object:proxy,face,chunkObject:originalObject};
}

window.CubeArchitectVoxel={FACE_DEFS,chunkKey,buildChunkMeshes,resolveHit};
})();