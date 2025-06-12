precision mediump float;

uniform vec2 iResolution; // viewport resolution (in pixels)
uniform float iTime; // shader playback time (in seconds)
uniform vec2 iMouse; // mouse pixel coords. xy: current (if MLB down), zw: click

vec3 palette(float t) {
    //https://iquilezles.org/articles/palettes/
    vec3 a = vec3(0.1, 0.1, 0.1);
    vec3 b = vec3(0.5, 0.5, 0.5);
    vec3 c = vec3(1.0, 1.0, 1.0);
    vec3 d = vec3(0.0, 0.33, 0.67);

    return a + b * cos(6.28318 * (c * t + d));
}

// Tutorial: https://youtu.be/f4s1h2YETNY
// Based on https://www.shadertoy.com/view/mtyGWy
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    // Resolution on interval [-1, 1] works on any canvas size and shape
    // iResolution.xy uses "swizzling" to construct a vec2 in specified order
    vec2 uv = (fragCoord * 2.0 - iResolution.xy) / iResolution.y;
    // Original origin of the canvas
    vec2 uv0 = uv;
    // Initialise for black
    vec3 finalColor = vec3(0.0);

    // For loops that use fract(uv) give a fractal effect
    for (float i = 0.0; i < 4.0; i++) {
        uv = fract(uv * 1.619) - 0.5;

        float d = length(uv) * exp(length(uv0));
        vec3 col = palette(length(uv0) - i * 0.1 - iTime * 0.9);
        d = sin(d * 5.0 + iTime) / 5.0;
        d = abs(d);
        d = pow(0.01 / d, 1.9);

        finalColor += col * d;
    }

    fragColor = vec4(finalColor, 1.0); // alpha is often ignored
}

void main() {
    mainImage(gl_FragColor, gl_FragCoord.xy);
}
