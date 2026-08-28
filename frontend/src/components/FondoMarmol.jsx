import { Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import { useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';

const vertexShader = `
  precision highp float;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  precision highp float;
  
  uniform sampler2D uMarble;
  uniform sampler2D uMarbleColor;
  uniform sampler2D uMaskSelection;
  uniform sampler2D uMaskTime;
  uniform sampler2D uNoise;
  uniform sampler2D uGradient;
  uniform vec2 uMouse;
  uniform vec3 uTime;
  uniform vec2 uPlane;
  uniform vec3 uResolution;

  varying vec2 vUv;

  vec2 coverUv(vec2 uv, vec2 size, vec2 resolution) {
    vec2 ratio = vec2(
        min((resolution.x / resolution.y) / (size.x / size.y), 1.0),
        min((resolution.y / resolution.x) / (size.y / size.x), 1.0)
    );
    return vec2(
        uv.x * ratio.x + (1.0 - ratio.x) * 0.5,
        uv.y * ratio.y + (1.0 - ratio.y) * 0.5
    );
  }

  vec3 saturation(vec3 rgb, float adjustment) {
    const vec3 W = vec3(0.2125, 0.7154, 0.0721);
    vec3 intensity = vec3(dot(rgb, W));
    return mix(intensity, rgb, adjustment);
  }

  float blendScreen(float base, float blend) {
    return 1.0-((1.0-base)*(1.0-blend));
  }

  vec3 blendScreen(vec3 base, vec3 blend) {
    return vec3(blendScreen(base.r,blend.r),blendScreen(base.g,blend.g),blendScreen(base.b,blend.b));
  }

  vec3 blendScreen(vec3 base, vec3 blend, float opacity) {
    return (blendScreen(base, blend) * opacity + base * (1.0 - opacity));
  }

  float vignette(vec2 _uv, float _threshold){
    float h = min(smoothstep(0.0, _threshold, _uv.x), smoothstep(1.0, 1.0 - _threshold, _uv.x));
    float v = min(smoothstep(0.0, _threshold, _uv.y), smoothstep(1.0, 1.0 - _threshold, _uv.y));
    return pow(min(h,v), 2.0);
  }

  void main() {
    vec2 nUv = vUv;
    vec2 st = gl_FragCoord.xy / (uResolution.xy * uResolution.z);

    // Ruido
    float noise1 = texture2D(uNoise, (nUv * 1.4) + vec2(uTime.z * 0.2 * 0.1, 0.0)).r;
    float noise2 = texture2D(uNoise, (nUv * 2.4) + vec2(-uTime.z * 0.2 * 0.1, 0.0 )).r;
    float noise = (noise1 + noise2) * 0.5;

    // Gradiente
    vec3 gradientColor = texture2D(uGradient, nUv + vec2(-uTime.z* 0.05, -uTime.z* 0.05)).rgb;

    // Máscaras
    float mask = texture2D(uMarble, nUv).r;
    float selection = texture2D(uMaskSelection, nUv).g;
    float timeShift = texture2D(uMaskTime, nUv).b;

    // Animación de revelado / tiempo
    float shiftedTimeIntro = uTime.x * 0.2;
    shiftedTimeIntro = clamp(shiftedTimeIntro - timeShift * 1.0 - 0.05, 0.0, 100000.0);

    float mtReveal = mod(shiftedTimeIntro, 1.0);
    float mtBoost = mod(uTime.y * 0.2 + timeShift * 5.0, 1.0);

    // Revelado suave
    float fadeBoost = smoothstep(0.0, 0.1, mtBoost) * (1.0 - smoothstep(0.9, 1.0, mtBoost));
    float fadeReveal = smoothstep(0.0, 0.1, mtReveal) * (1.0 - smoothstep(0.9, 1.0, mtReveal));
    float edge = 0.04;

    float phase = step(0.5, mtReveal);
    float t = fract(mtReveal * 2.0);

    float th = t - edge;
    float reveal = 1.0 - smoothstep(th, th + edge, mask);
    float hide = smoothstep(th, th + edge, mask);

    float maskReveal = mix(reveal, hide, phase) * smoothstep(0.0, 0.1, mask);
    float revealEdge = 1.0 - smoothstep(0.0 + mtReveal, 0.03 + mtReveal, mask);
    maskReveal += sin(revealEdge * 3.14) * 5.0 * pow(mask, 0.5) * fadeReveal;

    // Boost de color
    float maskBoost = 1.0 - smoothstep(0.0 + mtBoost, 0.03 + mtBoost, mask);
    maskBoost *= selection;
    maskBoost = clamp(maskBoost, 0.0, 1.0);

    float boost = sin(maskBoost * 3.14) * 10.0 * pow(mask, 0.5) * fadeBoost;

    // Efecto del mouse
    vec2 fragUv = st;
    vec2 mouseUv = uMouse * 0.5 + 0.5;
    vec2 d = (fragUv - mouseUv);
    d.x *= uResolution.x / uResolution.y;
    float mouseDist = length(d) - pow(noise, 3.0) * 0.2;
    float mouseRadius = 0.28;
    float mouseHardness = 0.00;
    float dd = smoothstep(mouseRadius * mouseHardness, mouseRadius, mouseDist);
    dd = pow(dd, 0.85);
    float mouseCircle = (1.0 - dd) * 2.0 - 1.0;
    mouseCircle = smoothstep(0.0, 1.0, noise + mouseCircle);
    mouseCircle = pow(mouseCircle, 4.0);

    // --- ILUMINACIÓN NATURAL ---
    vec4 final = texture2D(uMarbleColor, nUv);

    // 1. Usar la textura base como "altura" para iluminación (los bordes brillan más)
    float height = mask; // Usa el canal rojo como altura
    vec3 lightDir = normalize(vec3(0.5, 0.5, 1.0)); // Dirección de luz simulada
    float diffuse = max(0.0, dot(vec3(0.0, 0.0, 1.0), lightDir)); // Iluminación básica
    float rim = pow(1.0 - height, 2.0) * 0.5; // Borde de luz (rim light)

    // 2. Mezclar el color base con el gradiente de forma SUTIL (no plano)
    final.rgb = mix(final.rgb, gradientColor.rgb, 0.15); // Mezcla suave
    final.rgb = blendScreen(saturation(final.rgb, 0.9), gradientColor.rgb, 0.3); // Saturación baja

    // 3. Aplicar boost y revelado
    final.rgb *= (1.0 + boost);
    final.rgb *= maskReveal;

    // 4. Aplicar iluminación (difusa + rim) --> SOLO EN ZONAS DE GRIETAS, NO GLOBAL
    // Esto solo ilumina donde hay "venas" (height)
    float localLight = (diffuse + rim * 0.5) * height; 
    final.rgb *= (localLight * 2.0); // Multiplicamos por la "altura" de la grieta

    // 5. Efecto del mouse (solo en grietas, más sutil)
    final.rgb += mouseCircle * gradientColor.rgb * 0.3 * height;

    // 6. Vignette (oscurecer bordes)
    final.rgb *= vignette(vUv, 0.3);

    // 7. Grano sutil
    float bn = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
    final.rgb *= 1.0 - bn * 0.03;

    gl_FragColor = final;
  }
`;

function MarblePlane() {
  const { size, viewport } = useThree();
  const meshRef = useRef();

  const [marbleMap, marbleColorMap, maskSelectionMap, maskTimeMap, noiseMap, gradientMap] = useTexture([
    '/textures/marble.jpg',
    '/textures/marble.jpg',
    '/textures/marble-02.jpg',
    '/textures/marble-03.jpg',
    '/textures/noise.jpg',
    '/textures/colorA.jpg'
  ]);

  useEffect(() => {
    [marbleMap, marbleColorMap, maskSelectionMap, maskTimeMap, noiseMap, gradientMap].forEach(tex => {
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.needsUpdate = true;
    });
  }, [marbleMap, marbleColorMap, maskSelectionMap, maskTimeMap, noiseMap, gradientMap]);

  const uniforms = useMemo(() => ({
    uMarble: { value: marbleMap },
    uMarbleColor: { value: marbleColorMap },
    uMaskSelection: { value: maskSelectionMap },
    uMaskTime: { value: maskTimeMap },
    uNoise: { value: noiseMap },
    uGradient: { value: gradientMap },
    uMouse: { value: new THREE.Vector2(0, 0) },
    uTime: { value: new THREE.Vector3(0, 0, 0) },
    uPlane: { value: new THREE.Vector2(1, 1) },
    uResolution: { value: new THREE.Vector3(size.width, size.height, 1) }
  }), [marbleMap, marbleColorMap, maskSelectionMap, maskTimeMap, noiseMap, gradientMap, size]);

  const material = useMemo(() => new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms,
    transparent: true,
    depthWrite: false
  }), [uniforms]);

  useFrame((state) => {
    const { pointer, clock } = state;

    uniforms.uMouse.value.x = pointer.x;
    uniforms.uMouse.value.y = pointer.y;
    
    // CAMBIO 1: Aumentar la velocidad de la luz (antes 0.008, ahora 0.035)
    uniforms.uTime.value.x += 0.035; 
    uniforms.uTime.value.y += 0.035;
    uniforms.uTime.value.z += 0.035;

    meshRef.current.scale.set(viewport.width, viewport.height, 1);
    uniforms.uPlane.value.set(viewport.width, viewport.height);
    uniforms.uResolution.value.set(size.width, size.height, 1);
  });

  return (
    <mesh ref={meshRef} scale={[viewport.width, viewport.height, 1]}>
      <planeGeometry args={[1, 1]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}

export default function FondoMarmol() {
  return (
    <div className="absolute inset-0 z-0" style={{ width: '100%', height: '100vh', overflow: 'hidden' }}>
      <Canvas camera={{ position: [0, 0, 1] }} gl={{ antialias: true }}>
        <Suspense fallback={null}>
          <MarblePlane />
        </Suspense>
      </Canvas>
    </div>
  );
}