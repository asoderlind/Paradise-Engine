in vec4 vColour;

float INTENSITY_MULTIPLIER = 1.5;
float INNER_GLOW_MULTIPLIER = 0.5;

void main() {
    // Convert point coord to center-based coordinates (-1 to 1)
    vec2 coord = gl_PointCoord * 2.0 - 1.0;
    float r = length(coord);
    
    // Soft circular falloff
    float intensity = 1.0 - smoothstep(0.0, 1.0, r);
    
    // Add inner glow
    float innerGlow = 1.0 - smoothstep(0.0, 0.5, r);
    
    // Combine for final color
    vec4 color = vColour;
    // The multipliers control glow intensity
    color.rgb *= (intensity * INTENSITY_MULTIPLIER + innerGlow * INNER_GLOW_MULTIPLIER);  
    color.a *= intensity;
    
    gl_FragColor = color;
}