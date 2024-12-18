uniform float time;

const float PI = 3.1415926535897932384626433832795;
float terrainSize = 1000.0;
float terrainOffset = 500.0;

uint murmurHash12(uvec2 src) {
  const uint M = 0x5bd1e995u;
  uint h = 1190494759u;
  src *= M; src ^= src>>24u; src *= M;
  h *= M; h ^= src.x; h *= M; h ^= src.y;
  h ^= h>>13u; h *= M; h ^= h>>15u;
  return h;
}

// 1 output, 2 inputs
float hash12(vec2 src) {
  uint h = murmurHash12(floatBitsToUint(src));
  return uintBitsToFloat(h & 0x007fffffu | 0x3f800000u) - 1.0;
}

float noise12(vec2 p) {
  vec2 i = floor(p);

  vec2 f = fract(p);
  vec2 u = smoothstep(vec2(0.0), vec2(1.0), f);

	float val = mix( mix( hash12( i + vec2(0.0, 0.0) ), 
                        hash12( i + vec2(1.0, 0.0) ), u.x),
                   mix( hash12( i + vec2(0.0, 1.0) ), 
                        hash12( i + vec2(1.0, 1.0) ), u.x), u.y);
  return val * 2.0 - 1.0;
}

float inverseLerp(float minValue, float maxValue, float v) {
  return (v - minValue) / (maxValue - minValue);
}

float remap(float v, float inMin, float inMax, float outMin, float outMax) {
  float t = inverseLerp(inMin, inMax, v);
  return mix(outMin, outMax, t);
}

void main() {
    vec2 uv = gl_FragCoord.xy / resolution.xy;
    vec2 worldPos = (uv * terrainSize) - terrainOffset;
    
    // Calculate our three noise values with different scales and speeds
    float windDir = noise12(worldPos * 0.05 + 0.05 * time); // For wind direction - large scale, slow
    windDir = remap(windDir, -1.0, 1.0, 0.0, PI * 2.0);
    float windNoise = noise12(worldPos * 0.25 + time);      // For wind lean angle - medium scale
    windNoise = remap(windNoise, -1.0, 1.0, 0.25, 1.0);
    float curvatureNoise = noise12(worldPos + 0.35 * time); // For blade curvature - smaller scale
    curvatureNoise *= 0.1;
    
    // Pack into output channels
    gl_FragColor = vec4(curvatureNoise, windDir, windNoise , 1.0);
}