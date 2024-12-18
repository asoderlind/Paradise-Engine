precision highp float;

out vec2 vUV;

void main (void) {
    vUV = position.xy * 0.5 + 0.5;
    gl_Position = vec4(position, 1.0 );
}