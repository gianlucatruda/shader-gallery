precision mediump float;

uniform vec2 iResolution;
uniform float iTime;
uniform vec2 iMouse;

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;

    vec3 c1 = vec3(0., 0.4, 0.8);
    vec3 c2 = vec3(0.5, 0.1, 0.3);

    fragColor = vec4(mix(c1, c2, sin(uv.xxx*iTime*uv.x)/cos(uv.yyy*iTime)), 1.0);
}

void main() {
    mainImage(gl_FragColor, gl_FragCoord.xy);
}
