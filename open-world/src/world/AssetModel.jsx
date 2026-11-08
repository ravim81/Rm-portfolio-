import React,{useMemo} from 'react';
import {useGLTF} from '@react-three/drei';
// useGLTF enables Drei's Draco decoder by default. Keep source assets in public/world/models.
export default function AssetModel({src,position=[0,0,0],scale=1,rotation=[0,0,0]}){const {scene}=useGLTF(src);const clone=useMemo(()=>scene.clone(true),[scene]);return <primitive object={clone} position={position} scale={scale} rotation={rotation}/>;}
AssetModel.preload=src=>useGLTF.preload(src);
