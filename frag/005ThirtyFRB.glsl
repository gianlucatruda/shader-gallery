#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
precision highp int;
#else
precision mediump float;
precision mediump int;
#endif

// Twin-prime midpoints: 4, 6, 12, 18, 30, 42, 60, ...
// We met at 18. Now we're at 30. 
// Happy Birthday, FRB! Here's to (infinitely?) many more!

uniform vec2 iResolution; // viewport resolution (in pixels)
uniform float iTime; // shader playback time (in seconds)
uniform vec2 iMouse; // mouse pixel coords. xy: current (if MLB down)

const int MAX_P = 100;
const int PRIME_CHECK = 11; // ceil(sqrt(MAX_P)) for MAX_P=100.
const float EPS = 0.0001;

float isPrime(float n) {
    float prime = step(2.0, n);
    for (int i = 2; i <= PRIME_CHECK; i++) {
        float fi = float(i);
        prime *= 1.0 - step(fi * fi, n + EPS) * (1.0 - step(EPS, abs(mod(n, fi))));
    }
    return prime;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    float click = step(EPS, dot(iMouse, iMouse));
    if (click > 0.5) {
        vec2 mUv = (iMouse - 0.5 * iResolution.xy) / iResolution.y;
        vec2 local = uv - mUv;
        vec2 tile = local * 1.619;
        vec2 cell = fract(tile);
        vec2 uvWarp = cell - 0.5;
        // Click warp: fract tiling with mirrored edges for reflections.
        vec2 edgeDist = min(cell, 1.0 - cell);
        float edge = 1.0 - smoothstep(0.02, 0.08, min(edgeDist.x, edgeDist.y));
        vec2 mirrorWarp = (abs(cell - 0.5) - 0.25) * 2.0;
        vec2 warped = mix(uvWarp, mirrorWarp, edge * 0.1);
        uv = mUv + warped;
    }
    float r = length(uv);

    // Phase along radius: x(r, t) = r * s(t) - t.
    float t = iTime * 0.6;
    float scale = 10.0 + 6.0 * sin(t * 0.2);
    float x = r * scale - t;

    // Prime interference: f(x) = (1/Z) * sum_{p<=MAX_P} (1/sqrt(p)) * sin(p * x).
    float sum = 0.0;
    float norm = 0.0;
    for (int p = 2; p <= MAX_P; p++) {
        float pf = float(p);
        float prime = isPrime(pf);
        float w = prime * inversesqrt(pf);
        sum += w * sin(pf * x);
        norm += w;
    }

    float field = sum / max(norm, 0.001); // Normalize the weighted prime sum.
    field *= 1.8;
    float lines = smoothstep(0.2, 0.85, abs(field)); // Highlight alignment bands.

    // Tone map
    vec3 base = vec3(0.05, 0.05, 0.10);
    vec3 glow = vec3(0.96, 0.85, 0.55);
    vec3 accent = vec3(0.35, 0.6, 0.85);
    vec3 color = mix(base, accent, 0.35 + 0.65 * field);
    color = mix(color, glow, lines);

    // Vignette falloff: v(r) = 1 - smoothstep(r0, r1, r).
    float vignette = 1.0 - smoothstep(0.75, 1.25, r);
    color *= vignette;

    fragColor = vec4(color, 1.0);
}

void main() {
    mainImage(gl_FragColor, gl_FragCoord.xy);
}
