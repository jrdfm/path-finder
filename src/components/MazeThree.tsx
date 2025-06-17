import React, { useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { Box, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import type { Level, Pos } from '../game/solver'

interface Props {
  level: Level
  player: Pos
  visualizedCells?: Pos[]
  optimalPath?: Pos[]
}

const WALL_HEIGHT = 1;
const WALL_THICKNESS = 0.2;

function MazeLayout({ level }: { level: Level }) {
    const { walls, floor } = useMemo(() => {
        const wallInstances: THREE.Matrix4[] = [];
        if (!level.cells) return { walls: [], floor: null };

        const rows = level.cells.length;
        const cols = level.cells[0].length;

        // Floor
        const floorGeo = new THREE.PlaneGeometry(cols, rows);
        const floorMatrix = new THREE.Matrix4().makeRotationX(-Math.PI / 2);
        floorGeo.applyMatrix4(floorMatrix);
        const floorMesh = new THREE.Mesh(floorGeo, new THREE.MeshStandardMaterial({ color: 'lightgray' }));

        // Walls
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const cell = level.cells[r][c];
                const x = c - cols / 2 + 0.5;
                const z = r - rows / 2 + 0.5;

                if (cell.walls.top) {
                    const matrix = new THREE.Matrix4().compose(
                        new THREE.Vector3(x, WALL_HEIGHT / 2, z - 0.5),
                        new THREE.Quaternion(),
                        new THREE.Vector3(1, WALL_HEIGHT, WALL_THICKNESS)
                    );
                    wallInstances.push(matrix);
                }
                if (cell.walls.bottom) {
                     const matrix = new THREE.Matrix4().compose(
                        new THREE.Vector3(x, WALL_HEIGHT / 2, z + 0.5),
                        new THREE.Quaternion(),
                        new THREE.Vector3(1, WALL_HEIGHT, WALL_THICKNESS)
                    );
                    wallInstances.push(matrix);
                }
                if (cell.walls.left) {
                    const matrix = new THREE.Matrix4().compose(
                        new THREE.Vector3(x - 0.5, WALL_HEIGHT / 2, z),
                        new THREE.Quaternion(),
                        new THREE.Vector3(WALL_THICKNESS, WALL_HEIGHT, 1)
                    );
                    wallInstances.push(matrix);
                }
                if (cell.walls.right) {
                    const matrix = new THREE.Matrix4().compose(
                        new THREE.Vector3(x + 0.5, WALL_HEIGHT / 2, z),
                        new THREE.Quaternion(),
                        new THREE.Vector3(WALL_THICKNESS, WALL_HEIGHT, 1)
                    );
                    wallInstances.push(matrix);
                }
            }
        }
        return { walls: wallInstances, floor: floorMesh };
    }, [level]);

    return (
        <group>
            {floor && <primitive object={floor} />}
            <instancedMesh args={[undefined, undefined, walls.length]} castShadow receiveShadow>
                <boxGeometry args={[1, 1, 1]} />
                <meshStandardMaterial color="blue" />
                {walls.map((matrix, i) => (
                    <object3D key={i} matrix={matrix} />
                ))}
            </instancedMesh>
        </group>
    );
}

function Player({ player, level }: { player: Pos, level: Level }) {
    const { width, height } = useMemo(() => ({
        width: level.grid[0].length,
        height: level.grid.length
    }), [level]);
    const position = useMemo(() => new THREE.Vector3(
        player.c - width / 2 + 0.5,
        0.5,
        player.r - height / 2 + 0.5
    ), [player, width, height]);

    return (
        <mesh position={position}>
            <sphereGeometry args={[0.3, 32, 32]} />
            <meshStandardMaterial color="red" />
        </mesh>
    );
}

function Path({ visualizedCells, optimalPath, level }: { visualizedCells: Pos[], optimalPath: Pos[], level: Level }) {
    const { width, height } = useMemo(() => ({
        width: level.grid[0].length,
        height: level.grid.length,
    }), [level]);

    const visualizedMatrices = useMemo(() => {
        return visualizedCells.map(pos => {
            const position = new THREE.Vector3(
                pos.c - width / 2 + 0.5,
                0.1,
                pos.r - height / 2 + 0.5
            );
            return new THREE.Matrix4().compose(position, new THREE.Quaternion(), new THREE.Vector3(1, 1, 1));
        });
    }, [visualizedCells, width, height]);

    const optimalPathMatrices = useMemo(() => {
        return optimalPath.map(pos => {
            const position = new THREE.Vector3(
                pos.c - width / 2 + 0.5,
                0.2, // Slightly higher to be visible over the visualized path
                pos.r - height / 2 + 0.5
            );
            return new THREE.Matrix4().compose(position, new THREE.Quaternion(), new THREE.Vector3(1, 1, 1));
        });
    }, [optimalPath, width, height]);

    return (
        <group>
            <instancedMesh args={[undefined, undefined, visualizedMatrices.length]}>
                <sphereGeometry args={[0.15, 16, 16]} />
                <meshStandardMaterial color="blue" transparent opacity={0.5} />
                {visualizedMatrices.map((matrix, i) => (
                    <object3D key={i} matrix={matrix} />
                ))}
            </instancedMesh>
            <instancedMesh args={[undefined, undefined, optimalPathMatrices.length]}>
                <sphereGeometry args={[0.2, 16, 16]} />
                <meshStandardMaterial color="green" />
                {optimalPathMatrices.map((matrix, i) => (
                    <object3D key={i} matrix={matrix} />
                ))}
            </instancedMesh>
        </group>
    );
}

export default function MazeThree({ level, player, visualizedCells = [], optimalPath = [] }: Props) {
  const { width, height } = useMemo(() => ({
      width: level.grid[0].length,
      height: level.grid.length
  }), [level]);

  return (
    <div style={{ width: '100%', height: '100%', border: '1px solid #ccc' }}>
        <Canvas camera={{ position: [width / 2, Math.max(width, height), height / 2], fov: 60 }}>
            <ambientLight intensity={0.8} />
            <pointLight position={[width, 10, height]} intensity={1} />
            <OrbitControls target={[0, 0, 0]}/>
            <MazeLayout level={level} />
            <Player player={player} level={level}/>
            <Path visualizedCells={visualizedCells} optimalPath={optimalPath} level={level} />
        </Canvas>
    </div>
  )
} 