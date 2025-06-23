precision mediump float;

uniform vec2 iResolution;
uniform float iTime;
uniform vec2 iMouse;

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;

    // Create two fractionings of coordinate space
    vec2 uv1 = fract(uv * 3.);
    vec2 uv2 = fract((uv - 0.5) * 10. * sin(0.5*iTime+.5)*0.5+0.5);

    // Create 1d vertical noise lines
    float n1 = cos(iTime + sin(uv1.x * 90.1415) * 100.1415) * 0.5 + 0.5;

    // Create dynamic circles and calculate fn of distance
    vec3 circle2 = vec3(0.5, 0.5, (iTime/3. - floor(iTime/3.)));
    float circDist = 1. - smoothstep(length(uv2 - circle2.xy) - circle2.z, 0.05, 0.01);

    // Create a colourful background with dynamic x and y thresholds
    float ca = smoothstep(uv.x, sin(0.34*iTime), 0.9 - uv.x);
    float cb = smoothstep(uv.y, -cos(1.5*iTime), 0.9 - uv.y);
    float cc = pow(fract(iTime), uv.x + uv.y);
    vec3 bg = vec3(ca, cb, cc);

    // Step and multiply to mimic conditional AND logic 
    float p = step(0.1, circDist);
    p *= step(0.7, n1); 
    fragColor = vec4(bg * p, 1.);
}

void main() {
    mainImage(gl_FragColor, gl_FragCoord.xy);
}
