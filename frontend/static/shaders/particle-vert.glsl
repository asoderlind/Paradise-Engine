uniform float pointMultiplier;
uniform sampler2D heightMap;

attribute float size;
attribute float angle;
attribute vec4 colour;

out vec4 vColour;


float terrainSize = 1000.0;
float terrainOffset = 500.0;

void main() {
 vec3 particleOffsetModel = vec3(position.x, 0.0, position.z);
    vec3 particleOffsetWorld = (modelMatrix * vec4(particleOffsetModel, 1.0)).xyz;
    vec2 heightMapUV = (particleOffsetWorld.xz + terrainOffset) / terrainSize;
    heightMapUV = clamp(heightMapUV, 0.0, 1.0);
    
    float terrainHeight = texture(heightMap, heightMapUV).r;
    
    // Ensure particle never goes below terrain height
    float particleHeight = terrainHeight + position.y;
    particleHeight = max(particleHeight, terrainHeight + 0.1);  // Keep slightly above terrain
    
    vec3 finalPositionModel = vec3(position.x, particleHeight, position.z);
    vec4 mvPosition = modelViewMatrix * vec4(finalPositionModel, 1.0);
    
    vec3 debugColor;
    if (particleHeight <= 0.0) {
      debugColor = vec3(1.0, 0.0, 0.0); // Red for zero/negative height
    } else if (particleHeight >= 1.0) {
      debugColor = vec3(0.0, 0.0, 1.0); // Blue for max height
    } else {
      debugColor = vec3(0.0, 1.0, 0.0); // Green for normal range
    }
    // vColour = vec4(debugColor, 1.0);


  gl_Position = projectionMatrix * mvPosition;
  gl_PointSize = size * pointMultiplier / gl_Position.w;


  vColour = colour;
}