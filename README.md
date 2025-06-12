# Gianluca's Shader Gallery

Live at [gianlucatruda.github.io/shader-gallery](https://gianlucatruda.github.io/shader-gallery)

I wanted to be able to make, tweak, and share WebGL/GLSL shader art projects in a quick and modular way like [shadertoy.com](https://www.shadertoy.com/), but be able to run locally and deploy how I choose. 

This setup allows multiple shader examples loaded from the `frag/` directory, hash-based URL routing to indicate the current shader, live reloading, and a robust code editor (based on CodeMirror) with built-in error validation and an optional Vim keybindings mode.

This project is a simple, extensiple "vanilla" static site. The project uses multiple shader examples stored in the `frag/` directory (along with a fixed `vertexShader.glsl`). Shader editing is live—changes in the integrated CodeMirror editor will update the shader immediately (after validation) on a high-DPI, responsive canvas.


<img height="400" alt="SCR-20250612-prdu" src="https://github.com/user-attachments/assets/2c9524d1-c5f4-4a75-b57d-8759efd95218" />
<img height="400" alt="SCR-20250612-prht" src="https://github.com/user-attachments/assets/1b8546d8-4917-4369-9526-b873efe1da1a" />



I mimicked the Shadertoy API, so any straightforward shaders (with no assets) from there can be copy-pasted to and from this project in a `/frag/<shadername>.glsl` file:

```glsl

precision mediump float;
uniform vec2 iResolution; // viewport resolution (in pixels)
uniform float iTime; // shader playback time (in seconds)
uniform vec2 iMouse; // mouse pixel coords. xy: current (if MLB down), zw: click

// Shadertoy default code
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    // Normalized pixel coordinates (from 0 to 1)
    vec2 uv = fragCoord / iResolution.xy;
    // Time varying pixel color
    vec3 col = 0.5 + 0.5 * cos(iTime + uv.xyx + vec3(0, 2, 4));
    // Output to screen
    fragColor = vec4(col, 1.0);
}

void main() {
    mainImage(gl_FragColor, gl_FragCoord.xy);
}
```

You can easily serve this project with just about any simple server. I like using `npx live-server` to have live reloading when I modify any files.


