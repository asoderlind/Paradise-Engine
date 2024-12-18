uniform float fadeStart;
uniform float fadeEnd;
uniform vec2 grassSize;
uniform vec3 grassBaseColor;
uniform vec3 grassTipColor;

in float vY;
// in vec3 rotatedNormal1;
// in vec3 rotatedNormal2;
// in vec3 vPixPos;
in float vDistToCamera;
in float vLodBlend;
// in float vsegments;
// in float vHeight;

float easeIn(float x, float t) {
	return pow(x, t);
}

    void main() {
        // vec3 baseColor = vec3(0.05, 0.2, 0.01);
        // vec3 tipColor = vec3(0.5, 0.5, 0.1);

        float grassHeight = grassSize.y;

        vec3 debugColorLow = vec3(0.0, 0.0, 255.0);
        vec3 debugColorHigh = vec3(255.0, 0.0, 0.0);

        float fade = vLodBlend;
        if(vDistToCamera > fadeStart) {
            fade *= (1.0 - smoothstep(fadeStart, fadeEnd, vDistToCamera));
        }
    
        float heightFactor = clamp(vY / grassHeight, 0.0, 1.0);
        // float t = pow(smoothstep(0.5, 0.9, heightFactor), 3.0);  // Aggressive but controlled transition
        
        vec3 baseColor = vec3(0.05, 0.2, 0.01);   // Deep green
        vec3 tipColor = vec3(1.0, 1.0, 0.345);    // Bright yellow
        
        // vec3 texColor = mix(baseColor, tipColor, easeIn(heightFactor, 3.0));

        float t = heightFactor * heightFactor * (3.0 - 2.0 * heightFactor); // Smooth Hermite
        t = pow(t, 2.5); // Bias towards tip color
        vec3 texColor = mix(grassBaseColor, grassTipColor, t);
        // if (vY > 1.0){
        //     texColor = debugColorHigh;
        // }
        // Debug output
        // gl_FragColor = vec4(interpolationFactor, interpolationFactor, interpolationFactor, 1.0); 
        gl_FragColor = vec4(texColor, fade);
    }