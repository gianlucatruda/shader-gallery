console.log("Main.js");

async function fetchShaderList() {
  const response = await fetch('frag/manifest.json');
  if (!response.ok) {
    throw new Error('Failed to fetch shader manifest');
  }
  const shaderList = await response.json();
  return shaderList.sort();  // sort alphabetically
}

let currentShaderIndex = 0;
let cachedVertexShaderSource = null;
let editorTimeout = null;
let gl, canvas, vertexBuffer, program;
let resolutionUniformLocation, timeUniformLocation, mouseUniformLocation;
let startTime = 0;
let editor = null;

function updateURL() {
	try {
		// Remove the .glsl extension from the shader filename.
		const shaderName = shaders[currentShaderIndex].replace(/\.glsl$/i, "");
		// Use hash-based routing instead of pushState
		window.location.hash = shaderName;
	} catch (error) {
		console.warn("URL update failed: ", error);
	}
}

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

async function fetchShader(url) {
	const res = await fetch(url + '?cache=' + Date.now());
	if (!res.ok) {
		throw new Error(`Failed to fetch shader: ${res.statusText}`);
	}
	return await res.text();
}

async function loadShaderProgram(index) {
	// Fetch the fragment shader.
	const fragmentShaderSource = await fetchShader('frag/' + shaders[index]);
	const vertexShaderSource = await fetchShader('vertexShader.glsl');
	cachedVertexShaderSource = vertexShaderSource;

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

	// Reset time for the new shader.
	startTime = performance.now();
	
	// Apply initial uniform values.
	gl.uniform2f(resolutionUniformLocation, canvas.width, canvas.height);

	// Set the global program reference to the new program.
	program = newProgram;
	// Update the displayed fragment shader filename.
	document.getElementById('shaderName').textContent = shaders[currentShaderIndex];
	// Update the editable shader source
	if (editor) {
		editor.setValue(fragmentShaderSource);
	} else {
		document.getElementById('shaderEditor').value = fragmentShaderSource;
	}
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

	vertexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
	const vertices = new Float32Array([
		-1.0, -1.0,
		1.0, -1.0,
		-1.0, 1.0,
		1.0, 1.0
	]);
	gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

	// Dynamically fetch the list of shader files.
	try {
		window.shaders = await fetchShaderList();
		if (shaders.length === 0) {
			throw new Error('No shader files found in frag/');
		}
	} catch (error) {
		console.error(error);
		return;
	}

	// Check the hash for an override shader name.
	const hash = window.location.hash;
	if (hash && hash !== "#") {
		const shaderNameFromURL = hash.slice(1).toLowerCase(); // remove leading #
		const matchingIndex = shaders.findIndex(shaderFilename => {
			// Remove the '.glsl' extension for comparison.
			const name = shaderFilename.replace(/\.glsl$/i, "");
			return name.toLowerCase() === shaderNameFromURL;
		});
		if (matchingIndex !== -1) {
			currentShaderIndex = matchingIndex;
		}
	}
	await loadShaderProgram(currentShaderIndex);
	// Update the URL to reflect the loaded shader (in case of a fallback).
	updateURL();

	// Wire up navigation buttons
	document.getElementById('prev').addEventListener('click', async () => {
		currentShaderIndex = (currentShaderIndex - 1 + shaders.length) % shaders.length;
		await loadShaderProgram(currentShaderIndex);
		updateURL();
	});

	document.getElementById('next').addEventListener('click', async () => {
		currentShaderIndex = (currentShaderIndex + 1) % shaders.length;
		await loadShaderProgram(currentShaderIndex);
		updateURL();
	});

	// Initialize CodeMirror on the shader editor textarea (only once)
	if (!editor) {
		editor = CodeMirror.fromTextArea(document.getElementById('shaderEditor'), {
			lineNumbers: true,
			mode: "x-shader/x-fragment",  // use the C-like mode for GLSL; adjust as needed
			theme: "material-darker",
			keyMap: "default"  // start with default keybindings
		});
		editor.setSize("100%", "30em");
		// Allow CodeMirror to shrink within its container:
		editor.getWrapperElement().style.minWidth = "0";
		editor.getWrapperElement().style.minHeight = "0";
		editor.on("change", function() {
			clearTimeout(editorTimeout);
			editorTimeout = setTimeout(updateShaderFromEditor, 1000);
		});
		// Add a listener for the Vim toggle checkbox
		document.getElementById("vimToggle").addEventListener("change", (e) => {
		   if (e.target.checked) {
		      editor.setOption("keyMap", "vim");
		   } else {
		      editor.setOption("keyMap", "default");
		   }
		});

		// Add a listener for the copy button
		document.getElementById("copyBtn").addEventListener("click", () => {
		   const shaderText = editor.getValue();
		   navigator.clipboard.writeText(shaderText).then(() => {
		      console.log("Shader code copied to clipboard");
		   }).catch(err => {
		      console.error("Failed to copy shader code: ", err);
		   });
		});
	}

	function render(time) {
		gl.viewport(0, 0, canvas.width, canvas.height);
		gl.uniform1f(timeUniformLocation, (time - startTime) * 0.001);  // time offset in seconds
		gl.clearColor(0.0, 0.0, 0.0, 1.0);
		gl.clear(gl.COLOR_BUFFER_BIT);
		gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
		requestAnimationFrame(render);
	}

	requestAnimationFrame(render);
	
	// Initialize highlight.js (moved from inline script)
	hljs.highlightAll();
}

async function updateShaderFromEditor() {
  const newFragmentShaderSource = editor.getValue();
  
  // Use cached vertex shader source (or fetch if missing)
  let vertexSource = cachedVertexShaderSource;
  if (!vertexSource) {
    vertexSource = await fetchShader('vertexShader.glsl');
    cachedVertexShaderSource = vertexSource;
  }
  
  // Attempt to compile the shaders
  const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, newFragmentShaderSource);
  
  if (!vertexShader || !fragmentShader) {
    // Indicate an error with the shader code (red border)
    editor.getWrapperElement().style.border = '2px solid red';
    return;
  }
  
  // Create new program and link
  const newProgram = gl.createProgram();
  gl.attachShader(newProgram, vertexShader);
  gl.attachShader(newProgram, fragmentShader);
  gl.linkProgram(newProgram);
  
  // Handle linking errors
  if (!gl.getProgramParameter(newProgram, gl.LINK_STATUS)) {
    console.error(`Error linking shader program: ${gl.getProgramInfoLog(newProgram)}`);
    editor.getWrapperElement().style.border = '2px solid red';
    gl.deleteProgram(newProgram);
    return;
  }
  
  // Success: clear error indicator and update the program
  editor.getWrapperElement().style.border = '1px solid #333';
  gl.useProgram(newProgram);
  
  // Rebind attributes and update uniform locations (same as in loadShaderProgram)
  const positionAttributeLocation = gl.getAttribLocation(newProgram, 'a_position');
  gl.enableVertexAttribArray(positionAttributeLocation);
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);
  
  resolutionUniformLocation = gl.getUniformLocation(newProgram, 'iResolution');
  timeUniformLocation = gl.getUniformLocation(newProgram, 'iTime');
  mouseUniformLocation = gl.getUniformLocation(newProgram, 'iMouse');
  
  // Reset time and update resolution uniform
  startTime = performance.now();
  gl.uniform2f(resolutionUniformLocation, canvas.width, canvas.height);
  
  // Switch to the new program
  program = newProgram;
}

window.addEventListener('resize', () => {
	// Get the canvas element.
	const canvas = document.getElementById('myCanvas');
	let dpi = window.devicePixelRatio || 1;
	// Get the computed style dimensions (assumes CSS controls width/height).
	let styleWidth = parseFloat(getComputedStyle(canvas).getPropertyValue("width"));
	let styleHeight = parseFloat(getComputedStyle(canvas).getPropertyValue("height"));
	// Set the actual canvas dimensions.
	canvas.width = styleWidth * dpi;
	canvas.height = styleHeight * dpi;
	
	// Update the WebGL viewport.
	if (gl) {
		gl.viewport(0, 0, canvas.width, canvas.height);
		if (resolutionUniformLocation) {
			gl.uniform2f(resolutionUniformLocation, canvas.width, canvas.height);
		}
	}
	
	// Update CodeMirror editor dimensions, if applicable.
	if (editor) {
		// You may compute a new height or simply refresh.
		editor.setSize("100%", "30em");
	}
});

window.onload = init;
