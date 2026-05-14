// @ts-nocheck
import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import * as THREE from 'three';

const buildRoadSurface = (curve, width = 4.4, segments = 96) => {
  const positions = [];
  const uvs = [];
  const indices = [];

  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments;
    const point = curve.getPoint(t);
    const tangent = curve.getTangent(t).normalize();
    const normal = new THREE.Vector3(tangent.z, 0, -tangent.x).normalize();
    const left = point.clone().addScaledVector(normal, -width / 2);
    const right = point.clone().addScaledVector(normal, width / 2);

    positions.push(left.x, left.y - 0.04, left.z, right.x, right.y - 0.04, right.z);
    uvs.push(0, t * 12, 1, t * 12);

    if (i < segments) {
      const base = i * 2;
      indices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
};

const buildOffsetCurve = (curve, offset, samples = 28) => {
  const points = [];
  for (let i = 0; i <= samples; i += 1) {
    const t = i / samples;
    const point = curve.getPoint(t);
    const tangent = curve.getTangent(t).normalize();
    const normal = new THREE.Vector3(tangent.z, 0, -tangent.x).normalize();
    points.push(point.clone().addScaledVector(normal, offset));
  }
  return new THREE.CatmullRomCurve3(points);
};

const disposeObject = (object) => {
  object.traverse((child) => {
    if (child.geometry) child.geometry.dispose();
    if (Array.isArray(child.material)) {
      child.material.forEach((material) => material.dispose());
    } else if (child.material) {
      child.material.dispose();
    }
  });
};

export default function Splash({ onEnter }) {
  const canvasRef = useRef(null);
  const pointerRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x02050c);
    scene.fog = new THREE.FogExp2(0x071522, 0.045);

    const camera = new THREE.PerspectiveCamera(54, 1, 0.1, 90);
    camera.position.set(0, 2.15, 8.2);

    const root = new THREE.Group();
    scene.add(root);

    const ambient = new THREE.AmbientLight(0x7dd3fc, 0.35);
    const cyanLight = new THREE.PointLight(0x22d3ee, 18, 22);
    cyanLight.position.set(-3.2, 3.4, 1.8);
    const emeraldLight = new THREE.PointLight(0x34d399, 24, 28);
    emeraldLight.position.set(4.2, 3.2, -8);
    const amberLight = new THREE.PointLight(0xf59e0b, 7, 18);
    amberLight.position.set(0, 1.5, -17);
    scene.add(ambient, cyanLight, emeraldLight, amberLight);

    const freewayCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, -0.35, 7),
      new THREE.Vector3(-1.45, -0.32, 1.5),
      new THREE.Vector3(1.3, -0.28, -5.6),
      new THREE.Vector3(-0.75, -0.2, -13.8),
      new THREE.Vector3(0, -0.12, -26),
    ]);

    const roadMaterial = new THREE.MeshStandardMaterial({
      color: 0x050b12,
      metalness: 0.28,
      roughness: 0.42,
      emissive: 0x071d21,
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.92,
    });
    const road = new THREE.Mesh(buildRoadSurface(freewayCurve), roadMaterial);
    root.add(road);

    const edgeMaterial = new THREE.MeshBasicMaterial({
      color: 0x2dd4bf,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
    });
    const edgeGeometryLeft = new THREE.TubeGeometry(buildOffsetCurve(freewayCurve, -2.15), 96, 0.025, 8, false);
    const edgeGeometryRight = new THREE.TubeGeometry(buildOffsetCurve(freewayCurve, 2.15), 96, 0.025, 8, false);
    const leftEdge = new THREE.Mesh(edgeGeometryLeft, edgeMaterial);
    const rightEdge = new THREE.Mesh(edgeGeometryRight, edgeMaterial.clone());
    root.add(leftEdge, rightEdge);

    const dashGeometry = new THREE.BoxGeometry(0.08, 0.018, 0.78);
    const dashMaterial = new THREE.MeshBasicMaterial({
      color: 0xe0f2fe,
      transparent: true,
      opacity: 0.72,
      blending: THREE.AdditiveBlending,
    });
    const dashCount = 38;
    const laneDashes = new THREE.InstancedMesh(dashGeometry, dashMaterial, dashCount);
    root.add(laneDashes);

    const vehicleGeometry = new THREE.BoxGeometry(0.11, 0.06, 0.58);
    const vehicleMaterial = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.82,
      blending: THREE.AdditiveBlending,
    });
    const vehicleCount = 66;
    const lightTrails = new THREE.InstancedMesh(vehicleGeometry, vehicleMaterial, vehicleCount);
    root.add(lightTrails);

    const portal = new THREE.Group();
    portal.position.set(0, 1.15, -13.5);
    root.add(portal);

    const ringMaterials = [
      new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.65, wireframe: true }),
      new THREE.MeshBasicMaterial({ color: 0x34d399, transparent: true, opacity: 0.58, wireframe: true }),
      new THREE.MeshBasicMaterial({ color: 0xfacc15, transparent: true, opacity: 0.34, wireframe: true }),
    ];
    [2.85, 3.55, 4.3].forEach((radius, index) => {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(radius, 0.018 + index * 0.006, 12, 128),
        ringMaterials[index]
      );
      ring.rotation.set(index * 0.14, index * 0.22, 0);
      portal.add(ring);
    });

    const shardMaterial = new THREE.MeshBasicMaterial({
      color: 0x7dd3fc,
      transparent: true,
      opacity: 0.22,
      wireframe: true,
    });
    const shardGeometry = new THREE.BoxGeometry(1.35, 1.9, 0.035);
    const shards = new THREE.Group();
    [
      [-5.4, 1.2, -8.5, 0.1, 0.58],
      [5.15, 2.0, -10.2, -0.12, -0.55],
      [-3.9, 3.05, -17.5, -0.24, 0.4],
      [3.6, 0.85, -19.2, 0.18, -0.42],
    ].forEach(([x, y, z, rx, ry]) => {
      const shard = new THREE.Mesh(shardGeometry, shardMaterial.clone());
      shard.position.set(x, y, z);
      shard.rotation.set(rx, ry, 0);
      shards.add(shard);
    });
    root.add(shards);

    const starsGeometry = new THREE.BufferGeometry();
    const starPositions = [];
    for (let i = 0; i < 520; i += 1) {
      starPositions.push(
        THREE.MathUtils.randFloatSpread(32),
        THREE.MathUtils.randFloat(-2.5, 9.5),
        THREE.MathUtils.randFloat(-54, 4)
      );
    }
    starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
    const stars = new THREE.Points(
      starsGeometry,
      new THREE.PointsMaterial({
        color: 0x93c5fd,
        size: 0.035,
        transparent: true,
        opacity: 0.58,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    root.add(stars);

    const tempMatrix = new THREE.Matrix4();
    const tempPosition = new THREE.Vector3();
    const tempScale = new THREE.Vector3(1, 1, 1);
    const tempQuaternion = new THREE.Quaternion();
    const zAxis = new THREE.Vector3(0, 0, 1);

    const placeAlongCurve = (mesh, count, time, laneOffset, speed, scalePulse = false) => {
      for (let i = 0; i < count; i += 1) {
        const t = (i / count + time * speed) % 1;
        const point = freewayCurve.getPoint(t);
        const tangent = freewayCurve.getTangent(t).normalize();
        const normal = new THREE.Vector3(tangent.z, 0, -tangent.x).normalize();
        const lane = typeof laneOffset === 'function' ? laneOffset(i) : laneOffset;
        tempPosition.copy(point).addScaledVector(normal, lane);
        tempPosition.y += 0.03;
        tempQuaternion.setFromUnitVectors(zAxis, tangent);
        const pulse = scalePulse ? 0.65 + Math.sin((time + i) * 5.5) * 0.18 : 1;
        tempScale.set(pulse, pulse, pulse);
        tempMatrix.compose(tempPosition, tempQuaternion, tempScale);
        mesh.setMatrixAt(i, tempMatrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
    };

    let width = 1;
    let height = 1;
    const resize = () => {
      width = canvas.clientWidth || window.innerWidth;
      height = canvas.clientHeight || window.innerHeight;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.position.z = width < 680 ? 9.4 : 8.2;
      camera.position.y = width < 680 ? 2.65 : 2.15;
      camera.updateProjectionMatrix();
    };
    resize();
    window.addEventListener('resize', resize);

    let frameId = 0;
    const clock = new THREE.Clock();

    const animate = () => {
      const elapsed = clock.getElapsedTime();
      const time = reduceMotion ? 0.18 : elapsed;
      const pointer = pointerRef.current;

      root.rotation.y += ((pointer.x * 0.13) - root.rotation.y) * 0.045;
      root.rotation.x += ((-pointer.y * 0.045) - root.rotation.x) * 0.045;
      camera.lookAt(pointer.x * 0.45, 0.62 + pointer.y * 0.14, -7.5);

      placeAlongCurve(laneDashes, dashCount, time, 0, reduceMotion ? 0 : -0.08);
      placeAlongCurve(
        lightTrails,
        vehicleCount,
        time,
        (index) => (index % 2 === 0 ? -1.16 : 1.16) + Math.sin(index * 4.8) * 0.12,
        reduceMotion ? 0 : -0.13,
        true
      );

      portal.rotation.z = time * 0.18;
      portal.children.forEach((ring, index) => {
        ring.rotation.z = (index % 2 === 0 ? 1 : -1) * time * (0.34 + index * 0.16);
        ring.scale.setScalar(1 + Math.sin(time * 1.8 + index) * 0.025);
      });
      shards.children.forEach((shard, index) => {
        shard.rotation.z = Math.sin(time * 0.7 + index) * 0.08;
        shard.position.y += Math.sin(time + index) * 0.0008;
      });
      stars.rotation.y = time * 0.012;

      renderer.render(scene, camera);
      frameId = window.requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener('resize', resize);
      disposeObject(root);
      starsGeometry.dispose();
      renderer.dispose();
    };
  }, []);

  const handlePointerMove = (event) => {
    const width = window.innerWidth || 1;
    const height = window.innerHeight || 1;
    pointerRef.current = {
      x: (event.clientX / width - 0.5) * 2,
      y: (event.clientY / height - 0.5) * 2,
    };
  };

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#02050c]" onPointerMove={handlePointerMove}>
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="absolute inset-0 h-full w-full"
      />

      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: [
            'linear-gradient(180deg, rgba(2,5,12,0.15), rgba(2,5,12,0.08) 46%, rgba(2,5,12,0.72))',
            'linear-gradient(90deg, rgba(34,211,238,0.12), transparent 28%, transparent 72%, rgba(16,185,129,0.12))',
          ].join(', '),
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.16) 1px, transparent 1px)',
          backgroundSize: '100% 5px',
        }}
      />

      <motion.button
        type="button"
        onClick={onEnter}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        whileTap={{ scale: 0.985 }}
        className="relative z-10 grid min-h-screen w-full cursor-pointer place-items-center px-6 text-center outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
      >
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.9, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col items-center gap-4"
        >
          <motion.div
            animate={{ y: [0, -8, 0], boxShadow: [
              '0 0 28px rgba(34,211,238,0.24)',
              '0 0 56px rgba(52,211,153,0.42)',
              '0 0 28px rgba(34,211,238,0.24)',
            ] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
            className="grid h-20 w-20 place-items-center rounded-full border border-cyan-200/25 bg-black/30 backdrop-blur-md md:h-24 md:w-24"
          >
            <span className="font-grotesk text-2xl font-black text-emerald-300 md:text-3xl">
              FWL
            </span>
          </motion.div>

          <div className="space-y-1">
            <h1 className="font-grotesk text-4xl font-black text-white drop-shadow-[0_0_22px_rgba(125,211,252,0.55)] md:text-7xl">
              FREEWAY
            </h1>
            <p className="font-mono text-xs uppercase text-emerald-200/80 md:text-sm">
              LIFE
            </p>
          </div>

          <motion.p
            animate={{ opacity: [0.45, 1, 0.45], y: [0, -3, 0] }}
            transition={{ duration: 2.1, repeat: Infinity, ease: 'easeInOut' }}
            className="font-mono text-[11px] uppercase text-cyan-100/70 md:text-xs"
          >
            TOCCA PER ENTRARE
          </motion.p>
        </motion.div>
      </motion.button>
    </div>
  );
}
