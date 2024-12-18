precision highp float;

in vec3 vWorldPosition;
in vec4 vReflectCoordinates;

uniform sampler2D u_reflection;
uniform sampler2D u_normalMap;
uniform vec3 u_oceanColor;
uniform vec3 u_sunDirection;
uniform float u_exposure;

out vec4 fragColor;

vec3 hdr(vec3 color, float exposure) {
    return 1.0 - exp(-color * exposure);
}

in vec3 vCamPosition;

void main(void) {
    vec3 normal = texture(u_normalMap, vWorldPosition.xz * 0.002).rgb;
    vec3 view = normalize(vCamPosition - vWorldPosition);

    // Compute the specular factor
    vec3 reflection = normalize(reflect(-u_sunDirection, normal));
    float specularFactor = pow(max(0.0, dot(view, reflection)), 500.0) * 20.0;

    // Get reflection color
    vec3 distortion = 200.0 * normal * vec3(1.0, 0.0, 0.1);
    vec3 projectedCoords = (vReflectCoordinates.xyz + distortion) / vReflectCoordinates.w;

    vec3 reflectionColor = texture(u_reflection, projectedCoords.xy).xyz;

    // Smooth the normal following the distance
    float distanceRatio = min(1.0, log(1.0 / length(vCamPosition - vWorldPosition) * 3000.0 + 1.0));
    distanceRatio *= distanceRatio;
    distanceRatio = distanceRatio * 0.7 + 0.3;
    normal = (distanceRatio * normal + vec3(0.0, 1.0 - distanceRatio, 0.0)) * 0.5;
    normal /= length(normal);

    // Compute the fresnel ratio
    float fresnel = pow(1.0 - dot(normal, view), 2.0);

    // Compute the sky reflection and the water color
    float skyFactor = (fresnel + 0.2) * 10.0;
    vec3 waterColor = (1.0 - fresnel) * u_oceanColor;

    // Compute the final color
    vec3 color = (skyFactor + specularFactor + waterColor) * reflectionColor + waterColor * 0.5;
    color = hdr(color, u_exposure);

    fragColor = vec4(color, 1.0);
}