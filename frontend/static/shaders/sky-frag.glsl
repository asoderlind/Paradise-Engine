precision highp float;

uniform vec3 topColor;
uniform vec3 bottomColor;
uniform vec3 sunPosition;
uniform vec3 moonPosition;
uniform vec3 sunColor;
uniform vec3 moonColor;
uniform float timeCycle;
uniform float uCloudNoiseScale;
uniform float uCloudDensity; // Controls overall cloud density (0.0 to 1.0)
uniform vec3 uCloudColor;    // Controls cloud color (RGB)

uniform sampler2D uGalaxyTexture;

in vec3 vWorldPosition;
in vec2 vUv;


const float PI = 3.14159265359;


//
// Description : GLML 3D simplex noise function.
//      Author : Ian McEwan, Ashima Arts.
//  Maintainer : stegu
//     License : MIT License
//               https://github.com/ashima/webgl-noise
//
// See paper: https://cgvr.cs.uni-bremen.de/teaching/cg_literatur/simplexnoise.pdf
// by Stefan Gustavson at Linköping University

vec4 mod289(vec4 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec3 mod289(vec3 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 permute(vec4 x) {
  return mod289(((x * 34.0) + 1.0) * x);
}

float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

  // First corner
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);

  // Other corners
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);

  // x0 = x0 - 0.0 + 0.0 * C.xxx;
  vec3 x1 = x0 - i1 + 1.0 * C.xxx;
  vec3 x2 = x0 - i2 + 2.0 * C.xxx;
  vec3 x3 = x0 - 1.0 + 3.0 * C.xxx;

  // Permutations
  i = mod289(i);
  vec4 p = permute(permute(permute(
      i.z + vec4(0.0, i1.z, i2.z, 1.0)) +
      i.y + vec4(0.0, i1.y, i2.y, 1.0)) +
      i.x + vec4(0.0, i1.x, i2.x, 1.0));

  // Gradients
  float n_ = 0.142857142857; // 1.0/7.0
  vec3 ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);  // mod(p,7*7)
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);    // mod(j,N)

  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);

  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);

  // Normalization
  vec4 norm = inversesqrt(vec4(
      dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)
  ));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  // Mix contributions
  vec4 m = max(0.6 - vec4(
      dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)
  ), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(
      dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)
  ));
}
    
vec3 computeAtmosphere(vec3 rayDir, vec3 sunDir) {
  float cosTheta = dot(rayDir, sunDir);
  float rayleighPhase = 0.75 * (1.0 + cosTheta * cosTheta);
  float miePhase = 1.5 * ((1.0 - 0.1 * cosTheta) / (2.0 + 0.1));

  // Fix: Calculate height based on pure Y coordinate for correct gradient
  float height = normalize(vWorldPosition).y;

  // Increase contrast in the gradient
  height = pow(max(0.0, height), 0.5);

  // Invert the mix to put top color at top
  return mix(bottomColor, topColor, height) * 
         (rayleighPhase + miePhase);
}
        
float computeCelestialGlow(vec3 viewDir, vec3 celestialDir, float intensity, bool isMoon) {
  float cosAngle = dot(normalize(viewDir), normalize(celestialDir));

  // Core disc
  float disc = isMoon ? smoothstep(0.9995, 0.9999, cosAngle) * 4.0 : 
                        smoothstep(0.9998, 0.9999, cosAngle);

  // Inner corona (close to the disc)
  float innerCorona = pow(max(0.0, cosAngle), 128.0) * 2.0;

  // Middle corona (subtle glow)
  float middleCorona = pow(max(0.0, cosAngle), 32.0) *  (isMoon ? 1.0 : 0.5);

  // Outer corona (very subtle, wide glow)
  float outerCorona = pow(max(0.0, cosAngle), 8.0) * (isMoon ? 0.2 : 0.1);

  // Combine all corona effects
  float totalGlow = disc + innerCorona + middleCorona + outerCorona;

  if (isMoon) {
    intensity *= 1.5;
  }

  // Horizon enhancement
  float horizonEffect = 1.0 - abs(normalize(viewDir).y);
  totalGlow *= 1.0 + horizonEffect * 0.5;

  return totalGlow * intensity;
}

void main() {
  vec3 viewDir = normalize(vWorldPosition);

  // Use normalized world position for noise coordinates
  vec3 noiseCoord = normalize(vWorldPosition) * uCloudNoiseScale;

  // Introduce time variations to animate the clouds
  float timeFactor = timeCycle * 0.2;
  noiseCoord += vec3(
    sin(timeFactor) * 5.0,
    cos(timeFactor) * 5.0,
    sin(timeFactor * 0.5) * 5.0
  );

  float noiseValue1 = snoise(noiseCoord * 1.0);
  float noiseValue2 = snoise(noiseCoord * 3.0) * 0.5;
  float noiseValue3 = snoise(noiseCoord * 5.0) * 0.25;

  // Adjust noise value to control cloud density
  float cloudDensity = smoothstep(0.0, 1.0, noiseValue1 + noiseValue2 + noiseValue3);
  cloudDensity *= uCloudDensity;

  // Compute base sky color with atmospheric scattering
  vec3 skyColor = computeAtmosphere(viewDir, normalize(sunPosition));

  /*
  * Galaxy texture
  */
  vec2 galaxyUv = vec2(
    atan(viewDir.z, viewDir.x) / (2.0 * PI) + 0.5,
    asin(viewDir.y) / PI + 0.5
  );

  float galaxySpeed = 0.02; // Adjust speed as desired

  galaxyUv *= 3.0; // Scale the texture
  galaxyUv.y += 0.5; // Offset the texture
  galaxyUv.x += timeCycle * galaxySpeed; // Animate the galaxy texture

  // Wrap UV coordinates to [0,1] after scaling and animation
  galaxyUv = fract(galaxyUv);

  // Sample the galaxy texture with scaled and wrapped UVs
  vec3 galaxyColor = texture(uGalaxyTexture, galaxyUv).rgb; // Sample the galaxy texture

  float nightFactor = smoothstep(0.4, 0.8, 1.0 - timeCycle); // Night factor

  float flicker = snoise(vec3(galaxyUv * 50.0, timeCycle * 10.0));

  galaxyColor *= 1.0 + 0.1 * flicker;
  /*
  * End galaxy texture
  */

  // Enhance sky brightness during day
  float dayBrightness = smoothstep(-0.1, 0.3, normalize(sunPosition).y);
  skyColor *= mix(1.0, 2.0, dayBrightness);

  // Sun contribution with corrected height check
  float sunHeight = normalize(sunPosition).y;
  float sunGlow = computeCelestialGlow(viewDir, normalize(sunPosition), timeCycle, false);
  vec3 sunContribution = sunGlow * sunColor * (1.0 + 2.0 * max(0.0, sunHeight));

  // Moon contribution
  float moonGlow = computeCelestialGlow(viewDir, normalize(moonPosition), 1.0 - timeCycle, true);
  vec3 moonContribution = moonGlow * moonColor;

  // Combine everything
  vec3 finalColor = skyColor + sunContribution + moonContribution + cloudDensity * uCloudColor;

  // Enhance day/night contrast
  float nightEffect = (1.0 - timeCycle) * (1.0 - max(0.0, sunHeight));
  finalColor = mix(finalColor, finalColor * 0.1, nightEffect);

  // HDR tone mapping
  finalColor = finalColor / (finalColor + vec3(1.0));

  // Blend the galaxy texture into the final color
  finalColor = mix(finalColor, finalColor + galaxyColor, nightFactor);

  gl_FragColor = vec4(finalColor, 1.0);
}