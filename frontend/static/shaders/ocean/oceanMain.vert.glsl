precision highp float;

out vec3 vWorldPosition;
out vec4 vReflectCoordinates;

uniform mat4 u_mirrorMatrix;

const float infinite = 150000.0;
const float screenScale = 1.2;
const vec3 groundNormal = vec3(0.0, 1.0, 0.0);
const float groundHeight = 0.0;

out vec3 vCamPosition;

vec3 interceptPlane(in vec3 source, in vec3 dir, in vec3 normal, float height) {
    // Compute the distance between the source and the surface, following a ray, then return the intersection
    // http://www.cs.rpi.edu/~cutler/classes/advancedgraphics/S09/lectures/11_ray_tracing.pdf
    float distance = (-height - dot(normal, source)) / dot(normal, dir);
    if (distance < 0.0)
        return source + dir * distance;
    else
        return -(vec3(source.x, height, source.z) + vec3(dir.x, height, dir.z) * infinite);
}

mat3 getRotation() {
    // Extract the 3x3 rotation matrix from the 4x4 view matrix
    return mat3(
        viewMatrix[0].xyz,
        viewMatrix[1].xyz,
        viewMatrix[2].xyz
    );
}

vec3 getCameraPos(in mat3 rotation) {
    // Xc = R * Xw + t
    // c = - R.t() * t <=> c = - t.t() * R
    return -viewMatrix[3].xyz * rotation;
}

vec2 getImagePlan() {
    // Extracting aspect and focal from projection matrix:
    // P = | e   0       0   0 |
    //     | 0   e/(h/w) 0   0 |
    //     | 0   0       .   . |
    //     | 0   0       -1  0 |
    float focal = projectionMatrix[0].x;
    float aspect = projectionMatrix[1].y;

    // Fix coordinate aspect and scale
    return vec2((uv.x - 0.5) * screenScale * aspect, (uv.y - 0.5) * screenScale * focal);
}

vec3 getCamRay(in mat3 rotation, in vec2 screenUV) {
    // Compute camera ray then rotate it in order to get it in world coordinate
    return vec3(screenUV.x, screenUV.y, projectionMatrix[0].x) * rotation;
}

vec3 computeProjectedPosition() {
    // Extract camera position and rotation from the model view matrix
    mat3 cameraRotation = getRotation();
    vec3 camPosition = getCameraPos(cameraRotation);
    vCamPosition = camPosition;

    // Return the intersection between the camera ray and a given plane
    if (camPosition.y < groundHeight)
        return vec3(0.0, 0.0, 0.0);

    // Extract coordinate of the vertex on the image plan
    vec2 screenUV = getImagePlan();

    // Compute the ray from camera to world
    vec3 ray = getCamRay(cameraRotation, screenUV);

    vec3 finalPos = interceptPlane(camPosition, ray, groundNormal, groundHeight);

    float distance = length(finalPos);
    if (distance > infinite)
        finalPos *= infinite / distance;

    return finalPos;
}

uniform sampler2D u_displacementMap;
uniform float u_geometrySize;
uniform float u_size;

void main(void) {
    vec4 screenPlaneWorldPosition = vec4(computeProjectedPosition(), 1.0);

    vec4 worldPosition = screenPlaneWorldPosition;

    vec3 displacement = texture(u_displacementMap, worldPosition.xz * 0.002).rgb * (u_geometrySize / u_size);
    vec4 oceanfftWorldPosition = worldPosition + vec4(displacement, 0.0);

    vWorldPosition = oceanfftWorldPosition.xyz;
    vReflectCoordinates = u_mirrorMatrix * oceanfftWorldPosition;

    gl_Position = projectionMatrix * viewMatrix * oceanfftWorldPosition;
}