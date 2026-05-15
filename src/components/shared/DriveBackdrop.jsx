import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

const disposeThreeObject = (object) => {
  object.traverse((child) => {
    if (child.geometry) child.geometry.dispose();
    if (Array.isArray(child.material)) {
      child.material.forEach((material) => material.dispose());
    } else if (child.material) {
      child.material.dispose();
    }
  });
};

function AmbientDriveScene({ tone = 'emerald' }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      });
    } catch (error) {
      console.warn('Drive backdrop unavailable:', error);
      return undefined;
    }

    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = tone === 'amber' ? 1.04 : 1.16;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 80);
    camera.position.set(0, 2.3, 10.2);

    const root = new THREE.Group();
    const tunnel = new THREE.Group();
    scene.add(root);
    root.add(tunnel);

    scene.add(new THREE.AmbientLight(0x9ee7ff, 0.34));
    const cyanLight = new THREE.PointLight(0x22d3ee, 18, 24);
    cyanLight.position.set(-4.5, 3.2, 2.2);
    const emeraldLight = new THREE.PointLight(0x34d399, 24, 30);
    emeraldLight.position.set(4.2, 2.8, -7);
    const amberLight = new THREE.PointLight(0xf59e0b, 9, 18);
    amberLight.position.set(0, 1.1, -13);
    scene.add(cyanLight, emeraldLight, amberLight);

    const tunnelRings = [];
    for (let index = 0; index < 16; index += 1) {
      const material = new THREE.MeshBasicMaterial({
        color: index % 3 === 0 ? 0xf59e0b : index % 2 === 0 ? 0x22d3ee : 0x34d399,
        transparent: true,
        opacity: 0.08,
        wireframe: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const ring = new THREE.Mesh(new THREE.TorusGeometry(2.55 + index * 0.04, 0.012, 8, 96), material);
      ring.position.z = -2.5 - index * 1.7;
      ring.userData.baseZ = ring.position.z;
      ring.userData.phase = index * 0.37;
      tunnel.add(ring);
      tunnelRings.push(ring);
    }

    const dashGeometry = new THREE.BoxGeometry(0.06, 0.034, 1.04);
    const dashMaterial = new THREE.MeshBasicMaterial({
      color: 0xdff7ff,
      transparent: true,
      opacity: 0.42,
      blending: THREE.AdditiveBlending,
    });
    const dashCount = 68;
    const dashes = new THREE.InstancedMesh(dashGeometry, dashMaterial, dashCount);
    tunnel.add(dashes);

    const trailGeometry = new THREE.BoxGeometry(0.08, 0.04, 1.55);
    const trailMaterial = new THREE.MeshBasicMaterial({
      color: tone === 'amber' ? 0xf59e0b : 0x34d399,
      transparent: true,
      opacity: 0.38,
      blending: THREE.AdditiveBlending,
    });
    const trailCount = 36;
    const trails = new THREE.InstancedMesh(trailGeometry, trailMaterial, trailCount);
    tunnel.add(trails);

    const particlesGeometry = new THREE.BufferGeometry();
    const particles = [];
    for (let index = 0; index < 520; index += 1) {
      particles.push(
        THREE.MathUtils.randFloatSpread(19),
        THREE.MathUtils.randFloat(-3.8, 6.8),
        THREE.MathUtils.randFloat(-36, 5)
      );
    }
    particlesGeometry.setAttribute('position', new THREE.Float32BufferAttribute(particles, 3));
    const starField = new THREE.Points(
      particlesGeometry,
      new THREE.PointsMaterial({
        color: 0xbff7ff,
        size: 0.03,
        transparent: true,
        opacity: 0.46,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    root.add(starField);

    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    const zAxis = new THREE.Vector3(0, 0, 1);
    const direction = new THREE.Vector3(0, 0, -1);

    let width = 1;
    let height = 1;
    const resize = () => {
      width = canvas.clientWidth || window.innerWidth;
      height = canvas.clientHeight || window.innerHeight;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.position.z = width < 720 ? 11.8 : 10.2;
      camera.position.y = width < 720 ? 2.8 : 2.3;
      tunnel.position.y = width < 720 ? -0.2 : -0.45;
      tunnel.position.x = width < 720 ? 0.45 : 0;
      camera.updateProjectionMatrix();
    };
    resize();
    window.addEventListener('resize', resize);

    let frameId = 0;
    const clock = new THREE.Clock();
    const animate = () => {
      const elapsed = reduceMotion ? 0.2 : clock.getElapsedTime();
      const speed = reduceMotion ? 0 : 0.42;

      root.rotation.y = Math.sin(elapsed * 0.24) * 0.032;
      tunnel.rotation.z = Math.sin(elapsed * 0.16) * 0.07;
      starField.rotation.y = elapsed * 0.007;

      tunnelRings.forEach((ring, index) => {
        let z = ring.userData.baseZ + ((elapsed * 0.62) % 1.7);
        if (z > -1.4) z -= 27.2;
        ring.position.z = z;
        ring.scale.setScalar(1 + Math.sin(elapsed * 1.2 + ring.userData.phase) * 0.024);
        ring.material.opacity = 0.065 + Math.sin(elapsed * 0.8 + index) * 0.018;
      });

      for (let index = 0; index < dashCount; index += 1) {
        const lane = index % 2 === 0 ? -0.38 : 0.38;
        const z = -1.8 - ((index / dashCount) * 28 + elapsed * speed * 3.6) % 28;
        const x = lane + Math.sin(index * 1.7 + elapsed * 0.4) * 0.08;
        position.set(x, -1.08, z);
        quaternion.setFromUnitVectors(zAxis, direction);
        scale.set(1, 1, 1.15);
        matrix.compose(position, quaternion, scale);
        dashes.setMatrixAt(index, matrix);
      }
      dashes.instanceMatrix.needsUpdate = true;

      for (let index = 0; index < trailCount; index += 1) {
        const side = index % 2 === 0 ? -1 : 1;
        const z = -2.4 - ((index / trailCount) * 29 + elapsed * speed * 4.8) % 29;
        const x = side * (1.12 + Math.sin(index * 3.1) * 0.2);
        position.set(x, -0.96, z);
        quaternion.setFromUnitVectors(zAxis, direction);
        const pulse = 0.82 + Math.sin(elapsed * 2.3 + index) * 0.12;
        scale.set(pulse, pulse, 1.42);
        matrix.compose(position, quaternion, scale);
        trails.setMatrixAt(index, matrix);
      }
      trails.instanceMatrix.needsUpdate = true;

      camera.lookAt(0, 0, -5);
      renderer.render(scene, camera);
      frameId = window.requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener('resize', resize);
      disposeThreeObject(root);
      particlesGeometry.dispose();
      renderer.dispose();
    };
  }, [tone]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full opacity-80"
    />
  );
}

export default function DriveBackdrop({ tone = 'emerald' }) {
  return (
    <>
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-[46%] h-[72vh] w-[72vw] min-w-[320px] -translate-x-1/2 rounded-t-[45%] bg-gradient-to-t from-emerald-300/10 via-cyan-300/7 to-transparent blur-2xl" />
        <div className="absolute -left-[15%] top-[18%] h-[40vh] w-[38vw] rounded-full bg-emerald-400/9 blur-3xl" />
        <div className="absolute -right-[10%] top-[8%] h-[46vh] w-[36vw] rounded-full bg-cyan-300/8 blur-3xl" />
      </div>

      <AmbientDriveScene tone={tone} />

      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: [
            'radial-gradient(circle at 50% 46%, rgba(2,5,12,0.02), rgba(2,5,12,0.54) 62%, rgba(0,0,0,0.9) 100%)',
            'linear-gradient(180deg, rgba(2,5,12,0.12), rgba(2,5,12,0.58))',
            'linear-gradient(90deg, rgba(14,165,233,0.08), transparent 26%, transparent 72%, rgba(245,158,11,0.07))',
          ].join(', '),
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.16) 1px, transparent 1px)',
          backgroundSize: '100% 5px',
        }}
      />
    </>
  );
}
