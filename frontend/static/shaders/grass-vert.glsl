// Uniforms
uniform vec2 grassSize; // x: width, y: height
uniform vec4 grassParams; // x: # of segments, y: # of vertices
uniform float time;
uniform sampler2D heightMap;
uniform float heightMapScale;
uniform float heightMapBias;
uniform sampler2D positionTexture;
uniform sampler2D windNoiseTexture;
uniform float lodTransitionStart;
uniform float lodTransitionEnd;

// Inputs
in float vertIndex;
in vec4 orientation;
in float curve;
in float bladeIndex;

// Outputs
out vec3 rotatedNormal1;
out vec3 rotatedNormal2;
out vec3 vPixPos;
out float vY;
out float vDistToCamera;
out float vLodBlend;
//out float vsegments;
// out float vHeight;

// Constants
const float PI = 3.1415926535897932384626433832795;
const float terrainSize = 1000.0;
const float terrainOffset = 500.0;
// const float heightMapSize = 512.0;
const float heightMapSize = 1000.0;

// Function declarations
uint murmurHash12(uvec2 src);
float hash12(vec2 src);
float noise12(vec2 p);
vec3 rotateVector(vec4 q, vec3 v);
vec4 quaternionFromAxisAngle(vec3 axis, float angle);
float inverseLerp(float minValue, float maxValue, float v);
float remap(float v, float inMin, float inMax, float outMin, float outMax);
vec4 multiplyQuaternions(vec4 q1, vec4 q2);
float easeOut(float x, float t);
float saturate(float x);
float easeIn(float x, float t);
vec3 getBladePosition();
// vec4 sampleWind(vec3 worldPos);

vec3 getWindForBlade(vec3 worldPos) {
    // Convert world position to UV coordinates
    vec2 noiseUV = (worldPos.xz + terrainOffset) / terrainSize;
    noiseUV = clamp(noiseUV, 0.0, 1.0);  // Ensure UVs are in valid range
    
    // Sample wind noise texture
    vec4 windData = texture(windNoiseTexture, noiseUV);
    
    return windData.xyz;
}

void main() {
    // 1. Calculate basic grass properties
    float GRASS_SEGMENTS = grassParams.x;
    //vsegments = GRASS_SEGMENTS;
    float GRASS_VERTICES = grassParams.y;
    float vertID = mod(float(vertIndex), GRASS_VERTICES);
    float zSide = -(floor(vertIndex / GRASS_VERTICES) * 2.0 - 1.0);
    float xSide = mod(vertID, 2.0);
    float heightPercent = (vertID - xSide) / (GRASS_SEGMENTS * 2.0);

    // 2. Calculate grass blade dimensions
    float grassTotalHeight = grassSize.y;
    float grassTotalWidth = grassSize.x * (1.0 - heightPercent);

    // 3. Position the vertex along the blade
    float x = (xSide - 0.5) * grassTotalWidth;
    float y = heightPercent * grassTotalHeight;
    vec3 grassVertexPositionModel = vec3(x, y, 0.0);

    // 4. Calculate world position and sample height map
    vec3 bladePos = getBladePosition();
    vec3 grassOffsetModel = vec3(bladePos.x, 0.0, bladePos.z);
    vec3 grassBladeWorldPos = (modelMatrix * vec4(grassOffsetModel, 1.0)).xyz;
    
    // Calculate UV coordinates for heightmap
    vec2 heightMapUV = (grassBladeWorldPos.xz + terrainOffset) / terrainSize;
    heightMapUV = clamp(heightMapUV, 0.0, 1.0);
    
    // Sample heightmap and get height in model space
    // Using built-in GPU interpolation
    vec4 heightMapVec = texture(heightMap, heightMapUV);
    float height = heightMapVec.r;
    // vHeight = height;

    
    // Apply height to grass blade base position
    grassOffsetModel.y = height;

    // 5. Apply curve and wind effects

    vec3 windEffects = getWindForBlade(grassBladeWorldPos);

    float curveAmount = curve * heightPercent;
    curveAmount += windEffects.x;
    vec4 curveX = quaternionFromAxisAngle(vec3(1.0, 0.0, 0.0), curveAmount);
    vec3 windAxis = vec3(cos(windEffects.y), 0.0, sin(windEffects.y));
    float windLeanAngle = easeIn(windEffects.z, 2.0) * 1.25 * heightPercent;
    vec4 windRotation = quaternionFromAxisAngle(windAxis, windLeanAngle);
    
    // 6. Apply rotations to the model space vertex
    grassVertexPositionModel = rotateVector(curveX, grassVertexPositionModel);
    grassVertexPositionModel = rotateVector(orientation, grassVertexPositionModel);
    grassVertexPositionModel = rotateVector(windRotation, grassVertexPositionModel);

    // 7. Calculate final position in model space
    vec3 finalPositionModel = grassVertexPositionModel + grassOffsetModel;

    // 7.2. Transform to world space for further calculations
    vec3 finalPositionWorld = (modelMatrix * vec4(finalPositionModel, 1.0)).xyz;

    vec2 cameraToVertex = finalPositionWorld.xz - cameraPosition.xz;
    vDistToCamera = length(cameraToVertex);
    vLodBlend = 1.0;
     if (lodTransitionEnd > 0.0 && // Check if transitions are enabled for this LOD
        vDistToCamera >= lodTransitionStart && 
        vDistToCamera <= lodTransitionEnd) {
        
        vLodBlend = 1.0 - smoothstep(lodTransitionStart, lodTransitionEnd, vDistToCamera);
    }

    // 8. Calculate normals (in model space)
    float posYRot = PI * 0.3;
    float negYRot = -PI * 0.3;
    vec4 posY = quaternionFromAxisAngle(vec3(0.0, 1.0, 0.0), posYRot);
    vec4 negY = quaternionFromAxisAngle(vec3(0.0, 1.0, 0.0), negYRot);
    rotatedNormal1 = normalize(rotateVector(posY, normal));
    rotatedNormal2 = normalize(rotateVector(negY, normal));


    // 9. Calculate face normal and view-dependent effects
    vec3 grassFaceNormal = rotateVector(multiplyQuaternions(orientation, curveX), vec3(0.0, 0.0, 1.0));
    grassFaceNormal *= zSide;
    grassFaceNormal = normalize(grassFaceNormal);

    vec3 viewDir = normalize(cameraPosition - finalPositionWorld);
    float viewDotNormal = saturate(dot(grassFaceNormal.xz, viewDir.xz));
    float viewSpaceThickenFactor = easeOut(1.0 - viewDotNormal, 4.0) * smoothstep(0.0, 0.2, viewDotNormal);

    // 10. Set output variables
    vPixPos = vec3(modelViewMatrix * vec4(finalPositionModel, 1.0));
    
    // make sure grass color is not dependent on how high up the grass is
    vY = finalPositionModel.y - grassOffsetModel.y; 

    // 11. Calculate final position
    vec4 mvPosition = modelViewMatrix * vec4(finalPositionModel, 1.0);
    // Uncomment the following line if you want to apply the view-dependent thickening
    // mvPosition.x += viewSpaceThickenFactor * grassFaceNormal.x * grassSize.x;
    gl_Position = projectionMatrix * mvPosition;
}

vec3 getBladePosition() {
  float gridSize = 16.0;
  float numLayers = 12.0;
  // Calculate which layer and position within layer
  float layer = floor(bladeIndex / (gridSize * gridSize));
  float indexInLayer = mod(bladeIndex, gridSize * gridSize);

  // Calculate UV coordinates
  float x = mod(indexInLayer, gridSize);
  float y = floor(indexInLayer / gridSize) + (layer * gridSize);

  // Convert to UV coordinates
  vec2 uv = vec2(
      (x + 0.5) / (gridSize ),
      (y + 0.5) / (gridSize * numLayers)
  );

  // Get position from texture
  vec4 data = texture(positionTexture, uv);
  return data.xyz;
}

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


// Rotate a vector by a quaternion
vec3 rotateVector(vec4 q, vec3 v) {
    return v + 2.0 * cross(cross(v, q.xyz) + q.w * v, q.xyz);
}

// Function to create a quaternion for a rotation around an axis
vec4 quaternionFromAxisAngle(vec3 axis, float angle) {
    float halfAngle = angle * 0.5;
    float s = sin(halfAngle);
    return vec4(axis * s, cos(halfAngle));
}

float inverseLerp(float minValue, float maxValue, float v) {
  return (v - minValue) / (maxValue - minValue);
}

float remap(float v, float inMin, float inMax, float outMin, float outMax) {
  float t = inverseLerp(inMin, inMax, v);
  return mix(outMin, outMax, t);
}

// function to multiply two quaternions
vec4 multiplyQuaternions(vec4 q1, vec4 q2) {
    return vec4(
        q1.w * q2.xyz + q2.w * q1.xyz + cross(q1.xyz, q2.xyz),
        q1.w * q2.w - dot(q1.xyz, q2.xyz)
    );
}

float easeOut(float x, float t) {
	return 1.0 - pow(1.0 - x, t);
}

float saturate(float x) {
  return clamp(x, 0.0, 1.0);
}

float easeIn(float x, float t) {
	return pow(x, t);
}
