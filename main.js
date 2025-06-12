console.log("Main.js");

const shaders = [
	'frag/shader1.glsl',
	'frag/shader2.glsl',
	// Add additional shader paths as needed
];

let currentShaderIndex = 0;
let gl, canvas, vertexBuffer, program;
let resolutionUniformLocation, timeUniformLocation, mouseUniformLocation;

window.addEventListener('resize', () => {
	init(); // You may want to turn some functionalities in init into a separate resize function
});
async function fetchShader(url) {
	const res = await fetch(url);
	if (!res.ok) {
		throw new Error(`Failed to fetch shader: ${res.statusText}`);
	}
	return await res.text();
}

async function loadShaderProgram(index) {
	// Fetch the fragment shader from the current index.
	const fragmentShaderSource = await fetchShader(shaders[index]);
	// Assume vertexShaderSource is either already fetched globally or fetched here.
	const vertexShaderSource = await fetchShader('vertexShader.glsl');

	// Compile shaders using the existing helper.
	const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
	const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
	if (!vertexShader || !fragmentShader) return;

	// Create, attach, and link the new program.
	const newProgram = gl.createProgram();
	gl.attachShader(newProgram, vertexShader);
	gl.attachShader(newProgram, fragmentShader);
	gl.linkProgram(newProgram);
	if (!gl.getProgramParameter(newProgram, gl.LINK_STATUS)) {
		console.error(`Unable to initialize the shader program: ${gl.getProgramInfoLog(newProgram)}`);
		gl.deleteProgram(newProgram);
		return;
	}
	gl.useProgram(newProgram);

	// Rebind attributes and update uniform locations.
	const positionAttributeLocation = gl.getAttribLocation(newProgram, 'a_position');
	gl.enableVertexAttribArray(positionAttributeLocation);
	// Assuming vertexBuffer is globally declared (or in a common scope):
	gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
	gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

	// Update uniform location variables.
	resolutionUniformLocation = gl.getUniformLocation(newProgram, 'iResolution');
	timeUniformLocation = gl.getUniformLocation(newProgram, 'iTime');
	mouseUniformLocation = gl.getUniformLocation(newProgram, 'iMouse');
	
	// Apply initial uniform values.
	gl.uniform2f(resolutionUniformLocation, canvas.width, canvas.height);

	// Set the global program reference to the new program.
	program = newProgram;
}

async function init() {
	canvas = document.getElementById('myCanvas');
	gl = canvas.getContext('webgl');
	if (!gl) {
		alert('WebGL not supported by this browser.');
		return;
	}

	// Adjust for high DPI devices
	let dpi = window.devicePixelRatio;
	let style_height = +getComputedStyle(canvas).getPropertyValue("height").slice(0, -2);
	let style_width = +getComputedStyle(canvas).getPropertyValue("width").slice(0, -2);
	// Scale the canvas by the device pixel ratio, maintaining the aspect ratio.
	canvas.setAttribute('width', style_width * dpi);
	canvas.setAttribute('height', style_height * dpi);

	function createShader(gl, type, source) {
		const shader = gl.createShader(type);
		gl.shaderSource(shader, source);
		gl.compileShader(shader);
		if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
			console.error(`An error occurred compiling the shaders: ${gl.getShaderInfoLog(shader)}`);
			gl.deleteShader(shader);
			return null;
		}
		return shader;
	}

	vertexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
	const vertices = new Float32Array([
		-1.0, -1.0,
		1.0, -1.0,
		-1.0, 1.0,
		1.0, 1.0
	]);
	gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

	await loadShaderProgram(currentShaderIndex);

	// Wire up navigation buttons
	document.getElementById('prev').addEventListener('click', async () => {
		currentShaderIndex = (currentShaderIndex - 1 + shaders.length) % shaders.length;
		await loadShaderProgram(currentShaderIndex);
	});

	document.getElementById('next').addEventListener('click', async () => {
		currentShaderIndex = (currentShaderIndex + 1) % shaders.length;
		await loadShaderProgram(currentShaderIndex);
	});

	function render(time) {
		gl.viewport(0, 0, canvas.width, canvas.height);
		gl.uniform1f(timeUniformLocation, time * 0.001);  // time in seconds
		gl.clearColor(0.0, 0.0, 0.0, 1.0);
		gl.clear(gl.COLOR_BUFFER_BIT);
		gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
		requestAnimationFrame(render);
	}

	requestAnimationFrame(render);
}

window.onload = init;
