import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { ASIA_LAND, OTHER_LAND } from '../../common/ui/globeLand';
import { getTheme } from '../../common/theme';

// ───────────────────────────────────────────────
// 맑은 물방울 지구 (three.js) - 메인 지구본(OrbitGlobe)과 같은 디자인 시안 3번 (동작은 민승 버전 그대로)
//  - 거의 투명한 바다 구 + 흰 땅(아시아만 강조색) 무늬 구 + 화면 쪽 유리 빛(그늘·빛·반사 띠·굴절 빛줄기·테두리)
//  - 바다가 투명해서 뒤로 돌아간 비행기도 비쳐 보임 (물방울 느낌)
//  - phase: 'flying' | 'approach' | 'drop' | 'landed' | 'error'
//  - target: { lat, lng }  태어날 나라 위치 (approach 부터 사용)
//  - onParked({ x, y, tx, ty }): 비행기가 멈췄을 때 화면 좌표
//      x, y  = 비행기 위치 (아기가 뛰어내리는 곳)
//      tx, ty = 착륙 지점 위치 (아기가 떨어지는 곳)
// ───────────────────────────────────────────────

const EARTH_RADIUS = 5;
const ORBIT_RADIUS = 6.5;

// 디자인 색 (design.css 와 같은 값) - 라이트 안개 회청 / 다크 저녁 남색
//   sea·seaOpacity: 바다 구 (투명), other·asia: 땅 무늬 (캔버스 색), gold: 강조색 (비행기 날개·핀·꼬리 별빛)
const PALETTE = {
  light: {
    sea: 0x9cc4e8, seaOpacity: 0.35, atmosphere: 0xffffff,
    other: 'rgba(255, 255, 255, 0.6)', otherEdge: 'rgba(255, 255, 255, 0.95)',
    asia: 'rgba(194, 77, 39, 0.6)', asiaEdge: 'rgba(194, 77, 39, 0.95)',
    rim: 'rgba(255, 255, 255, 0.7)',
    gold: 0xc24d27, ink: 0x1a2230, sub: 0x566173, edge: 0x3a4556,
  },
  dark: {
    sea: 0x5a8ccf, seaOpacity: 0.22, atmosphere: 0x9fb8ff,
    other: 'rgba(238, 241, 247, 0.28)', otherEdge: 'rgba(238, 241, 247, 0.65)',
    asia: 'rgba(242, 198, 109, 0.65)', asiaEdge: 'rgba(242, 198, 109, 1)',
    rim: 'rgba(255, 255, 255, 0.55)',
    gold: 0xf2c66d, ink: 0xeef1f7, sub: 0x9ea9be, edge: 0x121926,
  },
};
// 지금 테마 색 (BirthPage 에서 key={theme} 으로 다시 만들 때 새로 고름)
let C = PALETTE.dark;

// 위도·경도 → 지구 표면 좌표
function latLngToVector(lat, lng, radius) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -(radius * Math.sin(phi) * Math.cos(theta)),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

// 물체: 본체 + 살짝 큰 남색 뒷면(= 은은한 테두리)
function createToonObject(geometry, color, outlineScale = 1.05) {
  const group = new THREE.Group();
  group.add(new THREE.Mesh(geometry, new THREE.MeshPhongMaterial({ color, shininess: 30 })));
  const outline = new THREE.Mesh(
    geometry,
    new THREE.MeshBasicMaterial({ color: C.edge, side: THREE.BackSide }),
  );
  if (typeof outlineScale === 'number') outline.scale.setScalar(outlineScale);
  else outline.scale.copy(outlineScale);
  group.add(outline);
  return group;
}

// 땅 무늬 (경위도 지도 한 장 → 구에 감음): 메인 지구본과 같은 땅 테두리 데이터(globeLand)
//   한 덩어리가 경도 ±180 을 넘어가도 끊기지 않게 경도를 이어 붙인 뒤, 왼쪽·오른쪽으로 한 바퀴씩 옮겨 한 번 더 그림
function createLandTexture() {
  const TW = 2048;
  const TH = 1024;
  const c = document.createElement('canvas');
  c.width = TW;
  c.height = TH;
  const ctx = c.getContext('2d');
  ctx.lineJoin = 'round';
  ctx.lineWidth = 1.6;
  const draw = (rings, fill, stroke) => {
    ctx.fillStyle = fill;
    ctx.strokeStyle = stroke;
    rings.forEach((P) => {
      const pts = [];
      let prev = null;
      for (let i = 0; i < P.length; i += 2) {
        let lon = P[i];
        if (prev != null) {
          while (lon - prev > 180) lon -= 360;
          while (lon - prev < -180) lon += 360;
        }
        prev = lon;
        pts.push([lon, P[i + 1]]);
      }
      [-360, 0, 360].forEach((shift) => {
        ctx.beginPath();
        pts.forEach(([lo, la], k) => {
          const x = ((lo + shift + 180) / 360) * TW;
          const y = ((90 - la) / 180) * TH;
          if (k) ctx.lineTo(x, y);
          else ctx.moveTo(x, y);
        });
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      });
    });
  };
  draw(OTHER_LAND, C.other, C.otherEdge);
  draw(ASIA_LAND, C.asia, C.asiaEdge);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

// 물방울 유리 빛 (화면 쪽에 붙이는 원판 한 장): 오른쪽 아래 그늘 + 왼쪽 위 빛 + 반사 띠 + 굴절 빛줄기 + 흰 테두리
//   메인 지구본 OrbitGlobe 의 그리기와 같은 비율 (반지름 150 기준 숫자를 r 에 맞춰 줄임)
function createGlassTexture() {
  const S = 512;
  const c = document.createElement('canvas');
  c.width = S;
  c.height = S;
  const ctx = c.getContext('2d');
  const m = S / 2;
  const r = S / 2 - 2;
  const k = r / 150;
  ctx.save();
  ctx.beginPath(); ctx.arc(m, m, r, 0, Math.PI * 2); ctx.clip();
  const shade = ctx.createRadialGradient(m + r * 0.4, m + r * 0.5, 0, m + r * 0.4, m + r * 0.5, r * 1.2);
  shade.addColorStop(0.5, 'rgba(0, 0, 0, 0)');
  shade.addColorStop(1, 'rgba(0, 0, 0, 0.28)');
  ctx.fillStyle = shade; ctx.fillRect(0, 0, S, S);
  const hi = ctx.createRadialGradient(m - r * 0.36, m - r * 0.5, 0, m - r * 0.36, m - r * 0.5, r * 0.9);
  hi.addColorStop(0, 'rgba(255, 255, 255, 0.85)');
  hi.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = hi; ctx.fillRect(0, 0, S, S);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.beginPath(); ctx.ellipse(m - 62 * k, m - 92 * k, 46 * k, 22 * k, (-28 * Math.PI) / 180, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
  ctx.lineWidth = 3 * k;
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(m, m, r - 10 * k, (48.4 * Math.PI) / 180, (13.7 * Math.PI) / 180, true); ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = C.rim;
  ctx.lineWidth = 1.5 * k;
  ctx.beginPath(); ctx.arc(m, m, r - 0.5 * k, 0, Math.PI * 2); ctx.stroke();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// 지구 위 한 점(local)이 카메라 쪽(dir)을 보도록 돌리는 회전값
// (북쪽이 위로 가게 유지해서 지도가 뒤집혀 보이지 않게 함)
function facingQuaternion(local, dir) {
  const north = new THREE.Vector3(0, 1, 0);
  const a2 = north.clone().sub(local.clone().multiplyScalar(north.dot(local))).normalize();
  const a3 = new THREE.Vector3().crossVectors(local, a2);
  const b2 = north.clone().sub(dir.clone().multiplyScalar(north.dot(dir))).normalize();
  const b3 = new THREE.Vector3().crossVectors(dir, b2);
  const from = new THREE.Matrix4().makeBasis(local, a2, a3);
  const to = new THREE.Matrix4().makeBasis(dir, b2, b3);
  const m = to.multiply(from.transpose()); // from 은 직교행렬이라 전치 = 역행렬
  return new THREE.Quaternion().setFromRotationMatrix(m);
}

// 지구 표면에 붙이기 (바깥을 보게)
function placeOnSphere(obj, lat, lng, radius) {
  obj.position.copy(latLngToVector(lat, lng, radius));
  obj.lookAt(0, 0, 0);
}

function ToonEarth({ phase, target, onParked }) {
  const mountRef = useRef();
  const phaseRef = useRef(phase);
  const targetRef = useRef(target);
  const onParkedRef = useRef(onParked);
  const phaseStartRef = useRef(0);

  // 부모가 준 값이 바뀌면 애니메이션 루프가 읽을 수 있게 ref 에 넣어 둠
  useEffect(() => {
    phaseRef.current = phase;
    phaseStartRef.current = performance.now();
  }, [phase]);
  useEffect(() => {
    targetRef.current = target;
  }, [target]);
  useEffect(() => {
    onParkedRef.current = onParked;
  }, [onParked]);

  useEffect(() => {
    C = PALETTE[getTheme()];
    const mount = mountRef.current;
    let width = mount.clientWidth;
    let height = mount.clientHeight;

    // ① 장면·카메라·렌더러
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 5, 25);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0); // 배경은 CSS 로
    mount.appendChild(renderer.domElement);

    // ② 조명
    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const sun = new THREE.DirectionalLight(0xcfd8ff, 1.0);
    sun.position.set(10, 20, 10);
    scene.add(sun);

    // ③ 지구 (맑은 물방울): 투명한 바다 구 + 땅 무늬 구 (앞면만 보여서 뒤쪽 땅은 안 비침) + 대기 빛
    //    투명한 것들은 깊이를 안 써서, 뒤로 돌아간 비행기도 바다 너머로 비쳐 보임
    const earthGroup = new THREE.Group();
    scene.add(earthGroup);
    earthGroup.add(new THREE.Mesh(
      new THREE.SphereGeometry(EARTH_RADIUS, 64, 64),
      new THREE.MeshPhongMaterial({
        color: C.sea, transparent: true, opacity: C.seaOpacity, shininess: 90, specular: 0xffffff, depthWrite: false,
      }),
    ));
    const landTexture = createLandTexture();
    earthGroup.add(new THREE.Mesh(
      new THREE.SphereGeometry(EARTH_RADIUS + 0.02, 96, 64),
      new THREE.MeshBasicMaterial({ map: landTexture, transparent: true, depthWrite: false }),
    ));
    const glow = new THREE.Mesh(
      new THREE.SphereGeometry(EARTH_RADIUS * 1.05, 48, 48),
      new THREE.MeshBasicMaterial({ color: C.atmosphere, transparent: true, opacity: 0.12, side: THREE.BackSide }),
    );
    scene.add(glow);

    // 유리 빛 원판: 카메라에서 본 지구 테두리(실루엣)와 꼭 맞는 크기·위치에 놓고 카메라를 보게 함
    //   (지구는 돌아도 빛은 늘 왼쪽 위에 있게 지구 묶음이 아니라 장면에 붙임)
    //   앞쪽을 지나는 비행기는 원판보다 가까워서 가려지지 않음
    const glassTexture = createGlassTexture();
    const camDist = camera.position.length();
    const silR = (EARTH_RADIUS * Math.sqrt(camDist * camDist - EARTH_RADIUS * EARTH_RADIUS)) / camDist;
    const glass = new THREE.Mesh(
      new THREE.PlaneGeometry(silR * 2, silR * 2),
      new THREE.MeshBasicMaterial({ map: glassTexture, transparent: true, depthWrite: false }),
    );
    glass.position.copy(camera.position).normalize().multiplyScalar((EARTH_RADIUS * EARTH_RADIUS) / camDist);
    glass.lookAt(camera.position);
    glass.renderOrder = 5;
    scene.add(glass);

    // ④ 비행기 + 별빛 꼬리
    const pivot = new THREE.Group();
    pivot.rotation.z = Math.PI / 6;
    pivot.rotation.x = -Math.PI / 8;
    scene.add(pivot);

    const airplane = new THREE.Group();
    airplane.add(createToonObject(new THREE.BoxGeometry(1.2, 0.6, 0.6), C.ink, new THREE.Vector3(1.05, 1.1, 1.1)));
    const wings = createToonObject(new THREE.BoxGeometry(0.5, 0.1, 2.4), C.gold, new THREE.Vector3(1.1, 1.6, 1.05));
    wings.position.set(0.1, 0.1, 0);
    airplane.add(wings);
    const tail = createToonObject(new THREE.BoxGeometry(0.3, 0.5, 0.1), C.gold, new THREE.Vector3(1.1, 1.1, 1.5));
    tail.position.set(-0.45, 0.4, 0);
    airplane.add(tail);
    const propeller = createToonObject(new THREE.BoxGeometry(0.1, 0.8, 0.1), C.sub, new THREE.Vector3(1.5, 1.1, 1.5));
    propeller.position.set(0.65, 0, 0);
    airplane.add(propeller);

    airplane.scale.setScalar(0.7);
    airplane.position.set(ORBIT_RADIUS, 0, 0);
    airplane.rotation.set(Math.PI / 8, -Math.PI / 2, Math.PI / 12);
    pivot.add(airplane);

    const trail = [];
    for (let i = 0; i < 12; i++) {
      const dot = new THREE.Mesh(
        new THREE.SphereGeometry(0.13 * (1 - i / 12), 8, 8),
        new THREE.MeshBasicMaterial({ color: C.gold, transparent: true, opacity: 0.9 - i * 0.07 }),
      );
      const a = (i + 1) * 0.12;
      dot.position.set(ORBIT_RADIUS * Math.cos(a), 0, ORBIT_RADIUS * Math.sin(a));
      pivot.add(dot);
      trail.push(dot);
    }

    // ⑤ 착륙 표시 (핀 + 퍼지는 원) - 처음엔 숨김
    const marker = new THREE.Group();
    const pinHead = createToonObject(new THREE.SphereGeometry(0.35, 16, 16), C.gold, 1.15);
    pinHead.position.z = -1.0; // lookAt(0,0,0) 기준: -z 가 바깥쪽
    const pinStick = createToonObject(new THREE.CylinderGeometry(0.06, 0.06, 0.9, 8), C.ink, 1.4);
    pinStick.rotation.x = Math.PI / 2;
    pinStick.position.z = -0.5;
    marker.add(pinHead, pinStick);
    marker.visible = false;
    earthGroup.add(marker);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.62, 0.7, 48),
      new THREE.MeshBasicMaterial({ color: C.gold, transparent: true, side: THREE.DoubleSide }),
    );
    ring.visible = false;
    earthGroup.add(ring);

    // ⑥ 애니메이션에 쓸 값들
    const clock = new THREE.Clock();
    const camDir = camera.position.clone().normalize(); // 카메라 쪽 방향
    let fromQuat = null; // 지구 회전 시작
    let toQuat = null; // 지구 회전 끝 (태어날 나라가 정면)
    let planeFrom = null; // 비행기 주차 시작 위치
    let planeFromQuat = null;
    let parked = false;
    let markerPlaced = false;
    const parkPos = camDir.clone().multiplyScalar(EARTH_RADIUS + 3)
      .add(new THREE.Vector3(0, 3.2, 0)); // 지구 정면 위쪽 하늘
    const parkQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.15, 0, 0));
    const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

    // 3D 좌표 → 화면 좌표
    const toScreen = (v) => {
      const p = v.clone().project(camera);
      return { x: (p.x * 0.5 + 0.5) * width, y: (-p.y * 0.5 + 0.5) * height };
    };

    let frameId;
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const time = clock.getElapsedTime();
      const phaseNow = phaseRef.current;
      const elapsed = (performance.now() - phaseStartRef.current) / 1000;

      propeller.rotation.x += 15 * delta;

      if (phaseNow === 'flying' || phaseNow === 'error') {
        // 지구 자전 + 비행기 빙글빙글
        earthGroup.rotation.y += 0.2 * delta;
        pivot.rotation.y += 2.0 * delta;
        airplane.position.y = Math.sin(time * 4) * 0.3;
        trail.forEach((dot, i) => {
          dot.position.y = Math.sin((time - (i + 1) * 0.06) * 4) * 0.3;
        });
      } else {
        // ── 지구를 태어날 나라가 정면에 오도록 돌리기 ──
        if (!toQuat && targetRef.current) {
          const { lat, lng } = targetRef.current;
          const local = latLngToVector(lat, lng, 1).normalize();
          fromQuat = earthGroup.quaternion.clone();
          toQuat = facingQuaternion(local, camDir);

          // 비행기를 궤도에서 떼어 내서 하늘 한 곳에 세울 준비
          scene.attach(airplane);
          pivot.visible = false;
          planeFrom = airplane.position.clone();
          planeFromQuat = airplane.quaternion.clone();
        }

        if (toQuat) {
          const t = easeInOut(Math.min(elapsed / 2.0, 1));
          if (phaseNow === 'approach') earthGroup.quaternion.slerpQuaternions(fromQuat, toQuat, t);
          else earthGroup.quaternion.copy(toQuat);

          // 비행기: 1.6초 동안 지구 정면 위로 이동
          const p = phaseNow === 'approach' ? easeInOut(Math.min(elapsed / 1.6, 1)) : 1;
          if (phaseNow === 'approach' || !parked) {
            airplane.position.lerpVectors(planeFrom, parkPos, p);
            airplane.quaternion.slerpQuaternions(planeFromQuat, parkQuat, p);
          }
          airplane.position.y += Math.sin(time * 4) * 0.08;

          // 멈춘 순간 화면 좌표를 부모에게 알려 줌 (아기 출발·도착 위치)
          if (p >= 1 && !parked) {
            parked = true;
            const surface = camDir.clone().multiplyScalar(EARTH_RADIUS);
            const a = toScreen(parkPos);
            const b = toScreen(surface);
            onParkedRef.current?.({ x: a.x, y: a.y + 10, tx: b.x, ty: b.y });
          }

          // 아기가 뛰어내리고 0.9초 뒤 비행기는 오른쪽으로 떠남
          if (phaseNow === 'drop' || phaseNow === 'landed') {
            const leave = phaseNow === 'landed' ? 10 : Math.max(elapsed - 0.9, 0);
            airplane.position.x = parkPos.x + leave * leave * 6;
          }

          // 착륙: 핀이 쏙 솟고 금색 원이 퍼짐
          if (phaseNow === 'landed') {
            if (!markerPlaced) {
              const { lat, lng } = targetRef.current;
              placeOnSphere(marker, lat, lng, EARTH_RADIUS + 0.2);
              placeOnSphere(ring, lat, lng, EARTH_RADIUS + 0.25);
              marker.visible = true;
              ring.visible = true;
              markerPlaced = true;
            }
            const pop = Math.min(elapsed / 0.5, 1);
            const back = 1 + 2.7 * Math.pow(pop - 1, 3) + 1.7 * Math.pow(pop - 1, 2); // 통통 튀는 느낌
            marker.scale.setScalar(Math.max(back, 0.01));
            const r = (elapsed % 1.2) / 1.2;
            ring.scale.setScalar(1 + r * 2.5);
            ring.material.opacity = 1 - r;
          }
        }
      }

      renderer.render(scene, camera);
    };
    animate();

    // ⑦ 화면 크기 바뀌면 다시 맞추기
    const onResize = () => {
      width = mount.clientWidth;
      height = mount.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener('resize', onResize);

    // ⑧ 화면을 떠나면 정리
    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      landTexture.dispose();
      glassTexture.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} style={{ position: 'absolute', inset: 0 }} />;
}

export default ToonEarth;
