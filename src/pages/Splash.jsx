// @ts-nocheck
import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import * as THREE from 'three';
import FreewayLogo from '@/components/brand/FreewayLogo';

const buildRoadSurface = (curve, width = 6.4, segments = 128) => {
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
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
      });
    } catch (error) {
      console.warn('Splash 3D scene unavailable:', error);
      return undefined;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.38;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x02050c);
    scene.fog = new THREE.FogExp2(0x071522, 0.026);

    const camera = new THREE.PerspectiveCamera(56, 1, 0.1, 110);
    camera.position.set(0, 1.62, 10.2);

    const root = new THREE.Group();
    scene.add(root);

    const ambient = new THREE.AmbientLight(0x9ee7ff, 0.48);
    const cyanLight = new THREE.PointLight(0x22d3ee, 34, 28);
    cyanLight.position.set(-4.6, 3.8, 3.2);
    const emeraldLight = new THREE.PointLight(0x34d399, 42, 34);
    emeraldLight.position.set(4.8, 3.1, -8);
    const amberLight = new THREE.PointLight(0xf59e0b, 22, 24);
    amberLight.position.set(0, 1.2, -18);
    scene.add(ambient, cyanLight, emeraldLight, amberLight);

    const freewayCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, -1.28, 10.4),
      new THREE.Vector3(-1.9, -1.02, 3.6),
      new THREE.Vector3(1.65, -0.72, -5.5),
      new THREE.Vector3(-1.05, -0.45, -16.8),
      new THREE.Vector3(0, -0.2, -34),
    ]);

    const roadMaterial = new THREE.MeshStandardMaterial({
      color: 0x06131d,
      metalness: 0.42,
      roughness: 0.36,
      emissive: 0x0f2b34,
      emissiveIntensity: 0.82,
      transparent: true,
      opacity: 0.98,
      side: THREE.DoubleSide,
    });
    const road = new THREE.Mesh(buildRoadSurface(freewayCurve), roadMaterial);
    root.add(road);

    const edgeMaterial = new THREE.MeshBasicMaterial({
      color: 0x5eead4,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
    });
    const edgeGeometryLeft = new THREE.TubeGeometry(buildOffsetCurve(freewayCurve, -3.08), 128, 0.045, 8, false);
    const edgeGeometryRight = new THREE.TubeGeometry(buildOffsetCurve(freewayCurve, 3.08), 128, 0.045, 8, false);
    const leftEdge = new THREE.Mesh(edgeGeometryLeft, edgeMaterial);
    const rightEdge = new THREE.Mesh(edgeGeometryRight, edgeMaterial.clone());
    root.add(leftEdge, rightEdge);

    const shoulderMaterial = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.46,
      blending: THREE.AdditiveBlending,
    });
    const shoulderLeft = new THREE.Mesh(new THREE.TubeGeometry(buildOffsetCurve(freewayCurve, -2.25), 128, 0.02, 8, false), shoulderMaterial);
    const shoulderRight = new THREE.Mesh(new THREE.TubeGeometry(buildOffsetCurve(freewayCurve, 2.25), 128, 0.02, 8, false), shoulderMaterial.clone());
    root.add(shoulderLeft, shoulderRight);

    const dashGeometry = new THREE.BoxGeometry(0.11, 0.03, 1.28);
    const dashMaterial = new THREE.MeshBasicMaterial({
      color: 0xe0f2fe,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
    });
    const dashCount = 58;
    const laneDashes = new THREE.InstancedMesh(dashGeometry, dashMaterial, dashCount);
    root.add(laneDashes);

    const vehicleGeometry = new THREE.BoxGeometry(0.16, 0.075, 1.35);
    const vehicleMaterial = new THREE.MeshBasicMaterial({
      color: 0x67e8f9,
      transparent: true,
      opacity: 0.88,
      blending: THREE.AdditiveBlending,
    });
    const vehicleCount = 92;
    const lightTrails = new THREE.InstancedMesh(vehicleGeometry, vehicleMaterial, vehicleCount);
    root.add(lightTrails);

    const portal = new THREE.Group();
    portal.position.set(0, 0.82, -18.5);
    root.add(portal);

    const ringMaterials = [
      new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.65, wireframe: true }),
      new THREE.MeshBasicMaterial({ color: 0x34d399, transparent: true, opacity: 0.58, wireframe: true }),
      new THREE.MeshBasicMaterial({ color: 0xfacc15, transparent: true, opacity: 0.34, wireframe: true }),
    ];
    [3.35, 4.15, 5.05].forEach((radius, index) => {
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
      [-5.8, 0.7, -6.5, 0.1, 0.58],
      [5.45, 1.9, -9.8, -0.12, -0.55],
      [-4.8, 3.0, -18.5, -0.24, 0.4],
      [4.3, 0.45, -22.2, 0.18, -0.42],
    ].forEach(([x, y, z, rx, ry]) => {
      const shard = new THREE.Mesh(shardGeometry, shardMaterial.clone());
      shard.position.set(x, y, z);
      shard.rotation.set(rx, ry, 0);
      shards.add(shard);
    });
    root.add(shards);

    const starsGeometry = new THREE.BufferGeometry();
    const starPositions = [];
    for (let i = 0; i < 760; i += 1) {
      starPositions.push(
        THREE.MathUtils.randFloatSpread(32),
        THREE.MathUtils.randFloat(-3.6, 10.5),
        THREE.MathUtils.randFloat(-68, 5)
      );
    }
    starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
    const stars = new THREE.Points(
      starsGeometry,
      new THREE.PointsMaterial({
        color: 0x93c5fd,
        size: 0.04,
        transparent: true,
        opacity: 0.64,
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
        const t = ((i / count + time * speed) % 1 + 1) % 1;
        const point = freewayCurve.getPoint(t);
        const tangent = freewayCurve.getTangent(t).normalize();
        const normal = new THREE.Vector3(tangent.z, 0, -tangent.x).normalize();
        const lane = typeof laneOffset === 'function' ? laneOffset(i) : laneOffset;
        tempPosition.copy(point).addScaledVector(normal, lane);
        tempPosition.y += 0.05;
        tempQuaternion.setFromUnitVectors(zAxis, tangent);
        const pulse = scalePulse ? 0.78 + Math.sin((time + i) * 5.5) * 0.22 : 1;
        tempScale.set(pulse, pulse, scalePulse ? pulse * 1.45 : pulse);
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
      camera.position.z = width < 680 ? 11.4 : 10.2;
      camera.position.y = width < 680 ? 2.2 : 1.62;
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
      camera.lookAt(pointer.x * 0.5, -0.18 + pointer.y * 0.16, -9.8);

      placeAlongCurve(laneDashes, dashCount, time, 0, reduceMotion ? 0 : -0.12);
      placeAlongCurve(
        lightTrails,
        vehicleCount,
        time,
        (index) => (index % 2 === 0 ? -1.72 : 1.72) + Math.sin(index * 4.8) * 0.18,
        reduceMotion ? 0 : -0.18,
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
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-[56%] h-[78vh] w-[70vw] -translate-x-1/2 rounded-t-[45%] bg-gradient-to-t from-emerald-300/15 via-cyan-300/10 to-transparent blur-2xl" />
        <div
          className="absolute left-1/2 top-[42%] h-[74vh] w-[38vw] min-w-[320px] -translate-x-1/2 origin-top rounded-t-full opacity-[0.65]"
          style={{
            clipPath: 'polygon(46% 0, 54% 0, 88% 100%, 12% 100%)',
            background: 'linear-gradient(180deg, rgba(103,232,249,0.2), rgba(5,12,20,0.72) 35%, rgba(2,5,12,0.08))',
          }}
        />
        <div
          className="absolute left-1/2 top-[42%] h-[74vh] w-[24vw] min-w-[210px] -translate-x-1/2 origin-top opacity-70"
          style={{
            clipPath: 'polygon(49% 0, 51% 0, 60% 100%, 40% 100%)',
            background: 'repeating-linear-gradient(180deg, rgba(236,254,255,0.65) 0 14px, transparent 14px 32px)',
          }}
        />
      </div>

      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="absolute inset-0 h-full w-full"
      />

      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: [
            'radial-gradient(circle at 50% 46%, rgba(2,5,12,0.06), rgba(2,5,12,0.42) 56%, rgba(0,0,0,0.84) 100%)',
            'linear-gradient(180deg, rgba(2,5,12,0.02), rgba(2,5,12,0.12) 46%, rgba(2,5,12,0.54))',
            'linear-gradient(90deg, rgba(34,211,238,0.1), transparent 25%, transparent 72%, rgba(245,158,11,0.08))',
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
            className="grid h-24 w-24 place-items-center rounded-[28px] border border-cyan-200/25 bg-black/24 backdrop-blur-md md:h-28 md:w-28"
          >
            <FreewayLogo iconClassName="h-20 w-20 md:h-24 md:w-24" />
          </motion.div>

          <div className="space-y-1">
            <h1 className="font-grotesk text-5xl font-black leading-none text-white drop-shadow-[0_0_30px_rgba(125,211,252,0.58)] md:text-7xl">
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
